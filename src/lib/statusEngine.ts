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

// ─── Career Tier: Hard-Gated Thresholds ──────────────────────────────
//
// 1 Credit = 1 distinct professional contribution (project, role, work entry)
// Realistic pacing:
//   - Active creator: ~2-4 credits/month → 24-48/year
//   - Freelancer after 1 year: ~30 credits
//   - Professional after 2-3 years: ~60-80 credits
//   - Celebrity/Icon: requires INDUSTRY RECOGNITION, not just volume

interface TierGate {
  tier: StatusTier;
  credits: number;
  endorsements: number;
  awards: number;
  press: number;
  // If true, awards OR press can satisfy (not both required)
  awardsOrPress?: boolean;
}

const TIER_GATES: TierGate[] = [
  // Icon: 120+ credits, 20 endorsements, 3 awards AND 5 press
  { tier: "icon", credits: 120, endorsements: 20, awards: 3, press: 5 },
  // Celebrity: 80+ credits, 10 endorsements, 2 awards OR 3 press
  { tier: "celebrity", credits: 80, endorsements: 10, awards: 2, press: 3, awardsOrPress: true },
  // Professional: 50+ credits, 5 endorsements
  { tier: "professional", credits: 50, endorsements: 5, awards: 0, press: 0 },
  // Thriver: 20+ credits, 2 endorsements
  { tier: "thriver", credits: 20, endorsements: 2, awards: 0, press: 0 },
  // Freelancer: 5+ credits
  { tier: "freelancer", credits: 5, endorsements: 0, awards: 0, press: 0 },
  // Hobbyist: everyone starts here
  { tier: "hobbyist", credits: 0, endorsements: 0, awards: 0, press: 0 },
];

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
