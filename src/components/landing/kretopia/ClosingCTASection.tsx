/**
 * ClosingCTASection — Phase 13. Returns entirely to the hero's wedge
 * (search + claim) instead of ending on a feature list. The visual "search
 * field" here is a styled hand-off control, not a second search
 * implementation — clicking it scrolls back to the hero and focuses the
 * one real UnifiedSearchDropdown input, exactly like the Discovery
 * section's "Search Your Name" CTA. One source of truth for search.
 */
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { analytics } from "@/lib/analytics";

const ACCENT = "#FF2DA1";

const scrollToHeroSearch = () => {
  analytics.ctaClick("claim_your_creative_passport", "closing_cta");
  const hero = document.getElementById("kretopia-hero");
  hero?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    hero?.querySelector<HTMLInputElement>("input")?.focus();
  }, 450);
};

export const ClosingCTASection = () => {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="landing-section relative border-t border-white/[0.05]"
      style={{ backgroundColor: "#05070D" }}
      aria-labelledby="closing-cta-title"
    >
      <div className="relative mx-auto max-w-4xl px-5 text-center">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
        >
          <h2 id="closing-cta-title" className="landing-h1 landing-glow">
            Your work has a history.
            <br />
            <span className="italic pink-glow-breathe" style={{ color: ACCENT }}>Give it a future.</span>
          </h2>
          <p className="landing-sub mt-5 max-w-lg mx-auto">
            Build the Creative Passport that grows with every project, collaborator and opportunity.
          </p>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-9 max-w-lg mx-auto"
        >
          <button
            type="button"
            onClick={scrollToHeroSearch}
            className="group flex w-full items-center gap-3 rounded-full border border-white/15 bg-white/[0.03] px-5 py-3.5 text-left transition-colors hover:border-white/30"
          >
            <Search className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
            <span className="text-sm text-white/45" style={{ fontFamily: "'Work Sans', sans-serif" }}>
              Search your name or stage name
            </span>
          </button>

          <button
            type="button"
            onClick={scrollToHeroSearch}
            className="mt-4 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white"
            style={{ backgroundColor: ACCENT, fontFamily: "'Work Sans', sans-serif" }}
          >
            Claim Your Creative Passport
          </button>

          <p className="mt-4 text-xs text-white/45" style={{ fontFamily: "'Work Sans', sans-serif" }}>
            Free to claim.
          </p>

          <p
            className="mt-8 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/30"
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            Kretopia
            <br />
            Where Creativity Lives.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ClosingCTASection;
