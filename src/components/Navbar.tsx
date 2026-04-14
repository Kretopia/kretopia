import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogOut, Menu, Settings, Users, User, Briefcase, MessageCircle, Shield, Crown, Sparkles,
  DollarSign, FolderKanban, Search, BarChart3, ShoppingBag, Share2,
  MessageSquareMore, MapPin, Trophy, CheckCircle, Target, Zap, Globe, Palette, MessageSquarePlus, CalendarDays, Home, UserPlus
} from "lucide-react";
import { UnifiedSearchDropdown } from "@/components/search/UnifiedSearchDropdown";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getTierDisplayName } from "@/lib/subscriptionConfig";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { useNavMode } from "@/hooks/useNavMode";
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
  const { mode, setMode } = useNavMode();
  const [isOpen, setIsOpen] = useState(false);
  const [accountType, setAccountType] = useState<"individual" | "company">("individual");
  const [isManagerMode, setIsManagerMode] = useState(false);
  const isLandingPage = location.pathname === "/" && !user;
  const isPro = subscriptionInfo.subscribed;
  const tierName = getTierDisplayName(subscriptionInfo.tier as any);

  useEffect(() => {
    if (!user) return;
    Promise.resolve(
      supabase
        .from("profiles")
        .select("account_type, is_manager_mode")
        .eq("user_id", user.id)
        .maybeSingle()
    ).then(({ data }) => {
      if (data?.account_type) setAccountType(data.account_type);
      if (data?.is_manager_mode) setIsManagerMode(true);
    }).catch(err => console.warn('[Navbar] Error loading profile:', err));
  }, [user?.id]);

  const handleSignOut = async () => {
    try {
      setIsOpen(false);
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error('[Navbar] Sign out error:', error);
        localStorage.removeItem('sb-kwmcocsitwssrtzkdojh-auth-token');
        sessionStorage.clear();
      }
      import("@/lib/analytics")
        .then(({ analytics }) => analytics.signOut())
        .catch(() => {});
      toast({ title: "Signed out", description: "You've been successfully signed out" });
      navigate("/", { replace: true });
    } catch (error) {
      console.error('[Navbar] Sign out exception:', error);
      try {
        localStorage.removeItem('sb-kwmcocsitwssrtzkdojh-auth-token');
        sessionStorage.clear();
      } catch (e) {
        console.error('[Navbar] Error clearing storage:', e);
      }
      toast({ title: "Signed out", description: "You've been signed out locally" });
      navigate("/", { replace: true });
    }
  };

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  // Force work mode for company accounts
  useEffect(() => {
    if (accountType === "company" && mode === "create") {
      setMode("work");
    }
  }, [accountType, mode]);

  const isCompany = accountType === "company";

  // Desktop nav items per mode
  const desktopNavItems = isCompany
    ? [
        { path: "/desk", icon: FolderKanban, label: "Desk" },
        { path: "/opportunities", icon: Briefcase, label: "Gigs" },
        { path: "/talent-finder", icon: Search, label: "Talent" },
        { path: "/thrivepay", icon: DollarSign, label: "ThrivePay" },
      ]
    : mode === "create"
    ? [
        { path: "/", icon: Home, label: "Home" },
        { path: "/nearby", icon: CalendarDays, label: "Discover" },
        { path: "/circle", icon: Sparkles, label: "Match" },
        { path: "/opportunities", icon: Briefcase, label: "Gigs" },
      ]
    : [
        { path: "/desk", icon: FolderKanban, label: "Desk" },
        { path: "/opportunities", icon: Briefcase, label: "Gigs" },
        { path: "/thrivepay", icon: DollarSign, label: "ThrivePay" },
        { path: "/profile", icon: User, label: "Profile" },
      ];

  const [searchOpen, setSearchOpen] = useState(false);

  // Guest navigation items
  const guestNavItems = [
    { path: "/about", label: "About Us" },
    { path: "/magazine", label: "Magazine" },
    { path: "/podcast", label: "Discover a Thriver" },
    { path: "/explore", label: "Explore" },
  ];

  const [guestMenuOpen, setGuestMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 glass-strong" role="navigation" aria-label="Main navigation">
      <div className="container mx-auto flex items-center justify-between px-3 sm:px-4 py-2.5">
        <BrandLogo size="md" showBeta linkToHome />

        {/* ═══ PERSISTENT SEARCH BAR ═══ */}
        {!isLandingPage && (
          <UnifiedSearchDropdown
            variant="navbar"
            className="hidden sm:block flex-1 max-w-sm mx-4"
          />
        )}

        {/* ═══ GUEST INLINE NAV (desktop/tablet) ═══ */}
        {!user && (
          <div className="hidden md:flex items-center gap-1 mx-4">
            {guestNavItems.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium hover:text-foreground hover:bg-accent/50 transition-all whitespace-nowrap",
                  location.pathname === path ? "text-foreground bg-accent/30" : "text-muted-foreground"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Desktop Navigation - Mode Aware */}
        {user && !isLandingPage && (
          <div className="hidden lg:flex items-center gap-1">
            {/* Mode toggle pill */}
            {!isCompany && (
              <div className="flex items-center bg-muted/60 rounded-full p-0.5 mr-2">
                <button
                  onClick={() => setMode("create")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold transition-all",
                    mode === "create" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Explore
                </button>
                <button
                  onClick={() => setMode("work")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold transition-all",
                    mode === "work" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Work
                </button>
              </div>
            )}

            {desktopNavItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path || 
                (path === "/desk" && location.pathname.startsWith("/desk")) ||
                (path === "/circle" && location.pathname.startsWith("/circle") && !location.pathname.startsWith("/circles"));
              return (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-smooth text-sm font-medium",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-3 ml-auto">
          {!isLandingPage && (
            <div className="flex items-center gap-0.5">
              {/* Mobile search toggle - only show for signed-in users */}
              {user && (
                <Button variant="ghost" size="icon" className="h-9 w-9 sm:hidden shrink-0" onClick={() => setSearchOpen(!searchOpen)} aria-label="Search">
                  <Search className="h-5 w-5" />
                </Button>
              )}
              {user && (
                <>
                  <Link to="/messages" aria-label="Messages">
                    <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                  </Link>
                  <NotificationCenter />
                </>
              )}
            </div>
          )}
          
           <ThemeToggle />
          
          {user && !isLandingPage ? (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:w-[400px]">
                <SheetHeader>
                   <SheetTitle className="flex items-center gap-3">
                    Menu
                    {/* Mode toggle in hamburger — hidden for company accounts */}
                    {!isCompany && (
                      <div className="flex items-center bg-muted/60 rounded-full p-0.5 ml-auto">
                        <button
                          onClick={() => setMode("create")}
                          className={cn(
                            "px-3 py-1 rounded-full text-[11px] font-semibold transition-all",
                            mode === "create" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                          )}
                        >
                          Explore
                        </button>
                        <button
                          onClick={() => setMode("work")}
                          className={cn(
                            "px-3 py-1 rounded-full text-[11px] font-semibold transition-all",
                            mode === "work" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                          )}
                        >
                          Work
                        </button>
                      </div>
                    )}
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-1 mt-6 overflow-y-auto max-h-[calc(100vh-8rem)]">

                  {isCompany ? (
                    /* ====== COMPANY MENU ====== */
                    <>
                      <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">Company</p>
                      <MenuButton icon={User} label="Company Page" onClick={() => handleNavigation(`/profile/${user?.id}`)} />

                      <Separator className="my-3" />

                      <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">Hiring</p>
                      <MenuButton icon={Search} label="Find Talent" onClick={() => handleNavigation("/talent-finder")} />
                      {isManagerMode && (
                        <MenuButton icon={Users} label="Talent Manager" onClick={() => handleNavigation("/talent-manager")} />
                      )}
                    </>
                  ) : mode === "create" ? (
                    /* ====== EXPLORE MODE MENU ====== */
                    <>
                      <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">You</p>
                      <MenuButton icon={User} label="My Profile" onClick={() => handleNavigation(`/profile/${user?.id}`)} />

                      <Separator className="my-3" />

                      <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">Discover</p>
                      <MenuButton icon={Globe} label="ThriveCredits" onClick={() => handleNavigation("/credits")} />
                      <MenuButton icon={MapPin} label="Nearby" onClick={() => handleNavigation("/nearby")} />
                    </>
                  ) : (
                    /* ====== WORK MODE MENU ====== */
                    <>
                      <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">You</p>
                      <MenuButton icon={User} label="My Profile" onClick={() => handleNavigation(`/profile/${user?.id}`)} />

                      <Separator className="my-3" />

                      <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">Manage</p>
                      {isManagerMode && (
                        <MenuButton icon={Users} label="Talent Manager" onClick={() => handleNavigation("/talent-manager")} />
                      )}
                    </>
                  )}

                  <Separator className="my-3" />

                  {/* Creative Circle CTA */}
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-12 w-full bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 border border-primary/10"
                    onClick={() => handleNavigation("/creative-circle")}
                  >
                    <UserPlus className="h-5 w-5 text-primary" />
                    <div className="flex flex-col items-start">
                      <span className="font-semibold text-sm">Creative Circle</span>
                      <span className="text-[10px] text-muted-foreground">Invite creatives, earn rewards</span>
                    </div>
                  </Button>

                  <Separator className="my-3" />

                  {/* Always visible — Account section */}
                  <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">Account</p>
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-auto w-full py-3"
                    onClick={() => handleNavigation("/subscription")}
                  >
                    {isPro ? <Crown className="h-5 w-5 text-accent" /> : <Sparkles className="h-5 w-5 text-primary" />}
                    <div className="flex flex-col items-start gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Subscription</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] uppercase tracking-wider",
                            isPro ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {tierName}
                        </Badge>
                      </div>
                      {!isPro && <span className="text-xs text-primary font-medium">Upgrade to Pro →</span>}
                    </div>
                  </Button>

                  <AccountSwitcher
                    currentAccountType={accountType}
                    onSwitch={() => setIsOpen(false)}
                    onManagerModeChange={(enabled) => setIsManagerMode(enabled)}
                  />

                  <MenuButton icon={Settings} label="Settings" onClick={() => handleNavigation("/settings")} />
                  <MenuButton icon={MessageSquarePlus} label="Send Feedback" onClick={() => {
                    setIsOpen(false);
                    // Re-enable feedback widget if dismissed
                    sessionStorage.removeItem("feedback-dismissed");
                    // Trigger feedback widget open
                    window.dispatchEvent(new CustomEvent("open-feedback"));
                  }} />

                  {/* Admin Section */}
                  {user?.id === 'ef429714-ea32-4f08-a4f9-ef0226f1804b' && (
                    <>
                      <Separator className="my-3" />
                      <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">Admin</p>
                      <MenuButton icon={Shield} label="Admin Panel" onClick={() => handleNavigation("/admin")} />
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
          ) : !user ? (
            <>
              {/* Mobile hamburger for guests — all pages */}
              <Sheet open={guestMenuOpen} onOpenChange={setGuestMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[80vw] sm:w-[320px]">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-1 mt-6">
                    <Button
                      variant="ghost"
                      className={cn("justify-start h-12 text-sm font-medium", location.pathname === "/" && "bg-accent/30")}
                      onClick={() => { setGuestMenuOpen(false); navigate("/"); }}
                    >
                      Home
                    </Button>
                    {guestNavItems.map(({ path, label }) => (
                      <Button
                        key={path}
                        variant="ghost"
                        className={cn("justify-start h-12 text-sm font-medium", location.pathname === path && "bg-accent/30")}
                        onClick={() => { setGuestMenuOpen(false); navigate(path); }}
                      >
                        {label}
                      </Button>
                    ))}
                    <Separator className="my-3" />
                    <Button
                      variant="ghost"
                      className="justify-start h-12 text-sm font-medium"
                      onClick={() => { setGuestMenuOpen(false); navigate("/post-opportunity"); }}
                    >
                      <Briefcase className="h-4 w-4 mr-2" />
                      Hire Talent
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <Link to="/post-opportunity" className="hidden sm:inline-flex">
                <Button variant="outline" size="sm" className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  Hire Talent
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-4">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button variant="gradient" size="sm" className="text-xs sm:text-sm px-2.5 sm:px-4">Get Started</Button>
              </Link>
            </>
          ) : null}
        </div>
      </div>
      
      {/* Mobile search bar — slides open */}
      {searchOpen && !isLandingPage && (
        <div className="sm:hidden border-t border-border/50 px-3 py-2 bg-background">
          <UnifiedSearchDropdown
            variant="inline"
            autoFocus
            onQuerySubmit={(q) => {
              setSearchOpen(false);
              navigate(`/search?q=${encodeURIComponent(q)}`);
            }}
          />
        </div>
      )}
    </nav>
  );
});

/* Reusable menu button */
function MenuButton({ icon: Icon, label, onClick, badge }: { icon: any; label: string; onClick: () => void; badge?: string }) {
  return (
    <Button variant="ghost" className="justify-start gap-3 h-12 w-full" onClick={onClick}>
      <Icon className="h-5 w-5" />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <Badge className="bg-primary/10 text-primary text-[10px] px-1.5">{badge}</Badge>
      )}
    </Button>
  );
}

Navbar.displayName = "Navbar";

export default Navbar;
