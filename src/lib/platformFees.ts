// Platform service fee structure — charged TO THE BRAND/COMPANY on top of talent rate
// Talent receives 100% of their quoted rate
export const PLATFORM_FEES = {
  free: 0.20,             // 20% service fee for free brands
  pro: 0.15,              // 15% for Pro brands (creator pro)
  brand_pro: 0.15,        // 15% for Brand Pro
  brand_enterprise: 0.10, // 10% for Brand Enterprise
  enterprise: 0.10,       // 10% for Enterprise
  founder: 0.10,          // 10% for Founder Circle brands
} as const;

// Manager commission rate — also charged to the brand on top
export const MANAGER_COMMISSION_RATE = 0.10; // 10%

export type SubscriptionTier = keyof typeof PLATFORM_FEES;

export const getPlatformFeePercentage = (tier: string | null): number => {
  if (!tier || tier === 'free') return PLATFORM_FEES.free;
  if (tier === 'founder') return PLATFORM_FEES.founder;
  if (tier === 'pro') return PLATFORM_FEES.pro;
  if (tier === 'brand_pro') return PLATFORM_FEES.brand_pro;
  if (tier === 'brand_enterprise') return PLATFORM_FEES.brand_enterprise;
  if (tier === 'studio') return PLATFORM_FEES.pro;
  if (tier === 'enterprise') return PLATFORM_FEES.enterprise;
  return PLATFORM_FEES.free;
};

// Calculate platform service fee charged to the brand (on top of talent rate)
export const calculatePlatformFee = (talentRate: number, tier: string | null): number => {
  const feePercentage = getPlatformFeePercentage(tier);
  return Math.round(talentRate * feePercentage * 100) / 100;
};

export const calculatePlatformFeeInCents = (amountInCents: number, tier: string | null): number => {
  const feePercentage = getPlatformFeePercentage(tier);
  return Math.round(amountInCents * feePercentage);
};

// Calculate manager commission charged to the brand (on top of talent rate)
export const calculateManagerCommission = (talentRate: number, hasManager: boolean): number => {
  if (!hasManager) return 0;
  return Math.round(talentRate * MANAGER_COMMISSION_RATE * 100) / 100;
};

// Calculate total amount the brand pays
export const calculateBrandTotal = (
  talentRate: number,
  tier: string | null,
  hasManager: boolean = false
): {
  talentPayout: number;
  platformFee: number;
  managerCommission: number;
  stripeFee: number;
  brandTotal: number;
} => {
  const platformFee = calculatePlatformFee(talentRate, tier);
  const managerCommission = calculateManagerCommission(talentRate, hasManager);
  const subtotal = talentRate + platformFee + managerCommission;
  const stripeFee = Math.round((subtotal * 0.029 + 0.30) * 100) / 100;
  const brandTotal = Math.round((subtotal + stripeFee) * 100) / 100;

  return {
    talentPayout: talentRate,
    platformFee,
    managerCommission,
    stripeFee,
    brandTotal,
  };
};

export const getFeeDisplayText = (tier: string | null): string => {
  const percentage = getPlatformFeePercentage(tier);
  return `${(percentage * 100).toFixed(0)}%`;
};
