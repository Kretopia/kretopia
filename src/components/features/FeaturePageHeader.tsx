import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { TutorialStep } from "@/components/landing/kretopia/FeatureTutorial";
import { FeatureAITutorial } from "./FeatureAITutorial";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface FeaturePageHeaderProps {
  /** e.g. "Live gigs" — short, uppercase, pill-badged */
  eyebrow: string;
  /** White first line — keep it short (2-4 words). */
  title: ReactNode;
  /** Magenta second line, rendered exactly like the landing hero's accent. */
  accentTitle?: ReactNode;
  subtitle: string;
  /** Optional segmented tab toggle, rendered below the title block. */
  tabs?: ReactNode;
  /** Feature key + tutorial steps -- omit to render the header with no tutorial trigger. */
  tutorial?: { featureKey: string; label: string; steps: TutorialStep[] };
}

/**
 * Shared cinematic page header. Same plate, scale and reveal motion as the
 * landing hero: one white line, one magenta line — never more than two.
 */
export function FeaturePageHeader({ eyebrow, title, accentTitle, subtitle, tabs, tutorial }: FeaturePageHeaderProps) {
  const reducedMotion = useReducedMotion();


  return (
    <div
      className="dark relative border-b border-white/[0.06] overflow-hidden pt-[env(safe-area-inset-top)]"
      style={{ backgroundColor: "#05070D" }}
    >
      {/* aurora — same plate as the landing chapters / EditorialPageHero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 ai-ambient-breathe"
        style={{ background: "radial-gradient(60% 55% at 50% 0%, rgba(255,45,161,0.14), transparent 62%)" }}
      />
      {/* grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.13]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      <div className="relative container mx-auto max-w-5xl px-4 pt-10 pb-8 sm:pt-14 sm:pb-12">
        {/* The tutorial trigger floats in the header's corner instead of
            sitting between the subtitle and the first card — no sandwich. */}
        {tutorial && (
          <FeatureAITutorial
            featureKey={tutorial.featureKey}
            label={tutorial.label}
            steps={tutorial.steps}
            variant="floating"
            className="absolute right-4 top-4 z-10"
          />
        )}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.2, 0.65, 0.3, 0.95] }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <div className="flex flex-col items-center w-full">
            <p
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 mb-6"
              style={{ borderColor: "rgba(255,45,161,0.3)", backgroundColor: "rgba(255,45,161,0.06)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full ai-ambient-breathe" style={{ backgroundColor: "#FF2DA1" }} />
              <span className="landing-eyebrow" style={{ color: "#FF2DA1" }}>{eyebrow}</span>
            </p>
            <h1 className="landing-h1 landing-glow max-w-4xl text-balance">
              {title}
              {accentTitle && (
                <>
                  <br />
                  <span className="landing-accent">{accentTitle}</span>
                </>
              )}
            </h1>
            <p className="landing-sub mt-5 max-w-xl mx-auto">{subtitle}</p>
          </div>
        </motion.div>
        {tabs && <div className="mt-6">{tabs}</div>}

      </div>
    </div>
  );
}

export default FeaturePageHeader;
