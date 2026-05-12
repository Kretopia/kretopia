import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreativeLoader } from "@/components/ui/creative-loader";
import { Loader2, Ticket, Calendar, MapPin, Navigation, CalendarPlus, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import QRCodeStyling from "qr-code-styling";
import { SEO } from "@/components/SEO";

/**
 * Public guest boarding pass.
 * Token comes via URL — the token IS the credential, no auth required.
 * Pattern: /event/:eventId/pass?token=...&name=...
 */
const GuestPass = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const guestName = params.get("name") || "";

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!eventId) return;
    supabase
      .from("creative_jams")
      .select("id, title, start_time, end_time, venue_name, venue_address, cover_image_url")
      .eq("id", eventId)
      .maybeSingle()
      .then(({ data }) => {
        setEvent(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    if (!token || !qrRef.current) return;
    qrRef.current.innerHTML = "";
    const qr = new QRCodeStyling({
      width: 240,
      height: 240,
      data: token,
      dotsOptions: { color: "#0F172A", type: "rounded" },
      cornersSquareOptions: { color: "#5B6BF5", type: "extra-rounded" },
      backgroundOptions: { color: "#ffffff" },
    });
    qr.append(qrRef.current);
  }, [token]);

  const buildIcs = () => {
    if (!event) return;
    const dt = (s: string) => new Date(s).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const end = event.end_time || new Date(new Date(event.start_time).getTime() + 2 * 60 * 60 * 1000).toISOString();
    const loc = [event.venue_name, event.venue_address].filter(Boolean).join(", ");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ThriveIN//Event//EN",
      "BEGIN:VEVENT",
      `UID:${event.id}@thrivein.io`,
      `DTSTAMP:${dt(new Date().toISOString())}`,
      `DTSTART:${dt(event.start_time)}`,
      `DTEND:${dt(end)}`,
      `SUMMARY:${(event.title || "").replace(/\n/g, " ")}`,
      loc ? `LOCATION:${loc.replace(/\n/g, " ")}` : "",
      "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${(event.title || "event").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><CreativeLoader size="page" /></div>;
  }

  if (!event || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <div>
          <p className="text-muted-foreground">
            {!event ? "Event not found." : "No pass token in this link."}
          </p>
          {eventId && (
            <Link to={`/event/${eventId}`}>
              <Button variant="outline" className="mt-4">View event</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const directionsHref = event.venue_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_address)}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`Your pass · ${event.title}`} description="Show this at the door" />

      <div className="max-w-md mx-auto px-4 py-6 sm:py-10">
        <Link to={`/event/${eventId}/confirmed`} className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <Card className="overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-90">
              <Ticket className="h-3.5 w-3.5" /> Your pass
            </div>
            <h1 className="text-xl font-bold mt-1 leading-tight">{event.title}</h1>
            {guestName && <p className="text-sm opacity-90 mt-0.5">{guestName}</p>}
          </div>

          {/* Perforated edge */}
          <div className="relative h-3 bg-card">
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background" />
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background" />
            <div className="border-t border-dashed border-border mx-3 mt-1.5" />
          </div>

          {/* QR */}
          <div className="px-5 pb-5 pt-3 bg-card">
            <div className="flex flex-col items-center">
              <div className="rounded-xl border-2 border-border bg-white p-3" ref={qrRef} />
              <p className="mt-3 text-sm text-muted-foreground text-center">
                Show this to the host at the door
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/80 font-mono tracking-wide">
                {token.slice(0, 8)}…{token.slice(-4)}
              </p>
            </div>

            {/* Event meta */}
            <div className="mt-5 space-y-2.5 pt-4 border-t border-dashed border-border">
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">
                  {format(new Date(event.start_time), "EEE, MMM d · h:mm a")}
                </span>
              </div>
              {event.venue_name && (
                <div className="flex items-start gap-2.5 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">{event.venue_name}</div>
                    {event.venue_address && <div className="text-muted-foreground text-xs">{event.venue_address}</div>}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-5">
              <Button onClick={buildIcs} variant="secondary" size="sm">
                <CalendarPlus className="h-4 w-4 mr-1.5" /> Calendar
              </Button>
              {directionsHref ? (
                <a href={directionsHref} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm" className="w-full">
                    <Navigation className="h-4 w-4 mr-1.5" /> Directions
                  </Button>
                </a>
              ) : (
                <Button variant="secondary" size="sm" disabled>
                  <Navigation className="h-4 w-4 mr-1.5" /> Directions
                </Button>
              )}
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Save this page or screenshot the QR — no signal at the door? No problem.
        </p>
      </div>
    </div>
  );
};

export default GuestPass;
