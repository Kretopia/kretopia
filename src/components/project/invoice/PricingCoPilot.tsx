import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Send, Check, RefreshCw, ArrowRight, X, MessageSquare, Wand2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

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

interface PricingCoPilotProps {
  lineItems: LineItem[];
  currency: string;
  onApplyLineItems: (items: LineItem[]) => void;
  onApplyNotes?: (notes: string) => void;
  onApplyTerms?: (terms: string) => void;
  onApplyTaxRate?: (rate: number) => void;
  onApplyDescriptions?: (enhanced: { original: string; enhanced: string; suggested_rate?: number }[]) => void;
}

export function PricingCoPilot({
  lineItems,
  currency,
  onApplyLineItems,
  onApplyNotes,
  onApplyTerms,
  onApplyTaxRate,
  onApplyDescriptions,
}: PricingCoPilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getCurrencySymbol = (c: string) => {
    const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹", NGN: "₦", TTD: "TT$", CAD: "C$", AUD: "A$", AED: "د.إ" };
    return symbols[c] || `${c} `;
  };
  const sym = getCurrencySymbol(currency);

  const sendMessage = async (userInput: string) => {
    if (!userInput.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: userInput.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";
    let pendingToolCall: { name: string; args: string } | null = null;

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-pricing-copilot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages.map(m => ({ role: m.role, content: m.content })),
            currency,
            existing_items: lineItems.filter(i => i.description),
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
            // Handle tool calls
            if (delta?.tool_calls?.[0]) {
              const tc = delta.tool_calls[0];
              if (tc.function?.name) {
                pendingToolCall = { name: tc.function.name, args: "" };
              }
              if (tc.function?.arguments && pendingToolCall) {
                pendingToolCall.args += tc.function.arguments;
              }
            }
          } catch {
            // partial JSON, wait for more
          }
        }
      }

      // Process tool call
      if (pendingToolCall) {
        try {
          const toolData = JSON.parse(pendingToolCall.args);
          const toolMsg: ChatMessage = {
            role: "assistant",
            content: assistantContent || "Here's what I've prepared for you:",
            toolCall: { name: pendingToolCall.name, data: toolData },
          };
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => (i === prev.length - 1 ? toolMsg : m));
            }
            return [...prev, toolMsg];
          });
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
      // Fallback: update line items with enhanced descriptions
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

  const quickPrompts = [
    { label: "Break down my project", prompt: "I need help breaking down my project into professional line items. Let me describe what I'm working on..." },
    { label: "Suggest markups", prompt: `I have my supplier/subcontractor costs. Can you help me calculate appropriate markups for my client quote in ${currency}?` },
    { label: "Enhance descriptions", prompt: "Can you improve my current line item descriptions to sound more professional?" },
    { label: "Suggest terms", prompt: "What payment terms and conditions should I include for a creative services quote?" },
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
          <p className="text-[11px] text-muted-foreground">Describe your project — AI helps you price, break down & write professional line items</p>
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
            <p className="text-[10px] opacity-80">Your pricing co-pilot</p>
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

      {/* Messages */}
      <div className="h-[300px] overflow-y-auto p-3 space-y-3 bg-muted/20">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              <div className="bg-background rounded-lg rounded-tl-none p-2.5 text-xs text-muted-foreground max-w-[90%]">
                <p className="font-medium text-foreground mb-1">Hey! I'm your pricing co-pilot 👋</p>
                <p>Tell me about your project — your costs, what services you're providing — and I'll help you build a professional quote with competitive pricing.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pl-8">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(qp.prompt)}
                  className="text-left p-2 rounded-lg border bg-background hover:bg-accent/50 hover:border-primary/30 transition-all text-[11px]"
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
                <div className="bg-primary text-primary-foreground rounded-lg rounded-tr-none p-2.5 text-xs max-w-[85%]">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
                <div className="max-w-[90%] space-y-2">
                  {msg.content && (
                    <div className="bg-background rounded-lg rounded-tl-none p-2.5 text-xs prose prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}

                  {/* Tool call: generated line items */}
                  {msg.toolCall?.name === "generate_line_items" && (
                    <Card className="p-3 bg-background border-primary/20 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Wand2 className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold">Generated Line Items</span>
                      </div>
                      <div className="space-y-1">
                        {msg.toolCall.data.line_items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] p-1.5 bg-muted/50 rounded">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.description}</p>
                              <p className="text-muted-foreground">Qty: {item.quantity || 1}</p>
                            </div>
                            <span className="font-bold text-primary ml-2">
                              {sym}{(item.rate).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between text-xs font-bold">
                          <span>Total</span>
                          <span className="text-primary">
                            {sym}{msg.toolCall.data.line_items?.reduce((s: number, i: any) => s + (i.quantity || 1) * i.rate, 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full h-7 text-xs gap-1"
                        onClick={() => handleApplyLineItems(msg.toolCall!.data.line_items)}
                      >
                        <Check className="h-3 w-3" /> Apply to Document
                      </Button>
                      {msg.toolCall.data.suggested_notes && onApplyNotes && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-xs gap-1"
                          onClick={() => {
                            onApplyNotes!(msg.toolCall!.data.suggested_notes);
                            toast.success("Notes applied");
                          }}
                        >
                          Apply Suggested Notes
                        </Button>
                      )}
                      {msg.toolCall.data.suggested_terms && onApplyTerms && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-xs gap-1"
                          onClick={() => {
                            onApplyTerms!(msg.toolCall!.data.suggested_terms);
                            toast.success("Terms applied");
                          }}
                        >
                          Apply Suggested Terms
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
                          <div key={idx} className="text-[11px] p-2 bg-muted/50 rounded space-y-1">
                            <p className="text-muted-foreground line-through">{item.original}</p>
                            <p className="font-medium text-foreground">{item.enhanced}</p>
                            {item.suggested_rate && (
                              <p className="text-primary text-[10px]">Suggested rate: {sym}{item.suggested_rate.toFixed(2)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        className="w-full h-7 text-xs gap-1"
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
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            </div>
            <div className="bg-background rounded-lg rounded-tl-none p-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t bg-background flex gap-2 items-end">
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
          className="flex-1 resize-none text-xs bg-muted/50 rounded-lg p-2 min-h-[36px] max-h-[80px] outline-none focus:ring-1 focus:ring-primary/30"
          rows={1}
        />
        <Button
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
