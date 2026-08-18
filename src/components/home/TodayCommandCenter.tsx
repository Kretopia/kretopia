import type { ReactNode } from "react";

interface TodayCommandCenterProps {
  /** Conversational entry point — always first, above any tier. */
  entry: ReactNode;
  /** Tier 1-2: urgent/time-sensitive + the next best action (TodayThreeCards, KretoTip, proactive nudges). */
  nextAction: ReactNode;
  /** Tier 3: today's schedule (sessions, live stages, speed rounds). */
  schedule?: ReactNode;
  /** Tier 4: active work in progress — real project/collab signals when available. */
  activeWork?: ReactNode;
  /** Tier 5: opportunities (people/gigs surfaced for the user). */
  opportunities?: ReactNode;
  /** Tier 6: supporting information — briefings, pulse, approvals, scouted gigs, trending, tucked one tap away. */
  supporting?: ReactNode;
}

/**
 * TodayCommandCenter — the single reusable layout for Today's priority-
 * ordered content. It does not fetch or own any data; UnifiedHome.tsx keeps
 * every existing data hook and child component exactly as-is and simply
 * hands each one to the tier it belongs in. This is a layout/priority
 * wrapper, not a rewrite — nothing here can lose data because nothing here
 * fetches data.
 *
 * Priority order (fixed, matches the product intent "what matters right
 * now" -> "what's coming today" -> "what's in motion" -> "what could be
 * next" -> "everything else"):
 *   entry -> nextAction -> schedule -> activeWork -> opportunities -> supporting
 */
export const TodayCommandCenter = ({
  entry,
  nextAction,
  schedule,
  activeWork,
  opportunities,
  supporting,
}: TodayCommandCenterProps) => {
  return (
    <div className="space-y-4">
      {entry}
      {nextAction}
      {schedule}
      {activeWork}
      {opportunities}
      {supporting}
    </div>
  );
};

export default TodayCommandCenter;
