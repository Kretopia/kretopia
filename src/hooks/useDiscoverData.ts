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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailySwipesLeft, setDailySwipesLeft] = useState<number>(20);

  const fetchOpportunities = useCallback(
    async (filters: OpportunityFilters) => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        console.log("[useDiscoverData] Starting fetch...");
        
        // Add 5-second timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 5000)
        );
        
        const fetchPromise = supabase
          .from("opportunities")
          .select("id, title, type, location, compensation, tags, description, image_url, created_by, created_at")
          .eq("status", "active")
          .neq("created_by", userId)
          .order("created_at", { ascending: false })
          .limit(20);

        const { data: opportunities, error: oppsError } = await Promise.race([
          fetchPromise,
          timeoutPromise
        ]) as any;

        if (oppsError) {
          console.error("[useDiscoverData] Query error:", oppsError);
          throw oppsError;
        }

        console.log("[useDiscoverData] Fetched opportunities:", opportunities?.length || 0);

        // Simple client-side filtering
        let filtered = opportunities || [];
        
        if (filters.type !== "all") {
          filtered = filtered.filter(o => o.type === filters.type);
        }
        
        if (filters.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(o => 
            o.title.toLowerCase().includes(search) ||
            o.description.toLowerCase().includes(search)
          );
        }

        // Transform to cards
        const cards: OpportunityCard[] = filtered.map((opp) => ({
          id: opp.id,
          name: opp.title,
          title: opp.type.charAt(0).toUpperCase() + opp.type.slice(1),
          location: opp.location || "Remote",
          image: opp.image_url || `https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=500&fit=crop`,
          tags: opp.tags || [],
          compensation: opp.compensation,
          description: opp.description,
          created_by: opp.created_by,
          created_at: opp.created_at,
        }));

        console.log("[useDiscoverData] Transformed cards:", cards.length);
        setOpportunities(cards);
        setDailySwipesLeft(999); // Simplified for beta
      } catch (error: any) {
        console.error("[useDiscoverData] Error:", error);
        setError(error.message || "Failed to load opportunities");
        // Don't show toast on timeout
        if (!error.message?.includes('timeout')) {
          toast.error("Failed to load opportunities");
        }
        setOpportunities([]);
      } finally {
        setLoading(false);
      }
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
