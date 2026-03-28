import { useState, useEffect, useCallback } from "react";
import { PageTip } from "@/components/PageTip";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ConnectionList } from "@/components/circle/ConnectionList";
import { CreatorBrowseGrid } from "@/components/circle/CreatorBrowseGrid";
import { SwipeFeature } from "@/components/swipe";
import { NetworkVisualization } from "@/components/circle/NetworkVisualization";
import { SEO } from "@/components/SEO";
import { ProfileVisibilityBanner } from "@/components/ProfileVisibilityBanner";
import { InviteDialog } from "@/components/InviteDialog";
import { SwipeFilters, SwipeFiltersState, DEFAULT_SWIPE_FILTERS } from "@/components/circle/SwipeFilters";
import { Users, Sparkles, UserPlus, LayoutGrid } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getDiscoveryMissingFields } from "@/lib/profileCompletion";
import { hasProAccess } from "@/lib/subscriptionConfig";


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
      });
  }, [user?.id]);

  const isPro = hasProAccess(subscriptionInfo.tier as any);

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const checkProfileVisibility = async () => {
      if (!user?.id) return;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, bio')
          .eq('user_id', user.id)
          .single();
        const { count: portfolioCount } = await supabase
          .from('portfolio_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if (profile) {
          const missingFields = getDiscoveryMissingFields(profile as any, portfolioCount || 0);
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
    <div className="min-h-screen pb-28 sm:pb-24 md:pb-8">
      <SEO title="Match - Find Your Creative Partner" description="Swipe to connect with creators" />
      
      <div className="container mx-auto px-3 sm:px-4 pt-2">
        <PageTip
          id="circle"
          title="👋 Welcome to Match!"
          message="Swipe right on creators you'd like to work with. When both of you swipe right, it's a match — and you can start messaging!"
        />
      </div>
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <h1 className="text-xl sm:text-2xl font-bold">Match</h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeTab === 'foryou' ? 'Swipe to discover & connect' : 
                 activeTab === 'browse' ? 'Search & browse all creators' :
                 `${connections.length} connection${connections.length !== 1 ? 's' : ''} in your network`}
              </p>
            </div>
            {activeTab === 'foryou' && (
              <SwipeFilters filters={filters} onFiltersChange={handleFiltersChange} isPro={isPro} profilesCount={profilesCount} />
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <ProfileVisibilityBanner isVisible={profileVisibility.isVisible} missingFields={profileVisibility.missingFields} />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-3 sm:mb-4 h-10 sm:h-11">
            <TabsTrigger value="foryou" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Swipe
            </TabsTrigger>
            <TabsTrigger value="browse" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="network" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Network
              {connections.length > 0 && (
                <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">
                  {connections.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="foryou" className="space-y-4">
            <SwipeFeature onMatch={handleMatch} filters={filters} onProfilesCountChange={setProfilesCount} />
          </TabsContent>

          <TabsContent value="browse" className="space-y-4">
            <CreatorBrowseGrid />
          </TabsContent>

          <TabsContent value="network" className="space-y-6">
            <NetworkVisualization onInvite={() => setShowInvite(true)} />
            {connections.length > 0 && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Your Connections</h3>
                  <p className="text-sm text-muted-foreground">{connections.length} connection{connections.length !== 1 ? 's' : ''}</p>
                </div>
                <ConnectionList connections={connections} loading={connectionsLoading} onMessage={handleMessage} />
              </div>
            )}
            {connections.length === 0 && !connectionsLoading && (
              <div className="text-center py-6 border-t">
                <p className="text-muted-foreground mb-4">Start connecting with creators to grow your network!</p>
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
          </TabsContent>
        </Tabs>
      </div>

      <InviteDialog open={showInvite} onOpenChange={setShowInvite} />
    </div>
  );
}
