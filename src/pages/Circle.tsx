import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ConnectionList } from "@/components/circle/ConnectionList";
import { ForYouFeed } from "@/components/circle/ForYouFeed";
import { BrowseCreators } from "@/components/circle/BrowseCreators";
import { NetworkVisualization } from "@/components/circle/NetworkVisualization";
import { SEO } from "@/components/SEO";
import { ProfileVisibilityBanner } from "@/components/ProfileVisibilityBanner";
import { InviteDialog } from "@/components/InviteDialog";
import { Users, Sparkles, Search as SearchIcon, UserPlus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MatchCelebrationDialog } from "@/components/discover/MatchCelebrationDialog";
import { getDiscoveryMissingFields } from "@/lib/profileCompletion";

export default function Circle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'foryou';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showMatchCelebration, setShowMatchCelebration] = useState(false);
  const [matchedUser, setMatchedUser] = useState<{ name: string; avatar: string; role: string; userId: string } | null>(null);
  const [profileVisibility, setProfileVisibility] = useState<{ isVisible: boolean; missingFields: string[] }>({ isVisible: true, missingFields: [] });
  const [connections, setConnections] = useState<any[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

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

  // Fetch connections when network tab is active
  useEffect(() => {
    if (activeTab === 'network' && user?.id) {
      fetchConnections();
    }
  }, [activeTab, user?.id]);

  const fetchConnections = async () => {
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

      setConnections(profiles || []);
    } catch (error) {
      console.error('[Circle] Error fetching connections:', error);
    } finally {
      setConnectionsLoading(false);
    }
  };

  const handleMatch = (matchedUserData: { name: string; avatar: string; role: string; userId: string }) => {
    setMatchedUser(matchedUserData);
    setShowMatchCelebration(true);
  };

  const handleMessage = (userId: string) => {
    navigate(`/messages?user=${userId}`);
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <SEO 
        title="Circle - Your Creative Network"
        description="Connect with creators, build your network"
      />
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Circle</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        {/* Profile Visibility Banner */}
        <ProfileVisibilityBanner 
          isVisible={profileVisibility.isVisible} 
          missingFields={profileVisibility.missingFields} 
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="foryou" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">For You</span>
              <span className="sm:hidden">For You</span>
            </TabsTrigger>
            <TabsTrigger value="browse" className="gap-2">
              <SearchIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Browse</span>
              <span className="sm:hidden">Browse</span>
            </TabsTrigger>
            <TabsTrigger value="network" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Network</span>
              <span className="sm:hidden">Network</span>
            </TabsTrigger>
          </TabsList>

          {/* For You Tab - AI curated daily picks */}
          <TabsContent value="foryou" className="space-y-4">
            <ForYouFeed onMatch={handleMatch} />
          </TabsContent>

          {/* Browse Tab - Full directory with filters */}
          <TabsContent value="browse" className="space-y-4">
            <BrowseCreators onMatch={handleMatch} />
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

      {/* Match Celebration Dialog */}
      {matchedUser && (
        <MatchCelebrationDialog
          open={showMatchCelebration}
          onOpenChange={(open) => {
            setShowMatchCelebration(open);
            if (!open) {
              setMatchedUser(null);
            }
          }}
          matchedUser={matchedUser}
          onSendMessage={() => {
            setShowMatchCelebration(false);
            navigate('/messages');
          }}
        />
      )}

      {/* Invite Dialog */}
      <InviteDialog open={showInvite} onOpenChange={setShowInvite} />
    </div>
  );
}
