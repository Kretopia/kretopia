/**
 * SearchTutorialSection — Chapter I, "Discovery." Search already has its
 * live, functional surface in the Hero (the real search bar, not a mockup)
 * — this section makes the case for using it: a visitor's creative history
 * may already be on Kretopia, waiting to be found and claimed.
 *
 * The compact SEARCH / REVIEW / CLAIM row is a glanceable summary; the
 * FeatureTutorialPanel below it is the same detailed, step-reactive
 * tutorial as every other chapter — not a duplicate, a deeper layer.
 */
import { Search, FileSearch, Fingerprint } from "lucide-react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { trackLandingCtaClick } from "@/lib/landingMetrics";
import { FeatureTutorialPanel } from "./FeatureTutorialPanel";
import { SearchVisual } from "./featureVisuals";
import { SEARCH_TUTORIAL } from "./tutorialContent";
import { chapterRoman } from "./chapterRegistry";

const STEPS = [
  { icon: Search, label: "Search", body: "Find your name." },
  { icon: FileSearch, label: "Review", body: "See potential credits and projects." },
  { icon: Fingerprint, label: "Claim", body: "Turn them into your Creative Passport." },
];

const scrollToHeroSearch = () => {
  trackLandingCtaClick({
    ctaId: "search_your_name",
    section: "search_tutorial",
    label: "Search Your Name",
    destinationType: "internal",
  });
  const hero = document.getElementById("kretopia-hero");
  hero?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    hero?.querySelector<HTMLInputElement>("input")?.focus();
  }, 450);
};

export const SearchTutorialSection = () => {
  const reducedMotion = useReducedMotion();

  return (
    <section
      id="chapter-search"
      className="landing-section relative border-t border-white/[0.05]"
      style={{ backgroundColor: "#05070D" }}
      aria-labelledby="search-tutorial-title"
    >
      <div className="relative mx-auto max-w-[1320px]">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="max-w-xl"
        >
          <p className="landing-eyebrow mb-4">{chapterRoman("kretopia-hero")} · Discover your record</p>
          <h2 id="search-tutorial-title" className="landing-h2 landing-glow">
            Your creative history may already be here.
          </h2>
          <p className="landing-sub mt-5">
            Search your name, stage name or project. Find your record, review the work connected to you, and claim what is yours.
          </p>
        </motion.div>

        {/* Compact three-step summary */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {STEPS.map(({ icon: Icon, label, body }, i) => (
            <div key={label} className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ backgroundColor: "rgba(255,45,161,0.14)", color: "#FF2DA1" }}
                >
                  {i + 1}
                </span>
                <Icon className="h-4 w-4" style={{ color: "#FF2DA1" }} aria-hidden />
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">{label}</span>
              </div>
              <p className="text-sm text-white/55" style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}>
                {body}
              </p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6"
        >
          <button
            type="button"
            onClick={scrollToHeroSearch}
            className="btn-glass btn-glass-primary rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          >
            Search Your Name
          </button>
        </motion.div>

        <FeatureTutorialPanel steps={SEARCH_TUTORIAL} label="Search tutorial" visual={SearchVisual} />
      </div>
    </section>
  );
};

export default SearchTutorialSection;
