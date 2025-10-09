// Centralized subscription configuration
// Keep this in sync with Stripe products

export const SUBSCRIPTION_PRODUCTS = {
  creator_pro: {
    name: "Creator Pro",
    tier: "creator_pro" as const,
    price: 29,
    priceId: "price_1SESw4JvOS7zG18h5AG3IZ2V",
    productId: "prod_TAoZwx40t99jYc",
    features: [
      "Unlimited swipes & matches",
      "Unlimited AI recommendations",
      "Unlimited projects",
      "Featured profile (3x visibility)",
      "Priority matching algorithm",
      "Profile verification badge",
      "Undo swipe feature",
      "15% partner discounts",
      "Advanced analytics",
      "Early access to features",
    ],
  },
} as const;

export const LEGACY_PRODUCT_MAPPING = {
  'prod_TA5c8GtL6ioS2h': 'creator_pro',
  'prod_TA5ihoppNqeijE': 'creator_pro',
  'prod_TAoY7TiQaFLU00': 'creator_pro', // Old thriver maps to creator_pro
} as const;

export type SubscriptionTier = 'free' | 'creator_pro';

export function mapProductIdToTier(productId: string): SubscriptionTier {
  // Check current products
  if (productId === SUBSCRIPTION_PRODUCTS.creator_pro.productId) {
    return 'creator_pro';
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
    case 'creator_pro':
      return 'Creator Pro';
    case 'free':
    default:
      return 'Thriver';
  }
}

export function getTierPrice(tier: SubscriptionTier): number {
  switch (tier) {
    case 'creator_pro':
      return SUBSCRIPTION_PRODUCTS.creator_pro.price;
    case 'free':
    default:
      return 0;
  }
}
