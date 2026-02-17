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
  founder: {
    name: "Founder Circle ⭕",
    tier: "founder" as const,
    price: 199,
    oneTime: true,
    priceId: "price_1T1O6yJvOS7zG18hgCeJU1cF",
    productId: "prod_TzMqfksF7u6WBH",
    maxSpots: 1000,
  },
} as const;

/** Features shown on subscription page, split by account type */
export const PRO_FEATURES: Record<AccountType, string[]> = {
  individual: [
    "Unlimited swipes & matches",
    "🤖 Unlimited AI Lead Scout & CRM",
    "🤖 Unlimited AI Outreach Sequences",
    "🤖 Unlimited AI Chat & Insights",
    "🤖 Unlimited AI Briefs & Templates",
    "📊 Unlimited Expense Tracking & Invoicing",
    "📊 Full P&L Dashboard & Reports",
    "🔓 Unlimited Workspace Tools",
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
    "🤖 Unlimited AI Talent Scout & Pipeline",
    "🤖 Unlimited AI Outreach Sequences",
    "🤖 Unlimited AI Job Descriptions",
    "🤖 Unlimited AI Applicant Ranking",
    "📊 Unlimited Expense Tracking & Invoicing",
    "📊 Full P&L Dashboard & Reports",
    "🔓 Applicant tracking dashboard",
    "🔓 Branded company page",
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
    "Portfolio (up to 5 items)",
    "Direct messaging",
    "🤖 3 AI lead searches/month",
    "🤖 5 AI outreach drafts/month",
    "🤖 20 AI chat messages/month",
    "🤖 3 AI briefs/month",
    "📊 5 expenses/month",
    "📊 2 invoices/month",
    "🔓 2 approval requests/month",
    "🔓 3 milestones/month",
    "🔓 1 template use/month",
  ],
  company: [
    "3 opportunity postings/month",
    "Basic company page",
    "Direct messaging",
    "🤖 2 AI applicant rankings/month",
    "🤖 2 AI job descriptions/month",
    "🤖 5 AI outreach drafts/month",
    "📊 5 expenses/month",
    "📊 2 invoices/month",
    "🔓 2 approval requests/month",
    "🔓 3 milestones/month",
    "Browse talent",
  ],
};

export const LEGACY_PRODUCT_MAPPING = {
  'prod_TA5c8GtL6ioS2h': 'pro',
  'prod_TA5ihoppNqeijE': 'pro',
  'prod_TAoY7TiQaFLU00': 'pro',
  'prod_TAoZwx40t99jYc': 'pro',
} as const;

export type SubscriptionTier = 'free' | 'pro' | 'founder';

export function mapProductIdToTier(productId: string): SubscriptionTier {
  if (productId === SUBSCRIPTION_PRODUCTS.founder.productId) {
    return 'founder';
  }
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
    case 'founder':
      return 'Founder Circle ⭕';
    case 'pro':
      return 'Pro';
    case 'free':
    default:
      return 'Spark';
  }
}

export function getTierPrice(tier: SubscriptionTier): number {
  switch (tier) {
    case 'founder':
      return SUBSCRIPTION_PRODUCTS.founder.price;
    case 'pro':
      return SUBSCRIPTION_PRODUCTS.pro.price;
    case 'free':
    default:
      return 0;
  }
}

/** Check if tier has Pro-level access (pro or founder) */
export function hasProAccess(tier: SubscriptionTier): boolean {
  return tier === 'pro' || tier === 'founder';
}
