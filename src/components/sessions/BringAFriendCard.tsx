// Bring-a-Friend card. Shown to RSVP'd guests. Generates a personal ?ref= link
// so when their friend RSVPs, the attribution is captured (and credits are awarded
// post-event if the friend checks in).

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Share2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { buildWarmShareMessage, logShareClick } from "@/lib/eventActions";

interface BringAFriendCardProps {
  event: {
    id: string;
    title: string;
    start_time: string;
    venue_name?: string | null;
    ticket_price?: number | null;
    ticket_currency?: string | null;
    is_ticketed?: boolean | null;
  };
  hostFirstName?: string | null;
  attendeeCount?: number;
}

export const BringAFriendCard = ({ event, hostFirstName, attendeeCount }: BringAFriendCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState<{ first_name: string | null; full_name: string | null; username: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name, full_name, username")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data as any))
      .catch?.(() => {});
  }, [user?.id]);

  const message = useMemo(
    () =>
      buildWarmShareMessage(
        {
          id: event.id,
          title: event.title,
          startTime: event.start_time,
          venueName: event.venue_name,
          ticketPrice: event.ticket_price,
          ticketCurrency: event.ticket_currency,
          isTicketed: event.is_ticketed,
          attendeeCount,
        },
        {
          hostFirstName,
          sharerFirstName: profile?.first_name || profile?.full_name?.split(" ")[0] || null,
          sharerUsername: profile?.username || null,
          isHost: false,
        }
      ),
    [event, hostFirstName, attendeeCount, profile]
  );

  if (!user) return null;

  const handleShare = async () => {
    logShareClick(event.id, "native", user.id).catch(() => {});
    if (navigator.share) {
      try {
        await navigator.share({ text: message.text, url: message.url });
      } catch {
        // user cancelled — silent
      }
    } else {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      toast({ title: "Invite copied", description: "Paste it anywhere." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    logShareClick(event.id, "copy", user.id).catch(() => {});
    await navigator.clipboard.writeText(message.url);
    setCopied(true);
    toast({ title: "Link copied", description: "Your personal invite link is on your clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Bring a +1</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Share your personal invite. The host can see who you brought.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleShare} variant="gradient" size="sm" className="flex-1 gap-2">
            <Share2 className="h-4 w-4" />
            Share invite
          </Button>
          <Button onClick={handleCopyLink} variant="outline" size="sm" className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
