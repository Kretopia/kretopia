import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CardCarousel } from "@/components/kretopia/CardCarousel";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, Sparkles, Zap, Crown, Building2, User, Briefcase, Globe } from "lucide-react";
import { 
  SUBSCRIPTION_PRODUCTS, BRAND_SUBSCRIPTION_PRODUCTS,
  PRO_FEATURES, FREE_FEATURES, CREATOR_PRO_FEATURES,
  type AccountType, type BillingInterval, hasProAccess, isBrandTier,
  getYearlySavings, getEffectiveMonthlyPrice,
} from "@/lib/subscriptionConfig";
// Tabs import removed — Creator/Brand toggle deprecated; view derives from account_type
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FeaturePageHeader } from "@/components/features/FeaturePageHeader";
import type { TutorialStep } from "@/components/landing/kretopia/FeatureTutorial";

const SUBSCRIPTION_TUTORIAL: TutorialStep[] = [
  { icon: Zap, title: "Start free", body: "Spark is free forever — no credit card, no time limit. Upgrade only when you're ready for more." },
  { icon: Sparkles, title: "Try Pro risk-free", body: "Monthly plans start with a 7-day free trial, and every plan cancels anytime." },
  { icon: Crown, title: "Manage it anytime", body: "Once you're subscribed, open Manage Subscription here to update your card, change plans, or cancel." },
];

const FOUNDER_FEATURES = [
  "Exclusive Founder Circle badge",
  "Lifetime Pro access — never pay again",
  "5,000 Bonus XP on activation",
  "Only 10% platform fees (vs 20% free / 15% Pro)",
  "Free & discounted event access",
  "Premium Partner Membership (when launched)",
  "All Creator Pro features included forever",
  "Priority support & early feature access",
  "All Smart tools & analytics unlocked",
  "Founding member recognition",
];

function getCreatorTiers(interval: BillingInterval) {
  const isYearly = interval === 'yearly';
  return [
    {
      name: "Spark",
      tier: "free" as const,
      price: 0,
      displayPrice: "$0",
      priceId: null,
      productId: null,
      icon: Zap,
      description: "Perfect for getting started",
      features: FREE_FEATURES.individual,
    },
    {
      name: SUBSCRIPTION_PRODUCTS.pro.name,
      tier: SUBSCRIPTION_PRODUCTS.pro.tier,
      price: isYearly ? SUBSCRIPTION_PRODUCTS.pro.yearlyPrice : SUBSCRIPTION_PRODUCTS.pro.price,
      displayPrice: isYearly ? `$${getEffectiveMonthlyPrice('pro')}` : `$${SUBSCRIPTION_PRODUCTS.pro.price}`,
      priceId: isYearly ? SUBSCRIPTION_PRODUCTS.pro.yearlyPriceId : SUBSCRIPTION_PRODUCTS.pro.priceId,
      productId: isYearly ? SUBSCRIPTION_PRODUCTS.pro.yearlyProductId : SUBSCRIPTION_PRODUCTS.pro.productId,
      icon: Sparkles,
      popular: true,
      description: "For serious creators — includes your own website",
      features: PRO_FEATURES.individual,
      savings: isYearly ? getYearlySavings('pro') : 0,
    },
    {
      name: SUBSCRIPTION_PRODUCTS.creator_pro.name,
      tier: SUBSCRIPTION_PRODUCTS.creator_pro.tier,
      price: isYearly ? SUBSCRIPTION_PRODUCTS.creator_pro.yearlyPrice : SUBSCRIPTION_PRODUCTS.creator_pro.price,
      displayPrice: isYearly ? `$${getEffectiveMonthlyPrice('creator_pro')}` : `$${SUBSCRIPTION_PRODUCTS.creator_pro.price}`,
      priceId: isYearly ? SUBSCRIPTION_PRODUCTS.creator_pro.yearlyPriceId : SUBSCRIPTION_PRODUCTS.creator_pro.priceId,
      productId: isYearly ? SUBSCRIPTION_PRODUCTS.creator_pro.yearlyProductId : SUBSCRIPTION_PRODUCTS.creator_pro.productId,
      icon: Globe,
      description: "For power users & agencies",
      features: CREATOR_PRO_FEATURES.individual,
      savings: isYearly ? getYearlySavings('creator_pro') : 0,
    },
  ];
}

function getBrandTiers(interval: BillingInterval) {
  const isYearly = interval === 'yearly';
  return [
    {
      name: "Spark",
      tier: "free" as const,
      price: 0,
      displayPrice: "$0",
      priceId: null,
      productId: null,
      icon: Zap,
      description: "Get started hiring",
      features: FREE_FEATURES.company,
    },
    {
      name: BRAND_SUBSCRIPTION_PRODUCTS.pro.name,
      tier: BRAND_SUBSCRIPTION_PRODUCTS.pro.tier,
      price: isYearly ? BRAND_SUBSCRIPTION_PRODUCTS.pro.yearlyPrice : BRAND_SUBSCRIPTION_PRODUCTS.pro.price,
      displayPrice: isYearly ? `$${getEffectiveMonthlyPrice('brand_pro')}` : `$${BRAND_SUBSCRIPTION_PRODUCTS.pro.price}`,
      priceId: isYearly ? BRAND_SUBSCRIPTION_PRODUCTS.pro.yearlyPriceId : BRAND_SUBSCRIPTION_PRODUCTS.pro.priceId,
      productId: isYearly ? BRAND_SUBSCRIPTION_PRODUCTS.pro.yearlyProductId : BRAND_SUBSCRIPTION_PRODUCTS.pro.productId,
      icon: Sparkles,
      popular: true,
      description: "For brands & studios hiring talent",
      features: PRO_FEATURES.company,
      savings: isYearly ? getYearlySavings('brand_pro') : 0,
    },
    {
      name: BRAND_SUBSCRIPTION_PRODUCTS.enterprise.name,
      tier: BRAND_SUBSCRIPTION_PRODUCTS.enterprise.tier,
      price: isYearly ? BRAND_SUBSCRIPTION_PRODUCTS.enterprise.yearlyPrice : BRAND_SUBSCRIPTION_PRODUCTS.enterprise.price,
      displayPrice: isYearly ? `$${getEffectiveMonthlyPrice('brand_enterprise')}` : `$${BRAND_SUBSCRIPTION_PRODUCTS.enterprise.price}`,
      priceId: isYearly ? BRAND_SUBSCRIPTION_PRODUCTS.enterprise.yearlyPriceId : BRAND_SUBSCRIPTION_PRODUCTS.enterprise.priceId,
      productId: isYearly ? BRAND_SUBSCRIPTION_PRODUCTS.enterprise.yearlyProductId : BRAND_SUBSCRIPTION_PRODUCTS.enterprise.productId,
      icon: Building2,
      description: "For agencies & large teams",
      features: CREATOR_PRO_FEATURES.company,
      savings: isYearly ? getYearlySavings('brand_enterprise') : 0,
    },
  ];
}

export default function Subscription() {
  const [loading, setLoading] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string>("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("none");
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [viewMode, setViewMode] = useState<"creator" | "brand">("creator");
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
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

  const tiers = viewMode === "brand" ? getBrandTiers(billingInterval) : getCreatorTiers(billingInterval);
  const founderSpotsRemaining = SUBSCRIPTION_PRODUCTS.founder.maxSpots - founderSpotsTaken;
  const isFounder = currentTier === 'founder';
  const hasPaidSub = currentTier !== "free" && (subscriptionStatus === "active" || subscriptionStatus === "trialing") && currentTier !== "founder";

  return (
    <div className="pb-16">
      <FeaturePageHeader
        eyebrow="Pricing"
        title="Choose your plan."
        accentTitle="Start free, upgrade anytime."
        subtitle={
          viewMode === "brand"
            ? "Find, hire & manage top creative talent."
            : "Unlock the full potential of Kretopia."
        }
        tutorial={{ featureKey: "subscription", label: "How Pricing works", steps: SUBSCRIPTION_TUTORIAL }}
        tabs={
          <div className="flex flex-col items-center gap-3 text-center">
            {/* View mode is derived from account_type — companies see Brand tiers, creators see Creator tiers.
                Manual toggle removed: account type is set during onboarding and edited from profile settings. */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/80 backdrop-blur-sm text-xs font-semibold text-muted-foreground">
              {viewMode === "brand" ? (
                <><Briefcase className="h-3.5 w-3.5" /> Brand plans</>
              ) : (
                <><User className="h-3.5 w-3.5" /> Creator plans</>
              )}
            </div>

            <div className="flex items-center justify-center gap-3">
              <Label htmlFor="billing-toggle" className={`text-sm ${billingInterval === 'monthly' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                Monthly
              </Label>
              <Switch
                id="billing-toggle"
                checked={billingInterval === 'yearly'}
                onCheckedChange={(checked) => setBillingInterval(checked ? 'yearly' : 'monthly')}
              />
              <Label htmlFor="billing-toggle" className={`text-sm ${billingInterval === 'yearly' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                Yearly
              </Label>
              {billingInterval === 'yearly' && (
                <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-xs">
                  Save up to 17%
                </Badge>
              )}
            </div>
          </div>
        }
      />

      <div className="container mx-auto px-4 pt-8">
      {hasPaidSub && (
        <div className="flex justify-end mb-6">
          <Button size="sm" onClick={handleManageSubscription} variant="outline" disabled={loading === "portal"}>
            {loading === "portal" ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</>
            ) : (
              "Manage Subscription"
            )}
          </Button>
        </div>
      )}

      {/* Founder Circle Card — only show on Creator view */}
      {viewMode === "creator" && (
        <div className="max-w-2xl mx-auto mb-12">
          <Card className={`relative rounded-2xl border-2 shadow-none overflow-visible ${
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
                Join the founding members. Lifetime Creator+ access with exclusive perks.
              </CardDescription>
              <div className="mt-3">
                <span className="text-4xl font-bold">$499</span>
                <span className="text-muted-foreground ml-2">one-time payment</span>
              </div>
               <p className="text-xs text-muted-foreground mt-1">
                That's less than 9 months of Creator Pro — yours forever
              </p>
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
                  className="btn-glass btn-glass-primary w-full text-energy-foreground"
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
          <p className="text-sm text-muted-foreground">— or choose a {billingInterval} plan —</p>
        </div>
      )}

      <CardCarousel label="Plans" className="max-w-5xl mx-auto">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          const isCurrentTier = tier.tier === currentTier;
          const isLoading = loading === tier.priceId;
          const isBrand = tier.tier.startsWith('brand_');
          const savings = 'savings' in tier ? tier.savings : 0;

          return (
            <Card
              key={tier.tier}
              className={`relative rounded-2xl shadow-none ${
                tier.popular
                  ? "border-primary"
                  : tier.tier === "creator_pro"
                  ? "border-primary/70"
                  : tier.tier === "brand_enterprise"
                  ? "border-primary/50"
                  : isCurrentTier
                  ? "border-success"
                  : "border-border/60"
              }`}
            >
              {tier.popular && !isCurrentTier && (
                <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2`}>
                  {isBrand ? "Best for Hiring" : "Most Popular"}
                </Badge>
              )}
              {tier.tier === "creator_pro" && !isCurrentTier && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                  {isBrand ? "Full Suite" : "🔗 Custom Domain"}
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
                    tier.tier === 'pro' || tier.tier === 'brand_pro' || tier.tier === 'creator_pro' || tier.tier === 'brand_enterprise' ? 'text-primary' : 
                    'text-muted-foreground'
                  }`} />
                  <div className="text-right">
                    <div className="text-3xl font-bold">{tier.displayPrice}</div>
                    {tier.tier !== "free" && (
                      <div className="text-sm text-muted-foreground">/month</div>
                    )}
                    {billingInterval === 'yearly' && tier.tier !== "free" && savings > 0 && (
                      <div className="text-xs text-success font-semibold">Save ${savings}/yr</div>
                    )}
                    {billingInterval === 'monthly' && tier.tier !== "free" && !isCurrentTier && (
                      <div className="text-xs text-primary font-medium">7 days free</div>
                    )}
                    {billingInterval === 'yearly' && tier.tier !== "free" && (
                      <div className="text-[10px] text-muted-foreground">
                        ${tier.price}/yr billed annually
                      </div>
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
                      tier.tier === 'creator_pro' || tier.tier === 'brand_enterprise'
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                        : isBrand && tier.popular
                        ? 'bg-success hover:bg-success/90 text-success-foreground'
                        : ''
                    }`}
                    onClick={() => handleSubscribe(tier.priceId, tier.tier)}
                    disabled={isLoading || tier.tier === "free"}
                    variant={tier.popular ? "default" : (tier.tier === "creator_pro" || tier.tier === "brand_enterprise") ? "default" : "outline"}
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</>
                    ) : tier.tier === "free" ? (
                      "Current Plan"
                    ) : (
                      billingInterval === 'yearly' ? "Start Annual Plan" : "Upgrade Now"
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </CardCarousel>

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
        <p>Free forever to start · Cancel anytime · Secure payments · 24/7 support</p>
        <p className="mt-2">Save 17% with annual billing · No hidden fees</p>
      </div>
      </div>
    </div>
  );
}
