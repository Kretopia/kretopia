import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, Settings, Zap, Shield, Wallet, Briefcase, FileText, Users, FolderKanban, LayoutDashboard, Compass, MessageCircle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { SupportDialog } from "@/components/SupportDialog";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";

interface NavbarProps {
  user?: SupabaseUser | null;
}

const Navbar = ({ user }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const isLandingPage = location.pathname === "/";

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user?.id) return;
    
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      setIsAdmin(!!data);
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

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
    console.log('[Navbar] Navigating to:', path);
    setIsOpen(false);
    navigate(path);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-lg" role="navigation" aria-label="Main navigation">
      <div className="container mx-auto flex items-center justify-between px-3 sm:px-4 py-2">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2" aria-label="ThriveIN Home">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg sm:text-xl font-bold">thriveIN</span>
        </Link>


        <div className="flex items-center gap-2 sm:gap-4">
          {user && !isLandingPage && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 relative"
                onClick={() => navigate("/messages")}
                aria-label="Messages"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
              <NotificationCenter />
            </>
          )}
          
          <ThemeToggle />
          
          {user && !isLandingPage ? (
            <>
              {/* Hamburger Menu - Available on all screen sizes */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-1 mt-6">
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
                      onClick={() => {
                        setIsOpen(false);
                        setIsSupportOpen(true);
                      }}
                    >
                      <Zap className="h-5 w-5" />
                      AI Assistant
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
                      onClick={() => handleNavigation("/settings")}
                    >
                      <Settings className="h-5 w-5" />
                      Settings
                    </Button>
                    
                    <Separator className="my-3" />
                    
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12"
                      onClick={() => handleNavigation("/thrivepay")}
                    >
                      <Wallet className="h-5 w-5" />
                      ThrivePay
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12"
                      onClick={() => handleNavigation("/membership")}
                    >
                      <Zap className="h-5 w-5" />
                      Membership
                    </Button>
                    
                    {isAdmin && (
                      <>
                        <Button 
                          variant="ghost" 
                          className="justify-start gap-3 h-12"
                          onClick={() => handleNavigation("/admin")}
                        >
                          <Shield className="h-5 w-5" />
                          Admin Panel
                        </Button>
                      </>
                    )}
                    
                    <Separator className="my-3" />
                    
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
      <SupportDialog open={isSupportOpen} onOpenChange={setIsSupportOpen} />
    </nav>
  );
};

export default Navbar;
