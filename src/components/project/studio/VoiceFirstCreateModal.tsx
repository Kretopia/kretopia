import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, Square, Loader2, X, ArrowRight, Type, Search, Sparkles, MessageSquareText, FileEdit, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CreativeLoader } from "@/components/ui/creative-loader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { WORKSPACE_CONFIGS, type WorkspaceType } from "@/lib/workspaceConfigs";

const ACCENT = "#FF2DA1";

/** Real example prompts per workspace type — the same examples already used
 * as placeholder text, promoted to visible, tappable chips so they teach by
 * example instead of disappearing the moment someone starts typing. */
const EXAMPLE_PROMPTS: Record<WorkspaceType, string> = {
  event_production: "Bali Carnival — 2-day beach festival, Aug 2026, 5k guests, 3 stages.",
  music_project: "Debut EP — 5 tracks, summer release, lo-fi beats with vocal features.",
  brand_collab: "Spring brand launch for Acme — paid + organic across IG, TikTok, YouTube.",
  photo_shoot: "Editorial shoot — 3 looks, 2 models, studio + rooftop, deliver in 10 days.",
  video_shoot: "A 60-second product reel for Acme. Moody, fast cuts. Shoot Friday.",
  content_series: "Weekly podcast — 8 episodes, guest interviews, publish every Thursday.",
  fashion_show: "Runway show — 12 looks, 6 models, backstage roll call at 6pm.",
  commissioned_art: "Custom illustration — client portrait, digital, 2 revision rounds.",
  dj_live_gig: "3-hour opening set, house/techno, Saturday night, load-in at 8.",
  edit_job: "Color grade a 10-minute short film, deliver by next Friday.",
  general: "A 60-second product reel for Acme. Moody, fast cuts. Shoot Friday.",
};

const HOW_IT_WORKS = [
  { icon: MessageSquareText, label: "Describe it", body: "Speak or type what you're making." },
  { icon: Sparkles, label: "Kreto builds a brief", body: "AI drafts a title, summary and starter tasks." },
  { icon: FileEdit, label: "Review & edit", body: "Everything stays fully editable before it's real." },
  { icon: Rocket, label: "Launch the room", body: "Your Studio room opens, ready to work in." },
];

/** Lightweight keyword inference so the room shape matches what was said. */
function inferWorkspaceType(text: string): WorkspaceType {
  const t = (text || "").toLowerCase();
  if (/\b(podcast|episode|guest|interview show|mic|recording session)\b/.test(t)) return "content_series";
  if (/\b(event|festival|launch party|conference|gala|run sheet|venue|doors open|lineup)\b/.test(t)) return "event_production";
  if (/\b(album|ep|single|track|mix|master|release|tour|studio session|song)\b/.test(t)) return "music_project";
  if (/\b(campaign|brand|sponsor|paid social|launch.*(brand|product))\b/.test(t)) return "brand_collab";
  if (/\b(runway|fashion show|lookbook|model lineup)\b/.test(t)) return "fashion_show";
  if (/\b(dj|set|live gig|club night)\b/.test(t)) return "dj_live_gig";
  if (/\b(retouch|color grade|edit pass|audio mix)\b/.test(t)) return "edit_job";
  if (/\b(illustration|painting|commission)\b/.test(t)) return "commissioned_art";
  if (/\b(film|short film|music video|commercial spot|treatment)\b/.test(t)) return "video_shoot";
  if (/\b(photo shoot|editorial|headshot)\b/.test(t)) return "photo_shoot";
  if (/\b(shoot|reel|video|content|tiktok|instagram|youtube|carousel|post|edit)\b/.test(t)) return "content_series";
  return "general";
}

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
  const reducedMotion = useReducedMotion();

  const [mode, setMode] = useState<Mode>("prompt");
  const [showText, setShowText] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [creating, setCreating] = useState(false);
  const [brief, setBrief] = useState<ExtractedBrief | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [paymentsInvolved, setPaymentsInvolved] = useState<boolean | null>(null);
  const [trackAsCredit, setTrackAsCredit] = useState<boolean>(false);
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("general");
  const [rawInput, setRawInput] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [budget, setBudget] = useState<string>("");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<number | null>(null);

  // A review-step draft (title/summary/type/deadline/budget/payments/credit)
  // survives a refresh or an accidental close — nothing here is saved to the
  // DB until "Create". Recording audio itself is NOT persisted (can't
  // serialize a live MediaRecorder stream to sessionStorage), only the
  // brief once extracted. Same pattern as Onboarding.tsx's draft.
  const draftKey = user ? `new_room_draft:${user.id}` : null;
  const hydratedRef = useRef(false);

  // Reset on close, but restore a fresh-enough draft on open instead of
  // always starting blank.
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
      setTrackAsCredit(false);
      setWorkspaceType("general");
      setRawInput("");
      setDeadline("");
      setBudget("");
      hydratedRef.current = false;
      return;
    }
    if (!draftKey) return;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        const isFresh = draft.ts && Date.now() - draft.ts < 24 * 60 * 60 * 1000;
        if (isFresh && draft.brief?.project?.title) {
          setBrief(draft.brief);
          setSelected(new Set(draft.selected ?? []));
          setWorkspaceType(draft.workspaceType ?? "general");
          setPaymentsInvolved(draft.paymentsInvolved ?? null);
          setTrackAsCredit(!!draft.trackAsCredit);
          setDeadline(draft.deadline ?? "");
          setBudget(draft.budget ?? "");
          setMode("review");
        } else if (!isFresh) {
          sessionStorage.removeItem(draftKey);
        }
      }
    } catch { /* corrupt draft — ignore, start fresh */ }
    hydratedRef.current = true;
  }, [open, draftKey]);

  // Save the review-step draft on every relevant change.
  useEffect(() => {
    if (!hydratedRef.current || !draftKey || mode !== "review" || !brief) return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({
        ts: Date.now(),
        brief, selected: Array.from(selected), workspaceType,
        paymentsInvolved, trackAsCredit, deadline, budget,
      }));
    } catch { /* sessionStorage unavailable — draft just won't persist */ }
  }, [draftKey, mode, brief, selected, workspaceType, paymentsInvolved, trackAsCredit, deadline, budget]);

  const clearDraft = useCallback(() => {
    if (draftKey) { try { sessionStorage.removeItem(draftKey); } catch { /* ignore */ } }
  }, [draftKey]);

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
        body: { source: "audio", data_base64, mime_type: "audio/webm", workspace_type: workspaceType },
      });
      if (error) throw error;
      const result = (data ?? {}) as ExtractedBrief;
      if (!result?.project?.title) throw new Error("Couldn't catch what you said");
      setBrief(result);
      setSelected(new Set((result.deliverables ?? []).slice(0, 8).map((_, i) => i)));
      // Only auto-infer if user hadn't picked a type
      if (workspaceType === "general") {
        setWorkspaceType(inferWorkspaceType(`${result.project.title} ${result.project.summary}`));
      }
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
    setRawInput(trimmed);
    setMode("thinking");
    // If user hasn't picked a type yet, infer one before calling extract-brief
    // so the AI uses the right producer persona.
    const typeForCall: WorkspaceType =
      workspaceType !== "general" ? workspaceType : inferWorkspaceType(trimmed);
    if (typeForCall !== workspaceType) setWorkspaceType(typeForCall);
    try {
      const { data, error } = await supabase.functions.invoke("extract-brief", {
        body: { source: "text", text: trimmed, workspace_type: typeForCall },
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
          workspace_type: workspaceType,
          deal_type: paymentsInvolved ? "paid" : "personal",
          track_as_credit: trackAsCredit,
          deadline: deadline || null,
          budget: budget.trim() || null,
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

      // Scaffold default Vault folders + starter deliverables (skip tasks if AI seeded any)
      try {
        const { scaffoldProjectDefaults } = await import("@/lib/scaffoldProject");
        await scaffoldProjectDefaults({
          projectId: project.id,
          workspaceType,
          userId: user.id,
          skipTasks: picked.length > 0,
        });
      } catch (e) {
        console.warn("scaffold defaults failed", e);
      }

      try {
        const { analytics } = await import("@/lib/analytics");
        analytics.projectCreated(project.id);
      } catch {
        /* non-fatal */
      }

      toast({ title: "Studio room ready" });
      clearDraft();
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

  // This is a full-screen custom overlay, not a Radix Dialog, so it needs
  // its own Escape handling and ARIA role — neither came for free.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const fmtSec = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col" role="dialog" aria-modal="true" aria-label="New room">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-border/40">
        <span className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
          New room
        </span>
        <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Body */}
      <div className={cn(
        "flex-1 flex flex-col items-center px-6 text-center overflow-y-auto overscroll-contain",
        mode === "review" ? "justify-start py-6 pb-32" : "justify-center"
      )}>
        {mode === "prompt" && (
          <>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">
              Create a project
            </h1>
            <p className="text-sm text-muted-foreground max-w-sm mb-5">
              Kreto will help shape the workspace around your brief, team and next milestone.
            </p>

            {/* How it works — compact, explains the flow before anyone commits to it */}
            <div className="w-full max-w-lg mb-7 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {HOW_IT_WORKS.map((step, i) => {
                const StepIcon = step.icon;
                return (
                  <motion.div
                    key={step.label}
                    initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                    className="rounded-xl border border-border/60 bg-muted/20 px-2.5 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                        style={{ backgroundColor: "rgba(255,45,161,0.14)", color: ACCENT }}
                      >
                        {i + 1}
                      </span>
                      <StepIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                    </div>
                    <p className="text-[11px] font-semibold leading-tight">{step.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 hidden sm:block">
                      {step.body}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            {/* Workspace type chips — visible from the start; this is Step 1 */}
            <div className="w-full max-w-md mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                Step 1 · Choose the project type
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {(Object.keys(WORKSPACE_CONFIGS) as WorkspaceType[]).map((t) => {
                  const cfg = WORKSPACE_CONFIGS[t];
                  const Icon = cfg.icon;
                  const active = workspaceType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setWorkspaceType(t)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
              {workspaceType !== "general" && (
                <p className="mt-2 text-[11px] text-muted-foreground text-center">
                  {WORKSPACE_CONFIGS[workspaceType].description}
                </p>
              )}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Step 2 · Describe the idea
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

                {/* Example prompt — real example for the selected room type, tap to jump into text mode with it pre-filled */}
                <button
                  type="button"
                  onClick={() => {
                    setTextInput(EXAMPLE_PROMPTS[workspaceType]);
                    setShowText(true);
                  }}
                  className="mt-5 max-w-sm rounded-full border border-border/60 bg-muted/20 px-4 py-2 text-left text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors inline-flex items-center gap-2"
                >
                  <Sparkles className="h-3 w-3 shrink-0" style={{ color: ACCENT }} />
                  <span className="truncate">"{EXAMPLE_PROMPTS[workspaceType]}"</span>
                </button>
              </>
            ) : (
              <div className="w-full max-w-md space-y-3">
                {/* AI-search-styled entry surface */}
                <div
                  className="rounded-2xl border transition-shadow focus-within:shadow-lg"
                  style={{
                    borderColor: "rgba(255,45,161,0.25)",
                    boxShadow: "0 0 0 1px rgba(255,45,161,0.08)",
                  }}
                >
                  <div className="flex items-center gap-1.5 px-3.5 pt-3">
                    <Search className="h-3 w-3" style={{ color: ACCENT }} />
                    <span
                      className="text-[9px] font-semibold uppercase tracking-[0.18em]"
                      style={{ color: ACCENT }}
                    >
                      Describe your project
                    </span>
                  </div>
                  <Textarea
                    autoFocus
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={EXAMPLE_PROMPTS[workspaceType]}
                    className="min-h-[130px] text-base text-left border-0 focus-visible:ring-0 shadow-none resize-none"
                  />
                </div>

                {/* Tappable example — quick-fill, still fully editable before submit */}
                <button
                  type="button"
                  onClick={() => setTextInput(EXAMPLE_PROMPTS[workspaceType])}
                  className="w-full rounded-lg border border-dashed border-border/60 px-3 py-1.5 text-left text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  <Sparkles className="h-3 w-3 shrink-0" style={{ color: ACCENT }} />
                  <span className="truncate">Try: "{EXAMPLE_PROMPTS[workspaceType]}"</span>
                </button>

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
          <CreativeLoader
            size="lg"
            context={textInput || "studio"}
            hint="Sorting the right space for what you're making"
          />
        )}

        {mode === "review" && brief && (
          <div className="w-full max-w-md space-y-5 text-left">
            <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
              Step 3 · Kreto structured your project — review and edit
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

            {/* Workspace type — drives which Studio modules mount */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Room type
              </p>
              <p className="text-xs text-muted-foreground">
                {WORKSPACE_CONFIGS[workspaceType].description} Tap to change.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(WORKSPACE_CONFIGS) as WorkspaceType[]).map((t) => {
                  const cfg = WORKSPACE_CONFIGS[t];
                  const Icon = cfg.icon;
                  const active = workspaceType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setWorkspaceType(t)}
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border-2 transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payments involved? gate */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Money involved?
              </p>
              <p className="text-xs text-muted-foreground">
                If yes, we'll wire KrePay into the room — quotes, invoices, escrow.
                If no, we keep it clean.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentsInvolved(true)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-md text-sm font-bold border-2 transition-colors",
                    paymentsInvolved === true
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  Yes — paid work
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentsInvolved(false)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-md text-sm font-bold border-2 transition-colors",
                    paymentsInvolved === false
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  No — personal/passion
                </button>
              </div>
            </div>

            {/* Track as credit — opt-in */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Track as a credit?
              </p>
              <p className="text-xs text-muted-foreground">
                Turn on if this work is shareable — collaborators can be tagged
                and the project flows into your Stamps when finished. Leave off
                for private planning or personal notes.
              </p>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={trackAsCredit}
                  onChange={(e) => setTrackAsCredit(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-medium">
                  Yes — this is shareable work
                </span>
              </label>
            </div>

            {/* Target date + budget — optional, both real project fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Target date
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Budget (optional)
                </label>
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. $2,000"
                  className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm"
                />
              </div>
            </div>
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
              clearDraft();
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
                disabled={creating || !brief.project.title.trim() || selected.size === 0 || paymentsInvolved === null}
                className="gap-1"
              >
                Create {selected.size} selected
              </Button>
            )}
            <Button
              onClick={() => createProject(brief.deliverables?.length ? "all" : "none")}
              disabled={creating || !brief.project.title.trim() || paymentsInvolved === null}
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
