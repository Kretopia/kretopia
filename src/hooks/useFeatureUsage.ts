import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  type FreeTierFeature, 
  FREE_TIER_MONTHLY_CAPS, 
  getMonthlyCapForFeature 
} from "@/lib/subscriptionLimits";
import { hasProAccess } from "@/lib/subscriptionConfig";

/**
 * Hook to track monthly usage of a gated feature.
 * Uses localStorage for lightweight tracking (no extra DB table needed).
 * Resets at start of each calendar month.
 */
export function useFeatureUsage(feature: FreeTierFeature) {
  const { user, subscriptionInfo } = useAuth();
  const tier = (subscriptionInfo.tier || 'free') as 'free' | 'pro' | 'founder';
  const isPro = hasProAccess(tier);
  const [usage, setUsage] = useState(0);

  const storageKey = user ? `thrivein_usage_${user.id}_${feature}` : null;

  const getMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}`;
  };

  // Load usage from localStorage
  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Reset if different month
        if (parsed.month !== getMonthKey()) {
          localStorage.removeItem(storageKey);
          setUsage(0);
        } else {
          setUsage(parsed.count || 0);
        }
      }
    } catch {
      setUsage(0);
    }
  }, [storageKey]);

  const cap = getMonthlyCapForFeature(feature, tier);
  const remaining = isPro ? -1 : Math.max(0, cap - usage);
  const canUse = isPro || usage < cap;

  const increment = useCallback(() => {
    if (!storageKey || isPro) return;
    const newCount = usage + 1;
    setUsage(newCount);
    localStorage.setItem(storageKey, JSON.stringify({
      month: getMonthKey(),
      count: newCount,
    }));
  }, [storageKey, usage, isPro]);

  return {
    usage,
    cap,
    remaining,
    canUse,
    isPro,
    increment,
  };
}
