/**
 * FeatureTutorial — the one shared, interactive tutorial surface used by
 * every landing-page feature chapter. Static content (steps are authored,
 * not fetched), so there's no loading/error state to model — but every
 * interaction contract the charter asks for is real: clickable step pills,
 * keyboard (ArrowLeft/ArrowRight/Home/End), touch swipe, a visible progress
 * indicator, and full behavior under prefers-reduced-motion (no slide
 * animation, instant step swap).
 *
 * Deliberately framework-agnostic about *what* a step shows — the caller
 * passes a title/body per step and an optional small icon, so this same
 * component works for Search, Passport, Scout, Match, Studio, SoundStages,
 * Kreto and Verified Credits without a bespoke implementation per feature.
 */
import { useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const ACCENT = "#FF2DA1";
const SWIPE_THRESHOLD_PX = 40;

export interface TutorialStep {
  title: string;
  body: string;
  icon?: LucideIcon;
}

interface FeatureTutorialProps {
  steps: TutorialStep[];
  /** Announced to screen readers as the tutorial's subject, e.g. "Scout tutorial". */
  label: string;
}

export const FeatureTutorial = ({ steps, label }: FeatureTutorialProps) => {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(steps.length - 1, i)));
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0); }
    else if (e.key === "End") { e.preventDefault(); goTo(steps.length - 1); }
  };

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (dx < 0) next(); else prev();
  };

  const step = steps[index];
  const Icon = step.icon;
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  return (
    <div
      role="group"
      aria-label={label}
      aria-roledescription="tutorial"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="rounded-2xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
        border: "1px solid rgba(255,255,255,0.10)",
        outlineColor: ACCENT,
      }}
    >
      <div className="px-5 py-5 sm:px-6 sm:py-6 min-h-[132px] flex flex-col justify-center">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.24em] mb-3"
          style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Work Sans', sans-serif" }}
        >
          Step {index + 1} of {steps.length}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={reducedMotion ? false : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-3"
          >
            {Icon && (
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: "rgba(255,45,161,0.12)", border: "1px solid rgba(255,45,161,0.25)" }}
              >
                <Icon className="h-4 w-4" style={{ color: ACCENT }} aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white" style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}>
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/60" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                {step.body}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <button
          type="button"
          onClick={prev}
          disabled={isFirst}
          aria-label="Previous step"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2"
          style={{ outlineColor: ACCENT }}
        >
          <ChevronLeft className="h-4 w-4 text-white/80" aria-hidden />
        </button>

        {/* Clickable step pills — the progress indicator doubles as jump nav */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label={`${label} steps`}>
          {steps.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to step ${i + 1}: ${s.title}`}
              onClick={() => goTo(i)}
              className="h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2"
              style={{
                width: i === index ? "20px" : "6px",
                backgroundColor: i <= index ? ACCENT : "rgba(255,255,255,0.18)",
                outlineColor: ACCENT,
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          disabled={isLast}
          aria-label="Next step"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2"
          style={{ outlineColor: ACCENT }}
        >
          <ChevronRight className="h-4 w-4 text-white/80" aria-hidden />
        </button>
      </div>
    </div>
  );
};

export default FeatureTutorial;
