import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Flame, Star, MapPin, DollarSign, Sparkles, Users, Eye, CheckCircle2, Filter, Lock, Image, Video, Music, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { SearchBar } from "@/components/SearchBar";

type CardType = "creator" | "opportunity";

interface PortfolioItem {
  id: string;
  title: string;
  media_type: string;
  media_url: string;
  thumbnail_url?: string;
}

interface Card {
  id: string;
  type: CardType;
  name: string;
  title: string;
  location: string;
  image: string;
  tags: string[];
  compensation?: string;
  description: string;
  user_id?: string;
  created_by?: string;
  portfolio?: PortfolioItem[];
  socialStats?: {
    instagram_followers?: number;
    youtube_subscribers?: number;
    tiktok_followers?: number;
    spotify_listeners?: number;
    total_engagement_rate?: number;
    verified_metrics?: boolean;
  };
}

const Discover = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "creators" | "opportunities">("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchFilters, setSearchFilters] = useState<any>({});
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
  const [dailySwipesLeft, setDailySwipesLeft] = useState<number>(20);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Restore card index if returning from profile view
    const state = location.state as { cardIndex?: number };
    if (state?.cardIndex !== undefined) {
      setCurrentIndex(state.cardIndex);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's subscription tier and swipe limits
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('subscription_tier, daily_swipes')
        .eq('user_id', user.id)
        .single();
      
      if (userProfile) {
        setSubscriptionTier(userProfile.subscription_tier || 'free');
        const maxSwipes = userProfile.subscription_tier === 'free' ? 20 : 999;
        setDailySwipesLeft(maxSwipes - (userProfile.daily_swipes || 0));
      }

      // Fetch profiles (creators) using the secure public_profiles view
      let profilesQuery = supabase
        .from('public_profiles')
        .select('*')
        .neq('user_id', user.id);

      // Apply search query
      if (searchQuery) {
        profilesQuery = profilesQuery.or(`full_name.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%,role.ilike.%${searchQuery}%`);
      }

      // Apply role filter
      if (roleFilter !== 'all') {
        profilesQuery = profilesQuery.eq('role', roleFilter);
      }

      // Apply advanced filters
      if (searchFilters.location && searchFilters.location !== 'all') {
        profilesQuery = profilesQuery.ilike('location', `%${searchFilters.location}%`);
      }
      if (searchFilters.verified) {
        profilesQuery = profilesQuery.eq('verified_metrics', true);
      }
      if (searchFilters.minFollowers) {
        profilesQuery = profilesQuery.or(
          `instagram_followers.gte.${searchFilters.minFollowers},` +
          `youtube_subscribers.gte.${searchFilters.minFollowers},` +
          `tiktok_followers.gte.${searchFilters.minFollowers}`
        );
      }
      
      const { data: profiles } = await profilesQuery.limit(20);

      // Fetch portfolio items for each profile
      const profileIds = (profiles || []).map(p => p.user_id);
      const { data: portfolioItems } = await supabase
        .from('portfolio_items')
        .select('*')
        .in('user_id', profileIds)
        .eq('featured', true)
        .limit(3);

      // Fetch opportunities
      let opportunitiesQuery = supabase
        .from('opportunities')
        .select('*')
        .eq('status', 'active');

      // Apply search query for opportunities
      if (searchQuery) {
        opportunitiesQuery = opportunitiesQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,type.ilike.%${searchQuery}%`);
      }

      if (searchFilters.location && searchFilters.location !== 'all') {
        opportunitiesQuery = opportunitiesQuery.ilike('location', `%${searchFilters.location}%`);
      }

      const { data: opportunities } = await opportunitiesQuery.limit(20);

      const creatorCards: Card[] = (profiles || []).map(profile => {
        const userPortfolio = (portfolioItems || []).filter(item => item.user_id === profile.user_id);
        return {
          id: profile.id,
          type: 'creator' as CardType,
          name: profile.full_name,
          title: profile.role,
          location: profile.location || 'Remote',
          image: profile.avatar_url || `https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop`,
          tags: ['Creator'],
          description: profile.bio || 'Creative professional looking to collaborate',
          user_id: profile.user_id,
          portfolio: userPortfolio,
          socialStats: {
            instagram_followers: profile.instagram_followers,
            youtube_subscribers: profile.youtube_subscribers,
            tiktok_followers: profile.tiktok_followers,
            spotify_listeners: profile.spotify_listeners,
            total_engagement_rate: profile.total_engagement_rate,
            verified_metrics: profile.verified_metrics,
          },
        };
      });

      const opportunityCards: Card[] = (opportunities || []).map(opp => ({
        id: opp.id,
        type: 'opportunity' as CardType,
        name: opp.title,
        title: opp.type.charAt(0).toUpperCase() + opp.type.slice(1),
        location: opp.location || 'Remote',
        image: opp.image_url || `https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=500&fit=crop`,
        tags: opp.tags || [],
        compensation: opp.compensation,
        description: opp.description,
        created_by: opp.created_by,
      }));

      // Mix creators and opportunities based on active tab
      let filteredCards: Card[] = [];
      if (activeTab === 'creators') {
        filteredCards = creatorCards;
      } else if (activeTab === 'opportunities') {
        filteredCards = opportunityCards;
      } else {
        filteredCards = [...creatorCards, ...opportunityCards].sort(() => Math.random() - 0.5);
      }

      setCards(filteredCards);
      setLoading(false);
    };

    fetchData();
  }, [activeTab, locationFilter, roleFilter, searchQuery, searchFilters]);

  const handleSwipe = async (direction: "left" | "right", isSuperLike: boolean = false) => {
    const currentCard = cards[currentIndex];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Trigger animation
    setSwipeDirection(direction);
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check swipe limits
    if (dailySwipesLeft <= 0 && subscriptionTier === 'free') {
      toast({
        title: "Daily limit reached",
        description: "Upgrade to premium for unlimited swipes!",
        variant: "destructive",
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
      await supabase
        .from('profiles')
        .update({ daily_swipes: (currentProfile.daily_swipes || 0) + 1 })
        .eq('user_id', user.id);
    }
    
    setDailySwipesLeft(prev => prev - 1);

    // Save swipe to database
    await supabase.from('swipes').insert({
      user_id: user.id,
      target_id: currentCard.id,
      target_type: currentCard.type,
      direction,
      is_super_like: isSuperLike,
    });

    if (isSuperLike) {
      toast({
        title: "Super Like Sent! ⭐",
        description: "They'll see you liked them extra!",
      });
    }

    // Check for mutual match if swiping right
    if (direction === "right") {
      // For creators, check if they swiped right on us
      if (currentCard.type === 'creator' && currentCard.user_id) {
        const { data: theirSwipe } = await supabase
          .from('swipes')
          .select('*')
          .eq('user_id', currentCard.user_id)
          .eq('target_id', user.id)
          .eq('direction', 'right')
          .maybeSingle();

        if (theirSwipe) {
          // Mutual match! Create match record
          const { data: matchData } = await supabase
            .from('matches')
            .insert({
              user1_id: user.id,
              user2_id: currentCard.user_id,
              match_type: 'creator',
              status: 'active',
            })
            .select()
            .single();

          if (matchData) {
            // Create connection
            await supabase.from('connections').insert({
              user_id: user.id,
              connected_user_id: currentCard.user_id,
              status: 'accepted',
            });

            // Award XP
            const { data: profile } = await supabase
              .from('profiles')
              .select('xp')
              .eq('user_id', user.id)
              .single();
            
            if (profile) {
              await supabase
                .from('profiles')
                .update({ xp: profile.xp + 20 })
                .eq('user_id', user.id);
              
              await supabase
                .from('xp_activities')
                .insert({
                  user_id: user.id,
                  activity_type: 'creator_connection',
                  xp_earned: 20,
                  description: `Connected with ${currentCard.name}`
                });
            }

            toast({
              title: "It's a Match! 🎉",
              description: `You and ${currentCard.name} connected! +20 XP`,
            });

            // Navigate to My Circle after a brief delay
            setTimeout(() => navigate('/circle'), 2000);
          }
          return;
        }
      }

      // For opportunities, create match and project
      if (currentCard.type === 'opportunity') {
        const { data: matchData } = await supabase
          .from('matches')
          .insert({
            user1_id: user.id,
            user2_id: currentCard.created_by,
            target_id: currentCard.id,
            match_type: 'opportunity',
            status: 'active',
          })
          .select()
          .single();

        if (matchData) {
          // Create ThriveDesk project
          const { data: projectData } = await supabase
            .from('projects')
            .insert({
              match_id: matchData.id,
              title: currentCard.name,
              description: currentCard.description,
              budget: currentCard.compensation,
              status: 'active',
            })
            .select()
            .single();

          // Award XP
          const { data: profile } = await supabase
            .from('profiles')
            .select('xp')
            .eq('user_id', user.id)
            .single();
          
          if (profile) {
            await supabase
              .from('profiles')
              .update({ xp: profile.xp + 50 })
              .eq('user_id', user.id);
            
            await supabase
              .from('xp_activities')
              .insert({
                user_id: user.id,
                activity_type: 'job_match',
                xp_earned: 50,
                description: `Matched with ${currentCard.name}`
              });
          }

          toast({
            title: "Opportunity Matched! 💼",
            description: `Opening ThriveDesk for: ${currentCard.name}`,
          });

          // Navigate to ThriveDesk
          if (projectData) {
            setTimeout(() => navigate(`/desk/${projectData.id}`), 2000);
          }
        }
      } else {
        toast({
          title: "Liked! 💫",
          description: `You liked ${currentCard.name}. Waiting for them to match back!`,
        });
      }
    } else {
      toast({
        title: "Keep swiping",
        description: "Maybe the next one is perfect for you",
      });
    }
    
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
    
    // Reset animation state
    setSwipeDirection(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Apply resistance to movement - only move 40% of actual drag distance
      setDragOffset({
        x: (clientX - centerX) * 0.4,
        y: (clientY - centerY) * 0.2
      });
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Require stronger swipe - need to drag at least 150px (accounting for resistance)
    if (Math.abs(dragOffset.x) > 60) {
      handleSwipe(dragOffset.x > 0 ? "right" : "left");
    } else {
      // Reset position with smooth animation
      setDragOffset({ x: 0, y: 0 });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <Sparkles className="mx-auto mb-4 h-16 w-16 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <Sparkles className="mx-auto mb-4 h-16 w-16 text-primary" />
          <h2 className="mb-2 text-2xl font-bold">No cards available yet</h2>
          <p className="text-muted-foreground">Check back later for new opportunities</p>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header with Tabs and Filters */}
        <div className="mb-4 sm:mb-6">
          <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Discover</h1>
            {subscriptionTier === 'free' && (
              <Badge variant="secondary" className="gap-1 w-fit">
                {dailySwipesLeft} swipes left
              </Badge>
            )}
          </div>

          {/* Search Bar */}
          <div className="mb-3 sm:mb-4">
            <SearchBar
              onSearch={(query, filters) => {
                setSearchQuery(query);
                setSearchFilters(filters);
              }}
              placeholder={
                activeTab === 'creators' 
                  ? 'Search creators by name, role, location...'
                  : activeTab === 'opportunities'
                  ? 'Search opportunities...'
                  : 'Search creators and opportunities...'
              }
              showFilters={subscriptionTier !== 'free'}
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-3 sm:mb-4">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
              <TabsTrigger value="creators" className="text-xs sm:text-sm">Creators</TabsTrigger>
              <TabsTrigger value="opportunities" className="text-xs sm:text-sm">Opportunities</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            
            {/* Show different filters based on active tab */}
            {(activeTab === 'all' || activeTab === 'creators') && (
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40 h-9">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="Creator">Creator</SelectItem>
                  <SelectItem value="Musician">Musician</SelectItem>
                  <SelectItem value="Photographer">Photographer</SelectItem>
                  <SelectItem value="Videographer">Videographer</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {activeTab === 'opportunities' && (
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full sm:w-40 h-9">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            )}

            {subscriptionTier === 'free' && (
              <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span className="hidden sm:inline">More filters with Premium</span>
                <span className="sm:hidden">Premium filters</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Card View */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            {/* Card Counter */}
            <div className="mb-3 sm:mb-4 text-center">
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {cards.length}
              </span>
            </div>

        {/* Swipe Card */}
        <div 
          ref={cardRef}
          className="relative mb-4 sm:mb-6 overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-card shadow-card cursor-grab active:cursor-grabbing select-none"
          style={{
            transform: swipeDirection 
              ? `translateX(${swipeDirection === 'right' ? '150%' : '-150%'}) rotate(${swipeDirection === 'right' ? '20deg' : '-20deg'})`
              : isDragging
              ? `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${dragOffset.x * 0.15}deg)`
              : 'translateX(0) translateY(0) rotate(0deg)',
            opacity: swipeDirection ? 0 : 1,
            transition: isDragging ? 'none' : 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          {/* Swipe Direction Indicators */}
          {isDragging && Math.abs(dragOffset.x) > 30 && (
            <>
              {dragOffset.x > 0 && (
                <div className="absolute top-4 sm:top-8 right-4 sm:right-8 z-10 px-4 sm:px-6 py-2 sm:py-3 bg-accent/90 text-white font-bold text-lg sm:text-xl rounded-lg rotate-12 border-2 sm:border-4 border-white">
                  LIKE
                </div>
              )}
              {dragOffset.x < 0 && (
                <div className="absolute top-4 sm:top-8 left-4 sm:left-8 z-10 px-4 sm:px-6 py-2 sm:py-3 bg-destructive/90 text-white font-bold text-lg sm:text-xl rounded-lg -rotate-12 border-2 sm:border-4 border-white">
                  NOPE
                </div>
              )}
            </>
          )}
          
          {/* Image */}
          <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden">
            <img
              src={currentCard.image}
              alt={currentCard.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            
            {/* Type Badge */}
            <div className="absolute right-3 sm:right-4 top-3 sm:top-4">
              <div className={`rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium ${
                currentCard.type === "creator" 
                  ? "bg-primary/90 text-primary-foreground" 
                  : "bg-secondary/90 text-secondary-foreground"
              }`}>
                {currentCard.type === "creator" ? "Creator" : "Opportunity"}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            <h2 className="mb-1 text-xl sm:text-2xl font-bold">{currentCard.name}</h2>
            <p className="mb-2 sm:mb-3 text-base sm:text-lg text-muted-foreground">{currentCard.title}</p>

            <div className="mb-3 sm:mb-4 flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
              <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-xs sm:text-sm">{currentCard.location}</span>
              </div>
              {currentCard.compensation && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-accent">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">{currentCard.compensation}</span>
                </div>
              )}
            </div>

            <div className="mb-3 sm:mb-4 flex flex-wrap gap-1.5 sm:gap-2">
              {currentCard.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-muted px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{currentCard.description}</p>

            {/* View Profile Button for Creators */}
            {currentCard.type === "creator" && currentCard.user_id && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full h-9"
                  onClick={() => navigate(`/profile/${currentCard.user_id}`, { 
                    state: { cardIndex: currentIndex } 
                  })}
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  View Full Profile
                </Button>
              </div>
            )}

            {/* View Details Button for Opportunities */}
            {currentCard.type === "opportunity" && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                <Link to={`/opportunity/${currentCard.id}`}>
                  <Button variant="outline" size="sm" className="w-full h-9">
                    <Eye className="mr-2 h-4 w-4" />
                    View Full Details
                  </Button>
                </Link>
              </div>
            )}

            {/* Portfolio Preview for Creators */}
            {currentCard.type === "creator" && currentCard.portfolio && currentCard.portfolio.length > 0 && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <Image className="h-4 w-4 text-primary" />
                  <span className="text-xs sm:text-sm font-semibold">Featured Work</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {currentCard.portfolio.slice(0, 3).map((item) => (
                    <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={item.thumbnail_url || item.media_url} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        {item.media_type === 'video' && <Video className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
                        {item.media_type === 'audio' && <Music className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
                        {item.media_type === 'image' && <Image className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Stats for Creators */}
            {currentCard.type === "creator" && currentCard.socialStats && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs sm:text-sm font-semibold">Audience Reach</span>
                  {currentCard.socialStats.verified_metrics && (
                    <CheckCircle2 className="h-4 w-4 text-accent ml-auto" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {currentCard.socialStats.instagram_followers && (
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="text-base sm:text-lg font-bold text-primary">
                        {currentCard.socialStats.instagram_followers >= 1000000 
                          ? `${(currentCard.socialStats.instagram_followers / 1000000).toFixed(1)}M`
                          : currentCard.socialStats.instagram_followers >= 1000 
                          ? `${(currentCard.socialStats.instagram_followers / 1000).toFixed(1)}K`
                          : currentCard.socialStats.instagram_followers}
                      </div>
                      <div className="text-xs text-muted-foreground">Instagram</div>
                    </div>
                  )}
                  {currentCard.socialStats.youtube_subscribers && (
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="text-base sm:text-lg font-bold text-primary">
                        {currentCard.socialStats.youtube_subscribers >= 1000000 
                          ? `${(currentCard.socialStats.youtube_subscribers / 1000000).toFixed(1)}M`
                          : currentCard.socialStats.youtube_subscribers >= 1000 
                          ? `${(currentCard.socialStats.youtube_subscribers / 1000).toFixed(1)}K`
                          : currentCard.socialStats.youtube_subscribers}
                      </div>
                      <div className="text-xs text-muted-foreground">YouTube</div>
                    </div>
                  )}
                  {currentCard.socialStats.tiktok_followers && (
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="text-base sm:text-lg font-bold text-primary">
                        {currentCard.socialStats.tiktok_followers >= 1000000 
                          ? `${(currentCard.socialStats.tiktok_followers / 1000000).toFixed(1)}M`
                          : currentCard.socialStats.tiktok_followers >= 1000 
                          ? `${(currentCard.socialStats.tiktok_followers / 1000).toFixed(1)}K`
                          : currentCard.socialStats.tiktok_followers}
                      </div>
                      <div className="text-xs text-muted-foreground">TikTok</div>
                    </div>
                  )}
                  {currentCard.socialStats.spotify_listeners && (
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="text-base sm:text-lg font-bold text-primary">
                        {currentCard.socialStats.spotify_listeners >= 1000000 
                          ? `${(currentCard.socialStats.spotify_listeners / 1000000).toFixed(1)}M`
                          : currentCard.socialStats.spotify_listeners >= 1000 
                          ? `${(currentCard.socialStats.spotify_listeners / 1000).toFixed(1)}K`
                          : currentCard.socialStats.spotify_listeners}
                      </div>
                      <div className="text-xs text-muted-foreground">Spotify</div>
                    </div>
                  )}
                </div>
                {currentCard.socialStats.total_engagement_rate && (
                  <div className="mt-2 sm:mt-3 p-2 rounded-lg bg-accent/10 flex items-center justify-center gap-2">
                    <Eye className="h-4 w-4 text-accent" />
                    <span className="text-xs sm:text-sm">
                      <span className="font-bold text-accent">{currentCard.socialStats.total_engagement_rate}%</span>
                      <span className="text-muted-foreground ml-1">engagement</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-all hover:scale-110 active:scale-95"
            onClick={() => handleSwipe("left")}
            disabled={isDragging}
          >
            <X className="h-7 w-7 sm:h-8 sm:w-8" />
          </Button>
          
          <Button
            variant="gradient"
            size="icon"
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95"
            onClick={() => handleSwipe("right")}
            disabled={isDragging}
            title="Like"
          >
            <Flame className="h-8 w-8 sm:h-10 sm:w-10" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 hover:border-accent hover:bg-accent/10 hover:text-accent transition-all hover:scale-110 active:scale-95"
            onClick={() => handleSwipe("right", true)}
            title="Super Like"
            disabled={isDragging}
          >
            <Star className="h-7 w-7 sm:h-8 sm:w-8" />
          </Button>
        </div>

            {/* Swipe Hint */}
            <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-muted-foreground">
              <p>🔥 Like • ⭐ Super Like • ❌ Pass</p>
              <p className="mt-1 text-xs">Drag cards or use buttons</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Discover;
