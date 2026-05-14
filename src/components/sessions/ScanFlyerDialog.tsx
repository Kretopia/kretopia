import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanLine, Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface ScannedEventDetails {
  title?: string;
  description?: string;
  category?: string;
  start_date?: string | null;
  start_time?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  max_participants?: number | null;
  is_ticketed?: boolean;
  ticket_price?: number | null;
  ticket_currency?: string | null;
  external_ticket_url?: string | null;
}

interface PreparedFlyerImage {
  base64: string;
  mimeType: string;
}

interface ScanFlyerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExtracted: (details: ScannedEventDetails, flyerFile: File, flyerPreview: string) => void;
}

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

// Compress + resize image client-side to keep payloads small and fast.
// Returns base64 (no data: prefix) and MIME type.
const compressImage = (f: File, maxWidth = 1600, quality = 0.85): Promise<PreparedFlyerImage> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(f);
    const img = new Image();
    img.onload = async () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported on this device"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
        if (!blob) return reject(new Error("Could not prepare this image."));
        URL.revokeObjectURL(objectUrl);
        resolve({ base64: await blobToBase64(blob), mimeType: "image/jpeg" });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read this image file. Try a JPG or PNG."));
    };
    img.src = objectUrl;
  });

const prepareImageForScan = async (file: File): Promise<PreparedFlyerImage> => {
  try {
    return await compressImage(file);
  } catch (err) {
    // Mobile WebViews sometimes fail to decode camera/gallery files for canvas/FileReader.
    // Raw byte reading is more reliable and still lets the scanner inspect supported formats.
    console.warn("compressImage failed, sending raw file bytes:", err);
    return {
      base64: await blobToBase64(file),
      mimeType: file.type || "image/jpeg",
    };
  }
};

// Try hard to surface the real error from a Supabase Functions invoke failure.
const extractInvokeError = async (error: any): Promise<string> => {
  if (!error) return "";
  // FunctionsHttpError exposes the original Response on .context
  const ctx: Response | undefined = error.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const cloned = ctx.clone();
      const body = await cloned.json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    } catch {
      try {
        const cloned = ctx.clone();
        const text = await cloned.text();
        if (text) return text.slice(0, 240);
      } catch { /* ignore */ }
    }
  }
  return error.message || "";
};

export const ScanFlyerDialog = ({ open, onOpenChange, onExtracted }: ScanFlyerDialogProps) => {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 12MB", variant: "destructive" });
      return;
    }
    setScanning(true);
    try {
      const image_base64 = await compressImage(file).catch(async (err) => {
        // Fallback to raw base64 if canvas fails (e.g. HEIC on some browsers)
        console.warn("compressImage failed, falling back to raw base64:", err);
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1] || "");
          };
          reader.onerror = () => reject(new Error("Could not read this image file."));
          reader.readAsDataURL(file);
        });
      });

      const { data, error } = await supabase.functions.invoke("extract-event-details", {
        body: { image_base64, extract_only: true },
      });

      if (error) {
        const realMsg = await extractInvokeError(error);
        throw new Error(realMsg || "We couldn't reach the flyer scanner. Try again in a moment.");
      }
      if (data?.error) throw new Error(String(data.error));
      if (!data?.extracted) {
        throw new Error("We couldn't read enough details from this flyer. Try a clearer photo with the title, date and venue visible.");
      }

      const preview = URL.createObjectURL(file);
      onExtracted(data.extracted as ScannedEventDetails, file, preview);
      onOpenChange(false);
      toast({ title: "Flyer scanned", description: "We filled in what we could find. Review and tweak." });
    } catch (err: any) {
      const msg = err?.message || "Could not read the flyer";
      console.error("ScanFlyerDialog error:", err);
      toast({
        title: "Scan failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !scanning && onOpenChange(o)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" /> Scan a flyer
          </DialogTitle>
          <DialogDescription>
            Upload an event flyer or screenshot — we'll auto-fill the title, date, venue, ticket info and more.
          </DialogDescription>
        </DialogHeader>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="gradient"
          className="w-full gap-2"
          onClick={handlePick}
          disabled={scanning}
        >
          {scanning ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Reading flyer…</>
          ) : (
            <><Upload className="h-4 w-4" /> Choose flyer image</>
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          JPG, PNG, screenshots up to 12MB. The flyer is also used as your cover image.
        </p>
      </DialogContent>
    </Dialog>
  );
};
