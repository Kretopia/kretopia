import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NextStep } from "@/hooks/useProjectFlow";

interface NextStepCardProps {
  nextStep: NextStep;
  onAction: (tab: string, intent?: string) => void;
  className?: string;
}

/**
 * In-feed Next Step card — replaces passive "what's next?" thinking with
 * one decisive CTA. Lives at the top of the Studio Room scroll, right
 * under the VibeHeader. Mobile-first (desktop keeps the slimmer NextStepBar).
 */
export const NextStepCard = ({ nextStep, onAction, className }: NextStepCardProps) => {
  return (
    <section className={cn("px-4 py-4", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4 shadow-sm">
        {/* Decorative corner glow */}
        <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary/20 blur-2xl pointer-events-none" />

        <div className="relative flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4.5 w-4.5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-1">
              Next Step
            </p>
            <h3 className="text-base font-semibold leading-tight text-foreground">
              {nextStep.title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {nextStep.description}
            </p>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                className="h-9 px-4 gap-1.5 shadow-sm"
                onClick={() => onAction(nextStep.ctaTab, nextStep.ctaIntent)}
              >
                {nextStep.ctaLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              {nextStep.secondary && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    onAction(nextStep.secondary!.tab, nextStep.secondary!.intent)
                  }
                >
                  {nextStep.secondary.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
