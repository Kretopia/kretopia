import { Link, useLocation } from "react-router-dom";
import { Home, Search, Compass, BadgeCheck, Sparkles, Briefcase, UserSearch, Wallet, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo, useEffect, useState } from "react";
import { useAccountTone } from "@/hooks/useAccountTone";

/**
 * Kretopia V1 bottom nav — Home · Search · Scout · Passport · Kreto.
 *
 * Company/business accounts keep their existing B2B nav unchanged.
 * KrePay and Studio Lite are intentionally NOT in nav — they're surfaced
 * contextually inside opportunities, Passport, and Kreto insights.
 */
const CREATIVE_ITEMS = [
  { path: "/", icon: Home, label: "Home", hint: "Today, insights, and Kreto's brief" },
  { path: "/search", icon: Search, label: "Search", hint: "Search the Creative Universe" },
  { path: "/scout", icon: Compass, label: "Scout", hint: "Opportunities matched to you" },
  { path: "/profile", icon: BadgeCheck, label: "Passport", hint: "Your verified creative identity" },
  { path: "/kreto", icon: Sparkles, label: "Kreto", hint: "Your Executive Producer" },
];

const COMPANY_ITEMS = [
  { path: "/desk", icon: LayoutGrid, label: "Studios", hint: "Your briefs & active projects" },
  { path: "/opportunities", icon: Briefcase, label: "Gigs", hint: "Roles you've posted & talent pool" },
  { path: "/talent-finder", icon: UserSearch, label: "Talent", hint: "Find creators to hire" },
  { path: "/thrivepay", icon: Wallet, label: "Pay", hint: "Pay creators & manage invoices" },
];

const KretopiaBottomNav = memo(() => {
  const location = useLocation();
  const { isBusiness } = useAccountTone();

  if (location.pathname === "/auth") return null;

  const items = isBusiness ? COMPANY_ITEMS : CREATIVE_ITEMS;

  // Hide when a Radix dialog/sheet/drawer is open (keeps parity with legacy BottomNav).
  const [overlayOpen, setOverlayOpen] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const check = () => {
      const locked =
        document.body.hasAttribute("data-scroll-locked") ||
        !!document.querySelector(
          '[role="dialog"][data-state="open"], [data-radix-dialog-content][data-state="open"]'
        );
      setOverlayOpen(locked);
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-scroll-locked", "style"],
      childList: true,
      subtree: true,
    });
    return () => obs.disconnect();
  }, []);
  if (overlayOpen) return null;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/search") return location.pathname.startsWith("/search");
    if (path === "/scout") {
      return (
        location.pathname.startsWith("/scout") ||
        location.pathname === "/opportunities" ||
        location.pathname === "/opportunity-dashboard"
      );
    }
    if (path === "/profile") {
      return (
        location.pathname.startsWith("/profile") ||
        location.pathname.startsWith("/passport") ||
        location.pathname.startsWith("/thrivepay") ||
        location.pathname.startsWith("/accounting") ||
        location.pathname.startsWith("/credits")
      );
    }
    if (path === "/kreto") return location.pathname.startsWith("/kreto");
    if (path === "/desk") return location.pathname.startsWith("/desk");
    return location.pathname === path;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/60 bg-background"
      role="navigation"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 10px)" }}
    >
      <div className="flex items-center justify-around px-1 py-1">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path + item.label}
              to={item.path}
              title={item.hint}
              aria-label={`${item.label} — ${item.hint}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-all duration-200 flex-1 min-h-[48px]",
                "touch-manipulation select-none active:scale-95",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <item.icon className={cn("h-5 w-5 transition-all duration-200", active && "scale-105")} />
              <span className={cn("text-[10px] leading-tight", active ? "font-semibold" : "font-medium")}>
                {item.label}
              </span>
              {active && (
                <span
                  className="absolute -top-px left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                  style={{ background: "var(--kretopia-sunset, linear-gradient(90deg,#4B2CF5,#FF2CA7,#FF6A3D,#FFB347))" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

KretopiaBottomNav.displayName = "KretopiaBottomNav";
export default KretopiaBottomNav;
