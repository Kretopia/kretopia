import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  PenLine, IdCard, Compass, Send, ArrowUpRight,
  CheckCircle2, Clock, ShieldQuestion, Loader2,
} from "lucide-react";
import { BRAND } from "@/lib/brandLexicon";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FeatureAITutorial } from "@/components/features/FeatureAITutorial";
import { KRETO_TUTORIAL } from "@/components/landing/kretopia/tutorialContent";
import { useFitTitleOneLine } from "@/hooks/useFitTitleOneLine";
import { InlineKretoChat } from "@/components/kreto/InlineKretoChat";

const QUICK_ACTIONS = [
  {
    icon: PenLine,
    label: "Draft a pitch",
    prompt: "Help me draft a pitch for an opportunity I'm considering.",
  },
  {
    icon: IdCard,
    label: "Improve my Passport",
    prompt: "Look at my Passport and tell me what would make it stronger.",
  },
  {
    icon: Compass,
    label: "Find matching opportunities",
    prompt: "Find opportunities that match my skills and availability right now.",
  },
  {
    icon: Send,
    label: "Prepare a follow-up",
    prompt: "Help me prepare a follow-up message for a conversation that's gone quiet.",
  },
] as const;

interface RecentGig {
  id: string;
  title: string;
  company: string | null;
  fit_score: number;
}

interface RecentAction {
  id: string;
  title: string;
  status: string;
  action_type: string;
}

interface PassportSnapshot {
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

/**
 * /kreto — live AI workspace. Auto-opens the real Copilot (Sheet, mounted
 * globally in App.tsx) on arrival, and surfaces real account context
 * (Passport snapshot, most recent Scout match, recent proposed actions)
 * so the page reads as an active dashboard rather than an empty pitch for
 * a feature the user hasn't tried yet. Every section only renders when
 * real data exists — no placeholder numbers, no invented activity.
 */
export default function KretoTab() {
  const { user } = useAuth();
  const [passport, setPassport] = useState<PassportSnapshot | null>(null);
  const [gig, setGig] = useState<RecentGig | null>(null);
  const [actions, setActions] = useState<RecentAction[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [seed, setSeed] = useState<{ text: string; n: number } | null>(null);
  const ask = (text: string) => setSeed((s) => ({ text, n: (s?.n ?? 0) + 1 }));
  const titleWrapperRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useFitTitleOneLine(titleWrapperRef, titleRef, []);

  useEffect(() => {
    if (!user) { setLoadingContext(false); return; }
    let cancelled = false;
    (async () => {
      const [{ data: profile }, { data: gigs }, { data: actionRows }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, role").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("scouted_gigs")
          .select("id, title, company, fit_score")
          .eq("target_user_id", user.id)
          .gt("expires_at", new Date().toISOString())
          .order("fit_score", { ascending: false })
          .limit(1),
        supabase
          .from("agent_actions")
          .select("id, title, status, action_type")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      if (cancelled) return;
      setPassport(profile ?? null);
      setGig(gigs?.[0] ?? null);
      setActions(actionRows ?? []);
      setLoadingContext(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#05070D] text-white">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        {/* Identity + purpose — same eyebrow/title/subtitle/tutorial pattern as every
            other overhauled feature, kept in this page's own dark palette since it
            (like Auth/EditorialFooter) is deliberately dark regardless of theme. */}
        <div className="relative overflow-hidden -mx-4 px-4 pt-4 pb-2">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-quadrille" />
          <div className="relative flex flex-col items-center text-center">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--energy))] mb-3 px-2.5 py-1 rounded-full border border-[hsl(var(--energy)/0.35)] bg-[hsl(var(--energy)/0.06)] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--energy))] shadow-[0_0_8px_hsl(var(--energy)/0.8)]" />
              AI Executive Producer
            </p>
            <div ref={titleWrapperRef} className="w-full max-w-3xl">
              <h1
                ref={titleRef}
                className="font-black tracking-[-0.03em] text-white leading-[1.05]"
                style={{ fontSize: "3rem" }}
              >
                {BRAND.agentName}. <span className="pink-glow-breathe" style={{ color: "hsl(var(--energy))" }}>Your creative career, run point.</span>
              </h1>
            </div>
            <p className="mt-3 text-sm sm:text-base text-white/60 max-w-xl mx-auto">
              {BRAND.agentRole}. Finds opportunities, drafts pitches, keeps your Passport sharp,
              and closes the loop from search to paid credit — with your approval at every step.
            </p>
            <FeatureAITutorial featureKey="kreto" label="How Kreto works" steps={KRETO_TUTORIAL} />
          </div>
        </div>

        {/* Bottom hairline — anchors the hero, same treatment as Studio Room */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Primary surface — the live thread, answered right here on the page */}
        <InlineKretoChat key={seed?.n ?? 0} seedPrompt={seed?.text ?? null} />

        {/* Quick actions — secondary shortcuts, visually quieter than the primary CTA above */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold mb-2.5">Or start with</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
              <button
                key={label}
                type="button"
                onClick={() => ask(prompt)}
                className="btn-glass btn-glass-outline flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium"
              >
                <Icon className="h-4 w-4 text-white/50 shrink-0" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Live context: Passport, Scout, recent actions */}
        {loadingContext ? (
          <div className="flex items-center gap-2 text-white/40 text-sm py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your context…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {passport && (
              <Link
                to="/profile"
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/25 transition-colors"
              >
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold mb-2">Passport</p>
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-white/10 overflow-hidden shrink-0 flex items-center justify-center text-xs font-semibold">
                    {passport.avatar_url ? (
                      <img src={passport.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      passport.full_name?.[0] || "?"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{passport.full_name || "Your profile"}</p>
                    <p className="text-xs text-white/50 truncate">{passport.role || "Open your Passport"}</p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-white/30 ml-auto shrink-0" />
                </div>
              </Link>
            )}

            {gig && (
              <button
                type="button"
                onClick={() => ask(`Help me think through this opportunity: "${gig.title}"${gig.company ? ` at ${gig.company}` : ""}.`)}
                className="btn-glass btn-glass-outline text-left rounded-xl p-4"
              >
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold mb-2">Top Scout match</p>
                <p className="text-sm font-medium truncate">{gig.title}</p>
                <p className="text-xs text-white/50 truncate">
                  {gig.company || "Opportunity"} · {gig.fit_score}% fit
                </p>
              </button>
            )}

            {actions.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:col-span-2">
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold mb-2.5">Recent proposed actions</p>
                <div className="space-y-2">
                  {actions.map((a) => {
                    const Icon = a.status === "completed" ? CheckCircle2 : a.status === "pending" ? ShieldQuestion : Clock;
                    return (
                      <div key={a.id} className="flex items-center gap-2.5 text-sm">
                        <Icon className="h-3.5 w-3.5 text-white/40 shrink-0" aria-hidden />
                        <span className="truncate flex-1">{a.title}</span>
                        <span className="text-[10px] uppercase tracking-wider text-white/40 shrink-0">{a.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-white/35 leading-relaxed">
          {BRAND.agentName} opens automatically above. Anything that could affect other people, spend
          money, or send something on your behalf waits for your approval first — {BRAND.agentName}
          only acts on its own for safe, reversible steps.
        </p>
      </div>
    </div>
  );
}
