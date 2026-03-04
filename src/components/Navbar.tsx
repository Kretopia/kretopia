import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Menu, Settings, Users, User, Briefcase, MessageCircle, BarChart3, Wallet, ShoppingBag, Shield, Crown, Sparkles, Building2, DollarSign, Flame, Trophy, Target, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import thriveinIcon from "@/assets/thrivein-icon.png";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getTierDisplayName } from "@/lib/subscriptionConfig";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect, memo } from "react";

interface NavbarProps {
  user?: SupabaseUser | null;
}

const Navbar = memo(({ user }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { subscriptionInfo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [accountType, setAccountType] = useState<"individual" | "company">("individual");
  const isLandingPage = location.pathname === "/";
  const isPro = subscriptionInfo.subscribed;
  const tierName = getTierDisplayName(subscriptionInfo.tier as any);

  // Fetch account type
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("account_type")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.account_type) setAccountType(data.account_type);
      });
  }, [user?.id]);

  const handleSignOut = async () => {
    try {
      setIsOpen(false);
      
      // Try to sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      if (error) {
        console.error('[Navbar] Sign out error:', error);
        // Even if server sign out fails, clear local storage and redirect
        localStorage.removeItem('sb-kwmcocsitwssrtzkdojh-auth-token');
        sessionStorage.clear();
      }
      
      // Track sign out (non-blocking)
      import("@/lib/analytics")
        .then(({ analytics }) => analytics.signOut())
        .catch(() => {});
      
      toast({
        title: "Signed out",
        description: "You've been successfully signed out",
      });
      
      navigate("/", { replace: true });
    } catch (error) {
      console.error('[Navbar] Sign out exception:', error);
      
      // Force clear local auth state even on network failure
      try {
        localStorage.removeItem('sb-kwmcocsitwssrtzkdojh-auth-token');
        sessionStorage.clear();
      } catch (e) {
        console.error('[Navbar] Error clearing storage:', e);
      }
      
      toast({
        title: "Signed out",
        description: "You've been signed out locally",
      });
      
      navigate("/", { replace: true });
    }
  };

  const handleNavigation = (path: string) => {
    console.log('[Navbar] Navigating to:', path);
    setIsOpen(false);
    navigate(path);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 glass-strong" role="navigation" aria-label="Main navigation">
      <div className="container mx-auto flex items-center justify-between px-3 sm:px-4 py-2.5">
        <Link to={user ? "/circle" : "/"} className="flex items-center gap-2 sm:gap-3" aria-label="ThriveIN Home">
          <img 
            src={thriveinIcon} 
            alt="ThriveIN Icon" 
            className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
          />
          <span className="text-xl sm:text-2xl font-bold tracking-tight gradient-text">
            thriveIN
          </span>
          <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] uppercase tracking-widest font-semibold">
            BETA
          </Badge>
        </Link>

        {/* Desktop Navigation */}
        {user && !isLandingPage && (
          <div className="hidden lg:flex items-center gap-1">
            {(accountType === "company"
              ? [
                  { path: "/opportunities", icon: Briefcase, label: "Gigs" },
                  { path: "/desk", icon: Briefcase, label: "Projects" },
                  { path: "/thrivemoney", icon: DollarSign, label: "Earnings" },
                ]
              : [
                  { path: "/circle", icon: Users, label: "Circle" },
                  { path: "/opportunities", icon: Briefcase, label: "Gigs" },
                  { path: "/desk", icon: Briefcase, label: "Projects" },
                  { path: "/thrivemoney", icon: DollarSign, label: "Earnings" },
                ]
            ).map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-smooth text-sm font-medium",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        )}


        <div className="flex items-center gap-2 sm:gap-4">
          {user && !isLandingPage && (
            <div className="flex items-center gap-1">
              <Link to="/search" aria-label="Search">
                <Button variant="ghost" size="icon" className="h-10 w-10 hidden sm:inline-flex">
                  <Search className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/messages" aria-label="Messages">
                <Button variant="ghost" size="icon" className="h-10 w-10 relative">
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </Link>
              <NotificationCenter />
            </div>
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
                  <div className="flex flex-col gap-1 mt-6 overflow-y-auto max-h-[calc(100vh-8rem)]">
                    {/* Identity */}
                    <p className="text-xs font-medium text-muted-foreground px-3 mb-2">You</p>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12 w-full"
                      onClick={() => handleNavigation(`/profile/${user?.id}`)}
                    >
                      <User className="h-5 w-5" />
                      My Profile
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12 w-full"
                      onClick={() => handleNavigation("/my-analytics")}
                    >
                      <BarChart3 className="h-5 w-5" />
                      My Dashboard
                    </Button>

                    <Separator className="my-3" />

                    {/* Money */}
                    <p className="text-xs font-medium text-muted-foreground px-3 mb-2">Money</p>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12 w-full"
                      onClick={() => handleNavigation("/thrivemoney")}
                    >
                      <DollarSign className="h-5 w-5" />
                      Earnings
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12 w-full"
                      onClick={() => handleNavigation("/thrivepay")}
                    >
                      <Wallet className="h-5 w-5" />
                      Wallet
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12 w-full"
                      onClick={() => handleNavigation("/purchases")}
                    >
                      <ShoppingBag className="h-5 w-5" />
                      Purchases & Sales
                    </Button>

                    <Separator className="my-3" />

                    {/* Pro Tools */}
                    <p className="text-xs font-medium text-muted-foreground px-3 mb-2">Pro Tools</p>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12 w-full"
                      onClick={() => handleNavigation("/sales")}
                    >
                      <Target className="h-5 w-5" />
                      Sales Dashboard
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12 w-full"
                      onClick={() => handleNavigation("/nearby")}
                    >
                      <Users className="h-5 w-5" />
                      Nearby Creators
                    </Button>

                    <Separator className="my-3" />

                    {/* Account */}
                    <p className="text-xs font-medium text-muted-foreground px-3 mb-2">Account</p>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-auto w-full py-3"
                      onClick={() => handleNavigation("/subscription")}
                    >
                      {isPro ? (
                        <Crown className="h-5 w-5 text-amber-500" />
                      ) : (
                        <Sparkles className="h-5 w-5 text-primary" />
                      )}
                      <div className="flex flex-col items-start gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Subscription</span>
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-[10px] uppercase tracking-wider",
                              isPro 
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {tierName}
                          </Badge>
                        </div>
                        {!isPro && (
                          <span className="text-xs text-primary font-medium">
                            Upgrade to Pro →
                          </span>
                        )}
                      </div>
                    </Button>

                    <AccountSwitcher 
                      currentAccountType={accountType} 
                      onSwitch={() => setIsOpen(false)}
                    />

                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12 w-full"
                      onClick={() => handleNavigation("/settings")}
                    >
                      <Settings className="h-5 w-5" />
                      Settings
                    </Button>
                    
                    {/* Admin Section */}
                    {user?.id === 'ef429714-ea32-4f08-a4f9-ef0226f1804b' && (
                      <>
                        <Separator className="my-3" />
                        <p className="text-xs font-medium text-muted-foreground px-3 mb-2">Admin</p>
                        <Button 
                          variant="ghost" 
                          className="justify-start gap-3 h-12 w-full"
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
              <Link to="/post-opportunity" className="hidden sm:inline-flex">
                <Button variant="outline" size="sm" className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  Hire Talent
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button variant="gradient">Get Started</Button>
              </Link>
            </>
          ) : user && isLandingPage ? (
            <Link to="/circle">
              <Button variant="gradient">Start Matching</Button>
            </Link>
          ) : null}
        </div>
      </div>
      
    </nav>
  );
});

Navbar.displayName = "Navbar";

export default Navbar;
