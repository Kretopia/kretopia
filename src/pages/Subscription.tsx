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
    name: "Spark",
    tier: "free",
    price: "$0",
    priceId: null,
    productId: null,
    icon: Zap,
    description: "Perfect for getting started",
    features: [
      "30 swipes/day",
      "Basic profile",
      "Direct messaging",
      "Portfolio (up to 10 items)",
      "Browse matches",
    ],
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
    features: SUBSCRIPTION_PRODUCTS.pro.features,
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
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Unlock the full potential of ThriveIN
        </p>
        {currentTier !== "free" && (
          <Button
            onClick={handleManageSubscription}
            variant="outline"
            className="mt-4"
            disabled={loading === "portal"}
          >
            {loading === "portal" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Manage Subscription"
            )}
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {SUBSCRIPTION_TIERS.map((tier) => {
          const Icon = tier.icon;
          const isCurrentTier = tier.tier === currentTier;
          const isLoading = loading === tier.priceId;

          return (
            <Card
              key={tier.tier}
              className={`relative ${
                tier.popular
                  ? "border-primary shadow-lg scale-105"
                  : isCurrentTier
                  ? "border-green-500"
                  : ""
              }`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              {isCurrentTier && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500">
                  Your Plan
                </Badge>
              )}

              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-8 w-8 ${tier.tier === 'studio' ? 'text-yellow-600' : tier.tier === 'pro' ? 'text-blue-600' : 'text-muted-foreground'}`} />
                  <div className="text-right">
                    <div className="text-3xl font-bold">{tier.price}</div>
                    {tier.tier !== "free" && (
                      <div className="text-sm text-muted-foreground">/month</div>
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
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isCurrentTier ? (
                  <Button className="w-full" variant="outline" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(tier.priceId, tier.tier)}
                    disabled={isLoading || tier.tier === "free"}
                    variant={tier.popular ? "default" : "outline"}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : tier.tier === "free" ? (
                      "Current Plan"
                    ) : (
                      `Upgrade to ${tier.name}`
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>All plans include secure payments and 24/7 support</p>
        <p className="mt-2">Cancel anytime • No hidden fees</p>
      </div>
    </div>
  );
}
