import { Link, useLocation } from "react-router-dom";
import { Users, Compass, FolderKanban, User, Flame, Briefcase } from "lucide-react";
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

  const profilePath = user?.id ? `/profile/${user.id}` : "/profile";
  const isCompany = accountType === "company";
  
  const navItems = isCompany
    ? [
        { path: "/opportunities", icon: Briefcase, label: "Gigs", tourId: "gigs-tab", tooltip: { id: "nav-gigs", title: "Gigs", desc: "Post and manage hiring opportunities" } },
        { path: "/discover", icon: Compass, label: "Discover", tourId: "discover-tab", tooltip: { id: "nav-discover", title: "Discover", desc: "Browse creators and talent" } },
        { path: "/events", icon: CalendarDays, label: "Events", tourId: "events-tab", tooltip: { id: "nav-events", title: "Events", desc: "Discover & host creative events" } },
        { path: "/desk", icon: FolderKanban, label: "Projects", tourId: "projects-tab", tooltip: { id: "nav-desk", title: "Your Projects", desc: "Manage projects and deliverables" } },
        { path: profilePath, icon: User, label: "Profile", tourId: "profile-tab", tooltip: { id: "nav-profile", title: "Your Profile", desc: "View and edit your company profile" } },
      ]
    : [
        { path: "/circle", icon: Users, label: "Circle", tourId: "circle-tab", tooltip: { id: "nav-circle", title: "Your Circle", desc: "Find creators to collaborate with" } },
        { path: "/discover", icon: Compass, label: "Discover", tourId: "discover-tab", tooltip: { id: "nav-discover", title: "Discover", desc: "Browse creators, credits, and gigs" } },
        { path: "/events", icon: CalendarDays, label: "Events", tourId: "events-tab", tooltip: { id: "nav-events", title: "Events", desc: "Discover & host creative events and meetups" } },
        { path: "/desk", icon: FolderKanban, label: "Projects", tourId: "projects-tab", tooltip: { id: "nav-desk", title: "Your Projects", desc: "Manage projects, milestones, and deliverables" } },
        { path: profilePath, icon: User, label: "Profile", tourId: "profile-tab", tooltip: { id: "nav-profile", title: "Your Profile", desc: "View and edit your creator profile" } },
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
            (path === "/discover" && (location.pathname === "/directory" || location.pathname === "/opportunities")) ||
            (path === "/opportunities" && location.pathname === "/opportunities");
          
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
