import { Link, useLocation } from "react-router-dom";
import { Users, Compass, User, Flame, Sparkles, MessageSquareMore } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingTooltip } from "@/components/onboarding/OnboardingTooltip";

const BottomNav = memo(() => {
  const location = useLocation();
  const { user } = useAuth();
  const [accountType, setAccountType] = useState<string>("individual");

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("account_type")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.account_type) setAccountType(data.account_type);
      });
  }, [user?.id]);

  // Hide bottom nav on landing page
  if (location.pathname === "/") {
    return null;
  }

  const isCompany = accountType === "company";
  
  const navItems = isCompany
    ? [
        { path: "/discover", icon: Compass, label: "Discover", tourId: "discover-tab", tooltip: { id: "nav-discover", title: "Discover", desc: "Browse creators and talent" } },
        { path: "/scene", icon: Flame, label: "Scene", tourId: "scene-tab", tooltip: { id: "nav-scene", title: "Scene", desc: "Events, inspiration & nearby creators" } },
        { path: "/circles", icon: MessageSquareMore, label: "Circles", tourId: "circles-tab", tooltip: { id: "nav-circles", title: "Circles", desc: "Join community spaces" } },
        { path: "/discover?tab=gigs", icon: Users, label: "Gigs", tourId: "gigs-tab", tooltip: { id: "nav-gigs", title: "Gigs", desc: "Post and manage hiring" } },
      ]
    : [
        { path: "/circle", icon: Sparkles, label: "Match", tourId: "circle-tab", tooltip: { id: "nav-circle", title: "Match", desc: "Swipe to discover & connect with creators" } },
        { path: "/circles", icon: MessageSquareMore, label: "Circles", tourId: "circles-tab", tooltip: { id: "nav-circles", title: "Circles", desc: "Community spaces & conversations" } },
        { path: "/scene", icon: Flame, label: "Scene", tourId: "scene-tab", tooltip: { id: "nav-scene", title: "Scene", desc: "Events, inspiration & nearby creators" } },
        { path: "/discover", icon: Compass, label: "Discover", tourId: "discover-tab", tooltip: { id: "nav-discover", title: "Discover", desc: "Browse creators, credits, and gigs" } },
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
            (path === "/discover" && location.pathname === "/directory") ||
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
