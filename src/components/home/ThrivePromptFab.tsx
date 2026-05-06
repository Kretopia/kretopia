import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowUp, Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * Universal floating Thrive prompt — appears on every page (except auth/landing/desk-room
 * where the in-room copilot already exists). Tap to expand into a textarea.
 */
const HIDE_ON = ["/auth", "/login", "/landing", "/", "/onboarding", "/desk/"];

export function ThrivePromptFab() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const hidden = !user || HIDE_ON.some((p) => p === "/" ? location.pathname === "/" : location.pathname.startsWith(p));

  useEffect(() => {
    if (open && taRef.current) taRef.current.focus();
  }, [open]);

  if (hidden) return null;

  async function submit(raw: string) {
    const prompt = raw.trim();
    if (!prompt || busy || !user) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke<any>("route-thrive-intent", { body: { prompt } });
      if (error || !data) throw error || new Error("No response");

      // Telemetry (fire-and-forget)
      void (supabase as any).from("thrive_intent_logs").insert({
        user_id: user.id,
        prompt,
        intent: data.intent,
        workspace_type: data.workspace_type || null,
        routed_to: data.intent === "create_workspace" ? "desk" : data.intent,
      });

      switch (data.intent) {
        case "create_workspace": {
          const wt = data.workspace_type || "general";
          const title = (data.title || prompt).slice(0, 80);
          const { data: proj, error: pErr } = await supabase
            .from("projects")
            .insert({ title, created_by: user.id, workspace_type: wt, status: "active", setup_completed: false, description: prompt } as any)
            .select("id").single();
          if (pErr || !proj) throw pErr || new Error("Could not create");
          toast({ title: data.preview });
          navigate(`/desk/${proj.id}`);
          break;
        }
        case "find_people":
          navigate(`/match?q=${encodeURIComponent(data.target_query || prompt)}`); break;
        case "find_gigs":
          navigate(`/opportunities?q=${encodeURIComponent(data.target_query || prompt)}`); break;
        case "outreach":
        case "summarize":
        case "chat":
          window.dispatchEvent(new CustomEvent("thrive-copilot:open", { detail: { prompt } })); break;
        case "profile_epk":
          navigate("/profile/edit?focus=epk"); break;
      }
      setText("");
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Thrive couldn't read that", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function startVoice() {
    if (recording) { recorderRef.current?.stop(); return; }
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
        const buf = await blob.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        try {
          const { data, error } = await supabase.functions.invoke<any>("transcribe-voice-note", {
            body: { audio_base64: b64, mime_type: "audio/webm" },
          });
          if (error) throw error;
          const transcript = (data?.transcript || data?.text || "").trim();
          if (transcript) { setText(transcript); void submit(transcript); }
        } catch (e: any) {
          toast({ title: "Couldn't transcribe", description: e?.message, variant: "destructive" });
        }
      };
      rec.start();
      setRecording(true);
    } catch {
      toast({ title: "Mic blocked", variant: "destructive" });
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed inset-x-3 bottom-24 z-[60] sm:right-6 sm:left-auto sm:bottom-24 sm:w-[420px]"
          >
            <div className="rounded-2xl border border-border/80 bg-background shadow-xl p-2.5">
              <div className="flex items-center justify-between px-1 pb-1.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/70">
                  <Sparkles className="h-3 w-3 text-primary" /> Ask Thrive
                </span>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); void submit(text); }} className="flex items-end gap-2">
                <textarea
                  ref={taRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(text); } }}
                  placeholder="Find a videographer · Draft sponsor email · Plan an event…"
                  rows={2}
                  disabled={busy}
                  className="flex-1 resize-none bg-foreground/5 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 max-h-32"
                />
                <div className="flex flex-col gap-1.5">
                  <button type="button" onClick={startVoice}
                    className={cn("h-9 w-9 rounded-lg flex items-center justify-center", recording ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-foreground/5 hover:bg-foreground/10")}>
                    <Mic className="h-4 w-4" />
                  </button>
                  <button type="submit" disabled={busy || !text.trim()}
                    className="h-9 w-9 rounded-lg flex items-center justify-center bg-primary text-primary-foreground disabled:opacity-40">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-24 z-[55] h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform sm:right-6"
          aria-label="Ask Thrive"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
