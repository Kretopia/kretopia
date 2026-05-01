import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  /** Pre-fill the composer with this prompt when the drawer opens. */
  prompt?: string;
  /** Visible label. Defaults to "Ask Copilot". */
  label?: string;
  /** "pill" sits inline in headers, "ghost" blends, "icon" is the bare sparkle. */
  variant?: "pill" | "ghost" | "icon";
  className?: string;
}

/**
 * Surface-specific entry point into the unified Thrive Copilot.
 *
 * Drop this anywhere — header bars, empty states, hero CTAs — and it opens
 * the same persistent Copilot drawer (ThriveAgentFab) with an optional
 * pre-filled prompt. The Copilot infers the surface from the URL, so it
 * already knows where the user is.
 *
 * Example:
 *   <CopilotLauncher prompt="Draft a payment-due reminder for invoice #1042" />
 */
export const CopilotLauncher = ({
  prompt,
  label = "Ask Copilot",
  variant = "pill",
  className,
}: Props) => {
  const open = () => {
    window.dispatchEvent(
      new CustomEvent("thrive-copilot:open", { detail: { prompt } }),
    );
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={open}
        aria-label={label}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full",
          "bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
          className,
        )}
      >
        <Sparkles className="h-4 w-4" />
      </button>
    );
  }

  if (variant === "ghost") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={open}
        className={cn("gap-1.5 text-primary hover:bg-primary/10", className)}
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{label}</span>
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
        "bg-primary/10 text-primary text-xs font-semibold",
        "hover:bg-primary/15 active:scale-95 transition-all",
        "border border-primary/20",
        className,
      )}
    >
      <Sparkles className="h-3.5 w-3.5" />
      {label}
    </button>
  );
};
