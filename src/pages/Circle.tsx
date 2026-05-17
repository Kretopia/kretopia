import { useState, useEffect, useCallback } from "react";
import { MatchCelebrationDialog } from "@/components/discover/MatchCelebrationDialog";
import { PageTip } from "@/components/PageTip";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConnectionList } from "@/components/circle/ConnectionList";
import { SwipeFeature } from "@/components/swipe";
import { GuestSwipePreview } from "@/components/swipe/GuestSwipePreview";
import { NetworkVisualization } from "@/components/circle/NetworkVisualization";
import { LiveCallsPanel } from "@/components/circle/LiveCallsPanel";
import { SEO } from "@/components/SEO";
import { ProfileActivationGate } from "@/components/ProfileActivationGate";
import { InviteDialog } from "@/components/InviteDialog";
import { InviteCircleCard } from "@/components/InviteCircleCard";
import { SwipeFilters, SwipeFiltersState, DEFAULT_SWIPE_FILTERS } from "@/components/circle/SwipeFilters";
import { Sparkles, Users, Radio, LayoutGrid, UserPlus } from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { getDiscoveryMissingFields } from "@/lib/profileCompletion";
import { hasProAccess } from "@/lib/subscriptionConfig";
import { PageTransition } from "@/components/PageTransition";

type BrowseProfile = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  location: string | null;
};

export default function Circle() {
  const { user, subscriptionInfo } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "live" ? "live" : "match";
  const [activeTab, setActiveTab] = useState<"match" | "live">(initialTab);
  const [profileVisibility, setProfileVisibility] = useState<{ isVisible: boolean; missingFields: string[] }>({ isVisible: true, missingFields: [] });
  const [connections, setConnections] = useState<any[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [filters, setFilters] = useState<SwipeFiltersState>(DEFAULT_SWIPE_FILTERS);
  const [profilesCount, setProfilesCount] = useState(0);
  const [browseProfiles, setBrowseProfiles] = useState<BrowseProfile[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [matchedUser, setMatchedUser] = useState<{ name: string; avatar: string; role: string; userId: string } | null>(null);
  const [showMatchDialog, setShowMatchDialog] = useState(false);

  const isPro = hasProAccess(subscriptionInfo.tier as any);

  useEffect(() => {
    if (tabParam === "live" || tabParam === "match") setActiveTab(tabParam);
  }, [tabParam]);

  // Welcome handoff
  useEffect(() => {
    if (searchParams.get("welcome") === "match") {
      setActiveTab("match");
      import("sonner").then(({ toast }) => {
        toast.success("We found you a match!", {
          description: "Tap the first card to say hi.",
          duration: 5000,
        });
      }).catch(() => {});
      const next = new URLSearchParams(searchParams);
      next.delete("welcome");
      navigate(`/circle?${next.toString()}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("avatar_url, bio")
      .eq("user_id", user.id)
      .single()
      .then(async ({ data: profile }) => {
        if (!profile) return;
        const { count } = await supabase
          .from("credits")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        const missingFields = getDiscoveryMissingFields(profile as any, count || 0);
        setProfileVisibility({ isVisible: missingFields.length === 0, missingFields });
      }, () => {});
  }, [user?.id]);

  const fetchConnections = useCallback(async () => {
    if (!user?.id) return;
    setConnectionsLoading(true);
    try {
      const [outgoing, incoming] = await Promise.all([
        supabase.from("connections").select("connected_user_id, status").eq("user_id", user.id),
        supabase.from("connections").select("user_id, status").eq("connected_user_id", user.id),
      ]);
      const ids = new Set<string>();
      outgoing.data?.forEach(c => { if (c.status === "accepted") ids.add(c.connected_user_id); });
      incoming.data?.forEach(c => { if (c.status === "accepted") ids.add(c.user_id); });
      if (ids.size === 0) { setConnections([]); return; }
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, role, location, level, xp, bio, badge")
        .in("user_id", Array.from(ids));
      setConnections(data || []);
    } catch (e) {
      console.error("[Circle] connections", e);
    } finally {
      setConnectionsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (showNetwork) fetchConnections();
  }, [showNetwork, fetchConnections]);

  const fetchBrowse = useCallback(async () => {
    if (!user?.id) return;
    setBrowseLoading(true);
    try {
      let q = supabase
        .from("public_profiles_safe")
        .select("user_id, full_name, avatar_url, role, location")
        .neq("user_id", user.id)
        .not("avatar_url", "is", null)
        .not("full_name", "is", null)
        .limit(60);
      if (filters.roles?.length) q = q.in("role", filters.roles);
      if (filters.locationCountry) q = q.ilike("location", `%${filters.locationCountry}%`);
      const { data } = await q;
      setBrowseProfiles((data || []) as BrowseProfile[]);
    } finally {
      setBrowseLoading(false);
    }
  }, [user?.id, filters.roles, filters.locationCountry]);

  useEffect(() => {
    if (showBrowse) fetchBrowse();
  }, [showBrowse, fetchBrowse]);

  const handleMatch = async (m: { name: string; avatar: string; role: string; userId: string }) => {
    const { analytics } = await import("@/lib/analytics");
    analytics.match(m.userId);
    setMatchedUser(m);
    setShowMatchDialog(true);
  };

  const handleMessage = (userId: string) => navigate(`/messages?user=${userId}`);

  const handleFiltersChange = (next: SwipeFiltersState) => {
    if (!isPro) {
      next.verifiedOnly = false;
      next.minFollowers = "all";
      next.experienceLevel = "all";
      next.aiMatchOnly = false;
    }
    setFilters(next);
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-28 sm:pb-24 md:pb-8 bg-background">
        <SEO
          title="Circle — Match, Live & Network"
          description="Find collaborators, jump into live sessions, and grow your creative circle."
        />

        {/* Sticky header */}
        <div className="sticky top-0 z-10 border-b border-border/60 bg-background">
          <div className="container mx-auto px-3 sm:px-4 pt-3 pb-2">
            {/* Title row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-5 w-5 text-energy shrink-0" />
                <h1 className="text-2xl font-black tracking-[-0.03em] truncate">Circle</h1>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setShowInvite(true)}
                aria-label="Invite creators"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>

            {/* Action row: Network · Browse · Filter (always visible) */}
            <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-full shrink-0"
                onClick={() => setShowNetwork(true)}
              >
                <Users className="h-4 w-4" />
                Network
                {connections.length > 0 && (
                  <span className="ml-0.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                    {connections.length}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-full shrink-0"
                onClick={() => setShowBrowse(true)}
              >
                <LayoutGrid className="h-4 w-4" />
                Browse
              </Button>
              <div className="shrink-0">
                <SwipeFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  isPro={isPro}
                  profilesCount={profilesCount}
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "match" | "live")} className="w-full mt-2">
              <TabsList className="grid w-full grid-cols-2 h-10 bg-muted/60">
                <TabsTrigger value="match" className="gap-1.5 text-sm data-[state=active]:bg-background">
                  <Sparkles className="h-4 w-4" />
                  Match
                </TabsTrigger>
                <TabsTrigger value="live" className="gap-1.5 text-sm data-[state=active]:bg-background">
                  <Radio className="h-4 w-4" />
                  Live
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-3 sm:px-4 py-3">
          <ProfileActivationGate
            isVisible={profileVisibility.isVisible}
            missingFields={profileVisibility.missingFields}
            surfaceLabel="Circle"
          >
            {activeTab === "match" ? (
              <div className="space-y-3">
                {user ? (
                  <>
                    <SwipeFeature
                      onMatch={handleMatch}
                      filters={filters}
                      onProfilesCountChange={setProfilesCount}
                    />
                    {profilesCount > 0 && (
                      <PageTip
                        id="circle-match"
                        title="Welcome to Circle"
                        message="Swipe through creators. Tap a card for their profile, then send a connect. Use Network and Browse above to explore."
                      />
                    )}
                  </>
                ) : (
                  <GuestSwipePreview />
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {user ? (
                  <LiveCallsPanel />
                ) : (
                  <AuthGate>
                    <div className="h-[40vh] bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl" />
                  </AuthGate>
                )}
              </div>
            )}
          </ProfileActivationGate>
        </div>

        {/* Network sheet */}
        <Sheet open={showNetwork} onOpenChange={setShowNetwork}>
          <SheetContent side="right" className="w-[92vw] sm:w-[480px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Your Network
                {connections.length > 0 && (
                  <span className="text-sm text-muted-foreground font-normal">· {connections.length}</span>
                )}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              {connections.length === 0 && <InviteCircleCard variant="match" />}
              <NetworkVisualization onInvite={() => { setShowNetwork(false); setShowInvite(true); }} />
              {connections.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 text-sm">Your collaborators</h3>
                  <ConnectionList connections={connections} loading={connectionsLoading} onMessage={handleMessage} />
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Browse sheet */}
        <Sheet open={showBrowse} onOpenChange={setShowBrowse}>
          <SheetContent side="right" className="w-[92vw] sm:w-[520px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                Browse creators
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <div className="mb-3">
                <SwipeFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  isPro={isPro}
                  profilesCount={browseProfiles.length}
                />
              </div>
              {browseLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : browseProfiles.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No creators match your filters yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {browseProfiles.map((p) => (
                    <Link
                      key={p.user_id}
                      to={`/profile/${p.user_id}`}
                      onClick={() => setShowBrowse(false)}
                      className="group rounded-xl border border-border/60 bg-card overflow-hidden hover:border-primary/40 transition-colors"
                    >
                      <div className="aspect-square bg-muted overflow-hidden">
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt={p.full_name ?? "Creator"}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                          />
                        ) : (
                          <Avatar className="w-full h-full rounded-none">
                            <AvatarFallback>{(p.full_name ?? "?").slice(0, 1)}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-sm font-semibold truncate">{p.full_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {p.role ?? "Creator"}
                          {p.location ? ` · ${p.location}` : ""}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <InviteDialog open={showInvite} onOpenChange={setShowInvite} />
        {matchedUser && (
          <MatchCelebrationDialog
            open={showMatchDialog}
            onOpenChange={setShowMatchDialog}
            matchedUser={matchedUser}
            onSendMessage={() => navigate(`/messages?user=${matchedUser.userId}`)}
          />
        )}
      </div>
    </PageTransition>
  );
}
