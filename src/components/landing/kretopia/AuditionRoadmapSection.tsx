/**
 * AuditionRoadmapSection — an honest, animated explanation of how an
 * Audition runs on Kretopia, from creation to connection.
 *
 * Deliberately a vertical/horizontal stepper rather than a card wall: the
 * point is sequence, not feature count. Kreto assists — the host decides.
 *
 * Motion: a single IntersectionObserver-driven progress reveal. No layout
 * shift, no blocking work on first paint, fully collapsed under
 * prefers-reduced-motion.
 */
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarPlus,
  Handshake,
  ListChecks,
  Sparkles,
  Star,
  UploadCloud,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const ACCENT = "#FF2DA1";

interface Step {
  title: string;
  body: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  {
    title: "Create & Share",
    body: "A host opens an audition, sets what they're looking for and shares one link.",
    icon: CalendarPlus,
  },
  {
    title: "Build a Passport",
    body: "Participants create or claim their Creative Passport so their record travels with them.",
    icon: BadgeCheck,
  },
  {
    title: "Submit Your Work",
    body: "Upload the asset the audition asks for — a video, a song, images or a portfolio.",
    icon: UploadCloud,
  },
  {
    title: "Kreto Shortlists",
    body: "Kreto reads the submissions against the brief and proposes a shortlist for the host to edit.",
    icon: Sparkles,
  },
  {
    title: "Join the Live",
    body: "Shortlisted participants receive access to the live audition room.",
    icon: Video,
  },
  {
    title: "Review Candidates",
    body: "The host meets shortlisted candidates one by one, with the brief and Passport side by side.",
    icon: ListChecks,
  },
  {
    title: "Rate & Select",
    body: "Kreto suggests notes and a rating. The host confirms, adjusts and records the final decision.",
    icon: Star,
  },
  {
    title: "Connect After",
    body: "The host sees the final selection list and can message or book the people they picked.",
    icon: Handshake,
  },
];

export const AuditionRoadmapSection = () => {
  const reducedMotion = useReducedMotion();
  const [ref, visible] = useScrollReveal<HTMLDivElement>();

  return (
    <section
      className="landing-section relative"
      style={{ backgroundColor: "#05070D" }}
      aria-labelledby="audition-roadmap-title"
    >
      <div ref={ref} className="mx-auto max-w-[1100px]">
        <div className="max-w-2xl">
          <p className="landing-eyebrow mb-4">Auditions</p>
          <h2 id="audition-roadmap-title" className="landing-h2 landing-glow">
            From an open call to a signed collaborator.
          </h2>
          <p className="landing-sub mt-5">
            Auditions run end to end on Kretopia — submissions, shortlisting, the live
            room, ratings and the follow-up. Kreto assists at every step; the host makes
            every decision.
          </p>
        </div>

        {/* Stepper */}
        <ol className="mt-12 sm:mt-16 relative">
          {/* connective rail */}
          <span
            aria-hidden
            className="absolute left-[19px] top-2 bottom-2 w-px sm:left-[23px]"
            style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
          />
          <span
            aria-hidden
            className="absolute left-[19px] top-2 w-px sm:left-[23px] origin-top"
            style={{
              backgroundColor: ACCENT,
              opacity: 0.55,
              bottom: 8,
              transform: `scaleY(${visible ? 1 : 0})`,
              transition: reducedMotion ? "none" : "transform 1.6s cubic-bezier(0.22,0.7,0.3,1)",
            }}
          />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="relative flex gap-5 sm:gap-7 pb-9 last:pb-0"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "none" : "translateY(12px)",
                  transition: reducedMotion
                    ? "none"
                    : `opacity 0.5s ease ${i * 90}ms, transform 0.5s ease ${i * 90}ms`,
                }}
              >
                <span
                  className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12"
                  style={{
                    backgroundColor: "#0C0F18",
                    border: `1px solid ${visible ? "rgba(255,45,161,0.45)" : "rgba(255,255,255,0.14)"}`,
                    transition: reducedMotion ? "none" : `border-color 0.6s ease ${i * 90}ms`,
                  }}
                >
                  <Icon
                    className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
                    style={{ color: ACCENT }}
                    aria-hidden
                  />
                </span>

                <div className="pt-1 min-w-0">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35"
                    style={{ fontFamily: "'Work Sans', sans-serif" }}
                  >
                    Step {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3
                    className="mt-1.5 text-base sm:text-lg font-semibold text-white"
                    style={{ fontFamily: "'Satoshi', 'Inter', sans-serif", letterSpacing: "-0.01em" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="mt-1.5 text-sm leading-relaxed text-white/55 max-w-lg"
                    style={{ fontFamily: "'Work Sans', sans-serif" }}
                  >
                    {step.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Link
            to="/auth?next=/desk"
            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: ACCENT, fontFamily: "'Work Sans', sans-serif" }}
          >
            Create an audition
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            to="/scout"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            Discover opportunities
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AuditionRoadmapSection;
