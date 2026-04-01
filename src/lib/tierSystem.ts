// Pure XP-based level system for ThriveIN - Achievement & Status focused
// Completely separate from subscription tiers (Free/Thriver/Creator Pro)

export interface TierLevel {
  name: string;
  displayName: string;
  minPoints: number;
  maxPoints: number | null;
  color: string;
  gradient: string;
  icon: string;
  benefits: string[]; // Status/recognition benefits only
}

export const TIER_LEVELS: TierLevel[] = [
  {
    name: "member",
    displayName: "Member",
    minPoints: 0,
    maxPoints: 499,
    color: "from-slate-400 to-slate-500",
    gradient: "from-slate-400/10 via-slate-400/5 to-slate-500/10",
    icon: "◆",
    benefits: [
      "Member badge on profile",
      "Event notifications",
      "Basic leaderboard visibility",
    ],
  },
  {
    name: "silver",
    displayName: "Silver",
    minPoints: 500,
    maxPoints: 1499,
    color: "from-slate-300 to-slate-400",
    gradient: "from-slate-300/15 via-slate-300/5 to-slate-400/15",
    icon: "◆◆",
    benefits: [
      "Silver badge",
      "Priority in discovery",
      "Early event registration",
    ],
  },
  {
    name: "gold",
    displayName: "Gold",
    minPoints: 1500,
    maxPoints: 2999,
    color: "from-amber-500 to-yellow-600",
    gradient: "from-amber-500/15 via-yellow-500/5 to-yellow-600/15",
    icon: "★",
    benefits: [
      "Gold badge",
      "Featured in Discover section",
      "Early event access",
      "Access to partner deals",
    ],
  },
  {
    name: "thriver",
    displayName: "Thriver",
    minPoints: 3000,
    maxPoints: 4999,
    color: "from-indigo-500 to-indigo-600",
    gradient: "from-indigo-500/15 via-indigo-500/5 to-indigo-600/15",
    icon: "★★",
    benefits: [
      "Thriver badge",
      "Premium profile frame",
      "Priority support response",
      "Enhanced partner deals",
    ],
  },
  {
    name: "elite",
    displayName: "Elite",
    minPoints: 5000,
    maxPoints: 7999,
    color: "from-indigo-600 to-blue-700",
    gradient: "from-indigo-600/15 via-blue-600/5 to-blue-700/15",
    icon: "★★★",
    benefits: [
      "Elite badge",
      "Golden profile glow",
      "Top 1% leaderboard",
      "VIP event invitations",
      "Premium partner deals",
    ],
  },
  {
    name: "icon",
    displayName: "Icon",
    minPoints: 8000,
    maxPoints: 14999,
    color: "from-amber-400 to-amber-600",
    gradient: "from-amber-400/15 via-amber-500/5 to-amber-600/15",
    icon: "👑",
    benefits: [
      "Icon badge",
      "Diamond profile frame",
      "Featured success story",
      "Ambassador opportunities",
      "Elite partner deals",
    ],
  },
  {
    name: "legend",
    displayName: "Legend",
    minPoints: 15000,
    maxPoints: null,
    color: "from-amber-300 via-yellow-400 to-amber-500",
    gradient: "from-amber-300/20 via-yellow-400/10 to-amber-500/20",
    icon: "💎",
    benefits: [
      "Legend badge",
      "Ultimate profile prestige",
      "Top of all leaderboards",
      "Advisory board consideration",
      "Lifetime recognition",
      "Ultimate partner deals",
    ],
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

// Point earning activities with enhanced referral rewards
export const POINT_REWARDS = {
  PROFILE_COMPLETE: 100,
  DAILY_LOGIN: 5,
  DAILY_STREAK_BONUS: 25, // Extra bonus for maintaining streaks
  WEEKLY_STREAK_BONUS: 100, // Bonus for 7-day streak
  CONNECTION_MADE: 25,
  PROJECT_COMPLETED: 500,
  REVIEW_RECEIVED: 150,
  OPPORTUNITY_POSTED: 50,
  PARTNER_VISIT: 20,
  MILESTONE_COMPLETED: 200,
  COLLABORATION_ACCEPTED: 100,
  PORTFOLIO_ITEM_ADDED: 30,
  SKILL_VERIFIED: 75,
  INVITE_ACCEPTED: 200, // When someone uses your invite code (doubled)
  REFERRAL_FIRST_MATCH: 100, // When your referral gets their first match
  REFERRAL_FIRST_PROJECT: 150, // When your referral creates first project
  REFERRAL_MILESTONE: 50, // For each milestone your referral completes (max 5)
  OG_PROMOTION_ACTIVATED: 500, // Bonus for activating OG promotion
} as const;
