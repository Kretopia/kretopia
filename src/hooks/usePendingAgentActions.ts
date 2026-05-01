import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { OrchAction } from "@/lib/agentOrchestrator";

/**
 * Subscribes to the current user's pending Level-2 agent actions.
 * Auto-refreshes via realtime on orch_actions inserts/updates.
 */
export function usePendingAgentActions() {
  const { user } = useAuth();
  const [actions, setActions] = useState<OrchAction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    if (!user) {
      setActions([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("orch_actions" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "proposed")
      .order("proposed_at", { ascending: false })
      .limit(20)
      .then((r) => r)
      .catch(() => ({ data: [] as any[] }));
    setActions((data as unknown as OrchAction[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPending();
    if (!user) return;
    const channel = supabase
      .channel(`orch_actions_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orch_actions", filter: `user_id=eq.${user.id}` },
        () => fetchPending(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPending]);

  const remove = useCallback((id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { actions, loading, refresh: fetchPending, remove };
}
