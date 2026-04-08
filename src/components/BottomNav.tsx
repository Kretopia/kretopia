import { Link, useLocation } from "react-router-dom";
import { Sparkles, Briefcase, LayoutDashboard, Wallet, User, Home, Users, CalendarDays, UserSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo, useRef, useState, useEffect } from "react";
import { useNavMode, NavMode } from "@/hooks/useNavMode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const CREATE_ITEMS = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/events", icon: CalendarDays, label: "Events" },
  { path: "/circle", icon: Sparkles, label: "Match" },
  { path: "/circles", icon: Users, label: "Circles" },
];

const WORK_ITEMS = [
  { path: "/desk", icon: LayoutDashboard, label: "Desk" },
  { path: "/opportunities", icon: Briefcase, label: "Gigs" },
  { path: "/thrivepay", icon: Wallet, label: "Pay" },
  { path: "/profile", icon: User, label: "Profile" },
];

const COMPANY_ITEMS = [
  { path: "/desk", icon: LayoutDashboard, label: "Desk" },
  { path: "/opportunities", icon: Briefcase, label: "Gigs" },
  { path: "/talent-finder", icon: UserSearch, label: "Talent" },
  { path: "/thrivepay", icon: Wallet, label: "Pay" },
];

const MODE_META: Record<NavMode, { label: string; accent: string }> = {
  create: { label: "Explore", accent: "bg-[hsl(var(--mode-accent))]" },
  work: { label: "Work", accent: "bg-[hsl(var(--mode-accent))]" },
};

const BottomNav = memo(() => {
  const location = useLocation();
  const { user } = useAuth();
  const { mode, toggle, setMode } = useNavMode();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [isCompany, setIsCompany] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("account_type")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const company = data?.account_type === "company";
        setIsCompany(company);
        if (company && mode === "create") setMode("work");
      });
  }, [user?.id]);

  if (location.pathname === "/auth") return null;

  const items = isCompany ? COMPANY_ITEMS : (mode === "create" ? CREATE_ITEMS : WORK_ITEMS);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/events") return location.pathname === "/events";
    if (path === "/circle") return location.pathname.startsWith("/circle") && !location.pathname.startsWith("/circles");
    if (path === "/circles") return location.pathname === "/circles";
    if (path === "/opportunities") return location.pathname === "/opportunities" || location.pathname === "/opportunity-dashboard";
    if (path === "/desk") return location.pathname.startsWith("/desk");
    return location.pathname === path;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (isCompany) return; // No mode swiping for company accounts
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 60 && dy < 40) {
      if (dx < 0 && mode === "create") toggle();
      if (dx > 0 && mode === "work") toggle();
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/50 glass-strong"
      role="navigation"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {!isCompany && (
        <div className="flex items-center justify-center gap-2 pt-1.5 pb-0.5">
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-semibold tracking-wide uppercase transition-all active:scale-95 bg-muted/60 text-muted-foreground touch-manipulation min-h-[36px]"
          >
            <span className={cn("h-1.5 w-1.5 rounded-full transition-colors", MODE_META[mode].accent)} />
            {MODE_META[mode].label}
            <span className="text-[8px] opacity-50 ml-0.5">← swipe →</span>
          </button>
        </div>
      )}

      <div className="flex items-center justify-around px-2 py-1">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path + item.label}
              to={item.path}
              aria-label={`Navigate to ${item.label}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[64px] min-h-[48px]",
                "touch-manipulation select-none active:scale-95",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <item.icon className={cn("h-5 w-5 transition-all duration-200", active && "scale-110")} />
              <span className={cn("text-[10px] font-medium leading-tight", active && "font-semibold")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";

export default BottomNav;
