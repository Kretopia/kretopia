import { useRef, type ReactNode } from "react";
import type { TutorialStep } from "@/components/landing/kretopia/FeatureTutorial";
import { FeatureAITutorial } from "./FeatureAITutorial";
import { useFitTitleOneLine } from "@/hooks/useFitTitleOneLine";

interface FeaturePageHeaderProps {
  /** e.g. "Live gigs" — short, uppercase, pill-badged */
  eyebrow: string;
  /** e.g. <>Gigs. <span className="text-energy-glow">Find your next one.</span></> — no <br/>, the title auto-shrinks to stay on one line. */
  title: ReactNode;
  subtitle: string;
  /** Optional segmented tab toggle, rendered below the title block. */
  tabs?: ReactNode;
  /** Feature key + tutorial steps -- omit to render the header with no tutorial trigger. */
  tutorial?: { featureKey: string; label: string; steps: TutorialStep[] };
}

/**
 * Shared cinematic page header. Every feature page's title is centered and
 * auto-sized to stay on one line, matching Passport's treatment — the exact
 * font-size is computed per-title via useFitTitleOneLine rather than a fixed
 * breakpoint jump, since title length varies a lot page to page.
 */
export function FeaturePageHeader({ eyebrow, title, subtitle, tabs, tutorial }: FeaturePageHeaderProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useFitTitleOneLine(wrapperRef, titleRef, [title]);

  return (
    <div className="relative border-b border-border/50 bg-cinematic overflow-hidden pt-[env(safe-area-inset-top)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-energy/40 to-transparent" />
      <div className="relative container mx-auto max-w-5xl px-4 pt-6 pb-5 sm:pt-8 sm:pb-7">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex flex-col items-center w-full">
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-energy mb-3 px-2.5 py-1 rounded-full border border-energy/30 bg-energy/[0.04]">
              <span className="h-1.5 w-1.5 rounded-full bg-energy animate-pulse" />
              {eyebrow}
            </p>
            <div ref={wrapperRef} className="w-full max-w-3xl">
              <h1
                ref={titleRef}
                className="font-black tracking-[-0.035em] text-foreground leading-[0.95]"
                style={{ fontSize: "3rem" }}
              >
                {title}
              </h1>
            </div>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">{subtitle}</p>
            {tutorial && (
              <FeatureAITutorial featureKey={tutorial.featureKey} label={tutorial.label} steps={tutorial.steps} />
            )}
          </div>
        </div>
        {tabs && <div className="mt-5">{tabs}</div>}
      </div>
    </div>
  );
}

export default FeaturePageHeader;
