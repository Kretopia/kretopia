import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SmartConnectionSuggestions } from "@/components/circle/SmartConnectionSuggestions";
import { ConnectionList } from "@/components/circle/ConnectionList";
import { MatchFeed } from "@/components/circle/MatchFeed";
import { EmptyState } from "@/components/ui/empty-state";
import { SEO } from "@/components/SEO";
import { Users, Sparkles, UserPlus, Zap, Loader2, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CreatorFilters, type CreatorFilterState } from "@/components/discover/CreatorFilters";
import { MatchCelebrationDialog } from "@/components/discover/MatchCelebrationDialog";
import { useUndoSwipe } from "@/hooks/useUndoSwipe";
import { useSwipeGestures } from "@/hooks/useSwipeGestures";
import { UndoSwipeButton } from "@/components/discover/UndoSwipeButton";
import { getRemainingSwipes, type SubscriptionTier } from "@/lib/subscriptionLimits";
import { useToast } from "@/hooks/use-toast";

interface Connection {
  user_id: string;
  full_name: string;
  role: string;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  badge: string;
  level: number;
}

interface CreatorCard {
  id: string;
  user_id: string;
  name: string;
  title: string;
  location: string;
  image: string;
  description: string;
  badge?: string;
  level?: number;
}

export default function Circle() {
  const { user, subscriptionInfo } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("suggestions");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Match tab state
  const [matchCards, setMatchCards] = useState<CreatorCard[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchLoading, setMatchLoading] = useState(false);
  const [featuredCreator, setFeaturedCreator] = useState<CreatorCard | null>(null);
  const [dailySwipesLeft, setDailySwipesLeft] = useState<number>(20);
  const [showMatchCelebration, setShowMatchCelebration] = useState(false);
  const [matchedUser, setMatchedUser] = useState<{ name: string; avatar: string; role: string; userId: string } | null>(null);
  const [creatorFilters, setCreatorFilters] = useState<CreatorFilterState>({
    role: 'all',
    minFollowers: 0,
    verified: false,
    level: 'all',
    badge: 'all'
  });
  
  const { toast: toastHook } = useToast();
  const subscriptionTier = subscriptionInfo.tier as SubscriptionTier;
  const { undosRemaining, trackSwipe, undoLastSwipe, checkUndosRemaining } = useUndoSwipe(subscriptionTier);
  
  const swipeGestures = useSwipeGestures({
    onSwipeLeft: () => handleSwipe("left"),
    onSwipeRight: () => handleSwipe("right")
  });

  useEffect(() => {
    if (!user) return;
    
    // Only fetch when tab becomes active, not on every filter change
    if (activeTab === "network") {
      fetchMyNetwork();
    } else if (activeTab === "match") {
      fetchMatchCreators();
    }
  }, [activeTab, user?.id]);

  useEffect(() => {
    checkUndosRemaining();
  }, []);

  const fetchMyNetwork = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get accepted connections
      const { data: connectionsData } = await supabase
        .from('connections')
        .select('connected_user_id, user_id')
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (!connectionsData || connectionsData.length === 0) {
        setConnections([]);
        return;
      }

      // Get the other user's ID from each connection
      const connectedUserIds = connectionsData.map(c => 
        c.user_id === user.id ? c.connected_user_id : c.user_id
      );

      // Fetch profiles for all connected users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url, location, badge, level')
        .in('user_id', connectedUserIds);

      setConnections(profiles || []);
    } catch (error) {
      console.error('Error fetching network:', error);
      toast.error('Failed to load your network');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchCreators = async () => {
    if (!user) return;
    
    setMatchLoading(true);
    try {
      // Get user's profile and swipe data
      const [profileResult, swipesResult, connectionsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('swipes').select('target_id, target_type').eq('user_id', user.id),
        supabase.from('connections').select('user_id, connected_user_id').or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`).eq('status', 'accepted')
      ]);

      const userProfile = profileResult.data;
      if (userProfile) {
        const remaining = getRemainingSwipes(subscriptionTier, userProfile.daily_swipes || 0);
        setDailySwipesLeft(remaining === -1 ? 999 : remaining);
      }

      const swipedIds = new Set(swipesResult.data?.map(s => s.target_id) || []);
      const connectedUserIds = new Set(
        connectionsResult.data?.map(conn => 
          conn.user_id === user.id ? conn.connected_user_id : conn.user_id
        ) || []
      );

      // Fetch creators with optimized query - smaller initial limit
      let profilesQuery = supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url, location, professional_skills, passion_skills, level, badge')
        .neq('user_id', user.id)
        .not('full_name', 'is', null)
        .not('bio', 'is', null)
        .not('avatar_url', 'is', null)
        .limit(20); // Reduced limit for faster loading

      if (creatorFilters.role !== 'all') {
        profilesQuery = profilesQuery.eq('role', creatorFilters.role);
      }
      
      const { data: profiles, error: profilesError } = await profilesQuery;
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setMatchCards([]);
        return;
      }

      // Filter profiles
      const basicProfiles = (profiles || []).filter(profile => 
        !connectedUserIds.has(profile.user_id) &&
        !swipedIds.has(profile.user_id) &&
        profile.full_name && 
        profile.full_name !== 'New User' && 
        profile.role && 
        profile.avatar_url &&
        profile.bio &&
        profile.bio.length > 20
      );

      // Check skills
      const profilesWithSkills = basicProfiles.filter(profile => {
        const professionalSkills = Array.isArray(profile.professional_skills) ? profile.professional_skills.length : 0;
        const passionSkills = Array.isArray(profile.passion_skills) ? profile.passion_skills.length : 0;
        return (professionalSkills + passionSkills) >= 2;
      });

      // Get portfolio count - only if we have profiles
      let profilesWithPortfolio = profilesWithSkills;
      
      if (profilesWithSkills.length > 0) {
        const profileIds = profilesWithSkills.map(p => p.user_id);
        const { data: portfolioCounts } = await supabase
          .from('portfolio_items')
          .select('user_id')
          .in('user_id', profileIds)
          .limit(100); // Limit portfolio query
        
        const portfolioMap = new Map<string, number>();
        portfolioCounts?.forEach(item => {
          portfolioMap.set(item.user_id, (portfolioMap.get(item.user_id) || 0) + 1);
        });

        // Filter with portfolio
        profilesWithPortfolio = profilesWithSkills.filter(profile => 
          (portfolioMap.get(profile.user_id) || 0) >= 1
        );
      }
      
      // If no profiles with portfolio, just show profiles with skills
      if (profilesWithPortfolio.length === 0) {
        profilesWithPortfolio = profilesWithSkills.slice(0, 10);
      }

      const creatorCards: CreatorCard[] = profilesWithPortfolio.map(profile => ({
        id: profile.user_id,
        user_id: profile.user_id,
        name: profile.full_name,
        title: profile.role,
        location: profile.location || 'Remote',
        image: profile.avatar_url || '',
        description: profile.bio || 'Creative professional',
        badge: profile.badge,
        level: profile.level
      }));

      // Set featured creator (OG badge)
      const ogCreators = creatorCards.filter(c => c.badge === 'og');
      const featuredCandidate = ogCreators.length > 0 ? ogCreators[0] : creatorCards[0];
      
      if (featuredCandidate) {
        setFeaturedCreator(featuredCandidate);
        setMatchCards(creatorCards.filter(c => c.id !== featuredCandidate.id));
      } else {
        setMatchCards(creatorCards);
      }
    } catch (error) {
      console.error('Error fetching match creators:', error);
      toast.error('Failed to load creators');
    } finally {
      setMatchLoading(false);
    }
  };

  const handleSwipe = async (direction: "left" | "right") => {
    const currentCard = matchCards[currentMatchIndex];
    if (!user || !currentCard) return;

    // Track swipe
    const { analytics } = await import("@/lib/analytics");
    analytics.swipe(direction, currentCard.user_id);

    // Animation
    await swipeGestures.animateSwipe(direction);

    if (dailySwipesLeft <= 0) {
      toastHook({
        title: "Daily limit reached",
        description: "Upgrade to Thriver for unlimited swipes!",
        variant: "destructive"
      });
      return;
    }

    // Update swipe count
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('daily_swipes')
      .eq('user_id', user.id)
      .single();
    
    if (currentProfile) {
      await supabase.from('profiles').update({ daily_swipes: (currentProfile.daily_swipes || 0) + 1 }).eq('user_id', user.id);
    }
    
    setDailySwipesLeft(prev => prev - 1);

    const { data: swipeData } = await supabase.from('swipes').insert({
      user_id: user.id,
      target_id: currentCard.id,
      target_type: 'creator',
      direction,
      is_super_like: false,
    }).select().single();

    if (swipeData) {
      trackSwipe(swipeData as any);
    }

    if (direction === "right") {
      // Check for match
      const { data: theirSwipe } = await supabase
        .from('swipes')
        .select('*')
        .eq('user_id', currentCard.user_id)
        .eq('target_id', user.id)
        .eq('direction', 'right')
        .maybeSingle();

      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role')
        .eq('user_id', user.id)
        .single();

      if (theirSwipe) {
        // Match!
        await supabase.from('matches').insert({
          user1_id: user.id,
          user2_id: currentCard.user_id,
          match_type: 'creator',
          status: 'active',
        });

        analytics.match(currentCard.user_id);

        // Send push notifications to both users
        const { notifyMatch } = await import("@/lib/pushNotifications");
        await notifyMatch(
          user.id, 
          currentCard.user_id, 
          senderProfile?.full_name || 'A creator',
          currentCard.name
        );

        setCurrentMatchIndex(prev => prev + 1);
        swipeGestures.resetSwipe();

        setMatchedUser({
          name: currentCard.name,
          avatar: currentCard.image,
          role: currentCard.title,
          userId: currentCard.user_id,
        });
        setShowMatchCelebration(true);
        
        return;
      } else {
        // Notify interest
        await supabase.from('notifications').insert({
          user_id: currentCard.user_id,
          title: "💫 Someone's Interested!",
          message: `${senderProfile?.full_name || 'A creator'} (${senderProfile?.role || 'Professional'}) wants to connect with you`,
          type: 'interest',
          category: 'collaboration',
          priority: 'high',
          link: '/circle?tab=match',
          action_url: '/circle?tab=match',
          action_text: 'Check Them Out',
          image_url: senderProfile?.avatar_url,
        });

        try {
          await supabase.functions.invoke('notify-swipe', {
            body: {
              recipientId: currentCard.user_id,
              swiperName: senderProfile?.full_name || 'Someone',
              swiperRole: senderProfile?.role || 'A creator',
              swiperAvatar: senderProfile?.avatar_url,
            }
          });
        } catch (notifyError) {
          console.error('Failed to send notifications:', notifyError);
        }
      }

      toast.success(`Interest sent to ${currentCard.name}! 💫`);
    }
    
    setCurrentMatchIndex(prev => prev + 1);
  };

  const handleMessage = (userId: string) => {
    navigate(`/messages?user=${userId}`);
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <SEO 
        title="Circle - Your Creative Network"
        description="Connect with creators, build your network, and join communities"
      />
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Circle</h1>
          </div>
          <p className="text-muted-foreground">Your creative network and community</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="suggestions" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="match" className="gap-2">
              <Heart className="h-4 w-4" />
              Match
            </TabsTrigger>
            <TabsTrigger value="network" className="gap-2">
              <Users className="h-4 w-4" />
              My Network
            </TabsTrigger>
          </TabsList>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Smart Connections</h2>
              <p className="text-muted-foreground">
                Discover creators who match your skills, interests, and collaboration style
              </p>
            </div>
            <SmartConnectionSuggestions />
          </TabsContent>

          {/* Match Tab - Swipe to Connect */}
          <TabsContent value="match" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Match with Creators</h2>
              <p className="text-muted-foreground">
                Swipe right to connect, left to pass
              </p>
            </div>

            {/* Swipes Badge */}
            <div className="flex justify-end mb-4">
              {subscriptionTier === 'free' ? (
                <Badge 
                  variant={dailySwipesLeft <= 3 ? "destructive" : "secondary"} 
                  className="gap-1 text-xs cursor-pointer"
                  onClick={() => dailySwipesLeft <= 3 && navigate('/subscription')}
                >
                  <Zap className="h-3 w-3" />
                  <span>{dailySwipesLeft}/10 swipes today</span>
                  {dailySwipesLeft <= 3 && <span className="hidden sm:inline">• Upgrade for unlimited</span>}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Sparkles className="h-3 w-3" />
                  <span>Unlimited swipes</span>
                </Badge>
              )}
            </div>

            <div className="grid lg:grid-cols-[250px_1fr] gap-6">
              {/* Filters */}
              <div className="hidden lg:block">
                <CreatorFilters
                  filters={creatorFilters}
                  onFilterChange={setCreatorFilters}
                  isPremium={subscriptionTier !== 'free'}
                  userLevel={1}
                />
              </div>

              {/* Swipe Cards */}
              <div className="max-w-md mx-auto w-full">
                {currentMatchIndex < matchCards.length && (
                  <div className="mb-3 text-center text-sm text-muted-foreground">
                    {currentMatchIndex + 1} / {matchCards.length}
                  </div>
                )}

                <MatchFeed
                  cards={matchCards}
                  currentIndex={currentMatchIndex}
                  loading={matchLoading}
                  dragOffset={swipeGestures.dragOffset}
                  swipeDirection={swipeGestures.swipeDirection}
                  isDragging={swipeGestures.isDragging}
                  onSwipeLeft={() => handleSwipe("left")}
                  onSwipeRight={() => handleSwipe("right")}
                  onDragStart={swipeGestures.handleDragStart}
                  onDragMove={swipeGestures.handleDragMove}
                  onDragEnd={swipeGestures.handleDragEnd}
                  cardRef={swipeGestures.cardRef}
                />

                {/* Undo button */}
                {undosRemaining > 0 && currentMatchIndex > 0 && currentMatchIndex < matchCards.length && (
                  <div className="mt-24">
                    <UndoSwipeButton
                      onClick={async () => {
                        const undone = await undoLastSwipe();
                        if (undone) {
                          setCurrentMatchIndex(Math.max(0, currentMatchIndex - 1));
                          swipeGestures.resetSwipe();
                        }
                      }}
                      disabled={swipeGestures.isDragging}
                      userTier={subscriptionTier}
                      undosRemaining={undosRemaining}
                    />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* My Network Tab */}
          <TabsContent value="network" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">My Network</h2>
              <p className="text-muted-foreground">
                {connections.length} {connections.length === 1 ? 'connection' : 'connections'}
              </p>
            </div>

            {connections.length === 0 && !loading ? (
              <EmptyState
                icon={Users}
                title="No connections yet"
                description="Start building your network by connecting with creators in the Suggestions tab"
                action={{
                  label: "Explore Suggestions",
                  onClick: () => setActiveTab("suggestions")
                }}
              />
            ) : (
              <ConnectionList
                connections={connections}
                loading={loading}
                onMessage={handleMessage}
              />
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
              navigate('/spark');
            }
          }}
          matchedUser={matchedUser}
          onSendMessage={() => {
            setShowMatchCelebration(false);
            navigate('/spark');
          }}
        />
      )}
    </div>
  );
}
