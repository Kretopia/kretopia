/**
 * Subscription tier limits and feature gating
 * Based on Beta Roadmap requirements
 */

export type SubscriptionTier = "free" | "pro";

export interface TierLimits {
  swipesPerDay: number; // -1 = unlimited
  maxPortfolioItems: number; // -1 = unlimited
  canUndoSwipe: boolean;
  undoSwipesPerDay: number;
  canVerifyProfile: boolean;
  hasAIMatchExplanations: boolean;
  hasAdvancedFilters: boolean;
  hasAdvancedProfile: boolean; // Press links, credits, awards
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    swipesPerDay: 30,
    maxPortfolioItems: 10,
    canUndoSwipe: false,
    undoSwipesPerDay: 0,
    canVerifyProfile: false,
    hasAIMatchExplanations: false,
    hasAdvancedFilters: false,
    hasAdvancedProfile: false,
  },
  pro: {
    swipesPerDay: -1, // unlimited
    maxPortfolioItems: -1, // unlimited
    canUndoSwipe: true,
    undoSwipesPerDay: 3,
    canVerifyProfile: true,
    hasAIMatchExplanations: true,
    hasAdvancedFilters: true,
    hasAdvancedProfile: true,
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
 * Check if user can add more portfolio items
 */
export const canAddPortfolioItem = (
  userTier: SubscriptionTier,
  currentItems: number
): boolean => {
  const limit = TIER_LIMITS[userTier].maxPortfolioItems;
  if (limit === -1) return true; // unlimited
  return currentItems < limit;
};

/**
 * Get tier display name
 */
export const getTierDisplayName = (tier: SubscriptionTier): string => {
  const names: Record<SubscriptionTier, string> = {
    free: "Spark",
    pro: "Pro",
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
  if (currentTier === "free") {
    const messages: Record<keyof TierLimits, string> = {
      swipesPerDay: "Upgrade to Pro for unlimited daily swipes",
      maxPortfolioItems: "Upgrade to Pro for unlimited portfolio items",
      canUndoSwipe: "Upgrade to Pro to undo swipes (3/day)",
      undoSwipesPerDay: "Upgrade to Pro for 3 undo swipes per day",
      canVerifyProfile: "Upgrade to Pro to get verified",
      hasAIMatchExplanations: "Upgrade to Pro for AI match explanations",
      hasAdvancedFilters: "Upgrade to Pro for advanced search filters",
      hasAdvancedProfile: "Upgrade to Pro for press links, credits & awards",
    };
    return messages[feature] || "Upgrade to Pro to unlock this feature";
  }
  return "Feature unlocked on your current tier";
};
