/**
 * VerifiedCreditsChapterSection — Chapter III. Bridges the landing tutorial
 * to the real /credits page. Follows MeetKretoSection's precedent: a
 * stylized command-surface mockup rather than a stock photo (there's no
 * logged-in user's real data to show pre-login), with clearly illustrative
 * example content.
 *
 * The evidence-progression mockup is driven by the tutorial's own active
 * step (lifted here, passed to FeatureTutorial in controlled mode) rather
 * than its own independent timer — clicking through the steps visibly
 * moves the example credit through the same real evidence tiers
 * (EVIDENCE_STATE_ORDER, backed by actual credits.verification_status /
 * verification_url / endorsement_count fields). Only the example credit
 * itself ("Documentary · Sound Design") is illustrative.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Fingerprint, Link2, ShieldCheck, UserCheck } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { EvidenceStateBadge } from "@/components/credits/EvidenceStateBadge";
import type { EvidenceState } from "@/lib/creditEvidence";
import { FeatureTutorial } from "./FeatureTutorial";
import { VERIFIED_CREDITS_TUTORIAL } from "./tutorialContent";
import { chapterRoman } from "./chapterRegistry";

const ACCENT = "#FF2DA1";

const WHY_IT_MATTERS = [
  { icon: UserCheck, label: "Anyone can claim", body: "Claiming a credit is the start, not the proof." },
  { icon: Link2, label: "Evidence makes it real", body: "A link to the original listing moves it forward." },
  { icon: ShieldCheck, label: "Confirmation makes it trusted", body: "A co-sign or organization confirms it — that's what becomes a Passport Stamp." },
];

/** Maps each tutorial step directly to the real evidence tier it teaches —
 * step 3 ("Earn a Passport Stamp") shows the stamp itself, not a badge. */
const STEP_EVIDENCE_STATE: EvidenceState[] = ["claimed", "evidence_backed", "co_signed"];

export const VerifiedCreditsChapterSection = () => {
  const reducedMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const isStamped = activeStep === VERIFIED_CREDITS_TUTORIAL.length - 1;
  const currentState = STEP_EVIDENCE_STATE[Math.min(activeStep, STEP_EVIDENCE_STATE.length - 1)];

  return (
    <section
      id="chapter-verified-credits"
      className="landing-section relative overflow-hidden border-t border-white/[0.06]"
      style={{ backgroundColor: "#05070D" }}
      aria-labelledby="verified-credits-title"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(45% 55% at 75% 45%, rgba(255,45,161,0.11), transparent 62%)",
        }}
      />

      <div className="relative mx-auto max-w-[1100px]">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Copy */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-7 lg:order-2"
          >
            <p className="landing-eyebrow mb-4">{chapterRoman("chapter-verified-credits")} · Verified Credits</p>

            <h2 id="verified-credits-title" className="landing-h2 landing-glow">
              Confirm the work that{" "}
              <span className="italic pink-glow-breathe" style={{ color: ACCENT }}>proves your experience</span>.
            </h2>

            <p className="landing-sub mt-6 max-w-xl">
              A Verified Credit is a project on your record backed by real evidence — not just a
              claim. Once it's fully confirmed, it becomes a Passport Stamp: the visible proof on
              your Creative Passport.
            </p>

            <ul className="mt-9 space-y-4">
              {WHY_IT_MATTERS.map(({ icon: Icon, label, body }) => (
                <li key={label} className="flex gap-3">
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: "rgba(255,45,161,0.10)", border: "1px solid rgba(255,45,161,0.22)" }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: ACCENT }} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white" style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}>
                      {label}
                    </p>
                    <p className="text-[13px] leading-snug text-white/48" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Interactive tutorial — controlled, drives the visual preview alongside it */}
            <div className="mt-9 max-w-xl">
              <FeatureTutorial
                steps={VERIFIED_CREDITS_TUTORIAL}
                label="Verified Credits tutorial"
                activeStep={activeStep}
                onStepChange={setActiveStep}
              />
            </div>

            <Link
              to="/credits"
              className="group inline-flex items-center gap-2 mt-8 rounded-full px-6 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: ACCENT, fontFamily: "'Work Sans', sans-serif" }}
            >
              Explore Verified Credits
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </Link>
            <p className="mt-3 text-xs text-white/40" style={{ fontFamily: "'Work Sans', sans-serif" }}>
              Opens the real Verified Credits page — search, claim, and request co-signs on your own record.
            </p>
          </motion.div>

          {/* Evidence-progression mockup — reacts to the active tutorial step */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-5 lg:order-1 w-full lg:sticky lg:top-24"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 30px 80px -40px rgba(255,45,161,0.35)",
              }}
            >
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(255,45,161,0.14)" }}
                >
                  <Fingerprint className="h-3.5 w-3.5" style={{ color: ACCENT }} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white" style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}>
                    Example credit
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/35" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                    Illustrative — not live data
                  </p>
                </div>
              </div>

              <div className="px-4 py-6 min-h-[168px] flex flex-col justify-center gap-4">
                <p className="text-[15px] font-medium text-white/85" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                  "Coastline" — Documentary · Sound Design
                </p>

                <AnimatePresence mode="wait">
                  {!isStamped ? (
                    <motion.div
                      key={currentState}
                      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                      transition={{ duration: 0.4 }}
                    >
                      <EvidenceStateBadge state={currentState} size="md" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="stamp"
                      initial={reducedMotion ? false : { opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.45, ease: [0.2, 0.65, 0.3, 0.95] }}
                      className="inline-flex items-center gap-2 self-start rounded-full px-4 py-2"
                      style={{ backgroundColor: ACCENT }}
                    >
                      <ShieldCheck className="h-4 w-4 text-white" aria-hidden />
                      <span className="text-sm font-bold text-white" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                        Passport Stamp
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Progress dots — mirror the tutorial's own step, not a separate cycle */}
                <div className="flex items-center gap-1.5 mt-1" aria-hidden>
                  {VERIFIED_CREDITS_TUTORIAL.map((s, i) => (
                    <span
                      key={s.title}
                      className="h-1 rounded-full transition-all duration-300"
                      style={{
                        width: i <= activeStep ? "18px" : "6px",
                        backgroundColor: i <= activeStep ? ACCENT : "rgba(255,255,255,0.15)",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[12px] leading-relaxed text-white/45" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                  Every real credit on Kretopia moves through these same, honestly-labeled stages —
                  nothing is called "Verified" without evidence behind it.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default VerifiedCreditsChapterSection;
