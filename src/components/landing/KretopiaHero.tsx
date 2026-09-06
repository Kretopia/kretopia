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
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { analytics } from "@/lib/analytics";
import { trackLandingCta } from "@/lib/landingFunnel";

const ACCENT = "#FF2DA1";

/** Headline, split into words so each can resolve out of a blur on load. */
const HEADLINE: string[][] = [
  ["Turn", "the", "work", "you've", "already", "done"],
  ["into", "your", "next", "opportunity."],
];

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

        {/* Headline — words reveal one by one out of a blur, like the page is
            resolving the sentence rather than printing it. */}
        <h1 className="landing-h1 landing-glow max-w-full mx-auto">
          <motion.span
            className="block"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: reducedMotion ? 0 : 0.05 } } }}
          >
            {HEADLINE.map((line, li) => (
              <span key={li} className="block">
                {line.map((word, wi) => (
                  <motion.span
                    key={`${li}-${wi}`}
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
                    {word}
                    {wi < line.length - 1 && " "}
                  </motion.span>
                ))}
              </span>
            ))}
          </motion.span>
        </h1>

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
            link and not a flat pink fill. */}
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
