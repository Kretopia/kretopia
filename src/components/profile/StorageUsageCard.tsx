import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { HardDrive, ArrowUpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
};

const TIER_LABELS: Record<string, string> = {
  free: "Spark (Free)",
  pro: "Creator",
  creator_pro: "Creator+",
  founder: "Founder Circle",
  brand_pro: "Brand Pro",
  brand_enterprise: "Brand Enterprise",
};

export function StorageUsageCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(0);
  const [tier, setTier] = useState<string>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("storage_used_bytes, storage_limit_bytes, subscription_tier")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setUsed(data.storage_used_bytes || 0);
        setLimit(data.storage_limit_bytes || 2 * 1024 ** 3);
        setTier(data.subscription_tier || "free");
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading || !user) return null;

  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const isNearLimit = pct >= 80;
  const canUpgrade = tier === "free" || tier === "pro";

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Storage</h3>
          </div>
          <span className="text-xs text-muted-foreground">{TIER_LABELS[tier] || tier}</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className={isNearLimit ? "text-destructive font-medium" : "text-muted-foreground"}>
              {formatBytes(used)} used
            </span>
            <span className="text-muted-foreground">{formatBytes(limit)} total</span>
          </div>
          <Progress value={pct} className={isNearLimit ? "[&>div]:bg-destructive" : ""} />
          <p className="text-[11px] text-muted-foreground">
            {pct.toFixed(0)}% of your storage is in use. Files include uploads to projects, EPK media, and assets.
          </p>
        </div>

        {isNearLimit && canUpgrade && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
            <p className="text-xs font-medium">Running out of space?</p>
            <p className="text-[11px] text-muted-foreground">
              Upgrade to {tier === "free" ? "Creator (25 GB)" : "Creator+ (100 GB)"} for more room.
            </p>
            <Button
              size="sm"
              variant="default"
              className="w-full h-8 text-xs"
              onClick={() => navigate("/pricing")}
            >
              <ArrowUpCircle className="h-3.5 w-3.5 mr-1.5" />
              Upgrade plan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
