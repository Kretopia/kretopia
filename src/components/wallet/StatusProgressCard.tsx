import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, CheckCircle2, Star, Crown, Gem, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { calculateStatus, type StatusResult } from "@/lib/statusEngine";

const TIER_ICONS: Record<string, any> = {
  hobbyist: Shield,
  freelancer: Zap,
  thriver: CheckCircle2,
  professional: Star,
  celebrity: Crown,
  icon: Gem,
};

const TIER_DESCRIPTIONS: Record<string, string> = {
  hobbyist: "Start adding and verifying your credits to build your reputation.",
  freelancer: "You're getting noticed. Keep verifying work to level up.",
  thriver: "You're building real credibility. Industry eyes are on you.",
  professional: "A recognized professional with a strong verified track record.",
  celebrity: "Top-tier creator. Your reputation precedes you.",
  icon: "Legendary status. Your work defines the industry.",
};

export function StatusProgressCard() {
  const { user } = useAuth();
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [creditCount, setCreditCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data } = await supabase
        .from("credits")
        .select("verification_status")
        .eq("user_id", user.id);
      if (data) {
        setStatus(calculateStatus(data));
        setCreditCount(data.length);
      }
    };
    fetchData();
  }, [user]);

  if (!status) return null;

  const TierIcon = TIER_ICONS[status.tier] || Shield;
  const progress = status.pointsToNext
    ? Math.min(100, ((status.points) / (status.points + status.pointsToNext)) * 100)
    : 100;

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
        <CardContent className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center bg-primary/10 ${status.color}`}>
              <TierIcon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Your Status</p>
              <h3 className={`text-2xl font-bold ${status.color}`}>{status.label}</h3>
              <p className="text-xs text-muted-foreground">{status.points} status points · {creditCount} credits</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">{TIER_DESCRIPTIONS[status.tier]}</p>

          {status.nextTier && status.pointsToNext !== undefined && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Progress to {status.nextTier.charAt(0).toUpperCase() + status.nextTier.slice(1)}</span>
                <span className="text-foreground font-medium">{status.pointsToNext} pts needed</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {!status.nextTier && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
              Maximum tier reached
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* How to earn points */}
      <Card>
        <CardContent className="p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">How Status Points Work</h4>
          <div className="space-y-2.5">
            {[
              { label: "Enterprise Verified", desc: "Verified by a company/brand", pts: 100, color: "text-green-500" },
              { label: "Peer Verified", desc: "Vouched by a collaborator", pts: 25, color: "text-purple-500" },
              { label: "AI / Identity Verified", desc: "Verified via platform checks", pts: 5, color: "text-blue-500" },
              { label: "Self-Claimed", desc: "Added manually, unverified", pts: 1, color: "text-muted-foreground" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5">
                <div>
                  <p className={`text-xs font-medium ${item.color}`}>{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">+{item.pts} pts</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tier Roadmap */}
      <Card>
        <CardContent className="p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">Status Roadmap</h4>
          <div className="space-y-2">
            {[
              { tier: "Hobbyist", min: 0, color: "text-muted-foreground" },
              { tier: "Freelancer", min: 10, color: "text-[hsl(0,0%,70%)]" },
              { tier: "Thriver", min: 50, color: "text-primary" },
              { tier: "Professional", min: 150, color: "text-accent" },
              { tier: "Celebrity", min: 500, color: "text-foreground" },
              { tier: "Icon", min: 1000, color: "text-primary" },
            ].map((t) => (
              <div key={t.tier} className={`flex items-center justify-between py-1.5 ${status.points >= t.min ? 'opacity-100' : 'opacity-40'}`}>
                <span className={`text-xs font-medium ${t.color}`}>{t.tier}</span>
                <span className="text-[10px] text-muted-foreground">{t.min}+ pts</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
