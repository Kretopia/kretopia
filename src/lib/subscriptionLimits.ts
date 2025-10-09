/**
 * Subscription tier limits and feature gating
 * Based on Beta Roadmap requirements
 */

export type SubscriptionTier = "free" | "thriver" | "creator_pro";

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
    hasAIRecommendations: true, // Basic AI features for free
    aiRecommendationsPerDay: 3, // Limited to 3 AI insights per day
    hasPriorityMatching: false,
    partnerDiscounts: 0,
  },
  thriver: {
    swipesPerDay: -1, // unlimited
    maxProjects: 5,
    canUndoSwipe: true,
    canVerifyProfile: true,
    hasFeaturedProfile: false,
    hasAIRecommendations: true,
    aiRecommendationsPerDay: -1, // Unlimited AI recommendations
    hasPriorityMatching: false,
    partnerDiscounts: 5,
  },
  creator_pro: {
    swipesPerDay: -1,
    maxProjects: -1,
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
    free: "Free",
    thriver: "Thriver",
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
    swipesPerDay: "Upgrade to Thriver for unlimited daily swipes",
    maxProjects: "Upgrade to Thriver for unlimited projects",
    canUndoSwipe: "Upgrade to Thriver to undo swipes",
    canVerifyProfile: "Upgrade to Thriver to get verified",
    hasFeaturedProfile: "Upgrade to Creator Pro for a featured profile",
    hasAIRecommendations: "All tiers have AI features! Upgrade for unlimited AI recommendations",
    aiRecommendationsPerDay: "Upgrade to Thriver for unlimited AI match insights",
    hasPriorityMatching: "Upgrade to Creator Pro for priority matching",
    partnerDiscounts: "Upgrade for exclusive partner discounts",
  };
  return messages[feature] || "Upgrade to unlock this feature";
};
