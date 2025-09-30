import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export const WalletCard = () => {
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
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletData) {
      setWallet(walletData);
    } else {
      const { data: newWallet } = await supabase
        .from('wallets')
        .insert({ user_id: user.id, credits: 10 })
        .select()
        .single();
      setWallet(newWallet);
    }

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          ThrivePay Wallet
        </CardTitle>
        <Dialog open={topUpDialogOpen} onOpenChange={setTopUpDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Add Funds
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
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Balance Display */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-gradient-to-br from-primary to-secondary p-4">
              <p className="text-sm text-primary-foreground/80">Credits</p>
              <p className="text-3xl font-bold text-primary-foreground">
                {wallet?.credits || 0}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="text-3xl font-bold">
                ${(wallet?.balance || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Recent Activity</h4>
              <Button variant="ghost" size="sm" onClick={() => navigate('/wallet')}>
                View All
              </Button>
            </div>
            <div className="space-y-2">
              {recentTransactions.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No transactions yet
                </p>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      {tx.type.includes('earned') || tx.type.includes('received') ? (
                        <div className="rounded-full bg-green-500/10 p-2">
                          <ArrowDownRight className="h-4 w-4 text-green-500" />
                        </div>
                      ) : (
                        <div className="rounded-full bg-red-500/10 p-2">
                          <ArrowUpRight className="h-4 w-4 text-red-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{tx.description || tx.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${
                      tx.type.includes('earned') || tx.type.includes('received') 
                        ? 'text-green-500' 
                        : 'text-red-500'
                    }`}>
                      {tx.type.includes('earned') || tx.type.includes('received') ? '+' : '-'}
                      {tx.type.includes('credit') ? `${tx.amount} credits` : `$${tx.amount}`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
