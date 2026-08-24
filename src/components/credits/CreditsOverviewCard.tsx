import { ShieldCheck, Clock3, FileWarning, Handshake, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { MyCreditsOverview } from "@/hooks/useMyCredits";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const ACCENT = "#FF2DA1";

interface Props {
  overview: MyCreditsOverview | null;
  completeness: number;
  nextAction: { label: string; onClick: () => void } | null;
  loading?: boolean;
}

const STAT_TINT: Record<string, string> = {
  Verified: "23,217,212",
  Pending: "255,199,44",
  "Needs evidence": "255,140,0",
  "Co-signs": "255,45,161",
};

/**
 * CreditsOverviewCard — the single summary of the person's own record.
 * Counts come from `my_credits_overview` (auth.uid() scoped) — never from a
 * client-side tally over a public table.
 */
export function CreditsOverviewCard({ overview, completeness, nextAction, loading }: Props) {
  const reduced = useReducedMotion();
  const stats = [
    { icon: ShieldCheck, label: "Verified", value: overview?.verified_credits ?? 0 },
    { icon: Clock3, label: "Pending", value: overview?.pending_credits ?? 0 },
    { icon: FileWarning, label: "Needs evidence", value: overview?.missing_evidence ?? 0 },
    { icon: Handshake, label: "Co-signs", value: overview?.endorsements_received ?? 0 },
  ];

  const ring = Math.max(0, Math.min(100, completeness));

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.5, ease: [0.2, 0.65, 0.3, 0.95] }}
      className="relative overflow-hidden rounded-2xl border border-border bg-muted/30 p-5 shadow-[0_0_60px_-25px_rgba(255,45,161,0.7)] sm:p-6"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(110% 90% at 0% 0%, rgba(255,45,161,0.14), transparent 55%), radial-gradient(110% 90% at 100% 20%, rgba(23,217,212,0.10), transparent 55%)",
        }}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Your record</p>
          <p className="mt-1 flex items-end gap-2 text-5xl font-bold leading-none tracking-tight text-foreground">
            {loading ? "—" : <AnimatedNumber value={overview?.total_credits ?? 0} />}
            <span className="pb-1 text-sm font-medium text-muted-foreground">credits</span>
          </p>
        </div>

        {/* Completeness ring */}
        <div className="relative h-[86px] w-[86px] shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#credits-ring)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - ring / 100) }}
              transition={{ duration: reduced ? 0 : 1.1, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="credits-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FF2DA1" />
                <stop offset="60%" stopColor="#FFC72C" />
                <stop offset="100%" stopColor="#17D9D4" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold leading-none text-foreground">
              <AnimatedNumber value={ring} />%
            </span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Complete
            </span>
          </div>
        </div>
      </div>

      <dl className="relative mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.1 + i * 0.06 }}
            whileHover={reduced ? undefined : { y: -3 }}
            className="group relative overflow-hidden rounded-xl border border-border bg-muted/30 px-3 py-2.5 transition-colors hover:border-primary/40"
            style={{ boxShadow: `inset 0 0 0 0 rgba(${STAT_TINT[s.label]},0)` }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: `radial-gradient(90% 90% at 50% 100%, rgba(${STAT_TINT[s.label]},0.16), transparent 70%)` }}
            />
            <dt className="relative flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <s.icon className="h-3.5 w-3.5" aria-hidden style={{ color: `rgb(${STAT_TINT[s.label]})` }} />
              {s.label}
            </dt>
            <dd className="relative mt-1 text-2xl font-semibold text-foreground">
              {loading ? "—" : <AnimatedNumber value={s.value} />}
            </dd>
          </motion.div>
        ))}
      </dl>

      {nextAction && (
        <button
          type="button"
          onClick={nextAction.onClick}
          className={cn(
            "group relative mt-5 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-5 py-2.5 text-sm font-semibold text-foreground transition-transform",
            "hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70",
          )}
          style={{ backgroundColor: ACCENT, boxShadow: "0 12px 40px -14px rgba(255,45,161,0.9)" }}
        >
          <span className="relative">{nextAction.label}</span>
          <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      )}
    </motion.div>
  );
}
