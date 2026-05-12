import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { VideoCallSheet } from "@/components/project/VideoCallSheet";
import { MeetingReadySheet } from "@/components/calls/MeetingReadySheet";
import { APP_URL } from "@/lib/constants";

interface Props {
  /** Optional className for the trigger button. */
  className?: string;
  /** Render as compact icon-only button. */
  iconOnly?: boolean;
  /** Override label. */
  label?: string;
}

/**
 * Start a quick guest-friendly video call from anywhere — no chat thread or
 * project required. Creates a Daily room, generates a 4-hour guest link, opens
 * the call sheet, and shows the link so it can be copied/shared with anyone
 * (including non-users).
 */
export const QuickCallButton = ({
  className = "",
  iconOnly = false,
  label = "Start a call",
}: Props) => {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [guestLink, setGuestLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [session, setSession] = useState<{
    roomUrl: string;
    roomName: string;
    token: string;
    callId: string | null;
  } | null>(null);

  const myName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Host";

  const start = async () => {
    if (creating || !user) {
      if (!user) toast.error("Please sign in to start a call");
      return;
    }
    setCreating(true);
    try {
      // 1) Create the room (host-only — invited_user_id omitted).
      const { data, error } = await supabase.functions.invoke(
        "create-direct-video-call",
        { body: { user_name: myName } },
      );
      if (error) throw error;
      if (!data?.room_url || !data?.token) throw new Error("No room created");

      const next = {
        roomUrl: data.room_url as string,
        roomName: data.room_name as string,
        token: data.token as string,
        callId: (data.call_id as string) ?? null,
      };
      setSession(next);

      // 2) Mint a 4-hour guest link for non-users.
      const { data: linkData, error: linkErr } = await supabase.functions.invoke(
        "create-video-guest-link",
        {
          body: {
            room_name: next.roomName,
            room_url: next.roomUrl,
            direct_call_id: next.callId,
            guest_label: "Guest",
          },
        },
      );
      if (linkErr) throw linkErr;
      const url = `${APP_URL}/call/${linkData.token}`;
      setGuestLink(url);

      // 3) Open the call lobby + show the share dialog so the host can copy.
      setCallOpen(true);
      setLinkOpen(true);
    } catch (e: any) {
      console.error("[QuickCallButton]", e);
      toast.error("Couldn't start the call", {
        description: e?.message || "Please try again.",
      });
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async () => {
    if (!guestLink) return;
    try {
      await navigator.clipboard.writeText(guestLink);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — long-press to select");
    }
  };

  const nativeShare = async () => {
    if (!guestLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my ThriveIN call",
          text: "Tap to join — no signup needed:",
          url: guestLink,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      void copyLink();
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={start}
        disabled={creating}
        className={className || (iconOnly
          ? "h-9 w-9 rounded-full p-0"
          : "rounded-full gap-2")}
        size={iconOnly ? "icon" : "sm"}
        aria-label="Start a quick call"
      >
        {creating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Video className="h-4 w-4" />
        )}
        {!iconOnly && <span className="text-sm font-medium">{label}</span>}
      </Button>

      {/* Guest-link share dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite anyone to your call</DialogTitle>
            <DialogDescription>
              Share this link — guests can join without an account. Link works
              for 4 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={guestLink ?? ""}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={copyLink}
              aria-label="Copy link"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={nativeShare}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button type="button" onClick={() => setLinkOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live call sheet */}
      <VideoCallSheet
        open={callOpen}
        onOpenChange={(o) => {
          setCallOpen(o);
          if (!o) {
            setSession(null);
            setGuestLink(null);
          }
        }}
        projectName="Quick call"
        roomUrl={session?.roomUrl ?? null}
        token={session?.token ?? null}
        callId={session?.callId ?? null}
        userName={myName}
        directCallId={session?.callId ?? null}
        roomName={session?.roomName ?? null}
        lobbyCta="Start call"
      />
    </>
  );
};
