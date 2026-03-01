import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingTooltipProps {
  id: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
  step?: number;
  totalSteps?: number;
}

const STORAGE_KEY = "thrivein_onboarding_dismissed";

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function dismiss(id: string) {
  const dismissed = getDismissed();
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
  }
}

export const OnboardingTooltip = ({
  id,
  title,
  description,
  position = "bottom",
  children,
  step,
  totalSteps,
}: OnboardingTooltipProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = getDismissed();
    if (!dismissed.includes(id)) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [id]);

  const handleDismiss = () => {
    setVisible(false);
    dismiss(id);
  };

  const positionClasses: Record<string, string> = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  };

  const arrowClasses: Record<string, string> = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-primary border-x-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-primary border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-primary border-y-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-primary border-y-transparent border-l-transparent",
  };

  return (
    <div className="relative inline-block">
      {children}
      {visible && (
        <div
          className={cn(
            "absolute z-50 w-64 rounded-lg bg-primary text-primary-foreground p-3 shadow-xl animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
            positionClasses[position]
          )}
        >
          {/* Arrow */}
          <div className={cn("absolute w-0 h-0 border-[6px]", arrowClasses[position])} />

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-semibold text-sm">{title}</span>
            </div>
            <button onClick={handleDismiss} className="opacity-70 hover:opacity-100 -mt-0.5">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs opacity-90 leading-relaxed">{description}</p>
          {step && totalSteps && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] opacity-70">{step}/{totalSteps}</span>
              <Button
                size="sm"
                variant="secondary"
                className="h-6 text-xs px-2"
                onClick={handleDismiss}
              >
                Got it
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const resetOnboarding = () => {
  localStorage.removeItem(STORAGE_KEY);
};
