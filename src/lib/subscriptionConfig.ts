// Centralized subscription configuration
// Keep this in sync with Stripe products

export const SUBSCRIPTION_PRODUCTS = {
  thriver: {
    name: "Thriver",
    tier: "thriver" as const,
    price: 9,
    priceId: "price_1SESvnJvOS7zG18hluEK0W9c",
    productId: "prod_TAoY7TiQaFLU00",
    features: [
      "Unlimited swipes",
      "AI match recommendations",
      "Profile verification badge",
      "Unlimited projects",
      "Advanced analytics",
      "Undo swipe feature",
      "5% partner discounts",
    ],
  },
  creator_pro: {
    name: "Creator Pro",
    tier: "creator_pro" as const,
    price: 29,
    priceId: "price_1SESw4JvOS7zG18h5AG3IZ2V",
    productId: "prod_TAoZwx40t99jYc",
    features: [
      "Everything in Thriver",
      "Featured profile (2x visibility)",
      "Priority matching",
      "Advanced collaboration tools",
      "15% partner discounts",
      "Early access to new features",
      "Dedicated support",
    ],
  },
} as const;

export const LEGACY_PRODUCT_MAPPING = {
  'prod_TA5c8GtL6ioS2h': 'thriver',
  'prod_TA5ihoppNqeijE': 'creator_pro',
} as const;

export type SubscriptionTier = 'free' | 'thriver' | 'creator_pro';

export function mapProductIdToTier(productId: string): SubscriptionTier {
  // Check current products
  if (productId === SUBSCRIPTION_PRODUCTS.thriver.productId) {
    return 'thriver';
  }
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
    case 'thriver':
      return 'Thriver';
    case 'creator_pro':
      return 'Creator Pro';
    case 'free':
    default:
      return 'Free';
  }
}

export function getTierPrice(tier: SubscriptionTier): number {
  switch (tier) {
    case 'thriver':
      return SUBSCRIPTION_PRODUCTS.thriver.price;
    case 'creator_pro':
      return SUBSCRIPTION_PRODUCTS.creator_pro.price;
    case 'free':
    default:
      return 0;
  }
}
