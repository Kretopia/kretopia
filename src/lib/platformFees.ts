// Platform fee structure based on subscription tier
export const PLATFORM_FEES = {
  free: 0.15,   // 15%
  pro: 0.08,    // 8% (reduced for Pro value)
} as const;

export type SubscriptionTier = keyof typeof PLATFORM_FEES;

export const getPlatformFeePercentage = (tier: string | null): number => {
  if (!tier || tier === 'free') return PLATFORM_FEES.free;
  if (tier === 'pro') return PLATFORM_FEES.pro;
  // Legacy studio tier maps to pro
  if (tier === 'studio') return PLATFORM_FEES.pro;
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
