import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PendingDiscoveriesDialog } from "./PendingDiscoveriesDialog";
import { formatDistanceToNow } from "date-fns";

interface Props {
  /** Optional: provided by parent if already loaded */
  lastScanAt?: string | null;
}

/**
 * "Find new credits, press & awards" — incremental discovery CTA for the
 * profile owner. Triggers refresh-my-universe and opens the review inbox.
 */
export const RefreshUniverseButton = ({ lastScanAt }: Props) => {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [lastAt, setLastAt] = useState<string | null>(lastScanAt ?? null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("pending_discoveries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending");
      if (!cancelled) setPendingCount(count ?? 0);

      if (!lastScanAt) {
        const { data } = await supabase
          .from("profiles")
          .select("last_universe_scan_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) setLastAt((data as any)?.last_universe_scan_at ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, [user, lastScanAt]);

  // Deep-link: open the review inbox when arriving from an email/push notification
  useEffect(() => {
    if (!user) return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("openPendingDiscoveries") === "1") {
        setOpen(true);
        url.searchParams.delete("openPendingDiscoveries");
        window.history.replaceState({}, "", url.toString());
      }
    } catch {}
  }, [user]);

  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("refresh-my-universe", {
        body: { trigger_source: "manual" },
      });
      if (error) throw error;

      const totalNew = data?.total_new ?? 0;
      setLastAt(new Date().toISOString());

      if (totalNew > 0) {
        const { count } = await supabase
          .from("pending_discoveries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("status", "pending");
        setPendingCount(count ?? 0);
        toast.success(`Found ${totalNew} new ${totalNew === 1 ? "item" : "items"}`, {
          description: "Open the inbox to review and add them to your profile.",
          action: { label: "Review", onClick: () => setOpen(true) },
        });
        setOpen(true);
      } else {
        toast.success("You're all caught up ✨", {
          description: "We'll keep checking weekly in the background.",
        });
      }
    } catch (e: any) {
      toast.error(e?.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <Button
          variant="default"
          size="sm"
          className="h-8 w-full text-xs gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground"
          onClick={pendingCount > 0 ? () => setOpen(true) : runScan}
          disabled={scanning}
        >
          {scanning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {scanning
            ? "Scanning your universe…"
            : pendingCount > 0
              ? `Review ${pendingCount} new ${pendingCount === 1 ? "find" : "finds"}`
              : "Find new credits, press & awards"}
        </Button>
        {lastAt && !scanning && (
          <p className="text-[10px] text-muted-foreground text-center">
            Last checked {formatDistanceToNow(new Date(lastAt), { addSuffix: true })}
          </p>
        )}
      </div>

      <PendingDiscoveriesDialog
        open={open}
        onOpenChange={setOpen}
        onChanged={async () => {
          if (!user) return;
          const { count } = await supabase
            .from("pending_discoveries")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "pending");
          setPendingCount(count ?? 0);
        }}
        onRescan={runScan}
        scanning={scanning}
      />
    </>
  );
};
