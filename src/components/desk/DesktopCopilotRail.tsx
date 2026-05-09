import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, ChevronRight, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  streamCopilot,
  loadCopilotHistory,
  inferSurface,
  SURFACE_LABEL,
  extractActions,
  type CopilotMessage,
} from "@/lib/thriveCopilot";

/**
 * Desktop-only persistent Thrive Copilot rail.
 * Shown on the right edge for `lg+` screens on key authed routes.
 * Collapsible to a thin pill so it never blocks the main canvas.
 * Mobile keeps using ThriveAgentFab (sheet) — this component renders nothing on mobile.
 */

// Thrive rail is shown on every authed route by default. Only a small set of
// truly full-screen / pre-auth surfaces opt out.
const RAIL_DISABLED_PREFIXES = [
  "/auth",
  "/onboarding",
  "/landing",
  "/call",
  "/guest-call",
  "/check-in",
  "/claim",
  "/accept-invite",
  "/epk/",
  "/u/",
  "/site/",
  "/website-builder",
  "/admin",
];

const STORAGE_KEY = "thrive-rail-collapsed";
const FULLSCREEN_KEY = "thrive-rail-fullscreen";

const QUICK_PROMPTS: Record<string, string[]> = {
  home: ["What's on for today?", "Draft an outreach DM", "Find paid gigs this week"],
  desk: ["What's blocking my project?", "Draft an invoice", "Summarize this brief"],
  pay: ["Who owes me money?", "Send a reminder", "What did I earn this month?"],
  match: ["Suggest 3 collaborators", "Who should I follow up with?"],
  gigs: ["Find scouted gigs for me", "Draft an application"],
  profile: ["Score my profile", "Improve my bio", "Generate a tagline"],
  credit: ["Add a credit", "Request a vouch"],
  event: ["Plan promo for my event", "Draft an invite message"],
};

export function DesktopCopilotRail() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const surface = inferSurface(pathname);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });
  const [fullscreen, setFullscreen] = useState<boolean>(() => {
    try { return localStorage.getItem(FULLSCREEN_KEY) === "1"; } catch { return false; }
  });
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Visibility: show on every authed route except a small disabled list.
  const disabledByPrefix = RAIL_DISABLED_PREFIXES.some((p) => pathname.startsWith(p));
  const visible = !!user && !disabledByPrefix;

  // Load history once on mount when visible
  useEffect(() => {
    if (!visible || !user) return;
    let cancelled = false;
    loadCopilotHistory()
      .then((hist) => {
        if (!cancelled) setMessages(hist);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [visible, user]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  // Reserve horizontal space ONLY on desktop (lg+ = 1024px+) so mobile/tablet
  // never gets right-padding for a rail that isn't rendered there.
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      if (!visible || collapsed || !isDesktop) {
        root.style.setProperty("--copilot-rail-w", "0px");
      } else if (fullscreen) {
        // Fullscreen takeover — main content hides behind the rail.
        root.style.setProperty("--copilot-rail-w", `${window.innerWidth}px`);
      } else {
        root.style.setProperty(
          "--copilot-rail-w",
          window.matchMedia("(min-width: 1280px)").matches ? "380px" : "340px",
        );
      }
    };
    apply();
    const mq = window.matchMedia("(min-width: 1024px)");
    mq.addEventListener?.("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener?.("change", apply);
      window.removeEventListener("resize", apply);
      root.style.setProperty("--copilot-rail-w", "0px");
    };
  }, [visible, collapsed, fullscreen]);

  const persistCollapsed = (v: boolean) => {
    setCollapsed(v);
    try { localStorage.setItem(STORAGE_KEY, v ? "1" : "0"); } catch {}
  };
  const persistFullscreen = (v: boolean) => {
    setFullscreen(v);
    try { localStorage.setItem(FULLSCREEN_KEY, v ? "1" : "0"); } catch {}
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput("");
    const next: CopilotMessage[] = [...messages, { role: "user", content }, { role: "assistant", content: "" }];
    setMessages(next);
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await streamCopilot({
        messages: [{ role: "user", content }],
        surface,
        surfaceContext: { pathname },
        signal: ctrl.signal,
        onDelta: (chunk) => {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") {
              copy[copy.length - 1] = { ...last, content: last.content + chunk };
            }
            return copy;
          });
        },
        onDone: () => {},
        onError: (err) => {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant" && !last.content) {
              copy[copy.length - 1] = { ...last, content: `_${err}_` };
            }
            return copy;
          });
        },
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  if (!visible) return null;

  // Collapsed pill
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => persistCollapsed(false)}
        className="hidden lg:flex fixed right-3 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-1.5 rounded-full bg-card border border-border shadow-lg px-2.5 py-3 hover:border-primary/40 transition-colors"
        aria-label="Open Thrive Copilot"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
          Thrive
        </span>
      </button>
    );
  }

  const prompts = QUICK_PROMPTS[surface] || QUICK_PROMPTS.home;

  return (
    <aside
      className={cn(
        "hidden lg:flex fixed right-0 top-14 bottom-0 z-30 w-[340px] xl:w-[380px]",
        "flex-col border-l border-border bg-background/95",
      )}
      aria-label="Thrive Copilot"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-11 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-7 w-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight truncate">Thrive</p>
            <p className="text-[10px] text-muted-foreground leading-tight truncate">
              On {SURFACE_LABEL[surface]}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => persistCollapsed(true)}
          aria-label="Collapse"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground leading-snug">
              Hi — I'm Thrive. Ask me anything about your work here.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {prompts.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-[11px] rounded-full border border-border bg-card hover:border-primary/40 hover:bg-primary/5 px-2.5 py-1 text-foreground/90 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const visible = m.role === "assistant" ? extractActions(m.content).visible : m.content;
          return (
            <div
              key={i}
              className={cn(
                "rounded-2xl px-3 py-2 text-[13px] leading-snug max-w-[92%]",
                m.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground",
              )}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-1.5 prose-li:my-0">
                  <ReactMarkdown>{visible || (streaming && i === messages.length - 1 ? "…" : "")}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{visible}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-2.5 shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask Thrive…"
            rows={1}
            className="min-h-[40px] max-h-32 resize-none text-[13px]"
          />
          <Button
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => send()}
            disabled={streaming || !input.trim()}
            aria-label="Send"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </aside>
  );
}
