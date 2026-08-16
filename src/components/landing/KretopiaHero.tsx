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
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { UnifiedSearchDropdown } from "@/components/search/UnifiedSearchDropdown";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";

const ACCENT = "#FF2DA1";
const EXAMPLE_SEARCHES = ["Maya Solano", "Event Producer in Bali", "Creative Director", "Sound Designer"];

interface KretopiaHeroProps {
  onSearchSubmit: (query: string) => void;
}

export const KretopiaHero = ({ onSearchSubmit }: KretopiaHeroProps) => {
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    analytics.featureUsed("landing_hero_viewed", { location: "hero" });
  }, []);

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

      <div className="relative mx-auto max-w-[1100px] px-5 sm:px-8 lg:px-12 pt-14 sm:pt-20 lg:pt-24 pb-20 sm:pb-28">
        {/* Eyebrow */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-3 mb-6 sm:mb-8"
        >
          <span className="h-px w-8 bg-white/25" />
          <span className="landing-eyebrow">The Creative Passport</span>
          <span className="h-px w-8 bg-white/25" />
        </motion.div>

        {/* Headline — the single most important thing on the page */}
        <motion.h1
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.2, 0.65, 0.3, 0.95] }}
          className="landing-h1 landing-glow text-center max-w-full mx-auto"
        >
          Prove what you've done.
          <br />
          Get found for <span className="italic pink-glow-breathe" style={{ color: "#FF2DA1" }}>what's next</span>.
        </motion.h1>

        <motion.p
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="landing-sub mt-5 sm:mt-6 max-w-xl mx-auto text-center"
        >
          Search your name to find or create your Creative Passport.
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
