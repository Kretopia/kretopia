import { useEffect, useState, useCallback } from "react";
import { Loader2, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GigRailCard } from "@/components/opportunity/GigRailCard";
import type { GigOpportunity } from "@/components/opportunity/GigCard";

export const CastingCallsRail = ({ limit = 12 }: { limit?: number }) => {
  const [calls, setCalls] = useState<GigOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalls = useCallback(async () => {
    const { data } = await supabase
      .from("opportunities")
      .select("*")
      .eq("type", "casting")
      .in("status", ["active", "open"])
      .order("created_at", { ascending: false })
      .limit(limit);
    setCalls((data || []) as unknown as GigOpportunity[]);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetchCalls().catch(() => setLoading(false));
    const channel = supabase
      .channel("casting-calls-rail")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, () => {
        fetchCalls().catch(() => {});
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [fetchCalls]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking the boards…
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-5 text-center space-y-1">
        <Camera className="h-5 w-5 mx-auto text-muted-foreground/60 mb-1" />
        <p className="text-sm font-semibold">No open casting calls right now</p>
        <p className="text-xs text-muted-foreground">Check back soon, or post one for your own project.</p>
      </div>
    );
  }

  return (
    <div className="-mx-4 px-4 flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
      {calls.map((c) => (
        <div key={c.id} className="w-64 shrink-0">
          <GigRailCard opportunity={c} />
        </div>
      ))}
    </div>
  );
};

export default CastingCallsRail;
