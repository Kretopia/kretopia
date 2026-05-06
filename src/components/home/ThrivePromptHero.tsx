import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowUp, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface RouteResponse {
  intent: "create_workspace" | "find_people" | "find_gigs" | "outreach" | "profile_epk" | "summarize" | "chat";
  workspace_type?: "podcast" | "event" | "masterclass" | "content" | "campaign" | "music" | "client" | "general" | null;
  title?: string | null;
  target_query?: string | null;
  preview: string;
}

const SUGGESTIONS = [
  "Help me launch a podcast",
  "Find me a videographer in Bali",
  "Plan my brand campaign",
  "Find paid gigs this week",
  "Draft outreach to a sponsor",
  "What's new with my projects?",
];

/**
 * ThrivePromptHero — the conversational entry point on Home.
 * "Tell Thrive what you're trying to accomplish — Thrive builds the rest."
 *
 * Routes to: workspace creation, find-people, find-gigs, outreach drafts, EPK,
 * summary view, or open chat with Thrive Copilot.
 */
export function ThrivePromptHero() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function submit(raw: string) {
    const prompt = raw.trim();
    if (!prompt || busy) return;
    if (!user) { navigate(`/auth?next=/?prompt=${encodeURIComponent(prompt)}`); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke<RouteResponse>("route-thrive-intent", {
        body: { prompt },
      });
      if (error || !data) throw error || new Error("No response");

      // Telemetry: log every routed intent (fire-and-forget)
      void (supabase as any).from("thrive_intent_logs").insert({
        user_id: user.id,
        prompt,
        intent: data.intent,
        workspace_type: data.workspace_type || null,
        routed_to: data.intent === "create_workspace" ? "desk" : data.intent,
      });

      switch (data.intent) {
        case "create_workspace": {
          // Create the project then drop into Studio
          const wt = data.workspace_type || "general";
          const title = (data.title || prompt).slice(0, 80);
          const { data: proj, error: pErr } = await supabase
            .from("projects")
            .insert({
              title,
              created_by: user.id,
              workspace_type: wt,
              status: "active",
              setup_completed: false,
              description: prompt,
            } as any)
            .select("id")
            .single();
          if (pErr || !proj) throw pErr || new Error("Could not create");
          toast({ title: data.preview });
          navigate(`/desk/${proj.id}`);
          break;
        }
        case "find_people":
          navigate(`/match?q=${encodeURIComponent(data.target_query || prompt)}`);
          break;
        case "find_gigs":
          navigate(`/opportunities?q=${encodeURIComponent(data.target_query || prompt)}`);
          break;
        case "outreach":
        case "summarize":
        case "chat":
          // Hand off to Thrive Copilot drawer with prompt prefilled
          window.dispatchEvent(new CustomEvent("thrive-copilot:open", { detail: { prompt } }));
          break;
        case "profile_epk":
          navigate("/profile/edit?focus=epk");
          break;
      }
      setText("");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Thrive couldn't read that", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function startVoice() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) return;
        // Use existing transcribe-voice-note for simple speech-to-text
        const buf = await blob.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        try {
          const { data, error } = await supabase.functions.invoke<{ transcript?: string; text?: string }>(
            "transcribe-voice-note",
            { body: { audio_base64: b64, mime_type: "audio/webm" } },
          );
          if (error) throw error;
          const transcript = (data?.transcript || data?.text || "").trim();
          if (transcript) {
            setText(transcript);
            void submit(transcript);
          }
        } catch (e: any) {
          toast({ title: "Couldn't transcribe", description: e?.message || "Try typing instead", variant: "destructive" });
        }
      };
      rec.start();
      setRecording(true);
    } catch {
      toast({ title: "Mic blocked", description: "Allow microphone access to speak to Thrive.", variant: "destructive" });
    }
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/8 via-background to-energy/5 p-5 sm:p-7">
      <div aria-hidden className="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-energy/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70">
            <Sparkles className="h-3 w-3" /> Thrive
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black leading-[1.1] tracking-tight">
          What are you trying to <span className="text-primary">create</span>?
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Tell me your goal — I'll spin up the workspace, find the right people, scout the gigs, and help you ship it.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); void submit(text); }}
          className="mt-5 group relative flex items-end gap-2 rounded-2xl border border-border/80 bg-background/90 p-2 shadow-sm focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 transition-all"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(text); }
            }}
            placeholder="Launch a podcast · Find a videographer in Bali · Plan an event…"
            rows={1}
            className="flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-muted-foreground/70 max-h-32 leading-snug"
            disabled={busy}
          />
          <button
            type="button"
            onClick={startVoice}
            aria-label={recording ? "Stop recording" : "Speak to Thrive"}
            className={cn(
              "h-10 w-10 flex items-center justify-center rounded-xl transition-colors shrink-0",
              recording ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-foreground/5 hover:bg-foreground/10 text-foreground/80",
            )}
          >
            <Mic className="h-4.5 w-4.5" />
          </button>
          <button
            type="submit"
            disabled={busy || !text.trim()}
            aria-label="Send to Thrive"
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:scale-105 shrink-0"
          >
            {busy ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <ArrowUp className="h-4.5 w-4.5" strokeWidth={2.5} />}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setText(s); void submit(s); }}
              disabled={busy}
              className="text-[11px] px-2.5 py-1 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground/75 transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {busy && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-1.5"
            >
              <Loader2 className="h-3 w-3 animate-spin" /> Thrive is figuring out the right move…
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
