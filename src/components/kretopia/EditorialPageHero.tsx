/**
 * EditorialPageHero — the landing page's cinematic chapter opening, reused
 * verbatim as the top of a standalone page (Verified Credits, Spotlight,
 * About). Same surface (#05070D), same magenta aurora, same grain, same
 * typographic scale (.landing-eyebrow / .landing-h1 / .landing-sub) and the
 * same restrained reveal motion as the landing chapters — so every page
 * reads as one continuous film rather than separate product screens.
 */
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const ACCENT = "#FF2DA1";

export interface EditorialPageHeroProps {
  /** Small uppercase kicker in the pill, eg. "Verified Credits". */
  kicker: string;
  /** Main line, rendered white. */
  title: ReactNode;
  /** Emphasised magenta line, rendered italic serif beneath the title. */
  accentTitle?: ReactNode;
  subtitle?: string;
  /** Search bar, CTA row, tutorial trigger — anything placed under the copy. */
  children?: ReactNode;
  /** Centre the whole block (Spotlight / About) or keep it left (default). */
  align?: "left" | "center";
  /** Keep title + accent on a single line (auto-scaled to fit). */
  oneLine?: boolean;
}

export const EditorialPageHero = ({
  kicker, title, accentTitle, subtitle, children, align = "center", oneLine = false,
}: EditorialPageHeroProps) => {
  const reducedMotion = useReducedMotion();
  const centered = align === "center";

  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "#05070D" }}
    >
      {/* aurora */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 ai-ambient-breathe"
        style={{ background: "radial-gradient(60% 55% at 50% 0%, rgba(255,45,161,0.14), transparent 62%)" }}
      />
      {/* grain — same plate as the landing chapters */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.13]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: [0.2, 0.65, 0.3, 0.95] }}
        className={`relative mx-auto max-w-[1100px] px-5 sm:px-8 py-16 sm:py-24 ${centered ? "text-center flex flex-col items-center" : ""}`}
      >
        <p
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 mb-6"
          style={{
            borderColor: "rgba(255,45,161,0.3)",
            backgroundColor: "rgba(255,45,161,0.06)",
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full ai-ambient-breathe" style={{ backgroundColor: ACCENT }} />
          <span className="landing-eyebrow" style={{ color: ACCENT }}>{kicker}</span>
        </p>

        <h1
          className={`landing-h1 landing-glow ${oneLine ? "whitespace-nowrap max-w-none text-[clamp(1.05rem,4.2vw,3rem)]" : "max-w-4xl"}`}
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
          <p className={`landing-sub mt-6 max-w-xl ${centered ? "mx-auto" : ""}`}>{subtitle}</p>
        )}

        {children && <div className={`mt-8 w-full ${centered ? "flex flex-col items-center" : ""}`}>{children}</div>}
      </motion.div>
    </section>
  );
};

export default EditorialPageHero;
