import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Star, Stamp, ShieldCheck, BookOpen, Receipt, Wallet, Briefcase, BadgeCheck } from "lucide-react";

/**
 * PassportAnchorStrip — single horizontal nav rendered at the top of
 * every Passport surface (/profile, /thrivepay, /credits, /accounting).
 *
 * 8 anchors per Daily Driver IA: Standing · Stamps · Co-signs · Press Kit ·
 * Receipts · Wallet · Recent work · Verification.
 *
 * Each item routes to the existing underlying page so we don't have to
 * collapse 2,000+ lines of legacy code in one pass — the surface feels
 * unified, the implementation stays incremental.
 */

type Anchor = {
  id: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (pathname: string, hash: string) => boolean;
};

const ANCHORS: Anchor[] = [
  { id: "standing",     label: "Standing",     to: "/profile#standing",       icon: Star,        match: (p, h) => p === "/profile" && h === "#standing" },
  { id: "stamps",       label: "Stamps",       to: "/credits",                icon: Stamp,       match: (p) => p.startsWith("/credits") },
  { id: "cosigns",      label: "Co-signs",     to: "/profile#cosigns",        icon: ShieldCheck, match: (p, h) => p === "/profile" && h === "#cosigns" },
  { id: "presskit",     label: "Press Kit",    to: "/profile#presskit",       icon: BookOpen,    match: (p, h) => p === "/profile" && h === "#presskit" },
  { id: "receipts",     label: "Receipts",     to: "/thrivepay?tab=earnings", icon: Receipt,     match: (p) => p.startsWith("/accounting") },
  { id: "wallet",       label: "Wallet",       to: "/thrivepay",              icon: Wallet,      match: (p) => p.startsWith("/thrivepay") },
  { id: "work",         label: "Recent work",  to: "/profile#work",           icon: Briefcase,   match: (p, h) => p === "/profile" && h === "#work" },
  { id: "verification", label: "Verification", to: "/profile#verification",   icon: BadgeCheck,  match: (p, h) => p === "/profile" && h === "#verification" },
];

export function PassportAnchorStrip({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();

  // Default-active item when none matches a hash/route precisely
  const fallbackId =
    pathname === "/profile" ? "standing"
    : pathname.startsWith("/credits") ? "stamps"
    : pathname.startsWith("/accounting") ? "receipts"
    : pathname.startsWith("/thrivepay") ? "wallet"
    : "standing";

  return (
    <div className={cn("relative -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 bg-background", className)}>
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground pr-2 shrink-0">
          Passport
        </span>
        {ANCHORS.map((a) => {
          const active = a.match(pathname, hash) || (!ANCHORS.some((x) => x.match(pathname, hash)) && a.id === fallbackId);
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => navigate(a.to)}
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
