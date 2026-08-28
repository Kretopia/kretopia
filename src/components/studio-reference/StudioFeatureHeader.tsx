import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StudioFeatureHeaderProps {
  /** Short, uppercase context label — e.g. "Stage", "Match". */
  eyebrow: string;
  /** The feature's name, sculptural and large — keep it to 1-3 words. */
  title: string;
  /** One concise line of purpose, directly under the title. */
  subtitle?: string;
  /** Optional status pill, same shape as VibeHeader's project status pill. */
  status?: { label: string; tone: "energy" | "muted" | "success" };
  /** Optional row rendered below the title/subtitle — tabs, search, filters. */
  children?: ReactNode;
  className?: string;
}

const STATUS_TONE: Record<NonNullable<StudioFeatureHeaderProps["status"]>["tone"], string> = {
  energy: "bg-[hsl(var(--energy)/0.15)] text-[hsl(var(--energy))] border-[hsl(var(--energy)/0.35)]",
  muted: "bg-muted/60 text-muted-foreground border-border",
  success: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.35)]",
};

/**
 * Studio-grammar feature header — the flat, energy-token header pattern from
 * VibeHeader.tsx (Studio Room), generalized for any top-level feature page.
 *
 * Deliberately NOT FeaturePageHeader: that component renders the cinematic
 * #05070D/aurora/grain plate shared with the landing pages and, indirectly,
 * Passport-adjacent surfaces (Profile.tsx). This header exists so the seven
 * Studio-reference surfaces can adopt Studio's actual in-app grammar without
 * touching FeaturePageHeader or anything that depends on it.
 */
export function StudioFeatureHeader({ eyebrow, title, subtitle, status, children, className }: StudioFeatureHeaderProps) {
  return (
    <section className={cn("relative bg-background", className)}>
      <div className="px-4 pt-4 sm:px-6 relative z-10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold tracking-[0.22em] text-[hsl(var(--energy))] uppercase">
            {eyebrow}
          </p>
          {status && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border backdrop-blur-sm",
                STATUS_TONE[status.tone],
              )}
            >
              {status.label}
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.03em] leading-[1.05]">
          {title}
        </h1>

        {subtitle && (
          <p className="text-sm text-muted-foreground max-w-2xl">{subtitle}</p>
        )}

        {children}
      </div>

      <div className="mt-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </section>
  );
}
