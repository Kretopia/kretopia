import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Receipt, Sparkles, Loader2, Camera, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { EXPENSE_CATEGORIES } from "./ExpenseCategories";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { recordMoneyAction } from "@/lib/moneyStreak";

interface ExpenseFormProps {
  projectId?: string;
  onExpenseAdded: () => void;
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "ZAR", "NGN", "KES", "JPY", "INR", "BRL", "IDR", "TTD", "AED", "CHF"];

export function ExpenseForm({ projectId, onExpenseAdded }: ExpenseFormProps) {
  const { user } = useAuth();
  const { guard: guardExpense } = useFeatureGate("expenses");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [scanning, setScanning] = useState(false);
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

  // Listen for global "open expense" event (from ThrivePay quick-add menu / Snap FAB)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // If a Snap-Receipt prefill payload is provided, populate the form
      if (detail?.prefill) {
        const data = detail.prefill;
        setForm(prev => ({
          ...prev,
          title: data.title || prev.title,
          amount: data.amount?.toString() || prev.amount,
          currency: data.currency || prev.currency,
          category: data.category || prev.category,
          vendor: data.vendor || prev.vendor,
          date: data.date || prev.date,
          tax_deductible: data.tax_deductible ?? prev.tax_deductible,
          notes: data.notes || (data.line_items?.length
            ? `Items: ${data.line_items.map((i: any) => `${i.description} (${data.currency} ${i.amount})`).join(", ")}`
            : prev.notes),
        }));
      }
      setOpen(true);
    };
    window.addEventListener("thrivepay:add-expense", handler as EventListener);
    return () => window.removeEventListener("thrivepay:add-expense", handler as EventListener);
  }, []);

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setScanning(true);
    try {
      // Compress image before sending to reduce payload size on mobile
      const compressImage = (f: File, maxWidth = 1200, quality = 0.7): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const scale = Math.min(1, maxWidth / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas not supported"));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            resolve(dataUrl.split(",")[1]);
          };
          img.onerror = reject;
          img.src = URL.createObjectURL(f);
        });
      };

      const base64 = await compressImage(file);

      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { image_base64: base64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Auto-fill the form
      setForm(prev => ({
        ...prev,
        title: data.title || prev.title,
        amount: data.amount?.toString() || prev.amount,
        currency: data.currency || prev.currency,
        category: data.category || prev.category,
        vendor: data.vendor || prev.vendor,
        date: data.date || prev.date,
        tax_deductible: data.tax_deductible ?? prev.tax_deductible,
        notes: data.notes || (data.line_items?.length
          ? `Items: ${data.line_items.map((i: any) => `${i.description} (${data.currency} ${i.amount})`).join(", ")}`
          : prev.notes),
      }));

      recordMoneyAction("receipt_scanned");
      toast.success("Receipt scanned! Review the details below.");
    } catch (err: any) {
      toast.error(err.message || "Failed to scan receipt");
    } finally {
      setScanning(false);
      // Reset file input
      e.target.value = "";
    }
  };

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
    if (!guardExpense()) return;
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
      recordMoneyAction("expense_added");
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
          {/* Scan Receipt CTA */}
          <div className={`space-y-3 p-3 rounded-lg border-2 border-dashed transition-all ${scanning ? "border-primary bg-primary/5" : "border-border"}`}>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {scanning ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold">
                {scanning ? "Scanning receipt..." : "Scan or upload a receipt"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {scanning ? "Reading the details for review" : "Take a photo or upload a payment screenshot"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={() => cameraInputRef.current?.click()}
                disabled={scanning}
              >
                <Camera className="h-3.5 w-3.5" /> Take photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={() => uploadInputRef.current?.click()}
                disabled={scanning}
              >
                <ScanLine className="h-3.5 w-3.5" /> Upload
              </Button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              data-scan-receipt-input="true"
              className="hidden"
              onChange={handleScanReceipt}
              disabled={scanning}
            />
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScanReceipt}
              disabled={scanning}
            />
          </div>

          <div className="relative flex items-center">
            <div className="flex-1 border-t border-border" />
            <span className="px-2 text-[10px] text-muted-foreground">or enter manually</span>
            <div className="flex-1 border-t border-border" />
          </div>

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
