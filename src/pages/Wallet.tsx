import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { HelpCircle, Plus, ArrowUpRight, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

export default function Wallet() {
  const [wallet, setWallet] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);
  const [topUpType, setTopUpType] = useState<"credits" | "balance">("credits");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: walletData } = await supabase
      .from('wallets')
      .select('user_id, credits, balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletData) {
      setWallet(walletData);
    } else {
      const { data: newWallet } = await supabase
        .from('wallets')
        .insert({ user_id: user.id, credits: 10 })
        .select()
        .maybeSingle();
      setWallet(newWallet);
    }

    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, type, amount, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (transactions) setRecentTransactions(transactions);
  };

  const handleTopUp = async () => {
    if (!topUpAmount || Number(topUpAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { 
          amount: Number(topUpAmount),
          type: topUpType
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        setTopUpDialogOpen(false);
        setTopUpAmount("");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Wallet - ThriveIN"
        description="Manage your credits and balance on ThriveIN"
      />
      <div className="min-h-screen p-4 sm:p-6">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Wallet</h1>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <HelpCircle className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/thrivepay')}
                className="hidden sm:flex"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                ThrivePay
              </Button>
            </div>
            <Dialog open={topUpDialogOpen} onOpenChange={setTopUpDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="gradient" size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Top Up
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Funds to Wallet</DialogTitle>
                  <DialogDescription>
                    Top up your ThrivePay wallet with credits or balance
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Top-up Type</Label>
                    <RadioGroup value={topUpType} onValueChange={(value: any) => setTopUpType(value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="credits" id="credits" />
                        <Label htmlFor="credits" className="cursor-pointer">
                          Credits ($0.10 per credit)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="balance" id="balance" />
                        <Label htmlFor="balance" className="cursor-pointer">
                          USD Balance
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      Amount ({topUpType === "credits" ? "credits" : "USD"})
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder={topUpType === "credits" ? "100" : "10.00"}
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      min="1"
                      step={topUpType === "credits" ? "1" : "0.01"}
                    />
                    {topUpType === "credits" && topUpAmount && (
                      <p className="text-sm text-muted-foreground">
                        Total: ${(Number(topUpAmount) * 0.10).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleTopUp} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Funds
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Balance Cards */}
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <Card className="bg-gradient-to-br from-primary via-primary/90 to-accent border-0 overflow-hidden relative">
              <CardContent className="p-6">
                <p className="text-sm text-primary-foreground/80 mb-2">Credits</p>
                <p className="text-5xl font-bold text-primary-foreground">
                  {wallet?.credits || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Balance</p>
                <p className="text-5xl font-bold">
                  ${(wallet?.balance || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent Activity</h2>
              <Button variant="link" onClick={() => navigate('/payment-history')}>
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {recentTransactions.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No transactions yet</p>
                  </CardContent>
                </Card>
              ) : (
                recentTransactions.map((tx) => (
                  <Card key={tx.id} className="hover:bg-accent/5 transition-smooth">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-full p-2 ${
                            tx.type.includes('earned') || tx.type.includes('received')
                              ? 'bg-green-500/10'
                              : 'bg-red-500/10'
                          }`}>
                            <ArrowUpRight className={`h-4 w-4 ${
                              tx.type.includes('earned') || tx.type.includes('received')
                                ? 'text-green-500 rotate-180'
                                : 'text-red-500'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium">{tx.description || tx.type}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className={`text-lg font-semibold ${
                          tx.type.includes('earned') || tx.type.includes('received') 
                            ? 'text-green-500' 
                            : 'text-red-500'
                        }`}>
                          {tx.type.includes('earned') || tx.type.includes('received') ? '+' : '-'}
                          {tx.type.includes('credit') ? `${tx.amount} credits` : `$${tx.amount}`}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* ThrivePay CTA */}
          <Card className="bg-muted/50 border-primary/20">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Connect your payment account in ThrivePay to start receiving payments
              </p>
              <Button variant="outline" onClick={() => navigate('/thrivepay')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open ThrivePay
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}