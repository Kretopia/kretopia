import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TutorialStepper } from "@/components/landing/kretopia/TutorialStepper";
import type { TutorialStep } from "@/components/landing/kretopia/FeatureTutorial";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const ACCENT = "#FF2DA1";

interface FeatureAITutorialProps {
  /** Unique per feature, e.g. "studio". Gates the auto-open-once-for-new-users behavior. */
  featureKey: string;
  /** e.g. "How Studio works" */
  label: string;
  steps: TutorialStep[];
}

/**
 * Shared "AI tutorial" affordance mounted on every overhauled feature page.
 * Reuses the actual landing-page TutorialStepper (not a re-implementation)
 * inside a forced-dark panel, so it reads as literally the same surface a
 * new user already saw on the landing page — not a themed approximation.
 * Auto-opens once per feature per browser for new users, always reachable
 * again via the small "How this works" trigger next to the page title.
 */
export function FeatureAITutorial({ featureKey, label, steps }: FeatureAITutorialProps) {
  const storageKey = `kretopia-tutorial-seen:${featureKey}`;
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) setOpen(true);
    } catch {
      /* private-browsing localStorage access can throw — skip auto-open, trigger still works */
    }
  }, [storageKey]);

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* noop */
    }
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors"
        style={{
          borderColor: "rgba(255,45,161,0.3)",
          backgroundColor: "rgba(255,45,161,0.06)",
          color: ACCENT,
        }}
      >
        <Sparkles className={reducedMotion ? "h-3 w-3" : "h-3 w-3 pink-glow-breathe"} />
        How this works
      </button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : dismiss())}>
        <DialogContent
          className="dark max-w-lg p-0 overflow-hidden border-white/10"
          style={{ backgroundColor: "#05070D" }}
        >
          <DialogTitle className="sr-only">{label}</DialogTitle>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(60% 50% at 50% 0%, rgba(255,45,161,0.12), transparent 65%)" }}
          />
          <div className="relative p-6">
            <p className="landing-eyebrow mb-1">AI-guided tour</p>
            <h2 className="landing-h2 landing-glow text-2xl mb-5">
              {label}
              <span className="pink-glow-breathe" style={{ color: ACCENT }}>.</span>
            </h2>
            <TutorialStepper steps={steps} label={label} />
            <button
              type="button"
              onClick={dismiss}
              className="cta-primary mt-6 w-full rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Got it
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FeatureAITutorial;
