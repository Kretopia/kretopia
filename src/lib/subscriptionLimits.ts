/**
 * Subscription tier limits and feature gating
 * Based on Beta Roadmap requirements
 */

export type SubscriptionTier = "free" | "pro" | "studio";

export interface TierLimits {
  swipesPerDay: number; // -1 = unlimited
  maxProjects: number; // -1 = unlimited
  canUndoSwipe: boolean;
  canVerifyProfile: boolean;
  hasFeaturedProfile: boolean;
  hasAIRecommendations: boolean;
  aiRecommendationsPerDay: number; // -1 = unlimited, 0 = none
  hasPriorityMatching: boolean;
  partnerDiscounts: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    swipesPerDay: 30,
    maxProjects: 1,
    canUndoSwipe: false,
    canVerifyProfile: false,
    hasFeaturedProfile: false,
    hasAIRecommendations: false,
    aiRecommendationsPerDay: 0,
    hasPriorityMatching: false,
    partnerDiscounts: 0,
  },
  pro: {
    swipesPerDay: -1, // unlimited
    maxProjects: 5,
    canUndoSwipe: true,
    canVerifyProfile: true,
    hasFeaturedProfile: false,
    hasAIRecommendations: true,
    aiRecommendationsPerDay: 10,
    hasPriorityMatching: false,
    partnerDiscounts: 10,
  },
  studio: {
    swipesPerDay: -1, // unlimited
    maxProjects: -1, // unlimited
    canUndoSwipe: true,
    canVerifyProfile: true,
    hasFeaturedProfile: true,
    hasAIRecommendations: true,
    aiRecommendationsPerDay: -1, // Unlimited AI recommendations
    hasPriorityMatching: true,
    partnerDiscounts: 15,
  },
};

/**
 * Check if user can perform an action based on their tier
 */
export const canPerformAction = (
  userTier: SubscriptionTier,
  action: keyof TierLimits
): boolean => {
  const limits = TIER_LIMITS[userTier];
  return Boolean(limits[action]);
};

/**
 * Get remaining swipes for today
 */
export const getRemainingSwipes = (
  userTier: SubscriptionTier,
  dailySwipes: number
): number => {
  const limit = TIER_LIMITS[userTier].swipesPerDay;
  if (limit === -1) return -1; // unlimited
  return Math.max(0, limit - dailySwipes);
};

/**
 * Check if user can create another project
 */
export const canCreateProject = (
  userTier: SubscriptionTier,
  currentProjects: number
): boolean => {
  const limit = TIER_LIMITS[userTier].maxProjects;
  if (limit === -1) return true; // unlimited
  return currentProjects < limit;
};

/**
 * Get tier display name
 */
export const getTierDisplayName = (tier: SubscriptionTier): string => {
  const names: Record<SubscriptionTier, string> = {
    free: "Spark",
    pro: "Pro",
    studio: "Studio",
  };
  return names[tier];
};

/**
 * Get remaining AI recommendations for today
 */
export const getRemainingAIRecommendations = (
  userTier: SubscriptionTier,
  dailyAIUsage: number
): number => {
  const limit = TIER_LIMITS[userTier].aiRecommendationsPerDay;
  if (limit === -1) return -1; // unlimited
  return Math.max(0, limit - dailyAIUsage);
};

/**
 * Get upgrade message for a feature
 */
export const getUpgradeMessage = (
  feature: keyof TierLimits,
  currentTier: SubscriptionTier
): string => {
  if (currentTier === "free") {
    const messages: Record<keyof TierLimits, string> = {
      swipesPerDay: "Upgrade to Pro for unlimited daily swipes",
      maxProjects: "Upgrade to Pro for 5 active projects",
      canUndoSwipe: "Upgrade to Pro to undo swipes",
      canVerifyProfile: "Upgrade to Pro to get verified",
      hasFeaturedProfile: "Upgrade to Studio for a featured profile with 3x visibility",
      hasAIRecommendations: "Upgrade to Pro for AI match recommendations",
      aiRecommendationsPerDay: "Upgrade to Pro for 10 AI recommendations/day",
      hasPriorityMatching: "Upgrade to Studio for priority matching algorithm",
      partnerDiscounts: "Upgrade to Pro for 10% partner discounts",
    };
    return messages[feature] || "Upgrade to Pro to unlock this feature";
  } else if (currentTier === "pro") {
    const messages: Record<keyof TierLimits, string> = {
      swipesPerDay: "Already unlimited on Pro",
      maxProjects: "Upgrade to Studio for unlimited projects",
      canUndoSwipe: "Already included on Pro",
      canVerifyProfile: "Already included on Pro",
      hasFeaturedProfile: "Upgrade to Studio for a featured profile with 3x visibility",
      hasAIRecommendations: "Already included on Pro",
      aiRecommendationsPerDay: "Upgrade to Studio for unlimited AI recommendations",
      hasPriorityMatching: "Upgrade to Studio for priority matching algorithm",
      partnerDiscounts: "Upgrade to Studio for 15% partner discounts",
    };
    return messages[feature] || "Upgrade to Studio to unlock this feature";
  }
  return "Feature unlocked on your current tier";
};
