import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Copy, CheckCircle2, QrCode, Link2, TrendingUp, Users, Zap, ArrowRight, Share2, Gift } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/hooks/useAuth";
import { useReferralNetwork } from "@/hooks/useReferralNetwork";
import { getAllNetworkTiers, getReferralsToNextTier, getProRewardText, getCommissionExplanation, type NetworkTierMeta } from "@/lib/referralEngine";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { SEO } from "@/components/SEO";
import { useNavigate } from "react-router-dom";

const CreativeCircle = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const network = useReferralNetwork();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [personalLink, setPersonalLink] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("invites")
      .select("invite_code")
      .eq("inviter_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          setPersonalLink(`https://www.thrivein.io/join/${data[0].invite_code}`);
        }
      }, () => {});
  }, [user]);

  const copyLink = async () => {
    if (!personalLink) return;
    const msg = `Stop cold DMing strangers for collabs.\n\nThriveIN matches you with verified creatives who actually fit your style — portfolio-first, credits-verified.\n\nI'm already on. Join me:\n${personalLink}`;
    await navigator.clipboard.writeText(msg);
    setCopied(true);
    toast({ title: "Copied!", description: "Your invite link is ready to share" });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareNative = async () => {
    if (!personalLink) return;
    if (navigator.share) {
      await navigator.share({
        title: "Join ThriveIN",
        text: "ThriveIN matches you with verified creatives who fit your style. Join me:",
        url: personalLink,
      });
    } else {
      copyLink();
    }
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  const nextTierInfo = getReferralsToNextTier(network.referralCount);
  const allTiers = getAllNetworkTiers().filter(t => t.tier !== "none");

  const progressPercent = nextTierInfo
    ? Math.min(100, ((network.referralCount - network.tier.minReferrals) / (nextTierInfo.next.minReferrals - network.tier.minReferrals)) * 100)
    : 100;

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6 pb-24">
      <SEO title="Creative Circle | ThriveIN" description="Grow your creative network, unlock rewards, and earn passive income by inviting creatives to ThriveIN." />

      {/* Hero — Current Tier */}
      <div className={cn("rounded-2xl p-6 bg-gradient-to-br border", network.tier.gradient, "border-border/50")}>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-4xl">{network.tier.icon}</div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Creative Circle</h1>
            <p className={cn("text-sm font-semibold", network.tier.color)}>
              {network.tier.label} — {network.tier.tagline}
            </p>
          </div>
          <Badge variant="secondary" className="text-sm font-bold">
            {network.referralCount}
          </Badge>
        </div>

        {/* Progress to next */}
        {nextTierInfo && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {nextTierInfo.remaining} more to {nextTierInfo.next.icon} {nextTierInfo.next.label}
              </span>
              <span>{network.referralCount}/{nextTierInfo.next.minReferrals}</span>
            </div>
            <Progress value={progressPercent} className="h-2.5" />
          </div>
        )}

        {/* Active rewards */}
        {network.tier.tier !== "none" && (
          <div className="flex flex-wrap gap-2 mt-4">
            {network.tier.rewards.freeProMonths !== 0 && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <Gift className="h-3 w-3 mr-1" />
                {getProRewardText(network.tier)}
              </Badge>
            )}
            {network.tier.rewards.feeDiscount > 0 && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                {network.tier.rewards.feeDiscount}% off fees
              </Badge>
            )}
            {network.tier.rewards.commissionRate > 0 && (
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                {network.tier.rewards.commissionRate}% commission
              </Badge>
            )}
            <Badge className="bg-muted text-muted-foreground">
              +{network.tier.rewards.statusBonusPoints} Status pts
            </Badge>
          </div>
        )}
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{network.referralCount}</div>
          <div className="text-xs text-muted-foreground">Direct Invites</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{network.totalNetworkSize}</div>
          <div className="text-xs text-muted-foreground">Your Reach</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{network.longestChain}</div>
          <div className="text-xs text-muted-foreground">Extended Circle</div>
        </Card>
      </div>

      {/* Invite Action */}
      <Card className="overflow-hidden">
        <div className="p-5 space-y-4">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Invite Creatives
          </h2>

          {personalLink ? (
            <>
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
                  <Link2 className="h-3 w-3" /> Your personal invite link
                </p>
                <code className="text-xs font-mono block truncate">{personalLink.replace("https://", "")}</code>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowQR(!showQR)} className="gap-1.5">
                  <QrCode className="h-4 w-4" /> QR
                </Button>
                <Button variant="outline" size="sm" onClick={shareNative} className="gap-1.5">
                  <Share2 className="h-4 w-4" /> Share
                </Button>
                <Button size="sm" onClick={copyLink} className="gap-1.5">
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>

              {showQR && (
                <div className="flex justify-center pt-2">
                  <div className="bg-white p-4 rounded-xl">
                    <QRCodeSVG value={personalLink} size={160} level="H" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Complete your profile to get your invite link</p>
            </div>
          )}
        </div>
      </Card>

      {/* How It Works */}
      <Card className="p-5 border-primary/10 bg-primary/5">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          How Creative Circle Works
        </h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">1</div>
            <div><span className="font-medium text-foreground">Invite creatives</span> using your personal link, QR code, or direct share</div>
          </div>
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">2</div>
            <div><span className="font-medium text-foreground">Level up your tier</span> as more people join through you — unlock free Pro, reduced fees, and status points</div>
          </div>
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">3</div>
            <div><span className="font-medium text-foreground">Earn passive commission</span> from ThriveIN's service fee when your referrals complete paid gigs — they keep 100% of their earnings</div>
          </div>
        </div>
      </Card>

      {/* All Tiers */}
      <div className="space-y-3">
        <h2 className="font-bold text-lg">Tier Rewards</h2>
        <p className="text-sm text-muted-foreground">Each tier unlocks more rewards. Invite creatives to climb the ranks.</p>

        {allTiers.map((tier) => {
          const isActive = tier.tier === network.tier.tier;
          const isUnlocked = network.referralCount >= tier.minReferrals;
          return (
            <Card
              key={tier.tier}
              className={cn(
                "p-4 transition-all",
                isActive && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
                isUnlocked && !isActive && "bg-muted/10",
                !isUnlocked && "opacity-50"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{tier.icon}</span>
                  <div>
                    <span className={cn("font-bold", isActive ? tier.color : "text-foreground")}>{tier.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{tier.minReferrals}+ invites</span>
                  </div>
                  {isActive && <Badge variant="default" className="text-[9px] px-1.5">You</Badge>}
                </div>
                {isUnlocked && !isActive && <Badge variant="secondary" className="text-[9px]">Unlocked</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mb-3 italic">{tier.tagline}</p>
              <div className="flex flex-wrap gap-1.5">
                {tier.perks.map((perk) => (
                  <span key={perk} className="text-[10px] px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground font-medium">
                    {perk}
                  </span>
                ))}
              </div>
            </Card>
          );
        })}

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          Commission is earned from ThriveIN's platform fee — your referrals keep 100% of their earnings. This isn't MLM — it's supporting each other to grow.
        </p>
      </div>
    </div>
  );
};

export default CreativeCircle;
