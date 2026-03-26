import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Snowflake, Crown, Eye, Sparkles, ShoppingBag,
  ArrowLeft, Zap, Star, Palette, Gift, Search, UserPlus,
  Target, Unlock,
} from "lucide-react";
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

interface SearchedUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
}

const RewardsShop = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [freezeCount, setFreezeCount] = useState(0);

  // Gift XP dialog state
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingGift, setSendingGift] = useState(false);

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

  const deductXP = async (amount: number) => {
    if (!user) return;
    const newXP = userXP - amount;
    await supabase
      .from("profiles")
      .update({ xp: newXP })
      .eq("user_id", user.id);
    setUserXP(newXP);
  };

  const recordActivity = async (type: string, xpCost: number, description: string) => {
    if (!user) return;
    await supabase.from("xp_activities").insert({
      user_id: user.id,
      activity_type: type,
      xp_earned: -xpCost,
      description,
    });
  };

  const purchaseItem = async (item: ShopItem) => {
    if (userXP < item.cost) {
      toast({ title: "Not enough Thrive Points", description: `You need ${item.cost - userXP} more TP.`, variant: "destructive" });
      return;
    }
    // Gift XP opens a dialog instead of purchasing directly
    if (item.id === "gift_xp") {
      setGiftDialogOpen(true);
      return;
    }
    setPurchasing(item.id);
    try {
      await item.action();
      toast({ title: "Purchase Complete! 🎉", description: `You got ${item.name}!` });
      await fetchUserData(); // Refresh from DB
    } catch (error) {
      toast({ title: "Purchase Failed", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setPurchasing(null);
    }
  };

  // --- Shop Item Actions (each deducts XP and records activity) ---

  const buyStreakFreeze = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ xp: userXP - 500, streak_freeze_count: freezeCount + 1 })
      .eq("user_id", user.id);
    await recordActivity("streak_freeze_purchased", 500, "Purchased Streak Freeze");
  };

  const buyProfileBoost = async () => {
    if (!user) return;
    const boostExpiry = new Date();
    boostExpiry.setHours(boostExpiry.getHours() + 24);
    await supabase
      .from("profiles")
      .update({ xp: userXP - 1000, boost_expires_at: boostExpiry.toISOString() })
      .eq("user_id", user.id);
    await recordActivity("profile_boost_purchased", 1000, "Purchased 24h Profile Boost");
  };

  const buyDoubleXP = async () => {
    if (!user) return;
    const doubleExpiry = new Date();
    doubleExpiry.setHours(doubleExpiry.getHours() + 24);
    await supabase
      .from("profiles")
      .update({ xp: userXP - 750, double_xp_expires_at: doubleExpiry.toISOString() })
      .eq("user_id", user.id);
    await recordActivity("double_xp_purchased", 750, "Purchased 2x XP for 24 hours");
  };

  const buyPriorityGig = async () => {
    if (!user) return;
    // User picks which gig to boost — for now boost their most recent active one
    const { data: myGig } = await supabase
      .from("opportunities")
      .select("id")
      .eq("created_by", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!myGig) {
      toast({ title: "No active gig found", description: "Post a gig first, then boost it.", variant: "destructive" });
      throw new Error("No active gig");
    }
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 48);
    await supabase
      .from("opportunities")
      .update({ is_priority: true, priority_expires_at: expiry.toISOString() })
      .eq("id", myGig.id);
    await deductXP(800);
    await recordActivity("priority_gig_purchased", 800, "Purchased 48h Priority Gig boost");
  };

  const buyDiscoveryUnlock = async () => {
    if (!user) return;
    // Store unlock in localStorage (persists across sessions)
    const unlockKey = `thrivein_discovery_unlocked_${user.id}`;
    localStorage.setItem(unlockKey, JSON.stringify({ unlocked: true, timestamp: Date.now() }));
    await deductXP(1500);
    await recordActivity("discovery_unlock_purchased", 1500, "Purchased permanent Discovery unlock");
  };

  const buyProTrial = async () => {
    if (!user) return;
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 3);
    await supabase
      .from("profiles")
      .update({
        xp: userXP - 2500,
        subscription_tier: "pro",
        subscription_status: "trialing",
        subscription_end_date: trialEnd.toISOString(),
      })
      .eq("user_id", user.id);
    await recordActivity("pro_trial_purchased", 2500, "Purchased 3-Day Pro Trial");
  };

  const buyCustomFrame = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ xp: userXP - 1500, profile_frame: "gradient_gold" })
      .eq("user_id", user.id);
    await recordActivity("custom_frame_purchased", 1500, "Purchased Custom Profile Frame (Gold)");
  };

  // --- Gift XP ---

  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2 || !user) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, role")
        .neq("user_id", user.id)
        .ilike("full_name", `%${query}%`)
        .limit(8);
      setSearchResults(data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const sendGiftXP = async (recipient: SearchedUser) => {
    if (!user) return;
    const giftCost = 150;
    const giftAmount = 100;

    if (userXP < giftCost) {
      toast({ title: "Not enough Thrive Points", description: `You need ${giftCost} TP to gift.`, variant: "destructive" });
      return;
    }

    setSendingGift(true);
    try {
      // Deduct from sender
      await supabase
        .from("profiles")
        .update({ xp: userXP - giftCost })
        .eq("user_id", user.id);

      // Add to recipient
      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("xp")
        .eq("user_id", recipient.user_id)
        .single();

      if (recipientProfile) {
        await supabase
          .from("profiles")
          .update({ xp: (recipientProfile.xp || 0) + giftAmount })
          .eq("user_id", recipient.user_id);
      }

      // Record activities for both
      await supabase.from("xp_activities").insert([
        {
          user_id: user.id,
          activity_type: "gift_xp_sent",
          xp_earned: -giftCost,
          description: `Gifted 100 TP to ${recipient.full_name}`,
        },
        {
          user_id: recipient.user_id,
          activity_type: "gift_xp_received",
          xp_earned: giftAmount,
          description: `Received 100 TP gift`,
        },
      ]);

      // Notify recipient
      await supabase.from("notifications").insert({
        user_id: recipient.user_id,
        title: "You received a gift! 🎁",
        message: `Someone gifted you 100 Thrive Points! Keep creating.`,
        type: "reward",
        link: "/rewards",
        category: "reward",
        priority: "normal",
      });

      toast({
        title: "Gift Sent! 🎁",
        description: `You sent 100 Thrive Points to ${recipient.full_name}`,
      });
      setGiftDialogOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      await fetchUserData();
    } catch (error) {
      toast({ title: "Gift Failed", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setSendingGift(false);
    }
  };

  // --- Shop Items ---

  const shopItems: ShopItem[] = [
    {
      id: "streak_freeze",
      name: "Streak Freeze",
      description: `Protect your streak when you miss a day. You have ${freezeCount} freezes.`,
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
      id: "priority_gig",
      name: "Priority Gig (48h)",
      description: "Pin your most recent gig to the top of the Gigs feed for 48 hours.",
      cost: 800,
      icon: <Target className="h-6 w-6 text-cyan-400" />,
      category: "boosts",
      action: buyPriorityGig,
      available: true,
    },
    {
      id: "discovery_unlock",
      name: "Unlock Full Discovery",
      description: "Permanently unlock all creators and gigs in the discovery feed.",
      cost: 1500,
      icon: <Unlock className="h-6 w-6 text-emerald-400" />,
      category: "upgrades",
      action: buyDiscoveryUnlock,
      available: true,
      badge: "Permanent",
    },
    {
      id: "double_xp",
      name: "2x Points (24 hours)",
      description: "Earn double Thrive Points on all activities for the next 24 hours.",
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
      action: buyProTrial,
      available: true,
      badge: "Best Value",
    },
    {
      id: "custom_badge",
      name: "Custom Profile Frame",
      description: "A glowing gold animated ring around your avatar — auto-equipped on your profile instantly. Visible to everyone who views your profile.",
      cost: 1500,
      icon: <Palette className="h-6 w-6 text-pink-400" />,
      category: "cosmetics",
      action: buyCustomFrame,
      available: userLevel >= 5,
      badge: "Level 5+",
    },
    {
      id: "gift_xp",
      name: "Gift 100 TP",
      description: "Send 100 Thrive Points to another creator as a gift. Costs 150 TP.",
      cost: 150,
      icon: <Gift className="h-6 w-6 text-green-400" />,
      category: "power-ups",
      action: async () => {}, // handled by dialog
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
      <SEO title="Thrive Points Shop | ThriveIN" description="Spend your hard-earned Thrive Points on power-ups, boosts, and upgrades." />

      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      {/* Header with Points Balance */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-full bg-gradient-to-br from-amber-500 to-orange-500">
            <ShoppingBag className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Rewards Shop</h1>
            <p className="text-muted-foreground">Spend Thrive Points on power-ups & rewards</p>
          </div>
        </div>

        <Card className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Your Balance</p>
                <p className="text-2xl font-bold">{userXP.toLocaleString()} TP</p>
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

      {/* How to Earn Points */}
      <Card className="mb-6 p-4 border-dashed">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" /> Ways to Earn Points
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
                          {item.cost.toLocaleString()} TP
                        </span>
                        <Button
                          size="sm"
                          disabled={!item.available || userXP < item.cost || purchasing === item.id}
                          onClick={() => purchaseItem(item)}
                          className="text-xs"
                        >
                          {purchasing === item.id ? "..." : userXP < item.cost ? "Need more TP" : item.id === "gift_xp" ? "Send Gift" : "Buy"}
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

      {/* Gift Thrive Points Dialog */}
      <Dialog open={giftDialogOpen} onOpenChange={setGiftDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-500" />
              Gift 100 Thrive Points
            </DialogTitle>
            <DialogDescription>
              Search for a creator to send 100 TP to (costs you 150 TP)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {searching && (
                <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
              )}
              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No creators found</p>
              )}
              {searchResults.map((person) => (
                <div
                  key={person.user_id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={person.avatar_url || undefined} />
                      <AvatarFallback>{person.full_name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{person.full_name}</p>
                      {person.role && (
                        <p className="text-xs text-muted-foreground">{person.role}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={sendingGift}
                    onClick={() => sendGiftXP(person)}
                    className="gap-1"
                  >
                    <Gift className="h-3.5 w-3.5" />
                    {sendingGift ? "Sending..." : "Send"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RewardsShop;
