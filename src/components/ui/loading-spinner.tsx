import { cn } from "@/lib/utils";
import { CreativeLoader } from "./creative-loader";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
  /** Optional context (role / workspace_type) to smart-pick a creative vignette. */
  context?: string | null;
}

/**
 * Replaced the old generic <Loader2/> spinner with a creative vignette
 * (guitarist plugging in, photographer framing, DJ cueing, etc) — same
 * API so existing call sites keep working.
 */
export const LoadingSpinner = ({ size = "md", className, text, context }: LoadingSpinnerProps) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <CreativeLoader
        size={size}
        label={text}
        context={context ?? undefined}
      />
    </div>
  );
};
