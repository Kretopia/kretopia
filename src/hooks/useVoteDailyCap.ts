import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const MAX_DAILY_VOTES = 10;

export const useVoteDailyCap = (userId: string | undefined) => {
  const [votesToday, setVotesToday] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchVotesToday = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from("challenge_votes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", today.toISOString());

      if (error) throw error;
      setVotesToday(count || 0);
    } catch (err) {
      console.error("Error fetching daily votes:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchVotesToday();
  }, [fetchVotesToday]);

  const canVote = votesToday < MAX_DAILY_VOTES;
  const votesRemaining = Math.max(0, MAX_DAILY_VOTES - votesToday);

  const recordVote = () => {
    setVotesToday((prev) => prev + 1);
  };

  const removeVote = () => {
    setVotesToday((prev) => Math.max(0, prev - 1));
  };

  return {
    votesToday,
    canVote,
    votesRemaining,
    maxDailyVotes: MAX_DAILY_VOTES,
    recordVote,
    removeVote,
    loading,
    refresh: fetchVotesToday,
  };
};
