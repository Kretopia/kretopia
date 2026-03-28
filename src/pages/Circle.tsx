import { useState, useEffect, useCallback } from "react";
import { PageTip } from "@/components/PageTip";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ConnectionList } from "@/components/circle/ConnectionList";
import { SwipeFeature } from "@/components/swipe";
import { NetworkVisualization } from "@/components/circle/NetworkVisualization";
import { CirclesTab } from "@/components/scene/CirclesTab";
import { SEO } from "@/components/SEO";
import { ProfileVisibilityBanner } from "@/components/ProfileVisibilityBanner";
import { InviteDialog } from "@/components/InviteDialog";
import { SwipeFilters, SwipeFiltersState, DEFAULT_SWIPE_FILTERS } from "@/components/circle/SwipeFilters";
import { Users, Sparkles, UserPlus, MessageSquare } from "lucide-react";
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
  

  // Redirect company accounts away from Circle
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("account_type")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.account_type) setAccountType(data.account_type);
        if (data?.account_type === "company") {
          navigate("/opportunities", { replace: true }); // Company accounts go to Gigs
        }
      });
  }, [user?.id, navigate]);

  // Check if user is Pro
  const isPro = hasProAccess(subscriptionInfo.tier as any);

  // Sync tab with URL param when it changes
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Check user's profile visibility
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
          setProfileVisibility({
            isVisible: missingFields.length === 0,
            missingFields
          });
        }
      } catch (error) {
        console.error('[Circle] Error checking profile visibility:', error);
      }
    };
    
    checkProfileVisibility();
  }, [user?.id]);

  // Track page view
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
      // Get all connections (both directions) - accepted OR where other user initiated
      const [outgoingResult, incomingResult] = await Promise.all([
        supabase
          .from('connections')
          .select('connected_user_id, status')
          .eq('user_id', user.id),
        supabase
          .from('connections')
          .select('user_id, status')
          .eq('connected_user_id', user.id)
      ]);

      const connectedIds = new Set<string>();
      
      // Add accepted connections from both directions
      outgoingResult.data?.forEach(c => {
        if (c.status === 'accepted') {
          connectedIds.add(c.connected_user_id);
        }
      });
      incomingResult.data?.forEach(c => {
        if (c.status === 'accepted') {
          connectedIds.add(c.user_id);
        }
      });

      console.log('[Circle] Found connections:', connectedIds.size);

      if (connectedIds.size === 0) {
        setConnections([]);
        setConnectionsLoading(false);
        return;
      }

      // Fetch profiles for connected users
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, location, level, xp, bio, badge')
        .in('user_id', Array.from(connectedIds));

      if (error) {
        console.error('[Circle] Error fetching profiles:', error);
      }

      console.log('[Circle] Fetched connection profiles:', profiles?.length);
      setConnections(profiles || []);
    } catch (error) {
      console.error('[Circle] Error fetching connections:', error);
    } finally {
      setConnectionsLoading(false);
    }
  }, [user?.id]);

  // Fetch connections when network tab is active
  useEffect(() => {
    if (activeTab === 'network' && user?.id) {
      fetchConnections();
    }
  }, [activeTab, user?.id, fetchConnections]);

  const handleMatch = async (matchedUserData: { name: string; avatar: string; role: string; userId: string }) => {
    console.log('[Circle] Match detected:', matchedUserData);
    const { analytics } = await import("@/lib/analytics");
    analytics.match(matchedUserData.userId);
  };

  const handleMessage = (userId: string) => {
    navigate(`/messages?user=${userId}`);
  };

  // Track tab changes
  const handleTabChange = async (tab: string) => {
    setActiveTab(tab);
    const { analytics } = await import("@/lib/analytics");
    analytics.featureUsed("circle_tab_switch", { tab });
  };

  const handleFiltersChange = (newFilters: SwipeFiltersState) => {
    // If user is not Pro, don't allow Pro filters
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
      <SEO 
        title="Circle - Your Creative Network"
        description="Connect with creators, build your network"
      />
      
      <div className="container mx-auto px-3 sm:px-4 pt-2">
        <PageTip
          id="circle"
          title="👋 Welcome to Circle!"
          message="This is where the magic happens. Swipe right on creators you'd like to work with. When both of you swipe right, it's a match — and you can start messaging!"
        />
      </div>
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <h1 className="text-xl sm:text-2xl font-bold">My Circle</h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeTab === 'foryou' ? 'Swipe to discover & connect' : 
                 `${connections.length} connection${connections.length !== 1 ? 's' : ''} in your network`}
              </p>
            </div>
            
            {/* Filters button - only show on Connect tab */}
            {activeTab === 'foryou' && (
              <SwipeFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                isPro={isPro}
                profilesCount={profilesCount}
              />
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* Profile Visibility Banner */}
        <ProfileVisibilityBanner 
          isVisible={profileVisibility.isVisible} 
          missingFields={profileVisibility.missingFields} 
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3 sm:mb-4 h-10 sm:h-11">
            <TabsTrigger value="foryou" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Connect</span>
              <span className="sm:hidden">Match</span>
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

          {/* Connect Tab - Swipe to match */}
          <TabsContent value="foryou" className="space-y-4">
            <SwipeFeature 
              onMatch={handleMatch} 
              filters={filters}
              onProfilesCountChange={setProfilesCount}
            />
          </TabsContent>




          {/* My Network Tab */}
          <TabsContent value="network" className="space-y-6">
            {/* 6 Degrees Visualization - Always show */}
            <NetworkVisualization onInvite={() => setShowInvite(true)} />

            {/* Connection List */}
            {connections.length > 0 && (
              <>
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Your Connections</h3>
                    <p className="text-sm text-muted-foreground">
                      {connections.length} connection{connections.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ConnectionList
                    connections={connections}
                    loading={connectionsLoading}
                    onMessage={handleMessage}
                  />
                </div>
              </>
            )}

            {connections.length === 0 && !connectionsLoading && (
              <div className="text-center py-6 border-t">
                <p className="text-muted-foreground mb-4">
                  Start connecting with creators to grow your network!
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => setActiveTab("foryou")} variant="outline" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    View Today's Picks
                  </Button>
                  <Button onClick={() => setShowInvite(true)} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Invite Creators
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Dialog */}
      <InviteDialog open={showInvite} onOpenChange={setShowInvite} />
    </div>
  );
}
