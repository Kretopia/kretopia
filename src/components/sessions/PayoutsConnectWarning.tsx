import { useEffect, useState } from "react";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Inline warning shown to event hosts when they enable paid ticketing
 * without having connected payouts (Stripe Connect). Without this, buyers
 * will hit a "Host has not connected payouts" error at checkout.
 */
export const PayoutsConnectWarning = ({ visible }: { visible: boolean }) => {
  const [needsConnect, setNeedsConnect] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await (supabase
        .from("profiles")
        .select("stripe_account_id, stripe_account_status")
        .eq("user_id", user.id)
        .maybeSingle() as unknown as Promise<any>)
        .catch(() => ({ data: null }));
      const data = res?.data;
      if (cancelled) return;
      const ok = !!data?.stripe_account_id && data?.stripe_account_status === "active";
      setNeedsConnect(!ok);
    })();
    return () => { cancelled = true; };
  }, [visible]);

  if (!visible || !needsConnect) return null;

  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs flex items-start gap-2">
      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-medium text-foreground">Connect payouts to accept ticket sales</p>
        <p className="text-muted-foreground">
          Buyers can't check out until you connect your payout account.
        </p>
        <Link
          to="/thrivepay"
          target="_blank"
          className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
        >
          Set up payouts <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
};
