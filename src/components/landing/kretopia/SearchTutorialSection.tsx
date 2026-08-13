/**
 * SearchTutorialSection — Chapter I. Search already has its live, functional
 * surface in the Hero (the real search bar, not a mockup) — this section is
 * just the interactive tutorial that follows it, matching every other
 * chapter's "feature → tutorial" pattern without duplicating the Hero's
 * own image/headline.
 */
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { FeatureTutorial } from "./FeatureTutorial";
import { SEARCH_TUTORIAL } from "./tutorialContent";
import { chapterRoman } from "./chapterRegistry";

export const SearchTutorialSection = () => {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="landing-section relative border-t border-white/[0.05]"
      style={{ backgroundColor: "#05070D" }}
      aria-labelledby="search-tutorial-title"
    >
      <div className="relative mx-auto max-w-[1100px]">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="max-w-xl"
        >
          <p className="landing-eyebrow mb-4">{chapterRoman("kretopia-hero")} · Search</p>
          <h2 id="search-tutorial-title" className="landing-h2 landing-glow">
            How search works.
          </h2>
          <p className="landing-sub mt-5 mb-9">
            The search bar above is real — try it. Here's what happens once you do.
          </p>
          <FeatureTutorial steps={SEARCH_TUTORIAL} label="Search tutorial" />
        </motion.div>
      </div>
    </section>
  );
};

export default SearchTutorialSection;
