/**
 * FixedProgressiveCard — Section 7 of the Global Typography, UX/UI and
 * AI-Powered Motion Overhaul.
 *
 * A bounded scroll region whose content stays pinned (`position: sticky`)
 * in the viewport while native scroll — not a timer, not an
 * IntersectionObserver "play once" trigger — deterministically drives a
 * top-to-bottom reveal of six fixed slots: eyebrow → title → subtitle →
 * key value → supporting item → CTA. Scrolling back up un-reveals it the
 * same way it revealed, because the mapping is a pure function of scroll
 * position, not a one-shot animation state machine.
 *
 * Explicitly NOT:
 * - scroll-hijacking — nothing calls preventDefault() or sets scrollTop;
 *   the browser's own scroll is the only input.
 * - infinite scroll — the pinned region has a fixed, finite height
 *   (`scrollSpan` viewport-heights) and then releases like any sticky
 *   element.
 * - scroll-snapping — no scroll-snap-* CSS anywhere in this component or
 *   its scroll ancestors.
 *
 * Reduced motion / static fallback: under prefers-reduced-motion, skips
 * the scroll rig entirely and renders every slot visible immediately in
 * normal document flow (no pinning, no bounded-height spacer) — this is
 * also what a user gets if JS never runs a layout pass on the sticky
 * container (e.g. print, some crawlers), since sticky degrades to static
 * positioning and the motion values simply default to their end state.
 */
import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const EASE = [0.2, 0.65, 0.3, 0.95] as const;

interface FixedProgressiveCardProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** The single most important value shown — the reason this card exists. */
  keyValue: ReactNode;
  /** Small trailing detail below the key value (e.g. a reassurance line). */
  supportingItem?: ReactNode;
  cta: ReactNode;
  className?: string;
  /** How much scroll (in viewport-heights) drives the reveal before the
   *  card releases from its pin. Bounded and finite — not infinite scroll. */
  scrollSpan?: number;
}

function useSlot(progress: MotionValue<number>, start: number, end: number) {
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [22, 0]);
  return { opacity, y };
}

export function FixedProgressiveCard({
  eyebrow,
  title,
  subtitle,
  keyValue,
  supportingItem,
  cta,
  className,
  scrollSpan = 1.6,
}: FixedProgressiveCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Six windows across [0,1], each overlapping the next so the cascade
  // reads as continuous rather than six separate pops.
  const eyebrowSlot = useSlot(scrollYProgress, 0, 0.14);
  const titleSlot = useSlot(scrollYProgress, 0.08, 0.3);
  const subtitleSlot = useSlot(scrollYProgress, 0.24, 0.44);
  const keyValueSlot = useSlot(scrollYProgress, 0.4, 0.6);
  const supportingSlot = useSlot(scrollYProgress, 0.56, 0.74);
  const ctaSlot = useSlot(scrollYProgress, 0.7, 0.9);

  const content = (
    <div className="mx-auto max-w-2xl px-5 text-center">
      {eyebrow && (
        <motion.div style={reducedMotion ? undefined : eyebrowSlot} className="mb-4">
          {eyebrow}
        </motion.div>
      )}
      <motion.div style={reducedMotion ? undefined : titleSlot}>{title}</motion.div>
      {subtitle && (
        <motion.div style={reducedMotion ? undefined : subtitleSlot} className="mt-5">
          {subtitle}
        </motion.div>
      )}
      <motion.div style={reducedMotion ? undefined : keyValueSlot} className="mt-9">
        {keyValue}
      </motion.div>
      {supportingItem && (
        <motion.div style={reducedMotion ? undefined : supportingSlot} className="mt-4">
          {supportingItem}
        </motion.div>
      )}
      <motion.div style={reducedMotion ? undefined : ctaSlot} className="mt-6">
        {cta}
      </motion.div>
    </div>
  );

  // Static fallback: everything visible immediately, normal flow, no pin,
  // no bounded-height spacer — nothing to reduce motion of and nothing
  // that depends on JS having measured a scroll container.
  if (reducedMotion) {
    return (
      <div className={cn("relative py-24 sm:py-28", className)}>{content}</div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={{ height: `${scrollSpan * 100}vh` }}
    >
      <div
        className="sticky top-16 sm:top-20 flex flex-col justify-center overflow-hidden py-16"
        style={{ minHeight: "calc(100vh - 4rem)", transitionTimingFunction: `cubic-bezier(${EASE.join(",")})` }}
      >
        {content}
      </div>
    </div>
  );
}

export default FixedProgressiveCard;
