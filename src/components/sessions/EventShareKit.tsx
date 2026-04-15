import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Copy, Check, Share2, QrCode, Download, 
  MessageCircle, Twitter, Code2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCodeStyling from "qr-code-styling";
import { useEffect, useRef } from "react";

interface EventShareKitProps {
  event: {
    id: string;
    title: string;
    description?: string;
    start_time: string;
    venue_name?: string;
    category: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EventShareKit = ({ event, open, onOpenChange }: EventShareKitProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);

  const baseUrl = "https://www.thrivein.io";
  const eventUrl = `${baseUrl}/share/event/${event.id}/`;

  const shareText = `🎉 "${event.title}" on ThriveIN!\n\n📅 ${new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${event.venue_name ? `\n📍 ${event.venue_name}` : ''}\n\nRSVP & join here:`;

  useEffect(() => {
    if (open && qrRef.current) {
      qrCode.current = new QRCodeStyling({
        width: 200,
        height: 200,
        data: eventUrl,
        dotsOptions: { color: "#8B5CF6", type: "rounded" },
        cornersSquareOptions: { color: "#6D28D9", type: "extra-rounded" },
        backgroundOptions: { color: "#ffffff" },
        imageOptions: { crossOrigin: "anonymous" },
      });
      qrRef.current.innerHTML = '';
      qrCode.current.append(qrRef.current);
    }
  }, [open, eventUrl]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    qrCode.current?.download({ 
      name: `thrivein-event-${event.id.slice(0, 8)}`, 
      extension: "png" 
    });
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: shareText, url: eventUrl });
      } catch {}
    } else {
      copyLink();
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + eventUrl)}`, '_blank');
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(eventUrl)}`, '_blank');
  };

  const embedCode = `<iframe src="${eventUrl}?embed=1" width="400" height="500" frameborder="0" style="border-radius: 12px; max-width: 100%;"></iframe>`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Link */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Event Link</Label>
            <div className="flex gap-2">
              <Input value={eventUrl} readOnly className="text-sm" />
              <Button size="icon" variant="outline" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">QR Code</Label>
            <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-muted/50">
              <div ref={qrRef} className="rounded-lg overflow-hidden" />
              <p className="text-xs text-muted-foreground text-center">
                Print this for posters, flyers, or display at venues
              </p>
              <Button size="sm" variant="outline" onClick={downloadQR}>
                <Download className="h-4 w-4 mr-2" />
                Download QR
              </Button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Share to</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={shareNative}>
                <Share2 className="h-5 w-5" />
                <span className="text-xs">Share</span>
              </Button>
              <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={shareWhatsApp}>
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={shareTwitter}>
                <Twitter className="h-5 w-5 text-primary" />
                <span className="text-xs">X / Twitter</span>
              </Button>
            </div>
          </div>

          {/* Embed Code */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              Embed Widget
            </Label>
            <Textarea 
              value={embedCode} 
              readOnly 
              rows={3} 
              className="text-xs font-mono"
            />
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-xs"
              onClick={() => {
                navigator.clipboard.writeText(embedCode);
                toast({ title: "Embed code copied!" });
              }}
            >
              <Copy className="h-3 w-3 mr-1" /> Copy embed code
            </Button>
          </div>

          {/* Pro Tips */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs text-muted-foreground">
              <strong>Pro Tip:</strong> Share this link as your event's "entrance ticket" — 
              anyone who clicks will sign up for ThriveIN and automatically join your event!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
