// Emirates Skywards-inspired tier system for ThriveIN

export interface TierLevel {
  name: string;
  displayName: string;
  minPoints: number;
  maxPoints: number | null;
  color: string;
  gradient: string;
  icon: string;
  benefits: string[];
  subscriptionTier?: string; // Maps to subscription_tier in profiles
}

export const TIER_LEVELS: TierLevel[] = [
  {
    name: "starter",
    displayName: "Starter",
    minPoints: 0,
    maxPoints: 999,
    color: "from-gray-500 to-slate-600",
    gradient: "from-gray-500/20 via-gray-400/10 to-slate-500/20",
    icon: "⚡",
    benefits: [
      "Basic profile features",
      "Limited swipes per day",
      "Access to free partner locations",
      "Community access",
    ],
    subscriptionTier: "free",
  },
  {
    name: "thriver",
    displayName: "Thriver",
    minPoints: 1000,
    maxPoints: 4999,
    color: "from-blue-500 to-indigo-600",
    gradient: "from-blue-500/20 via-blue-400/10 to-indigo-500/20",
    icon: "⭐",
    benefits: [
      "Unlimited swipes",
      "Priority matching",
      "Access to Thriver partner locations",
      "Digital membership card",
      "10% platform fee discount",
      "Advanced analytics",
    ],
    subscriptionTier: "thriver",
  },
  {
    name: "creator_pro",
    displayName: "Creator Pro",
    minPoints: 5000,
    maxPoints: 24999,
    color: "from-purple-500 to-pink-600",
    gradient: "from-purple-500/20 via-purple-400/10 to-pink-500/20",
    icon: "👑",
    benefits: [
      "Everything in Thriver",
      "Access to all partner locations",
      "Priority support",
      "Featured profile placement",
      "15% platform fee discount",
      "Exclusive events access",
      "AI profile enhancement",
    ],
    subscriptionTier: "creator_pro",
  },
  {
    name: "elite",
    displayName: "Elite",
    minPoints: 25000,
    maxPoints: null,
    color: "from-amber-400 to-yellow-600",
    gradient: "from-amber-400/20 via-yellow-400/10 to-amber-600/20",
    icon: "💎",
    benefits: [
      "Everything in Creator Pro",
      "Lifetime access to all features",
      "20% platform fee discount",
      "Personal account manager",
      "Exclusive Elite lounge access",
      "Priority partner booking",
      "Annual Elite Summit invitation",
      "Custom integrations",
    ],
    subscriptionTier: "elite",
  },
];

export const getTierByPoints = (points: number): TierLevel => {
  return (
    TIER_LEVELS.find(
      (tier) =>
        points >= tier.minPoints &&
        (tier.maxPoints === null || points <= tier.maxPoints)
    ) || TIER_LEVELS[0]
  );
};

export const getTierByName = (name: string): TierLevel | undefined => {
  return TIER_LEVELS.find((tier) => tier.name === name);
};

export const getNextTier = (currentPoints: number): TierLevel | null => {
  const currentTier = getTierByPoints(currentPoints);
  const currentIndex = TIER_LEVELS.findIndex(
    (tier) => tier.name === currentTier.name
  );

  if (currentIndex < TIER_LEVELS.length - 1) {
    return TIER_LEVELS[currentIndex + 1];
  }

  return null; // Already at highest tier
};

export const getPointsToNextTier = (currentPoints: number): number | null => {
  const nextTier = getNextTier(currentPoints);
  if (!nextTier) return null;

  return nextTier.minPoints - currentPoints;
};

export const getTierProgress = (currentPoints: number): number => {
  const currentTier = getTierByPoints(currentPoints);

  if (currentTier.maxPoints === null) {
    return 100; // At max tier
  }

  const tierRange = currentTier.maxPoints - currentTier.minPoints + 1;
  const pointsInTier = currentPoints - currentTier.minPoints;
  return Math.min(100, (pointsInTier / tierRange) * 100);
};

// Point earning activities
export const POINT_REWARDS = {
  PROFILE_COMPLETE: 100,
  DAILY_LOGIN: 5,
  CONNECTION_MADE: 25,
  PROJECT_COMPLETED: 500,
  REVIEW_RECEIVED: 150,
  OPPORTUNITY_POSTED: 50,
  PARTNER_VISIT: 20,
  MILESTONE_COMPLETED: 200,
  COLLABORATION_ACCEPTED: 100,
  PORTFOLIO_ITEM_ADDED: 30,
  SKILL_VERIFIED: 75,
} as const;
