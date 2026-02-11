import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { streamChat, type ChatMessage } from "@/lib/thriveAiChat";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const QUICK_PROMPTS = [
  "Help me write a pitch for a brand collaboration",
  "How should I price a video editing project?",
  "Write a cold outreach DM to a potential client",
  "Help me plan a content calendar for this month",
  "Draft a simple freelance contract",
  "Give me creative brief ideas for my portfolio",
];

const AIChatTab = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        onError: (err) => {
          toast({ title: "AI Error", description: err, variant: "destructive" });
          setIsLoading(false);
        },
        signal: controller.signal,
      });
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast({ title: "Error", description: "Failed to connect to AI", variant: "destructive" });
      }
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clearChat = () => {
    if (isLoading) {
      abortRef.current?.abort();
      setIsLoading(false);
    }
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] md:h-[calc(100vh-14rem)]">
      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
            <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">ThriveAI Assistant</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Your personal AI for pitches, pricing, outreach, contracts, and creative strategy.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {QUICK_PROMPTS.map((p) => (
                <Button
                  key={p}
                  variant="outline"
                  size="sm"
                  className="text-xs text-left h-auto py-2 px-3 whitespace-normal justify-start"
                  onClick={() => send(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3 max-w-[90%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3 mr-auto">
            <div className="rounded-2xl px-4 py-3 bg-muted">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t pt-3 space-y-2">
        {messages.length > 0 && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs gap-1 text-muted-foreground">
              <Trash2 className="h-3 w-3" /> Clear
            </Button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask ThriveAI anything..."
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={() => send(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0 h-[44px] w-[44px]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChatTab;
