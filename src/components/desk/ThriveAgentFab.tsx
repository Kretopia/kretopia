import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles, Send, Loader2, Trash2, HelpCircle } from "lucide-react";
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
import { CopilotPlanCard, type CopilotPlan } from "@/components/agent/CopilotPlanCard";
import { CopilotCapabilities } from "@/components/agent/CopilotCapabilities";

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
  "/messages",
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
  // Map message index -> multi-step plans proposed for that assistant turn.
  const [plansByMsg, setPlansByMsg] = useState<Record<number, CopilotPlan[]>>({});
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [surfaceContext, setSurfaceContext] = useState<Record<string, unknown>>({});
  const [firstName, setFirstName] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [deskTab, setDeskTab] = useState<string>("today");
  const [capsOpen, setCapsOpen] = useState(false);

  const surface: CopilotSurface = inferSurface(location.pathname);

  // Track Desk's active tab so we can hide the FAB when the chat tab is open.
  useEffect(() => {
    const onTab = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") setDeskTab(detail);
    };
    window.addEventListener("thrivedesk:set-tab", onTab);
    window.addEventListener("thrivedesk:tab-changed", onTab);
    return () => {
      window.removeEventListener("thrivedesk:set-tab", onTab);
      window.removeEventListener("thrivedesk:tab-changed", onTab);
    };
  }, []);

  // Reset deskTab when leaving /desk
  useEffect(() => {
    if (!location.pathname.startsWith("/desk")) setDeskTab("today");
  }, [location.pathname]);

  // Allow any surface to open the Copilot with a preset prompt:
  //   window.dispatchEvent(new CustomEvent("thrive-copilot:open", { detail: { prompt: "..." } }))
  // Or open in explicit plan-and-execute mode:
  //   window.dispatchEvent(new CustomEvent("thrive-copilot:open", { detail: { prompt: "...", mode: "plan" } }))
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { prompt?: string; mode?: "plan" | "chat" }
        | undefined;
      setOpen(true);
      if (!detail?.prompt) return;

      if (detail.mode === "plan") {
        // Skip free-form chat — go straight to the planner and render a PlanCard.
        const goal = detail.prompt;
        setTimeout(() => {
          setMessages((prev) => {
            const userMsg: CopilotMessage = { role: "user", content: `Plan & execute: ${goal}` };
            const assistantMsg: CopilotMessage = {
              role: "assistant",
              content: "Drafting a plan…",
            };
            const next = [...prev, userMsg, assistantMsg];
            const assistantIdx = next.length - 1;
            // Kick the planner asynchronously
            (async () => {
              try {
                const projectId =
                  (surfaceContext as any)?.project_id ??
                  (surfaceContext as any)?.active_project?.id ??
                  null;
                const { data, error } = await supabase.functions.invoke("copilot-planner", {
                  body: { goal, surface, project_id: projectId },
                });
                if (error) throw error;
                if (data?.plan_id) {
                  setPlansByMsg((p) => ({
                    ...p,
                    [assistantIdx]: [
                      ...(p[assistantIdx] ?? []),
                      {
                        id: data.plan_id,
                        goal,
                        summary: data.summary,
                        status: data.status ?? "proposed",
                        steps: data.steps ?? [],
                      },
                    ],
                  }));
                  setMessages((prev2) =>
                    prev2.map((m, i) =>
                      i === assistantIdx
                        ? { ...m, content: data.summary || "Here's the plan — review the steps below." }
                        : m,
                    ),
                  );
                } else {
                  setMessages((prev2) =>
                    prev2.map((m, i) =>
                      i === assistantIdx
                        ? { ...m, content: data?.summary || "Couldn't draft a plan for that. Try being more specific." }
                        : m,
                    ),
                  );
                }
              } catch (err) {
                console.warn("Plan-mode planner failed", err);
                toast.error("Couldn't draft that plan — try again.");
                setMessages((prev2) =>
                  prev2.map((m, i) =>
                    i === assistantIdx
                      ? { ...m, content: "Sorry — planning failed. Try again." }
                      : m,
                  ),
                );
              }
            })();
            return next;
          });
        }, 50);
        return;
      }

      // Default: just prefill the composer.
      setTimeout(() => setText(detail.prompt!), 50);
    };
    window.addEventListener("thrive-copilot:open", handler);
    return () => window.removeEventListener("thrive-copilot:open", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface, surfaceContext]);

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
        const { visible, actions: parsed, plans: parsedPlans } = extractActions(assistantSoFar);
        if (parsed.length > 0 || parsedPlans.length > 0) {
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

          // Fan out: each parsed plan calls the planner directly and renders a PlanCard.
          for (const planReq of parsedPlans) {
            try {
              const { data, error } = await supabase.functions.invoke("copilot-planner", {
                body: {
                  goal: planReq.goal,
                  surface: planReq.surface ?? surface,
                  project_id: (surfaceContext as any)?.active_project?.id ?? null,
                },
              });
              if (error) throw error;
              if (assistantIdx >= 0 && data?.plan_id) {
                setPlansByMsg((prev) => ({
                  ...prev,
                  [assistantIdx]: [
                    ...(prev[assistantIdx] ?? []),
                    {
                      id: data.plan_id,
                      goal: planReq.goal,
                      summary: data.summary,
                      status: data.status ?? "proposed",
                      steps: data.steps ?? [],
                    },
                  ],
                }));
              } else if (data?.summary) {
                toast.message(data.summary);
              }
            } catch (err) {
              console.warn("Copilot plan propose failed", err);
              toast.error("Couldn't draft that plan — try again.");
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
      setPlansByMsg({});
      toast.success("History cleared");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not clear history");
    }
  }, [user]);

  // FAB visibility: hide the floating orb on chat surfaces & unauthenticated paths.
  // The Sheet itself remains mounted so the global header sparkle (thrive-copilot:open)
  // can still open the Copilot from anywhere — including /messages and Desk chat.
  // Track desktop breakpoint — on lg+ the persistent DesktopCopilotRail handles
  // Copilot, so we hide the FAB to avoid two assistants with diverged state.
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const fabHidden =
    !user ||
    isDesktop ||
    HIDDEN_PATH_PREFIXES.some((p) => location.pathname.startsWith(p)) ||
    (location.pathname.startsWith("/desk/") && deskTab === "messages");

  // If there's no user at all, don't mount anything (avoids flashing the drawer pre-auth).
  if (!user) return null;

  const quickPrompts = QUICK_PROMPTS_BY_SURFACE[surface] ?? QUICK_PROMPTS_BY_SURFACE.home!;
  const surfaceLabel = SURFACE_LABEL[surface];

  return (
    <>
      {!fabHidden && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Thrive"
          title="Thrive — your assistant"
          className={cn(
            "fixed right-4 z-40 h-14 w-14 rounded-full shadow-xl",
            "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
            "flex items-center justify-center active:scale-95 transition-transform",
            "bottom-[calc(env(safe-area-inset-bottom)+5rem)]",
          )}
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-border p-0 h-[85vh] flex flex-col"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Thrive
              </SheetTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  On: {surfaceLabel}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setCapsOpen(true)}
                  aria-label="What can Copilot do?"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-medium">What can I do?</span>
                </Button>
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
                  {firstName ? `Hey ${firstName} — ` : "Hey — "}I'm Thrive.
                  I know your profile, projects, money and events, and I follow you
                  across the platform. What's up?
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Try
                    </div>
                    <button
                      onClick={() => setCapsOpen(true)}
                      className="text-[10px] font-semibold text-primary hover:underline"
                    >
                      See everything →
                    </button>
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
                {/* Plan cards for multi-step plans this turn proposed */}
                {m.role === "assistant" && plansByMsg[i]?.length ? (
                  <div className="space-y-2 max-w-[95%]">
                    {plansByMsg[i].map((plan) => (
                      <CopilotPlanCard key={plan.id} plan={plan} />
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

      <CopilotCapabilities
        open={capsOpen}
        onOpenChange={setCapsOpen}
        onPick={(prompt) => {
          setOpen(true);
          setTimeout(() => send(prompt), 60);
        }}
      />
    </>
  );
};
