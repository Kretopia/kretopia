import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Compass, Plus, MessageCircle, User, Briefcase, Image, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { PostOpportunityDialog } from "@/components/PostOpportunityDialog";
import { AddPortfolioDialog } from "@/components/AddPortfolioDialog";
import { CreatePostDialog } from "@/components/feed/CreatePostDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BottomNav = () => {
  const location = useLocation();
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showPortfolioDialog, setShowPortfolioDialog] = useState(false);
  const [showSparkDialog, setShowSparkDialog] = useState(false);
  
  // Hide bottom nav on landing page
  if (location.pathname === "/") {
    return null;
  }
  
  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { path: "/discover", icon: Compass, label: "Discover" },
    { path: "/circle", icon: Flame, label: "Spark" },
    { path: "/projects", icon: Briefcase, label: "Projects" },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background/98 backdrop-blur-xl safe-area-inset-bottom" role="navigation" aria-label="Mobile navigation">
        <div className="flex items-center justify-around px-2 py-3 relative">
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
          
          {/* Center Plus Button with Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl hover:shadow-glow active:scale-95 transition-all -mt-7"
                aria-label="Create new content"
              >
                <Plus className="h-7 w-7 text-primary-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56 mb-2">
              <DropdownMenuItem onClick={() => setShowSparkDialog(true)}>
                <Flame className="mr-2 h-4 w-4" />
                <span>Spark</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowPortfolioDialog(true)}>
                <Image className="mr-2 h-4 w-4" />
                <span>Add Portfolio</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowPostDialog(true)}>
                <Briefcase className="mr-2 h-4 w-4" />
                <span>Post Opportunity</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
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

      <PostOpportunityDialog
        open={showPostDialog}
        onOpenChange={setShowPostDialog}
        onSuccess={() => setShowPostDialog(false)}
      />

      <AddPortfolioDialog
        open={showPortfolioDialog}
        onOpenChange={setShowPortfolioDialog}
        onSuccess={() => setShowPortfolioDialog(false)}
      />

      <CreatePostDialog
        open={showSparkDialog}
        onOpenChange={setShowSparkDialog}
        onPostCreated={() => {
          setShowSparkDialog(false);
        }}
      />
    </>
  );
};

export default BottomNav;
