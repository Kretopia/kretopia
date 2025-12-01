// Centralized subscription configuration
// Keep this in sync with Stripe products

export const SUBSCRIPTION_PRODUCTS = {
  pro: {
    name: "Pro",
    tier: "pro" as const,
    price: 12,
    priceId: "price_1SZYrBJvOS7zG18hDW2eE4NG",
    productId: "prod_TWc5tpvPKjy8hG",
    features: [
      "Unlimited swipes & matches",
      "AI match explanations",
      "Profile verification badge",
      "Unlimited portfolio items",
      "Advanced filters",
      "Undo swipes (3/day)",
      "Advanced profile sections",
      "Press links & credits",
      "Priority support",
    ],
  },
} as const;

export const LEGACY_PRODUCT_MAPPING = {
  'prod_TA5c8GtL6ioS2h': 'pro',
  'prod_TA5ihoppNqeijE': 'pro',
  'prod_TAoY7TiQaFLU00': 'pro', // Old creator_pro and studio map to pro
  'prod_TAoZwx40t99jYc': 'pro', // Old studio maps to pro
} as const;

export type SubscriptionTier = 'free' | 'pro';

export function mapProductIdToTier(productId: string): SubscriptionTier {
  // Check current products
  if (productId === SUBSCRIPTION_PRODUCTS.pro.productId) {
    return 'pro';
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
