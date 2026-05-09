import { Link, useLocation } from "react-router-dom";
import { Sparkles, Briefcase, LayoutDashboard, Home, UserSearch, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { useAccountTone } from "@/hooks/useAccountTone";

// Single, focused MVP nav: Home · Desk · Match · Gigs · Pay
// `hint` is shown on hover/long-press so people don't have to guess what
// "Desk" or "Match" mean — especially helpful for non-creator visitors.
const NAV_ITEMS = [
  { path: "/", icon: Home, label: "Home", hint: "Your daily Home — what's new, what to do" },
  { path: "/desk", icon: LayoutDashboard, label: "Desk", hint: "Your workspaces & projects" },
  { path: "/circle", icon: Sparkles, label: "Match", hint: "Find people to collaborate with" },
  { path: "/opportunities", icon: Briefcase, label: "Gigs", hint: "Paid gigs & open opportunities" },
  { path: "/thrivepay", icon: Wallet, label: "Pay", hint: "Invoices, expenses & getting paid" },
];

// Company accounts get a B2B-focused nav
const COMPANY_ITEMS = [
  { path: "/desk", icon: LayoutDashboard, label: "Desk", hint: "Your briefs & active projects" },
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
    if (path === "/circle") return location.pathname.startsWith("/circle") && !location.pathname.startsWith("/circles");
    if (path === "/opportunities") return location.pathname === "/opportunities" || location.pathname === "/opportunity-dashboard";
    if (path === "/desk") return location.pathname.startsWith("/desk");
    if (path === "/thrivepay") return location.pathname.startsWith("/thrivepay") || location.pathname.startsWith("/accounting");
    return location.pathname === path;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/50 glass-strong"
      role="navigation"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
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
                active
                  ? "text-energy"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <item.icon className={cn("h-5 w-5 transition-all duration-200", active && "scale-110 drop-shadow-[0_0_8px_hsl(var(--energy)/0.6)]")} />
              <span className={cn("text-[10px] font-medium leading-tight", active && "font-semibold")}>{item.label}</span>
              {active && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-energy shadow-[0_0_8px_hsl(var(--energy)/0.8)]" />
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
