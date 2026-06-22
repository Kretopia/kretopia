/**
 * Standing — the Passport level-up system.
 *
 * Replaces the dormant "tier" label with an active, motivational loop that
 * tells creators exactly what their next high-leverage move is. Inputs:
 *  - verified credits count + recency
 *  - co-signs received  (heaviest weight — these are the moat)
 *  - profile completion (capped contribution, prevents profile-padding)
 *  - recent activity (gigs / studios / collabs in last 90 days)
 *
 * Pure function. No DB writes. UI surfaces it on the hero ribbon and the
 * Home "Level Up" card.
 */

export type StandingLevel = 1 | 2 | 3 | 4 | 5;

export interface StandingInputs {
  verifiedCredits: number;
  recentCredits90d?: number;
  cosignsReceived: number;
  profileCompletionPct: number; // 0..100
  activeProjects90d?: number;
  replySlaHours?: number | null;
}

export interface StandingNextAction {
  id: string;
  label: string;
  points: number;
  deeplink: string;
}

export interface Standing {
  level: StandingLevel;
  title: string;
  score: number;            // raw 0..200+
  progressPct: number;      // 0..100 toward next level
  nextLevelAt: number;      // raw score required for next level
  nextLevelTitle: string | null;
  nextActions: StandingNextAction[];
}

const LEVELS: Array<{ level: StandingLevel; title: string; min: number }> = [
  { level: 1, title: "Newcomer", min: 0 },
  { level: 2, title: "Working Creative", min: 30 },
  { level: 3, title: "Verified Pro", min: 75 },
  { level: 4, title: "Industry Name", min: 140 },
  { level: 5, title: "Marquee", min: 220 },
];

export function computeStanding(inputs: StandingInputs): Standing {
  const {
    verifiedCredits,
    recentCredits90d = 0,
    cosignsReceived,
    profileCompletionPct,
    activeProjects90d = 0,
    replySlaHours,
  } = inputs;

  // Weights — tuned so that the *moat* signals (credits + cosigns) dominate.
  const score = Math.round(
    verifiedCredits * 4 +
      recentCredits90d * 2 +
      cosignsReceived * 6 +
      Math.min(profileCompletionPct, 100) * 0.3 +
      activeProjects90d * 3 +
      (replySlaHours != null && replySlaHours < 24 ? 5 : 0)
  );

  const current = [...LEVELS].reverse().find((l) => score >= l.min) ?? LEVELS[0];
  const next = LEVELS.find((l) => l.min > current.min) ?? null;
  const span = next ? next.min - current.min : 1;
  const progressPct = next ? Math.min(100, Math.round(((score - current.min) / span) * 100)) : 100;

  return {
    level: current.level,
    title: current.title,
    score,
    progressPct,
    nextLevelAt: next?.min ?? current.min,
    nextLevelTitle: next?.title ?? null,
    nextActions: suggestNextActions(inputs),
  };
}

function suggestNextActions(i: StandingInputs): StandingNextAction[] {
  const actions: StandingNextAction[] = [];

  if (i.verifiedCredits < 3) {
    actions.push({
      id: "add-credits",
      label: `Add ${3 - i.verifiedCredits} more verified credit${3 - i.verifiedCredits === 1 ? "" : "s"}`,
      points: 12,
      deeplink: "/credits",
    });
  } else if (i.recentCredits90d === 0) {
    actions.push({
      id: "add-recent-credit",
      label: "Add a credit from the last 90 days",
      points: 6,
      deeplink: "/credits",
    });
  }

  if (i.cosignsReceived < 3) {
    actions.push({
      id: "request-cosign",
      label: "Ask a collaborator for a co-sign",
      points: 18,
      deeplink: "/profile?focus=cosigns",
    });
  }

  if (i.profileCompletionPct < 80) {
    actions.push({
      id: "complete-profile",
      label: "Finish your Passport (bio, photo, links)",
      points: Math.max(4, Math.round((80 - i.profileCompletionPct) * 0.3)),
      deeplink: "/profile?focus=complete",
    });
  }

  if ((i.activeProjects90d ?? 0) === 0) {
    actions.push({
      id: "start-studio",
      label: "Start a Studio for your next project",
      points: 6,
      deeplink: "/desk",
    });
  }

  return actions.slice(0, 3);
}
