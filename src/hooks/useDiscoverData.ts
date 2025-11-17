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
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 8000)
        );

        const fetchPromise = (async () => {
          // Fetch user profile and swipes in parallel
          const [profileResult, swipesResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("daily_swipes")
              .eq("user_id", userId)
              .maybeSingle(),
            supabase
              .from("swipes")
              .select("target_id")
              .eq("user_id", userId)
              .eq("target_type", "opportunity"),
          ]);

          // Update swipes left
          const userProfile = profileResult.data;
          if (userProfile) {
            const remaining = getRemainingSwipes(
              subscriptionTier,
              userProfile.daily_swipes || 0
            );
            setDailySwipesLeft(remaining === -1 ? 999 : remaining);
          }

          const swipedIds = new Set(
            swipesResult.data?.map((s) => s.target_id) || []
          );

          // Build optimized query
          let query = supabase
            .from("opportunities")
            .select(
              "id, title, type, location, compensation, tags, description, image_url, created_by, created_at, skills"
            )
            .eq("status", "active")
            .neq("created_by", userId)
            .limit(20);

          // Apply filters
          if (filters.type !== "all") {
            query = query.eq("type", filters.type);
          }

          if (filters.location !== "all") {
            if (filters.location === "remote") {
              query = query.or("location.ilike.%remote%,location.is.null");
            } else {
              query = query.ilike("location", `%${filters.location}%`);
            }
          }

          if (filters.remote) {
            query = query.or("location.ilike.%remote%,location.is.null");
          }

          if (filters.compensation !== "all") {
            query = query.ilike("compensation", `%${filters.compensation}%`);
          }

          const { data: opps, error: oppsError } = await query;

          if (oppsError) throw oppsError;

          // Filter out swiped opportunities and apply client-side filters
          let filteredOpps = (opps || []).filter(
            (opp) => !swipedIds.has(opp.id)
          );

          // Search filter
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filteredOpps = filteredOpps.filter(
              (opp) =>
                opp.title.toLowerCase().includes(searchLower) ||
                opp.description.toLowerCase().includes(searchLower) ||
                opp.tags?.some((tag: string) =>
                  tag.toLowerCase().includes(searchLower)
                )
            );
          }

          // Skills filter
          if (filters.skills.length > 0) {
            filteredOpps = filteredOpps.filter((opp) =>
              filters.skills.some((skill) =>
                opp.skills?.some((oppSkill: string) =>
                  oppSkill.toLowerCase().includes(skill.toLowerCase())
                )
              )
            );
          }

          // Urgent filter
          if (filters.urgent) {
            filteredOpps = filteredOpps.filter((opp) =>
              opp.tags?.some((tag: string) =>
                tag.toLowerCase().includes("urgent")
              )
            );
          }

          // Sort
          if (filters.sortBy === "compensation") {
            filteredOpps.sort((a, b) => {
              const aComp = parseInt(a.compensation?.replace(/\D/g, "") || "0");
              const bComp = parseInt(b.compensation?.replace(/\D/g, "") || "0");
              return bComp - aComp;
            });
          }

          // Transform to cards
          const cards: OpportunityCard[] = filteredOpps.map((opp) => ({
            id: opp.id,
            name: opp.title,
            title: opp.type.charAt(0).toUpperCase() + opp.type.slice(1),
            location: opp.location || "Remote",
            image:
              opp.image_url ||
              `https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=500&fit=crop`,
            tags: opp.tags || [],
            compensation: opp.compensation,
            description: opp.description,
            created_by: opp.created_by,
            created_at: opp.created_at,
          }));

          setOpportunities(cards);
        })();

        await Promise.race([fetchPromise, timeoutPromise]);
      } catch (error: any) {
        console.error("[useDiscoverData] Error:", error);
        if (error.message === "Request timeout") {
          setError("Loading took too long. Please try again.");
          toast.error("Loading timeout - Please try again");
        } else {
          setError("Failed to load opportunities");
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
