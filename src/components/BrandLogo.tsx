import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import kMarkAsset from "@/assets/brand/kretopia-k-mark.png.asset.json";
import wordmarkAsset from "@/assets/brand/kretopia-wordmark.png.asset.json";
import lockupAsset from "@/assets/brand/kretopia-lockup.png.asset.json";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showBeta?: boolean;
  linkToHome?: boolean;
  className?: string;
  /** Show only the wordmark image ("kretopia") */
  textOnly?: boolean;
  /** Show only the K mark icon */
  iconOnly?: boolean;
  /** Use the full official lockup PNG (K + kretopia together). Overrides icon/textOnly. */
  lockup?: boolean;
  /** Kept for API back-compat; the official assets read correctly on light + dark. */
  onDark?: boolean;
}

const sizeConfig = {
  sm: { mark: "h-7 w-7",   text: "h-5",  gap: "gap-2",   lockup: "h-7"  },
  md: { mark: "h-9 w-9",   text: "h-6",  gap: "gap-2.5", lockup: "h-9"  },
  lg: { mark: "h-12 w-12", text: "h-9",  gap: "gap-3",   lockup: "h-12" },
} as const;

export function BrandLogo({
  size = "md",
  showBeta = false,
  linkToHome = false,
  className,
  textOnly = false,
  iconOnly = false,
  lockup = false,
}: BrandLogoProps) {
  const cfg = sizeConfig[size];

  const content = (
    <span className={cn("flex items-center shrink-0", cfg.gap, className)}>
      {lockup ? (
        <img
          src={lockupAsset.url}
          alt="Kretopia"
          className={cn(cfg.lockup, "w-auto select-none object-contain")}
          draggable={false}
        />
      ) : (
        <>
          {!textOnly && (
            <img
              src={kMarkAsset.url}
              alt="Kretopia"
              className={cn(cfg.mark, "select-none object-contain")}
              draggable={false}
            />
          )}
          {!iconOnly && (
            <img
              src={wordmarkAsset.url}
              alt="kretopia"
              className={cn(cfg.text, "w-auto select-none object-contain")}
              draggable={false}
            />
          )}
        </>
      )}
      {showBeta && (
        <span className="hidden sm:inline-block text-white border-0 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md leading-none bg-k-purple-dream">
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
