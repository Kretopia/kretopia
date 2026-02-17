/**
 * Subscription tier limits and feature gating
 * Supports both individual and company account types
 * 
 * Strategy: Free users get limited monthly uses of all features.
 * Pro users get unlimited access.
 */

import type { AccountType } from "./subscriptionConfig";

export type SubscriptionTier = "free" | "pro" | "founder";

export interface TierLimits {
  swipesPerDay: number; // -1 = unlimited
  maxPortfolioItems: number; // -1 = unlimited
  canUndoSwipe: boolean;
  undoSwipesPerDay: number;
  canVerifyProfile: boolean;
  hasAIMatchExplanations: boolean;
  hasAdvancedFilters: boolean;
  hasAdvancedProfile: boolean; // Press links, credits, awards
  // Company-specific limits
  maxOpportunityPostings: number; // -1 = unlimited, per month
  hasApplicantTracking: boolean;
  hasBrandedPage: boolean;
  hasOpportunityAnalytics: boolean;
  hasPriorityListing: boolean;
  hasAITalentScout: boolean;
}

/**
 * Free-tier monthly usage caps for previously hard-gated features.
 * -1 = unlimited (Pro). These are per-calendar-month limits.
 */
export const FREE_TIER_MONTHLY_CAPS = {
  // ThriveAI
  aiLeadSearches: 3,       // 3 lead searches/month
  aiOutreachDrafts: 5,     // 5 outreach drafts/month
  aiChatMessages: 20,      // 20 AI chat messages/month (was unlimited, now soft cap)
  
  // ThriveDesk workspace
  approvalRequests: 2,     // 2 approval workflows/month
  milestones: 3,           // 3 milestones/month
  invoices: 2,             // 2 invoices/month
  templateUses: 1,         // 1 template/month
  aiBriefs: 3,             // 3 AI briefs/month
  
  // ThriveMoney (Accounting)
  expenses: 5,             // 5 expenses/month
  
  // Opportunities
  aiApplicantRankings: 2,  // 2 AI rankings/month
  aiJobDescriptions: 2,    // 2 AI job descriptions/month
} as const;

export const PRO_TIER_MONTHLY_CAPS: Record<keyof typeof FREE_TIER_MONTHLY_CAPS, number> = {
  aiLeadSearches: -1,
  aiOutreachDrafts: -1,
  aiChatMessages: -1,
  approvalRequests: -1,
  milestones: -1,
  invoices: -1,
  templateUses: -1,
  aiBriefs: -1,
  expenses: -1,
  aiApplicantRankings: -1,
  aiJobDescriptions: -1,
};

export type FreeTierFeature = keyof typeof FREE_TIER_MONTHLY_CAPS;

export function getMonthlyCapForFeature(
  feature: FreeTierFeature,
  tier: SubscriptionTier
): number {
  if (tier === "pro" || tier === "founder") return -1;
  return FREE_TIER_MONTHLY_CAPS[feature];
}

export function getFeatureDisplayName(feature: FreeTierFeature): string {
  const names: Record<FreeTierFeature, string> = {
    aiLeadSearches: "AI lead searches",
    aiOutreachDrafts: "AI outreach drafts",
    aiChatMessages: "AI chat messages",
    approvalRequests: "approval requests",
    milestones: "milestones",
    invoices: "invoices",
    templateUses: "template uses",
    aiBriefs: "AI briefs",
    expenses: "expenses",
    aiApplicantRankings: "AI applicant rankings",
    aiJobDescriptions: "AI job descriptions",
  };
  return names[feature];
}

const INDIVIDUAL_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    swipesPerDay: 30,
    maxPortfolioItems: 5,
    canUndoSwipe: false,
    undoSwipesPerDay: 0,
    canVerifyProfile: false,
    hasAIMatchExplanations: false,
    hasAdvancedFilters: false,
    hasAdvancedProfile: false,
    maxOpportunityPostings: 1,
    hasApplicantTracking: false,
    hasBrandedPage: false,
    hasOpportunityAnalytics: false,
    hasPriorityListing: false,
    hasAITalentScout: false,
  },
  pro: {
    swipesPerDay: -1,
    maxPortfolioItems: -1,
    canUndoSwipe: true,
    undoSwipesPerDay: 3,
    canVerifyProfile: true,
    hasAIMatchExplanations: true,
    hasAdvancedFilters: true,
    hasAdvancedProfile: true,
    maxOpportunityPostings: -1,
    hasApplicantTracking: false,
    hasBrandedPage: false,
    hasOpportunityAnalytics: false,
    hasPriorityListing: false,
    hasAITalentScout: false,
  },
  founder: {
    swipesPerDay: -1,
    maxPortfolioItems: -1,
    canUndoSwipe: true,
    undoSwipesPerDay: 3,
    canVerifyProfile: true,
    hasAIMatchExplanations: true,
    hasAdvancedFilters: true,
    hasAdvancedProfile: true,
    maxOpportunityPostings: -1,
    hasApplicantTracking: false,
    hasBrandedPage: false,
    hasOpportunityAnalytics: false,
    hasPriorityListing: false,
    hasAITalentScout: false,
  },
};

const COMPANY_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    swipesPerDay: 30,
    maxPortfolioItems: 5,
    canUndoSwipe: false,
    undoSwipesPerDay: 0,
    canVerifyProfile: false,
    hasAIMatchExplanations: false,
    hasAdvancedFilters: false,
    hasAdvancedProfile: false,
    maxOpportunityPostings: 3,
    hasApplicantTracking: false,
    hasBrandedPage: false,
    hasOpportunityAnalytics: false,
    hasPriorityListing: false,
    hasAITalentScout: false,
  },
  pro: {
    swipesPerDay: -1,
    maxPortfolioItems: -1,
    canUndoSwipe: true,
    undoSwipesPerDay: 3,
    canVerifyProfile: true,
    hasAIMatchExplanations: true,
    hasAdvancedFilters: true,
    hasAdvancedProfile: true,
    maxOpportunityPostings: -1,
    hasApplicantTracking: true,
    hasBrandedPage: true,
    hasOpportunityAnalytics: true,
    hasPriorityListing: true,
    hasAITalentScout: true,
  },
  founder: {
    swipesPerDay: -1,
    maxPortfolioItems: -1,
    canUndoSwipe: true,
    undoSwipesPerDay: 3,
    canVerifyProfile: true,
    hasAIMatchExplanations: true,
    hasAdvancedFilters: true,
    hasAdvancedProfile: true,
    maxOpportunityPostings: -1,
    hasApplicantTracking: true,
    hasBrandedPage: true,
    hasOpportunityAnalytics: true,
    hasPriorityListing: true,
    hasAITalentScout: true,
  },
};

/** Legacy flat export for backward compatibility (defaults to individual) */
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  ...INDIVIDUAL_LIMITS,
  founder: INDIVIDUAL_LIMITS.pro, // Founder gets all Pro perks
};

/**
 * Get tier limits based on account type
 * Founder tier maps to Pro limits
 */
export const getTierLimits = (
  tier: SubscriptionTier,
  accountType: AccountType = "individual"
): TierLimits => {
  const effectiveTier = tier === "founder" ? "pro" : tier;
  const limitsMap = accountType === "company" ? COMPANY_LIMITS : INDIVIDUAL_LIMITS;
  return limitsMap[effectiveTier];
};

/**
 * Check if user can perform an action based on their tier and account type
 */
export const canPerformAction = (
  userTier: SubscriptionTier,
  action: keyof TierLimits,
  accountType: AccountType = "individual"
): boolean => {
  const limits = getTierLimits(userTier, accountType);
  return Boolean(limits[action]);
};

/**
 * Get remaining swipes for today
 */
export const getRemainingSwipes = (
  userTier: SubscriptionTier,
  dailySwipes: number,
  accountType: AccountType = "individual"
): number => {
  const limit = getTierLimits(userTier, accountType).swipesPerDay;
  if (limit === -1) return -1;
  return Math.max(0, limit - dailySwipes);
};

/**
 * Check if user can add more portfolio items
 */
export const canAddPortfolioItem = (
  userTier: SubscriptionTier,
  currentItems: number,
  accountType: AccountType = "individual"
): boolean => {
  const limit = getTierLimits(userTier, accountType).maxPortfolioItems;
  if (limit === -1) return true;
  return currentItems < limit;
};

/**
 * Get tier display name
 */
export const getTierDisplayName = (tier: SubscriptionTier): string => {
  const names: Record<SubscriptionTier, string> = {
    free: "Spark",
    pro: "Pro",
    founder: "Founder Circle ⭕",
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
    const messages: Partial<Record<keyof TierLimits, string>> = {
      swipesPerDay: "Upgrade to Pro for unlimited daily swipes",
      maxPortfolioItems: "Upgrade to Pro for unlimited portfolio items",
      canUndoSwipe: "Upgrade to Pro to undo swipes (3/day)",
      undoSwipesPerDay: "Upgrade to Pro for 3 undo swipes per day",
      canVerifyProfile: "Upgrade to Pro to get verified",
      hasAIMatchExplanations: "Upgrade to Pro for AI match explanations",
      hasAdvancedFilters: "Upgrade to Pro for advanced search filters",
      hasAdvancedProfile: "Upgrade to Pro for press links, credits & awards",
      maxOpportunityPostings: "Upgrade to Pro for unlimited opportunity postings",
      hasApplicantTracking: "Upgrade to Pro for applicant tracking",
      hasBrandedPage: "Upgrade to Pro for a branded company page",
      hasOpportunityAnalytics: "Upgrade to Pro for opportunity analytics",
      hasPriorityListing: "Upgrade to Pro for priority listing in search",
      hasAITalentScout: "Upgrade to Pro for AI Talent Scout",
    };
    return messages[feature] || "Upgrade to Pro to unlock this feature";
  }
  return "Feature unlocked on your current tier";
};
