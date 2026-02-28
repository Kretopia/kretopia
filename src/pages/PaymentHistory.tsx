import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownLeft, ArrowUpRight, DollarSign, Receipt, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { CurrencySelector } from "@/components/CurrencySelector";

interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description: string;
  created_at: string;
  project_id: string | null;
  invoice_id: string | null;
}

export default function PaymentHistory() {
  const { user } = useAuth();
  const { preferredCurrency, updatePreferredCurrency, convert, formatAmount, getCurrencySymbol } = useCurrencyConversion();
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReceived: 0,
    totalSent: 0,
    pendingAmount: 0,
    transactionCount: 0
  });
  const sym = getCurrencySymbol();

  useEffect(() => {
    if (user) {
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchPaymentHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_history")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPayments(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      toast.error("Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: PaymentHistoryItem[]) => {
    const received = data
      .filter(p => p.type === "payment_received" && p.status === "completed")
      .reduce((sum, p) => sum + convert(Number(p.amount), p.currency || "USD"), 0);
    
    const sent = data
      .filter(p => p.type === "payment_sent" && p.status === "completed")
      .reduce((sum, p) => sum + convert(Number(p.amount), p.currency || "USD"), 0);
    
    const pending = data
      .filter(p => p.status === "pending")
      .reduce((sum, p) => sum + convert(Number(p.amount), p.currency || "USD"), 0);

    setStats({
      totalReceived: received,
      totalSent: sent,
      pendingAmount: pending,
      transactionCount: data.length
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "pending": return "secondary";
      case "failed": return "destructive";
      case "cancelled": return "outline";
      default: return "secondary";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "payment_received": return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case "payment_sent": return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case "refund": return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case "commission": return <DollarSign className="h-4 w-4 text-purple-500" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };

  const filterPayments = (type?: string) => {
    if (!type) return payments;
    return payments.filter(p => p.type === type);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Payment History"
        description="Track all your payments, earnings, and transactions"
      />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Payment History</h1>
            <p className="text-muted-foreground">Track all your payments and transactions</p>
          </div>
          <CurrencySelector value={preferredCurrency} onChange={updatePreferredCurrency} />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Received</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {sym}{stats.totalReceived.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {sym}{stats.totalSent.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <RefreshCw className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {sym}{stats.pendingAmount.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.transactionCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Payment List */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>View all your payment transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="received">Received</TabsTrigger>
                <TabsTrigger value="sent">Sent</TabsTrigger>
                <TabsTrigger value="refund">Refunds</TabsTrigger>
                <TabsTrigger value="commission">Commission</TabsTrigger>
              </TabsList>

              {["all", "payment_received", "payment_sent", "refund", "commission"].map((filterType) => (
                <TabsContent 
                  key={filterType} 
                  value={filterType === "all" ? "all" : filterType.replace("payment_", "")} 
                  className="space-y-4"
                >
                  {filterPayments(filterType === "all" ? undefined : filterType).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No transactions found</p>
                    </div>
                  ) : (
                    filterPayments(filterType === "all" ? undefined : filterType).map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {getTypeIcon(payment.type)}
                          <div>
                            <p className="font-medium">{payment.description || "Payment"}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(payment.created_at), "PPP")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {payment.type === "payment_received" ? "+" : "-"}
                            {formatAmount(Number(payment.amount), payment.currency || "USD")}
                          </p>
                          <Badge variant={getStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
