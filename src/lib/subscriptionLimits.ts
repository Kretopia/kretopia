/**
 * Subscription tier limits and feature gating
 * Based on Beta Roadmap requirements
 */

export type SubscriptionTier = "free" | "creator_pro";

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
    swipesPerDay: 10,
    maxProjects: 1,
    canUndoSwipe: false,
    canVerifyProfile: false,
    hasFeaturedProfile: false,
    hasAIRecommendations: true,
    aiRecommendationsPerDay: 3, // Limited to 3 AI insights per day
    hasPriorityMatching: false,
    partnerDiscounts: 5,
  },
  creator_pro: {
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
    free: "Thriver",
    creator_pro: "Creator Pro",
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
  const messages: Record<keyof TierLimits, string> = {
    swipesPerDay: "Upgrade to Creator Pro for unlimited daily swipes",
    maxProjects: "Upgrade to Creator Pro for unlimited projects",
    canUndoSwipe: "Upgrade to Creator Pro to undo swipes",
    canVerifyProfile: "Upgrade to Creator Pro to get verified",
    hasFeaturedProfile: "Upgrade to Creator Pro for a featured profile with 3x visibility",
    hasAIRecommendations: "All tiers have AI features! Upgrade to Creator Pro for unlimited",
    aiRecommendationsPerDay: "Upgrade to Creator Pro for unlimited AI match insights",
    hasPriorityMatching: "Upgrade to Creator Pro for priority matching algorithm",
    partnerDiscounts: "Upgrade to Creator Pro for 15% partner discounts",
  };
  return messages[feature] || "Upgrade to Creator Pro to unlock this feature";
};
