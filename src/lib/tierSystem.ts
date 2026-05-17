// Legacy compatibility shim — maps old tierSystem API to new statusEngine
// TODO: Remove this file once all legacy XP/tier references are migrated

export interface TierLevel {
  name: string;
  displayName: string;
  minPoints: number;
  maxPoints: number | null;
  color: string;
  gradient: string;
  icon: string;
  benefits: string[];
}

export const TIER_LEVELS: TierLevel[] = [
  {
    name: "hobbyist",
    displayName: "Hobbyist",
    minPoints: 0,
    maxPoints: 499,
    color: "from-slate-400 to-slate-500",
    gradient: "from-slate-400/10 via-slate-400/5 to-slate-500/10",
    icon: "◆",
    benefits: ["Basic profile badge"],
  },
  {
    name: "freelancer",
    displayName: "Freelancer",
    minPoints: 500,
    maxPoints: 1499,
    color: "from-slate-300 to-slate-400",
    gradient: "from-slate-300/15 via-slate-300/5 to-slate-400/15",
    icon: "◆◆",
    benefits: ["Silver badge", "Priority in discovery"],
  },
  {
    name: "thriver",
    displayName: "Thriver",
    minPoints: 1500,
    maxPoints: 2999,
    color: "from-primary to-primary",
    gradient: "from-primary/15 via-primary/5 to-primary/15",
    icon: "★",
    benefits: ["Thriver badge", "Featured in Discover"],
  },
  {
    name: "professional",
    displayName: "Professional",
    minPoints: 3000,
    maxPoints: 4999,
    color: "from-amber-500 to-yellow-600",
    gradient: "from-amber-500/15 via-yellow-500/5 to-yellow-600/15",
    icon: "★★",
    benefits: ["Professional badge", "Premium profile frame"],
  },
  {
    name: "celebrity",
    displayName: "Celebrity",
    minPoints: 5000,
    maxPoints: 9999,
    color: "from-primary to-primary",
    gradient: "from-primary/15 via-primary/5 to-primary/15",
    icon: "★★★",
    benefits: ["Celebrity badge", "Top leaderboard", "VIP access"],
  },
  {
    name: "icon",
    displayName: "Icon",
    minPoints: 10000,
    maxPoints: null,
    color: "from-amber-300 via-yellow-400 to-amber-500",
    gradient: "from-amber-300/20 via-yellow-400/10 to-amber-500/20",
    icon: "💎",
    benefits: ["Icon badge", "Ultimate prestige", "Lifetime recognition"],
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
  return null;
};

export const getPointsToNextTier = (currentPoints: number): number | null => {
  const nextTier = getNextTier(currentPoints);
  if (!nextTier) return null;
  return nextTier.minPoints - currentPoints;
};

export const getTierProgress = (currentPoints: number): number => {
  const currentTier = getTierByPoints(currentPoints);
  if (currentTier.maxPoints === null) return 100;
  const tierRange = currentTier.maxPoints - currentTier.minPoints + 1;
  const pointsInTier = currentPoints - currentTier.minPoints;
  return Math.min(100, (pointsInTier / tierRange) * 100);
};

export const POINT_REWARDS = {
  PROFILE_COMPLETE: 100,
  DAILY_LOGIN: 5,
  DAILY_STREAK_BONUS: 25,
  WEEKLY_STREAK_BONUS: 100,
  CONNECTION_MADE: 25,
  PROJECT_COMPLETED: 500,
  REVIEW_RECEIVED: 150,
  OPPORTUNITY_POSTED: 50,
  PARTNER_VISIT: 20,
  MILESTONE_COMPLETED: 200,
  COLLABORATION_ACCEPTED: 100,
  PORTFOLIO_ITEM_ADDED: 30,
  SKILL_VERIFIED: 75,
  INVITE_ACCEPTED: 200,
  REFERRAL_FIRST_MATCH: 100,
  REFERRAL_FIRST_PROJECT: 150,
  REFERRAL_MILESTONE: 50,
  OG_PROMOTION_ACTIVATED: 500,
} as const;
