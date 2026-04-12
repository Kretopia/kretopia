// Centralized subscription configuration
// Keep this in sync with Stripe products

export type AccountType = 'individual' | 'company';
export type BillingInterval = 'monthly' | 'yearly';

// Creator/Individual subscription products
export const SUBSCRIPTION_PRODUCTS = {
  pro: {
    name: "Pro",
    tier: "pro" as const,
    price: 15,
    yearlyPrice: 144, // $12/mo effective — save $36/yr
    trialDays: 7,
    priceId: "price_1TLWQiJvOS7zG18hywKD2r8W",
    yearlyPriceId: "price_1TLWPoJvOS7zG18h6T6MOSbE",
    productId: "prod_UKAmTywyqyLhMk",
    yearlyProductId: "prod_UKAlwpY8dS3Doc",
    legacyProductIds: ["prod_TWc5tpvPKjy8hG"],
  },
  creator_pro: {
    name: "Creator Pro",
    tier: "creator_pro" as const,
    price: 29,
    yearlyPrice: 278, // ~$23.17/mo effective — save $70/yr
    trialDays: 7,
    priceId: "price_1TLWQjJvOS7zG18h7aQBNmo8",
    yearlyPriceId: "price_1TLWQ6JvOS7zG18hjaiygUxE",
    productId: "prod_UKAmxFRvNL3ez3",
    yearlyProductId: "prod_UKAlBEJxMen4Xr",
    legacyProductIds: ["prod_UKARjeRiOcTS46"],
  },
  enterprise: {
    name: "Enterprise",
    tier: "enterprise" as const,
    price: 59,
    yearlyPrice: 566, // ~$47.17/mo effective — save $142/yr
    trialDays: 7,
    priceId: "price_1TLWQkJvOS7zG18hSN9qmxyW",
    yearlyPriceId: "price_1TLWQRJvOS7zG18hLQJW4YIB",
    productId: "prod_UKAmUMW9FUQLZD",
    yearlyProductId: "prod_UKAl8dxTE4ZidO",
    legacyProductIds: ["prod_U5VmCaKx7g2lbw"],
  },
  founder: {
    name: "Founder Circle ⭕",
    tier: "founder" as const,
    price: 499,
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
    price: 59,
    yearlyPrice: 566, // ~$47.17/mo effective — save $142/yr
    trialDays: 7,
    priceId: "price_1TLWQlJvOS7zG18hb5QeNh8k",
    yearlyPriceId: "price_1TLWQbJvOS7zG18hgPTf5C0g",
    productId: "prod_UKAmkngXKhLPdB",
    yearlyProductId: "prod_UKAmubvs5yP0o2",
    legacyProductIds: ["prod_UDoSA9g7yHRm3X"],
  },
  enterprise: {
    name: "Brand Enterprise",
    tier: "brand_enterprise" as const,
    price: 129,
    yearlyPrice: 1238, // ~$103.17/mo effective — save $310/yr
    trialDays: 7,
    priceId: "price_1TLWQmJvOS7zG18h4AVxAVKx",
    yearlyPriceId: "price_1TLWQcJvOS7zG18hD1oVzrrJ",
    productId: "prod_UKAmQMESnSKqwB",
    yearlyProductId: "prod_UKAmq7dJi4lkBd",
    legacyProductIds: ["prod_UDoT2jPlIxVnLp"],
  },
} as const;

/** Features shown on subscription page, split by account type */
export const FREE_FEATURES: Record<AccountType, string[]> = {
  individual: [
    "Unlimited credit claiming",
    "20 swipes/day",
    "Direct messaging",
    "Unlimited paid gig posts",
    "3 barter/collab posts/month",
    "🤖 3 AI briefs/month",
    "📊 5 invoices/month",
    "📊 10 expenses/month",
    "🔓 2 approval requests/month",
    "🔓 5 milestones/month",
    "🔓 1 template use/month",
  ],
  company: [
    "Unlimited credit claiming",
    "Unlimited paid job posts",
    "5 barter/collab posts/month",
    "Basic company page",
    "Direct messaging",
    "Browse talent directory",
    "🤖 2 AI applicant rankings/month",
    "🤖 2 AI job descriptions/month",
    "📊 5 invoices/month",
    "📊 10 expenses/month",
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

export const CREATOR_PRO_FEATURES: string[] = [
  "Everything in Pro, plus:",
  "🌐 Creator Site — your own landing page/website",
  "✏️ Site section editor — reorder, show/hide, custom text",
  "🎨 3 premium templates to choose from",
  "🔗 Free yourname.thrivein.app subdomain",
  "📊 Site visitor analytics (coming soon)",
];

export const ENTERPRISE_FEATURES: Record<AccountType, string[]> = {
  individual: [
    "Everything in Creator Pro, plus:",
    "🔗 Custom domain support (yourdomain.com)",
    "📊 Campaign analytics (open/click tracking)",
    "⏰ Scheduled email sends",
    "🤖 Priority AI processing",
    "🔓 Advanced reporting & exports",
    "White-glove onboarding",
    "Dedicated account manager",
  ],
  company: [
    "Everything in Brand Pro, plus:",
    "🔗 Custom domain support (yourdomain.com)",
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

export const LEGACY_PRODUCT_MAPPING: Record<string, string> = {
  // Old Pro products
  'prod_TWc5tpvPKjy8hG': 'pro',
  'prod_TA5c8GtL6ioS2h': 'pro',
  'prod_TA5ihoppNqeijE': 'pro',
  'prod_TAoY7TiQaFLU00': 'pro',
  'prod_TAoZwx40t99jYc': 'pro',
  // Old Creator Pro
  'prod_UKARjeRiOcTS46': 'creator_pro',
  // Old Enterprise
  'prod_U5VmCaKx7g2lbw': 'enterprise',
  // Old Brand tiers
  'prod_UDoSA9g7yHRm3X': 'brand_pro',
  'prod_UDoT2jPlIxVnLp': 'brand_enterprise',
  // Old price-based IDs
  'price_1SZYrBJvOS7zG18hDW2eE4NG': 'pro',
  'price_1TLW6iJvOS7zG18hyl8LpXqw': 'creator_pro',
  'price_1T7KklJvOS7zG18hwEl7vYNw': 'enterprise',
  'price_1TFMpuJvOS7zG18hJm3HyPIv': 'brand_pro',
  'price_1TFMqeJvOS7zG18h09O4TJId': 'brand_enterprise',
};

export type SubscriptionTier = 'free' | 'pro' | 'creator_pro' | 'enterprise' | 'founder' | 'brand_pro' | 'brand_enterprise';

export function mapProductIdToTier(productId: string): SubscriptionTier {
  // Current products (monthly + yearly)
  if (productId === SUBSCRIPTION_PRODUCTS.founder.productId) return 'founder';
  if (productId === SUBSCRIPTION_PRODUCTS.enterprise.productId || productId === SUBSCRIPTION_PRODUCTS.enterprise.yearlyProductId) return 'enterprise';
  if (productId === SUBSCRIPTION_PRODUCTS.creator_pro.productId || productId === SUBSCRIPTION_PRODUCTS.creator_pro.yearlyProductId) return 'creator_pro';
  if (productId === SUBSCRIPTION_PRODUCTS.pro.productId || productId === SUBSCRIPTION_PRODUCTS.pro.yearlyProductId) return 'pro';
  if (productId === BRAND_SUBSCRIPTION_PRODUCTS.pro.productId || productId === BRAND_SUBSCRIPTION_PRODUCTS.pro.yearlyProductId) return 'brand_pro';
  if (productId === BRAND_SUBSCRIPTION_PRODUCTS.enterprise.productId || productId === BRAND_SUBSCRIPTION_PRODUCTS.enterprise.yearlyProductId) return 'brand_enterprise';
  // Legacy
  const legacyTier = LEGACY_PRODUCT_MAPPING[productId];
  if (legacyTier) return legacyTier as SubscriptionTier;
  return 'free';
}

export function getTierDisplayName(tier: SubscriptionTier): string {
  switch (tier) {
    case 'founder': return 'Founder Circle ⭕';
    case 'brand_enterprise': return 'Brand Enterprise';
    case 'enterprise': return 'Enterprise';
    case 'brand_pro': return 'Brand Pro';
    case 'creator_pro': return 'Creator Pro';
    case 'pro': return 'Pro';
    case 'free':
    default: return 'Spark';
  }
}

export function getTierPrice(tier: SubscriptionTier, interval: BillingInterval = 'monthly'): number {
  if (interval === 'yearly') {
    switch (tier) {
      case 'founder': return SUBSCRIPTION_PRODUCTS.founder.price;
      case 'enterprise': return SUBSCRIPTION_PRODUCTS.enterprise.yearlyPrice;
      case 'creator_pro': return SUBSCRIPTION_PRODUCTS.creator_pro.yearlyPrice;
      case 'pro': return SUBSCRIPTION_PRODUCTS.pro.yearlyPrice;
      case 'brand_enterprise': return BRAND_SUBSCRIPTION_PRODUCTS.enterprise.yearlyPrice;
      case 'brand_pro': return BRAND_SUBSCRIPTION_PRODUCTS.pro.yearlyPrice;
      case 'free':
      default: return 0;
    }
  }
  switch (tier) {
    case 'founder': return SUBSCRIPTION_PRODUCTS.founder.price;
    case 'enterprise': return SUBSCRIPTION_PRODUCTS.enterprise.price;
    case 'creator_pro': return SUBSCRIPTION_PRODUCTS.creator_pro.price;
    case 'pro': return SUBSCRIPTION_PRODUCTS.pro.price;
    case 'brand_enterprise': return BRAND_SUBSCRIPTION_PRODUCTS.enterprise.price;
    case 'brand_pro': return BRAND_SUBSCRIPTION_PRODUCTS.pro.price;
    case 'free':
    default: return 0;
  }
}

/** Check if tier has Pro-level access (pro, creator_pro, enterprise, founder, or brand equivalents) */
export function hasProAccess(tier: SubscriptionTier): boolean {
  return tier === 'pro' || tier === 'creator_pro' || tier === 'enterprise' || tier === 'founder' || tier === 'brand_pro' || tier === 'brand_enterprise';
}

/** Check if tier has Creator Pro-level access (creator_pro, enterprise, founder) */
export function hasCreatorProAccess(tier: SubscriptionTier): boolean {
  return tier === 'creator_pro' || tier === 'enterprise' || tier === 'founder';
}

/** Check if tier has Enterprise-level access */
export function hasEnterpriseAccess(tier: SubscriptionTier): boolean {
  return tier === 'enterprise' || tier === 'founder' || tier === 'brand_enterprise';
}

/** Check if tier is a brand-specific subscription */
export function isBrandTier(tier: SubscriptionTier): boolean {
  return tier === 'brand_pro' || tier === 'brand_enterprise';
}

/** Get the yearly savings amount for a tier */
export function getYearlySavings(tier: SubscriptionTier): number {
  switch (tier) {
    case 'pro': return (SUBSCRIPTION_PRODUCTS.pro.price * 12) - SUBSCRIPTION_PRODUCTS.pro.yearlyPrice;
    case 'creator_pro': return (SUBSCRIPTION_PRODUCTS.creator_pro.price * 12) - SUBSCRIPTION_PRODUCTS.creator_pro.yearlyPrice;
    case 'enterprise': return (SUBSCRIPTION_PRODUCTS.enterprise.price * 12) - SUBSCRIPTION_PRODUCTS.enterprise.yearlyPrice;
    case 'brand_pro': return (BRAND_SUBSCRIPTION_PRODUCTS.pro.price * 12) - BRAND_SUBSCRIPTION_PRODUCTS.pro.yearlyPrice;
    case 'brand_enterprise': return (BRAND_SUBSCRIPTION_PRODUCTS.enterprise.price * 12) - BRAND_SUBSCRIPTION_PRODUCTS.enterprise.yearlyPrice;
    default: return 0;
  }
}

/** Get the effective monthly price when billed yearly */
export function getEffectiveMonthlyPrice(tier: SubscriptionTier): number {
  const yearlyPrice = getTierPrice(tier, 'yearly');
  return yearlyPrice > 0 ? Math.round((yearlyPrice / 12) * 100) / 100 : 0;
}
