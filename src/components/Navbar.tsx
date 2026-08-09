import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogOut, Menu, Settings, Users, User, Briefcase, MessageCircle, Shield, Crown, Sparkles,
  DollarSign, FolderKanban, LayoutDashboard, Radar, Search, BarChart3, ShoppingBag, Share2, Rocket, Wallet,
  MapPin, Trophy, CheckCircle, Target, Zap, Globe, Palette, MessageSquarePlus, CalendarDays, Home, UserPlus, UserCircle2, Building2, Inbox,
  Sun, LayoutGrid, Compass, BadgeCheck, BookOpen, Bell, Languages, Lock, Brain, HardDrive, LifeBuoy, Gift, Star, RefreshCw, Theater, Database, Heart, Video
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAutoHideNavbar } from "@/hooks/useAutoHideNavbar";
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
import { StorageMeter } from "@/components/storage/StorageMeter";
import { useCrewUnread } from "@/hooks/useCrewUnread";
import { MessagesDrawer } from "@/components/messages/MessagesDrawer";
import { SettingsDrawer } from "@/components/SettingsDrawer";

// useNavMode removed — single unified nav
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [guestMenuOpen, setGuestMenuOpen] = useState(false);
  const [accountType, setAccountType] = useState<"individual" | "company">("individual");
  const [isManagerMode, setIsManagerMode] = useState(false);
  const isLandingPage = location.pathname === "/" && !user;
  const isPro = subscriptionInfo.subscribed;
  const tierName = getTierDisplayName(subscriptionInfo.tier as any);
  const { unreadCount } = useNotifications();
  const inboxBadge = unreadCount > 0 ? (unreadCount > 99 ? "99+" : String(unreadCount)) : undefined;
  const { badge: crewBadge } = useCrewUnread();

  // Sticky, subtly auto-hiding TopNavbar: hides on scroll-down, reveals on
  // scroll-up, dims slightly when idle. Never hides while the pointer is over
  // it, keyboard focus is inside it, a drawer is open, at the top of the
  // page, or reduced-motion is on — useAutoHideNavbar already forces
  // visibility for the last four; pointer/focus are tracked locally here
  // since they're per-element.
  const { hiddenByScroll, idle, idleOpacity, forceVisible } = useAutoHideNavbar();
  const [navHovered, setNavHovered] = useState(false);
  const [navFocused, setNavFocused] = useState(false);
  const navKeepVisible = navHovered || navFocused || forceVisible || isOpen || guestMenuOpen || mobileSearchOpen;
  const navHidden = hiddenByScroll && !navKeepVisible;
  const navOpacity = !navKeepVisible && idle ? idleOpacity : 1;

  // UnifiedSearchDropdown's onSelect/onQuerySubmit fully replace its default
  // navigate() calls when provided, so hooking them to close the sheet would
  // break the actual navigation. Closing on route change instead covers
  // every way a search result can be opened (click, submit, "deep search").
  useEffect(() => {
    if (mobileSearchOpen) setMobileSearchOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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

  const isCompany = accountType === "company";

  // Kretopia 2.0 Daily Driver — desktop nav mirrors mobile bottom nav
  const desktopNavItems = isCompany
    ? [
        { path: "/desk", icon: LayoutDashboard, label: "Studios" },
        { path: "/opportunities", icon: Briefcase, label: "Gigs" },
        { path: "/talent-finder", icon: Search, label: "Talent" },
        { path: "/thrivepay", icon: Wallet, label: "Pay" },
      ]
    : [
        // Prioritized set — Today/Studio/Scout/Passport stay in the primary
        // row; Stages, Kreto (the dedicated page — the floating launcher
        // and ThriveBar already give one-tap chat access everywhere) and
        // Perks moved into the Menu's Explore section so nothing becomes
        // unreachable, just less crowded up top.
        { path: "/", icon: Sun, label: "Today" },
        { path: "/desk", icon: LayoutGrid, label: "Studio" },
        { path: "/scout", icon: Compass, label: "Scout" },
        { path: "/profile", icon: BadgeCheck, label: "Passport" },
      ];

  // search moved to Thrive bar — keep state stub removed

  // Guest navigation items
  const guestNavItems = [
    { path: "/credits", label: "Verified Credits" },
    { path: "/spotlight", label: "Spotlight" },
    { path: "/about", label: "About Us" },
  ];

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none",
        isLandingPage
          ? "dark-surface border-b border-white/10 bg-[#05070D] text-white"
          : "border-b border-border/60 glass-surface-elevated rounded-none border-x-0 border-t-0",
      )}
      style={{
        transform: navHidden ? "translateY(-100%)" : "translateY(0)",
        opacity: navOpacity,
        paddingTop: "env(safe-area-inset-top)",
      }}
      role="navigation"
      aria-label="Main navigation"
      onMouseEnter={() => setNavHovered(true)}
      onMouseLeave={() => setNavHovered(false)}
      onFocus={() => setNavFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setNavFocused(false);
      }}
    >
      <div className="container mx-auto flex items-center justify-between gap-1 px-2 sm:px-4 py-2.5">
        <div className="shrink-0">
          <BrandLogo size="md" showBeta linkToHome onDark={isLandingPage} />
        </div>

        {/* Global search — reachable from every route, not just Today.
            Fixed width so the results dropdown (absolutely positioned,
            already built into UnifiedSearchDropdown) never shifts layout. */}
        {!isLandingPage && (
          <div className="hidden lg:block w-40 xl:w-64 mx-3 shrink-0">
            <UnifiedSearchDropdown
              variant="navbar"
              placeholder="Search your name, stage name or creative work..."
            />
          </div>
        )}

        {/* ═══ GUEST INLINE NAV (desktop/tablet) ═══ */}
        {!user && (
          <div className="hidden md:flex items-center gap-1 mx-4">
            {guestNavItems.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  isLandingPage
                    ? "text-white/70 hover:text-white hover:bg-white/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                  location.pathname === path && (isLandingPage ? "text-white bg-white/10" : "text-foreground bg-accent/30"),
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Desktop Navigation - Mode Aware */}
        {user && !isLandingPage && (
          <div className="hidden lg:flex items-center gap-2 mx-6 pl-6 border-l border-border/50">

            {/* Mode toggle removed — single unified nav */}

            {desktopNavItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path ||
                (path === "/desk" && location.pathname.startsWith("/desk")) ||
                (path === "/messages" && (location.pathname.startsWith("/messages") || location.pathname.startsWith("/inbox"))) ||
                (path === "/circle" && location.pathname.startsWith("/circle") && !location.pathname.startsWith("/circles")) ||
                (path === "/scout" && (
                  location.pathname.startsWith("/scout") ||
                  location.pathname === "/opportunities" ||
                  location.pathname === "/opportunity-dashboard"
                )) ||
                (path === "/profile" && (
                  location.pathname.startsWith("/profile") ||
                  location.pathname.startsWith("/thrivepay") ||
                  location.pathname.startsWith("/accounting") ||
                  location.pathname.startsWith("/credits")
                ));
              return (
                <Link
                  key={path}
                  to={path}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={label}
                  className={cn(
                    "flex items-center gap-2 h-10 px-3.5 rounded-lg transition-smooth text-sm font-medium whitespace-nowrap border",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isActive
                      ? "text-foreground border-white/15 bg-white/[0.04]"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:border-white/10 hover:bg-white/[0.02]",
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-0.5 sm:gap-2 ml-auto shrink-0">
          {/* Top nav: Logo · · · ✉ 🔔 ☰ */}
          {!isLandingPage && (
            <Sheet open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10 lg:hidden" aria-label="Search">
                  <Search className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="w-full">
                <SheetHeader>
                  <SheetTitle>Search</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <UnifiedSearchDropdown
                    variant="hero"
                    placeholder="Search your name, stage name or creative work..."
                    autoFocus
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}
          {!isLandingPage && user && <MessagesDrawer />}

          {!isLandingPage && user && <NotificationCenter />}
          {!isLandingPage && user && <SettingsDrawer />}
          {!user && !isLandingPage && <ThemeToggle />}
          
          {user && !isLandingPage ? (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu" className="h-8 w-8 sm:h-10 sm:w-10">
                  <Menu className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:w-[400px] bg-[hsl(var(--k-midnight))] text-white border-l border-white/10">
                <SheetHeader className="pr-8 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF2CA7]">Kretopia</p>
                  <SheetTitle className="font-serif text-2xl font-normal text-white">Menu</SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-1 mt-6 overflow-y-auto max-h-[calc(100vh-8rem)]">

                  {isCompany ? (
                    /* ====== COMPANY MENU (unchanged) ====== */
                    <>
                      <MenuButton icon={Inbox} label="Inbox" onClick={() => handleNavigation("/inbox")} path="/inbox" badge={inboxBadge} />
                      <Separator className="my-3" />
                      <MenuButton icon={User} label="Company Page" onClick={() => handleNavigation(`/profile/${user?.id}`)} path={`/profile/${user?.id}`} />
                      <MenuButton icon={Search} label="Find Talent" onClick={() => handleNavigation("/talent-finder")} path="/talent-finder" />
                      {/* Events hidden from nav — /meetup route alive, event Studios cover the workflow. */}
                      {isManagerMode && (
                        <MenuButton icon={Users} label="Talent Manager" onClick={() => handleNavigation("/talent-manager")} path="/talent-manager" />
                      )}
                      <Separator className="my-3" />
                      <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
                      <Button variant="ghost" className="justify-start gap-3 h-auto w-full py-3" onClick={() => handleNavigation("/subscription")}>
                        {isPro ? <Crown className="h-5 w-5 text-accent" /> : <Sparkles className="h-5 w-5 text-primary" />}
                        <div className="flex flex-col items-start gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Subscription</span>
                            <Badge variant="secondary" className={cn("text-[10px] uppercase tracking-wider", isPro ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>{tierName}</Badge>
                          </div>
                          {!isPro && <span className="text-xs text-primary font-medium">Upgrade →</span>}
                        </div>
                      </Button>
                      <AccountSwitcher currentAccountType={accountType} onSwitch={() => setIsOpen(false)} onManagerModeChange={(enabled) => setIsManagerMode(enabled)} />
                      <MenuButton icon={Settings} label="Settings" onClick={() => handleNavigation("/settings")} />
                    </>
                  ) : (
                    /* ====== DAILY DRIVER MENU — System + Account only ====== */
                    <>
                      {/* ACCOUNT */}
                      <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
                      <Button variant="ghost" className="justify-start gap-3 h-auto w-full py-3" onClick={() => handleNavigation("/subscription")}>
                        {isPro ? <Crown className="h-5 w-5 text-accent" /> : <Sparkles className="h-5 w-5 text-primary" />}
                        <div className="flex flex-col items-start gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Subscription</span>
                            <Badge variant="secondary" className={cn("text-[10px] uppercase tracking-wider", isPro ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>{tierName}</Badge>
                          </div>
                          {!isPro && <span className="text-xs text-primary font-medium">Upgrade →</span>}
                        </div>
                      </Button>
                      
                      <div className="px-1 py-1">
                        <StorageMeter variant="compact" />
                      </div>
                      <AccountSwitcher currentAccountType={accountType} onSwitch={() => setIsOpen(false)} onManagerModeChange={(enabled) => setIsManagerMode(enabled)} />

                      <Separator className="my-3" />

                      {/* WORKSPACE — daily shortcuts only. Today/Desk live in bottom nav; Pay in Passport. */}
                      <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Workspace</p>
                      <MenuButton icon={DollarSign} label="KrePay" onClick={() => handleNavigation("/thrivepay")} path="/thrivepay" />
                      <MenuButton icon={Building2} label="Clients" onClick={() => handleNavigation("/clients")} path="/clients" />
                      {/* Crews hidden from UI — data preserved, deep links still work via /crews. Group chat lives in Messages. */}
                      {isManagerMode && (
                        <MenuButton icon={Users} label="Manager Mode" onClick={() => handleNavigation("/talent-manager")} path="/talent-manager" />
                      )}


                      <Separator className="my-3" />

                      {/* PILLARS — live surfaces not in bottom nav */}
                      <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Explore</p>
                      <MenuButton icon={Theater} label="Stages" onClick={() => handleNavigation("/circle")} path="/circle" />
                      <MenuButton icon={Sparkles} label="Kreto" onClick={() => handleNavigation("/kreto")} path="/kreto" />
                     <MenuButton icon={Heart} label="Match" onClick={() => handleNavigation("/match")} path="/match" />
                      <MenuButton icon={Search} label="Search" onClick={() => handleNavigation("/search")} path="/search" />
                      <MenuButton icon={Users} label="Kretopia" onClick={() => handleNavigation("/thrivein")} path="/thrivein" />
                      <MenuButton icon={Gift} label="Perks" onClick={() => handleNavigation("/perks")} path="/perks" />
                      <MenuButton icon={CalendarDays} label="Events" onClick={() => handleNavigation("/meetup")} path="/meetup" />
                      <MenuButton icon={Theater} label="Sound Stages" onClick={() => handleNavigation("/soundstages")} path="/soundstages" />
                      <MenuButton icon={Video} label="Recordings" onClick={() => handleNavigation("/recordings")} path="/recordings" />

                      <Separator className="my-3" />

                      {/* MORE — keep lean. Spotlight/Brand Vault/Referrals reachable by direct URL. */}
                      <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">More</p>
                      <MenuButton icon={Database} label="Verified Credits" onClick={() => handleNavigation("/credits")} path="/credits" />
                      <MenuButton icon={Crown} label="Founding Circle" onClick={() => handleNavigation("/founding-member")} path="/founding-member" />
                      <MenuButton icon={UserPlus} label="Creative Circle" onClick={() => handleNavigation("/creative-circle")} path="/creative-circle" />


                      <Separator className="my-3" />

                      {/* SETTINGS */}
                      <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Settings</p>
                      <MenuButton icon={Settings} label="Settings" onClick={() => handleNavigation("/settings")} />
                      <MenuButton icon={Bell} label="Notifications" onClick={() => handleNavigation("/settings?tab=notifications")} />
                      <MenuButton icon={Brain} label="Memory & Agent" onClick={() => handleNavigation("/settings?tab=agent")} />
                      <MenuButton icon={Languages} label="Language" onClick={() => handleNavigation("/settings?tab=language")} />
                      <MenuButton icon={Lock} label="Privacy" onClick={() => handleNavigation("/settings?tab=privacy")} />
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm flex items-center gap-3"><Palette className="h-5 w-5" /> Appearance</span>
                        <ThemeToggle />
                      </div>

                      <Separator className="my-3" />

                      {/* SUPPORT */}
                      <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Support</p>
                      <MenuButton icon={MessageSquarePlus} label="Feedback" onClick={() => {
                        setIsOpen(false);
                        sessionStorage.removeItem("feedback-dismissed");
                        window.dispatchEvent(new CustomEvent("open-feedback"));
                      }} />
                      <MenuButton icon={LifeBuoy} label="Help Centre" onClick={() => handleNavigation("/help")} />
                      <MenuButton icon={Globe} label="About" onClick={() => handleNavigation("/about")} />

                      {/* ADMIN */}
                      {user?.id === 'ef429714-ea32-4f08-a4f9-ef0226f1804b' && (
                        <>
                          <Separator className="my-3" />
                          <MenuButton icon={Shield} label="Admin Panel" onClick={() => handleNavigation("/admin")} />
                        </>
                      )}
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
                  <Button variant="ghost" size="icon" aria-label="Open menu" className="h-9 w-9 md:hidden">
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
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-2",
                    isLandingPage && "border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Briefcase className="h-4 w-4" />
                  Hire Talent
                </Button>
              </Link>
              <Link to="/auth">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-xs sm:text-sm px-2 sm:px-4",
                    isLandingPage && "text-white hover:bg-white/10 hover:text-white",
                  )}
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="gradient" size="sm" className="text-xs sm:text-sm px-2.5 sm:px-4">Get Started</Button>
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
});

/* Reusable menu button */
function MenuButton({ icon: Icon, label, onClick, badge, path }: { icon: any; label: string; onClick: () => void; badge?: string; path?: string }) {
  const location = useLocation();
  const isActive = !!path && (
    path === location.pathname ||
    (path !== "/" && location.pathname.startsWith(path + "/"))
  );
  return (
    <Button
      variant="ghost"
      className={cn(
        "justify-start gap-3 h-12 w-full",
        isActive && "bg-energy/10 text-energy hover:bg-energy/15"
      )}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
    >
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
