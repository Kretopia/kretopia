import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PhoneOff, Loader2, Link2, Circle, ScreenShare, X } from "lucide-react";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { APP_URL } from "@/lib/constants";

interface VideoCallSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  roomUrl: string | null;
  token: string | null;
  callId: string | null;
  userName: string;
  projectId?: string | null;
  directCallId?: string | null;
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
    try { callRef.current?.destroy(); } catch {}
    callRef.current = null;
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
      const url = `${APP_URL}/call/${data.token}`;
      await navigator.clipboard.writeText(url);
      toast({
        title: "Guest link copied",
        description: "Share with clients or collaborators — valid for 4 hours.",
      });
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
        hideClose
        className="h-[100dvh] sm:h-[92dvh] p-0 flex flex-col bg-[#0b0b0f] border-t-0 gap-0"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 bg-[#0b0b0f]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-base">📹</span>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {projectName}
              </p>
              <p className="text-[11px] text-white/50 leading-tight flex items-center gap-1.5">
                {recording ? (
                  <>
                    <Circle className="h-2 w-2 fill-destructive text-destructive" />
                    <span className="text-destructive font-medium">Recording</span>
                  </>
                ) : joining ? (
                  "Connecting…"
                ) : (
                  "Live call"
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleEnd}
            aria-label="Close call"
            className="h-9 w-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/80 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Video area */}
        <div className="relative flex-1 min-h-0 bg-black">
          <div ref={containerRef} className="absolute inset-0" />
          {joining && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-white/80">Connecting to the room…</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div
          className="px-3 pt-3 border-t border-white/5 bg-[#0b0b0f] shrink-0"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
        >
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleScreenShare}
              className={`rounded-full gap-2 h-10 px-4 border border-white/10 ${
                sharing
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent"
                  : "bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              <ScreenShare className="h-4 w-4" />
              <span className="text-sm font-medium">{sharing ? "Stop" : "Share"}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleRecording}
              className={`rounded-full gap-2 h-10 px-4 border border-white/10 ${
                recording
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
                  : "bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              <Circle className={`h-3 w-3 ${recording ? "fill-current" : ""}`} />
              <span className="text-sm font-medium">{recording ? "Stop" : "Record"}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyGuestLink}
              disabled={generatingLink}
              className="rounded-full gap-2 h-10 px-4 border border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              {generatingLink ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">Invite</span>
            </Button>

            <Button
              type="button"
              onClick={handleEnd}
              className="rounded-full gap-2 h-11 px-6 bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg"
            >
              <PhoneOff className="h-4 w-4" />
              <span className="text-sm font-semibold">End</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
