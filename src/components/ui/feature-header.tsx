import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FeatureHeaderProps {
  /** Small uppercase label above the title, e.g. "Scout", "Passport", "Studios". */
  eyebrow: string;
  /** The h1 content — each route composes its own heading text/accent word. */
  children: ReactNode;
  className?: string;
}

/**
 * Shared title block for Studio / Scout / Passport (and any future feature
 * route that wants the same identity). Scout and Passport already used
 * byte-identical Tailwind classes for this before extraction — this makes
 * that one real definition instead of two copies that could drift.
 *
 * Deliberately NOT the same component as PageHeader (used by Discover,
 * Match, SoundStages, Spotlight, and company Studio) — that's a separate,
 * already-established pattern with its own bordered/icon/actions shape.
 * Unifying the two was out of scope; this only covers the three routes
 * the alignment pass named.
 */
export function FeatureHeader({ eyebrow, children, className }: FeatureHeaderProps) {
  return (
    <div className={cn("pt-5 sm:pt-7 pb-4 sm:pb-6", className)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--signal-teal))] mb-2">
        {eyebrow}
      </p>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.05] [text-shadow:0_0_28px_hsl(var(--signal-teal)/0.22)]">
        {children}
      </h1>
    </div>
  );
}

export default FeatureHeader;
