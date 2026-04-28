import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import thriveinIcon from "@/assets/thrivein-icon.png";

interface BrandLogoProps {
  /** "sm" = icon only, "md" = icon + text (default), "lg" = larger for hero/auth */
  size?: "sm" | "md" | "lg";
  /** Show the BETA badge */
  showBeta?: boolean;
  /** Link to home on click */
  linkToHome?: boolean;
  /** Extra classes on the wrapper */
  className?: string;
  /** Show only the text mark, no icon */
  textOnly?: boolean;
  /** Show only the icon, no text */
  iconOnly?: boolean;
}

const sizeConfig = {
  sm: { icon: "h-10 w-10", text: "text-lg", gap: "gap-1.5" },
  md: { icon: "h-12 w-12", text: "text-xl", gap: "gap-2" },
  lg: { icon: "h-16 w-16", text: "text-3xl", gap: "gap-2.5" },
} as const;

/**
 * Single source of truth for the ThriveIN brand mark.
 * Use this everywhere instead of inline logo rendering.
 */
export function BrandLogo({
  size = "md",
  showBeta = false,
  linkToHome = false,
  className,
  textOnly = false,
  iconOnly = false,
}: BrandLogoProps) {
  const cfg = sizeConfig[size];

  const content = (
    <span className={cn("flex items-center shrink-0", cfg.gap, className)}>
      {!textOnly && (
        <img
          src={thriveinIcon}
          alt="ThriveIN"
          className={cn(cfg.icon, "object-contain")}
        />
      )}
      {!iconOnly && (
        <span
          className={cn(
            cfg.text,
            "font-black tracking-tight text-primary select-none"
          )}
        >
          Thrive<span className="text-energy">IN</span>
        </span>
      )}
      {showBeta && (
        <span className="hidden sm:inline-block bg-energy/15 text-energy border border-energy/30 text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-md leading-none">
          BETA
        </span>
      )}
    </span>
  );

  if (linkToHome) {
    return (
      <Link to="/" aria-label="ThriveIN Home">
        {content}
      </Link>
    );
  }

  return content;
}
