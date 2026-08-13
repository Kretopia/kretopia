/**
 * FeatureTutorialSection — the data-driven, Kreto-quality section every
 * landing feature now uses. Two-column on desktop (visual | content),
 * stacked on mobile in the exact order the charter specifies: identity →
 * visual → explanation → steps → CTA → next-step guidance. Built on the
 * `.feature-section-grid` CSS (index.css) — named grid-template-areas
 * rather than order-* tricks, so the mobile stacking order is guaranteed
 * correct instead of relying on auto-placement quirks.
 *
 * The active tutorial step lives here, not inside FeatureTutorial — so the
 * visual preview (via `renderVisual`) can react to whichever step the
 * visitor is on. FeatureTutorial is used in controlled mode.
 */
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { FeatureTutorial, type TutorialStep } from "./FeatureTutorial";
import { chapterRoman } from "./chapterRegistry";

const ACCENT = "#FF2DA1";

export interface FeatureTutorialSectionProps {
  /** Chapter registry key — always used to derive the roman numeral. */
  id: string;
  /** Set to false when this chapter's real scroll anchor lives elsewhere
   * (e.g. Search, whose anchor is the Hero section above it) — skips
   * rendering `id` as this section's own DOM id, avoiding a duplicate. */
  renderDomId?: boolean;
  /** Short feature name, e.g. "Passport". */
  kicker: string;
  /** Optional short category label shown next to the kicker, e.g. "Creative Identity". */
  categoryLabel?: string;
  title: ReactNode;
  /** Two to three plain-language sentences — what it is, why it matters. */
  description: string;
  steps: TutorialStep[];
  /** Step-reactive visual preview — an honest representation of the real feature. */
  renderVisual: (activeStep: number) => ReactNode;
  primaryCTA: { label: string; href: string };
  secondaryCTA?: { label: string; href: string };
  /** One line: what happens after the primary CTA. */
  nextStepNote: string;
  /** Flip visual/content column order on desktop. */
  reverse?: boolean;
}

export const FeatureTutorialSection = ({
  id, renderDomId = true, kicker, categoryLabel, title, description, steps, renderVisual,
  primaryCTA, secondaryCTA, nextStepNote, reverse,
}: FeatureTutorialSectionProps) => {
  const reducedMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section
      id={renderDomId ? id : undefined}
      className="landing-section relative overflow-hidden border-t border-white/[0.06]"
      style={{ backgroundColor: "#05070D" }}
      aria-labelledby={`${id}-title`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(45% 55% at ${reverse ? "25%" : "75%"} 45%, rgba(255,45,161,0.10), transparent 62%)`,
        }}
      />

      <div className="relative mx-auto max-w-[1150px]">
        <div className={`feature-section-grid ${reverse ? "feature-section-grid--reverse" : ""}`}>
          {/* 1. Feature identity */}
          <div className="fsg-identity flex items-center gap-3 flex-wrap">
            <p className="landing-eyebrow" style={{ marginBottom: 0 }}>
              {chapterRoman(id)} · {kicker}
            </p>
            {categoryLabel && (
              <span
                className="text-[9px] font-semibold uppercase tracking-[0.2em] px-2 py-0.5 rounded-full"
                style={{ color: ACCENT, backgroundColor: "rgba(255,45,161,0.12)", border: "1px solid rgba(255,45,161,0.25)" }}
              >
                {categoryLabel}
              </span>
            )}
          </div>

          {/* 4. Interactive visual preview — step-reactive */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8 }}
            className="fsg-visual w-full"
          >
            {renderVisual(activeStep)}
          </motion.div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="fsg-content"
          >
            {/* 2. Strong headline */}
            <h2 id={`${id}-title`} className="landing-h2 landing-glow">
              {title}
            </h2>

            {/* 3. Product explanation — plain language, 2-3 sentences */}
            <p className="landing-sub mt-5 max-w-xl">
              {description}
            </p>

            {/* 5. Tutorial step navigation (controlled — drives the visual) */}
            <div className="mt-8 max-w-xl">
              <FeatureTutorial
                steps={steps}
                label={`${kicker} tutorial`}
                activeStep={activeStep}
                onStepChange={setActiveStep}
              />
            </div>

            {/* 7. CTA area */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={primaryCTA.href}
                className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: ACCENT, fontFamily: "'Work Sans', sans-serif" }}
              >
                {primaryCTA.label}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              </Link>
              {secondaryCTA && (
                <Link
                  to={secondaryCTA.href}
                  className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
                  style={{ fontFamily: "'Work Sans', sans-serif" }}
                >
                  {secondaryCTA.label}
                </Link>
              )}
            </div>

            {/* 8. Next-step guidance */}
            <p className="mt-3 text-xs text-white/40" style={{ fontFamily: "'Work Sans', sans-serif" }}>
              {nextStepNote}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FeatureTutorialSection;
