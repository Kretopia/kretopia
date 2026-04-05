/**
 * ThriveCredits™ Status Engine
 * 
 * Calculates a creator's status tier based on verified credits.
 * Enterprise (Green) = 100pts, Peer (Purple) = 25pts, Identity/AI (Blue) = 5pts, Manual (Gray) = 1pt
 */

export type StatusTier = "emerging" | "proven" | "elite" | "legacy" | "icon";

export interface StatusResult {
  tier: StatusTier;
  points: number;
  label: string;
  color: string;     // tailwind class
  ringClass: string;  // border gradient class for profile ring
  nextTier?: StatusTier;
  pointsToNext?: number;
}

const VERIFICATION_POINTS: Record<string, number> = {
  enterprise: 100,
  peer: 25,
  identity: 5,
  ai: 5,
  manual: 1,
  pending: 0,
  unverified: 0,
};

const TIER_THRESHOLDS: { tier: StatusTier; min: number }[] = [
  { tier: "icon", min: 1000 },
  { tier: "legacy", min: 500 },
  { tier: "elite", min: 150 },
  { tier: "proven", min: 25 },
  { tier: "emerging", min: 0 },
];

const TIER_META: Record<StatusTier, { label: string; color: string; ringClass: string }> = {
  emerging: {
    label: "Emerging",
    color: "text-muted-foreground",
    ringClass: "ring-2 ring-border",
  },
  proven: {
    label: "Proven",
    color: "text-[hsl(0,0%,70%)]",   // silver
    ringClass: "ring-2 ring-[hsl(0,0%,75%)]",
  },
  elite: {
    label: "Elite",
    color: "text-accent",             // gold
    ringClass: "ring-2 ring-accent",
  },
  legacy: {
    label: "Legacy",
    color: "text-foreground",          // obsidian
    ringClass: "ring-2 ring-foreground",
  },
  icon: {
    label: "Icon",
    color: "text-primary",
    ringClass: "ring-2 ring-primary shadow-glow",
  },
};

export function calculateStatus(credits: { verification_status?: string | null }[]): StatusResult {
  let points = 0;
  for (const credit of credits) {
    const status = (credit.verification_status || "manual").toLowerCase();
    points += VERIFICATION_POINTS[status] ?? 1;
  }

  let matchedTier: StatusTier = "emerging";
  for (const { tier, min } of TIER_THRESHOLDS) {
    if (points >= min) {
      matchedTier = tier;
      break;
    }
  }

  const meta = TIER_META[matchedTier];
  
  // Find next tier
  const currentIdx = TIER_THRESHOLDS.findIndex(t => t.tier === matchedTier);
  const nextTierData = currentIdx > 0 ? TIER_THRESHOLDS[currentIdx - 1] : undefined;

  return {
    tier: matchedTier,
    points,
    label: meta.label,
    color: meta.color,
    ringClass: meta.ringClass,
    nextTier: nextTierData?.tier,
    pointsToNext: nextTierData ? nextTierData.min - points : undefined,
  };
}
