import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Loader2, Check, X, Sparkles, ImagePlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { recordMoneyAction } from "@/lib/moneyStreak";
import { EXPENSE_CATEGORIES, getCategoryInfo } from "@/components/project/expense/ExpenseCategories";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "ZAR", "NGN", "KES", "JPY", "INR", "BRL", "TTD", "AED"];

const normalizeCategory = (category?: string) => {
  const raw = category?.toLowerCase().trim();
  const aliases: Record<string, string> = {
    contractor: "contractors",
    rent: "workspace",
    utilities: "workspace",
    transport: "travel",
    transportation: "travel",
    supplies: "equipment",
  };
  const candidate = aliases[raw || ""] || raw || "other";
  return EXPENSE_CATEGORIES.some((c) => c.value === candidate) ? candidate : "other";
};

const emptyReceiptForm = () => ({
  title: "",
  vendor: "",
  amount: "",
  currency: "USD",
  date: new Date().toISOString().split("T")[0],
  category: "other",
  tax_deductible: false,
  notes: "",
});

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

interface DebugStep {
  time: string;
  message: string;
  detail?: string;
  level?: "info" | "success" | "error";
}

interface SnapReceiptFABProps {
  projectId?: string;
}

/**
 * SnapReceiptFAB
 * - Tap → opens camera immediately
 * - Photo → AI scan via edge function
 * - Shows REVIEW SHEET with all fields editable + line items preview
 * - User taps "Add to expenses" → saves directly to DB
 */
export function SnapReceiptFAB({ projectId }: SnapReceiptFABProps) {
  const { user } = useAuth();
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const pendingPickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraInputId = useId();
  const uploadInputId = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanned, setScanned] = useState<ScannedReceipt | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [form, setForm] = useState(emptyReceiptForm);

  const addDebug = (message: string, detail?: string, level: DebugStep["level"] = "info") => {
    setDebugSteps((prev) => [
      ...prev.slice(-9),
      {
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        message,
        detail: detail ? detail.slice(0, 1400) : undefined,
        level,
      },
    ]);
  };

  const formatErrorDetail = (err: unknown) => {
    if (!err) return "No error object was returned.";
    if (err instanceof Error) return `${err.name}: ${err.message}${err.stack ? `\n${err.stack.slice(0, 900)}` : ""}`;
    if (typeof err === "object") {
      try {
        return JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
      } catch {
        return String(err);
      }
    }
    return String(err);
  };

  const clearPickerTimer = () => {
    if (pendingPickerTimer.current) {
      clearTimeout(pendingPickerTimer.current);
      pendingPickerTimer.current = null;
    }
  };

  const beginPicker = (mode: "camera" | "upload") => {
    clearPickerTimer();
    setDebugOpen(true);
    setScanError(null);
    const inputReady = mode === "camera" ? Boolean(cameraRef.current) : Boolean(uploadRef.current);
    addDebug(
      mode === "camera" ? "Take photo tapped" : "Upload screenshot tapped",
      `Input ready: ${inputReady ? "yes" : "no"}. Signed in: ${user?.id ? "yes" : "no"}. Browser: ${navigator.userAgent}`,
      inputReady ? "info" : "error",
    );
    pendingPickerTimer.current = setTimeout(() => {
      addDebug(
        "No image reached the app yet",
        "If the camera/gallery did not open, the browser may have blocked the file picker, camera permission may be denied, or the picker was cancelled before a file was selected.",
        "error",
      );
    }, 4500);
  };

  useEffect(() => () => {
    clearPickerTimer();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

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

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setScanned(null);
    setScanError(null);
    setForm(emptyReceiptForm());
    setReviewOpen(true);
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
        category: normalizeCategory(d.category),
        tax_deductible: d.tax_deductible ?? false,
        notes:
          d.notes ||
          (d.line_items?.length
            ? `Items: ${d.line_items.map((i) => `${i.description} (${d.currency || ""} ${i.amount})`).join(", ")}`
            : ""),
      });
      setScanError(null);
      setReviewOpen(true);
      toast.success("Got it — review and add.", { id: "snap-receipt" });
    } catch (err: any) {
      const message = err?.message || "Couldn't read that receipt";
      setScanError(message);
      setReviewOpen(true);
      toast.error("Couldn't read it automatically — review it here.", { id: "snap-receipt" });
    } finally {
      setScanning(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (uploadRef.current) uploadRef.current.value = "";
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
        project_id: projectId || null,
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
      {/* Camera input — opens device camera on mobile */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
        disabled={scanning}
      />
      {/* Upload input — gallery / file picker (works for screenshots) */}
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        disabled={scanning}
      />

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            disabled={scanning}
            aria-label="Scan a receipt"
            className="fixed right-4 z-[60] h-14 rounded-full px-4 gap-2 shadow-lg shadow-primary/30 bg-primary hover:bg-primary/90"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
          >
            {scanning ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
            ) : (
              <Camera className="h-6 w-6 text-primary-foreground" />
            )}
            <span className="text-xs font-semibold text-primary-foreground">Scan</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          className="w-56 p-2 mr-1"
          sideOffset={8}
        >
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                cameraRef.current?.click();
                setPickerOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted text-left transition-colors"
            >
              <Camera className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium">Take photo</div>
                <div className="text-[11px] text-muted-foreground">Snap a paper receipt</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                uploadRef.current?.click();
                setPickerOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted text-left transition-colors"
            >
              <ImagePlus className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium">Upload screenshot</div>
                <div className="text-[11px] text-muted-foreground">From gallery or files</div>
              </div>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Review & approve panel */}
      {reviewOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[90]" role="presentation">
          <button
            type="button"
            aria-label="Close receipt review"
            className="absolute inset-0 bg-background/80"
            onClick={() => setReviewOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-review-title"
            className="absolute inset-x-0 bottom-0 z-[100] flex h-[92dvh] flex-col rounded-t-2xl border bg-background shadow-2xl"
          >
            <div className="shrink-0 border-b px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 text-left">
                  <h2 id="receipt-review-title" className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Review your receipt
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {scanning ? "Reading the image now — the fields will fill in here." : "Tweak anything, then add to expenses."}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setReviewOpen(false)} disabled={saving} className="h-9 w-9 shrink-0">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {previewUrl && (
                <div className="rounded-xl overflow-hidden border bg-muted/30 max-h-48 flex items-center justify-center">
                  <img src={previewUrl} alt="Scanned receipt" className="max-h-48 object-contain" />
                </div>
              )}

              {scanning && (
                <div className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Capturing the breakdown…
                </div>
              )}

              {scanError && !scanning && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  The receipt is open for review, but the automatic breakdown hit an issue. Add or correct the fields below, then save it.
                </div>
              )}

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

              <div>
                <Label className="text-xs">What was it for?</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Adobe subscription"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Vendor</Label>
                  <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="—" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Tax deductible</div>
                  <div className="text-[11px] text-muted-foreground">Mark as a business expense</div>
                </div>
                <Switch checked={form.tax_deductible} onCheckedChange={(v) => setForm({ ...form, tax_deductible: v })} />
              </div>

              {scanned?.line_items && scanned.line_items.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Detected items</div>
                  <ul className="space-y-1 text-sm">
                    {scanned.line_items.map((it, i) => (
                      <li key={i} className="flex justify-between">
                        <span className="truncate pr-2">{it.description}</span>
                        <span className="text-muted-foreground tabular-nums">{form.currency} {it.amount.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t bg-background px-4 py-3 flex gap-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}>
              <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={saving} className="flex-1">
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button onClick={handleAdd} disabled={scanning || saving || !form.amount || !form.title.trim()} className="flex-1 bg-primary">
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Add to expenses
              </Button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
