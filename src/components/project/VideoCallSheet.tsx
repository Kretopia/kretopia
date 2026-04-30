import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PhoneOff, Loader2 } from "lucide-react";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";

interface VideoCallSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  roomUrl: string | null;
  token: string | null;
  callId: string | null;
  userName: string;
}

export const VideoCallSheet = ({
  open,
  onOpenChange,
  projectName,
  roomUrl,
  token,
  callId,
  userName,
}: VideoCallSheetProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callRef = useRef<DailyCall | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!open || !roomUrl || !containerRef.current) return;

    let cancelled = false;
    setJoining(true);
    startedAtRef.current = Date.now();

    const frame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        width: "100%",
        height: "100%",
        border: "0",
        borderRadius: "0",
      },
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

    frame.on("left-meeting", () => {
      onOpenChange(false);
    });

    return () => {
      cancelled = true;
      const ended = Date.now();
      const duration = startedAtRef.current
        ? Math.round((ended - startedAtRef.current) / 1000)
        : 0;

      if (callId && duration > 0) {
        supabase
          .from("project_video_calls")
          .update({
            ended_at: new Date(ended).toISOString(),
            duration_seconds: duration,
          })
          .eq("id", callId)
          .then(() => {})
          .catch((e) => console.error("[VideoCallSheet] log end failed", e));
      }

      try {
        frame.leave();
      } catch {}
      try {
        frame.destroy();
      } catch {}
      callRef.current = null;
    };
  }, [open, roomUrl, token, callId, userName, onOpenChange]);

  const handleEnd = async () => {
    try {
      await callRef.current?.leave();
    } catch {}
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[100dvh] sm:h-[90dvh] p-0 flex flex-col bg-background"
      >
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <SheetTitle className="text-sm font-semibold truncate">
            📹 {projectName} — Live call
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

        <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-border shrink-0">
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full px-6 gap-2"
            onClick={handleEnd}
          >
            <PhoneOff className="h-4 w-4" />
            End call
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
