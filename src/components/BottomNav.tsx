import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Compass, Plus, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { PostOpportunityDialog } from "@/components/PostOpportunityDialog";
import { Button } from "@/components/ui/button";

const BottomNav = () => {
  const location = useLocation();
  const [showPostDialog, setShowPostDialog] = useState(false);
  
  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { path: "/discover", icon: Compass, label: "Discover" },
    { path: "/messages", icon: MessageCircle, label: "Messages" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background/95 backdrop-blur-lg" role="navigation" aria-label="Mobile navigation">
        <div className="flex items-center justify-around px-2 py-2 relative">
          {/* First two items */}
          {navItems.slice(0, 2).map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                aria-label={`Navigate to ${label}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-smooth min-w-[64px]",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            );
          })}
          
          {/* Center Post Button */}
          <Button
            onClick={() => setShowPostDialog(true)}
            className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg -mt-6"
            aria-label="Post Opportunity"
          >
            <Plus className="h-6 w-6 text-primary-foreground" />
          </Button>
          
          {/* Last two items */}
          {navItems.slice(2).map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                aria-label={`Navigate to ${label}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-smooth min-w-[64px]",
                  isActive 
                    ? "bg-primary/10 text-primary" 
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

      <PostOpportunityDialog
        open={showPostDialog}
        onOpenChange={setShowPostDialog}
        onSuccess={() => setShowPostDialog(false)}
      />
    </>
  );
};

export default BottomNav;
