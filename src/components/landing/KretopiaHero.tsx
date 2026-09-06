/**
 * KretopiaHero — Section 1 of the Kretopia landing page.
 *
 * Landing Final Conversion Overhaul: replaces the prior search-first hero
 * (real global search bar as the primary action) with a direct,
 * CTA-first hero — one heading, one value sentence, two CTAs of equal
 * weight. The real "claim your record by searching your name" flow this
 * used to front-end is not deleted: it's reachable through the site's
 * persistent navbar search (now shown on the landing page too, see
 * Navbar.tsx), which already resolves a matched result to the same
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

/** Headline, split into words per line so each can resolve out of a blur on
 *  load. Line 1 renders in the default white; line 2 is wrapped in
 *  .landing-accent (the canonical pink/italic/glow accent already used for
 *  this exact role elsewhere on Landing) so every word in it inherits the
 *  color/style without needing a per-word class. */
const LINE_1 = ["Turn", "the", "work", "you've", "already", "done"];
const LINE_2 = ["into", "your", "next", "opportunity."];

interface KretopiaHeroProps {
  /** Kept for backward compatibility with the search-first flow this hero
   *  used to front — no longer called from here (see file header). */
  onSearchSubmit?: (query: string) => void;
}

const wordVariants = (reducedMotion: boolean) =>
  reducedMotion
    ? { hidden: {}, show: {} }
    : {
        hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
        show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.2, 0.65, 0.3, 0.95] as const } },
      };

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

      {/* Northern Lights — three drifting curtains of light in Kretopia's own
          palette (pink/energy + violet + a cool blue undertone for depth),
          composited with mix-blend-mode:screen so overlapping color actually
          brightens like real aurora light instead of muddying like paint.
          Always rendered (never blank) -- under reduced motion each curtain
          holds its resting position instead of animating, rather than
          disappearing entirely, so the section stays visually rich for
          every visitor. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ mixBlendMode: "screen" }}
      >
        <motion.div
          className="absolute -top-1/4 left-[-15%] h-[62vh] w-[140%] rounded-[50%] blur-[100px]"
          style={{
            background:
              "linear-gradient(100deg, transparent 4%, rgba(255,45,161,0.4) 32%, rgba(255,45,161,0.18) 52%, transparent 82%)",
          }}
          initial={{ rotate: -9, y: 0, scaleY: 1 }}
          animate={
            reducedMotion
              ? undefined
              : { y: [0, 34, -12, 0], scaleY: [1, 1.18, 0.92, 1], rotate: [-9, -5, -11, -9] }
          }
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[2%] right-[-20%] h-[56vh] w-[135%] rounded-[50%] blur-[110px]"
          style={{
            background:
              "linear-gradient(105deg, transparent 6%, rgba(150,90,255,0.34) 38%, rgba(150,90,255,0.14) 58%, transparent 85%)",
          }}
          initial={{ rotate: 7, y: 0, scaleY: 1 }}
          animate={
            reducedMotion
              ? undefined
              : { y: [0, -28, 16, 0], scaleY: [1, 0.88, 1.2, 1], rotate: [7, 10, 4, 7] }
          }
          transition={{ duration: 32, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        />
        <motion.div
          className="absolute top-[-14%] left-[8%] h-[48vh] w-[115%] rounded-[50%] blur-[120px]"
          style={{
            background: "linear-gradient(95deg, transparent 8%, rgba(70,170,255,0.18) 45%, transparent 82%)",
          }}
          initial={{ rotate: -4, y: 0 }}
          animate={reducedMotion ? undefined : { y: [0, 22, 0], rotate: [-4, -7, -4] }}
          transition={{ duration: 38, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
      </div>

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

        {/* Headline — words reveal one by one out of a blur on load. Line 2
            is wrapped in .landing-accent, the canonical pink/italic/glow
            treatment already used for this exact role elsewhere on Landing
            (see VerifiedCreditsChapterSection's "proves your experience") --
            reused rather than inventing a second accent style. */}
        <h1 className="landing-h1 landing-glow max-w-full mx-auto">
          <motion.span
            className="block"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: reducedMotion ? 0 : 0.05 } } }}
          >
            <span className="block">
              {LINE_1.map((word, wi) => (
                <motion.span key={wi} className="inline-block" variants={wordVariants(reducedMotion)}>
                  {word}
                  {wi < LINE_1.length - 1 ? " " : ""}
                </motion.span>
              ))}
            </span>
            <span className="landing-accent block">
              {LINE_2.map((word, wi) => (
                <motion.span key={wi} className="inline-block" variants={wordVariants(reducedMotion)}>
                  {word}
                  {wi < LINE_2.length - 1 ? " " : ""}
                </motion.span>
              ))}
            </span>
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

        {/* CTA pair — primary (canonical grey-to-pink gradient,
            btn-landing-primary) beside a same-size secondary sign-in action
            (btn-glass btn-glass-outline, the same restrained glass family
            used everywhere else on the site). One clear primary action,
            one clear secondary one, nothing else competing for attention. */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-9 sm:mt-10 flex flex-col items-center gap-4"
        >
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              to="/auth?tab=signup&src=hero_passport"
              onClick={() => trackLandingCta("hero_build_passport", "hero")}
              className="btn-landing-primary group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold"
              style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
            >
              Build my Passport
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>

            <Link
              to="/auth?tab=signin"
              onClick={() => trackLandingCta("hero_signin", "hero")}
              className="btn-glass btn-glass-outline inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold"
              style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
            >
              Sign in
            </Link>
          </div>

          <p
            className="text-xs text-white/45"
            style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
          >
            Free to start. No credit card needed.
          </p>
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
