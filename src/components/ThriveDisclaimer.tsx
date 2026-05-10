import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "inline" | "card" | "chip";

interface Props {
  variant?: Variant;
  className?: string;
  /** Optional context-specific suffix, e.g. "pricing", "extracted line items". */
  context?: string;
}

/**
 * Standard "Thrive can make mistakes" disclaimer.
 * Use anywhere AI generates pricing, contracts, line items, or summaries
 * the user might rely on for real money decisions.
 */
export function ThriveDisclaimer({ variant = "inline", className, context }: Props) {
  const ctx = context ? ` ${context}` : "";

  if (variant === "chip") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] text-muted-foreground",
          className,
        )}
      >
        <Info className="h-3 w-3" />
        Thrive can make mistakes — double-check{ctx}.
      </span>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-lg border border-border/60 bg-muted/30 p-2.5 flex gap-2 items-start",
          className,
        )}
      >
        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Thrive can make mistakes. Always double-check{ctx} — especially rates,
          totals, dates, currency, and anything you're sending to a client. You're
          the final approver.
        </p>
      </div>
    );
  }

  return (
    <p
      className={cn(
        "text-[10px] text-muted-foreground leading-relaxed flex items-start gap-1",
        className,
      )}
    >
      <Info className="h-3 w-3 mt-0.5 shrink-0" />
      <span>
        Thrive can make mistakes — double-check{ctx} before sending.
      </span>
    </p>
  );
}
