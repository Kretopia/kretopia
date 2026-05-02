import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles, Send, Loader2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  streamCopilot,
  loadCopilotHistory,
  inferSurface,
  SURFACE_LABEL,
  extractActions,
  type CopilotMessage,
  type CopilotSurface,
} from "@/lib/thriveCopilot";
import { sendAgentIntent, type OrchAction } from "@/lib/agentOrchestrator";
import { AgentApprovalCard } from "@/components/agent/AgentApprovalCard";

/**
 * Thrive Copilot — the SINGLE assistant for the whole platform.
 *
 * - Persistent thread across surfaces (Desk, Pay, Match, Credits, Events, Profile…)
 *   — server stores both turns in ai_messages so reopening anywhere shows full history.
 * - Surface chip tells the model where the user opened it from, so replies stay
 *   relevant to the page in front of them ("On: ThrivePay · Invoice #1042").
 * - Greets the user by first name on every reply (server-side prompt).
 *
 * Hidden on auth, landing, and other unauthenticated/full-screen surfaces.
 */

const HIDDEN_PATH_PREFIXES = [
  "/auth",
  "/login",
  "/signup",
  "/onboarding",
  "/claim",
  "/accept-invite",
  "/landing",
  "/check-in",
  "/call/",
  "/guest-call",
];

const QUICK_PROMPTS_BY_SURFACE: Partial<Record<CopilotSurface, string[]>> = {
  desk: [
    "Where does my main project stand?",
    "What's overdue?",
    "Draft tomorrow's first task for me",
  ],
  pay: [
    "How much am I owed right now?",
    "Draft a payment-due reminder",
    "Summarize this week's money",
  ],
  match: [
    "Find me a videographer in my city",
    "Draft an outreach DM",
  ],
  gigs: [
    "Find gigs that match my skills",
    "Help me write a strong application",
  ],
  home: [
    "What's the most useful thing I can do today?",
    "Catch me up since yesterday",
  ],
  profile: [
    "What's missing from my profile?",
    "Suggest a stronger bio for me",
  ],
  credit: [
    "Which credits should I verify next?",
    "Tag collaborators on my latest credit",
  ],
  event: [
    "Help me write a kickoff post for my next event",
    "Recap my last event for me",
  ],
};

export const ThriveAgentFab = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  // Map message index -> orchestrator actions proposed for that assistant turn.
  const [actionsByMsg, setActionsByMsg] = useState<Record<number, OrchAction[]>>({});
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [surfaceContext, setSurfaceContext] = useState<Record<string, unknown>>({});
  const [firstName, setFirstName] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const surface: CopilotSurface = inferSurface(location.pathname);

  // Allow any surface to open the Copilot with a preset prompt:
  //   window.dispatchEvent(new CustomEvent("thrive-copilot:open", { detail: { prompt: "..." } }))
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { prompt?: string } | undefined;
      setOpen(true);
      if (detail?.prompt) {
        // Defer so the drawer mounts before we autofill.
        setTimeout(() => setText(detail.prompt!), 50);
      }
    };
    window.addEventListener("thrive-copilot:open", handler);
    return () => window.removeEventListener("thrive-copilot:open", handler);
  }, []);

  // Resolve surface_context from the URL where helpful (project_id from /desk/:id)
  useEffect(() => {
    const ctx: Record<string, unknown> = { pathname: location.pathname };
    if (firstName) ctx.first_name_hint = firstName;
    const deskMatch = location.pathname.match(/^\/desk\/([0-9a-f-]{36})/i);
    if (deskMatch) ctx.project_id = deskMatch[1];
    const eventMatch = location.pathname.match(/^\/event\/([^/]+)/i);
    if (eventMatch) ctx.event_slug_or_id = eventMatch[1];
    setSurfaceContext(ctx);
  }, [location.pathname, firstName]);

  // Pull the user's first name for the personalized greeting + as a hint to
  // the model via surface_context (the server already loads this, but sending
  // it client-side guarantees the empty-state greeting is never "Hey —").
  useEffect(() => {
    if (!user) {
      setFirstName(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const fn = (data?.full_name ?? "").trim().split(/\s+/)[0] || null;
        setFirstName(fn);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // When the drawer opens for the first time, hydrate persisted history.
  useEffect(() => {
    if (!open || historyLoaded || !user) return;
    let cancelled = false;
    loadCopilotHistory()
      .then((rows) => {
        if (cancelled) return;
        setMessages(rows);
        setHistoryLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setHistoryLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, historyLoaded, user]);

  // Auto-scroll on new content
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const send = useCallback(
    async (msgText?: string) => {
      const content = (msgText ?? text).trim();
      if (!content || sending) return;
      const userMsg: CopilotMessage = { role: "user", content };
      const next = [...messages, userMsg];
      setMessages(next);
      setText("");
      setSending(true);

      // Optimistic empty assistant placeholder so streaming can fill it
      let assistantSoFar = "";
      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamCopilot({
          // Server already has prior history; send only the latest user turn
          messages: [userMsg],
          surface,
          surfaceContext,
          conversationId,
          onConversationId: setConversationId,
          onDelta: upsertAssistant,
          onDone: () => setSending(false),
          onError: (err) => {
            toast.error(err);
            // Roll back the optimistic user message if nothing came back
            if (!assistantSoFar) {
              setMessages((prev) => prev.filter((m) => m !== userMsg));
            }
            setSending(false);
          },
          signal: controller.signal,
        });

        // ---- Cross-surface action extraction ----
        // After streaming completes, scan the assistant text for <action> tags,
        // strip them from the visible bubble, and ask the orchestrator to
        // propose them as approval cards.
        const { visible, actions: parsed } = extractActions(assistantSoFar);
        if (parsed.length > 0) {
          let assistantIdx = -1;
          setMessages((prev) => {
            const idx = prev.length - 1;
            if (prev[idx]?.role === "assistant") {
              assistantIdx = idx;
              return prev.map((m, i) =>
                i === idx ? { ...m, content: visible || "On it." } : m,
              );
            }
            return prev;
          });

          // Fan out: each parsed action becomes a queued orchestrator run.
          for (const intentObj of parsed) {
            try {
              const run = await sendAgentIntent(intentObj.intent, {
                surface: intentObj.surface ?? surface,
                ...surfaceContext,
              });
              if (assistantIdx >= 0 && run.actions?.length) {
                setActionsByMsg((prev) => ({
                  ...prev,
                  [assistantIdx]: [...(prev[assistantIdx] ?? []), ...run.actions],
                }));
              }
            } catch (err) {
              console.warn("Copilot action propose failed", err);
              toast.error("Couldn't queue that action — try again.");
            }
          }
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
        setSending(false);
      } finally {
        abortRef.current = null;
      }
    },
    [text, sending, messages, surface, surfaceContext, conversationId],
  );

  const clearHistory = useCallback(async () => {
    if (!user) return;
    if (!confirm("Clear your Thrive Copilot history? This can't be undone.")) return;
    try {
      const { data: convo } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("user_id", user.id)
        .eq("title", "__copilot__")
        .maybeSingle();
      if (convo?.id) {
        await supabase.from("ai_messages").delete().eq("conversation_id", convo.id);
      }
      setMessages([]);
      setActionsByMsg({});
      toast.success("History cleared");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not clear history");
    }
  }, [user]);

  const hidden =
    !user ||
    HIDDEN_PATH_PREFIXES.some((p) => location.pathname.startsWith(p));

  if (hidden) return null;

  const quickPrompts = QUICK_PROMPTS_BY_SURFACE[surface] ?? QUICK_PROMPTS_BY_SURFACE.home!;
  const surfaceLabel = SURFACE_LABEL[surface];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Thrive Copilot"
        className={cn(
          "fixed right-4 z-40 h-14 w-14 rounded-full shadow-xl",
          "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
          "flex items-center justify-center active:scale-95 transition-transform",
          "bottom-[calc(env(safe-area-inset-bottom)+5rem)]",
        )}
      >
        <Sparkles className="h-6 w-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-border p-0 h-[85vh] flex flex-col"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Thrive Copilot
              </SheetTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  On: {surfaceLabel}
                </Badge>
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground"
                    onClick={clearHistory}
                    aria-label="Clear chat history"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable chat area */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3"
          >
            {messages.length === 0 && historyLoaded && !sending && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {firstName ? `Hey ${firstName} — ` : "Hey — "}I'm your Thrive Copilot.
                  I know your profile, projects, money and events, and I follow you
                  across the platform. What's up?
                </div>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Try
                  </div>
                  {quickPrompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      disabled={sending}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/40 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <div
                  className={cn(
                    "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-accent/60 text-foreground",
                  )}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_pre]:my-1 [&_pre]:text-xs">
                      <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
                {/* Approval cards for any actions this assistant turn proposed */}
                {m.role === "assistant" && actionsByMsg[i]?.length ? (
                  <div className="space-y-2 max-w-[95%]">
                    {actionsByMsg[i].map((action) => (
                      <AgentApprovalCard
                        key={action.id}
                        action={action}
                        compact
                        onResolved={(decision) => {
                          // Mark the local copy as resolved so the card hides itself.
                          setActionsByMsg((prev) => ({
                            ...prev,
                            [i]: (prev[i] ?? []).map((a) =>
                              a.id === action.id
                                ? {
                                    ...a,
                                    status:
                                      decision === "approved"
                                        ? "executed"
                                        : "rejected",
                                  }
                                : a,
                            ),
                          }));
                        }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {sending && messages[messages.length - 1]?.role === "user" && (
              <div className="mr-auto bg-accent/60 rounded-2xl px-3.5 py-2.5 text-sm text-muted-foreground inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking…
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border bg-background p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shrink-0">
            <div className="flex items-end gap-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={`Ask anything from ${surfaceLabel}…`}
                rows={2}
                className="resize-none text-sm flex-1 min-h-[44px]"
              />
              <Button
                onClick={() => send()}
                disabled={!text.trim() || sending}
                size="icon"
                className="h-11 w-11 shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
