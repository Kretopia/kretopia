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

interface ScanFlyerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExtracted: (details: ScannedEventDetails, flyerFile: File, flyerPreview: string) => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const ScanFlyerDialog = ({ open, onOpenChange, onExtracted }: ScanFlyerDialogProps) => {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 8MB", variant: "destructive" });
      return;
    }
    setScanning(true);
    try {
      const image_base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("extract-event-details", {
        body: { image_base64 },
      });
      if (error) throw new Error(error.message || "Edge function error");
      if (data?.error) throw new Error(data.error);
      if (!data?.extracted) throw new Error("We couldn't read enough details from this flyer");
      const preview = URL.createObjectURL(file);
      onExtracted(data.extracted as ScannedEventDetails, file, preview);
      onOpenChange(false);
      toast({ title: "Flyer scanned", description: "We filled in what we could find. Review and tweak." });
    } catch (err: any) {
      const msg = err?.message || "Could not read the flyer";
      toast({
        title: "Scan failed",
        description: `${msg}. Try a clearer photo with the title, date and venue visible.`,
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
          JPG, PNG, screenshots up to 8MB. The flyer is also used as your cover image.
        </p>
      </DialogContent>
    </Dialog>
  );
};
