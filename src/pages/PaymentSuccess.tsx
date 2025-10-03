import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [tier, setTier] = useState<string>("");

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Give Stripe webhooks a moment to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Check updated subscription status
        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("user_id", user.id)
          .single();

        if (profile?.subscription_tier) {
          setTier(profile.subscription_tier);
        }
      } catch (error) {
        console.error("Error verifying payment:", error);
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [navigate]);

  if (verifying) {
    return (
      <div className="container mx-auto py-16 px-4 flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-semibold">Verifying your payment...</p>
            <p className="text-sm text-muted-foreground mt-2">
              This will only take a moment
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-16 px-4 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription className="text-base mt-2">
            Welcome to {tier === "creator_pro" ? "Creator Pro" : "Thriver"}! Your subscription is now active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">You now have access to:</p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li>• Unlimited daily swipes</li>
                  <li>• AI match recommendations</li>
                  <li>• Undo swipe feature</li>
                  <li>• Unlimited projects</li>
                  <li>• Profile verification</li>
                  {tier === "creator_pro" && (
                    <>
                      <li>• Featured profile</li>
                      <li>• Priority matching</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate("/discover")} className="w-full">
              Start Discovering
            </Button>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full">
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
