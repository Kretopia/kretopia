import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** "sm" = icon only sizing, "md" = icon + text (default), "lg" = larger for hero/auth */
  size?: "sm" | "md" | "lg";
  /** Show the BETA badge */
  showBeta?: boolean;
  /** Link to home on click */
  linkToHome?: boolean;
  /** Extra classes on the wrapper */
  className?: string;
  /** Show only the text mark, no K icon */
  textOnly?: boolean;
  /** Show only the K icon, no text */
  iconOnly?: boolean;
}

const sizeConfig = {
  sm: { mark: "h-6 w-6",  text: "text-lg",  gap: "gap-2" },
  md: { mark: "h-7 w-7",  text: "text-xl",  gap: "gap-2.5" },
  lg: { mark: "h-10 w-10", text: "text-3xl", gap: "gap-3" },
} as const;

/**
 * Kretopia brand mark — gradient "K" lockup paired with the Satoshi wordmark.
 * Mirrors the v1 brand sheet (Purple Dream / Sunset Drive sweep).
 */
function KMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="kretopia-k-grad" x1="4" y1="44" x2="44" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#4B2CF5" />
          <stop offset="45%"  stopColor="#FF2CA7" />
          <stop offset="75%"  stopColor="#FF6A3D" />
          <stop offset="100%" stopColor="#FFB347" />
        </linearGradient>
      </defs>
      {/* Stylised K — heavy vertical + two angled strokes */}
      <path
        d="M10 4 L18 4 L18 44 L10 44 Z"
        fill="url(#kretopia-k-grad)"
      />
      <path
        d="M18 24 L36 4 L44 4 L26 24 Z"
        fill="url(#kretopia-k-grad)"
        opacity="0.95"
      />
      <path
        d="M18 24 L26 24 L44 44 L36 44 Z"
        fill="url(#kretopia-k-grad)"
      />
    </svg>
  );
}

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
      {!textOnly && <KMark className={cfg.mark} />}
      {!iconOnly && (
        <span
          className={cn(
            cfg.text,
            "font-display font-black tracking-tight text-foreground select-none lowercase"
          )}
          style={{ letterSpacing: "-0.035em" }}
        >
          kretopia
        </span>
      )}
      {showBeta && (
        <span
          className="hidden sm:inline-block text-white border-0 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md leading-none bg-k-purple-dream"
        >
          BETA
        </span>
      )}
    </span>
  );

  if (linkToHome) {
    return (
      <Link to="/" aria-label="Kretopia Home">
        {content}
      </Link>
    );
  }

  return content;
}
