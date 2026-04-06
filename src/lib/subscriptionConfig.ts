// Centralized subscription configuration
// Keep this in sync with Stripe products

export type AccountType = 'individual' | 'company';

// Creator/Individual subscription products
export const SUBSCRIPTION_PRODUCTS = {
  pro: {
    name: "Pro",
    tier: "pro" as const,
    price: 12,
    trialDays: 7,
    priceId: "price_1SZYrBJvOS7zG18hDW2eE4NG",
    productId: "prod_TWc5tpvPKjy8hG",
  },
  enterprise: {
    name: "Enterprise",
    tier: "enterprise" as const,
    price: 49,
    trialDays: 7,
    priceId: "price_1T7KklJvOS7zG18hwEl7vYNw",
    productId: "prod_U5VmCaKx7g2lbw",
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

// Brand/Company subscription products
export const BRAND_SUBSCRIPTION_PRODUCTS = {
  pro: {
    name: "Brand Pro",
    tier: "brand_pro" as const,
    price: 49,
    trialDays: 7,
    priceId: "price_1TFMpuJvOS7zG18hJm3HyPIv",
    productId: "prod_UDoSA9g7yHRm3X",
  },
  enterprise: {
    name: "Brand Enterprise",
    tier: "brand_enterprise" as const,
    price: 99,
    trialDays: 7,
    priceId: "price_1TFMqeJvOS7zG18h09O4TJId",
    productId: "prod_UDoT2jPlIxVnLp",
  },
} as const;

/** Features shown on subscription page, split by account type */
export const FREE_FEATURES: Record<AccountType, string[]> = {
  individual: [
    "Unlimited credit claiming",
    "30 swipes/day",
    "Direct messaging",
    "🤖 3 AI briefs/month",
    "📊 5 expenses/month",
    "📊 2 invoices/month",
    "🔓 2 approval requests/month",
    "🔓 3 milestones/month",
    "🔓 1 template use/month",
    "2 gig/event posts/month",
  ],
  company: [
    "Unlimited credit claiming",
    "3 opportunity postings/month",
    "Basic company page",
    "Direct messaging",
    "Browse talent directory",
    "🤖 2 AI applicant rankings/month",
    "🤖 2 AI job descriptions/month",
    "📊 5 expenses/month",
    "📊 2 invoices/month",
    "20% platform service fee",
  ],
};

export const PRO_FEATURES: Record<AccountType, string[]> = {
  individual: [
    "Unlimited swipes & matches",
    "Unlimited work credits & portfolio",
    "🤖 Unlimited AI Briefs & Templates",
    "📊 Unlimited Expense Tracking & Invoicing",
    "📊 Full P&L Dashboard & Reports",
    "🔓 Unlimited Workspace Tools",
    "AI match explanations",
    "Profile verification badge",
    "Advanced search filters",
    "Undo swipes (3/day)",
    "Press, credits & awards sections",
    "Priority support",
  ],
  company: [
    "Unlimited opportunity postings",
    "🤖 AI Talent Suggestions — top matches delivered to you",
    "🤖 Unlimited AI Job Descriptions",
    "🤖 Unlimited AI Applicant Ranking",
    "📊 Unlimited Expense Tracking & Invoicing",
    "📊 Full P&L Dashboard & Reports",
    "🔓 Applicant tracking dashboard",
    "🔓 Branded company page",
    "Advanced search & talent filters",
    "Profile verification badge",
    "Opportunity performance analytics",
    "Priority listing in search",
    "15% platform service fee (vs 20%)",
    "Priority support",
  ],
};

export const ENTERPRISE_FEATURES: Record<AccountType, string[]> = {
  individual: [
    "Everything in Pro, plus:",
    "📊 Campaign analytics (open/click tracking)",
    "⏰ Scheduled email sends",
    "🤖 Priority AI processing",
    "🔓 Advanced reporting & exports",
    "White-glove onboarding",
    "Dedicated account manager",
  ],
  company: [
    "Everything in Brand Pro, plus:",
    "📊 Campaign analytics (open/click tracking)",
    "⏰ Scheduled email sends",
    "🤖 Priority AI processing",
    "🔓 Advanced applicant pipeline",
    "🔓 Multi-seat team access",
    "White-glove onboarding",
    "Dedicated account manager",
    "10% platform service fee",
  ],
};

export const LEGACY_PRODUCT_MAPPING = {
  'prod_TA5c8GtL6ioS2h': 'pro',
  'prod_TA5ihoppNqeijE': 'pro',
  'prod_TAoY7TiQaFLU00': 'pro',
  'prod_TAoZwx40t99jYc': 'pro',
} as const;

export type SubscriptionTier = 'free' | 'pro' | 'enterprise' | 'founder' | 'brand_pro' | 'brand_enterprise';

export function mapProductIdToTier(productId: string): SubscriptionTier {
  if (productId === SUBSCRIPTION_PRODUCTS.founder.productId) return 'founder';
  if (productId === SUBSCRIPTION_PRODUCTS.enterprise.productId) return 'enterprise';
  if (productId === SUBSCRIPTION_PRODUCTS.pro.productId) return 'pro';
  if (productId === BRAND_SUBSCRIPTION_PRODUCTS.pro.productId) return 'brand_pro';
  if (productId === BRAND_SUBSCRIPTION_PRODUCTS.enterprise.productId) return 'brand_enterprise';
  const legacyTier = LEGACY_PRODUCT_MAPPING[productId as keyof typeof LEGACY_PRODUCT_MAPPING];
  if (legacyTier) return legacyTier;
  return 'free';
}

export function getTierDisplayName(tier: SubscriptionTier): string {
  switch (tier) {
    case 'founder': return 'Founder Circle ⭕';
    case 'brand_enterprise': return 'Brand Enterprise';
    case 'enterprise': return 'Enterprise';
    case 'brand_pro': return 'Brand Pro';
    case 'pro': return 'Pro';
    case 'free':
    default: return 'Spark';
  }
}

export function getTierPrice(tier: SubscriptionTier): number {
  switch (tier) {
    case 'founder': return SUBSCRIPTION_PRODUCTS.founder.price;
    case 'enterprise': return SUBSCRIPTION_PRODUCTS.enterprise.price;
    case 'pro': return SUBSCRIPTION_PRODUCTS.pro.price;
    case 'brand_enterprise': return BRAND_SUBSCRIPTION_PRODUCTS.enterprise.price;
    case 'brand_pro': return BRAND_SUBSCRIPTION_PRODUCTS.pro.price;
    case 'free':
    default: return 0;
  }
}

/** Check if tier has Pro-level access (pro, enterprise, founder, or brand equivalents) */
export function hasProAccess(tier: SubscriptionTier): boolean {
  return tier === 'pro' || tier === 'enterprise' || tier === 'founder' || tier === 'brand_pro' || tier === 'brand_enterprise';
}

/** Check if tier has Enterprise-level access */
export function hasEnterpriseAccess(tier: SubscriptionTier): boolean {
  return tier === 'enterprise' || tier === 'founder' || tier === 'brand_enterprise';
}

/** Check if tier is a brand-specific subscription */
export function isBrandTier(tier: SubscriptionTier): boolean {
  return tier === 'brand_pro' || tier === 'brand_enterprise';
}
