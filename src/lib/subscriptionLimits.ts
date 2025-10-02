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
  hasPriorityMatching: boolean;
  partnerDiscounts: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    swipesPerDay: 10,
    maxProjects: 1,
    canUndoSwipe: false,
    canVerifyProfile: false,
    hasFeaturedProfile: false,
    hasAIRecommendations: false,
    hasPriorityMatching: false,
    partnerDiscounts: 0,
  },
  pro: {
    swipesPerDay: -1, // unlimited
    maxProjects: -1, // unlimited
    canUndoSwipe: true,
    canVerifyProfile: true,
    hasFeaturedProfile: false,
    hasAIRecommendations: true,
    hasPriorityMatching: false,
    partnerDiscounts: 5,
  },
  studio: {
    swipesPerDay: -1,
    maxProjects: -1,
    canUndoSwipe: true,
    canVerifyProfile: true,
    hasFeaturedProfile: true,
    hasAIRecommendations: true,
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
    free: "Free",
    pro: "Thrive Pro",
    studio: "Thrive Studio",
  };
  return names[tier];
};

/**
 * Get upgrade message for a feature
 */
export const getUpgradeMessage = (
  feature: keyof TierLimits,
  currentTier: SubscriptionTier
): string => {
  const messages: Record<keyof TierLimits, string> = {
    swipesPerDay: "Upgrade to Pro for unlimited daily swipes",
    maxProjects: "Upgrade to Pro for unlimited projects",
    canUndoSwipe: "Upgrade to Pro to undo swipes",
    canVerifyProfile: "Upgrade to Pro to get verified",
    hasFeaturedProfile: "Upgrade to Studio for a featured profile",
    hasAIRecommendations: "Upgrade to Pro for AI match recommendations",
    hasPriorityMatching: "Upgrade to Studio for priority matching",
    partnerDiscounts: "Upgrade for exclusive partner discounts",
  };
  return messages[feature] || "Upgrade to unlock this feature";
};
