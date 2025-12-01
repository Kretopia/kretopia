import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRemainingSwipes, type SubscriptionTier } from "@/lib/subscriptionLimits";
import { toast } from "sonner";

export interface OpportunityCard {
  id: string;
  name: string;
  title: string;
  location: string;
  image: string;
  tags: string[];
  compensation?: string;
  description: string;
  created_by?: string;
  created_at?: string;
}

export interface OpportunityFilters {
  search: string;
  type: string;
  location: string;
  compensation: string;
  remote: boolean;
  skills: string[];
  urgent: boolean;
  sortBy: string;
}

export const useDiscoverData = (
  userId: string | undefined,
  subscriptionTier: SubscriptionTier
) => {
  const [opportunities, setOpportunities] = useState<OpportunityCard[]>([]);
  const [loading, setLoading] = useState(false); // Disabled - no auto-fetch
  const [error, setError] = useState<string | null>(null);
  const [dailySwipesLeft, setDailySwipesLeft] = useState<number>(20);

  const fetchOpportunities = useCallback(
    async (filters: OpportunityFilters) => {
      // DISABLED: Discover is hidden in MVP
      setLoading(false);
      return;
    },
    [userId, subscriptionTier]
  );

  const updateSwipeCount = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("daily_swipes")
        .eq("user_id", userId)
        .single();

      if (currentProfile) {
        await supabase
          .from("profiles")
          .update({ daily_swipes: (currentProfile.daily_swipes || 0) + 1 })
          .eq("user_id", userId);

        setDailySwipesLeft((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("[useDiscoverData] Error updating swipe count:", error);
    }
  }, [userId]);

  // DISABLED: Auto-fetch removed for MVP
  // useEffect(() => {
  //   fetchOpportunities();
  // }, []);

  return {
    opportunities,
    loading,
    error,
    dailySwipesLeft,
    setDailySwipesLeft,
    fetchOpportunities,
    updateSwipeCount,
  };
};
