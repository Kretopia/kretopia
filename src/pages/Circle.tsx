import { useState, useEffect, useCallback } from "react";
import { MatchCelebrationDialog } from "@/components/discover/MatchCelebrationDialog";
import { PageTip } from "@/components/PageTip";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ConnectionList } from "@/components/circle/ConnectionList";
import { SwipeFeature } from "@/components/swipe";
import { GuestSwipePreview } from "@/components/swipe/GuestSwipePreview";
import { NetworkVisualization } from "@/components/circle/NetworkVisualization";
import { SEO } from "@/components/SEO";
import { ProfileActivationGate } from "@/components/ProfileActivationGate";
import { InviteDialog } from "@/components/InviteDialog";
import { InviteCircleCard } from "@/components/InviteCircleCard";
import { SwipeFilters, SwipeFiltersState, DEFAULT_SWIPE_FILTERS } from "@/components/circle/SwipeFilters";
import { Users, Sparkles, UserPlus, Search } from "lucide-react";
import { TalentCopilot } from "@/components/match/TalentCopilot";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getDiscoveryMissingFields } from "@/lib/profileCompletion";
import { hasProAccess } from "@/lib/subscriptionConfig";
import { PageTransition } from "@/components/PageTransition";
import { SwipeCardSkeleton, ConnectionListSkeleton } from "@/components/skeletons/CircleSkeletons";


export default function Circle() {
  const { user, subscriptionInfo } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'foryou');
  const [profileVisibility, setProfileVisibility] = useState<{ isVisible: boolean; missingFields: string[] }>({ isVisible: true, missingFields: [] });
  const [connections, setConnections] = useState<any[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [filters, setFilters] = useState<SwipeFiltersState>(DEFAULT_SWIPE_FILTERS);
  const [profilesCount, setProfilesCount] = useState(0);
  const [accountType, setAccountType] = useState<string>("individual");
  const [matchedUser, setMatchedUser] = useState<{ name: string; avatar: string; role: string; userId: string } | null>(null);
  const [showMatchDialog, setShowMatchDialog] = useState(false);

  // Fetch account type
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("account_type")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.account_type) setAccountType(data.account_type);
      }, () => {});
  }, [user?.id]);

  const isPro = hasProAccess(subscriptionInfo.tier as any);

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Celebratory welcome handoff after universal claim flow
  useEffect(() => {
    if (searchParams.get('welcome') === 'match') {
      setActiveTab('foryou');
      import('sonner').then(({ toast }) => {
        toast.success("We found you a match!", {
          description: "Tap the first card to say hi.",
          duration: 5000,
        });
      }).catch(() => {});
      const next = new URLSearchParams(searchParams);
      next.delete('welcome');
      navigate(`/circle?${next.toString()}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const checkProfileVisibility = async () => {
      if (!user?.id) return;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, bio')
          .eq('user_id', user.id)
          .single();
        const [portfolioResult, creditsResult] = await Promise.all([
          supabase.from('credits').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('credits').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);
        const workCount = (portfolioResult.count || 0) + (creditsResult.count || 0);
        if (profile) {
          const missingFields = getDiscoveryMissingFields(profile as any, workCount);
          setProfileVisibility({ isVisible: missingFields.length === 0, missingFields });
        }
      } catch (error) {
        console.error('[Circle] Error checking profile visibility:', error);
      }
    };
    checkProfileVisibility();
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      const trackPage = async () => {
        const { analytics } = await import("@/lib/analytics");
        analytics.pageView("circle");
      };
      trackPage();
    }
  }, [user?.id]);

  const fetchConnections = useCallback(async () => {
    if (!user?.id) return;
    setConnectionsLoading(true);
    try {
      const [outgoingResult, incomingResult] = await Promise.all([
        supabase.from('connections').select('connected_user_id, status').eq('user_id', user.id),
        supabase.from('connections').select('user_id, status').eq('connected_user_id', user.id)
      ]);
      const connectedIds = new Set<string>();
      outgoingResult.data?.forEach(c => { if (c.status === 'accepted') connectedIds.add(c.connected_user_id); });
      incomingResult.data?.forEach(c => { if (c.status === 'accepted') connectedIds.add(c.user_id); });
      if (connectedIds.size === 0) { setConnections([]); setConnectionsLoading(false); return; }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, location, level, xp, bio, badge')
        .in('user_id', Array.from(connectedIds));
      setConnections(profiles || []);
    } catch (error) {
      console.error('[Circle] Error fetching connections:', error);
    } finally {
      setConnectionsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (activeTab === 'network' && user?.id) fetchConnections();
  }, [activeTab, user?.id, fetchConnections]);

   const handleMatch = async (matchedUserData: { name: string; avatar: string; role: string; userId: string }) => {
    const { analytics } = await import("@/lib/analytics");
    analytics.match(matchedUserData.userId);
    setMatchedUser(matchedUserData);
    setShowMatchDialog(true);
  };

  const handleMessage = (userId: string) => navigate(`/messages?user=${userId}`);

  const handleTabChange = async (tab: string) => {
    setActiveTab(tab);
    const { analytics } = await import("@/lib/analytics");
    analytics.featureUsed("circle_tab_switch", { tab });
  };

  const handleFiltersChange = (newFilters: SwipeFiltersState) => {
    if (!isPro) {
      newFilters.verifiedOnly = false;
      newFilters.minFollowers = 'all';
      newFilters.experienceLevel = 'all';
      newFilters.aiMatchOnly = false;
    }
    setFilters(newFilters);
  };

  return (
    <PageTransition>
    <div className="min-h-screen pb-28 sm:pb-24 md:pb-8">
      <SEO title="Match - Find Your Creative Collaborators" description="Tap to connect with creators who fit your craft" />
      
      {/* Header — lite, single line */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-energy shrink-0" />
              <h1 className="text-xl font-black tracking-[-0.03em] text-foreground truncate">Match</h1>
              {activeTab === 'network' && connections.length > 0 && (
                <span className="text-[11px] text-muted-foreground font-medium">· {connections.length}</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {activeTab === 'foryou' && (
                <SwipeFilters filters={filters} onFiltersChange={handleFiltersChange} isPro={isPro} profilesCount={profilesCount} />
              )}
              {user && (
                <Button
                  variant={activeTab === 'find' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleTabChange(activeTab === 'find' ? 'foryou' : 'find')}
                  aria-label="Search talent"
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <ProfileActivationGate
          isVisible={profileVisibility.isVisible}
          missingFields={profileVisibility.missingFields}
          surfaceLabel="Match"
        >
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          {/* Compact 2-tab pill — Find lives in header icon */}
          {activeTab !== 'find' && (
            <TabsList className="grid w-full grid-cols-2 mb-2 sm:mb-3 h-9">
              <TabsTrigger value="foryou" className="gap-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                For You
              </TabsTrigger>
              <TabsTrigger value="network" className="gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" />
                Network
                {connections.length > 0 && (
                  <span className="ml-0.5 text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">
                    {connections.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="foryou" className="space-y-3">
            {user ? (
              <>
                <SwipeFeature onMatch={handleMatch} filters={filters} onProfilesCountChange={setProfilesCount} />
                {profilesCount > 0 && (
                  <PageTip
                    id="circle"
                    title="Welcome to Match"
                    message="Tap a creator to see their profile, then send a connect request. When they accept, you can start a conversation."
                  />
                )}
              </>
            ) : (
              <GuestSwipePreview />
            )}
          </TabsContent>

          <TabsContent value="find" className="space-y-3">
            {user ? (
              <TalentCopilot />
            ) : (
              <AuthGate>
                <div className="h-[40vh] bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl" />
              </AuthGate>
            )}
          </TabsContent>

          <TabsContent value="network" className="space-y-4">
            {user ? (
              <>
                <InviteCircleCard variant="match" />
                <NetworkVisualization onInvite={() => setShowInvite(true)} />
                {connections.length > 0 && (
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Your Collaborators</h3>
                      <p className="text-sm text-muted-foreground">{connections.length} collaborator{connections.length !== 1 ? 's' : ''}</p>
                    </div>
                    <ConnectionList connections={connections} loading={connectionsLoading} onMessage={handleMessage} />
                  </div>
                )}
                {connections.length === 0 && !connectionsLoading && (
                  <div className="text-center py-6 border-t">
                    <p className="text-muted-foreground mb-4">Start connecting with creators to grow your professional circle!</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button onClick={() => setActiveTab("foryou")} variant="outline" className="gap-2">
                        <Sparkles className="h-4 w-4" /> View Today's Picks
                      </Button>
                      <Button onClick={() => setShowInvite(true)} className="gap-2">
                        <UserPlus className="h-4 w-4" /> Invite Creators
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <AuthGate>
                <div className="h-[40vh] bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl" />
              </AuthGate>
            )}
          </TabsContent>
        </Tabs>
        </ProfileActivationGate>
      </div>

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
