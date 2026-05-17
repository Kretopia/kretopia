import { Link, useLocation } from "react-router-dom";
import { Compass, LayoutGrid, Sun, BadgeCheck, Users, Briefcase, UserSearch, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { useAccountTone } from "@/hooks/useAccountTone";

// ThriveIN 2.0 — Daily Driver IA.
// Today · Desk · Scout · Circle · Passport. Daily actions only.
// Pay absorbed into Passport (#wallet). Hamburger = system/account only.
const NAV_ITEMS = [
  { path: "/", icon: Sun, label: "Today", hint: "Today — what to move forward" },
  { path: "/desk", icon: LayoutGrid, label: "Desk", hint: "Projects, rooms, files, tasks" },
  { path: "/scout", icon: Compass, label: "Scout", hint: "Opportunities, people, sponsors" },
  { path: "/circle", icon: Users, label: "Circle", hint: "Match, Live, Network" },
  { path: "/profile", icon: BadgeCheck, label: "Passport", hint: "Stamps, Co-signs, Wallet" },
];

// Company accounts get a B2B-focused nav (unchanged).
const COMPANY_ITEMS = [
  { path: "/desk", icon: LayoutGrid, label: "Studios", hint: "Your briefs & active projects" },
  { path: "/opportunities", icon: Briefcase, label: "Gigs", hint: "Roles you've posted & talent pool" },
  { path: "/talent-finder", icon: UserSearch, label: "Talent", hint: "Find creators to hire" },
  { path: "/thrivepay", icon: Wallet, label: "Pay", hint: "Pay creators & manage invoices" },
];

const BottomNav = memo(() => {
  const location = useLocation();
  const { isBusiness } = useAccountTone();

  if (location.pathname === "/auth") return null;

  const items = isBusiness ? COMPANY_ITEMS : NAV_ITEMS;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/scout") {
      return (
        location.pathname.startsWith("/scout") ||
        location.pathname === "/opportunities" ||
        location.pathname === "/opportunity-dashboard"
      );
    }
    if (path === "/desk") return location.pathname.startsWith("/desk");
    if (path === "/circle")
      return location.pathname.startsWith("/circle") && !location.pathname.startsWith("/circles");
    if (path === "/profile")
      return (
        location.pathname.startsWith("/profile") ||
        location.pathname.startsWith("/thrivepay") ||
        location.pathname.startsWith("/accounting") ||
        location.pathname.startsWith("/credits")
      );
    if (path === "/thrivepay")
      return location.pathname.startsWith("/thrivepay") || location.pathname.startsWith("/accounting");
    if (path === "/opportunities")
      return location.pathname === "/opportunities" || location.pathname === "/opportunity-dashboard";
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
                active ? "text-[hsl(var(--signal-teal))]" : "text-muted-foreground hover:text-foreground"
              )}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <item.icon className={cn("h-5 w-5 transition-all duration-200", active && "scale-105")} />
              <span className={cn("text-[10px] leading-tight", active ? "font-semibold" : "font-medium")}>
                {item.label}
              </span>
              {active && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-[hsl(var(--signal-teal))]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";

export default BottomNav;
