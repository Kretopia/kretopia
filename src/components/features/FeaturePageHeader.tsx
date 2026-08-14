import type { ReactNode } from "react";
import type { TutorialStep } from "@/components/landing/kretopia/FeatureTutorial";
import { FeatureAITutorial } from "./FeatureAITutorial";

interface FeaturePageHeaderProps {
  /** e.g. "Live gigs" — short, uppercase, pill-badged */
  eyebrow: string;
  /** e.g. <>Gigs.<br /><span className="text-energy-glow">Find your next one.</span></> */
  title: ReactNode;
  subtitle: string;
  /** Optional right-aligned chip, matching Opportunities' "All gigs · One feed" badge. */
  meta?: ReactNode;
  /** Optional segmented tab toggle, rendered below the title block. */
  tabs?: ReactNode;
  /** Feature key + tutorial steps -- omit to render the header with no tutorial trigger. */
  tutorial?: { featureKey: string; label: string; steps: TutorialStep[] };
}

/**
 * Shared cinematic page header -- the exact classes/structure from
 * Opportunities.tsx, extracted so every overhauled feature gets the
 * identical treatment instead of nine bespoke re-implementations.
 */
export function FeaturePageHeader({ eyebrow, title, subtitle, meta, tabs, tutorial }: FeaturePageHeaderProps) {
  return (
    <div className="relative border-b border-border/50 bg-cinematic overflow-hidden pt-[env(safe-area-inset-top)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-energy/40 to-transparent" />
      <div className="relative container mx-auto max-w-5xl px-4 pt-6 pb-5 sm:pt-8 sm:pb-7">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-energy mb-3 px-2.5 py-1 rounded-full border border-energy/30 bg-energy/[0.04]">
              <span className="h-1.5 w-1.5 rounded-full bg-energy animate-pulse" />
              {eyebrow}
            </p>
            <h1 className="text-3xl sm:text-5xl font-black tracking-[-0.035em] text-foreground leading-[0.95]">
              {title}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md">{subtitle}</p>
            {tutorial && (
              <FeatureAITutorial featureKey={tutorial.featureKey} label={tutorial.label} steps={tutorial.steps} />
            )}
          </div>
          {meta}
        </div>
        {tabs && <div className="mt-5">{tabs}</div>}
      </div>
    </div>
  );
}

export default FeaturePageHeader;
