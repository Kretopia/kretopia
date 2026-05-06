import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "signup", label: "Sign up" },
  { key: "discover", label: "Find your work" },
  { key: "review", label: "Confirm & launch" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

interface FunnelStepperProps {
  current: StepKey;
  className?: string;
}

/**
 * Unified Landing → Signup → Onboarding step indicator.
 * Renders three dots with connector lines and labels.
 */
export function FunnelStepper({ current, className }: FunnelStepperProps) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all",
                    done && "bg-primary text-primary-foreground",
                    active && "bg-primary text-primary-foreground ring-4 ring-primary/15 scale-110",
                    !done && !active && "bg-muted text-muted-foreground border border-border",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium whitespace-nowrap transition-colors",
                    (done || active) ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 mb-5 rounded-full overflow-hidden bg-muted">
                  <div
                    className={cn(
                      "h-full bg-primary transition-all duration-500",
                      i < currentIdx ? "w-full" : "w-0",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { StepKey };
