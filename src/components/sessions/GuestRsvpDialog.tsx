import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  guest_name: z.string().trim().min(1, "Name required").max(100),
  guest_email: z.string().trim().email("Invalid email").max(255),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId: string;
  eventTitle: string;
  onRsvpComplete?: () => void;
}

export const GuestRsvpDialog = ({ open, onOpenChange, eventId, eventTitle, onRsvpComplete }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ guest_name?: string; guest_email?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ guest_name: name, guest_email: email });
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors({ guest_name: fe.guest_name?.[0], guest_email: fe.guest_email?.[0] });
      return;
    }

    setLoading(true);
    try {
      // If logged in, use the standard participant flow
      if (user) {
        await supabase.from("jam_participants").upsert(
          { jam_id: eventId, user_id: user.id, status: "going" },
          { onConflict: "jam_id,user_id" }
        );
      } else {
        // Guest RSVP — upsert by (event_id, guest_email)
        const { error } = await supabase
          .from("guest_rsvps")
          .upsert(
            { event_id: eventId, guest_name: parsed.data.guest_name, guest_email: parsed.data.guest_email, status: "going" },
            { onConflict: "event_id,guest_email" }
          );
        if (error) throw error;
      }

      // Fire-and-forget confirmation email
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "event-registration-confirmation",
          recipientEmail: parsed.data.guest_email,
          idempotencyKey: `guest-rsvp-${eventId}-${parsed.data.guest_email}`,
          templateData: {
            attendeeName: parsed.data.guest_name,
            attendeeEmail: parsed.data.guest_email,
            eventTitle,
            eventUrl: `${window.location.origin}/event/${eventId}`,
            isGuest: !user,
          },
        },
      }).catch(() => {});

      onOpenChange(false);
      onRsvpComplete?.();
      navigate(`/event/${eventId}/confirmed?name=${encodeURIComponent(parsed.data.guest_name)}&email=${encodeURIComponent(parsed.data.guest_email)}`);
    } catch (err: any) {
      toast({ title: "Couldn't RSVP", description: err?.message || "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Reserve your spot</DialogTitle>
          <DialogDescription>
            Quick RSVP for <span className="font-medium text-foreground">{eventTitle}</span>. No account needed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guest-name">Full name</Label>
            <Input
              id="guest-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              autoFocus
              error={!!errors.guest_name}
              maxLength={100}
            />
            {errors.guest_name && <p className="text-xs text-destructive">{errors.guest_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest-email">Email</Label>
            <Input
              id="guest-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              error={!!errors.guest_email}
              maxLength={255}
            />
            {errors.guest_email && <p className="text-xs text-destructive">{errors.guest_email}</p>}
            <p className="text-xs text-muted-foreground">We'll send your confirmation here.</p>
          </div>

          <Button type="submit" variant="gradient" className="w-full py-6 text-base" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <><Sparkles className="h-4 w-4 mr-2" /> Confirm RSVP</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
