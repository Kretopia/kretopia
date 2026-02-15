// Centralized subscription configuration
// Keep this in sync with Stripe products

export type AccountType = 'individual' | 'company';

export const SUBSCRIPTION_PRODUCTS = {
  pro: {
    name: "Pro",
    tier: "pro" as const,
    price: 12,
    trialDays: 7,
    priceId: "price_1SZYrBJvOS7zG18hDW2eE4NG",
    productId: "prod_TWc5tpvPKjy8hG",
  },
} as const;

/** Features shown on subscription page, split by account type */
export const PRO_FEATURES: Record<AccountType, string[]> = {
  individual: [
    "Unlimited swipes & matches",
    "🤖 AI Lead Scout & CRM",
    "🤖 AI Outreach Sequences",
    "🤖 AI Portfolio Insights",
    "🤖 AI Collaboration Ideas",
    "🤖 AI Profile Optimizer",
    "AI match explanations",
    "Profile verification badge",
    "Unlimited portfolio items",
    "Advanced search filters",
    "Undo swipes (3/day)",
    "Press, credits & awards sections",
    "Priority support",
  ],
  company: [
    "Unlimited opportunity postings",
    "🤖 AI Talent Scout & Pipeline",
    "🤖 AI Outreach Sequences",
    "🤖 AI Job Description Generator",
    "🤖 AI Applicant Ranking",
    "Applicant tracking dashboard",
    "Branded company page",
    "Advanced search filters",
    "Profile verification badge",
    "AI match explanations",
    "Opportunity performance analytics",
    "Priority listing in search",
    "Priority support",
  ],
};

export const FREE_FEATURES: Record<AccountType, string[]> = {
  individual: [
    "30 swipes/day",
    "Basic profile",
    "Direct messaging",
    "Portfolio (up to 5 items)",
    "Browse matches",
  ],
  company: [
    "3 opportunity postings/month",
    "Basic company page",
    "Direct messaging",
    "Browse talent",
    "Basic applicant management",
  ],
};

export const LEGACY_PRODUCT_MAPPING = {
  'prod_TA5c8GtL6ioS2h': 'pro',
  'prod_TA5ihoppNqeijE': 'pro',
  'prod_TAoY7TiQaFLU00': 'pro',
  'prod_TAoZwx40t99jYc': 'pro',
} as const;

export type SubscriptionTier = 'free' | 'pro';

export function mapProductIdToTier(productId: string): SubscriptionTier {
  if (productId === SUBSCRIPTION_PRODUCTS.pro.productId) {
    return 'pro';
  }
  const legacyTier = LEGACY_PRODUCT_MAPPING[productId as keyof typeof LEGACY_PRODUCT_MAPPING];
  if (legacyTier) {
    return legacyTier;
  }
  return 'free';
}

export function getTierDisplayName(tier: SubscriptionTier): string {
  switch (tier) {
    case 'pro':
      return 'Pro';
    case 'free':
    default:
      return 'Spark';
  }
}

export function getTierPrice(tier: SubscriptionTier): number {
  switch (tier) {
    case 'pro':
      return SUBSCRIPTION_PRODUCTS.pro.price;
    case 'free':
    default:
      return 0;
  }
}
