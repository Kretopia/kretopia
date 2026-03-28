import { Link, useLocation } from "react-router-dom";
import { Briefcase, Flame, Sparkles, MessageSquareMore } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { OnboardingTooltip } from "@/components/onboarding/OnboardingTooltip";

const BottomNav = memo(() => {
  const location = useLocation();

  // Hide bottom nav on landing page
  if (location.pathname === "/") {
    return null;
  }

  const navItems = [
    { path: "/circle", icon: Sparkles, label: "Match", tourId: "circle-tab", tooltip: { id: "nav-circle", title: "Match", desc: "Swipe & browse creators" } },
    { path: "/opportunities", icon: Briefcase, label: "Gigs", tourId: "gigs-tab", tooltip: { id: "nav-gigs", title: "Gigs", desc: "Jobs, barters & collabs" } },
    { path: "/scene", icon: Flame, label: "Scene", tourId: "scene-tab", tooltip: { id: "nav-scene", title: "Scene", desc: "Events, inspiration & nearby" } },
    { path: "/circles", icon: MessageSquareMore, label: "Circles", tourId: "circles-tab", tooltip: { id: "nav-circles", title: "Circles", desc: "Community spaces" } },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/50 glass-strong" 
      role="navigation" 
      aria-label="Mobile navigation"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const { path, icon: Icon, label, tourId, tooltip } = item;
          const isActive = location.pathname === path || 
            (path === "/opportunities" && location.pathname === "/opportunity-dashboard") ||
            (path === "/circle" && location.pathname.startsWith("/circle") && !location.pathname.startsWith("/circles"));
          
          const linkContent = (
            <Link
              key={path}
              to={path}
              data-tour={tourId}
              aria-label={`Navigate to ${label}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[64px] min-h-[52px]",
                "touch-manipulation select-none",
                "active:scale-95",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Icon className={cn("h-5 w-5 transition-all duration-200", isActive && "scale-110")} aria-hidden="true" />
              <span className={cn(
                "text-[10px] font-medium leading-tight transition-all duration-200",
                isActive && "font-semibold"
              )}>{label}</span>
            </Link>
          );

          return (
            <OnboardingTooltip
              key={path}
              id={tooltip.id}
              title={tooltip.title}
              description={tooltip.desc}
              position="top"
            >
              {linkContent}
            </OnboardingTooltip>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";

export default BottomNav;
