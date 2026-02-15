import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  TrendingUp, TrendingDown, DollarSign, FileText, Clock,
  CheckCircle2, AlertCircle, Download, ArrowUpRight, ArrowDownLeft,
  PieChart, BarChart3, Calendar, Receipt
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";
import { toast } from "sonner";
import { ExpenseForm } from "./expense/ExpenseForm";
import { ExpenseList } from "./expense/ExpenseList";
import { SpendingAnalytics } from "./expense/SpendingAnalytics";
import { AIFinanceInsights } from "./expense/AIFinanceInsights";

interface AccountingDashboardProps {
  projectId?: string;
}

export function AccountingDashboard({ projectId }: AccountingDashboardProps) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"this_month" | "last_month" | "last_3" | "last_6" | "year" | "all">("this_month");

  useEffect(() => {
    if (user) fetchAccountingData();
  }, [user, projectId]);

  const fetchAccountingData = async () => {
    try {
      let invoiceQuery = supabase.from("invoices").select("*").eq("issued_by", user!.id).order("created_at", { ascending: false });
      if (projectId) invoiceQuery = invoiceQuery.eq("project_id", projectId);

      let paymentQuery = supabase.from("payment_history").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (projectId) paymentQuery = paymentQuery.eq("project_id", projectId);

      let expenseQuery = supabase.from("expenses").select("*").eq("user_id", user!.id).order("date", { ascending: false });
      if (projectId) expenseQuery = expenseQuery.eq("project_id", projectId);

      const [{ data: invData }, { data: payData }, { data: expData }] = await Promise.all([
        invoiceQuery, paymentQuery, expenseQuery
      ]);

      setInvoices(invData || []);
      setPayments(payData || []);
      setExpenses(expData || []);
    } catch (err) {
      console.error("Error loading accounting data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "this_month": return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last_month": return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case "last_3": return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case "last_6": return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
      case "year": return { start: new Date(now.getFullYear(), 0, 1), end: now };
      default: return null;
    }
  };

  const filteredInvoices = useMemo(() => {
    const range = getDateRange();
    if (!range) return invoices;
    return invoices.filter(inv => isWithinInterval(new Date(inv.created_at), { start: range.start, end: range.end }));
  }, [invoices, period]);

  const filteredPayments = useMemo(() => {
    const range = getDateRange();
    if (!range) return payments;
    return payments.filter(p => isWithinInterval(new Date(p.created_at), { start: range.start, end: range.end }));
  }, [payments, period]);

  const filteredExpenses = useMemo(() => {
    const range = getDateRange();
    if (!range) return expenses;
    return expenses.filter(e => isWithinInterval(new Date(e.date), { start: range.start, end: range.end }));
  }, [expenses, period]);

  const stats = useMemo(() => {
    const totalInvoiced = filteredInvoices.reduce((s, i) => s + Number(i.total_amount || i.amount || 0), 0);
    const paidInvoices = filteredInvoices.filter(i => i.status === "paid");
    const totalCollected = paidInvoices.reduce((s, i) => s + Number(i.total_amount || i.amount || 0), 0);
    const overdueInvoices = filteredInvoices.filter(i => i.status === "overdue" || (i.status !== "paid" && i.due_date && new Date(i.due_date) < new Date()));
    const overdueAmount = overdueInvoices.reduce((s, i) => s + Number(i.total_amount || i.amount || 0), 0);
    const pendingInvoices = filteredInvoices.filter(i => ["draft", "sent", "viewed"].includes(i.status));
    const pendingAmount = pendingInvoices.reduce((s, i) => s + Number(i.total_amount || i.amount || 0), 0);
    const received = filteredPayments.filter(p => p.type === "payment_received" && p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
    const sent = filteredPayments.filter(p => p.type === "payment_sent" && p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

    return {
      totalInvoiced, totalCollected, overdueAmount, pendingAmount, received, sent, totalExpenses,
      collectionRate, overdueCount: overdueInvoices.length, pendingCount: pendingInvoices.length,
      paidCount: paidInvoices.length, totalInvoiceCount: filteredInvoices.length,
    };
  }, [filteredInvoices, filteredPayments, filteredExpenses]);

  const monthlyRevenue = useMemo(() => {
    const months: Record<string, { invoiced: number; collected: number; payments: number }> = {};
    filteredInvoices.forEach(inv => {
      const key = format(new Date(inv.created_at), "yyyy-MM");
      if (!months[key]) months[key] = { invoiced: 0, collected: 0, payments: 0 };
      months[key].invoiced += Number(inv.total_amount || inv.amount || 0);
      if (inv.status === "paid") months[key].collected += Number(inv.total_amount || inv.amount || 0);
    });
    filteredPayments.forEach(p => {
      if (p.type === "payment_received" && p.status === "completed") {
        const key = format(new Date(p.created_at), "yyyy-MM");
        if (!months[key]) months[key] = { invoiced: 0, collected: 0, payments: 0 };
        months[key].payments += Number(p.amount);
      }
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredInvoices, filteredPayments]);

  const exportCSV = () => {
    const rows = [
      ["Date", "Type", "Description", "Category", "Status", "Amount", "Currency"],
      ...filteredInvoices.map(inv => [
        format(new Date(inv.created_at), "yyyy-MM-dd"), "Invoice",
        inv.recipient_name || "Client", "", inv.status,
        Number(inv.total_amount || inv.amount || 0).toFixed(2), inv.currency || "USD"
      ]),
      ...filteredPayments.map(p => [
        format(new Date(p.created_at), "yyyy-MM-dd"), p.type,
        p.description || "", "", p.status, Number(p.amount).toFixed(2), p.currency
      ]),
      ...filteredExpenses.map(e => [
        e.date, "Expense", e.title, e.category, e.status,
        `-${Number(e.amount).toFixed(2)}`, e.currency
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `accounting-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Report exported as CSV");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Accounting
          </h2>
          <p className="text-sm text-muted-foreground">
            {projectId ? "Project financial overview" : "Your complete financial overview"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3">Last 3 Months</SelectItem>
              <SelectItem value="last_6">Last 6 Months</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <ExpenseForm projectId={projectId} onExpenseAdded={fetchAccountingData} />
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={exportCSV}>
            <Download className="h-3 w-3" /> Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardDescription className="text-[10px] uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Total Invoiced
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold">${stats.totalInvoiced.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">{stats.totalInvoiceCount} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardDescription className="text-[10px] uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" /> Collected
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-green-600">${stats.totalCollected.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">{stats.paidCount} paid • {stats.collectionRate.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardDescription className="text-[10px] uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-red-500" /> Expenses
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-red-600">${stats.totalExpenses.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">{filteredExpenses.length} tracked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardDescription className="text-[10px] uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-primary" /> Net Profit
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className={`text-xl font-bold ${(stats.totalCollected - stats.totalExpenses) >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${(stats.totalCollected - stats.totalExpenses).toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground">Collected − Expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardDescription className="text-[10px] uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-amber-500" /> Outstanding
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-amber-600">${stats.pendingAmount.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">{stats.pendingCount} pending • {stats.overdueCount} overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Overview / Expenses / Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs gap-1"><FileText className="h-3 w-3" /> Overview</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs gap-1"><Receipt className="h-3 w-3" /> Expenses</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs gap-1"><PieChart className="h-3 w-3" /> Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Monthly Revenue */}
          {monthlyRevenue.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Monthly Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {monthlyRevenue.map(([month, data]) => {
                    const maxVal = Math.max(...monthlyRevenue.map(([, d]) => d.invoiced), 1);
                    return (
                      <div key={month} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-16 shrink-0 font-mono">
                          {format(new Date(month + "-01"), "MMM yy")}
                        </span>
                        <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/30 rounded-full relative"
                            style={{ width: `${(data.invoiced / maxVal) * 100}%` }}>
                            <div className="h-full bg-primary rounded-full"
                              style={{ width: data.invoiced > 0 ? `${(data.collected / data.invoiced) * 100}%` : "0%" }} />
                          </div>
                        </div>
                        <div className="text-right w-24 shrink-0">
                          <p className="text-xs font-medium">${data.collected.toFixed(0)}</p>
                          <p className="text-[10px] text-muted-foreground">of ${data.invoiced.toFixed(0)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-primary inline-block" /> Collected</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-primary/30 inline-block" /> Invoiced</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" /> Recent Transactions
              </CardTitle>
              <CardDescription className="text-xs">Invoices, payments & expenses</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredInvoices.length === 0 && filteredPayments.length === 0 && filteredExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No transactions for this period</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ...filteredInvoices.map(inv => ({
                        date: inv.created_at, type: "invoice" as const,
                        desc: `${inv.invoice_number} — ${inv.recipient_name || "Client"}`,
                        status: inv.status, amount: Number(inv.total_amount || inv.amount || 0),
                        currency: inv.currency || "USD", isIncome: true,
                      })),
                      ...filteredPayments.map(p => ({
                        date: p.created_at, type: p.type as string,
                        desc: p.description || p.type.replace(/_/g, " "),
                        status: p.status, amount: Number(p.amount),
                        currency: p.currency, isIncome: p.type === "payment_received",
                      })),
                      ...filteredExpenses.map(e => ({
                        date: e.date, type: "expense" as const,
                        desc: e.title + (e.vendor ? ` (${e.vendor})` : ""),
                        status: e.status, amount: Number(e.amount),
                        currency: e.currency, isIncome: false,
                      }))
                    ]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 25)
                      .map((tx, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(tx.date), "MMM d")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {tx.type === "invoice" ? (
                                <FileText className="h-3 w-3 text-primary" />
                              ) : tx.type === "expense" ? (
                                <Receipt className="h-3 w-3 text-red-500" />
                              ) : tx.isIncome ? (
                                <ArrowDownLeft className="h-3 w-3 text-green-500" />
                              ) : (
                                <ArrowUpRight className="h-3 w-3 text-red-500" />
                              )}
                              <span className="text-xs capitalize">{tx.type.replace(/_/g, " ")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{tx.desc}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[9px] ${
                              tx.status === "paid" || tx.status === "completed" || tx.status === "confirmed" ? "text-green-600" :
                              tx.status === "overdue" || tx.status === "failed" ? "text-red-600" :
                              "text-muted-foreground"
                            }`}>
                              {tx.status}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-xs text-right font-medium ${tx.isIncome ? "text-green-600" : "text-red-600"}`}>
                            {tx.isIncome ? "+" : "-"}${tx.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" /> All Expenses
              </CardTitle>
              <CardDescription className="text-xs">{filteredExpenses.length} expenses in selected period</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ExpenseList expenses={filteredExpenses} onRefresh={fetchAccountingData} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <AIFinanceInsights expenses={filteredExpenses} invoices={filteredInvoices} />
          <SpendingAnalytics expenses={filteredExpenses} income={stats.totalCollected} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
