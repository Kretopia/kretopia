import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, LogOut, Flame, Trophy, Users, Sparkles, Menu, Settings, LayoutDashboard, Compass, Briefcase, FolderKanban, Zap, Coins, HardDrive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SupportDialog } from "@/components/SupportDialog";
import { NotificationCenter } from "@/components/NotificationCenter";
import logoWhite from "@/assets/logo-white.png";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

interface NavbarProps {
  user?: { email?: string } | null;
}

const Navbar = ({ user }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const isLandingPage = location.pathname === "/";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been successfully signed out",
    });
    setIsOpen(false);
    navigate("/");
  };

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-lg">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center">
          <img 
            src={logoWhite} 
            alt="ThriveIN" 
            className="h-20"
          />
        </Link>

        {/* Desktop Navigation */}
        {user && !isLandingPage && (
          <div className="hidden lg:flex items-center gap-1">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/discover">
              <Button variant="ghost" size="sm" className="gap-2">
                <Compass className="h-4 w-4" />
                Discover
              </Button>
            </Link>
            <Link to="/projects">
              <Button variant="ghost" size="sm" className="gap-2">
                <FolderKanban className="h-4 w-4" />
                ThriveDesk
              </Button>
            </Link>
            <Link to="/studio">
              <Button variant="ghost" size="sm" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Studio
              </Button>
            </Link>
            <Link to="/circle">
              <Button variant="ghost" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                Circle
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="ghost" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                Profile
              </Button>
            </Link>
          </div>
        )}

        <div className="flex items-center gap-4">
          {user && !isLandingPage ? (
            <>
              {/* Mobile Menu */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden h-12 w-12">
                    <Menu className="h-7 w-7" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-4 mt-8">
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12"
                      onClick={() => handleNavigation("/dashboard")}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      Dashboard
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12"
                      onClick={() => handleNavigation("/discover")}
                    >
                      <Compass className="h-5 w-5" />
                      Discover
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12"
                      onClick={() => handleNavigation("/spark")}
                    >
                      <Flame className="h-5 w-5" />
                      Spark
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12"
                      onClick={() => handleNavigation("/projects")}
                    >
                      <FolderKanban className="h-5 w-5" />
                      ThriveDesk
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12"
                      onClick={() => handleNavigation("/studio")}
                    >
                      <Sparkles className="h-5 w-5" />
                      Studio
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12"
                      onClick={() => handleNavigation("/subscription")}
                    >
                      <Zap className="h-5 w-5" />
                      Subscription
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12"
                      onClick={() => handleNavigation("/storage")}
                    >
                      <HardDrive className="h-5 w-5" />
                      Storage
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12"
                      onClick={() => handleNavigation("/earn-credits")}
                    >
                      <Coins className="h-5 w-5" />
                      Earn Credits
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12"
                      onClick={() => handleNavigation("/manage-opportunities")}
                    >
                      <Briefcase className="h-5 w-5" />
                      Manage Opportunities
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12"
                      onClick={() => handleNavigation("/leaderboard")}
                    >
                      <Trophy className="h-5 w-5" />
                      Leaderboard
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12"
                      onClick={() => handleNavigation("/circle")}
                    >
                      <Users className="h-5 w-5" />
                      Circle
                    </Button>
                    
                    <Separator className="my-2" />
                    
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12"
                      onClick={() => handleNavigation("/profile")}
                    >
                      <User className="h-5 w-5" />
                      Profile
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12"
                      onClick={() => handleNavigation("/profile?tab=settings")}
                    >
                      <Settings className="h-5 w-5" />
                      Settings
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start gap-3 h-12 text-destructive hover:text-destructive"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Desktop Sign Out */}
              <NotificationCenter />
              <SupportDialog />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSignOut}
                className="hidden lg:flex"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : !user && isLandingPage ? (
            <>
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button variant="gradient">Get Started</Button>
              </Link>
            </>
          ) : user && isLandingPage ? (
            <Link to="/dashboard">
              <Button variant="gradient">Go to Dashboard</Button>
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
