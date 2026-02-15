import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Receipt, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EXPENSE_CATEGORIES } from "./ExpenseCategories";

interface ExpenseFormProps {
  projectId?: string;
  onExpenseAdded: () => void;
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "ZAR", "NGN", "KES", "JPY", "INR", "BRL"];

export function ExpenseForm({ projectId, onExpenseAdded }: ExpenseFormProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    currency: "USD",
    category: "other",
    vendor: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    tax_deductible: false,
    is_recurring: false,
    recurring_interval: "monthly",
    payment_method: "card",
  });

  const handleAutoCategorize = async () => {
    if (!form.title) return;
    setCategorizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-finance", {
        body: { action: "categorize", expense: { title: form.title, vendor: form.vendor } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setForm(prev => ({
        ...prev,
        category: data.category || prev.category,
        tax_deductible: data.tax_deductible ?? prev.tax_deductible,
      }));
      toast.success(`Categorized as ${data.category}${data.tax_deductible ? " (tax deductible)" : ""}`);
    } catch (err: any) {
      toast.error("Auto-categorize failed");
    } finally {
      setCategorizing(false);
    }
  };

  const handleSave = async () => {
    if (!user || !form.title || !form.amount) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        project_id: projectId || null,
        title: form.title,
        amount: parseFloat(form.amount),
        currency: form.currency,
        category: form.category,
        vendor: form.vendor || null,
        date: form.date,
        notes: form.notes || null,
        tax_deductible: form.tax_deductible,
        is_recurring: form.is_recurring,
        recurring_interval: form.is_recurring ? form.recurring_interval : null,
        payment_method: form.payment_method,
      });
      if (error) throw error;
      toast.success("Expense added");
      setOpen(false);
      setForm({
        title: "", amount: "", currency: "USD", category: "other", vendor: "",
        date: new Date().toISOString().split("T")[0], notes: "", tax_deductible: false,
        is_recurring: false, recurring_interval: "monthly", payment_method: "card",
      });
      onExpenseAdded();
    } catch (err: any) {
      toast.error(err.message || "Failed to add expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 h-8 text-xs">
          <Plus className="h-3 w-3" /> Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-primary" /> New Expense
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title *</Label>
            <Input placeholder="e.g. Adobe Creative Cloud" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Amount *</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-1.5">{c.icon} {c.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} className="h-8 text-xs" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Vendor / Payee</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-primary"
                onClick={handleAutoCategorize} disabled={categorizing || !form.title}>
                {categorizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                AI Categorize
              </Button>
            </div>
            <Input placeholder="e.g. Adobe, WeWork" value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Payment Method</Label>
            <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea placeholder="Optional notes..." value={form.notes} rows={2}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} className="text-sm" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Tax Deductible</Label>
            <Switch checked={form.tax_deductible}
              onCheckedChange={(v) => setForm({ ...form, tax_deductible: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Recurring</Label>
            <Switch checked={form.is_recurring}
              onCheckedChange={(v) => setForm({ ...form, is_recurring: v })} />
          </div>
          {form.is_recurring && (
            <Select value={form.recurring_interval} onValueChange={(v) => setForm({ ...form, recurring_interval: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleSave} disabled={saving || !form.title || !form.amount} className="w-full">
            {saving ? "Saving..." : "Add Expense"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
