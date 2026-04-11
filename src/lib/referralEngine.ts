/**
 * Creative Circle™ — 6° Network Referral Engine
 * 
 * A prestige-based referral system inspired by "six degrees of separation"
 * where inviting creatives builds your professional network tier,
 * unlocking rewards that compound: free Pro, reduced fees, and commissions.
 * 
 * Tier Names (network/influence-inspired):
 * Spark → Connector → Socialite → Networker → Mogul → Icon
 */

export type NetworkTier = "none" | "spark" | "connector" | "socialite" | "networker" | "mogul" | "icon";

export interface NetworkTierMeta {
  tier: NetworkTier;
  label: string;
  tagline: string;
  minReferrals: number;
  icon: string;
  color: string;
  gradient: string;
  ringClass: string;
  rewards: {
    freeProMonths: number | "lifetime";
    feeDiscount: number;        // % off platform fees
    commissionRate: number;     // % of referred users' transaction fees
    statusBonusPoints: number;  // bonus ThriveStatus™ points
  };
  perks: string[];
}

const TIER_ORDER: NetworkTier[] = ["none", "spark", "connector", "socialite", "networker", "mogul", "icon"];

const TIER_META: Record<NetworkTier, NetworkTierMeta> = {
  none: {
    tier: "none",
    label: "Member",
    tagline: "Start building your creative network",
    minReferrals: 0,
    icon: "👤",
    color: "text-muted-foreground",
    gradient: "from-muted/20 to-muted/5",
    ringClass: "ring-border",
    rewards: { freeProMonths: 0, feeDiscount: 0, commissionRate: 0, statusBonusPoints: 0 },
    perks: ["Personal invite link", "QR code sharing"],
  },
  spark: {
    tier: "spark",
    label: "Spark",
    tagline: "You lit the first flame",
    minReferrals: 1,
    icon: "⚡",
    color: "text-amber-500",
    gradient: "from-amber-500/20 to-amber-400/5",
    ringClass: "ring-amber-500/50",
    rewards: { freeProMonths: 1, feeDiscount: 0, commissionRate: 0, statusBonusPoints: 50 },
    perks: ["1 month free Pro", "+50 Status Points", "\"Referred by\" badge on invitees"],
  },
  connector: {
    tier: "connector",
    label: "Connector",
    tagline: "Your network is growing",
    minReferrals: 5,
    icon: "🔗",
    color: "text-blue-500",
    gradient: "from-blue-500/20 to-blue-400/5",
    ringClass: "ring-blue-500/50",
    rewards: { freeProMonths: 3, feeDiscount: 5, commissionRate: 2, statusBonusPoints: 150 },
    perks: ["3 months free Pro", "5% reduced fees", "2% passive commission", "Priority in search"],
  },
  socialite: {
    tier: "socialite",
    label: "Socialite",
    tagline: "People know your name",
    minReferrals: 15,
    icon: "✨",
    color: "text-purple-500",
    gradient: "from-purple-500/20 to-purple-400/5",
    ringClass: "ring-purple-500/50",
    rewards: { freeProMonths: 6, feeDiscount: 10, commissionRate: 3, statusBonusPoints: 400 },
    perks: ["6 months free Pro", "10% reduced fees", "3% passive commission", "Featured spotlight"],
  },
  networker: {
    tier: "networker",
    label: "Networker",
    tagline: "Industry knows your circle",
    minReferrals: 30,
    icon: "🌐",
    color: "text-emerald-500",
    gradient: "from-emerald-500/20 to-emerald-400/5",
    ringClass: "ring-emerald-500/50",
    rewards: { freeProMonths: 12, feeDiscount: 15, commissionRate: 5, statusBonusPoints: 800 },
    perks: ["12 months free Pro", "15% reduced fees", "5% passive commission", "Early feature access"],
  },
  mogul: {
    tier: "mogul",
    label: "Mogul",
    tagline: "You move the industry",
    minReferrals: 50,
    icon: "👑",
    color: "text-amber-400",
    gradient: "from-amber-400/25 to-yellow-500/5",
    ringClass: "ring-amber-400/60",
    rewards: { freeProMonths: 24, feeDiscount: 20, commissionRate: 7, statusBonusPoints: 1500 },
    perks: ["2 years free Pro", "20% reduced fees", "7% passive commission", "Platform advisory input"],
  },
  icon: {
    tier: "icon",
    label: "Icon",
    tagline: "Legendary network builder",
    minReferrals: 100,
    icon: "💎",
    color: "text-primary",
    gradient: "from-primary/25 via-accent/15 to-primary/5",
    ringClass: "ring-primary shadow-glow",
    rewards: { freeProMonths: "lifetime", feeDiscount: 25, commissionRate: 10, statusBonusPoints: 3000 },
    perks: ["Lifetime free Pro", "25% reduced fees", "10% passive commission", "Founding Circle perks"],
  },
};

export function getNetworkTierIndex(tier: NetworkTier): number {
  return TIER_ORDER.indexOf(tier);
}

export function getNetworkTier(referralCount: number): NetworkTierMeta {
  // Walk backwards from highest tier
  for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
    const tier = TIER_ORDER[i];
    if (referralCount >= TIER_META[tier].minReferrals) {
      return TIER_META[tier];
    }
  }
  return TIER_META.none;
}

export function getNextNetworkTier(currentTier: NetworkTier): NetworkTierMeta | null {
  const idx = TIER_ORDER.indexOf(currentTier);
  if (idx >= TIER_ORDER.length - 1) return null;
  return TIER_META[TIER_ORDER[idx + 1]];
}

export function getReferralsToNextTier(referralCount: number): { next: NetworkTierMeta; remaining: number } | null {
  const current = getNetworkTier(referralCount);
  const next = getNextNetworkTier(current.tier);
  if (!next) return null;
  return { next, remaining: next.minReferrals - referralCount };
}

export function getAllNetworkTiers(): NetworkTierMeta[] {
  return TIER_ORDER.map(t => TIER_META[t]);
}

/**
 * Format the commission model explanation for display
 */
export function getCommissionExplanation(tier: NetworkTierMeta): string {
  if (tier.rewards.commissionRate === 0) return "";
  return `You earn ${tier.rewards.commissionRate}% of the platform service fee when your referrals complete paid gigs. This comes from ThriveIN's cut — your referrals keep 100% of their earnings.`;
}

/**
 * Format Pro reward text
 */
export function getProRewardText(tier: NetworkTierMeta): string {
  const months = tier.rewards.freeProMonths;
  if (months === 0) return "";
  if (months === "lifetime") return "Lifetime Pro";
  if (months >= 24) return `${Math.floor(months / 12)} years free Pro`;
  return `${months} month${months > 1 ? "s" : ""} free Pro`;
}
