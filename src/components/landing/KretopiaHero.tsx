/**
 * KretopiaHero — Section 1 of the Kretopia landing page.
 *
 * Search-first: the promise ("search your name, discover your record,
 * claim your Passport") and the search surface itself are both visible
 * without scrolling, on mobile and desktop. The editorial portrait is
 * still here as a supporting visual, but no longer sits between the
 * headline and the search input — search is never buried below marketing
 * copy.
 *
 * Search itself is the app's real global search (UnifiedSearchDropdown,
 * variant="hero") — same debounced/cancelled queries, same voice input
 * (useVoiceSearch + VoiceWaveform, click-to-request-permission, real
 * mic-level waveform), same keyboard nav and result states used
 * everywhere else in the app. Nothing here reimplements search or voice.
 */
import { motion } from "framer-motion";
import { UnifiedSearchDropdown } from "@/components/search/UnifiedSearchDropdown";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import portraitImage from "@/assets/kretopia-hero-portrait.jpg";

const EXAMPLE_SEARCHES = ["Ethan Auguste", "Event Producer in Bali", "Creative Director"];

interface KretopiaHeroProps {
  onSearchSubmit: (query: string) => void;
}

export const KretopiaHero = ({ onSearchSubmit }: KretopiaHeroProps) => {
  const reducedMotion = useReducedMotion();
  // The global CSS reduced-motion rule (src/index.css) only collapses
  // CSS transitions/@keyframes — framer-motion's initial/animate props
  // move via inline styles/WAAPI and aren't touched by it. Skipping
  // `initial` here renders every block directly in its final state.
  const entrance = reducedMotion ? false : undefined;
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "#05070D" }}
    >
      {/* warm vignette — barely there */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 80% 20%, rgba(120, 70, 40, 0.18), transparent 55%), radial-gradient(80% 60% at 0% 100%, rgba(0,0,0,0.6), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-[1100px] px-5 sm:px-8 lg:px-12 pt-10 sm:pt-14 lg:pt-16 pb-16 sm:pb-24 lg:pb-28">
        {/* Eyebrow */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex items-center justify-center gap-3 mb-6 sm:mb-8"
        >
          <span className="h-px w-8 bg-white/30" />
          <span
            className="text-[10px] font-medium uppercase tracking-[0.32em]"
            style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Work Sans', sans-serif" }}
          >
            Kretopia Creative Passport
          </span>
          <span className="h-px w-8 bg-white/30" />
        </motion.div>

        {/* Headline — the promise, understandable at a glance */}
        <motion.h1
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.2, 0.65, 0.3, 0.95] }}
          className="font-serif text-white text-center leading-[1.02] tracking-[-0.02em] max-w-3xl mx-auto"
          style={{
            fontSize: "clamp(2.25rem, 6vw, 4.5rem)",
            fontWeight: 500,
            WebkitFontSmoothing: "antialiased",
          }}
        >
          Search your name.
          <br />
          Find your <span className="italic" style={{ color: "#FF2DA1" }}>next opportunity</span>.
        </motion.h1>

        <motion.p
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-5 sm:mt-6 max-w-xl mx-auto text-center text-sm sm:text-base leading-relaxed"
          style={{
            color: "rgba(255,255,255,0.65)",
            fontFamily: "'Work Sans', sans-serif",
          }}
        >
          Kretopia discovers your creative record, helps you confirm your work and
          turns it into a trusted professional Passport.
        </motion.p>

        {/* ─────────────────────────────────────────────────────────────
            SEARCH — the dominant, centered surface. Real global search
            (voice included), not a hand-rolled input.
        ────────────────────────────────────────────────────────────── */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-8 sm:mt-10 max-w-xl mx-auto"
        >
          <p
            className="text-center text-[11px] font-medium uppercase tracking-[0.2em] mb-3"
            style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'Work Sans', sans-serif" }}
          >
            Discover your creative record
          </p>
          {/* This hero is always dark (hardcoded #05070D background,
              regardless of the app's light/dark theme setting), but
              UnifiedSearchDropdown is theme-aware and reads the
              --foreground/--card CSS variables that flip with the .dark
              class. The app defaults to LIGHT theme for new visitors, so
              without forcing .dark here, this input would render
              near-black text on this near-black background — invisible.
              Scoping just this wrapper to .dark is the correct fix, not
              a color override that fights the component's own classes. */}
          <div className="dark">
            <UnifiedSearchDropdown
              variant="hero"
              placeholder="Search your name, stage name or creative work..."
              onQuerySubmit={onSearchSubmit}
            />
          </div>

          {/* Example searches — safe, generic, no private data */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {EXAMPLE_SEARCHES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => onSearchSubmit(example)}
                className="rounded-full border px-3 py-1.5 text-xs transition-colors"
                style={{
                  borderColor: "rgba(255,255,255,0.18)",
                  color: "rgba(255,255,255,0.55)",
                  fontFamily: "'Work Sans', sans-serif",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
              >
                {example}
              </button>
            ))}
          </div>

          <p
            className="mt-4 text-center text-xs"
            style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Work Sans', sans-serif" }}
          >
            Free. No card. Built for creators.
          </p>
        </motion.div>

        {/* Supporting portrait — below the search, not blocking it */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="mt-14 sm:mt-16 lg:mt-20 relative max-w-3xl mx-auto"
        >
          <div className="relative aspect-[16/7] overflow-hidden rounded-2xl">
            <img
              src={portraitImage}
              alt="A creative director on set"
              width={1024}
              height={1280}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* subtle film grain via blend */}
            <div
              aria-hidden
              className="absolute inset-0 mix-blend-overlay opacity-[0.18] pointer-events-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/3"
              style={{
                background: "linear-gradient(to top, #05070D 0%, rgba(5,7,13,0) 100%)",
              }}
            />
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#FF2DA1" }} />
              <span
                className="text-[9px] font-medium uppercase tracking-[0.28em] text-white/85"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                On Set · Chapter One
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* bottom dissolve to next section */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, rgba(5,7,13,1))",
        }}
      />
    </section>
  );
};

export default KretopiaHero;
