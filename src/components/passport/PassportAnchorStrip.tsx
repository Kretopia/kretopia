import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Star, Stamp, Receipt, Wallet } from "lucide-react";

/**
 * PassportAnchorStrip — single horizontal nav rendered at the top of
 * every Passport surface (/profile, /thrivepay, /credits, /accounting).
 *
 * Batch 2.5 audit: dropped 4 dead anchors (Co-signs, Press Kit, Recent work,
 * Verification) — those sections don't exist as DOM ids yet. Keep only the
 * 4 that route to real surfaces: Standing (scroll-to-top of Profile),
 * Stamps (/credits), Receipts (/accounting), Wallet (/thrivepay).
 */

type Anchor = {
  id: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (pathname: string) => boolean;
};

type AnchorMatch = (pathname: string, search: string) => boolean;
type AnchorWithSearch = Omit<Anchor, "match"> & { match: AnchorMatch };

// /accounting is a redirect → /thrivepay?tab=earnings, so Receipts must match the
// query string, not the original path. Wallet only wins when no tab is selected.
const ANCHORS: AnchorWithSearch[] = [
  { id: "standing", label: "Standing", to: "/profile",                    icon: Star,    match: (p) => p === "/profile" },
  { id: "stamps",   label: "Stamps",   to: "/credits",                    icon: Stamp,   match: (p) => p.startsWith("/credits") },
  { id: "receipts", label: "Receipts", to: "/thrivepay?tab=earnings",     icon: Receipt, match: (p, s) => p.startsWith("/thrivepay") && new URLSearchParams(s).get("tab") === "earnings" },
  { id: "wallet",   label: "Wallet",   to: "/thrivepay",                  icon: Wallet,  match: (p, s) => p.startsWith("/thrivepay") && new URLSearchParams(s).get("tab") !== "earnings" },
];

export function PassportAnchorStrip({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleClick = (a: Anchor) => {
    if (a.id === "standing" && pathname === "/profile") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate(a.to);
  };

  return (
    <div className={cn("relative -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 bg-background", className)}>
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground pr-2 shrink-0">
          Passport
        </span>
        {ANCHORS.map((a) => {
          const active = a.match(pathname);
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => handleClick(a)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 shrink-0 px-3 h-8 rounded-full text-[12px] font-medium border transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-foreground/5 hover:bg-foreground/10 text-foreground/75 border-transparent"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PassportAnchorStrip;
