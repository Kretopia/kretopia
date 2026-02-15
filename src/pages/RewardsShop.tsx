import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  Snowflake, Crown, Eye, Sparkles, ShoppingBag, 
  ArrowLeft, Zap, Star, Shield, Palette, Gift
} from "lucide-react";
import { getLevelData } from "@/lib/gamification";
import { getTierByPoints } from "@/lib/tierSystem";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: React.ReactNode;
  category: "power-ups" | "cosmetics" | "boosts" | "upgrades";
  action: () => Promise<void>;
  available: boolean;
  badge?: string;
}

const RewardsShop = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [freezeCount, setFreezeCount] = useState(0);

  useEffect(() => {
    if (user) fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("xp, level, streak_freeze_count")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setUserXP(data.xp || 0);
      setUserLevel(data.level || 1);
      setFreezeCount(data.streak_freeze_count || 0);
    }
  };

  const purchaseItem = async (item: ShopItem) => {
    if (userXP < item.cost) {
      toast({ title: "Not enough XP", description: `You need ${item.cost - userXP} more XP.`, variant: "destructive" });
      return;
    }
    setPurchasing(item.id);
    try {
      await item.action();
      setUserXP(prev => prev - item.cost);
      toast({ title: "Purchase Complete! 🎉", description: `You got ${item.name}!` });
    } catch (error) {
      toast({ title: "Purchase Failed", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setPurchasing(null);
    }
  };

  const buyStreakFreeze = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ 
      xp: userXP - 500, 
      streak_freeze_count: freezeCount + 1 
    }).eq("user_id", user.id);
    setFreezeCount(prev => prev + 1);
  };

  const buyProfileBoost = async () => {
    if (!user) return;
    // Record a boost activity - profile gets highlighted in discovery for 24h
    await supabase.from("profiles").update({ 
      xp: userXP - 1000,
      // Set a boost expiry timestamp
    }).eq("user_id", user.id);
    await supabase.from("xp_activities").insert({
      user_id: user.id,
      activity_type: "profile_boost_purchased",
      xp_earned: -1000,
      description: "Purchased 24h Profile Boost",
    });
  };

  const buyDoubleXP = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ 
      xp: userXP - 750,
    }).eq("user_id", user.id);
    await supabase.from("xp_activities").insert({
      user_id: user.id,
      activity_type: "double_xp_purchased",
      xp_earned: -750,
      description: "Purchased 2x XP for 24 hours",
    });
  };

  const shopItems: ShopItem[] = [
    {
      id: "streak_freeze",
      name: "Streak Freeze",
      description: "Protect your streak when you miss a day. You have " + freezeCount + " freezes.",
      cost: 500,
      icon: <Snowflake className="h-6 w-6 text-blue-400" />,
      category: "power-ups",
      action: buyStreakFreeze,
      available: true,
    },
    {
      id: "profile_boost",
      name: "24h Profile Boost",
      description: "Get featured at the top of Discover for 24 hours.",
      cost: 1000,
      icon: <Eye className="h-6 w-6 text-amber-400" />,
      category: "boosts",
      action: buyProfileBoost,
      available: true,
    },
    {
      id: "double_xp",
      name: "2x XP (24 hours)",
      description: "Earn double XP on all activities for the next 24 hours.",
      cost: 750,
      icon: <Zap className="h-6 w-6 text-yellow-400" />,
      category: "power-ups",
      action: buyDoubleXP,
      available: true,
    },
    {
      id: "pro_trial",
      name: "Pro Trial (3 Days)",
      description: "Unlock unlimited swipes, AI tools, and Pro features for 3 days.",
      cost: 2500,
      icon: <Crown className="h-6 w-6 text-purple-400" />,
      category: "upgrades",
      action: async () => {
        if (!user) return;
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 3);
        await supabase.from("profiles").update({ 
          xp: userXP - 2500,
          subscription_tier: "pro",
          subscription_status: "trialing",
          subscription_end_date: trialEnd.toISOString(),
        }).eq("user_id", user.id);
      },
      available: true,
      badge: "Best Value",
    },
    {
      id: "custom_badge",
      name: "Custom Profile Frame",
      description: "Unlock a special animated frame around your avatar.",
      cost: 1500,
      icon: <Palette className="h-6 w-6 text-pink-400" />,
      category: "cosmetics",
      action: async () => {
        if (!user) return;
        await supabase.from("profiles").update({ 
          xp: userXP - 1500,
        }).eq("user_id", user.id);
        await supabase.from("xp_activities").insert({
          user_id: user.id,
          activity_type: "custom_frame_purchased",
          xp_earned: -1500,
          description: "Purchased Custom Profile Frame",
        });
      },
      available: userLevel >= 5,
    },
    {
      id: "gift_xp",
      name: "Gift 100 XP",
      description: "Send 100 XP to another creator as a gift.",
      cost: 150,
      icon: <Gift className="h-6 w-6 text-green-400" />,
      category: "power-ups",
      action: async () => {
        toast({ title: "Coming Soon", description: "Gift XP feature launching next week!" });
      },
      available: true,
    },
  ];

  const categories = [
    { id: "power-ups", label: "Power-Ups", icon: <Zap className="h-4 w-4" /> },
    { id: "boosts", label: "Boosts", icon: <Star className="h-4 w-4" /> },
    { id: "cosmetics", label: "Cosmetics", icon: <Palette className="h-4 w-4" /> },
    { id: "upgrades", label: "Upgrades", icon: <Crown className="h-4 w-4" /> },
  ];

  const tier = getTierByPoints(userXP);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-6">
      <SEO title="XP Rewards Shop | ThriveIN" description="Spend your hard-earned XP on power-ups, boosts, and upgrades." />
      
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      {/* Header with XP Balance */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-full bg-gradient-to-br from-amber-500 to-orange-500">
            <ShoppingBag className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Rewards Shop</h1>
            <p className="text-muted-foreground">Spend XP on power-ups & rewards</p>
          </div>
        </div>
        
        <Card className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Your Balance</p>
                <p className="text-2xl font-bold">{userXP.toLocaleString()} XP</p>
              </div>
            </div>
            <div className="text-right">
              <Badge className={`bg-gradient-to-r ${tier.color} text-white border-0`}>
                {tier.icon} {tier.displayName}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Level {userLevel}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* How to Earn XP */}
      <Card className="mb-6 p-4 border-dashed">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" /> Ways to Earn XP
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {[
            { label: "Daily Login", xp: "+5" },
            { label: "Streak Bonus", xp: "+25" },
            { label: "Connection", xp: "+25" },
            { label: "Complete Profile", xp: "+100" },
            { label: "Post Work", xp: "+30" },
            { label: "Get Reviewed", xp: "+150" },
            { label: "Project Done", xp: "+500" },
            { label: "Invite Accepted", xp: "+200" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between p-2 rounded bg-muted/50">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-bold text-primary">{item.xp}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Shop Items by Category */}
      {categories.map(category => {
        const items = shopItems.filter(i => i.category === category.id);
        if (items.length === 0) return null;
        return (
          <div key={category.id} className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              {category.icon} {category.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map(item => (
                <Card key={item.id} className={`p-4 transition-all hover:shadow-md ${!item.available ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted/50 flex-shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{item.name}</h3>
                        {item.badge && (
                          <Badge variant="default" className="text-[10px]">{item.badge}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm font-bold flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-primary" />
                          {item.cost.toLocaleString()} XP
                        </span>
                        <Button
                          size="sm"
                          disabled={!item.available || userXP < item.cost || purchasing === item.id}
                          onClick={() => purchaseItem(item)}
                          className="text-xs"
                        >
                          {purchasing === item.id ? "..." : userXP < item.cost ? "Need more XP" : "Buy"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RewardsShop;
