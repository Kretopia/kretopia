import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Send, Check, RefreshCw, ArrowRight, X, Wand2, ChevronDown, ChevronUp, Pencil, ScanLine, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCall?: {
    name: string;
    data: any;
  };
}

interface DocumentDetails {
  client_name?: string;
  client_email?: string;
  client_address?: string;
  currency?: string;
  tax_rate?: number;
  due_date?: string;
  valid_until?: string;
  notes?: string;
}

interface PricingCoPilotProps {
  projectId?: string;
  lineItems: LineItem[];
  currency: string;
  documentType: "invoice" | "quote";
  onApplyLineItems: (items: LineItem[]) => void;
  onApplyNotes?: (notes: string) => void;
  onApplyTerms?: (terms: string) => void;
  onApplyTaxRate?: (rate: number) => void;
  onApplyDescriptions?: (enhanced: { original: string; enhanced: string; suggested_rate?: number }[]) => void;
  onApplyDocumentDetails?: (details: DocumentDetails) => void;
}

export function PricingCoPilot({
  projectId,
  lineItems,
  currency,
  documentType,
  onApplyLineItems,
  onApplyNotes,
  onApplyTerms,
  onApplyTaxRate,
  onApplyDescriptions,
  onApplyDocumentDetails,
}: PricingCoPilotProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [detailsSummary, setDetailsSummary] = useState<DocumentDetails | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [projectContext, setProjectContext] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pull live Studio context (brief, notes, deliverables, file names) so the AI
  // can pre-fill the quote with what the user has already captured in the project.
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const [projRes, notesRes, delivRes, filesRes, clientRes] = await Promise.all([
          supabase.from("projects").select("title, description, budget, deadline, currency, client_name, workspace_type, mood").eq("id", projectId).maybeSingle(),
          supabase.from("project_notes").select("title, content, updated_at").eq("project_id", projectId).order("updated_at", { ascending: false }).limit(15),
          supabase.from("project_deliverables").select("title, description, status, kind").eq("project_id", projectId).order("sort_order", { ascending: true }).limit(30),
          supabase.from("project_files").select("file_name, file_type").eq("project_id", projectId).order("created_at", { ascending: false }).limit(30),
          supabase.from("projects").select("client_id").eq("id", projectId).maybeSingle(),
        ]);
        if (cancelled) return;
        let client = null as any;
        if (clientRes.data?.client_id) {
          const { data: c } = await supabase
            .from("clients")
            .select("name, email, address, company")
            .eq("id", clientRes.data.client_id)
            .maybeSingle();
          client = c;
        }
        setProjectContext({
          project: projRes.data || null,
          notes: notesRes.data || [],
          deliverables: delivRes.data || [],
          files: filesRes.data || [],
          client,
        });
      } catch (e) {
        console.warn("PricingCoPilot: failed to load project context", e);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const getCurrencySymbol = (c: string) => {
    const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹", NGN: "₦", TTD: "TT$", CAD: "C$", AUD: "A$", AED: "د.إ", IDR: "Rp" };
    return symbols[c] || `${c} `;
  };
  const sym = getCurrencySymbol(currency);

  const sendMessage = async (userInput: string, scanImage?: string) => {
    if ((!userInput.trim() && !scanImage) || isLoading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: scanImage
        ? `${userInput.trim() || "📎 Scanning brief…"}`
        : userInput.trim(),
    };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";
    let pendingToolCalls: { name: string; args: string }[] = [];
    let currentToolIdx = -1;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-pricing-copilot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages.map(m => ({ role: m.role, content: m.content })),
            currency,
            document_type: documentType,
            existing_items: lineItems.filter(i => i.description),
            current_details: detailsSummary,
            project_context: projectContext,
            scan_image: scanImage,
          }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to get AI response");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              assistantContent += delta.content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (tc.index !== undefined && tc.index !== currentToolIdx) {
                  currentToolIdx = tc.index;
                  pendingToolCalls.push({ name: tc.function?.name || "", args: "" });
                }
                if (tc.function?.name && pendingToolCalls[pendingToolCalls.length - 1]) {
                  pendingToolCalls[pendingToolCalls.length - 1].name = tc.function.name;
                }
                if (tc.function?.arguments && pendingToolCalls.length > 0) {
                  pendingToolCalls[pendingToolCalls.length - 1].args += tc.function.arguments;
                }
              }
            }
          } catch {
            // partial JSON
          }
        }
      }

      // Process tool calls
      for (const ptc of pendingToolCalls) {
        if (!ptc.name || !ptc.args) continue;
        try {
          const toolData = JSON.parse(ptc.args);
          
          if (ptc.name === "set_document_details") {
            setDetailsSummary(prev => ({ ...prev, ...toolData }));
            setShowSummary(true);
            // Auto-apply details
            if (onApplyDocumentDetails) {
              onApplyDocumentDetails(toolData);
            }
            const detailsList = Object.entries(toolData)
              .filter(([, v]) => v !== undefined && v !== null && v !== "")
              .map(([k, v]) => `**${k.replace(/_/g, " ")}**: ${v}`)
              .join("\n");
            const detailsMsg = assistantContent
              ? assistantContent
              : `✅ Got it! I've captured these details:\n\n${detailsList}\n\nYou can edit these anytime from the summary above.`;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: detailsMsg } : m);
              }
              return [...prev, { role: "assistant", content: detailsMsg }];
            });
            toast.success("Document details updated");
          } else {
            const toolMsg: ChatMessage = {
              role: "assistant",
              content: assistantContent || "Here's what I've prepared for you:",
              toolCall: { name: ptc.name, data: toolData },
            };
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => (i === prev.length - 1 ? toolMsg : m));
              }
              return [...prev, toolMsg];
            });
          }
        } catch (e) {
          console.error("Failed to parse tool call:", e);
        }
      }
    } catch (err: any) {
      console.error("Pricing co-pilot error:", err);
      toast.error(err.message || "Could not get AI response");
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyLineItems = (items: any[]) => {
    const formatted: LineItem[] = items.map(i => ({
      description: i.description,
      quantity: i.quantity || 1,
      rate: i.rate,
      amount: (i.quantity || 1) * i.rate,
    }));
    onApplyLineItems(formatted);
    toast.success(`${formatted.length} line items applied to your ${currency} document`);
  };

  const handleApplyEnhanced = (enhanced: any[]) => {
    if (onApplyDescriptions) {
      onApplyDescriptions(enhanced);
      toast.success("Descriptions enhanced!");
    } else {
      const updated = lineItems.map(item => {
        const match = enhanced.find((e: any) => e.original === item.description);
        if (match) {
          return {
            ...item,
            description: match.enhanced,
            rate: match.suggested_rate || item.rate,
            amount: item.quantity * (match.suggested_rate || item.rate),
          };
        }
        return item;
      });
      onApplyLineItems(updated);
      toast.success("Descriptions enhanced!");
    }
  };

  const docLabel = documentType === "quote" ? "quote" : "invoice";

  const ctxCount =
    (projectContext?.deliverables?.length || 0) +
    (projectContext?.notes?.length || 0) +
    (projectContext?.files?.length || 0);
  const hasCtx = ctxCount > 0;

  const quickPrompts = hasCtx
    ? [
        {
          label: `Draft ${docLabel} from this Studio`,
          prompt: `Use the LIVE PROJECT CONTEXT in your system prompt. Draft a ${docLabel} now — propose a line item per deliverable + key notes, suggest sensible rates in ${currency}, mark anything you need from me as "TBD" so I can fill it in. Then call generate_line_items.`,
        },
        { label: "📊 Calculate markups", prompt: `Here are my supplier/subcontractor costs for this project. Help me calculate competitive markups in ${currency}.` },
        { label: "✍️ Enhance descriptions", prompt: "Improve my current line item descriptions using the project notes for context." },
        { label: "👤 Pull client details", prompt: "Pull the client name/email/address from the project and confirm them with me." },
      ]
    : [
        { label: "💬 Help me price this", prompt: `I need help creating a ${docLabel}. Let me tell you about the project and my costs...` },
        { label: "📊 Calculate markups", prompt: `I have my supplier/subcontractor costs. Help me calculate competitive markups for my client ${docLabel} in ${currency}.` },
        { label: "✍️ Enhance descriptions", prompt: "Can you improve my current line item descriptions to sound more professional?" },
        { label: `📝 Full ${docLabel} from scratch`, prompt: `I want to create a complete ${docLabel} from scratch. I'll describe the project and client — help me with everything from line items to terms.` },
      ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all group"
      >
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Sparkles className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-semibold">ThriveQuote AI</p>
          <p className="text-[11px] text-muted-foreground">Chat with AI to build your {docLabel} — pricing, line items, client details & more</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </button>
    );
  }

  return (
    <Card className="border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <div>
            <p className="text-sm font-bold">ThriveQuote AI</p>
            <p className="text-[10px] opacity-80">Your {docLabel} co-pilot</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[9px] bg-white/10 border-white/20 text-white">
            {currency}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground hover:bg-white/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Details Summary Card */}
      {detailsSummary && Object.values(detailsSummary).some(v => v) && (
        <div className="mx-3 mt-3">
          <button
            onClick={() => setShowSummary(!showSummary)}
            className="w-full flex items-center justify-between p-2.5 rounded-lg bg-accent/50 border border-border/50 hover:bg-accent/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs font-medium">Document Details</span>
              {detailsSummary.client_name && (
                <span className="text-[10px] text-muted-foreground">— {detailsSummary.client_name}</span>
              )}
            </div>
            {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showSummary && (
            <div className="p-2.5 mt-1 rounded-lg bg-muted/30 border border-border/30 space-y-1.5">
              {detailsSummary.client_name && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{detailsSummary.client_name}</span>
                </div>
              )}
              {detailsSummary.client_email && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{detailsSummary.client_email}</span>
                </div>
              )}
              {detailsSummary.client_address && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-medium">{detailsSummary.client_address}</span>
                </div>
              )}
              {detailsSummary.currency && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-medium">{detailsSummary.currency}</span>
                </div>
              )}
              {detailsSummary.tax_rate !== undefined && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Tax Rate</span>
                  <span className="font-medium">{detailsSummary.tax_rate}%</span>
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="w-full h-6 text-[10px] gap-1 text-muted-foreground hover:text-primary"
                onClick={() => sendMessage("I need to update my client details")}
              >
                <Pencil className="h-2.5 w-2.5" /> Edit Details
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="h-[380px] overflow-y-auto p-3 space-y-3 bg-muted/20">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-background rounded-lg rounded-tl-none p-3 text-[13px] text-muted-foreground max-w-[90%] leading-relaxed">
                <p className="font-semibold text-foreground mb-1.5">Hey! I'm your {docLabel} co-pilot 👋</p>
                {hasCtx ? (
                  <>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge variant="secondary" className="text-[10px] gap-1"><Check className="h-2.5 w-2.5" /> Studio loaded</Badge>
                      {projectContext?.deliverables?.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">{projectContext.deliverables.length} deliverables</Badge>
                      )}
                      {projectContext?.notes?.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">{projectContext.notes.length} notes</Badge>
                      )}
                      {projectContext?.files?.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">{projectContext.files.length} files</Badge>
                      )}
                    </div>
                    <p className="mb-2">I've pulled the brief, deliverables and notes from this project. Want me to draft the {docLabel} now?</p>
                  </>
                ) : (
                  <p className="mb-2">Tell me about your project — costs, services, client info — and I'll help you build everything step by step.</p>
                )}
                <p className="text-[11px] text-muted-foreground/70">I can calculate markups, write professional descriptions, suggest terms, and fill in all the details for you.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pl-9">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(qp.prompt)}
                  className="text-left p-2.5 rounded-lg border bg-background hover:bg-accent/50 hover:border-primary/30 transition-all text-[11px] leading-snug"
                >
                  <span className="font-medium">{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "user" ? (
              <div className="flex gap-2 justify-end">
                <div className="bg-primary text-primary-foreground rounded-lg rounded-tr-none p-3 text-[13px] max-w-[85%] leading-relaxed">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="max-w-[92%] space-y-2">
                  {msg.content && (
                    <div className="bg-background rounded-lg rounded-tl-none p-3 text-[13px] leading-relaxed copilot-prose">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-2 rounded-lg border border-border">
                              <table className="w-full text-[11px]">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="bg-muted/60">{children}</thead>
                          ),
                          th: ({ children }) => (
                            <th className="px-2.5 py-2 text-left font-semibold text-foreground border-b border-border whitespace-nowrap">{children}</th>
                          ),
                          td: ({ children }) => (
                            <td className="px-2.5 py-1.5 border-b border-border/40 text-muted-foreground">{children}</td>
                          ),
                          tr: ({ children }) => (
                            <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
                          ),
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">{children}</strong>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside space-y-1 my-2 text-muted-foreground">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside space-y-1 my-2 text-muted-foreground">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="leading-relaxed">{children}</li>
                          ),
                          h3: ({ children }) => (
                            <h3 className="font-bold text-foreground text-sm mt-3 mb-1">{children}</h3>
                          ),
                          h4: ({ children }) => (
                            <h4 className="font-semibold text-foreground text-[13px] mt-2 mb-1">{children}</h4>
                          ),
                          code: ({ children, className }) => {
                            if (className) return <code className={className}>{children}</code>;
                            return <code className="bg-muted px-1 py-0.5 rounded text-[11px] font-mono">{children}</code>;
                          },
                          hr: () => <Separator className="my-3" />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Tool call: generated line items */}
                  {msg.toolCall?.name === "generate_line_items" && (
                    <Card className="p-3 bg-background border-primary/20 space-y-2.5">
                      <div className="flex items-center gap-1.5">
                        <Wand2 className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold">Generated Line Items</span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-[11px]">
                          <thead className="bg-muted/60">
                            <tr>
                              <th className="px-2.5 py-2 text-left font-semibold">Item</th>
                              <th className="px-2.5 py-2 text-center font-semibold w-12">Qty</th>
                              <th className="px-2.5 py-2 text-right font-semibold w-20">Rate</th>
                              <th className="px-2.5 py-2 text-right font-semibold w-24">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {msg.toolCall.data.line_items?.map((item: any, idx: number) => (
                              <tr key={idx} className="border-b border-border/40 hover:bg-muted/20">
                                <td className="px-2.5 py-2">{item.description}</td>
                                <td className="px-2.5 py-2 text-center">{item.quantity || 1}</td>
                                <td className="px-2.5 py-2 text-right font-mono">{sym}{item.rate.toLocaleString()}</td>
                                <td className="px-2.5 py-2 text-right font-mono font-medium">{sym}{((item.quantity || 1) * item.rate).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-muted/30">
                              <td colSpan={3} className="px-2.5 py-2 text-right font-bold">Total</td>
                              <td className="px-2.5 py-2 text-right font-bold font-mono text-primary">
                                {sym}{msg.toolCall.data.line_items?.reduce((s: number, i: any) => s + (i.quantity || 1) * i.rate, 0).toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs gap-1.5"
                        onClick={() => handleApplyLineItems(msg.toolCall!.data.line_items)}
                      >
                        <Check className="h-3 w-3" /> Apply to {docLabel.charAt(0).toUpperCase() + docLabel.slice(1)}
                      </Button>
                      <div className="flex gap-1.5">
                        {msg.toolCall.data.suggested_notes && onApplyNotes && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-[10px] gap-1"
                            onClick={() => {
                              onApplyNotes!(msg.toolCall!.data.suggested_notes);
                              toast.success("Notes applied");
                            }}
                          >
                            Apply Notes
                          </Button>
                        )}
                        {msg.toolCall.data.suggested_terms && onApplyTerms && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-[10px] gap-1"
                            onClick={() => {
                              onApplyTerms!(msg.toolCall!.data.suggested_terms);
                              toast.success("Terms applied");
                            }}
                          >
                            Apply Terms
                          </Button>
                        )}
                      </div>
                      {msg.toolCall.data.suggested_tax_rate !== undefined && onApplyTaxRate && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-[10px] gap-1"
                          onClick={() => {
                            onApplyTaxRate!(msg.toolCall!.data.suggested_tax_rate);
                            toast.success(`Tax rate set to ${msg.toolCall!.data.suggested_tax_rate}%`);
                          }}
                        >
                          Apply {msg.toolCall.data.suggested_tax_rate}% Tax Rate
                        </Button>
                      )}
                    </Card>
                  )}

                  {/* Tool call: enhanced descriptions */}
                  {msg.toolCall?.name === "enhance_descriptions" && (
                    <Card className="p-3 bg-background border-primary/20 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold">Enhanced Descriptions</span>
                      </div>
                      <div className="space-y-1.5">
                        {msg.toolCall.data.enhanced_items?.map((item: any, idx: number) => (
                          <div key={idx} className="text-[11px] p-2 bg-muted/50 rounded-lg space-y-1">
                            <p className="text-muted-foreground line-through">{item.original}</p>
                            <p className="font-medium text-foreground">{item.enhanced}</p>
                            {item.suggested_rate && (
                              <p className="text-primary text-[10px]">Suggested rate: {sym}{item.suggested_rate.toLocaleString()}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs gap-1.5"
                        onClick={() => handleApplyEnhanced(msg.toolCall!.data.enhanced_items)}
                      >
                        <Check className="h-3 w-3" /> Apply Enhanced Descriptions
                      </Button>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            </div>
            <div className="bg-background rounded-lg rounded-tl-none p-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-background">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Describe your project costs, services, or ask for pricing help..."
            className="flex-1 resize-none text-[13px] bg-muted/50 rounded-xl p-3 min-h-[44px] max-h-[100px] outline-none focus:ring-2 focus:ring-primary/30 transition-shadow placeholder:text-muted-foreground/50"
            rows={1}
          />
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground/50 mt-1.5 text-center">
          AI suggestions are estimates — always verify pricing for your market
        </p>
      </div>
    </Card>
  );
}
