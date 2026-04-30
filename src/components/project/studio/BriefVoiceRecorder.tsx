import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BriefVoiceRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (text: string) => Promise<void> | void;
}

type Phase = "idle" | "recording" | "processing" | "review";

/**
 * Bottom-sheet recorder for "Speak the vision". Records mic audio,
 * sends it to extract-brief (audio source) which transcribes + summarises,
 * then shows an editable summary the user can confirm to save as the brief.
 */
export const BriefVoiceRecorder = ({ open, onOpenChange, onSave }: BriefVoiceRecorderProps) => {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<number | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      stopTimer();
      mediaRef.current?.stream?.getTracks().forEach((t) => t.stop());
      mediaRef.current = null;
      chunksRef.current = [];
      setPhase("idle");
      setSeconds(0);
      setDraft("");
      setSaving(false);
    }
  }, [open]);

  const startTimer = () => {
    setSeconds(0);
    tickRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  };
  const stopTimer = () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await process(blob);
      };
      rec.start();
      mediaRef.current = rec;
      setPhase("recording");
      startTimer();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Mic blocked",
        description: "Allow microphone access in your browser settings.",
        variant: "destructive",
      });
      onOpenChange(false);
    }
  };

  const stop = () => {
    stopTimer();
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    setPhase("processing");
  };

  const blobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const process = async (blob: Blob) => {
    try {
      const data_base64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke("extract-brief", {
        body: { source: "audio", data_base64, mime_type: "audio/webm" },
      });
      if (error) throw error;
      const summary =
        (data as any)?.project?.summary ||
        (data as any)?.project?.title ||
        (data as any)?.transcript ||
        "";
      if (!summary) throw new Error("Couldn't catch what you said");
      setDraft(summary);
      setPhase("review");
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Couldn't process audio",
        description: err.message ?? "Try again or type the brief.",
        variant: "destructive",
      });
      setPhase("idle");
    }
  };

  const confirm = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSave(trimmed);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Speak the vision</h3>
            <button
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {phase === "idle" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-sm text-muted-foreground text-center">
                Tap the mic, describe the project — tone, references, who it's for.
              </p>
              <button
                type="button"
                onClick={start}
                className="h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                aria-label="Start recording"
              >
                <Mic className="h-8 w-8" />
              </button>
            </div>
          )}

          {phase === "recording" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="text-3xl font-mono tabular-nums">
                {mm}:{ss}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                Listening…
              </div>
              <button
                type="button"
                onClick={stop}
                className={cn(
                  "h-20 w-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform",
                )}
                aria-label="Stop recording"
              >
                <Square className="h-7 w-7 fill-current" />
              </button>
              <p className="text-xs text-muted-foreground">Tap to stop</p>
            </div>
          )}

          {phase === "processing" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Catching the vibe…</p>
            </div>
          )}

          {phase === "review" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Here's what we heard — tweak before saving.
              </p>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[140px] text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={confirm}
                  disabled={saving || !draft.trim()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" /> Save brief
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDraft("");
                    setPhase("idle");
                  }}
                  disabled={saving}
                >
                  Redo
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
