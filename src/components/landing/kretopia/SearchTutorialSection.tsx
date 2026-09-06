/**
 * SearchTutorialSection — Chapter I, "Discovery." Search already has its
 * live, functional surface in the persistent navbar (the real search bar,
 * not a mockup) — this section makes the case for using it: a visitor's
 * creative history may already be on Kretopia, waiting to be found and
 * claimed.
 *
 * Landing Final Conversion Overhaul: the old compact "1 Search / 2 Review /
 * 3 Claim" summary row and its "Search Your Name" button (which scrolled
 * back up to the Hero and refocused its search input) are removed — the
 * Hero no longer carries a search bar to scroll back to (see
 * KretopiaHero.tsx). The real search feature itself is untouched: it now
 * lives in the site's persistent navbar, shown on the landing page too
 * (see Navbar.tsx), same route, same backend, same claim flow.
 */
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { FeatureTutorialPanel } from "./FeatureTutorialPanel";
import { SearchVisual } from "./featureVisuals";
import { SEARCH_TUTORIAL } from "./tutorialContent";
import { chapterRoman } from "./chapterRegistry";

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

        <FeatureTutorialPanel steps={SEARCH_TUTORIAL} label="Search tutorial" visual={SearchVisual} />
      </div>
    </section>
  );
};

export default SearchTutorialSection;
