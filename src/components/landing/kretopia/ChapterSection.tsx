/**
 * ChapterSection — full-bleed editorial "movie chapter" for each pillar.
 * One image. One sentence. One accent. Restrained motion.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { ComponentType } from "react";
import type { TutorialStep } from "./FeatureTutorial";
import { FeatureTutorialPanel } from "./FeatureTutorialPanel";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { analytics } from "@/lib/analytics";

export interface ChapterProps {
  index: string;        // "I", "II", "III"…
  kicker: string;       // "Passport"
  title: React.ReactNode;
  body: string;
  caption: string;
  image: string;
  accent: string;       // hex
  href: string;
  reverse?: boolean;    // flip layout
  id?: string;          // scroll-to anchor for chapter nav
  /** Interactive tutorial steps, rendered as a full-width panel below the image/text grid. */
  tutorialSteps?: TutorialStep[];
  /** Step-reactive visual preview paired with tutorialSteps in the panel. */
  tutorialVisual?: ComponentType<{ activeStep: number }>;
  /** Overrides the default "Enter {kicker}" link text. */
  ctaLabel?: string;
  /** Optional compact concept grid rendered between body copy and the CTA. */
  concepts?: { label: string; body: string }[];
  /** Optional single emphasized line rendered just above the CTA. */
  closingLine?: string;
}

export const ChapterSection = ({
  index, kicker, title, body, caption, image, accent, href, reverse, id, tutorialSteps, tutorialVisual,
  ctaLabel, concepts, closingLine,
}: ChapterProps) => {
  const reducedMotion = useReducedMotion();
  return (
    <section
      id={id}
      className="relative overflow-hidden border-t border-white/[0.05]"
      style={{ backgroundColor: "#05070D" }}
    >
      <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12 py-20 sm:py-28 lg:py-36">
        <div className={`grid lg:grid-cols-12 gap-10 lg:gap-16 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>

          {/* IMAGE */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 1.03 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.1, ease: [0.2, 0.65, 0.3, 0.95] }}
            className="lg:col-span-7 relative"
          >
            <div className="relative aspect-[4/5] sm:aspect-[5/6] lg:aspect-[4/5] overflow-hidden">
              <img
                src={image}
                alt={caption}
                width={1536}
                height={1920}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* grain */}
              <div
                aria-hidden
                className="absolute inset-0 mix-blend-overlay opacity-[0.16] pointer-events-none"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
                }}
              />
              {/* corner caption */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                <span
                  className="text-[9px] font-medium uppercase tracking-[0.28em] text-white/85"
                  style={{ fontFamily: "'Work Sans', sans-serif" }}
                >
                  {caption}
                </span>
              </div>
              {/* dissolve bottom */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-1/4"
                style={{ background: "linear-gradient(to top, #05070D, transparent)" }}
              />
            </div>
          </motion.div>

          {/* TEXT */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="lg:col-span-5"
          >
            <div className="flex items-center gap-3 mb-6">
              <span
                className="font-serif italic text-2xl pink-glow-breathe"
                style={{ color: accent }}
              >
                {index}.
              </span>
              <span
                className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/55"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                {kicker}
              </span>
            </div>

            <h2
              className="font-serif font-normal text-white leading-[0.98] tracking-[-0.02em]"
              style={{ fontSize: "clamp(2rem, 4.6vw, 4rem)" }}
            >
              {title}
              <span className="pink-glow-breathe" style={{ color: accent }}>.</span>
            </h2>

            <p
              className="mt-7 max-w-md text-base sm:text-lg leading-relaxed"
              style={{ color: "rgba(255,255,255,0.65)", fontFamily: "'Work Sans', sans-serif" }}
            >
              {body}
            </p>

            {concepts && concepts.length > 0 && (
              <div className="mt-7 grid grid-cols-2 gap-3 max-w-md">
                {concepts.map((c) => (
                  <div key={c.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1"
                      style={{ color: accent, fontFamily: "'Work Sans', sans-serif" }}
                    >
                      {c.label}
                    </p>
                    <p className="text-xs leading-snug text-white/55" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                      {c.body}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {closingLine && (
              <p
                className="mt-6 text-sm font-semibold italic"
                style={{ color: "rgba(255,255,255,0.8)", fontFamily: "'Work Sans', sans-serif" }}
              >
                {closingLine}
              </p>
            )}

            <Link
              to={href}
              onClick={() => analytics.ctaClick(`${kicker.toLowerCase()}_chapter_cta`, "landing_chapter")}
              className="group inline-flex items-center gap-2 mt-9 text-sm tracking-wide"
              style={{ fontFamily: "'Work Sans', sans-serif", color: "rgba(255,255,255,0.85)" }}
            >
              <span className="border-b border-white/30 group-hover:border-white pb-0.5 transition-colors">
                {ctaLabel ?? `Enter ${kicker}`}
              </span>
              <ArrowUpRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                style={{ color: accent }}
              />
            </Link>
          </motion.div>
        </div>

        {/* Interactive tutorial — full-width panel, immediately follows its feature */}
        {tutorialSteps && tutorialSteps.length > 0 && tutorialVisual && (
          <FeatureTutorialPanel
            steps={tutorialSteps}
            label={`${kicker} tutorial`}
            visual={tutorialVisual}
            reverse={reverse}
          />
        )}
      </div>
    </section>
  );
};

export default ChapterSection;
