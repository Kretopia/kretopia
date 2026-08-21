/**
 * ClosingCTASection — Phase 13. Returns entirely to the hero's wedge
 * (search + claim) instead of ending on a feature list. The visual "search
 * field" here is a styled hand-off control, not a second search
 * implementation — clicking it scrolls back to the hero and focuses the
 * one real UnifiedSearchDropdown input, exactly like the Discovery
 * section's "Search Your Name" CTA. One source of truth for search.
 *
 * This is the landing page's one FixedProgressiveCard (Section 7 of the
 * overhaul) — the primary-CTA, step-10 moment of the storytelling
 * structure, and the only place on the page content is pinned and
 * revealed by scroll progress rather than a plain fade-in-on-view. The
 * eight chapters above it keep their existing whileInView treatment
 * deliberately; this pattern is reserved for the one true "landing" beat.
 */
import { Search } from "lucide-react";
import { FixedProgressiveCard } from "@/components/landing/kretopia/FixedProgressiveCard";
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
  return (
    <section
      className="landing-section relative border-t border-white/[0.05]"
      style={{ backgroundColor: "#05070D" }}
      aria-labelledby="closing-cta-title"
    >
      <FixedProgressiveCard
        eyebrow={<p className="landing-eyebrow">Get started</p>}
        title={
          <h2 id="closing-cta-title" className="landing-h1 landing-glow">
            Your work has a history.
            <br />
            <span className="italic pink-glow-breathe" style={{ color: ACCENT }}>Give it a future.</span>
          </h2>
        }
        subtitle={
          <p className="landing-sub max-w-lg mx-auto">
            Build the Creative Passport that grows with every project, collaborator and opportunity.
          </p>
        }
        keyValue={
          <button
            type="button"
            onClick={scrollToHeroSearch}
            className="group flex w-full max-w-lg mx-auto items-center gap-3 rounded-full border border-white/15 bg-white/[0.03] px-5 py-3.5 text-left transition-colors hover:border-white/30"
          >
            <Search className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
            <span className="text-sm text-white/45" style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}>
              Search your name or stage name
            </span>
          </button>
        }
        supportingItem={
          <p className="text-xs text-white/45" style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}>
            Free to claim.
          </p>
        }
        cta={
          <button
            type="button"
            onClick={scrollToHeroSearch}
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white"
            style={{ backgroundColor: ACCENT, fontFamily: "'Satoshi', 'Inter', sans-serif" }}
          >
            Claim Your Creative Passport
          </button>
        }
      />

      <p
        className="relative pb-16 sm:pb-20 text-center text-[10px] font-semibold uppercase tracking-[0.32em] text-white/30"
        style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
      >
        Kretopia
        <br />
        Where Creativity Lives.
      </p>
    </section>
  );
};

export default ClosingCTASection;
