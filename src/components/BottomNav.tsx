import { Link, useLocation } from "react-router-dom";
import { Bot, Users, Briefcase, PieChart, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo } from "react";

const BottomNav = memo(() => {
  const location = useLocation();
  
  // Hide bottom nav on landing page
  if (location.pathname === "/") {
    return null;
  }
  
  const navItems = [
    { path: "/circle", icon: Users, label: "Circle", tourId: "circle-tab" },
    { path: "/opportunities", icon: Briefcase, label: "Opps", tourId: "opportunities-tab" },
    { path: "/desk", icon: FolderKanban, label: "Desk", tourId: "projects-tab" },
    { path: "/accounting", icon: PieChart, label: "Money", tourId: "accounting-tab" },
    { path: "/thrive-ai", icon: Bot, label: "ThriveAI", tourId: "thrive-ai-tab" },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/50 glass-strong" 
      role="navigation" 
      aria-label="Mobile navigation"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ path, icon: Icon, label, tourId }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              data-tour={tourId}
              aria-label={`Navigate to ${label}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px] min-h-[52px]",
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
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";

export default BottomNav;
