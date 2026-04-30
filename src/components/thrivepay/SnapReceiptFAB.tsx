import { useRef, useState } from "react";
import { Camera, Loader2, Check, X, Receipt, Sparkles, Upload, ImagePlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { recordMoneyAction } from "@/lib/moneyStreak";
import { EXPENSE_CATEGORIES, getCategoryInfo } from "@/components/project/expense/ExpenseCategories";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "ZAR", "NGN", "KES", "JPY", "INR", "BRL", "TTD", "AED"];

interface ScannedReceipt {
  title?: string;
  vendor?: string;
  amount?: number;
  currency?: string;
  date?: string;
  category?: string;
  tax_deductible?: boolean;
  notes?: string;
  line_items?: Array<{ description: string; amount: number }>;
}

/**
 * SnapReceiptFAB
 * - Tap → opens camera immediately
 * - Photo → AI scan via edge function
 * - Shows REVIEW SHEET with all fields editable + line items preview
 * - User taps "Add to expenses" → saves directly to DB
 */
export function SnapReceiptFAB() {
  const { user } = useAuth();
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const inputRef = cameraRef; // back-compat alias
  const [scanning, setScanning] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanned, setScanned] = useState<ScannedReceipt | null>(null);
  const [form, setForm] = useState({
    title: "",
    vendor: "",
    amount: "",
    currency: "USD",
    date: new Date().toISOString().split("T")[0],
    category: "other",
    tax_deductible: false,
    notes: "",
  });

  const compressImage = (f: File, maxWidth = 1200, quality = 0.7): Promise<string> =>
    new Promise((resolve, reject) => {
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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setPreviewUrl(URL.createObjectURL(file));
    setScanning(true);
    toast.loading("Reading your receipt…", { id: "snap-receipt" });
    try {
      const base64 = await compressImage(file);
      const { data, error } = await supabase.functions
        .invoke("scan-receipt", { body: { image_base64: base64 } })
        .catch((err) => ({ data: null, error: err }));

      if (error) throw error;
      if (!data || data?.error) throw new Error(data?.error || "No data extracted");

      const d = data as ScannedReceipt;
      setScanned(d);
      setForm({
        title: d.title || d.vendor || "Receipt",
        vendor: d.vendor || "",
        amount: d.amount?.toString() || "",
        currency: d.currency || "USD",
        date: d.date || new Date().toISOString().split("T")[0],
        category: d.category || "other",
        tax_deductible: d.tax_deductible ?? false,
        notes:
          d.notes ||
          (d.line_items?.length
            ? `Items: ${d.line_items.map((i) => `${i.description} (${d.currency || ""} ${i.amount})`).join(", ")}`
            : ""),
      });
      setReviewOpen(true);
      toast.success("Got it — review and add.", { id: "snap-receipt" });
    } catch (err: any) {
      toast.error(err?.message || "Couldn't read that receipt", { id: "snap-receipt" });
      setPreviewUrl(null);
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleAdd = async () => {
    if (!user) return;
    if (!form.amount || isNaN(parseFloat(form.amount))) {
      toast.error("Enter an amount");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Add a title");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        project_id: null,
        title: form.title.trim(),
        amount: parseFloat(form.amount),
        currency: form.currency,
        category: form.category,
        vendor: form.vendor || null,
        date: form.date,
        notes: form.notes || null,
        tax_deductible: form.tax_deductible,
        is_recurring: false,
        payment_method: "card",
      });
      if (error) throw error;
      recordMoneyAction("expense_added").catch(() => {});
      toast.success(`Added ${form.currency} ${form.amount} to expenses`);
      setReviewOpen(false);
      setPreviewUrl(null);
      setScanned(null);
      // Tell any open expense lists to refresh
      window.dispatchEvent(new CustomEvent("thrivepay:expense-added"));
    } catch (err: any) {
      toast.error(err?.message || "Couldn't save expense");
    } finally {
      setSaving(false);
    }
  };

  const cat = getCategoryInfo(form.category);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
        disabled={scanning}
      />

      <Button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={scanning}
        aria-label="Snap a receipt"
        className="fixed right-4 z-40 h-14 w-14 rounded-full p-0 shadow-lg shadow-primary/30 bg-primary hover:bg-primary/90"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
      >
        {scanning ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
        ) : (
          <Camera className="h-6 w-6 text-primary-foreground" />
        )}
      </Button>

      {/* Review & approve sheet */}
      <Sheet open={reviewOpen} onOpenChange={setReviewOpen}>
        <SheetContent
          side="bottom"
          className="h-[92vh] overflow-y-auto p-0 rounded-t-2xl"
        >
          <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
            <SheetHeader className="text-left space-y-1">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Review your receipt
              </SheetTitle>
              <SheetDescription className="text-xs">
                We read what we could — tweak anything, then add to expenses.
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="px-4 py-4 space-y-4 pb-32">
            {/* Receipt preview thumbnail */}
            {previewUrl && (
              <div className="rounded-xl overflow-hidden border bg-muted/30 max-h-48 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Scanned receipt"
                  className="max-h-48 object-contain"
                />
              </div>
            )}

            {/* Big amount + currency */}
            <div className="rounded-xl border bg-card p-4">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Amount</Label>
              <div className="flex items-center gap-2 mt-1">
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="w-24 h-12 text-sm font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="h-12 text-2xl font-bold"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1 h-11">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span>{c.icon}</span>
                        <span>{c.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <Label className="text-xs">What was it for?</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Adobe subscription"
                className="mt-1"
              />
            </div>

            {/* Vendor + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Vendor</Label>
                <Input
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  placeholder="—"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Tax deductible */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Tax deductible</div>
                <div className="text-[11px] text-muted-foreground">Mark as a business expense</div>
              </div>
              <Switch
                checked={form.tax_deductible}
                onCheckedChange={(v) => setForm({ ...form, tax_deductible: v })}
              />
            </div>

            {/* Line items if AI found any */}
            {scanned?.line_items && scanned.line_items.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                  Detected items
                </div>
                <ul className="space-y-1 text-sm">
                  {scanned.line_items.map((it, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="truncate pr-2">{it.description}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {form.currency} {it.amount.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sticky action bar */}
          <div
            className="fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-3 flex gap-2"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
          >
            <Button
              variant="outline"
              onClick={() => setReviewOpen(false)}
              disabled={saving}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={saving || !form.amount || !form.title.trim()}
              className="flex-1 bg-primary"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Add to expenses
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
