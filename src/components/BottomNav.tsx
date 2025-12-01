import { Link, useLocation } from "react-router-dom";
import { MessageCircle, User, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, memo } from "react";
import { AddPortfolioDialog } from "@/components/AddPortfolioDialog";
import { Button } from "@/components/ui/button";

const BottomNav = memo(() => {
  const location = useLocation();
  const [showPortfolioDialog, setShowPortfolioDialog] = useState(false);
  
  // Hide bottom nav on landing page
  if (location.pathname === "/") {
    return null;
  }
  
  const navItems = [
    { path: "/circle", icon: Users, label: "Match" },
    { path: "/profile", icon: User, label: "Profile" },
    { path: "/messages", icon: MessageCircle, label: "Messages" },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background/98 backdrop-blur-xl safe-area-inset-bottom" role="navigation" aria-label="Mobile navigation">
        <div className="flex items-center justify-around px-2 py-3 relative">
          {/* First item */}
          {navItems.slice(0, 1).map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                aria-label={`Navigate to ${label}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-smooth min-w-[72px] active:scale-95",
                  isActive 
                    ? "bg-primary/10 text-primary scale-105" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            );
          })}
          
          {/* Center Plus Button */}
          <Button
            onClick={() => setShowPortfolioDialog(true)}
            className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl hover:shadow-glow active:scale-95 transition-all -mt-7"
            aria-label="Add to portfolio"
          >
            <Plus className="h-7 w-7 text-primary-foreground" />
          </Button>
          
          {/* Last two items */}
          {navItems.slice(1).map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                aria-label={`Navigate to ${label}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-smooth min-w-[72px] active:scale-95",
                  isActive 
                    ? "bg-primary/10 text-primary scale-105" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <AddPortfolioDialog
        open={showPortfolioDialog}
        onOpenChange={setShowPortfolioDialog}
        onSuccess={() => setShowPortfolioDialog(false)}
      />
    </>
  );
});

BottomNav.displayName = "BottomNav";

export default BottomNav;
