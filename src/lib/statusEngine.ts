/**
 * ThriveStatus — Unified Professional Reputation System
 * 
 * Status is calculated using a weighted formula:
 * 50% → Verified Credits
 * 20% → Completed Projects
 * 20% → Network Strength (connections, invites, collaborations)
 * 10% → Ratings / Reviews
 * 
 * Tier ladder (aspirational career-stage labels):
 * Hobbyist → Freelancer → Thriver → Professional → Celebrity → Icon
 * 
 * Directional gating:
 * - Same tier or higher → open connection/messaging
 * - Lower tier → request-only (filtered inbox)
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
}

export interface StatusResult {
  tier: StatusTier;
  label: string;
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
}

export interface StatusProgress {
  label: string;
  current: number;
  needed: number;
  category: "credits" | "projects" | "network" | "ratings";
}

// ─── Tier Thresholds (weighted score 0–100 scale) ──────────────────────

const TIER_THRESHOLDS: { tier: StatusTier; min: number }[] = [
  { tier: "icon", min: 90 },
  { tier: "celebrity", min: 70 },
  { tier: "professional", min: 45 },
  { tier: "thriver", min: 25 },
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
  // Minimum metrics to reach this tier (for progress display)
  targets: {
    verifiedCredits: number;
    completedProjects: number;
    connections: number;
    reviewCount: number;
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
    targets: { verifiedCredits: 0, completedProjects: 0, connections: 0, reviewCount: 0 },
  },
  freelancer: {
    label: "Freelancer",
    socialProofLabel: "Active Creator",
    color: "text-[hsl(0,0%,70%)]",
    ringClass: "ring-2 ring-[hsl(0,0%,75%)]",
    gradient: "from-[hsl(0,0%,75%)]/25 to-[hsl(0,0%,70%)]/5",
    perks: ["Basic visibility", "Connection requests", "Profile dashboard"],
    targets: { verifiedCredits: 3, completedProjects: 1, connections: 5, reviewCount: 0 },
  },
  thriver: {
    label: "Thriver",
    socialProofLabel: "Rising Talent",
    color: "text-primary",
    ringClass: "ring-2 ring-primary",
    gradient: "from-primary/25 to-primary/5",
    perks: ["AI recommendations", "Limited boosts", "Priority in matching"],
    targets: { verifiedCredits: 10, completedProjects: 3, connections: 15, reviewCount: 2 },
  },
  professional: {
    label: "Professional",
    socialProofLabel: "Industry Pro",
    color: "text-accent",
    ringClass: "ring-2 ring-accent",
    gradient: "from-accent/25 to-accent/5",
    perks: ["Advanced analytics", "Priority matching", "Profile-as-website"],
    targets: { verifiedCredits: 25, completedProjects: 8, connections: 40, reviewCount: 5 },
  },
  celebrity: {
    label: "Celebrity",
    socialProofLabel: "Top 1% Creator",
    color: "text-foreground",
    ringClass: "ring-2 ring-foreground",
    gradient: "from-foreground/20 to-foreground/5",
    perks: ["Featured placement", "Reduced platform fees", "Bulk messaging"],
    targets: { verifiedCredits: 50, completedProjects: 20, connections: 100, reviewCount: 15 },
  },
  icon: {
    label: "Icon",
    socialProofLabel: "Industry Icon",
    color: "text-primary",
    ringClass: "ring-2 ring-primary shadow-glow",
    gradient: "from-primary/30 via-accent/15 to-primary/5",
    perks: ["VIP access", "Premium exposure", "Revenue share potential", "Full platform access"],
    targets: { verifiedCredits: 100, completedProjects: 40, connections: 250, reviewCount: 30 },
  },
};

const TIER_ORDER: StatusTier[] = ["hobbyist", "freelancer", "thriver", "professional", "celebrity", "icon"];

export function getTierIndex(tier: StatusTier): number {
  return TIER_ORDER.indexOf(tier);
}

// ─── Weighted Score Calculation ──────────────────────────────────────
// 
// Weight distribution:
// 70% → Verified Credits (work history IS the reputation)
// 25% → Network Strength (connections, invites, collaborations)
//  5% → Ratings / Reviews (bonus signal, not gating)

function calculateWeightedScore(metrics: StatusMetrics): number {
  // Credits: 70% weight — 50+ verified credits = max
  const creditScore = Math.min(100, (metrics.verifiedCredits / 50) * 100);
  
  // Network: 25% weight — composite of connections + invites + collaborations
  const networkScore = Math.min(100, (
    (metrics.connections / 150) * 40 +
    (metrics.acceptedInvites / 30) * 30 +
    (metrics.collaborations / 20) * 30
  ));
  
  // Ratings: 5% weight — light bonus, not a barrier
  const ratingScore = metrics.reviewCount > 0
    ? Math.min(100, (metrics.averageRating / 5) * 60 + Math.min(40, (metrics.reviewCount / 20) * 40))
    : 0;

  return (
    creditScore * 0.7 +
    networkScore * 0.25 +
    ratingScore * 0.05
  );
}

// ─── Network Role Calculation ────────────────────────────────────────

const NETWORK_ROLE_META: Record<NetworkRole, { label: string; minScore: number }> = {
  power_circle: { label: "Power Circle", minScore: 80 },
  influencer: { label: "Influencer", minScore: 60 },
  curator: { label: "Curator", minScore: 40 },
  builder: { label: "Builder", minScore: 25 },
  connector: { label: "Connector", minScore: 10 },
  spark: { label: "Spark", minScore: 0 },
};

function calculateNetworkRole(metrics: StatusMetrics): { role: NetworkRole; label: string } {
  const networkScore = Math.min(100, (
    (metrics.connections / 250) * 30 +
    (metrics.acceptedInvites / 50) * 30 +
    (metrics.collaborations / 30) * 40
  ));

  const roles: NetworkRole[] = ["power_circle", "influencer", "curator", "builder", "connector", "spark"];
  for (const role of roles) {
    if (networkScore >= NETWORK_ROLE_META[role].minScore) {
      return { role, label: NETWORK_ROLE_META[role].label };
    }
  }
  return { role: "spark", label: "Spark" };
}

// ─── Main Calculate Function ─────────────────────────────────────────

export function calculateStatus(metrics: StatusMetrics): StatusResult {
  const weightedScore = calculateWeightedScore(metrics);

  let matchedTier: StatusTier = "hobbyist";
  for (const { tier, min } of TIER_THRESHOLDS) {
    if (weightedScore >= min) {
      matchedTier = tier;
      break;
    }
  }

  const meta = TIER_META[matchedTier];
  const tierIndex = getTierIndex(matchedTier);
  const nextTierData = tierIndex < TIER_ORDER.length - 1 ? TIER_ORDER[tierIndex + 1] : undefined;
  const { role: networkRole, label: networkRoleLabel } = calculateNetworkRole(metrics);

  // Build actionable progress items toward next tier
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
    if (metrics.completedProjects < t.completedProjects) {
      progress.push({
        label: "Completed Projects",
        current: metrics.completedProjects,
        needed: t.completedProjects,
        category: "projects",
      });
    }
    if (metrics.connections < t.connections) {
      progress.push({
        label: "Connections",
        current: metrics.connections,
        needed: t.connections,
        category: "network",
      });
    }
    if (metrics.reviewCount < t.reviewCount && t.reviewCount > 0) {
      progress.push({
        label: "Reviews",
        current: metrics.reviewCount,
        needed: t.reviewCount,
        category: "ratings",
      });
    }
  }

  return {
    tier: matchedTier,
    label: meta.label,
    socialProofLabel: meta.socialProofLabel,
    color: meta.color,
    ringClass: meta.ringClass,
    gradient: meta.gradient,
    nextTier: nextTierData,
    perks: meta.perks,
    tierIndex,
    metrics,
    progress: progress.slice(0, 3), // Top 3 most relevant
    networkRole,
    networkRoleLabel,
  };
}

/**
 * Legacy compatibility: calculate from credits array only.
 * Uses credit count as a rough proxy for full metrics.
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
