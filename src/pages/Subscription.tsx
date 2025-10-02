import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, Sparkles, Zap, Crown } from "lucide-react";
import { SUBSCRIPTION_PRODUCTS } from "@/lib/subscriptionConfig";

// Subscription tiers configuration
const SUBSCRIPTION_TIERS = [
  {
    name: "Free",
    tier: "free",
    price: "$0",
    priceId: null,
    productId: null,
    icon: Zap,
    features: [
      "10 swipes/day",
      "Basic profile",
      "Direct messaging",
      "1 active project",
      "Portfolio showcase",
    ],
  },
  {
    name: SUBSCRIPTION_PRODUCTS.thriver.name,
    tier: SUBSCRIPTION_PRODUCTS.thriver.tier,
    price: `$${SUBSCRIPTION_PRODUCTS.thriver.price}`,
    priceId: SUBSCRIPTION_PRODUCTS.thriver.priceId,
    productId: SUBSCRIPTION_PRODUCTS.thriver.productId,
    icon: Sparkles,
    popular: true,
    features: SUBSCRIPTION_PRODUCTS.thriver.features,
  },
  {
    name: SUBSCRIPTION_PRODUCTS.creator_pro.name,
    tier: SUBSCRIPTION_PRODUCTS.creator_pro.tier,
    price: `$${SUBSCRIPTION_PRODUCTS.creator_pro.price}`,
    priceId: SUBSCRIPTION_PRODUCTS.creator_pro.priceId,
    productId: SUBSCRIPTION_PRODUCTS.creator_pro.productId,
    icon: Crown,
    features: SUBSCRIPTION_PRODUCTS.creator_pro.features,
  },
];

export default function Subscription() {
  const [loading, setLoading] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string>("free");
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check current subscription from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_product_id")
        .eq("user_id", session.user.id)
        .single();
      
      if (profile?.subscription_tier) {
        setCurrentTier(profile.subscription_tier);
      }
    } catch (error: any) {
      console.error("Error checking subscription:", error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleSubscribe = async (priceId: string | null, tier: string) => {
    if (!priceId) {
      toast({
        title: "Free Tier",
        description: "You're already on the free tier",
      });
      return;
    }

    try {
      setLoading(priceId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to subscribe",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading("portal");
      
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open customer portal",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  if (checkingSubscription) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Choose Your{" "}
          <span className="inline-block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Membership
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Start free and upgrade as you grow. Unlock powerful features and partner benefits.
        </p>
      </div>

      {currentTier !== "free" && (
        <div className="mb-8 text-center">
          <Button onClick={handleManageSubscription} disabled={loading === "portal"} variant="outline">
            {loading === "portal" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Manage Subscription"
            )}
          </Button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {SUBSCRIPTION_TIERS.map((tier) => {
          const isCurrentPlan = currentTier === tier.tier;
          const Icon = tier.icon;
          
          return (
            <Card
              key={tier.tier}
              className={`relative ${
                tier.popular ? "border-primary shadow-lg scale-105" : ""
              } ${isCurrentPlan ? "border-green-500 shadow-xl" : ""}`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-4 right-4">
                  <Badge className="bg-green-500">Your Plan</Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                </div>
                <CardDescription>
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(tier.priceId, tier.tier)}
                  disabled={loading === tier.priceId || isCurrentPlan}
                  variant={tier.popular ? "default" : "outline"}
                >
                  {loading === tier.priceId ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : tier.priceId ? (
                    "Subscribe"
                  ) : (
                    "Free Forever"
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground space-y-2">
        <p>All paid plans include access to ThriveDesk collaboration tools and milestone payments.</p>
        <p>Partner discounts from industry-leading platforms coming soon!</p>
        <p className="font-semibold">Cancel anytime. No hidden fees.</p>
      </div>
    </div>
  );
}
