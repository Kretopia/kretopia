/**
 * ThriveStatus™ — Skywards-Inspired Career Prestige System
 * 
 * Calculates a creator's status tier based on verified credits.
 * Enterprise (Green) = 100pts, Peer (Purple) = 25pts, Identity/AI (Blue) = 5pts, Manual (Gray) = 1pt
 * 
 * Tier names are aspirational career-stage labels:
 * Hobbyist → Freelancer → Thriver → Professional → Celebrity → Icon
 * 
 * Directional gating:
 * - Same tier or higher → open connection/messaging
 * - Lower tier → request-only (filtered inbox, like Instagram verified DMs)
 */

export type StatusTier = "hobbyist" | "freelancer" | "thriver" | "professional" | "celebrity" | "icon";

export interface StatusResult {
  tier: StatusTier;
  points: number;
  label: string;
  socialProofLabel: string | null;
  color: string;
  ringClass: string;
  gradient: string;
  nextTier?: StatusTier;
  pointsToNext?: number;
  perks: string[];
  tierIndex: number;          // 0–5, used for gate comparisons
}

const VERIFICATION_POINTS: Record<string, number> = {
  enterprise: 100,
  peer: 25,
  identity: 5,
  ai: 5,
  verified: 5,     // generic "verified" (AI or identity confirmed)
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

interface TierMeta {
  label: string;
  socialProofLabel: string | null;
  color: string;
  ringClass: string;
  gradient: string;
  perks: string[];
}

const TIER_META: Record<StatusTier, TierMeta> = {
  hobbyist: {
    label: "Hobbyist",
    socialProofLabel: null,
    color: "text-muted-foreground",
    ringClass: "ring-2 ring-border",
    gradient: "from-muted-foreground/20 to-muted-foreground/5",
    perks: ["Basic profile", "Claim credits", "Join communities"],
  },
  freelancer: {
    label: "Freelancer",
    socialProofLabel: "Active Creator",
    color: "text-[hsl(0,0%,70%)]",
    ringClass: "ring-2 ring-[hsl(0,0%,75%)]",
    gradient: "from-[hsl(0,0%,75%)]/25 to-[hsl(0,0%,70%)]/5",
    perks: ["Profile dashboard", "Silver status ring", "Connection requests"],
  },
  thriver: {
    label: "Thriver",
    socialProofLabel: "Rising Talent",
    color: "text-primary",
    ringClass: "ring-2 ring-primary",
    gradient: "from-primary/25 to-primary/5",
    perks: ["AI match insights", "Indigo glow ring", "Priority in matching"],
  },
  professional: {
    label: "Professional",
    socialProofLabel: "Industry Pro",
    color: "text-accent",
    ringClass: "ring-2 ring-accent",
    gradient: "from-accent/25 to-accent/5",
    perks: ["Advanced analytics", "Gold animated ring", "AI-powered recommendations"],
  },
  celebrity: {
    label: "Celebrity",
    socialProofLabel: "Top 1% Creator",
    color: "text-foreground",
    ringClass: "ring-2 ring-foreground",
    gradient: "from-foreground/20 to-foreground/5",
    perks: ["Bulk messaging", "Obsidian premium ring", "Priority support"],
  },
  icon: {
    label: "Icon",
    socialProofLabel: "Industry Icon",
    color: "text-primary",
    ringClass: "ring-2 ring-primary shadow-glow",
    gradient: "from-primary/30 via-accent/15 to-primary/5",
    perks: ["Embeddable verified card", "Diamond halo ring", "Full platform access", "Revenue perks"],
  },
};

/** Ordered list from lowest to highest for index lookups */
const TIER_ORDER: StatusTier[] = ["hobbyist", "freelancer", "thriver", "professional", "celebrity", "icon"];

export function getTierIndex(tier: StatusTier): number {
  return TIER_ORDER.indexOf(tier);
}

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
  const tierIndex = getTierIndex(matchedTier);

  // Find next tier
  const currentIdx = TIER_THRESHOLDS.findIndex(t => t.tier === matchedTier);
  const nextTierData = currentIdx > 0 ? TIER_THRESHOLDS[currentIdx - 1] : undefined;

  return {
    tier: matchedTier,
    points,
    label: meta.label,
    socialProofLabel: meta.socialProofLabel,
    color: meta.color,
    ringClass: meta.ringClass,
    gradient: meta.gradient,
    nextTier: nextTierData?.tier,
    pointsToNext: nextTierData ? nextTierData.min - points : undefined,
    perks: meta.perks,
    tierIndex,
  };
}

// ─── Directional Gate Logic ───────────────────────────────────────

export type ConnectionGate = "open" | "request_only" | "blocked";

/**
 * Determines whether `senderTier` can directly connect/message `recipientTier`.
 * 
 * Rules (Instagram-verified model):
 * - Same tier or higher → "open" (direct message/connect)
 * - Lower tier → "request_only" (goes to filtered inbox)
 * 
 * Note: "blocked" is reserved for future use (e.g. suspended accounts).
 */
export function getConnectionGate(senderTier: StatusTier, recipientTier: StatusTier): ConnectionGate {
  const senderIdx = getTierIndex(senderTier);
  const recipientIdx = getTierIndex(recipientTier);

  if (senderIdx >= recipientIdx) {
    return "open";
  }
  return "request_only";
}

/**
 * Human-friendly explanation of why a connection is gated.
 */
export function getGateMessage(senderTier: StatusTier, recipientTier: StatusTier): string | null {
  const gate = getConnectionGate(senderTier, recipientTier);
  if (gate === "open") return null;

  const recipientMeta = TIER_META[recipientTier];
  return `${recipientMeta.label}-tier creators receive connection requests in a filtered inbox. Build your status by adding verified credits to unlock direct messaging.`;
}

/**
 * Get all tier definitions for display purposes (e.g. tier progression cards).
 */
export function getAllTiers() {
  return TIER_ORDER.map((tier, index) => {
    const threshold = TIER_THRESHOLDS.find(t => t.tier === tier)!;
    const nextThreshold = index < TIER_ORDER.length - 1
      ? TIER_THRESHOLDS.find(t => t.tier === TIER_ORDER[index + 1])
      : undefined;
    return {
      tier,
      index,
      min: threshold.min,
      max: nextThreshold ? nextThreshold.min - 1 : null,
      ...TIER_META[tier],
    };
  });
}
