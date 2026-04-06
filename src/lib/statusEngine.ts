/**
 * ThriveCredits™ Status Engine
 * 
 * Calculates a creator's status tier based on verified credits.
 * Enterprise (Green) = 100pts, Peer (Purple) = 25pts, Identity/AI (Blue) = 5pts, Manual (Gray) = 1pt
 * 
 * Tier names are aspirational career-stage labels:
 * Hobbyist → Freelancer → Thriver → Professional → Celebrity → Icon
 */

export type StatusTier = "hobbyist" | "freelancer" | "thriver" | "professional" | "celebrity" | "icon";

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
  { tier: "celebrity", min: 500 },
  { tier: "professional", min: 150 },
  { tier: "thriver", min: 50 },
  { tier: "freelancer", min: 10 },
  { tier: "hobbyist", min: 0 },
];

const TIER_META: Record<StatusTier, { label: string; color: string; ringClass: string }> = {
  hobbyist: {
    label: "Hobbyist",
    color: "text-muted-foreground",
    ringClass: "ring-2 ring-border",
  },
  freelancer: {
    label: "Freelancer",
    color: "text-[hsl(0,0%,70%)]",   // silver
    ringClass: "ring-2 ring-[hsl(0,0%,75%)]",
  },
  thriver: {
    label: "Thriver",
    color: "text-primary",
    ringClass: "ring-2 ring-primary",
  },
  professional: {
    label: "Professional",
    color: "text-accent",             // gold
    ringClass: "ring-2 ring-accent",
  },
  celebrity: {
    label: "Celebrity",
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

  let matchedTier: StatusTier = "hobbyist";
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
