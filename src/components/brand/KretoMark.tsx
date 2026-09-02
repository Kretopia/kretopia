/**
 * KretoMark — Kretopia's compact identity mark for Kreto: the K-mark logo,
 * not a portrait. Use in place of KretoAvatar wherever a smaller, brand-first
 * signal fits better than the full portrait (chips, inline buttons, empty
 * states, loading rows, contextual recommendation cards).
 *
 * Not a face, not a robot, not a generic AI orb. The mark itself never
 * implies activity on its own -- pass `state` only when something real is
 * happening, and it always carries a paired sr-only label, never color or
 * motion alone.
 */
import type { CSSProperties } from "react";
import kMarkAsset from "@/assets/brand/kretopia-k-mark.png.asset.json";
import { cn } from "@/lib/utils";

type Variant = "default" | "compact" | "interactive" | "muted" | "status";
type Size = "xs" | "sm" | "md" | "lg";
type ActivityState = "idle" | "active" | "pending";

const SIZE: Record<Size, { box: string; mark: string }> = {
  xs: { box: "h-6 w-6", mark: "h-3 w-3" },
  sm: { box: "h-8 w-8", mark: "h-4 w-4" },
  md: { box: "h-10 w-10", mark: "h-5 w-5" },
  lg: { box: "h-14 w-14", mark: "h-7 w-7" },
};

const STATE_LABEL: Record<ActivityState, string> = {
  idle: "",
  active: "Kreto is working on this",
  pending: "Kreto is waiting on you",
};

interface KretoMarkProps {
  variant?: Variant;
  size?: Size;
  /** Only render a pulse when something is genuinely active/pending -- never invent one. */
  state?: ActivityState;
  /** Required (and enforced via aria-label) when variant is "interactive". */
  label?: string;
  onClick?: () => void;
  className?: string;
}

export const KretoMark = ({
  variant = "default",
  size = "md",
  state = "idle",
  label,
  onClick,
  className,
}: KretoMarkProps) => {
  const s = SIZE[size];
  const isInteractive = variant === "interactive" || !!onClick;
  const showPulse = state !== "idle";

  // The K-mark art itself is recolored via mask-image so it reads correctly
  // on any surface (solid chip fill, dark card, muted background) without
  // guessing at the source asset's native color.
  const markStyle: CSSProperties = {
    WebkitMaskImage: `url(${kMarkAsset.url})`,
    maskImage: `url(${kMarkAsset.url})`,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    backgroundColor:
      variant === "compact" ? "white" : variant === "muted" ? "hsl(var(--muted-foreground))" : "hsl(var(--energy))",
  };

  const surfaceClass = cn(
    "relative inline-flex shrink-0 select-none items-center justify-center rounded-full",
    s.box,
    variant === "compact" && "bg-[hsl(var(--energy))]",
    variant === "muted" && "bg-white/5 opacity-60",
    (variant === "default" || variant === "status") &&
      "bg-[hsl(var(--k-midnight))] ring-1 ring-white/10",
    isInteractive &&
      "transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--energy))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    className,
  );

  const content = (
    <>
      <span aria-hidden className={s.mark} style={markStyle} />
      {showPulse && (
        <span
          aria-hidden
          className={cn(
            "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background motion-safe:animate-pulse",
            state === "pending" ? "bg-amber-400" : "bg-[hsl(var(--energy))]",
          )}
        />
      )}
      {showPulse && <span className="sr-only">{STATE_LABEL[state]}</span>}
    </>
  );

  if (isInteractive) {
    return (
      <button type="button" onClick={onClick} aria-label={label || "Open Kreto"} className={surfaceClass}>
        {content}
      </button>
    );
  }

  return (
    <span
      className={surfaceClass}
      aria-hidden={!label}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {content}
    </span>
  );
};

export default KretoMark;
