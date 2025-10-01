import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, LogOut, Flame, Trophy, Users, Sparkles, Menu, Settings, LayoutDashboard, Compass, Briefcase, FolderKanban, Zap, Coins, HardDrive, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SupportDialog } from "@/components/SupportDialog";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "next-themes";
import logoWhite from "@/assets/logo-white.png";
import logoBlack from "@/assets/logo-black.png";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  const { theme } = useTheme();

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
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-lg" role="navigation" aria-label="Main navigation">
      <div className="container mx-auto flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center" aria-label="ThriveIN Home">
          <img 
            src={theme === "dark" ? logoWhite : logoBlack} 
            alt="ThriveIN Logo" 
            className="h-16 sm:h-20"
          />
        </Link>

        {/* Desktop Navigation */}
        {user && !isLandingPage && (
          <div className="hidden lg:flex items-center gap-1" role="menubar" aria-label="Desktop menu">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2" aria-label="Go to Dashboard">
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </Button>
            </Link>
            <Link to="/discover">
              <Button variant="ghost" size="sm" className="gap-2" aria-label="Go to Discover">
                <Compass className="h-4 w-4" aria-hidden="true" />
                Discover
              </Button>
            </Link>
            <Link to="/messages">
              <Button variant="ghost" size="sm" className="gap-2" aria-label="Go to Messages">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Messages
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

        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          {user && !isLandingPage ? (
            <>
              {/* Mobile Menu */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden h-10 w-10 sm:h-12 sm:w-12">
                    <Menu className="h-6 w-6 sm:h-7 sm:w-7" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-2 mt-6">
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-11"
                      onClick={() => handleNavigation("/messages")}
                    >
                      <MessageCircle className="h-5 w-5" />
                      Messages
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-11"
                      onClick={() => handleNavigation("/spark")}
                    >
                      <Flame className="h-5 w-5" />
                      Spark
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-11"
                      onClick={() => handleNavigation("/studio")}
                    >
                      <Sparkles className="h-5 w-5" />
                      Studio
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-11"
                      onClick={() => handleNavigation("/subscription")}
                    >
                      <Zap className="h-5 w-5" />
                      Subscription
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-11"
                      onClick={() => handleNavigation("/storage")}
                    >
                      <HardDrive className="h-5 w-5" />
                      Storage
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-11"
                      onClick={() => handleNavigation("/earn-credits")}
                    >
                      <Coins className="h-5 w-5" />
                      Earn Credits
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-11"
                      onClick={() => handleNavigation("/manage-opportunities")}
                    >
                      <Briefcase className="h-5 w-5" />
                      Manage Opportunities
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-11"
                      onClick={() => handleNavigation("/leaderboard")}
                    >
                      <Trophy className="h-5 w-5" />
                      Leaderboard
                    </Button>
                    
                    <Separator className="my-2" />
                    
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-11"
                      onClick={() => handleNavigation("/profile")}
                    >
                      <User className="h-5 w-5" />
                      Profile
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-11"
                      onClick={() => handleNavigation("/profile?tab=settings")}
                    >
                      <Settings className="h-5 w-5" />
                      Settings
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start gap-3 h-11 text-destructive hover:text-destructive mt-2"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Desktop User Menu */}
              <NotificationCenter />
              <SupportDialog />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hidden lg:flex h-10 w-10 rounded-full"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {user?.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">My Account</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile?tab=settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/subscription")}>
                    <Zap className="mr-2 h-4 w-4" />
                    Subscription
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/storage")}>
                    <HardDrive className="mr-2 h-4 w-4" />
                    Storage
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
