/**
 * Large, step-reactive visual previews for the landing feature tutorials
 * (Verified Credits and Kreto keep their own bespoke command-surface /
 * evidence mockups instead — these six cover the ChapterSection-driven
 * features plus Search). Each one is an honest, illustrative mockup,
 * clearly labeled where the content is an example, never presented as
 * live data pulled from a real account.
 */
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, UserCheck, Rocket,
  ListChecks, FileEdit, Sparkles, Radar, Target, Bookmark,
  FolderKanban, Users, MessageCircle, Handshake,
  ClipboardList, Milestone, Banknote, DoorOpen, Video,
  UploadCloud, Share2, MapPin,
} from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { VisualCardShell } from "./visualShell";

const ACCENT = "#FF2DA1";

const fade = (reducedMotion: boolean) => ({
  initial: reducedMotion ? false : { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: reducedMotion ? undefined : { opacity: 0, y: -8 },
  transition: { duration: 0.32 },
});

/* ─── Search ─── */
export const SearchVisual = ({ activeStep }: { activeStep: number }) => {
  const reducedMotion = useReducedMotion();
  return (
    <VisualCardShell icon={Search} label="Search preview" tag="Illustrative — not live data">
      <div
        className="rounded-full px-5 py-3.5 flex items-center gap-2.5 text-[15px]"
        style={{ border: "1px solid rgba(255,45,161,0.3)", color: "rgba(255,255,255,0.85)" }}
      >
        <Search className="h-4 w-4 shrink-0" style={{ color: ACCENT }} aria-hidden />
        <span>Ethan Auguste</span>
      </div>
      <AnimatePresence mode="wait">
        {activeStep === 0 && (
          <motion.p key="s0" {...fade(reducedMotion)} className="text-sm text-white/45">
            Type a name, stage name, or project.
          </motion.p>
        )}
        {activeStep === 1 && (
          <motion.div key="s1" {...fade(reducedMotion)} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">EA</span>
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-white truncate">Ethan Auguste</p>
              <p className="text-xs text-white/45 truncate">Event Producer · Bali</p>
            </div>
          </motion.div>
        )}
        {activeStep === 2 && (
          <motion.div key="s2" {...fade(reducedMotion)} className="flex items-center justify-between rounded-xl bg-white/[0.04] p-3.5">
            <div>
              <p className="text-[15px] font-medium text-white">Unclaimed record found</p>
              <p className="text-xs text-white/45">3 credits, 0 confirmed</p>
            </div>
            <span className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: ACCENT }}>Claim</span>
          </motion.div>
        )}
        {activeStep === 3 && (
          <motion.div key="s3" {...fade(reducedMotion)} className="flex items-center gap-2 text-sm text-white/60">
            <Rocket className="h-4 w-4" style={{ color: ACCENT }} aria-hidden />
            Continue to your Passport →
          </motion.div>
        )}
      </AnimatePresence>
    </VisualCardShell>
  );
};

/* ─── Passport ─── */
export const PassportVisual = ({ activeStep }: { activeStep: number }) => {
  const reducedMotion = useReducedMotion();
  const ring = (i: number) => (activeStep === i ? { border: "1px solid rgba(255,45,161,0.5)", boxShadow: "0 0 0 3px rgba(255,45,161,0.1)" } : { border: "1px solid rgba(255,255,255,0.08)" });
  return (
    <VisualCardShell icon={UserCheck} label="Passport preview" tag="Illustrative — not live data">
      <div className="rounded-xl p-4 flex items-center gap-3.5" style={ring(0)}>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white shrink-0">EA</span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-white">Ethan Auguste</p>
          <p className="text-xs text-white/45">Event Producer · Bali</p>
        </div>
      </div>
      <div className="rounded-xl p-4" style={ring(1)}>
        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Credits</p>
        <div className="flex items-center gap-2">
          <ListChecks className="h-3.5 w-3.5" style={{ color: ACCENT }} aria-hidden />
          <span className="text-sm text-white/70">3 of 5 confirmed</span>
        </div>
      </div>
      <div className="rounded-xl p-4" style={ring(2)}>
        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Bio</p>
        <p className="text-sm text-white/60 leading-relaxed">
          "Producer focused on large-scale beach festivals across Southeast Asia..."
          <FileEdit className="h-3.5 w-3.5 inline ml-2" style={{ color: ACCENT }} aria-hidden />
        </p>
      </div>
      <AnimatePresence mode="wait">
        {activeStep === 3 && (
          <motion.div key="publish" {...fade(reducedMotion)} className="flex items-center gap-2 text-sm font-semibold" style={{ color: ACCENT }}>
            <Sparkles className="h-4 w-4" aria-hidden />
            Ready to publish
          </motion.div>
        )}
      </AnimatePresence>
    </VisualCardShell>
  );
};

/* ─── Scout ─── */
export const ScoutVisual = ({ activeStep }: { activeStep: number }) => {
  const reducedMotion = useReducedMotion();
  return (
    <VisualCardShell icon={Radar} label="Opportunity preview" tag="Illustrative — not live data">
      <div className="rounded-xl bg-white/[0.04] p-4">
        <p className="text-[15px] font-semibold text-white">Stage Manager — Beach Festival</p>
        <p className="text-xs text-white/45 mt-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />Bali · 3-day contract</p>
      </div>
      <AnimatePresence mode="wait">
        {activeStep === 1 && (
          <motion.div key="s1" {...fade(reducedMotion)} className="flex flex-wrap gap-2">
            {["Event Production", "Bali-based", "Team lead"].map((t) => (
              <span key={t} className="rounded-full px-3 py-1.5 text-[11px] font-medium" style={{ backgroundColor: "rgba(255,45,161,0.12)", color: ACCENT, border: "1px solid rgba(255,45,161,0.25)" }}>
                <Target className="h-3 w-3 inline mr-1" aria-hidden />{t}
              </span>
            ))}
          </motion.div>
        )}
        {activeStep === 2 && (
          <motion.div key="s2" {...fade(reducedMotion)} className="flex gap-2.5">
            <span className="flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white" style={{ backgroundColor: ACCENT }}>Apply</span>
            <span className="flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/70"><Bookmark className="h-3.5 w-3.5" aria-hidden />Save</span>
          </motion.div>
        )}
        {activeStep === 3 && (
          <motion.div key="s3" {...fade(reducedMotion)} className="flex items-center gap-2 text-sm text-white/60">
            <FolderKanban className="h-4 w-4" style={{ color: ACCENT }} aria-hidden />
            Becomes a Studio project once confirmed
          </motion.div>
        )}
      </AnimatePresence>
    </VisualCardShell>
  );
};

/* ─── Match ─── */
export const MatchVisual = ({ activeStep }: { activeStep: number }) => {
  const reducedMotion = useReducedMotion();
  return (
    <VisualCardShell icon={Users} label="Collaborator preview" tag="Illustrative — not live data">
      <AnimatePresence mode="wait">
        {activeStep === 0 && (
          <motion.div key="s0" {...fade(reducedMotion)} className="flex flex-wrap gap-2">
            {["Music Video", "Bali", "Editing"].map((t) => (
              <span key={t} className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/60">{t}</span>
            ))}
          </motion.div>
        )}
        {activeStep >= 1 && (
          <motion.div key="s1" {...fade(reducedMotion)} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">RK</span>
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-white truncate">Riri Kusuma</p>
              <p className="text-xs text-white/45 truncate">Shared: 2 credits, same city</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {activeStep === 2 && (
          <motion.div key="s2" {...fade(reducedMotion)} className="flex items-center gap-2 text-sm text-white/60">
            <MessageCircle className="h-4 w-4" style={{ color: ACCENT }} aria-hidden />
            "Loved your edit on..." — reference the shared project
          </motion.div>
        )}
        {activeStep === 3 && (
          <motion.div key="s3" {...fade(reducedMotion)} className="flex items-center gap-2 text-sm font-semibold" style={{ color: ACCENT }}>
            <Handshake className="h-4 w-4" aria-hidden />
            Bring them into a Studio project
          </motion.div>
        )}
      </AnimatePresence>
    </VisualCardShell>
  );
};

/* ─── Studio ─── */
export const StudioVisual = ({ activeStep }: { activeStep: number }) => {
  const reducedMotion = useReducedMotion();
  const steps = ["Brief", "Collaborators", "Milestones", "Payment"];
  return (
    <VisualCardShell icon={ClipboardList} label="Studio preview" tag="Illustrative — not live data">
      <div className="rounded-xl bg-white/[0.04] p-4">
        <p className="text-[15px] font-semibold text-white">Beach Festival — Production</p>
        <p className="text-xs text-white/45 mt-1">Event Production room</p>
      </div>
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className="h-2 w-full rounded-full transition-colors duration-300"
              style={{ backgroundColor: i <= activeStep ? ACCENT : "rgba(255,255,255,0.15)" }}
            />
            <span className="text-[10px] text-white/40">{s}</span>
          </div>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {activeStep === 1 && (
          <motion.div key="s1" {...fade(reducedMotion)} className="flex -space-x-2.5">
            {["EA", "RK", "MP"].map((i) => (
              <span key={i} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white border-2" style={{ borderColor: "#0b0e16" }}>{i}</span>
            ))}
          </motion.div>
        )}
        {activeStep === 2 && (
          <motion.div key="s2" {...fade(reducedMotion)} className="flex items-center gap-2 text-sm text-white/60">
            <Milestone className="h-4 w-4" style={{ color: ACCENT }} aria-hidden />
            2 of 4 milestones complete
          </motion.div>
        )}
        {activeStep === 3 && (
          <motion.div key="s3" {...fade(reducedMotion)} className="flex items-center gap-2 text-sm font-semibold" style={{ color: ACCENT }}>
            <Banknote className="h-4 w-4" aria-hidden />
            Invoice sent — awaiting payment
          </motion.div>
        )}
      </AnimatePresence>
    </VisualCardShell>
  );
};

/* ─── SoundStages — Speed Session and Audition stay explicitly separate ─── */
export const SoundStagesVisual = ({ activeStep }: { activeStep: number }) => {
  const reducedMotion = useReducedMotion();
  return (
    <VisualCardShell icon={DoorOpen} label="SoundStages preview" tag="Illustrative — not live data">
      <AnimatePresence mode="wait">
        {activeStep === 0 && (
          <motion.div key="s0" {...fade(reducedMotion)} className="flex gap-2.5">
            <span className="flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white" style={{ backgroundColor: ACCENT }}>Speed Session</span>
            <span className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-center text-sm text-white/70">Audition</span>
          </motion.div>
        )}
        {activeStep === 1 && (
          <motion.div key="s1" {...fade(reducedMotion)} className="flex items-center gap-2 text-sm text-white/60">
            <Video className="h-4 w-4" style={{ color: ACCENT }} aria-hidden />
            Speed Session — live now, new face every 4 minutes
          </motion.div>
        )}
        {activeStep === 2 && (
          <motion.div key="s2" {...fade(reducedMotion)} className="flex items-center gap-2 text-sm text-white/60">
            <UploadCloud className="h-4 w-4" style={{ color: ACCENT }} aria-hidden />
            Audition — submission received, host reviewing
          </motion.div>
        )}
        {activeStep === 3 && (
          <motion.div key="s3" {...fade(reducedMotion)} className="flex items-center gap-2 text-sm font-semibold" style={{ color: ACCENT }}>
            <Share2 className="h-4 w-4" aria-hidden />
            Follow up via their Passport
          </motion.div>
        )}
      </AnimatePresence>
    </VisualCardShell>
  );
};
