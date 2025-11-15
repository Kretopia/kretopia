// Centralized subscription configuration
// Keep this in sync with Stripe products

export const SUBSCRIPTION_PRODUCTS = {
  pro: {
    name: "Pro",
    tier: "pro" as const,
    price: 9,
    priceId: "price_NEEDS_TO_BE_CREATED", // User needs to create this in Stripe
    productId: "prod_NEEDS_TO_BE_CREATED",
    features: [
      "Unlimited swipes & matches",
      "5 active projects",
      "10 AI recommendations/day",
      "3 undo swipes/day",
      "Profile verification badge",
      "Unlimited portfolio items",
      "Advanced filters",
      "10% partner discounts",
      "Read receipts",
    ],
  },
  studio: {
    name: "Studio",
    tier: "studio" as const,
    price: 29,
    priceId: "price_1SESw4JvOS7zG18h5AG3IZ2V",
    productId: "prod_TAoZwx40t99jYc",
    features: [
      "Everything in Pro",
      "Unlimited projects",
      "Unlimited AI recommendations",
      "Unlimited undo swipes",
      "Featured profile (3x visibility)",
      "Priority matching algorithm",
      "Advanced analytics dashboard",
      "15-20% partner discounts",
      "Early access to features",
      "Dedicated support",
      "Company profile",
      "Opportunity boosting",
    ],
  },
} as const;

export const LEGACY_PRODUCT_MAPPING = {
  'prod_TA5c8GtL6ioS2h': 'studio',
  'prod_TA5ihoppNqeijE': 'studio',
  'prod_TAoY7TiQaFLU00': 'studio', // Old creator_pro maps to studio
} as const;

export type SubscriptionTier = 'free' | 'pro' | 'studio';

export function mapProductIdToTier(productId: string): SubscriptionTier {
  // Check current products
  if (productId === SUBSCRIPTION_PRODUCTS.pro.productId) {
    return 'pro';
  }
  if (productId === SUBSCRIPTION_PRODUCTS.studio.productId) {
    return 'studio';
  }
  
  // Check legacy products
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
    case 'studio':
      return 'Studio';
    case 'free':
    default:
      return 'Spark';
  }
}

export function getTierPrice(tier: SubscriptionTier): number {
  switch (tier) {
    case 'pro':
      return SUBSCRIPTION_PRODUCTS.pro.price;
    case 'studio':
      return SUBSCRIPTION_PRODUCTS.studio.price;
    case 'free':
    default:
      return 0;
  }
}
