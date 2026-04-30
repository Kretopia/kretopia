import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PhoneOff, Loader2, Link2, Circle, ScreenShare } from "lucide-react";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VideoCallSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  roomUrl: string | null;
  token: string | null;
  callId: string | null;
  userName: string;
  /** Optional — enables the "Copy guest link" button. */
  projectId?: string | null;
  /** Optional — direct (1:1) call id, enables guest link for that call. */
  directCallId?: string | null;
  /** Optional — extracted from room URL if missing. Used to mint guest links. */
  roomName?: string | null;
}

export const VideoCallSheet = ({
  open,
  onOpenChange,
  projectName,
  roomUrl,
  token,
  callId,
  userName,
  projectId,
  directCallId,
  roomName,
}: VideoCallSheetProps) => {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callRef = useRef<DailyCall | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    if (!open || !roomUrl || !containerRef.current) return;

    let cancelled = false;
    setJoining(true);
    startedAtRef.current = Date.now();

    const frame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "0" },
      showLeaveButton: false,
      showFullscreenButton: true,
    });
    callRef.current = frame;

    frame
      .join({ url: roomUrl, token: token || undefined, userName })
      .then(() => {
        if (!cancelled) setJoining(false);
      })
      .catch((err) => {
        console.error("[VideoCallSheet] join failed", err);
        setJoining(false);
      });

    frame.on("left-meeting", () => onOpenChange(false));
    frame.on("recording-started", () => setRecording(true));
    frame.on("recording-stopped", () => setRecording(false));
    frame.on("local-screen-share-started", () => setSharing(true));
    frame.on("local-screen-share-stopped", () => setSharing(false));

    return () => {
      cancelled = true;
      const ended = Date.now();
      const duration = startedAtRef.current
        ? Math.round((ended - startedAtRef.current) / 1000)
        : 0;

      if (callId && duration > 0) {
        const table = directCallId ? "direct_video_calls" : "project_video_calls";
        void supabase
          .from(table)
          .update({
            ended_at: new Date(ended).toISOString(),
            duration_seconds: duration,
          })
          .eq("id", callId)
          .then(({ error }) => {
            if (error) console.error("[VideoCallSheet] log end failed", error);
          });
      }

      try { frame.leave(); } catch {}
      try { frame.destroy(); } catch {}
      callRef.current = null;
    };
  }, [open, roomUrl, token, callId, userName, directCallId, onOpenChange]);

  const handleEnd = async () => {
    try { await callRef.current?.leave(); } catch {}
    onOpenChange(false);
  };

  const toggleRecording = async () => {
    try {
      if (recording) await callRef.current?.stopRecording();
      else await callRef.current?.startRecording();
    } catch (e: any) {
      toast({ title: "Recording unavailable", description: e?.message, variant: "destructive" });
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (sharing) await callRef.current?.stopScreenShare();
      else await callRef.current?.startScreenShare();
    } catch (e: any) {
      toast({ title: "Couldn't share screen", description: e?.message, variant: "destructive" });
    }
  };

  const handleCopyGuestLink = async () => {
    if (!roomUrl) return;
    setGeneratingLink(true);
    try {
      const derivedRoomName = roomName ?? roomUrl.split("/").pop() ?? "";
      const { data, error } = await supabase.functions.invoke("create-video-guest-link", {
        body: {
          project_id: projectId ?? null,
          direct_call_id: directCallId ?? null,
          room_name: derivedRoomName,
          room_url: roomUrl,
          guest_label: projectName,
        },
      });
      if (error) throw error;
      const url = `${window.location.origin}/call/${data.token}`;
      await navigator.clipboard.writeText(url);
      toast({ title: "Guest link copied", description: "Valid for 4 hours." });
    } catch (e: any) {
      toast({ title: "Couldn't create link", description: e?.message, variant: "destructive" });
    } finally {
      setGeneratingLink(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[100dvh] sm:h-[90dvh] p-0 flex flex-col bg-background"
      >
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <SheetTitle className="text-sm font-semibold truncate">
            📹 {projectName}
            {recording && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-destructive">
                <Circle className="h-2 w-2 fill-destructive" /> REC
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="relative flex-1 min-h-0 bg-black">
          <div ref={containerRef} className="absolute inset-0" />
          {joining && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Joining call…
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-3 border-t border-border shrink-0">
          <Button
            type="button"
            variant={sharing ? "default" : "outline"}
            size="sm"
            className="rounded-full gap-2"
            onClick={toggleScreenShare}
          >
            <ScreenShare className="h-4 w-4" />
            {sharing ? "Stop share" : "Share"}
          </Button>
          <Button
            type="button"
            variant={recording ? "default" : "outline"}
            size="sm"
            className="rounded-full gap-2"
            onClick={toggleRecording}
          >
            <Circle className={`h-3 w-3 ${recording ? "fill-current" : ""}`} />
            {recording ? "Stop rec" : "Record"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full gap-2"
            onClick={handleCopyGuestLink}
            disabled={generatingLink}
          >
            {generatingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Invite
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full px-5 gap-2"
            onClick={handleEnd}
          >
            <PhoneOff className="h-4 w-4" />
            End
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
