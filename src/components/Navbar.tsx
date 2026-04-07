import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogOut, Menu, Settings, Users, User, Briefcase, MessageCircle, Shield, Crown, Sparkles,
  DollarSign, FolderKanban, Search, BarChart3, ShoppingBag, Share2,
  MessageSquareMore, MapPin, Trophy, CheckCircle, Target, Zap, Globe, Palette, MessageSquarePlus, CalendarDays, Home
} from "lucide-react";
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
  const isLandingPage = location.pathname === "/";
  const isPro = subscriptionInfo.subscribed;
  const tierName = getTierDisplayName(subscriptionInfo.tier as any);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("account_type, is_manager_mode")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.account_type) setAccountType(data.account_type);
        if (data?.is_manager_mode) setIsManagerMode(true);
      });
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

  // Desktop nav items per mode
  const desktopNavItems = mode === "create"
    ? [
        { path: "/", icon: Home, label: "Home" },
        { path: "/scene", icon: Zap, label: "Scene" },
        { path: "/circle", icon: Sparkles, label: "Match" },
        { path: "/opportunities", icon: Briefcase, label: "Gigs" },
      ]
    : [
        { path: "/desk", icon: FolderKanban, label: "Desk" },
        { path: "/opportunities", icon: Briefcase, label: "Gigs" },
        { path: "/thrivepay", icon: DollarSign, label: "ThrivePay" },
        { path: "/profile", icon: User, label: "Profile" },
      ];

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setSearchOpen(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 glass-strong" role="navigation" aria-label="Main navigation">
      <div className="container mx-auto flex items-center justify-between px-3 sm:px-4 py-2.5">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="ThriveIN Home">
          <img src={thriveinIcon} alt="ThriveIN Icon" className="h-9 w-9 sm:h-10 sm:w-10 object-contain" />
          <span className="text-lg sm:text-xl font-bold tracking-tight gradient-text hidden sm:inline">thriveIN</span>
          <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] uppercase tracking-widest font-semibold hidden sm:inline-flex">BETA</Badge>
        </Link>

        {/* ═══ PERSISTENT SEARCH BAR ═══ */}
        {user && !isLandingPage && (
          <form onSubmit={handleSearchSubmit} className="hidden sm:flex flex-1 max-w-sm mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search creators, credits, gigs..."
                className="w-full h-9 rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-card transition-all placeholder:text-muted-foreground/50"
              />
            </div>
          </form>
        )}

        {/* Desktop Navigation - Mode Aware */}
        {user && !isLandingPage && (
          <div className="hidden lg:flex items-center gap-1">
            {/* Mode toggle pill */}
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

        <div className="flex items-center gap-1.5 sm:gap-3">
          {user && !isLandingPage && (
            <div className="flex items-center gap-0.5">
              {/* Mobile search toggle */}
              <Button variant="ghost" size="icon" className="h-9 w-9 sm:hidden" onClick={() => setSearchOpen(!searchOpen)} aria-label="Search">
                <Search className="h-5 w-5" />
              </Button>
              <Link to="/messages" aria-label="Messages">
                <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </Link>
              <NotificationCenter />
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
                    {/* Mode toggle in hamburger too */}
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
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-1 mt-6 overflow-y-auto max-h-[calc(100vh-8rem)]">

                  {mode === "create" ? (
                    /* ====== EXPLORE MODE MENU ====== */
                    <>
                      <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">You</p>
                      <MenuButton icon={User} label="My Profile" onClick={() => handleNavigation(`/profile/${user?.id}`)} />

                      <Separator className="my-3" />

                      <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">Discover</p>
                      <MenuButton icon={Globe} label="ThriveCredits" onClick={() => handleNavigation("/credits")} />
                      <MenuButton icon={MapPin} label="Nearby" onClick={() => handleNavigation("/nearby")} />
                      <MenuButton icon={CalendarDays} label="Events" onClick={() => handleNavigation("/events")} />
                    </>
                  ) : (
                    /* ====== WORK MODE MENU ====== */
                    <>
                      <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">You</p>
                      <MenuButton icon={User} label="My Profile" onClick={() => handleNavigation(`/profile/${user?.id}`)} />

                      <Separator className="my-3" />

                      <p className="text-xs font-medium text-muted-foreground px-3 mb-2 uppercase tracking-wider">Manage</p>
                      <MenuButton icon={Briefcase} label="Manage Gigs" onClick={() => handleNavigation("/manage-opportunities")} />
                      {isManagerMode && (
                        <MenuButton icon={Users} label="Talent Manager" onClick={() => handleNavigation("/talent-manager")} />
                      )}
                    </>
                  )}

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
                            isPro ? "bg-accent/10 text-accent-foreground" : "bg-muted text-muted-foreground"
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
      
      {/* Mobile search bar — slides open */}
      {searchOpen && user && !isLandingPage && (
        <div className="sm:hidden border-t border-border/50 px-3 py-2 bg-background">
          <form onSubmit={(e) => { handleSearchSubmit(e); setSearchOpen(false); }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search creators, credits, gigs..."
                autoFocus
                className="w-full h-10 rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
              />
            </div>
          </form>
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
