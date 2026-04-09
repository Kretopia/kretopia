import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, Sparkles, Zap, Crown, Building2, User, Briefcase } from "lucide-react";
import { 
  SUBSCRIPTION_PRODUCTS, BRAND_SUBSCRIPTION_PRODUCTS,
  PRO_FEATURES, FREE_FEATURES, ENTERPRISE_FEATURES, 
  type AccountType, hasProAccess, isBrandTier
} from "@/lib/subscriptionConfig";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FOUNDER_FEATURES = [
  "Exclusive Founder Circle badge",
  "Lifetime Pro access — never pay again",
  "5,000 Bonus XP on activation",
  "Only 10% platform fees (vs 20% free / 15% Pro)",
  "Free & discounted event access",
  "Premium Partner Membership (when launched)",
  "All Enterprise features included forever",
  "Priority support & early feature access",
  "All AI tools & analytics unlocked",
  "Founding member recognition",
];

function getCreatorTiers() {
  return [
    {
      name: "Spark",
      tier: "free",
      price: "$0",
      priceId: null,
      productId: null,
      icon: Zap,
      description: "Perfect for getting started",
      features: FREE_FEATURES.individual,
    },
    {
      name: SUBSCRIPTION_PRODUCTS.pro.name,
      tier: SUBSCRIPTION_PRODUCTS.pro.tier,
      price: `$${SUBSCRIPTION_PRODUCTS.pro.price}`,
      priceId: SUBSCRIPTION_PRODUCTS.pro.priceId,
      productId: SUBSCRIPTION_PRODUCTS.pro.productId,
      icon: Sparkles,
      popular: true,
      description: "For serious creators",
      features: PRO_FEATURES.individual,
    },
    {
      name: SUBSCRIPTION_PRODUCTS.enterprise.name,
      tier: SUBSCRIPTION_PRODUCTS.enterprise.tier,
      price: `$${SUBSCRIPTION_PRODUCTS.enterprise.price}`,
      priceId: SUBSCRIPTION_PRODUCTS.enterprise.priceId,
      productId: SUBSCRIPTION_PRODUCTS.enterprise.productId,
      icon: Building2,
      description: "For power users & agencies",
      features: ENTERPRISE_FEATURES.individual,
    },
  ];
}

function getBrandTiers() {
  return [
    {
      name: "Spark",
      tier: "free",
      price: "$0",
      priceId: null,
      productId: null,
      icon: Zap,
      description: "Get started hiring",
      features: FREE_FEATURES.company,
    },
    {
      name: BRAND_SUBSCRIPTION_PRODUCTS.pro.name,
      tier: BRAND_SUBSCRIPTION_PRODUCTS.pro.tier,
      price: `$${BRAND_SUBSCRIPTION_PRODUCTS.pro.price}`,
      priceId: BRAND_SUBSCRIPTION_PRODUCTS.pro.priceId,
      productId: BRAND_SUBSCRIPTION_PRODUCTS.pro.productId,
      icon: Sparkles,
      popular: true,
      description: "For brands & studios hiring talent",
      features: PRO_FEATURES.company,
    },
    {
      name: BRAND_SUBSCRIPTION_PRODUCTS.enterprise.name,
      tier: BRAND_SUBSCRIPTION_PRODUCTS.enterprise.tier,
      price: `$${BRAND_SUBSCRIPTION_PRODUCTS.enterprise.price}`,
      priceId: BRAND_SUBSCRIPTION_PRODUCTS.enterprise.priceId,
      productId: BRAND_SUBSCRIPTION_PRODUCTS.enterprise.productId,
      icon: Building2,
      description: "For agencies & large teams",
      features: ENTERPRISE_FEATURES.company,
    },
  ];
}

export default function Subscription() {
  const [loading, setLoading] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string>("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("none");
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [viewMode, setViewMode] = useState<"creator" | "brand">("creator");
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [founderSpotsTaken, setFounderSpotsTaken] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkSubscription();
    fetchFounderCount();
  }, []);

  useEffect(() => {
    if (!checkingSubscription) {
      // Set default view based on account type
      if (accountType === "company") setViewMode("brand");
      const trackPaywall = async () => {
        const { analytics } = await import("@/lib/analytics");
        analytics.paywallViewed('subscription_page', currentTier);
      };
      trackPaywall();
    }
  }, [checkingSubscription, currentTier, accountType]);

  const fetchFounderCount = async () => {
    try {
      const { data, error } = await supabase.rpc('get_founder_circle_count');
      if (!error && data !== null) setFounderSpotsTaken(data);
    } catch (e) {
      console.error("Error fetching founder count:", e);
    }
  };

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_product_id, subscription_status, account_type")
        .eq("user_id", session.user.id)
        .single();
      
      if (profile?.subscription_tier) setCurrentTier(profile.subscription_tier);
      if (profile?.subscription_status) setSubscriptionStatus(profile.subscription_status);
      if (profile?.account_type) setAccountType(profile.account_type as AccountType);
    } catch (error: any) {
      console.error("Error checking subscription:", error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleSubscribe = async (priceId: string | null, tier: string) => {
    if (!priceId) {
      toast({ title: "Free Tier", description: "You're already on the free tier" });
      return;
    }

    const { analytics } = await import("@/lib/analytics");
    analytics.checkoutAttempt(tier, priceId);

    try {
      setLoading(priceId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Authentication required", description: "Please sign in to subscribe", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { priceId } });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create checkout session", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleFounderCheckout = async () => {
    try {
      setLoading("founder");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Authentication required", description: "Please sign in first", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-founder-checkout");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to start checkout", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading("portal");
      const { analytics } = await import("@/lib/analytics");
      analytics.customerPortalOpened();
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to open customer portal", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  if (checkingSubscription) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const tiers = viewMode === "brand" ? getBrandTiers() : getCreatorTiers();
  const founderSpotsRemaining = SUBSCRIPTION_PRODUCTS.founder.maxSpots - founderSpotsTaken;
  const isFounder = currentTier === 'founder';
  const hasPaidSub = currentTier !== "free" && (subscriptionStatus === "active" || subscriptionStatus === "trialing") && currentTier !== "founder";

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground mb-4">
          {viewMode === "brand"
            ? "Find, hire & manage top creative talent"
            : "Unlock the full potential of ThriveIN"}
        </p>

        {/* Creator / Brand toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "creator" | "brand")} className="inline-flex">
          <TabsList className="grid grid-cols-2 w-64">
            <TabsTrigger value="creator" className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              Creator
            </TabsTrigger>
            <TabsTrigger value="brand" className="flex items-center gap-1.5">
              <Briefcase className="h-4 w-4" />
              Brand
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-sm text-primary font-medium mt-3">
          Start with a 7-day free trial — no commitment
        </p>
        
        {hasPaidSub && (
          <Button
            onClick={handleManageSubscription}
            variant="outline"
            className="mt-4"
            disabled={loading === "portal"}
          >
            {loading === "portal" ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</>
            ) : (
              "Manage Subscription"
            )}
          </Button>
        )}
      </div>

      {/* Founder Circle Card — only show on Creator view */}
      {viewMode === "creator" && (
        <div className="max-w-2xl mx-auto mb-12">
          <Card className={`relative border-2 overflow-visible ${
            isFounder 
              ? 'border-accent bg-gradient-to-br from-accent/10 via-background to-accent/5' 
              : 'border-accent/50 bg-gradient-to-br from-accent/5 via-background to-accent/3'
          }`}>
            {isFounder && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                ⭕ Your Plan — Lifetime Member
              </Badge>
            )}
            {!isFounder && founderSpotsRemaining > 0 && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground">
                ⭕ Limited Edition — {founderSpotsRemaining} spots left
              </Badge>
            )}

            <CardHeader className="text-center">
              <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg">
                <Crown className="h-7 w-7 text-accent-foreground" />
              </div>
              <CardTitle className="text-2xl">Founder Circle <span className="text-accent">⭕</span></CardTitle>
              <CardDescription>
                Join the founding members. Lifetime Enterprise access with exclusive perks.
              </CardDescription>
              <div className="mt-3">
                <span className="text-4xl font-bold">$499</span>
                <span className="text-muted-foreground ml-2">one-time payment</span>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid sm:grid-cols-2 gap-2">
                {FOUNDER_FEATURES.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {!isFounder && founderSpotsRemaining > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{founderSpotsTaken} claimed</span>
                    <span>{SUBSCRIPTION_PRODUCTS.founder.maxSpots} total</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full gradient-primary transition-all"
                      style={{ width: `${(founderSpotsTaken / SUBSCRIPTION_PRODUCTS.founder.maxSpots) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter>
              {isFounder ? (
                <Button className="w-full" variant="outline" disabled>⭕ Lifetime Member</Button>
              ) : founderSpotsRemaining <= 0 ? (
                <Button className="w-full" variant="outline" disabled>Sold Out</Button>
              ) : (
                <Button
                  className="w-full gradient-primary text-primary-foreground hover:opacity-90"
                  onClick={handleFounderCheckout}
                  disabled={loading === "founder"}
                >
                  {loading === "founder" ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</>
                  ) : (
                    "Claim Your Spot — $499"
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      )}

      {viewMode === "creator" && (
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground">— or choose a monthly plan —</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          const isCurrentTier = tier.tier === currentTier;
          const isLoading = loading === tier.priceId;
          const isBrand = tier.tier.startsWith('brand_');

          return (
            <Card
              key={tier.tier}
              className={`relative ${
                tier.popular
                  ? "border-primary shadow-lg scale-105"
                  : tier.tier === "enterprise" || tier.tier === "brand_enterprise"
                  ? "border-primary/50 shadow-md"
                  : isCurrentTier
                  ? "border-success"
                  : ""
              }`}
            >
              {tier.popular && !isCurrentTier && (
                <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2`}>
                  {isBrand ? "Best for Hiring" : "Most Popular"}
                </Badge>
              )}
              {(tier.tier === "enterprise" || tier.tier === "brand_enterprise") && !isCurrentTier && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  {isBrand ? "Full Suite" : "Power User"}
                </Badge>
              )}
              {isCurrentTier && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-success text-success-foreground">
                  Your Plan
                </Badge>
              )}

              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-8 w-8 ${
                    tier.tier === 'pro' || tier.tier === 'brand_pro' ? 'text-primary' : 
                    tier.tier === 'enterprise' || tier.tier === 'brand_enterprise' ? 'text-primary' : 
                    'text-muted-foreground'
                  }`} />
                  <div className="text-right">
                    <div className="text-3xl font-bold">{tier.price}</div>
                    {tier.tier !== "free" && (
                      <div className="text-sm text-muted-foreground">/month</div>
                    )}
                    {tier.tier !== "free" && !isCurrentTier && (
                      <div className="text-xs text-primary font-medium">7 days free</div>
                    )}
                  </div>
                </div>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 text-primary`} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isCurrentTier ? (
                  <Button className="w-full" variant="outline" disabled>Current Plan</Button>
                ) : (
                  <Button
                    className={`w-full ${
                      tier.tier === 'enterprise' || tier.tier === 'brand_enterprise'
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                        : isBrand && tier.popular
                        ? 'bg-success hover:bg-success/90 text-success-foreground'
                        : ''
                    }`}
                    onClick={() => handleSubscribe(tier.priceId, tier.tier)}
                    disabled={isLoading || tier.tier === "free"}
                    variant={tier.popular ? "default" : (tier.tier === "enterprise" || tier.tier === "brand_enterprise") ? "default" : "outline"}
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</>
                    ) : tier.tier === "free" ? (
                      "Current Plan"
                    ) : (
                      "Start 7-Day Free Trial"
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {viewMode === "brand" && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Brand subscriptions are separate from creator plans. You can have both active simultaneously.
          </p>
          <p className="text-xs text-muted-foreground">
            Creators receive 100% of their rate. Service fees are charged to your brand on top.
          </p>
        </div>
      )}

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>All plans include a 7-day free trial, secure payments, and 24/7 support</p>
        <p className="mt-2">Cancel anytime during trial • No charge until day 8 • No hidden fees</p>
      </div>
    </div>
  );
}
