import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SmartConnectionSuggestions } from "@/components/circle/SmartConnectionSuggestions";
import { EmptyState } from "@/components/ui/empty-state";
import { SEO } from "@/components/SEO";
import { Users, Sparkles, MessageCircle, UserPlus, Mail, X, CheckCircle2, MapPin, Star, Zap, Heart, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CreatorFilters, type CreatorFilterState } from "@/components/discover/CreatorFilters";
import { MatchCelebrationDialog } from "@/components/discover/MatchCelebrationDialog";
import { useUndoSwipe } from "@/hooks/useUndoSwipe";
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
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
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
  
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast: toastHook } = useToast();
  const subscriptionTier = subscriptionInfo.tier as SubscriptionTier;
  const { undosRemaining, trackSwipe, undoLastSwipe, checkUndosRemaining } = useUndoSwipe(subscriptionTier);

  useEffect(() => {
    if (activeTab === "network") {
      fetchMyNetwork();
    } else if (activeTab === "match") {
      fetchMatchCreators();
    }
  }, [activeTab, user, creatorFilters]);

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

      // Fetch creators
      let profilesQuery = supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url, location, professional_skills, passion_skills, level, badge')
        .neq('user_id', user.id)
        .not('full_name', 'is', null)
        .not('bio', 'is', null)
        .not('avatar_url', 'is', null);

      if (creatorFilters.role !== 'all') {
        profilesQuery = profilesQuery.eq('role', creatorFilters.role);
      }
      
      const { data: profiles } = await profilesQuery.limit(20);

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

      // Get portfolio count
      const profileIds = profilesWithSkills.map(p => p.user_id);
      const { data: portfolioCounts } = await supabase
        .from('portfolio_items')
        .select('user_id')
        .in('user_id', profileIds);
      
      const portfolioMap = new Map<string, number>();
      portfolioCounts?.forEach(item => {
        portfolioMap.set(item.user_id, (portfolioMap.get(item.user_id) || 0) + 1);
      });

      // Filter with portfolio
      const profilesWithPortfolio = profilesWithSkills.filter(profile => 
        (portfolioMap.get(profile.user_id) || 0) >= 1
      );

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
    setSwipeDirection(direction);
    const targetX = direction === "right" ? window.innerWidth * 1.5 : -window.innerWidth * 1.5;
    setDragOffset({ x: targetX, y: 0 });
    
    await new Promise(resolve => setTimeout(resolve, 300));

    if (dailySwipesLeft <= 0) {
      setSwipeDirection(null);
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

        setCurrentMatchIndex(prev => prev + 1);
        setSwipeDirection(null);
        setDragOffset({ x: 0, y: 0 });

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
    setSwipeDirection(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (matchLoading || currentMatchIndex >= matchCards.length) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDragStart({ x: clientX, y: clientY });
  };
  
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragStart.x === 0 && dragStart.y === 0) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);
    
    const isHorizontalSwipe = horizontalDistance > verticalDistance * 3 && horizontalDistance > 60;
    
    if (isHorizontalSwipe) {
      if (!isDragging) {
        setIsDragging(true);
      }
      e.preventDefault();
      setDragOffset({ x: deltaX, y: 0 });
      
      if (Math.abs(deltaX) > 80) {
        setSwipeDirection(deltaX > 0 ? "right" : "left");
      } else {
        setSwipeDirection(null);
      }
    } else if (verticalDistance > 15 && !isDragging) {
      setDragStart({ x: 0, y: 0 });
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) {
      setDragStart({ x: 0, y: 0 });
      return;
    }
    
    setIsDragging(false);
    
    if (Math.abs(dragOffset.x) > 150) {
      handleSwipe(dragOffset.x > 0 ? "right" : "left");
    } else {
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
    }
    
    setDragStart({ x: 0, y: 0 });
  };

  const handleMessage = (userId: string) => {
    navigate(`/messages?user=${userId}`);
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'og': return 'bg-purple-500';
      case 'beta': return 'bg-blue-500';
      case 'vip': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
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
          <TabsList className="grid w-full grid-cols-4 mb-6">
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
            <TabsTrigger value="communities" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Communities
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

            {matchLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
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
                  {currentMatchIndex < matchCards.length ? (
                    <>
                      {currentMatchIndex + 1 < matchCards.length && (
                        <div className="mb-3 text-center text-sm text-muted-foreground">
                          {currentMatchIndex + 1} / {matchCards.length}
                        </div>
                      )}

                      <div className="relative mb-6">
                        {/* Next card (background) */}
                        {currentMatchIndex + 1 < matchCards.length && (
                          <div 
                            className="absolute inset-0 overflow-hidden rounded-3xl border bg-card shadow-lg"
                            style={{
                              transform: 'scale(0.95) translateY(10px)',
                              opacity: 0.5,
                              zIndex: 0,
                            }}
                          >
                            <div className="relative h-96">
                              <img 
                                src={matchCards[currentMatchIndex + 1].image} 
                                alt={matchCards[currentMatchIndex + 1].name} 
                                className="h-full w-full object-cover" 
                              />
                            </div>
                          </div>
                        )}

                        {/* Current card */}
                        {matchCards[currentMatchIndex] && (
                          <div
                            ref={cardRef}
                            className="relative overflow-hidden rounded-3xl border bg-card shadow-2xl cursor-grab active:cursor-grabbing select-none"
                            style={{
                              transform: swipeDirection 
                                ? `translateX(${swipeDirection === 'right' ? '150%' : '-150%'}) rotate(${swipeDirection === 'right' ? '30deg' : '-30deg'})`
                                : `translateX(${dragOffset.x}px) rotate(${dragOffset.x * 0.1}deg)`,
                              transition: swipeDirection ? 'transform 0.3s ease-out' : isDragging ? 'none' : 'transform 0.2s ease-out',
                              zIndex: 1,
                            }}
                            onMouseDown={handleDragStart}
                            onMouseMove={handleDragMove}
                            onMouseUp={handleDragEnd}
                            onMouseLeave={handleDragEnd}
                            onTouchStart={handleDragStart}
                            onTouchMove={handleDragMove}
                            onTouchEnd={handleDragEnd}
                          >
                            <div className="relative h-96">
                              <img 
                                src={matchCards[currentMatchIndex].image} 
                                alt={matchCards[currentMatchIndex].name} 
                                className="h-full w-full object-cover" 
                                draggable={false}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                              
                              {/* Swipe overlays */}
                              {swipeDirection === 'right' && (
                                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                  <div className="bg-green-500 text-white px-8 py-4 rounded-full text-2xl font-bold">
                                    CONNECT
                                  </div>
                                </div>
                              )}
                              {swipeDirection === 'left' && (
                                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                  <div className="bg-red-500 text-white px-8 py-4 rounded-full text-2xl font-bold">
                                    PASS
                                  </div>
                                </div>
                              )}
                              
                              {/* Card content */}
                              <div className="absolute bottom-0 left-0 right-0 p-6">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h2 className="text-2xl font-bold mb-2">{matchCards[currentMatchIndex].name}</h2>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="secondary">{matchCards[currentMatchIndex].title}</Badge>
                                      {matchCards[currentMatchIndex].badge && (
                                        <Badge className={matchCards[currentMatchIndex].badge === 'og' ? 'bg-purple-500' : 'bg-blue-500'}>
                                          {matchCards[currentMatchIndex].badge?.toUpperCase()}
                                        </Badge>
                                      )}
                                    </div>
                                    {matchCards[currentMatchIndex].location && (
                                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                        <MapPin className="h-4 w-4" />
                                        {matchCards[currentMatchIndex].location}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm line-clamp-3">{matchCards[currentMatchIndex].description}</p>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="mt-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/profile/${matchCards[currentMatchIndex].user_id}`);
                                  }}
                                >
                                  View Full Profile
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-center gap-4 mb-6">
                        <Button
                          size="lg"
                          variant="outline"
                          className="h-16 w-16 rounded-full"
                          onClick={() => handleSwipe('left')}
                        >
                          <X className="h-6 w-6" />
                        </Button>
                        <Button
                          size="lg"
                          className="h-16 w-16 rounded-full"
                          onClick={() => handleSwipe('right')}
                        >
                          <Heart className="h-6 w-6" />
                        </Button>
                      </div>

                      {/* Undo button */}
                      {undosRemaining > 0 && currentMatchIndex > 0 && (
                        <UndoSwipeButton
                          onClick={async () => {
                            const undone = await undoLastSwipe();
                            if (undone) {
                              setCurrentMatchIndex(Math.max(0, currentMatchIndex - 1));
                              setSwipeDirection(null);
                              setDragOffset({ x: 0, y: 0 });
                            }
                          }}
                          disabled={isDragging}
                          userTier={subscriptionTier}
                          undosRemaining={undosRemaining}
                        />
                      )}
                    </>
                  ) : (
                    <EmptyState
                      icon={Users}
                      title="All Caught Up!"
                      description="You've seen all available creators. Check back later for more matches!"
                      action={{
                        label: "View My Network",
                        onClick: () => setActiveTab("network")
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* My Network Tab */}
          <TabsContent value="network" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">My Network</h2>
              <p className="text-muted-foreground">
                {connections.length} {connections.length === 1 ? 'connection' : 'connections'}
              </p>
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-24 bg-muted rounded mb-4" />
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </Card>
                ))}
              </div>
            ) : connections.length === 0 ? (
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {connections.map(connection => (
                  <Card 
                    key={connection.user_id} 
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/profile/${connection.user_id}`)}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar className="h-16 w-16 border-2 border-primary/20">
                        <AvatarImage src={connection.avatar_url || ''} />
                        <AvatarFallback>{connection.full_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{connection.full_name}</h3>
                          {connection.badge && (
                            <Badge className={`${getBadgeColor(connection.badge)} text-white text-xs px-2`}>
                              {connection.badge.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{connection.role}</p>
                        {connection.level && (
                          <p className="text-xs text-muted-foreground mt-1">Level {connection.level}</p>
                        )}
                      </div>
                    </div>
                    
                    {connection.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {connection.bio}
                      </p>
                    )}

                    {connection.location && (
                      <p className="text-xs text-muted-foreground mb-4">📍 {connection.location}</p>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMessage(connection.user_id);
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Message
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Communities Tab */}
          <TabsContent value="communities" className="space-y-6">
            <EmptyState
              icon={UserPlus}
              title="Communities Coming Soon"
              description="Join interest-based communities to connect with creators who share your passions. Create private groups, host events, and collaborate on projects."
              action={{
                label: "Explore Suggestions",
                onClick: () => setActiveTab("suggestions")
              }}
            />
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
