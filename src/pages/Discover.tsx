import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Flame, Star, MapPin, DollarSign, Sparkles, Users, Eye, CheckCircle2, Image, Video, Music, UserCircle, Coins, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { CreatorFilters, type CreatorFilterState } from "@/components/discover/CreatorFilters";
import { OpportunityFiltersComponent, type OpportunityFilterState } from "@/components/discover/OpportunityFiltersComponent";
import { CreditPromptDialog } from "@/components/discover/CreditPromptDialog";
import { QuickCreateOpportunityDialog } from "@/components/discover/QuickCreateOpportunityDialog";
import { checkProfileCompletion } from "@/lib/profileCompletion";

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
  const [activeTab, setActiveTab] = useState<"creators" | "opportunities">("creators");
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
  const [userLevel, setUserLevel] = useState<number>(1);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [dailySwipesLeft, setDailySwipesLeft] = useState<number>(20);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [profileCompletionPercent, setProfileCompletionPercent] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [creatorFilters, setCreatorFilters] = useState<CreatorFilterState>({
    role: 'all',
    location: 'all',
    minFollowers: 0,
    verified: false,
    level: 'all',
    badge: 'all'
  });

  const [opportunityFilters, setOpportunityFilters] = useState<OpportunityFilterState>({
    type: 'all',
    location: 'all',
    compensation: 'all',
    remote: false,
    skills: [],
    urgent: false
  });

  useEffect(() => {
    const state = location.state as { cardIndex?: number };
    if (state?.cardIndex !== undefined) {
      setCurrentIndex(state.cardIndex);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // Check profile completion
      if (userProfile) {
        const { data: portfolioItems } = await supabase
          .from('portfolio_items')
          .select('id')
          .eq('user_id', user.id);
        
        const completionStatus = checkProfileCompletion(userProfile, portfolioItems?.length || 0);
        setProfileIncomplete(!completionStatus.isComplete);
        setProfileCompletionPercent(completionStatus.completionPercentage);
      }
      
      if (userProfile) {
        setSubscriptionTier(userProfile.subscription_tier || 'free');
        setUserLevel(userProfile.level || 1);
        const maxSwipes = userProfile.subscription_tier === 'free' ? 20 : 999;
        setDailySwipesLeft(maxSwipes - (userProfile.daily_swipes || 0));
      }

      const { data: wallet } = await supabase
        .from('wallets')
        .select('credits')
        .eq('user_id', user.id)
        .single();
      
      if (wallet) {
        setUserCredits(wallet.credits || 0);
      }

      if (activeTab === 'creators') {
        let profilesQuery = supabase
          .from('public_profiles')
          .select('*')
          .neq('user_id', user.id)
          .not('full_name', 'is', null)
          .not('bio', 'is', null)
          .not('avatar_url', 'is', null)
          .not('location', 'is', null);

        if (creatorFilters.role !== 'all') {
          profilesQuery = profilesQuery.eq('role', creatorFilters.role);
        }
        if (creatorFilters.location !== 'all') {
          profilesQuery = profilesQuery.ilike('location', `%${creatorFilters.location}%`);
        }
        
        const { data: profiles } = await profilesQuery.limit(50);

        // Further filter out profiles with incomplete data
        const completeProfiles = (profiles || []).filter(profile => {
          return profile.full_name !== 'New User' && 
                 profile.role !== 'Creator' && 
                 profile.bio && profile.bio.length > 20;
        });

        const profileIds = completeProfiles.map(p => p.user_id);
        const { data: portfolioItems } = await supabase
          .from('portfolio_items')
          .select('*')
          .in('user_id', profileIds)
          .eq('featured', true)
          .limit(3);

        const creatorCards: Card[] = completeProfiles.map(profile => {
          const userPortfolio = (portfolioItems || []).filter(item => item.user_id === profile.user_id);
          return {
            id: profile.id,
            type: 'creator' as CardType,
            name: profile.full_name,
            title: profile.role,
            location: profile.location || 'Remote',
            image: profile.avatar_url || `https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop`,
            tags: ['Creator'],
            description: profile.bio || 'Creative professional',
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

        setCards(creatorCards);
      } else {
        let opportunitiesQuery = supabase
          .from('opportunities')
          .select('*')
          .eq('status', 'active')
          .neq('created_by', user.id);

        if (opportunityFilters.type !== 'all') {
          opportunitiesQuery = opportunitiesQuery.eq('type', opportunityFilters.type);
        }

        const { data: opportunities } = await opportunitiesQuery.limit(50);

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

        setCards(opportunityCards);
      }

      setLoading(false);
    };

    fetchData();
  }, [activeTab, creatorFilters, opportunityFilters]);

  const handleSwipe = async (direction: "left" | "right", isSuperLike: boolean = false) => {
    const currentCard = cards[currentIndex];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSwipeDirection(direction);
    await new Promise(resolve => setTimeout(resolve, 300));

    if (dailySwipesLeft <= 0) {
      if (userCredits > 0 && subscriptionTier === 'free') {
        await supabase.from('wallets').update({ credits: userCredits - 1 }).eq('user_id', user.id);
        setUserCredits(userCredits - 1);
        toast({ title: "Credit used", description: `${userCredits - 1} credits remaining` });
      } else {
        setSwipeDirection(null);
        setShowCreditPrompt(true);
        return;
      }
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('daily_swipes')
      .eq('user_id', user.id)
      .single();
    
    if (currentProfile) {
      await supabase.from('profiles').update({ daily_swipes: (currentProfile.daily_swipes || 0) + 1 }).eq('user_id', user.id);
    }
    
    setDailySwipesLeft(prev => prev - 1);

    await supabase.from('swipes').insert({
      user_id: user.id,
      target_id: currentCard.id,
      target_type: currentCard.type,
      direction,
      is_super_like: isSuperLike,
    });

    if (direction === "right") {
      if (currentCard.type === 'creator' && currentCard.user_id) {
        const { data: theirSwipe } = await supabase
          .from('swipes')
          .select('*')
          .eq('user_id', currentCard.user_id)
          .eq('target_id', user.id)
          .eq('direction', 'right')
          .maybeSingle();

        if (theirSwipe) {
          await supabase.from('matches').insert({
            user1_id: user.id,
            user2_id: currentCard.user_id,
            match_type: 'creator',
            status: 'active',
          });

          toast({ title: "It's a Match! 🎉", description: `You and ${currentCard.name} connected!` });
          setTimeout(() => navigate('/circle'), 2000);
          return;
        }
      }

      toast({ title: "Liked! 💫", description: `You liked ${currentCard.name}` });
    }
    
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    
    setSwipeDirection(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleDragStart = () => setIsDragging(true);
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      setDragOffset({ x: (clientX - centerX) * 0.15, y: 0 });
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragOffset.x) > 100) {
      handleSwipe(dragOffset.x > 0 ? "right" : "left");
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 pb-20">
        <div className="text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 sm:h-16 sm:w-16 animate-pulse text-primary" />
          <p className="text-sm sm:text-base text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const currentCard = cards.length > 0 ? cards[currentIndex] : null;

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 pb-24 sm:pb-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 sm:mb-6">
          <div className="mb-3 sm:mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold">Discover</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <QuickCreateOpportunityDialog />
              <Badge variant="secondary" className="gap-1 text-xs">
                <Coins className="h-3 w-3" />
                <span className="hidden xs:inline">{dailySwipesLeft} swipes • {userCredits} credits</span>
                <span className="xs:hidden">{dailySwipesLeft}/{userCredits}</span>
              </Badge>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-3 sm:mb-4">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="creators" className="text-sm sm:text-base">Creators</TabsTrigger>
              <TabsTrigger value="opportunities" className="text-sm sm:text-base">Opportunities</TabsTrigger>
            </TabsList>
          </Tabs>

          {profileIncomplete && (
            <Alert className="border-accent bg-accent/10">
              <AlertCircle className="h-4 w-4 text-accent" />
              <AlertDescription className="text-sm">
                <span className="font-semibold">Complete your profile to be discovered!</span>
                <br />
                Your profile is {profileCompletionPercent}% complete. Add bio, skills, portfolio & more to appear in others' discovery feed.
                <Button 
                  variant="link" 
                  className="h-auto p-0 ml-1 text-accent font-semibold"
                  onClick={() => navigate('/profile')}
                >
                  Complete Profile →
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid lg:grid-cols-[250px_1fr] gap-4 sm:gap-6">
          <div className="hidden lg:block">
            {activeTab === 'creators' ? (
              <CreatorFilters 
                filters={creatorFilters}
                onFilterChange={setCreatorFilters}
                isPremium={subscriptionTier !== 'free'}
                userLevel={userLevel}
              />
            ) : (
              <OpportunityFiltersComponent
                filters={opportunityFilters}
                onFilterChange={setOpportunityFilters}
                isPremium={subscriptionTier !== 'free'}
                userLevel={userLevel}
              />
            )}
          </div>

          <div className="max-w-md mx-auto w-full">
            <div className="lg:hidden mb-3">
              {activeTab === 'creators' ? (
                <CreatorFilters 
                  filters={creatorFilters}
                  onFilterChange={setCreatorFilters}
                  isPremium={subscriptionTier !== 'free'}
                  userLevel={userLevel}
                />
              ) : (
                <OpportunityFiltersComponent
                  filters={opportunityFilters}
                  onFilterChange={setOpportunityFilters}
                  isPremium={subscriptionTier !== 'free'}
                  userLevel={userLevel}
                />
              )}
            </div>

            {cards.length > 0 && (
              <div className="mb-3 sm:mb-4 text-center text-xs sm:text-sm text-muted-foreground">
                {currentIndex + 1} / {cards.length}
              </div>
            )}

            {cards.length === 0 ? (
              <div className="relative mb-4 sm:mb-6 overflow-hidden rounded-2xl sm:rounded-3xl border bg-card shadow-lg">
                <div className="relative h-72 sm:h-80 md:h-96 flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
                  <div className="text-center p-6">
                    <Sparkles className="mx-auto mb-4 h-12 w-12 sm:h-16 sm:w-16 text-primary animate-pulse" />
                    {activeTab === 'creators' ? (
                      <>
                        <h2 className="mb-2 text-xl sm:text-2xl font-bold">No more creators right now</h2>
                        <p className="text-sm sm:text-base text-muted-foreground mb-4">
                          Check back soon for new creative professionals
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => window.location.reload()}
                          className="mt-2"
                        >
                          Refresh
                        </Button>
                      </>
                    ) : (
                      <>
                        <h2 className="mb-2 text-xl sm:text-2xl font-bold">No opportunities available</h2>
                        <p className="text-sm sm:text-base text-muted-foreground mb-4">
                          Be the first to create an opportunity
                        </p>
                        <QuickCreateOpportunityDialog />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
              ref={cardRef}
              className="relative mb-4 sm:mb-6 overflow-hidden rounded-2xl sm:rounded-3xl border bg-card shadow-lg cursor-grab active:cursor-grabbing select-none"
              style={{
                transform: swipeDirection 
                  ? `translateX(${swipeDirection === 'right' ? '150%' : '-150%'}) rotate(${swipeDirection === 'right' ? '20deg' : '-20deg'})`
                  : isDragging ? `translateX(${dragOffset.x}px) rotate(${dragOffset.x * 0.15}deg)` : 'none',
                opacity: swipeDirection ? 0 : 1,
                transition: isDragging ? 'none' : 'all 0.5s ease'
              }}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
            >
              {isDragging && Math.abs(dragOffset.x) > 30 && (
                <>
                  {dragOffset.x > 0 && (
                    <div className="absolute top-4 sm:top-8 right-4 sm:right-8 z-10 px-3 sm:px-6 py-2 sm:py-3 bg-accent/90 text-white font-bold text-base sm:text-xl rounded-lg rotate-12 border-2 sm:border-4 border-white">
                      LIKE
                    </div>
                  )}
                  {dragOffset.x < 0 && (
                    <div className="absolute top-4 sm:top-8 left-4 sm:left-8 z-10 px-3 sm:px-6 py-2 sm:py-3 bg-destructive/90 text-white font-bold text-base sm:text-xl rounded-lg -rotate-12 border-2 sm:border-4 border-white">
                      NOPE
                    </div>
                  )}
                </>
              )}

              <div className="relative h-72 sm:h-80 md:h-96">
                <img src={currentCard.image} alt={currentCard.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                
                <div className="absolute right-3 sm:right-4 top-3 sm:top-4">
                  <div className={`rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium ${
                    currentCard.type === "creator" 
                      ? "bg-primary/90 text-primary-foreground" 
                      : "bg-secondary/90 text-secondary-foreground"
                  }`}>
                    {currentCard.type === "creator" ? "Creator" : "Opportunity"}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <h2 className="mb-1 text-xl sm:text-2xl font-bold">{currentCard.name}</h2>
                <p className="mb-2 sm:mb-3 text-base sm:text-lg text-muted-foreground">{currentCard.title}</p>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{currentCard.location}</span>
                  </div>
                  {currentCard.compensation && (
                    <div className="flex items-center gap-1 text-accent">
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{currentCard.compensation}</span>
                    </div>
                  )}
                </div>
                
                {currentCard.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {currentCard.tags.map((tag) => (
                      <span key={tag} className="rounded-full border bg-muted px-2 py-0.5 text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{currentCard.description}</p>

                {currentCard.type === "creator" && currentCard.user_id && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full text-xs sm:text-sm h-8 sm:h-9"
                      onClick={() => navigate(`/profile/${currentCard.user_id}`, { 
                        state: { cardIndex: currentIndex } 
                      })}
                    >
                      <UserCircle className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      View Full Profile
                    </Button>
                  </div>
                )}
              </div>
            </div>
            )}

            {cards.length > 0 && (
              <>
                <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-all hover:scale-110 active:scale-95" 
                onClick={() => handleSwipe("left")}
                disabled={isDragging}
              >
                <X className="h-6 w-6 sm:h-8 sm:w-8" />
              </Button>
              <Button 
                variant="default" 
                size="icon" 
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95" 
                onClick={() => handleSwipe("right")}
                disabled={isDragging}
              >
                <Flame className="h-8 w-8 sm:h-10 sm:w-10" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 hover:border-accent hover:bg-accent/10 hover:text-accent transition-all hover:scale-110 active:scale-95" 
                onClick={() => handleSwipe("right", true)}
                disabled={isDragging}
              >
                <Star className="h-6 w-6 sm:h-8 sm:w-8" />
              </Button>
            </div>

            <div className="text-center text-xs sm:text-sm text-muted-foreground">
              <p>🔥 Like • ⭐ Super Like • ❌ Pass</p>
              <p className="mt-1 text-xs">Drag or tap buttons</p>
            </div>
              </>
            )}
          </div>
        </div>
      </div>

      <CreditPromptDialog open={showCreditPrompt} onOpenChange={setShowCreditPrompt} />
    </div>
  );
};

export default Discover;
