import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Square, Loader2, X, ArrowRight, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface VoiceFirstCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

type Mode = "prompt" | "recording" | "thinking" | "review";

interface ExtractedBrief {
  project: { title: string; summary: string };
  deliverables?: Array<{ title: string; description?: string; due_date?: string | null }>;
}

/**
 * Full-screen "What are you making?" entry. Voice-first, with a single
 * text fallback on the same screen. Uses extract-brief to seed the new
 * project's title + description.
 */
export const VoiceFirstCreateModal = ({
  open,
  onOpenChange,
  onCreated,
}: VoiceFirstCreateModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("prompt");
  const [showText, setShowText] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [creating, setCreating] = useState(false);
  const [brief, setBrief] = useState<ExtractedBrief | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [paymentsInvolved, setPaymentsInvolved] = useState<boolean | null>(null);

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
      setMode("prompt");
      setShowText(false);
      setTextInput("");
      setSeconds(0);
      setBrief(null);
      setSelected(new Set());
      setCreating(false);
      setPaymentsInvolved(null);
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

  const startRecording = async () => {
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
        await processAudio(blob);
      };
      rec.start();
      mediaRef.current = rec;
      setMode("recording");
      startTimer();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Mic not available",
        description: "Type what you're making instead.",
      });
      setShowText(true);
    }
  };

  const stopRecording = () => {
    stopTimer();
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    setMode("thinking");
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

  const processAudio = async (blob: Blob) => {
    try {
      const data_base64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke("extract-brief", {
        body: { source: "audio", data_base64, mime_type: "audio/webm" },
      });
      if (error) throw error;
      const result = (data ?? {}) as ExtractedBrief;
      if (!result?.project?.title) throw new Error("Couldn't catch what you said");
      setBrief(result);
      setSelected(new Set((result.deliverables ?? []).slice(0, 8).map((_, i) => i)));
      setMode("review");
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Couldn't process that",
        description: err.message ?? "Try typing it instead.",
        variant: "destructive",
      });
      setShowText(true);
      setMode("prompt");
    }
  };

  const submitText = async () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    setMode("thinking");
    try {
      const { data, error } = await supabase.functions.invoke("extract-brief", {
        body: { source: "text", text: trimmed },
      });
      if (error) throw error;
      const result = (data ?? {}) as ExtractedBrief;
      const finalBrief: ExtractedBrief = !result?.project?.title
        ? { project: { title: trimmed.slice(0, 60), summary: trimmed } }
        : result;
      setBrief(finalBrief);
      setSelected(new Set((finalBrief.deliverables ?? []).slice(0, 8).map((_, i) => i)));
      setMode("review");
    } catch (err: any) {
      console.error(err);
      // Don't block — let them proceed with raw text
      setBrief({
        project: {
          title: trimmed.slice(0, 60),
          summary: trimmed,
        },
      });
      setSelected(new Set());
      setMode("review");
    }
  };

  const createProject = async (mode: "all" | "selected" | "none" = "all") => {
    if (!user || !brief) return;
    setCreating(true);
    try {
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          title: brief.project.title.slice(0, 120),
          description: brief.project.summary || null,
          created_by: user.id,
          status: "active",
          workspace_type: "general",
          deal_type: paymentsInvolved ? "paid" : "personal",
          setup_completed: false,
        })
        .select()
        .single();
      if (error) throw error;

      // Pick which deliverables to seed
      const all = (brief.deliverables ?? []).slice(0, 8);
      const picked =
        mode === "all"
          ? all
          : mode === "selected"
          ? all.filter((_, i) => selected.has(i))
          : [];

      if (picked.length) {
        const rows = picked.map((d) => ({
          project_id: project.id,
          title: d.title.slice(0, 200),
          description: d.description ?? null,
          status: "todo",
          created_by: user.id,
        }));
        try {
          await supabase.from("project_tasks").insert(rows);
        } catch (e) {
          console.warn("seed tasks failed", e);
        }
      }

      try {
        const { analytics } = await import("@/lib/analytics");
        analytics.projectCreated(project.id);
      } catch {
        /* non-fatal */
      }

      toast({ title: "Studio room ready" });
      onCreated();
      onOpenChange(false);
      setTimeout(() => navigate(`/desk/${project.id}`), 80);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Couldn't open the room",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  const fmtSec = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-border/40">
        <span className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
          New room
        </span>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {mode === "prompt" && (
          <>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">
              What are you making?
            </h1>
            <p className="text-sm text-muted-foreground max-w-sm mb-10">
              Speak it out — name, vibe, who it's for. We'll set the room up around you.
            </p>

            {!showText ? (
              <>
                <button
                  type="button"
                  onClick={startRecording}
                  aria-label="Start recording"
                  className={cn(
                    "h-24 w-24 rounded-full bg-primary text-primary-foreground",
                    "flex items-center justify-center",
                    "shadow-xl ring-8 ring-primary/15",
                    "transition-transform hover:scale-105 active:scale-95"
                  )}
                >
                  <Mic className="h-9 w-9" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowText(true)}
                  className="mt-6 text-sm text-muted-foreground inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <Type className="h-3.5 w-3.5" />
                  Or type it instead
                </button>
              </>
            ) : (
              <div className="w-full max-w-md space-y-3">
                <Textarea
                  autoFocus
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="A 60-second product reel for Acme. Moody, fast cuts. Shoot Friday."
                  className="min-h-[140px] text-base text-left"
                />
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowText(false)}
                    className="text-xs text-muted-foreground inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Mic className="h-3.5 w-3.5" />
                    Use voice instead
                  </button>
                  <Button onClick={submitText} disabled={!textInput.trim()} className="gap-1">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {mode === "recording" && (
          <>
            <div className="relative mb-8">
              <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <button
                type="button"
                onClick={stopRecording}
                aria-label="Stop recording"
                className={cn(
                  "relative h-24 w-24 rounded-full bg-primary text-primary-foreground",
                  "flex items-center justify-center shadow-xl ring-8 ring-primary/15"
                )}
              >
                <Square className="h-9 w-9 fill-current" />
              </button>
            </div>
            <p className="text-2xl font-mono tabular-nums">{fmtSec(seconds)}</p>
            <p className="text-sm text-muted-foreground mt-2">Tap to stop when you're done</p>
          </>
        )}

        {mode === "thinking" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Setting up your room…</p>
          </>
        )}

        {mode === "review" && brief && (
          <div className="w-full max-w-md space-y-5 text-left">
            <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
              Here's what we caught
            </p>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Project name
              </label>
              <input
                value={brief.project.title}
                onChange={(e) =>
                  setBrief({ ...brief, project: { ...brief.project, title: e.target.value } })
                }
                className="w-full bg-transparent text-xl font-bold outline-none border-b-2 border-border focus:border-primary pb-1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                The vision
              </label>
              <Textarea
                value={brief.project.summary}
                onChange={(e) =>
                  setBrief({ ...brief, project: { ...brief.project, summary: e.target.value } })
                }
                className="min-h-[100px] text-sm"
              />
            </div>
            {brief.deliverables && brief.deliverables.length > 0 ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Starter tasks ({selected.size}/{Math.min(brief.deliverables.length, 8)})
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const all = brief.deliverables!.slice(0, 8);
                      setSelected(
                        selected.size === all.length
                          ? new Set()
                          : new Set(all.map((_, i) => i))
                      );
                    }}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    {selected.size === Math.min(brief.deliverables.length, 8)
                      ? "Clear all"
                      : "Select all"}
                  </button>
                </div>
                <ul className="space-y-1">
                  {brief.deliverables.slice(0, 8).map((d, i) => {
                    const checked = selected.has(i);
                    return (
                      <li key={i}>
                        <label className="flex items-start gap-2 py-1.5 px-1 rounded cursor-pointer hover:bg-primary/10">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = new Set(selected);
                              if (checked) next.delete(i);
                              else next.add(i);
                              setSelected(next);
                            }}
                            className="mt-0.5 h-4 w-4 accent-primary shrink-0"
                          />
                          <span className={cn("text-sm leading-snug", !checked && "text-muted-foreground line-through")}>
                            {d.title}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Pick what to seed — you can always add more inside the room.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                We couldn't pull starter tasks from that. You can add them inside the room — or tap "Start over" and give a bit more detail.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {mode === "review" && brief && (
        <div className="shrink-0 border-t border-border/40 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-2 bg-background">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setBrief(null);
              setSelected(new Set());
              setMode("prompt");
            }}
            disabled={creating}
          >
            Start over
          </Button>
          <div className="flex items-center gap-2">
            {brief.deliverables && brief.deliverables.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => createProject("selected")}
                disabled={creating || !brief.project.title.trim() || selected.size === 0}
                className="gap-1"
              >
                Create {selected.size} selected
              </Button>
            )}
            <Button
              onClick={() => createProject(brief.deliverables?.length ? "all" : "none")}
              disabled={creating || !brief.project.title.trim()}
              className="gap-1"
              size="sm"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {brief.deliverables?.length ? "Create all & open" : "Open the room"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
