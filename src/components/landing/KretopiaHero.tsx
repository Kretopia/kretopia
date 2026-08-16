/**
 * KretopiaHero — Section 1 of the Kretopia landing page.
 *
 * Search-first. The hierarchy is deliberate and fixed:
 *   eyebrow → headline → supporting sentence (a second, longer sentence is
 *   hidden below `sm:` so mobile's first viewport stays uncluttered) →
 *   dominant search, whose own submit button IS the primary action — no
 *   competing CTA row sits underneath it.
 *
 * Search itself is the app's real global search (UnifiedSearchDropdown,
 * variant="hero") — same debounced/cancelled queries, same voice input,
 * same keyboard nav and result states used everywhere else in the app.
 * Nothing here reimplements search, and nothing fakes a result.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { UnifiedSearchDropdown } from "@/components/search/UnifiedSearchDropdown";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";

const ACCENT = "#FF2DA1";
const EXAMPLE_SEARCHES = ["Maya Solano", "Event Producer in Bali", "Creative Director", "Sound Designer"];

/** Headline, split into words so each can resolve out of a blur on load. */
const HEADLINE: { text: string; accent?: boolean }[][] = [
  [{ text: "Prove" }, { text: "what" }, { text: "you've" }, { text: "done." }],
  [{ text: "Get" }, { text: "found" }, { text: "for" }, { text: "what's next", accent: true }],
];

/** Rotating intents under the headline — the search thinking out loud. */
const ROTATING_INTENTS = [
  "your name.",
  "a collaborator.",
  "a credit you're owed.",
  "your next opportunity.",
];

interface KretopiaHeroProps {
  onSearchSubmit: (query: string) => void;
}

export const KretopiaHero = ({ onSearchSubmit }: KretopiaHeroProps) => {
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    analytics.featureUsed("landing_hero_viewed", { location: "hero" });
  }, []);

  // Rotate the intent line; pauses while the user is actually searching.
  useEffect(() => {
    if (reducedMotion || focused) return;
    const id = window.setInterval(() => setRotation((r) => (r + 1) % ROTATING_INTENTS.length), 2600);
    return () => window.clearInterval(id);
  }, [reducedMotion, focused]);

  const handleFocusChange = (open: boolean) => {
    if (open && !focused) analytics.featureUsed("landing_search_focused", { location: "hero" });
    setFocused(open);
  };

  const submitSearch = (value: string) => {
    analytics.searchStarted(value);
    onSearchSubmit(value);
  };

  const runExample = (example: string) => {
    // Visually fill the search bar first so the click reads as "this typed
    // in", not a silent jump straight to results.
    analytics.ctaClick("try_example_search", "hero");
    setQuery(example);
    submitSearch(example);
  };

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

      <div className="relative mx-auto max-w-[1100px] px-5 sm:px-8 lg:px-12 pt-14 sm:pt-20 lg:pt-24 pb-20 sm:pb-28">
        {/* Headline — words reveal one by one out of a blur, like the page is
            resolving the sentence rather than printing it. */}
        <h1 className="landing-h1 landing-glow text-center max-w-full mx-auto">
          <motion.span
            className="block"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: reducedMotion ? 0 : 0.075 } } }}
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
                            hidden: { opacity: 0, y: 22, filter: "blur(10px)" },
                            show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.2, 0.65, 0.3, 0.95] } },
                          }
                    }
                  >
                    {word.accent ? (
                      <><span className="italic pink-glow-breathe" style={{ color: ACCENT }}>{word.text}</span>.</>
                    ) : (
                      word.text
                    )}
                    {wi < line.length - 1 && "\u00A0"}
                  </motion.span>
                ))}
              </span>
            ))}
          </motion.span>
        </h1>

        {/* Live intent line — the search "thinks out loud" about what it can find */}
        <motion.p
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="landing-sub mt-5 sm:mt-6 max-w-xl mx-auto text-center"
        >
          Search{" "}
          <span className="relative inline-flex h-[1.2em] overflow-hidden align-bottom text-left">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={rotation}
                initial={reducedMotion ? false : { y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={reducedMotion ? undefined : { y: "-100%", opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.2, 0.65, 0.3, 0.95] }}
                className="whitespace-nowrap"
                style={{ color: ACCENT }}
              >
                {ROTATING_INTENTS[rotation]}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.p>

        {/* ─────────────────────────────────────────────────────────────
            SEARCH — the dominant, centered surface. Real global search
            (voice included), not a hand-rolled input.
        ────────────────────────────────────────────────────────────── */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22 }}
          className="mt-9 sm:mt-11 max-w-2xl mx-auto"
        >
          {/* AI-glow ring — an ambient breathing halo behind the search bar,
              intensifying while the dropdown is actively open, plus a
              scan-line sweep along the top edge. Purely decorative: sits
              behind/around the real search component, never intercepts
              its clicks. */}
          <div className="relative">
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute -inset-3 sm:-inset-4 rounded-[28px] blur-xl transition-opacity duration-500 ai-ambient-breathe",
                focused ? "opacity-100" : "opacity-60",
              )}
              style={{ background: `radial-gradient(60% 100% at 50% 50%, ${ACCENT}33, transparent 70%)` }}
            />
            <div aria-hidden className="pointer-events-none absolute inset-x-3 top-0 h-px overflow-hidden rounded-full">
              <div
                className="ai-scan-line h-full w-1/3"
                style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)` }}
              />
            </div>

            {/* This hero is always dark (hardcoded #05070D background,
                regardless of the app's theme setting), but
                UnifiedSearchDropdown is theme-aware and reads the
                --foreground/--card CSS variables that flip with the .dark
                class. Scoping just this wrapper to .dark keeps the input
                legible without fighting the component's own classes. */}
            <div className="dark relative" onFocus={() => handleFocusChange(true)} onBlur={() => handleFocusChange(false)}>
              <UnifiedSearchDropdown
                variant="hero"
                placeholder="Search your name or stage name"
                value={query}
                onValueChange={setQuery}
                onQuerySubmit={submitSearch}
                onOpenChange={handleFocusChange}
              />
            </div>
          </div>

          {/* No competing CTA row here — the searchbar's own submit button
              (an arrow, aria-label="Search") is the primary action. Two
              buttons directly underneath used to compete with it; removed
              rather than replaced. */}
          <p
            className="mt-5 flex items-center justify-center gap-1.5 text-center text-sm text-white/55"
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 pink-glow-breathe" style={{ color: ACCENT }} aria-hidden />
            Find your record, confirm your work and open your next opportunity.
          </p>

          {/* Example searches — click fills the bar visually, then submits */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span
              className="text-[11px] uppercase tracking-[0.18em] text-white/35"
              style={{ fontFamily: "'Work Sans', sans-serif" }}
            >
              Try
            </span>
            {EXAMPLE_SEARCHES.map((example) => (
              <motion.button
                key={example}
                type="button"
                whileHover={reducedMotion ? undefined : { scale: 1.04 }}
                whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                onClick={() => runExample(example)}
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/55 transition-colors hover:border-white/35 hover:text-white/90"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                {example}
              </motion.button>
            ))}
          </div>

          <p
            className="mt-5 text-center text-xs text-white/45"
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            Free to claim. No card required.
          </p>

          <p
            className="mt-6 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-white/30"
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            Kretopia. Where Creativity Lives.
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
