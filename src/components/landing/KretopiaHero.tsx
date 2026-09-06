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
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { analytics } from "@/lib/analytics";
import { trackLandingCta } from "@/lib/landingFunnel";

/** Headline, split into words per line so each can resolve out of a blur on
 *  load. Line 1 renders in the default white; line 2 is wrapped in
 *  .landing-accent (the canonical pink/italic/glow accent already used for
 *  this exact role elsewhere on Landing) so every word in it inherits the
 *  color/style without needing a per-word class. */
const LINE_1 = ["Turn", "the", "work", "you've", "done"];
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

/** One vertical curtain of aurora light. Tall and narrow rather than a round
 *  blob -- real aurora reads as folded sheets of light hanging from the sky,
 *  not a glow -- with a slow ambient shimmer (scaleY/rotate/skew only, never
 *  x/y, so it never fights the mouse-parallax offset applied via `style`
 *  on the same element) and a soft multi-stop gradient along its length. */
const AuroraCurtain = ({
  className,
  background,
  parallaxX,
  parallaxY,
  reducedMotion,
  initialSkew,
  ambient,
  duration,
  delay,
}: {
  className: string;
  background: string;
  parallaxX: MotionValue<number>;
  parallaxY: MotionValue<number>;
  reducedMotion: boolean;
  initialSkew: number;
  ambient: { scaleY: number[]; skewX: number[] };
  duration: number;
  delay: number;
}) => (
  <motion.div
    className={className}
    style={{ background, x: parallaxX, y: parallaxY, skewX: initialSkew }}
    initial={{ scaleY: 1, skewX: initialSkew }}
    animate={reducedMotion ? undefined : { scaleY: ambient.scaleY, skewX: ambient.skewX }}
    transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
  />
);

export const KretopiaHero = (_props: KretopiaHeroProps) => {
  const reducedMotion = useReducedMotion();

  // Mouse-driven parallax for the aurora: each curtain drifts a different
  // amount as the visitor's cursor moves across the section, so the
  // northern lights genuinely respond to where they look/hover rather than
  // just looping on their own. Springs smooth the motion instead of it
  // snapping to the raw pointer position; disabled entirely under reduced
  // motion (the curtains keep their resting position, see AuroraCurtain).
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const smoothX = useSpring(pointerX, { stiffness: 35, damping: 20, mass: 0.6 });
  const smoothY = useSpring(pointerY, { stiffness: 35, damping: 20, mass: 0.6 });

  const curtain1X = useTransform(smoothX, [0, 1], [-50, 50]);
  const curtain1Y = useTransform(smoothY, [0, 1], [-24, 24]);
  const curtain2X = useTransform(smoothX, [0, 1], [40, -40]);
  const curtain2Y = useTransform(smoothY, [0, 1], [20, -20]);
  const curtain3X = useTransform(smoothX, [0, 1], [-28, 28]);
  const curtain3Y = useTransform(smoothY, [0, 1], [16, -16]);
  const curtain4X = useTransform(smoothX, [0, 1], [30, -30]);
  const curtain4Y = useTransform(smoothY, [0, 1], [-14, 14]);

  const handlePointerMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointerX.set((e.clientX - rect.left) / rect.width);
    pointerY.set((e.clientY - rect.top) / rect.height);
  };
  const handlePointerLeave = () => {
    pointerX.set(0.5);
    pointerY.set(0.5);
  };

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
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
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

      {/* Northern Lights — four tall, narrow curtains of light (not round
          blobs) in Kretopia's own palette, composited with
          mix-blend-mode:screen so overlapping color brightens like real
          light instead of muddying. They drift gently on their own AND
          respond to the visitor's cursor across the section (see
          handlePointerMove) -- two independent motions on separate
          transform channels (ambient scaleY/skew vs. pointer-driven x/y)
          so neither fights the other. Always rendered, never blank --
          under reduced motion each curtain holds its resting shape instead
          of animating, and the pointer offset is disabled outright. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ mixBlendMode: "screen" }}
      >
        <AuroraCurtain
          className="absolute -top-[20%] left-[6%] h-[135%] w-[22%] blur-[70px]"
          background="linear-gradient(180deg, transparent 0%, rgba(255,45,161,0.5) 22%, rgba(255,120,190,0.32) 45%, rgba(150,90,255,0.22) 68%, transparent 92%)"
          parallaxX={curtain1X}
          parallaxY={curtain1Y}
          reducedMotion={reducedMotion}
          initialSkew={-12}
          ambient={{ scaleY: [1, 1.12, 0.94, 1], skewX: [-12, -6, -15, -12] }}
          duration={22}
          delay={0}
        />
        <AuroraCurtain
          className="absolute -top-[24%] left-[32%] h-[140%] w-[18%] blur-[75px]"
          background="linear-gradient(180deg, transparent 0%, rgba(150,90,255,0.46) 24%, rgba(190,120,255,0.26) 48%, rgba(70,170,255,0.18) 70%, transparent 92%)"
          parallaxX={curtain2X}
          parallaxY={curtain2Y}
          reducedMotion={reducedMotion}
          initialSkew={8}
          ambient={{ scaleY: [1, 0.9, 1.15, 1], skewX: [8, 14, 4, 8] }}
          duration={27}
          delay={1.2}
        />
        <AuroraCurtain
          className="absolute -top-[18%] right-[10%] h-[130%] w-[24%] blur-[80px]"
          background="linear-gradient(180deg, transparent 0%, rgba(255,45,161,0.4) 26%, rgba(255,45,161,0.2) 50%, transparent 90%)"
          parallaxX={curtain3X}
          parallaxY={curtain3Y}
          reducedMotion={reducedMotion}
          initialSkew={-6}
          ambient={{ scaleY: [1, 1.1, 0.95, 1], skewX: [-6, -11, -2, -6] }}
          duration={31}
          delay={2.4}
        />
        <AuroraCurtain
          className="absolute -top-[26%] right-[28%] h-[138%] w-[16%] blur-[85px]"
          background="linear-gradient(180deg, transparent 0%, rgba(70,170,255,0.3) 28%, rgba(150,90,255,0.16) 55%, transparent 90%)"
          parallaxX={curtain4X}
          parallaxY={curtain4Y}
          reducedMotion={reducedMotion}
          initialSkew={11}
          ambient={{ scaleY: [1, 0.92, 1.08, 1], skewX: [11, 6, 15, 11] }}
          duration={24}
          delay={0.8}
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

      <div className="relative mx-auto max-w-[900px] px-5 sm:px-8 lg:px-12 pt-16 sm:pt-24 lg:pt-28 pb-20 sm:pb-28 text-center flex flex-col items-center">
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

        {/* CTA pair — one clear primary action, one clear secondary one,
            both the same size, neither shouting over the other. Toned down
            from the original build: softer glow, no lift-on-hover jump,
            gentler brightness shift -- reads as confident, not loud. */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-9 sm:mt-10 flex flex-col items-center gap-4"
        >
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              to="/auth?tab=signup&src=hero_passport"
              onClick={() => trackLandingCta("hero_join_kretopia", "hero")}
              className="btn-landing-primary group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold"
              style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
            >
              Join Kretopia
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
