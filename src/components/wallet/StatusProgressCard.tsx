import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, CheckCircle2, Star, Crown, Gem, Zap, ArrowRight, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { calculateStatus, type StatusResult, type StatusTier } from "@/lib/statusEngine";

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

interface CreditStats {
  total: number;
  verified: number;
  manual: number;
  peer: number;
  enterprise: number;
}

function getLevelUpNudges(status: StatusResult, stats: CreditStats): { text: string; impact: string }[] {
  const nudges: { text: string; impact: string }[] = [];

  if (stats.manual > 0) {
    const pts = stats.manual * 4; // manual=1pt → verified=5pts, gain 4 each
    nudges.push({
      text: `Verify ${stats.manual} self-claimed credit${stats.manual > 1 ? 's' : ''} with AI`,
      impact: `+${pts} pts`,
    });
  }

  if (stats.peer === 0) {
    nudges.push({
      text: "Ask a collaborator to vouch for a credit",
      impact: "+25 pts",
    });
  } else if (stats.peer < 3) {
    nudges.push({
      text: `Get ${3 - stats.peer} more peer endorsement${3 - stats.peer > 1 ? 's' : ''}`,
      impact: `+${(3 - stats.peer) * 25} pts`,
    });
  }

  if (stats.enterprise === 0) {
    nudges.push({
      text: "Get a brand or company to verify a credit",
      impact: "+100 pts",
    });
  }

  if (stats.total < 10) {
    nudges.push({
      text: `Add ${10 - stats.total} more credits to your portfolio`,
      impact: `+${(10 - stats.total)} pts min`,
    });
  }

  // Return top 3 most impactful
  return nudges.slice(0, 3);
}

export function StatusProgressCard() {
  const { user } = useAuth();
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [creditStats, setCreditStats] = useState<CreditStats>({ total: 0, verified: 0, manual: 0, peer: 0, enterprise: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data } = await supabase
        .from("credits")
        .select("verification_status")
        .eq("user_id", user.id);
      if (data) {
        setStatus(calculateStatus(data));
        const stats: CreditStats = { total: data.length, verified: 0, manual: 0, peer: 0, enterprise: 0 };
        data.forEach(c => {
          const s = (c.verification_status || "manual").toLowerCase();
          if (s === "enterprise") stats.enterprise++;
          else if (s === "peer") stats.peer++;
          else if (["verified", "ai", "identity"].includes(s)) stats.verified++;
          else if (s === "manual" || s === "unverified") stats.manual++;
        });
        setCreditStats(stats);
      }
    };
    fetchData();
  }, [user]);

  if (!status) return null;

  const TierIcon = TIER_ICONS[status.tier] || Shield;
  const progress = status.pointsToNext
    ? Math.min(100, ((status.points) / (status.points + status.pointsToNext)) * 100)
    : 100;
  const nudges = getLevelUpNudges(status, creditStats);

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
              <p className="text-xs text-muted-foreground">{status.points} status points · {creditStats.total} credits</p>
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

      {/* Level Up Nudges */}
      {nudges.length > 0 && status.nextTier && (
        <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-accent" />
              <h4 className="text-sm font-semibold text-foreground">Level Up Faster</h4>
            </div>
            <div className="space-y-2.5">
              {nudges.map((nudge, i) => (
                <div key={i} className="flex items-start gap-2.5 py-1.5">
                  <ArrowRight className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">{nudge.text}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 border-accent/30 text-accent">
                    {nudge.impact}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How to earn points */}
      <Card>
        <CardContent className="p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">How Status Points Work</h4>
          <div className="space-y-2.5">
            {[
              { label: "Enterprise Verified", desc: "Verified by a company/brand", pts: 100, color: "text-green-500" },
              { label: "Peer Verified", desc: "Vouched by a collaborator", pts: 25, color: "text-purple-500" },
              { label: "AI / Identity Verified", desc: "Verified via platform checks", pts: 5, color: "text-blue-500" },
              { label: "Imported", desc: "External source (IMDb, Spotify)", pts: 2, color: "text-orange-500" },
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
