import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ClaimedCredit, DraftProfile } from "./types";

interface Props {
  profile: DraftProfile;
  credits: ClaimedCredit[];
  onBack: () => void;
  redirectAfter?: string;
}

/** Step 4: capture email, send magic link, persist everything. */
export const EmailSaveStep = ({ profile, credits, onBack, redirectAfter = "/profile?claimed=true" }: Props) => {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast.error("Enter a valid email");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("claim-and-create-profile", {
        body: {
          email: e,
          profile,
          credits,
          redirect_to: `${window.location.origin}${redirectAfter}`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSent(true);
    } catch (err: any) {
      console.error("[ClaimFlow] save failed", err);
      toast.error(err?.message || "Couldn't save your profile. Try again.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold">Check your email</h2>
          <p className="text-sm text-muted-foreground px-4">
            We sent a magic link to <span className="font-semibold">{email}</span>. Tap it to land on your new profile.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Don't see it? Check spam, or wait 60 seconds before resending.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold">Save your profile</h2>
        <p className="text-sm text-muted-foreground">
          We'll send you a magic link — no password needed.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="claim-email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="claim-email"
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            onKeyDown={(ev) => ev.key === "Enter" && submit()}
            placeholder="you@studio.com"
            className="pl-9 h-12 text-base"
            disabled={sending}
            autoFocus
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onBack} size="lg" disabled={sending}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button onClick={submit} disabled={sending || !email.trim()} className="flex-1" size="lg">
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>Send magic link</>
          )}
        </Button>
      </div>

      <p className="text-[11px] text-center text-muted-foreground">
        By continuing you agree to our Terms & Privacy Policy.
      </p>
    </div>
  );
};
