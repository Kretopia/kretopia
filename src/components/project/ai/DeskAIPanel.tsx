import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send, X, Loader2, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DeskAIPanelProps {
  projectId: string;
  isPro: boolean;
  userId: string;
  onClose: () => void;
}

interface Msg { role: "user" | "assistant"; content: string; }

const QUICK_PROMPTS = [
  "What should I focus on today?",
  "Summarize where this project stands",
  "Draft a status update for the other side",
  "Any risks or things slipping?",
];

export const DeskAIPanel = ({ projectId, isPro, userId, onClose }: DeskAIPanelProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("desk_ai_messages")
        .select("role, content")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(40);
      if (data) setMessages(data.filter(m => m.role !== "system").map(m => ({ role: m.role as "user" | "assistant", content: m.content })));
    })();
  }, [projectId, userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setMessages(prev => [...prev, { role: "user", content: message }]);
    setInput("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("desk-ai", {
        body: { project_id: projectId, message, mode: "chat", is_pro: isPro },
      });
      if (error) throw error;
      if (data?.error === "daily_limit") {
        toast({ title: "Daily limit reached", description: data.message, variant: "destructive" });
        setMessages(prev => prev.slice(0, -1));
        return;
      }
      if (data?.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      setUsage({ used: data.used, limit: data.limit });
    } catch (e: any) {
      toast({ title: "DeskAI error", description: e.message || "Try again", variant: "destructive" });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    await supabase.from("desk_ai_messages").delete().eq("project_id", projectId).eq("user_id", userId);
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">DeskAI</h3>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Your project assistant {usage?.limit ? `· ${usage.used}/${usage.limit} today` : isPro ? "· Unlimited" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearChat} title="Clear chat">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && !sending && (
          <div className="space-y-3 py-2">
            <div className="text-center py-4">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-2 opacity-70" />
              <p className="text-sm font-semibold">Ask me anything about this project</p>
              <p className="text-xs text-muted-foreground mt-1">I can see your tasks, files, chat & milestones.</p>
            </div>
            <div className="space-y-1.5">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/40 transition-colors flex items-center gap-2"
                >
                  <MessageSquare className="h-3 w-3 text-primary shrink-0" />
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "rounded-2xl px-3 py-2 max-w-[88%] text-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-accent/60 rounded-bl-sm"
              )}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2 prose-strong:text-foreground">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-accent/60 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask DeskAI anything…"
            className="min-h-[40px] max-h-32 resize-none text-sm"
            rows={1}
          />
          <Button onClick={() => send()} disabled={!input.trim() || sending} size="icon" className="h-10 w-10 shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
