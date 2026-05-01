import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ringUsers } from "@/hooks/useIncomingCall";

export interface DirectCallSession {
  roomUrl: string;
  roomName: string;
  token: string;
  callId: string | null;
}

interface StartOptions {
  /** Override toast title shown when the call fails to start. */
  errorTitle?: string;
  /** Optional context label (e.g. "vibe-check", "gig-interview") for analytics/logs. */
  context?: string;
}

/**
 * Shared logic for starting a 1:1 video call with another user.
 * Used by ChatHeader (Match Vibe Check), inline VibeCheckPrompt, and
 * the gig dashboard's Quick Interview button.
 */
export const useStartDirectCall = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [starting, setStarting] = useState(false);
  const [session, setSession] = useState<DirectCallSession | null>(null);
  const [open, setOpen] = useState(false);

  const myName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Someone";

  const start = async (
    recipientId: string,
    recipientName: string,
    opts: StartOptions = {},
  ): Promise<DirectCallSession | null> => {
    if (!recipientId || starting || !user) return null;
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-direct-video-call",
        { body: { invited_user_id: recipientId, user_name: myName } },
      );
      if (error) throw error;
      if (!data?.room_url || !data?.token) throw new Error("No room");

      const next: DirectCallSession = {
        roomUrl: data.room_url,
        roomName: data.room_name,
        token: data.token,
        callId: data.call_id ?? null,
      };
      setSession(next);
      setOpen(true);

      void ringUsers([recipientId], {
        kind: "direct",
        callerId: user.id,
        callerName: myName,
        callerAvatar: user.user_metadata?.avatar_url ?? null,
        roomUrl: next.roomUrl,
        roomName: next.roomName,
        callId: next.callId,
      }).catch((err) => console.error("[useStartDirectCall] ring failed", err));

      // After 30s with no pickup, mark the call as missed so it shows in
      // history and notifies the recipient. The DB function is a no-op if
      // the call has already ended (someone picked up).
      if (next.callId) {
        const callIdToMark = next.callId;
        setTimeout(() => {
          void supabase.rpc("mark_direct_call_missed" as any, { _call_id: callIdToMark }).catch(() => {});
        }, 30_000);
      }

      return next;
    } catch (e: any) {
      console.error(`[useStartDirectCall${opts.context ? `:${opts.context}` : ""}]`, e);
      toast({
        title: opts.errorTitle || "Couldn't start call",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setStarting(false);
    }
  };

  return {
    starting,
    session,
    open,
    setOpen,
    start,
    myName,
  };
};
