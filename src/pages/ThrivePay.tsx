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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { FeeStructure } from "@/components/FeeStructure";
import { FeeCalculator } from "@/components/FeeCalculator";
import { getFeeDisplayText } from "@/lib/platformFees";

import { WalletTopUpDialog } from "@/components/wallet/WalletTopUpDialog";
import { WalletTransferDialog } from "@/components/wallet/WalletTransferDialog";
import { AccountingDashboard } from "@/components/project/AccountingDashboard";
import { FreeTierGate } from "@/components/FreeTierGate";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Zap,
  Percent,
  Plus,
  Loader2,
  Wallet,
  Sparkles,
  Send,
} from "lucide-react";

interface ConnectRequirements {
  status: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  disabledReason?: string | null;
  requirements: string[];
  pastDue: number;
  currentlyDue: number;
  eventuallyDue: number;
  deadline?: string | null;
}

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
  const [connectDetails, setConnectDetails] = useState<ConnectRequirements | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Wallet state
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "wallet";
  });

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({
        title: "Account Connected!",
        description: "Your Stripe account has been successfully connected.",
      });
      navigate("/thrivepay", { replace: true });
    }

    // Handle top-up success
    if (searchParams.get("topup") === "success") {
      const topupId = searchParams.get("topup_id");
      if (topupId) {
        supabase.functions.invoke("wallet-topup-confirm", {
          body: { topupId },
        }).then(({ data }) => {
          if (data?.success) {
            toast({
              title: "Wallet Topped Up!",
              description: `$${data.amount?.toFixed(2)} has been added to your wallet.`,
            });
          }
        });
      }
      navigate("/thrivepay", { replace: true });
    }

    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }

    if (user) {
      fetchAccountStatus();
      fetchWallet();
    }
  }, [user, searchParams]);

  // --- Payment account / Connect logic ---
  const fetchAccountStatus = async () => {
    try {
      setLoading(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_account_id, stripe_account_status, subscription_tier")
        .eq("user_id", user?.id)
        .single();

      if (profile?.subscription_tier) setSubscriptionTier(profile.subscription_tier);

      if (profile?.stripe_account_id) {
        setAccountId(profile.stripe_account_id);
        setConnectStatus(profile.stripe_account_status || "pending");

        if (profile.stripe_account_status === "active") {
          const { data: balanceData } = await supabase.functions.invoke("get-connect-balance");
          if (balanceData && !balanceData.error) setBalance(balanceData);
        }

        if (profile.stripe_account_status === "pending" || profile.stripe_account_status === "restricted") {
          await checkConnectStatus();
        }
      }
    } catch (error) {
      console.error("Error fetching account status:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkConnectStatus = async () => {
    try {
      setCheckingStatus(true);
      const { data, error } = await supabase.functions.invoke("check-connect-status");
      if (error) throw error;
      if (data) {
        setConnectDetails(data);
        if (data.status && data.status !== connectStatus) {
          setConnectStatus(data.status);
          if (data.status === "active") {
            toast({ title: "Account Active!", description: "Your Stripe account is now fully verified." });
          }
        }
      }
    } catch (error) {
      console.error("Error checking connect status:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleConnectAccount = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("create-connect-account");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast({ title: "Opening Stripe Connect", description: "Complete the onboarding in the new tab" });
      }
    } catch (error) {
      console.error("Error connecting account:", error);
      toast({ title: "Connection Failed", description: "Unable to connect Stripe account.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleManageAccount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-login-link");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error creating login link:", error);
      toast({ title: "Error", description: "Failed to open Stripe dashboard", variant: "destructive" });
    }
  };

  // --- Wallet logic ---
  const fetchWallet = async () => {
    if (!user) return;
    const { data: wallet } = await supabase
      .from("wallets")
      .select("user_id, balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (wallet) {
      setWalletBalance(wallet.balance || 0);
    }

    const { data: transactions } = await supabase
      .from("transactions")
      .select("id, type, amount, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15);

    if (transactions) setRecentTransactions(transactions);
  };

  const handleTopUpSuccess = () => {
    fetchWallet();
    fetchAccountStatus();
  };

  const handleTransferComplete = () => {
    fetchWallet();
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
      <div className="mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        <Skeleton className="h-8 sm:h-12 w-48 sm:w-64 mb-4 sm:mb-8" />
        <div className="grid gap-3 grid-cols-2 mb-4">
          <Skeleton className="h-20 sm:h-32 col-span-2 sm:col-span-1" />
          <Skeleton className="h-20 sm:h-32" />
          <Skeleton className="h-20 sm:h-32" />
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="ThrivePay — Wallet & Payments"
        description="Manage your wallet, earnings, status, and payment account"
      />

      <div className="mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl min-h-screen pb-24">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold">ThrivePay</h1>
            {getStatusBadge()}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 h-9 px-3" onClick={() => setTransferDialogOpen(true)}>
              <Send className="h-4 w-4" />
              Send
            </Button>
            <Button size="sm" className="gap-1.5 h-9 px-3" onClick={() => setTopUpDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Top Up
            </Button>
          </div>
        </div>

        <WalletTopUpDialog open={topUpDialogOpen} onOpenChange={setTopUpDialogOpen} />
        <WalletTransferDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          walletBalance={walletBalance}
          onTransferComplete={handleTransferComplete}
        />

        {/* Balance Overview */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 mb-4 sm:mb-6">
          <Card className="bg-gradient-to-br from-primary via-primary/90 to-accent border-0 col-span-2 sm:col-span-1">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-primary-foreground/80 mb-0.5">Wallet Balance</p>
              <p className="text-2xl sm:text-3xl font-bold text-primary-foreground">${walletBalance.toFixed(2)}</p>
            </CardContent>
          </Card>
          {connectStatus === "active" && (
            <>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs text-muted-foreground">Available</p>
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-green-500">${balance.available.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold">${balance.pending.toFixed(2)}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="w-full grid grid-cols-3 h-10 sm:h-11">
            <TabsTrigger value="wallet" className="gap-1 sm:gap-1.5 text-xs px-1 sm:px-3">
              <Wallet className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Wallet</span>
            </TabsTrigger>
            <TabsTrigger value="earnings" className="gap-1 sm:gap-1.5 text-xs px-1 sm:px-3">
              <TrendingUp className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Earnings</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1 sm:gap-1.5 text-xs px-1 sm:px-3">
              <CreditCard className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
          </TabsList>

          {/* Wallet Tab - Transactions */}
          <TabsContent value="wallet" className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold">Recent Activity</h2>
              <Button variant="link" size="sm" onClick={() => navigate("/payment-history")}>
                View All
              </Button>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {recentTransactions.length === 0 ? (
                <Card>
                  <CardContent className="p-6 sm:p-8 text-center">
                    <p className="text-muted-foreground text-sm">No transactions yet</p>
                  </CardContent>
                </Card>
              ) : (
                recentTransactions.map((tx) => (
                  <Card key={tx.id} className="hover:bg-accent/5 transition-smooth">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className={`rounded-full p-1.5 sm:p-2 flex-shrink-0 ${
                            tx.type.includes("earned") || tx.type.includes("received")
                              ? "bg-green-500/10"
                              : "bg-red-500/10"
                          }`}>
                            {tx.type.includes("earned") || tx.type.includes("received") ? (
                              <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">{tx.description || tx.type}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm sm:text-lg font-semibold flex-shrink-0 ${
                          tx.type.includes("earned") || tx.type.includes("received")
                            ? "text-green-500"
                            : "text-red-500"
                        }`}>
                          {tx.type.includes("earned") || tx.type.includes("received") ? "+" : "-"}
                          ${tx.amount}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-6">
            <FreeTierGate
              feature="expenses"
              featureLabel="Creative Earnings"
              description="Upgrade to Pro for unlimited expense tracking, invoicing, and earnings insights."
            >
              <AccountingDashboard />
            </FreeTierGate>
          </TabsContent>


          {/* Payments Tab - Stripe Connect */}
          <TabsContent value="payments" className="space-y-6">
            {/* Not Connected */}
            {connectStatus === "not_connected" && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Connect Your Payment Account
                  </CardTitle>
                  <CardDescription>Start receiving payments securely through Stripe Connect</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Secure & Compliant</h3>
                        <p className="text-sm text-muted-foreground">Stripe handles all security</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Fast Payouts</h3>
                        <p className="text-sm text-muted-foreground">Automatic transfers to your bank</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">No Liability</h3>
                        <p className="text-sm text-muted-foreground">ThriveIN doesn't hold your funds</p>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleConnectAccount} className="w-full" size="lg">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Connect Stripe Account
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Pending / Restricted */}
            {(connectStatus === "pending" || connectStatus === "restricted") && (
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                      {connectStatus === "restricted" ? <AlertCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                      {connectStatus === "restricted" ? "Action Required" : "Setup Incomplete"}
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={checkConnectStatus} disabled={checkingStatus}>
                      {checkingStatus ? "Checking..." : "Refresh Status"}
                    </Button>
                  </div>
                  <CardDescription>
                    {connectStatus === "restricted"
                      ? "Your account has restrictions. Complete the items below."
                      : "Complete Stripe onboarding to start receiving payments."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Details Submitted", ok: connectDetails?.detailsSubmitted },
                      { label: "Charges Enabled", ok: connectDetails?.chargesEnabled },
                      { label: "Payouts Enabled", ok: connectDetails?.payoutsEnabled },
                    ].map((item) => (
                      <div key={item.label} className={`flex items-center gap-2 rounded-lg border p-3 ${item.ok ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
                        {item.ok ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {connectDetails?.requirements && connectDetails.requirements.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Missing Information:</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {connectDetails.requirements.map((req, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                            {req}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {connectDetails?.deadline && (
                    <Alert variant="destructive" className="border-red-500/30">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Deadline:</strong> Complete by{" "}
                        {new Date(connectDetails.deadline).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button onClick={handleConnectAccount} size="lg" className="w-full sm:w-auto">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Complete Setup on Stripe
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Active - Account Management */}
            {connectStatus === "active" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Management</CardTitle>
                    <CardDescription>Manage your payment settings and view detailed history</CardDescription>
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

                {/* How Payments Work */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      How Payments Work
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Secure Payment Processing</h4>
                      <p className="text-sm text-muted-foreground">
                        All payments go through Stripe Connect. ThriveIN never holds your funds.
                      </p>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-semibold">Automatic Payouts</h4>
                      <p className="text-sm text-muted-foreground">
                        Stripe automatically transfers your balance to your bank on your configured schedule.
                      </p>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-semibold">Transparent Pricing</h4>
                      <p className="text-sm text-muted-foreground">
                        Platform fees are deducted per transaction. Stripe fees (~2.9% + 30¢) are separate. Upgrade to reduce fees.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Fees Tab */}
          <TabsContent value="fees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-primary" />
                  Your Platform Fee Rate
                </CardTitle>
                <CardDescription>
                  Based on your {subscriptionTier === "free" ? "Thriver (Free)" : "Creator Pro"} membership
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold text-primary mb-1">
                      {getFeeDisplayText(subscriptionTier)}
                    </div>
                    <p className="text-sm text-muted-foreground">per transaction</p>
                  </div>
                  {subscriptionTier === "free" && (
                    <Button variant="outline" onClick={() => navigate("/subscription")}>
                      Upgrade to Save
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <FeeStructure currentTier={subscriptionTier} />
              <FeeCalculator subscriptionTier={subscriptionTier} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
