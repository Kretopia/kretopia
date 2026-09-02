/**
 * TrustSection — the general Trust/Co-Sign principle, sitting between the
 * Verified Credits chapter (which shows the mechanism on one real example
 * credit) and Scout (which depends on that trust to work). This section
 * doesn't reinvent evidence states — it reuses the real EVIDENCE_STATE_LABEL
 * order from src/lib/creditEvidence.ts, the same source of truth
 * VerifiedCreditsChapterSection already uses, so the two sections never
 * disagree on terminology.
 */
import { motion } from "framer-motion";
import { ArrowRight, ArrowDown } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { EVIDENCE_STATE_ORDER, EVIDENCE_STATE_LABEL, EVIDENCE_STATE_DESCRIPTION } from "@/lib/creditEvidence";
import { useLandingSectionView } from "@/lib/landingMetrics";

const ACCENT = "#FF2DA1";

export const TrustSection = () => {
  const reducedMotion = useReducedMotion();
  const sectionViewRef = useLandingSectionView("trust");

  return (
    <section
      ref={sectionViewRef}
      className="landing-section relative border-t border-white/[0.05]"
      style={{ backgroundColor: "#05070D" }}
      aria-labelledby="trust-section-title"
    >
      <div className="relative mx-auto max-w-[1320px]">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="max-w-xl"
        >
          <p className="landing-eyebrow mb-4">Build trust</p>
          <h2 id="trust-section-title" className="landing-h2 landing-glow">
            Don't just claim the work.
            <br />
            <span className="italic pink-glow-breathe" style={{ color: ACCENT }}>Prove it.</span>
          </h2>
          <p className="landing-sub mt-5">
            Creative work is collaborative. Kretopia lets collaborators, clients and organizations strengthen your credits by confirming the work they experienced with you.
          </p>
        </motion.div>

        {/* Progression — real evidence states, real order, real labels */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-12 flex flex-col lg:flex-row items-stretch gap-2"
        >
          {EVIDENCE_STATE_ORDER.map((state, i) => {
            const isLast = i === EVIDENCE_STATE_ORDER.length - 1;
            return (
              <div key={state} className="flex flex-col lg:flex-row items-center gap-2 flex-1">
                <div
                  className="w-full rounded-2xl border p-4"
                  style={{
                    borderColor: isLast ? `${ACCENT}66` : "rgba(255,255,255,0.1)",
                    backgroundColor: isLast ? `${ACCENT}14` : "rgba(255,255,255,0.02)",
                  }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1.5"
                    style={{ color: isLast ? ACCENT : "rgba(255,255,255,0.7)", fontFamily: "'Satoshi', 'Inter', sans-serif" }}
                  >
                    {EVIDENCE_STATE_LABEL[state]}
                  </p>
                  <p className="text-xs leading-snug text-white/50" style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}>
                    {EVIDENCE_STATE_DESCRIPTION[state]}
                  </p>
                </div>
                {!isLast && (
                  <>
                    <ArrowRight className="hidden lg:block h-4 w-4 shrink-0 text-white/25" aria-hidden />
                    <ArrowDown className="lg:hidden h-4 w-4 shrink-0 text-white/25" aria-hidden />
                  </>
                )}
              </div>
            );
          })}
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 text-center"
        >
          <p className="text-sm text-white/55" style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}>
            The stronger the evidence, the stronger the record.
          </p>
          <p className="mt-2 text-lg font-semibold italic text-white/85">
            Build a Passport people can trust.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;
