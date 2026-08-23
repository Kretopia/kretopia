import { ShieldCheck, Clock3, FileWarning, Handshake } from "lucide-react";
import type { MyCreditsOverview } from "@/hooks/useMyCredits";
import { cn } from "@/lib/utils";

const ACCENT = "#FF2DA1";

interface Props {
  overview: MyCreditsOverview | null;
  completeness: number;
  nextAction: { label: string; onClick: () => void } | null;
  loading?: boolean;
}

/**
 * CreditsOverviewCard — the single summary of the person's own record.
 * Counts come from `my_credits_overview` (auth.uid() scoped) — never from a
 * client-side tally over a public table.
 */
export function CreditsOverviewCard({ overview, completeness, nextAction, loading }: Props) {
  const stats = [
    { icon: ShieldCheck, label: "Verified", value: overview?.verified_credits ?? 0 },
    { icon: Clock3, label: "Pending", value: overview?.pending_credits ?? 0 },
    { icon: FileWarning, label: "Needs evidence", value: overview?.missing_evidence ?? 0 },
    { icon: Handshake, label: "Co-signs", value: overview?.endorsements_received ?? 0 },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Your record</p>
          <p className="mt-1 text-4xl font-bold leading-none tracking-tight text-white">
            {loading ? "—" : overview?.total_credits ?? 0}
            <span className="ml-2 text-sm font-medium text-white/50">credits</span>
          </p>
        </div>
        <div className="min-w-[160px] flex-1 sm:max-w-[240px]">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-white/55">
            <span>Profile completeness</span>
            <span className="text-white/80">{completeness}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={completeness}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completeness"
          >
            <div
              className="h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none"
              style={{ width: `${completeness}%`, backgroundColor: ACCENT }}
            />
          </div>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-[11px] font-medium text-white/50">
              <s.icon className="h-3.5 w-3.5" aria-hidden />
              {s.label}
            </dt>
            <dd className="mt-1 text-xl font-semibold text-white">{loading ? "—" : s.value}</dd>
          </div>
        ))}
      </dl>

      {nextAction && (
        <button
          type="button"
          onClick={nextAction.onClick}
          className={cn(
            "mt-5 w-full rounded-full px-5 py-2.5 text-sm font-semibold text-[#05070D] transition-transform",
            "hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70",
          )}
          style={{ backgroundColor: ACCENT, color: "#fff" }}
        >
          {nextAction.label}
        </button>
      )}
    </div>
  );
}
