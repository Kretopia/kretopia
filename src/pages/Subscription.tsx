import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, Sparkles } from "lucide-react";

const SUBSCRIPTION_TIERS = [
  {
    name: "Basic",
    price: "$9.99",
    priceId: "price_1SD3owJvOS7zG18hXCqHcExm",
    productId: "prod_T9MYOv0ucDM6MT",
    credits: 50,
    features: [
      "50 credits per month",
      "Basic platform features",
      "Email support",
      "Access to ThriveDesk",
      "Project collaboration",
    ],
  },
  {
    name: "Pro",
    price: "$29.99",
    priceId: "price_1SD3pLJvOS7zG18hyhVHXByZ",
    productId: "prod_T9MYqqkqTWy1Wm",
    credits: 200,
    popular: true,
    features: [
      "200 credits per month",
      "Priority support",
      "Advanced features",
      "Milestone payments",
      "Analytics dashboard",
      "Custom branding options",
    ],
  },
  {
    name: "Enterprise",
    price: "$99.99",
    priceId: "price_1SD3qSJvOS7zG18heInAixg2",
    productId: "prod_T9MZHcJcHo38wC",
    credits: 1000,
    features: [
      "1000 credits per month",
      "VIP support 24/7",
      "All features included",
      "Unlimited projects",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
    ],
  },
];

export default function Subscription() {
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
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

      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) throw error;
      
      if (data?.subscribed && data?.product_id) {
        setCurrentPlan(data.product_id);
      }
    } catch (error: any) {
      console.error("Error checking subscription:", error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleSubscribe = async (priceId: string) => {
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
    <div className="container mx-auto py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Get credits and unlock premium features to grow your business
        </p>
      </div>

      {currentPlan && (
        <div className="mb-8 text-center">
          <Button onClick={handleManageSubscription} disabled={loading === "portal"}>
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

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {SUBSCRIPTION_TIERS.map((tier) => {
          const isCurrentPlan = currentPlan === tier.productId;
          
          return (
            <Card
              key={tier.priceId}
              className={`relative ${
                tier.popular ? "border-primary shadow-lg scale-105" : ""
              } ${isCurrentPlan ? "border-green-500" : ""}`}
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
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription>
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </CardDescription>
                <p className="text-sm text-muted-foreground">
                  {tier.credits} credits per month
                </p>
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
                  onClick={() => handleSubscribe(tier.priceId)}
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
                  ) : (
                    "Subscribe"
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>All plans include access to ThrivePay wallet and ThriveDesk collaboration tools.</p>
        <p className="mt-2">Cancel anytime. No hidden fees.</p>
      </div>
    </div>
  );
}
