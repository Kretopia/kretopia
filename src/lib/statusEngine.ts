/**
 * ThriveStatus — Dual-Axis Professional Reputation System
 * 
 * AXIS 1: Career Tier (work-first)
 *   Base: Verified Credits (the core metric)
 *   Accelerators: Endorsements, Awards, Press, Reviews/Ratings
 *   → Pure work alone CAN reach Icon. Accelerators get you there faster.
 * 
 * AXIS 2: Network Role (social influence)
 *   Connections, accepted invites, collaborations
 *   → Independent of Career Tier. A Professional can be a Spark or Power Circle.
 * 
 * Combined display: "Professional · Connector"
 */

export type StatusTier = "hobbyist" | "freelancer" | "thriver" | "professional" | "celebrity" | "icon";

export type NetworkRole = "spark" | "connector" | "builder" | "curator" | "influencer" | "power_circle";

export interface StatusMetrics {
  verifiedCredits: number;
  totalCredits: number;
  completedProjects: number;
  connections: number;
  acceptedInvites: number;
  collaborations: number;
  averageRating: number;
  reviewCount: number;
  // Accelerators
  endorsementCount: number;
  awardCount: number;
  pressCount: number;
}

export interface StatusResult {
  tier: StatusTier;
  label: string;
  combinedLabel: string; // "Professional · Connector"
  socialProofLabel: string | null;
  color: string;
  ringClass: string;
  gradient: string;
  nextTier?: StatusTier;
  perks: string[];
  tierIndex: number;
  metrics: StatusMetrics;
  progress: StatusProgress[];
  networkRole: NetworkRole;
  networkRoleLabel: string;
  // Score breakdowns for transparency
  careerScore: number;
  networkScore: number;
}

export interface StatusProgress {
  label: string;
  current: number;
  needed: number;
  category: "credits" | "network" | "accelerators";
}

// ─── Career Tier Thresholds (credit-based score 0–100) ────────────────

const TIER_THRESHOLDS: { tier: StatusTier; min: number }[] = [
  { tier: "icon", min: 85 },
  { tier: "celebrity", min: 65 },
  { tier: "professional", min: 40 },
  { tier: "thriver", min: 20 },
  { tier: "freelancer", min: 8 },
  { tier: "hobbyist", min: 0 },
];

interface TierMeta {
  label: string;
  socialProofLabel: string | null;
  color: string;
  ringClass: string;
  gradient: string;
  perks: string[];
  targets: {
    verifiedCredits: number;
    endorsements: number;
  };
}

const TIER_META: Record<StatusTier, TierMeta> = {
  hobbyist: {
    label: "Hobbyist",
    socialProofLabel: null,
    color: "text-muted-foreground",
    ringClass: "ring-2 ring-border",
    gradient: "from-muted-foreground/20 to-muted-foreground/5",
    perks: ["Basic profile", "Claim credits", "Join communities"],
    targets: { verifiedCredits: 0, endorsements: 0 },
  },
  freelancer: {
    label: "Freelancer",
    socialProofLabel: "Active Creator",
    color: "text-[hsl(0,0%,70%)]",
    ringClass: "ring-2 ring-[hsl(0,0%,75%)]",
    gradient: "from-[hsl(0,0%,75%)]/25 to-[hsl(0,0%,70%)]/5",
    perks: ["Basic visibility", "Connection requests", "Profile dashboard"],
    targets: { verifiedCredits: 3, endorsements: 0 },
  },
  thriver: {
    label: "Thriver",
    socialProofLabel: "Rising Talent",
    color: "text-primary",
    ringClass: "ring-2 ring-primary",
    gradient: "from-primary/25 to-primary/5",
    perks: ["AI recommendations", "Limited boosts", "Priority in matching"],
    targets: { verifiedCredits: 8, endorsements: 2 },
  },
  professional: {
    label: "Professional",
    socialProofLabel: "Industry Pro",
    color: "text-accent",
    ringClass: "ring-2 ring-accent",
    gradient: "from-accent/25 to-accent/5",
    perks: ["Advanced analytics", "Priority matching", "Profile-as-website"],
    targets: { verifiedCredits: 20, endorsements: 5 },
  },
  celebrity: {
    label: "Celebrity",
    socialProofLabel: "Top 1% Creator",
    color: "text-foreground",
    ringClass: "ring-2 ring-foreground",
    gradient: "from-foreground/20 to-foreground/5",
    perks: ["Featured placement", "Reduced platform fees", "Bulk messaging"],
    targets: { verifiedCredits: 40, endorsements: 10 },
  },
  icon: {
    label: "Icon",
    socialProofLabel: "Industry Icon",
    color: "text-primary",
    ringClass: "ring-2 ring-primary shadow-glow",
    gradient: "from-primary/30 via-accent/15 to-primary/5",
    perks: ["VIP access", "Premium exposure", "Revenue share potential", "Full platform access"],
    targets: { verifiedCredits: 60, endorsements: 20 },
  },
};

const TIER_ORDER: StatusTier[] = ["hobbyist", "freelancer", "thriver", "professional", "celebrity", "icon"];

export function getTierIndex(tier: StatusTier): number {
  return TIER_ORDER.indexOf(tier);
}

// ─── Career Score Calculation (Work-First) ───────────────────────────
//
// Base: Verified credits → scales to 100 at 60 credits
// Accelerators add BONUS points (up to +30):
//   Endorsements: up to +10
//   Awards: up to +8
//   Press: up to +7
//   Reviews: up to +5
//
// This means: 60 verified credits with ZERO accelerators = score 100 = Icon
// But 40 credits + good accelerators can also reach Icon

function calculateCareerScore(metrics: StatusMetrics): number {
  // Base: verified credits — the core metric
  const creditBase = Math.min(100, (metrics.verifiedCredits / 60) * 100);

  // Accelerator bonuses (scale smoothly, cap each one)
  const endorsementBonus = Math.min(10, (metrics.endorsementCount / 15) * 10);
  const awardBonus = Math.min(8, (metrics.awardCount / 5) * 8);
  const pressBonus = Math.min(7, (metrics.pressCount / 5) * 7);
  const reviewBonus = metrics.reviewCount > 0
    ? Math.min(5, (metrics.averageRating / 5) * 2.5 + Math.min(2.5, (metrics.reviewCount / 10) * 2.5))
    : 0;

  const totalAccelerators = endorsementBonus + awardBonus + pressBonus + reviewBonus;

  // Final score: base + accelerators, capped at 100
  return Math.min(100, creditBase + totalAccelerators);
}

// ─── Network Role Calculation (Independent Axis) ─────────────────────

const NETWORK_ROLE_META: Record<NetworkRole, { label: string; minScore: number }> = {
  power_circle: { label: "Power Circle", minScore: 75 },
  influencer: { label: "Influencer", minScore: 55 },
  curator: { label: "Curator", minScore: 38 },
  builder: { label: "Builder", minScore: 22 },
  connector: { label: "Connector", minScore: 8 },
  spark: { label: "Spark", minScore: 0 },
};

function calculateNetworkScore(metrics: StatusMetrics): number {
  return Math.min(100, (
    (metrics.connections / 200) * 35 +
    (metrics.acceptedInvites / 40) * 30 +
    (metrics.collaborations / 25) * 35
  ));
}

function calculateNetworkRole(metrics: StatusMetrics): { role: NetworkRole; label: string; score: number } {
  const score = calculateNetworkScore(metrics);

  const roles: NetworkRole[] = ["power_circle", "influencer", "curator", "builder", "connector", "spark"];
  for (const role of roles) {
    if (score >= NETWORK_ROLE_META[role].minScore) {
      return { role, label: NETWORK_ROLE_META[role].label, score };
    }
  }
  return { role: "spark", label: "Spark", score };
}

// ─── Main Calculate Function ─────────────────────────────────────────

export function calculateStatus(metrics: StatusMetrics): StatusResult {
  const careerScore = calculateCareerScore(metrics);
  const { role: networkRole, label: networkRoleLabel, score: networkScore } = calculateNetworkRole(metrics);

  let matchedTier: StatusTier = "hobbyist";
  for (const { tier, min } of TIER_THRESHOLDS) {
    if (careerScore >= min) {
      matchedTier = tier;
      break;
    }
  }

  const meta = TIER_META[matchedTier];
  const tierIndex = getTierIndex(matchedTier);
  const nextTierData = tierIndex < TIER_ORDER.length - 1 ? TIER_ORDER[tierIndex + 1] : undefined;

  // Combined label
  const combinedLabel = networkRole !== "spark"
    ? `${meta.label} · ${networkRoleLabel}`
    : meta.label;

  // Build progress items toward next career tier
  const progress: StatusProgress[] = [];
  if (nextTierData) {
    const nextMeta = TIER_META[nextTierData];
    const t = nextMeta.targets;

    if (metrics.verifiedCredits < t.verifiedCredits) {
      progress.push({
        label: "Verified Credits",
        current: metrics.verifiedCredits,
        needed: t.verifiedCredits,
        category: "credits",
      });
    }
    if (metrics.endorsementCount < t.endorsements) {
      progress.push({
        label: "Endorsements",
        current: metrics.endorsementCount,
        needed: t.endorsements,
        category: "accelerators",
      });
    }
  }

  return {
    tier: matchedTier,
    label: meta.label,
    combinedLabel,
    socialProofLabel: meta.socialProofLabel,
    color: meta.color,
    ringClass: meta.ringClass,
    gradient: meta.gradient,
    nextTier: nextTierData,
    perks: meta.perks,
    tierIndex,
    metrics,
    progress: progress.slice(0, 3),
    networkRole,
    networkRoleLabel,
    careerScore,
    networkScore,
  };
}

/**
 * Legacy compatibility: calculate from credits array only.
 */
export function calculateStatusFromCredits(credits: { verification_status?: string | null }[]): StatusResult {
  let verifiedCredits = 0;
  for (const credit of credits) {
    const status = (credit.verification_status || "manual").toLowerCase();
    if (["enterprise", "peer", "verified", "ai", "identity"].includes(status)) {
      verifiedCredits++;
    }
  }

  return calculateStatus({
    verifiedCredits,
    totalCredits: credits.length,
    completedProjects: 0,
    connections: 0,
    acceptedInvites: 0,
    collaborations: 0,
    averageRating: 0,
    reviewCount: 0,
    endorsementCount: 0,
    awardCount: 0,
    pressCount: 0,
  });
}

// ─── Directional Gate Logic ───────────────────────────────────────

export type ConnectionGate = "open" | "request_only" | "blocked";

export function getConnectionGate(senderTier: StatusTier, recipientTier: StatusTier): ConnectionGate {
  const senderIdx = getTierIndex(senderTier);
  const recipientIdx = getTierIndex(recipientTier);
  if (senderIdx >= recipientIdx) return "open";
  return "request_only";
}

export function getGateMessage(senderTier: StatusTier, recipientTier: StatusTier): string | null {
  const gate = getConnectionGate(senderTier, recipientTier);
  if (gate === "open") return null;
  const recipientMeta = TIER_META[recipientTier];
  return `${recipientMeta.label}-tier creators receive connection requests in a filtered inbox. Build your reputation by adding verified credits to unlock direct messaging.`;
}

/**
 * Get all tier definitions for display purposes.
 */
export function getAllTiers() {
  return TIER_ORDER.map((tier, index) => ({
    tier,
    index,
    ...TIER_META[tier],
  }));
}
