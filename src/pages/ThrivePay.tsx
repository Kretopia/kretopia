import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { FeeStructure } from "@/components/FeeStructure";
import { FeeCalculator } from "@/components/FeeCalculator";
import { getFeeDisplayText } from "@/lib/platformFees";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  CreditCard,
  ArrowUpRight,
  Shield,
  Zap,
  Percent,
} from "lucide-react";

export default function ThrivePay() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [connectStatus, setConnectStatus] = useState<string>("not_connected");
  const [balance, setBalance] = useState({ available: 0, pending: 0, currency: "usd" });
  const [accountId, setAccountId] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>("free");

  useEffect(() => {
    // Check for success callback
    if (searchParams.get("success") === "true") {
      toast({
        title: "Account Connected! 🎉",
        description: "Your Stripe account has been successfully connected.",
      });
      // Remove the success param
      navigate("/thrivepay", { replace: true });
    }

    if (user) {
      fetchAccountStatus();
    }
  }, [user, searchParams]);

  const fetchAccountStatus = async () => {
    try {
      setLoading(true);
      
      // Get profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_account_id, stripe_account_status, subscription_tier")
        .eq("user_id", user?.id)
        .single();

      if (profile?.subscription_tier) {
        setSubscriptionTier(profile.subscription_tier);
      }

      if (profile?.stripe_account_id) {
        setAccountId(profile.stripe_account_id);
        setConnectStatus(profile.stripe_account_status || "pending");

        // Fetch balance if account is active
        if (profile.stripe_account_status === "active") {
          const { data: balanceData } = await supabase.functions.invoke(
            "get-connect-balance"
          );

          if (balanceData && !balanceData.error) {
            setBalance(balanceData);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching account status:", error);
      toast({
        title: "Error",
        description: "Failed to load account information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAccount = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke(
        "create-connect-account"
      );

      if (error) throw error;

      if (data?.url) {
        // Open Stripe onboarding in new tab
        window.open(data.url, "_blank");
        
        toast({
          title: "Opening Stripe Connect",
          description: "Complete the onboarding in the new tab",
        });
      }
    } catch (error) {
      console.error("Error connecting account:", error);
      toast({
        title: "Connection Failed",
        description: "Unable to connect Stripe account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageAccount = () => {
    // Open Stripe Express dashboard
    window.open(`https://connect.stripe.com/express/${accountId}`, "_blank");
  };

  const getStatusBadge = () => {
    switch (connectStatus) {
      case "active":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "restricted":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Restricted</Badge>;
      default:
        return <Badge variant="outline">Not Connected</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="ThrivePay - Payment Dashboard"
        description="Manage your payments, track earnings, and handle payouts with ThrivePay"
      />

      <div className="container mx-auto py-8 px-4 max-w-7xl min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">ThrivePay</h1>
              <p className="text-muted-foreground">
                Secure payments powered by Stripe Connect
              </p>
            </div>
            {getStatusBadge()}
          </div>
        </div>

        {/* Not Connected State */}
        {connectStatus === "not_connected" && (
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Connect Your Payment Account
              </CardTitle>
              <CardDescription>
                Start receiving payments securely through Stripe Connect
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Secure & Compliant</h3>
                    <p className="text-sm text-muted-foreground">
                      Stripe handles all security and compliance
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Fast Payouts</h3>
                    <p className="text-sm text-muted-foreground">
                      Get paid quickly with automatic transfers
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">No Liability</h3>
                    <p className="text-sm text-muted-foreground">
                      ThriveIN doesn't hold your funds
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You'll be redirected to Stripe to complete a quick verification process.
                  This ensures secure and compliant payment processing.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={handleConnectAccount} 
                className="w-full md:w-auto"
                size="lg"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Connect Stripe Account
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pending State */}
        {connectStatus === "pending" && (
          <Alert className="mb-8">
            <Clock className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Your account is being verified by Stripe. This usually takes a few minutes.</span>
              <Button variant="outline" size="sm" onClick={fetchAccountStatus}>
                Refresh Status
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Active State - Balance Cards */}
        {connectStatus === "active" && (
          <>
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${balance.available.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ready to transfer
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${balance.pending.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Processing
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${(balance.available + balance.pending).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All time
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Account Management</CardTitle>
                <CardDescription>
                  Manage your payment settings and view detailed transaction history
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button onClick={handleManageAccount} variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Stripe Dashboard
                </Button>
                <Button onClick={fetchAccountStatus} variant="outline">
                  Refresh Balance
                </Button>
              </CardContent>
            </Card>

            {/* Current Fee Display */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-primary" />
                  Your Platform Fee Rate
                </CardTitle>
                <CardDescription>
                  Based on your {subscriptionTier === 'free' ? 'Free' : subscriptionTier === 'thriver' ? 'Thriver' : 'Creator Pro'} membership
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold text-primary mb-1">
                      {getFeeDisplayText(subscriptionTier)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      per transaction
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/membership')}>
                    Upgrade to Save
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Fee Structure */}
            <div className="grid gap-6 lg:grid-cols-2">
              <FeeStructure currentTier={subscriptionTier} />
              <FeeCalculator subscriptionTier={subscriptionTier} />
            </div>

            <div className="mt-8" />

            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  How ThrivePay Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Secure Payment Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    All payments are processed through Stripe Connect. ThriveIN never holds your funds - 
                    they go directly to your connected Stripe account.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold">Automatic Payouts</h4>
                  <p className="text-sm text-muted-foreground">
                    Stripe automatically transfers your available balance to your bank account 
                    on a schedule you can configure in your Stripe dashboard.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold">Transparent Pricing</h4>
                  <p className="text-sm text-muted-foreground">
                    Platform fees are automatically deducted from each transaction. Stripe's processing 
                    fees (~2.9% + 30¢) are separate. Upgrade your membership to reduce platform fees.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
