// Platform fee structure based on subscription tier
export const PLATFORM_FEES = {
  free: 0.15,        // 15%
  thriver: 0.10,     // 10%
  creator_pro: 0.05, // 5%
} as const;

export type SubscriptionTier = keyof typeof PLATFORM_FEES;

export const getPlatformFeePercentage = (tier: string | null): number => {
  if (!tier || tier === 'free') return PLATFORM_FEES.free;
  if (tier === 'thriver') return PLATFORM_FEES.thriver;
  if (tier === 'creator_pro') return PLATFORM_FEES.creator_pro;
  return PLATFORM_FEES.free; // Default to free tier
};

export const calculatePlatformFee = (amount: number, tier: string | null): number => {
  const feePercentage = getPlatformFeePercentage(tier);
  return Math.round(amount * feePercentage * 100) / 100; // Round to 2 decimals
};

export const calculatePlatformFeeInCents = (amountInCents: number, tier: string | null): number => {
  const feePercentage = getPlatformFeePercentage(tier);
  return Math.round(amountInCents * feePercentage);
};

export const getFeeDisplayText = (tier: string | null): string => {
  const percentage = getPlatformFeePercentage(tier);
  return `${(percentage * 100).toFixed(0)}%`;
};
