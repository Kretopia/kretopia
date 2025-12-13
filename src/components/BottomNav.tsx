import { Link, useLocation } from "react-router-dom";
import { MessageCircle, User, Users, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo } from "react";

const BottomNav = memo(() => {
  const location = useLocation();
  
  // Hide bottom nav on landing page
  if (location.pathname === "/") {
    return null;
  }
  
  const navItems = [
    { path: "/circle", icon: Users, label: "Match" },
    { path: "/profile", icon: User, label: "Profile" },
    { path: "/desk", icon: Briefcase, label: "Desk" },
    { path: "/messages", icon: MessageCircle, label: "Messages" },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background/98 backdrop-blur-xl" 
      role="navigation" 
      aria-label="Mobile navigation"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      <div className="flex items-center justify-around px-1 py-1.5">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              aria-label={`Navigate to ${label}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] min-h-[48px]",
                "touch-manipulation select-none",
                "active:scale-90 active:bg-accent/80",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} aria-hidden="true" />
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";

export default BottomNav;
