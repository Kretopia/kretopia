import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { recordMoneyAction } from "@/lib/moneyStreak";

/**
 * SnapReceiptFAB
 * - Floating Action Button positioned above the bottom nav.
 * - Tapping opens the device camera IMMEDIATELY (no dialog first).
 * - After the photo is captured, runs the scan-receipt edge function,
 *   then dispatches a global event with the extracted data so the
 *   ExpenseForm dialog opens prefilled for the user to review & save.
 */
export function SnapReceiptFAB() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

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

    setScanning(true);
    toast.loading("Reading your receipt…", { id: "snap-receipt" });
    try {
      const base64 = await compressImage(file);
      const { data, error } = await supabase.functions
        .invoke("scan-receipt", { body: { image_base64: base64 } })
        .catch((err) => ({ data: null, error: err }));

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      recordMoneyAction("receipt_scanned").catch(() => {});

      // Open the Expense form prefilled with the extracted data
      window.dispatchEvent(
        new CustomEvent("thrivepay:add-expense", { detail: { prefill: data } })
      );

      toast.success("Got it — review and save.", { id: "snap-receipt" });
    } catch (err: any) {
      toast.error(err?.message || "Couldn't read that receipt", { id: "snap-receipt" });
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      {/* Hidden input — camera opens immediately on tap */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
        disabled={scanning}
      />

      {/* FAB — sits above bottom nav, thumb-reach friendly */}
      <Button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={scanning}
        aria-label="Snap a receipt"
        className="fixed right-4 z-40 h-14 w-14 rounded-full p-0 shadow-lg shadow-primary/30 bg-primary hover:bg-primary/90"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)",
        }}
      >
        {scanning ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
        ) : (
          <Camera className="h-6 w-6 text-primary-foreground" />
        )}
      </Button>
    </>
  );
}
