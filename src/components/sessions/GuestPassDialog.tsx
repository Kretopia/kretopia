import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import QRCodeStyling from "qr-code-styling";
import { Loader2, Ticket, Check, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";

interface GuestPassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  startTime: string;
  venueName?: string | null;
  userId: string;
  guestName?: string | null;
}

/**
 * Boarding-pass style screen guests show at the door.
 * Familiar UX for non-tech users — looks like a flight ticket.
 */
export const GuestPassDialog = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  startTime,
  venueName,
  userId,
  guestName,
}: GuestPassDialogProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("jam_participants")
      .select("check_in_token, checked_in_at")
      .eq("jam_id", eventId)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setToken(data?.check_in_token || null);
        setCheckedIn(!!data?.checked_in_at);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, eventId, userId]);

  useEffect(() => {
    if (!token || !qrRef.current || !open) return;
    qrRef.current.innerHTML = "";
    qrCode.current = new QRCodeStyling({
      width: 220,
      height: 220,
      data: token,
      dotsOptions: { color: "#0F172A", type: "rounded" },
      cornersSquareOptions: { color: "#5B6BF5", type: "extra-rounded" },
      backgroundOptions: { color: "#ffffff" },
    });
    qrCode.current.append(qrRef.current);
  }, [token, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Your event pass</DialogTitle>
        </DialogHeader>

        {/* Header strip */}
        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-5 pb-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-90">
            <Ticket className="h-3.5 w-3.5" /> Your pass
          </div>
          <h2 className="text-lg font-bold mt-1 leading-tight">{eventTitle}</h2>
          {guestName && <p className="text-sm opacity-90 mt-0.5">{guestName}</p>}
        </div>

        {/* Perforated edge */}
        <div className="relative h-3 bg-card">
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background" />
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background" />
          <div className="border-t border-dashed border-border mx-3 mt-1.5" />
        </div>

        {/* Body */}
        <div className="px-5 pb-5 pt-2 bg-card">
          {/* QR */}
          <div className="flex flex-col items-center">
            {loading ? (
              <div className="h-[220px] w-[220px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : token ? (
              <>
                <div className="rounded-xl border-2 border-border bg-white p-3" ref={qrRef} />
                {checkedIn ? (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-green-600">
                    <Check className="h-4 w-4" /> You're checked in
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground text-center">
                    Show this to the host at the door
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                We couldn't find your pass. Try refreshing the event.
              </p>
            )}
          </div>

          {/* Event meta */}
          <div className="mt-5 space-y-2.5 pt-4 border-t border-dashed border-border">
            <div className="flex items-center gap-2.5 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">
                {format(new Date(startTime), "EEE, MMM d · h:mm a")}
              </span>
            </div>
            {venueName && (
              <div className="flex items-center gap-2.5 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{venueName}</span>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full mt-5"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
