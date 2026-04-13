import { useState, useRef, useEffect, useCallback } from "react";
import { Send, MessageCircle, Trash2, Loader2, Plus, MessageSquare, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  streamChat,
  type ChatMessage,
  loadConversations,
  loadMessages,
  createConversation,
  saveMessage,
  updateConversationTitle,
  deleteConversation,
} from "@/lib/thriveAiChat";
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

type Conversation = { id: string; title: string; updated_at: string };

const AIChatTab = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations()
        .then(setConversations)
        .catch(() => {});
    }
  }, [user]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const selectConversation = async (convo: Conversation) => {
    setActiveConvoId(convo.id);
    setShowSidebar(false);
    try {
      const msgs = await loadMessages(convo.id);
      setMessages(msgs);
    } catch {
      toast({ title: "Error", description: "Failed to load chat", variant: "destructive" });
    }
  };

  const startNewChat = () => {
    setActiveConvoId(null);
    setMessages([]);
    setShowSidebar(false);
  };

  const send = async (text: string) => {
    if (!text.trim() || isLoading || !user) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Create conversation if needed
    let convoId = activeConvoId;
    if (!convoId) {
      try {
        const convo = await createConversation(user.id, text.trim().slice(0, 60));
        convoId = convo.id;
        setActiveConvoId(convo.id);
        setConversations((prev) => [convo, ...prev]);
      } catch {
        toast({ title: "Error", description: "Failed to create chat", variant: "destructive" });
        setIsLoading(false);
        return;
      }
    }

    // Save user message
    await saveMessage(convoId, "user", text.trim()).catch(() => {});

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

    const finalConvoId = convoId;

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsert,
        onDone: async () => {
          setIsLoading(false);
          // Save assistant response
          if (assistantSoFar) {
            await saveMessage(finalConvoId, "assistant", assistantSoFar).catch(() => {});
          }
          // Auto-title: use first user message as title
          if (messages.length === 0) {
            await updateConversationTitle(finalConvoId, text.trim().slice(0, 60)).catch(() => {});
          }
        },
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

  const clearChat = async () => {
    if (isLoading) {
      abortRef.current?.abort();
      setIsLoading(false);
    }
    if (activeConvoId) {
      await deleteConversation(activeConvoId).catch(() => {});
      setConversations((prev) => prev.filter((c) => c.id !== activeConvoId));
    }
    setMessages([]);
    setActiveConvoId(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] md:h-[calc(100vh-14rem)]">
      {/* Top bar with history toggle */}
      <div className="flex items-center gap-2 pb-2 border-b mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSidebar(!showSidebar)}
          className="gap-1.5 text-xs text-muted-foreground"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          History
          {conversations.length > 0 && (
            <span className="ml-1 text-[10px] bg-muted rounded-full px-1.5 py-0.5">
              {conversations.length}
            </span>
          )}
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={startNewChat} className="gap-1.5 text-xs text-muted-foreground">
          <Plus className="h-3.5 w-3.5" /> New Chat
        </Button>
      </div>

      {/* Sidebar overlay for conversation history */}
      {showSidebar && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setShowSidebar(false)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold text-sm">Chat History</h3>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={startNewChat} className="gap-1 text-xs">
              <Plus className="h-3 w-3" /> New
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No conversations yet</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-muted transition-colors flex items-center gap-2",
                    activeConvoId === c.id && "bg-muted"
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
            <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">ThriveIN Assistant</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Your personal helper for pitches, pricing, outreach, contracts, and creative strategy. Personalized to your profile.
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
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-3 [&_ul]:mb-3 [&_ol]:mb-3 [&_h1]:mb-2 [&_h2]:mb-2 [&_h3]:mb-2 [&_h3]:mt-4 [&_li]:mb-1.5 [&_p]:leading-relaxed [&_li]:leading-relaxed">
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
              <Trash2 className="h-3 w-3" /> Delete Chat
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
