import { useAuth } from "@/hooks/useAuth";
import { getPerFileLimit, formatBytes, TIER_LABELS } from "@/lib/fileSizeLimits";

export function useFileSizeLimit() {
  const { subscriptionInfo } = useAuth();
  const tier = subscriptionInfo?.tier ?? "free";
  const limit = getPerFileLimit(tier as any);
  return {
    tier,
    tierLabel: TIER_LABELS[tier] ?? "Spark (Free)",
    limit,
    limitLabel: formatBytes(limit),
    /** Returns true if file is allowed; otherwise false + reason for toast. */
    check: (size: number) => {
      if (size <= limit) return { ok: true as const };
      return {
        ok: false as const,
        reason: `${formatBytes(size)} exceeds your ${formatBytes(limit)} per-file limit on ${TIER_LABELS[tier] ?? "your plan"}.`,
      };
    },
  };
}
