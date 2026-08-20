/**
 * CinematicHeaderPlate — the shared render core behind FeaturePageHeader and
 * EditorialPageHero. Both components wrap this with their own outer element
 * and backdrop layers (aurora/grid/grain) and pass through their own extras
 * (tutorial trigger, tabs, children) via `cornerSlot`/`footer` — but the
 * eyebrow pill, title, subtitle and reveal motion render from exactly one
 * place now, instead of being duplicated between the two files. See
 * TITLE_ANIMATION_AUDIT.md for why this split existed and was normalized:
 * the two components previously had identical motion timing but diverging
 * container width (1024px vs 1100px) and vertical padding.
 */
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const ACCENT = "#FF2DA1";

export interface CinematicHeaderPlateProps {
  eyebrow: string;
  title: ReactNode;
  accentTitle?: ReactNode;
  subtitle?: string;
  /** Centre the whole block (default) or keep it left-aligned. */
  align?: "left" | "center";
  /** Keep title + accent on a single line (auto-scaled to fit). Default true — every
   *  feature-page title stays on one line; only the landing page's own hero (which
   *  doesn't use this component) keeps the multi-line word-stagger treatment. */
  oneLine?: boolean;
  /** Absolutely-positioned extra (eg. a tutorial trigger) anchored to this plate's own container. */
  cornerSlot?: ReactNode;
  /** Content below the subtitle (tabs, search bar, CTA row) -- renders outside the title's own fade-up so it's immediately interactive. */
  footer?: ReactNode;
}

export function CinematicHeaderPlate({
  eyebrow, title, accentTitle, subtitle, align = "center", oneLine = true, cornerSlot, footer,
}: CinematicHeaderPlateProps) {
  const reducedMotion = useReducedMotion();
  const centered = align === "center";

  return (
    <div className="relative container mx-auto max-w-5xl px-4 pt-10 pb-8 sm:pt-14 sm:pb-12">
      {cornerSlot}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: [0.2, 0.65, 0.3, 0.95] }}
        className={centered ? "flex flex-col items-center gap-4 text-center" : "flex flex-col gap-4"}
      >
        <div className={`flex flex-col w-full ${centered ? "items-center" : ""}`}>
          <p
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 mb-6"
            style={{ borderColor: "rgba(255,45,161,0.3)", backgroundColor: "rgba(255,45,161,0.06)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full ai-ambient-breathe" style={{ backgroundColor: ACCENT }} />
            <span className="landing-eyebrow" style={{ color: ACCENT }}>{eyebrow}</span>
          </p>
          <h1
            className={`landing-h1 landing-glow ${oneLine ? "whitespace-nowrap max-w-none" : "text-balance max-w-4xl"}`}
            style={oneLine ? { fontSize: "clamp(1.05rem, 4.2vw, 3rem)" } : undefined}
          >
            {title}
            {accentTitle && (
              <>
                {oneLine ? " " : <br />}
                <span className="landing-accent">{accentTitle}</span>
              </>
            )}
          </h1>
          {subtitle && (
            <p className={`landing-sub mt-5 max-w-xl ${centered ? "mx-auto" : ""}`}>{subtitle}</p>
          )}
        </div>
      </motion.div>
      {footer}
    </div>
  );
}

export default CinematicHeaderPlate;
