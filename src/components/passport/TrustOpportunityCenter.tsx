import { PassportMomentum } from "./PassportMomentum";
import { ThriveRemembersChip } from "./ThriveRemembersChip";
import { RecentlyWorkedWith } from "./RecentlyWorkedWith";
import { cn } from "@/lib/utils";

interface TrustOpportunityCenterProps {
  userId: string;
  className?: string;
}

/**
 * Trust & Opportunity Center — the SECOND (and last) post-Passport block.
 * One shared card shell around what used to be three separate top-level
 * mounts (PassportMomentum, RecentlyWorkedWith, ThriveRemembersChip). Each
 * inner piece keeps its own real data-fetching and already-correct
 * self-hiding-when-empty behavior — only the outer shell changed, so no
 * data or capability is touched here.
 */
export function TrustOpportunityCenter({ userId, className }: TrustOpportunityCenterProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 space-y-3", className)}>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Trust &amp; Opportunity</p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Recent momentum, who you've worked with, and what Kreto remembers — fills in as it happens.
        </p>
      </div>
      <PassportMomentum />
      <RecentlyWorkedWith userId={userId} />
      <ThriveRemembersChip />
    </div>
  );
}

export default TrustOpportunityCenter;
