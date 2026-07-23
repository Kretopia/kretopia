import { Link, useLocation } from "react-router-dom";
import { Home, Search, Compass, BadgeCheck, Sparkles, Users, Gift, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { useAccountTone } from "@/hooks/useAccountTone";

/**
 * Kretopia V1 desktop sidebar. Renders on lg+ only. Mobile uses BottomNav.
 *
 * Order: Home · Search · Scout · Passport · Kreto · Kretopia · Perks · Settings.
 * KrePay and Studio Lite are intentionally omitted — surfaced contextually.
 */
const ITEMS = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/search", icon: Search, label: "Search" },
  { path: "/scout", icon: Compass, label: "Scout" },
  { path: "/profile", icon: BadgeCheck, label: "Passport" },
  { path: "/kreto", icon: Sparkles, label: "Kreto" },
  { path: "/thrivein", icon: Users, label: "Kretopia" },
  { path: "/perks", icon: Gift, label: "Perks" },
  { path: "/settings", icon: SettingsIcon, label: "Settings" },
];

export const KretopiaSidebar = memo(() => {
  const location = useLocation();
  const { isBusiness } = useAccountTone();
  if (isBusiness) return null;
  if (location.pathname === "/auth" || location.pathname.startsWith("/onboarding")) return null;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/profile") {
      return (
        location.pathname.startsWith("/profile") ||
        location.pathname.startsWith("/passport")
      );
    }
    if (path === "/scout") {
      return (
        location.pathname.startsWith("/scout") ||
        location.pathname === "/opportunities"
      );
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-60 flex-col border-r border-border/60 bg-background px-3 py-4"
      aria-label="Kretopia navigation"
    >
      <Link to="/" className="mb-6 px-3 flex items-center gap-2">
        <span className="text-lg font-serif font-semibold tracking-tight">Kretopia</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-muted text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3 pt-4 text-[11px] text-muted-foreground">
        Kretopia — powered by Kretopia
      </div>
    </aside>
  );
});

KretopiaSidebar.displayName = "KretopiaSidebar";
export default KretopiaSidebar;
