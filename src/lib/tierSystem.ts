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
    name: "spark",
    displayName: "Spark",
    minPoints: 0,
    maxPoints: 499,
    color: "from-yellow-400 to-orange-500",
    gradient: "from-yellow-400/20 via-orange-400/10 to-orange-500/20",
    icon: "✨",
    benefits: [
      "Welcome badge on profile",
      "Event notifications",
      "Basic leaderboard visibility",
    ],
  },
  {
    name: "rising_star",
    displayName: "Rising Star",
    minPoints: 500,
    maxPoints: 1499,
    color: "from-orange-500 to-pink-500",
    gradient: "from-orange-500/20 via-pink-400/10 to-pink-500/20",
    icon: "⭐",
    benefits: [
      "Rising Star badge",
      "Profile flair animation",
      "Priority in discovery",
      "Early event registration",
    ],
  },
  {
    name: "creator",
    displayName: "Creator",
    minPoints: 1500,
    maxPoints: 2999,
    color: "from-pink-500 to-purple-500",
    gradient: "from-pink-500/20 via-purple-400/10 to-purple-500/20",
    icon: "🎨",
    benefits: [
      "Creator badge",
      "Custom profile themes",
      "Featured in Discover section",
      "Early event access",
      "Access to partner deals",
    ],
  },
  {
    name: "maverick",
    displayName: "Maverick",
    minPoints: 3000,
    maxPoints: 4999,
    color: "from-purple-500 to-blue-500",
    gradient: "from-purple-500/20 via-blue-400/10 to-blue-500/20",
    icon: "🚀",
    benefits: [
      "Maverick badge",
      "Premium profile frame",
      "Priority support response",
      "Priority event access",
      "Enhanced partner deals",
    ],
  },
  {
    name: "visionary",
    displayName: "Visionary",
    minPoints: 5000,
    maxPoints: 7999,
    color: "from-blue-500 to-cyan-500",
    gradient: "from-blue-500/20 via-cyan-400/10 to-cyan-500/20",
    icon: "👁️",
    benefits: [
      "Visionary badge",
      "Golden profile glow",
      "Top 1% leaderboard",
      "VIP event invitations",
      "Premium partner deals",
    ],
  },
  {
    name: "legend",
    displayName: "Legend",
    minPoints: 8000,
    maxPoints: 14999,
    color: "from-cyan-500 to-green-500",
    gradient: "from-cyan-500/20 via-green-400/10 to-green-500/20",
    icon: "🏆",
    benefits: [
      "Legend badge",
      "Diamond profile frame",
      "Featured success story",
      "Industry networking events",
      "Elite partner deals",
    ],
  },
  {
    name: "icon",
    displayName: "Icon",
    minPoints: 15000,
    maxPoints: 24999,
    color: "from-green-500 to-emerald-500",
    gradient: "from-green-500/20 via-emerald-400/10 to-emerald-500/20",
    icon: "👑",
    benefits: [
      "Icon badge",
      "Platinum profile effects",
      "Hall of Fame inclusion",
      "Ambassador opportunities",
      "VIP partner deals",
      "Exclusive partner offers",
    ],
  },
  {
    name: "elite",
    displayName: "Elite",
    minPoints: 25000,
    maxPoints: null,
    color: "from-emerald-500 to-teal-500",
    gradient: "from-emerald-500/20 via-teal-400/10 to-teal-500/20",
    icon: "💎",
    benefits: [
      "Elite badge",
      "Ultimate profile prestige",
      "Top of all leaderboards",
      "Advisory board consideration",
      "Lifetime recognition",
      "Ultimate partner deals",
      "VIP-only partner offers",
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
  // Cre8 Challenge rewards
  CHALLENGE_ENTRY: 25,
  CHALLENGE_VOTE: 5,
  CHALLENGE_WIN_DAILY: 100,
  CHALLENGE_WIN_48HR: 200,
  CHALLENGE_WIN_WEEKLY: 500,
  // Spark rewards
  CLIP_POST: 5,
  ROOM_CREATE: 20,
  ROOM_MESSAGE: 5,
} as const;
