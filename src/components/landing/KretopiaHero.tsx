/**
 * KretopiaHero — Section 1 of the Kretopia landing page.
 *
 * Landing Final Conversion Overhaul: replaces the prior search-first hero
 * (real global search bar as the primary action) with a direct,
 * CTA-first hero — one heading, one value sentence, one primary button.
 * The real "claim your record by searching your name" flow this used to
 * front-end is not deleted: it's reachable through the site's persistent
 * navbar search (now shown on the landing page too, see Navbar.tsx),
 * which already resolves a matched result to the same
 * `/profile/:id?showClaim=true` claim entry point. Nothing backend-side
 * changed; only which UI fronts the flow.
 */
import { Fragment, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { analytics } from "@/lib/analytics";
import { trackLandingCta } from "@/lib/landingFunnel";

const ACCENT = "#FF2DA1";

/** Headline, split into words so each can resolve out of a blur on load and
 *  carry a running index that drives the hover stagger in .hero-title-fx. */
const HEADLINE: { word: string; index: number }[][] = (() => {
  const lines: string[][] = [
    ["Turn", "the", "work", "you've", "already", "done"],
    ["into", "your", "next", "opportunity."],
  ];
  let i = 0;
  return lines.map((line) => line.map((word) => ({ word, index: i++ })));
})();

interface KretopiaHeroProps {
  /** Kept for backward compatibility with the search-first flow this hero
   *  used to front — no longer called from here (see file header). */
  onSearchSubmit?: (query: string) => void;
}

export const KretopiaHero = (_props: KretopiaHeroProps) => {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    analytics.featureUsed("landing_hero_viewed", { location: "hero" });
    // Section-view tracking for "kretopia-hero" is handled generically by
    // LandingFunnelTracker (observes every real section[id] in the DOM) --
    // not duplicated here.
  }, []);

  return (
    <section
      id="kretopia-hero"
      className="relative overflow-hidden"
      style={{ backgroundColor: "#05070D" }}
    >
      {/* warm vignette — barely there */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 80% 20%, rgba(120, 70, 40, 0.14), transparent 55%), radial-gradient(80% 60% at 0% 100%, rgba(0,0,0,0.6), transparent 60%)",
        }}
      />

      {/* Living aurora — two slow, counter-drifting magenta fields. Reads as
          "something is thinking behind the glass" without ever competing
          with the type. Disabled under prefers-reduced-motion. */}
      {!reducedMotion && (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -top-1/3 left-1/2 h-[70vh] w-[70vh] -translate-x-1/2 rounded-full blur-[110px]"
            style={{ background: `radial-gradient(circle, ${ACCENT}26, transparent 65%)` }}
            animate={{ x: ["-55%", "-40%", "-55%"], y: [0, 40, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -bottom-1/4 right-0 h-[50vh] w-[50vh] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(120,80,255,0.16), transparent 65%)" }}
            animate={{ x: [0, -60, 0], y: [0, -30, 0], scale: [1.1, 1, 1.1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      {/* Faint signal grid, masked to fade out — the "machine" layer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(70% 55% at 50% 35%, #000 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(70% 55% at 50% 35%, #000 0%, transparent 75%)",
        }}
      />

      <div className="relative mx-auto max-w-[900px] px-5 sm:px-8 lg:px-12 pt-16 sm:pt-24 lg:pt-28 pb-20 sm:pb-28 text-center">
        <motion.p
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="landing-eyebrow mb-6"
        >
          For creatives who want their work to count
        </motion.p>

        {/* Headline — words reveal one by one out of a blur on load. Hover
            adds a second interaction, hero-title-arcs: a handful of thin
            SVG arcs traced in the same grey-to-pink gradient as
            btn-landing-primary (--secondary -> --energy, the one gradient
            pair that IS Kretopia's CTA language) sweep in behind the words
            like current arcing between them, while each word lifts in a
            staggered wave. The arcs sit on a plain absolutely-positioned
            <svg> sibling, and the wave-lift on a plain inner <span> inside
            each word -- neither ever touches framer-motion's own inline
            transform on the outer motion.span used for the entrance
            reveal. */}
        <div className="relative hero-title-fx max-w-full mx-auto">
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 400 140"
            preserveAspectRatio="none"
            className="hero-title-arcs pointer-events-none absolute -inset-x-6 -inset-y-8"
          >
            <defs>
              <linearGradient id="heroArcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "hsl(var(--secondary))" }} />
                <stop offset="100%" style={{ stopColor: "hsl(var(--energy))" }} />
              </linearGradient>
              <filter id="heroArcGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="2.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path className="hero-arc hero-arc-1" d="M8,26 Q100,-8 196,28 T392,18" />
            <path className="hero-arc hero-arc-2" d="M14,70 Q120,112 210,70 T386,90" />
            <path className="hero-arc hero-arc-3" d="M4,114 Q90,86 200,120 T396,102" />
          </svg>

          <h1 className="landing-h1 landing-glow relative">
            <motion.span
              className="block"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: reducedMotion ? 0 : 0.05 } } }}
            >
              {HEADLINE.map((line, li) => (
                <span key={li} className="block">
                  {line.map(({ word, index }, wi) => (
                    // The separating space is a sibling of motion.span, not a
                    // child of it or of .hero-word -- a trailing space inside
                    // either inline-block collapses to zero width (each
                    // establishes its own line-box, and CSS trims whitespace
                    // at the edge of one), confirmed by measuring a 0px gap
                    // between words with the space nested either way. Placed
                    // here, directly inside the block-level line wrapper
                    // between two atomic inline-block boxes, it renders
                    // normally.
                    <Fragment key={`${li}-${wi}`}>
                      <motion.span
                        className="inline-block"
                        variants={
                          reducedMotion
                            ? { hidden: {}, show: {} }
                            : {
                                hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
                                show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.2, 0.65, 0.3, 0.95] } },
                              }
                        }
                      >
                        <span className="hero-word" style={{ ["--wi" as string]: index }}>
                          {word}
                        </span>
                      </motion.span>
                      {wi < line.length - 1 ? " " : ""}
                    </Fragment>
                  ))}
                </span>
              ))}
            </motion.span>
          </h1>
        </div>

        {/* Value explanation — the "why" behind the headline, one sentence. */}
        <motion.p
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="landing-sub mt-6 sm:mt-7 max-w-[38rem] mx-auto"
        >
          Build a Creative Passport from your real work, get your Credits co-signed, and be
          discovered for the skills you've already proved.
        </motion.p>

        {/* Primary CTA — the one dominant action. Real button, canonical
            grey-to-pink gradient (btn-landing-primary), not a typographic
            link and not a flat pink fill. This is Kretopia's one CTA
            design for this weight of action -- no second, differently
            styled button beside it. */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-9 sm:mt-10 flex flex-col items-center gap-4"
        >
          <Link
            to="/auth?tab=signup&src=hero_passport"
            onClick={() => trackLandingCta("hero_build_passport", "hero")}
            className="btn-landing-primary group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold"
            style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
          >
            Build my Creative Passport
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>

          <p
            className="text-xs text-white/45"
            style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
          >
            Free to start. No credit card needed.
          </p>

          <Link
            to="/auth?tab=signin"
            onClick={() => trackLandingCta("hero_signin", "hero")}
            className="text-xs text-white/40 underline decoration-white/15 underline-offset-4 transition-colors hover:text-white/70"
            style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
          >
            Already have an account? Sign in
          </Link>
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
