import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Flame, Star, MapPin, DollarSign, Sparkles, Users, Eye, CheckCircle2, Image, Video, Music, UserCircle, Coins, AlertCircle, Crown, Zap, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { CreatorFilters, type CreatorFilterState } from "@/components/discover/CreatorFilters";
import { OpportunityFiltersComponent, type OpportunityFilterState } from "@/components/discover/OpportunityFiltersComponent";
import { CreditPromptDialog } from "@/components/discover/CreditPromptDialog";
import { QuickCreateOpportunityDialog } from "@/components/discover/QuickCreateOpportunityDialog";
import { MatchExplanationDialog } from "@/components/discover/MatchExplanationDialog";
import { UndoSwipeButton } from "@/components/discover/UndoSwipeButton";
import { useUndoSwipe } from "@/hooks/useUndoSwipe";
import { scoreProfilesWithAI } from "@/components/discover/AIMatchScoring";
import { checkProfileCompletion } from "@/lib/profileCompletion";
import { getRemainingSwipes, TIER_LIMITS, type SubscriptionTier } from "@/lib/subscriptionLimits";

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
  ai_match_score?: number;
  match_reasons?: string[];
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
  const [showMatchExplanation, setShowMatchExplanation] = useState(false);
  const [aiScoringEnabled, setAiScoringEnabled] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { undosRemaining, trackSwipe, undoLastSwipe, checkUndosRemaining } = useUndoSwipe(subscriptionTier);

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
      console.log('[Discover] Starting to fetch data...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[Discover] No authenticated user');
        return;
      }
      console.log('[Discover] User authenticated:', user.id);

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
        const tier = (userProfile.subscription_tier || 'free') as SubscriptionTier;
        setSubscriptionTier(tier);
        setUserLevel(userProfile.level || 1);
        const remaining = getRemainingSwipes(tier, userProfile.daily_swipes || 0);
        setDailySwipesLeft(remaining === -1 ? 999 : remaining);
      }

      const { data: wallet } = await supabase
        .from('wallets')
        .select('credits')
        .eq('user_id', user.id)
        .single();
      
      if (wallet) {
        setUserCredits(wallet.credits || 0);
      }

      // Fetch user's previous swipes to filter them out
      const { data: userSwipes } = await supabase
        .from('swipes')
        .select('target_id, target_type')
        .eq('user_id', user.id);

      const swipedIds = new Set(userSwipes?.map(s => s.target_id) || []);

      if (activeTab === 'creators') {
        console.log('[Discover] Fetching creator profiles...');
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
        
        const { data: profiles, error: profilesError } = await profilesQuery.limit(50);
        
        if (profilesError) {
          console.error('[Discover] Error fetching profiles:', profilesError);
          console.error('[Discover] Error details:', JSON.stringify(profilesError, null, 2));
        }
        
        console.log('[Discover] Fetched profiles:', profiles?.length || 0);

        // Filter out already swiped profiles - only require basics (name, role, avatar, bio exists)
        const completeProfiles = (profiles || []).filter(profile => {
          return !swipedIds.has(profile.id) &&
                 profile.full_name && 
                 profile.full_name !== 'New User' && 
                 profile.role && 
                 profile.role !== 'Creator' && 
                 profile.avatar_url &&
                 profile.bio; // Just needs to exist, no length requirement
        });

        const profileIds = completeProfiles.map(p => p.user_id);
        const { data: portfolioItems } = await supabase
          .from('portfolio_items')
          .select('*')
          .in('user_id', profileIds)
          .eq('featured', true)
          .limit(3);

        let creatorCards: Card[] = completeProfiles.map(profile => {
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

        // Apply AI scoring if enabled
        if (aiScoringEnabled && userProfile) {
          console.log('[Discover] Applying AI match scoring...');
          try {
            const scoredProfiles = await scoreProfilesWithAI(
              userProfile,
              completeProfiles.map(p => ({
                user_id: p.user_id || '',
                full_name: p.full_name || '',
                role: p.role || '',
                bio: p.bio,
                professional_skills: [],
                passion_skills: [],
                location: p.location
              }))
            );

            creatorCards = creatorCards.map((card, index) => ({
              ...card,
              ai_match_score: scoredProfiles[index]?.ai_match_score,
              match_reasons: scoredProfiles[index]?.match_reasons
            }));

            // Sort by AI match score (highest first)
            creatorCards.sort((a, b) => (b.ai_match_score || 0) - (a.ai_match_score || 0));
          } catch (error) {
            console.error('[Discover] AI scoring failed, continuing without scores:', error);
          }
        }

        console.log('[Discover] Created creator cards:', creatorCards.length);
        setCards(creatorCards);
      } else {
        console.log('[Discover] Fetching opportunities...');
        let opportunitiesQuery = supabase
          .from('opportunities')
          .select('*')
          .eq('status', 'active')
          .neq('created_by', user.id);

        if (opportunityFilters.type !== 'all') {
          opportunitiesQuery = opportunitiesQuery.eq('type', opportunityFilters.type);
        }

        const { data: opportunities, error: opportunitiesError } = await opportunitiesQuery.limit(50);
        
        if (opportunitiesError) {
          console.error('[Discover] Error fetching opportunities:', opportunitiesError);
          console.error('[Discover] Error details:', JSON.stringify(opportunitiesError, null, 2));
        }
        
        console.log('[Discover] Fetched opportunities:', opportunities?.length || 0);

        // Filter out already swiped opportunities
        const unswipedOpportunities = (opportunities || []).filter(opp => !swipedIds.has(opp.id));

        const opportunityCards: Card[] = unswipedOpportunities.map(opp => ({
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
      setSwipeDirection(null);
      setShowCreditPrompt(true);
      return;
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

    const { data: swipeData } = await supabase.from('swipes').insert({
      user_id: user.id,
      target_id: currentCard.id,
      target_type: currentCard.type,
      direction,
      is_super_like: isSuperLike,
    }).select().single();

    // Track swipe for undo functionality
    if (swipeData) {
      trackSwipe(swipeData as any);
    }

    if (direction === "right") {
      if (currentCard.type === 'creator' && currentCard.user_id) {
        const { data: theirSwipe } = await supabase
          .from('swipes')
          .select('*')
          .eq('user_id', currentCard.user_id)
          .eq('target_id', user.id)
          .eq('direction', 'right')
          .maybeSingle();

        // Get current user's profile for notifications
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role')
          .eq('user_id', user.id)
          .single();

        if (theirSwipe) {
          // It's a match! Create match and notify both users
          await supabase.from('matches').insert({
            user1_id: user.id,
            user2_id: currentCard.user_id,
            match_type: 'creator',
            status: 'active',
          });

          // Notify both users about the match
          await supabase.from('notifications').insert([
            {
              user_id: currentCard.user_id,
              title: "⚡ Connection Made!",
              message: `You and ${senderProfile?.full_name || 'someone'} are now connected!`,
              type: 'match',
              category: 'collaboration',
              priority: 'high',
              link: '/circle',
              action_url: '/circle',
              action_text: 'View Connection',
              image_url: senderProfile?.avatar_url,
            },
            {
              user_id: user.id,
              title: "⚡ Connection Made!",
              message: `You and ${currentCard.name} are now connected!`,
              type: 'match',
              category: 'collaboration',
              priority: 'high',
              link: '/circle',
              action_url: '/circle',
              action_text: 'View Connection',
              image_url: currentCard.image,
            }
          ]);

          toast({ title: "⚡ Connection Made!", description: `You and ${currentCard.name} are now connected!` });
          setTimeout(() => navigate('/circle'), 2000);
          return;
        } else {
          // No match yet, but notify the other person you're interested
          await supabase.from('notifications').insert({
            user_id: currentCard.user_id,
            title: "💫 Someone's Interested!",
            message: `${senderProfile?.full_name || 'A creator'} (${senderProfile?.role || 'Professional'}) wants to connect with you`,
            type: 'interest',
            category: 'collaboration',
            priority: 'high',
            link: '/discover',
            action_url: '/discover',
            action_text: 'Check Them Out',
            image_url: senderProfile?.avatar_url,
          });
        }
      }

      toast({ title: "Interest Sent! 💫", description: `${currentCard.name} will be notified` });
    }
    
    // Remove the swiped card from the array
    const updatedCards = cards.filter((_, index) => index !== currentIndex);
    setCards(updatedCards);
    
    // Keep the same index (which now shows the next card)
    // If we're at the end, stay at the current index
    if (currentIndex >= updatedCards.length && updatedCards.length > 0) {
      setCurrentIndex(updatedCards.length - 1);
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
              {subscriptionTier === 'free' ? (
                <Badge 
                  variant={dailySwipesLeft <= 3 ? "destructive" : "secondary"} 
                  className="gap-1 text-xs cursor-pointer"
                  onClick={() => dailySwipesLeft <= 3 && navigate('/subscription')}
                >
                  <Zap className="h-3 w-3" />
                  <span className="hidden xs:inline">{dailySwipesLeft}/10 swipes today</span>
                  <span className="xs:hidden">{dailySwipesLeft}/10</span>
                  {dailySwipesLeft <= 3 && <span className="hidden sm:inline">• Upgrade for unlimited</span>}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Sparkles className="h-3 w-3" />
                  <span className="hidden xs:inline">Unlimited swipes</span>
                  <span className="xs:hidden">∞</span>
                </Badge>
              )}
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
                
                <div className="absolute right-3 sm:right-4 top-3 sm:top-4 flex flex-col gap-2 items-end">
                  <div className={`rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium ${
                    currentCard.type === "creator" 
                      ? "bg-primary/90 text-primary-foreground" 
                      : "bg-secondary/90 text-secondary-foreground"
                  }`}>
                    {currentCard.type === "creator" ? "Creator" : "Opportunity"}
                  </div>
                  
                  {currentCard.type === 'creator' && currentCard.ai_match_score && currentCard.ai_match_score >= 60 && (
                    <div className="bg-gradient-to-r from-primary to-accent text-white rounded-full px-3 py-1 text-xs sm:text-sm font-bold flex items-center gap-1 shadow-lg">
                      <Sparkles className="h-3 w-3" />
                      {currentCard.ai_match_score}% Match
                    </div>
                  )}
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
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <UndoSwipeButton
                onClick={async () => {
                  const undoneSwipe = await undoLastSwipe();
                  if (undoneSwipe) {
                    setDailySwipesLeft(prev => prev + 1);
                    await checkUndosRemaining();
                  }
                }}
                disabled={isDragging}
                userTier={subscriptionTier}
                undosRemaining={undosRemaining}
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-all hover:scale-110 active:scale-95" 
                onClick={() => handleSwipe("left")}
                disabled={isDragging}
              >
                <X className="h-6 w-6 sm:h-8 sm:w-8" />
              </Button>
              {currentCard?.type === 'creator' && currentCard.ai_match_score && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={() => setShowMatchExplanation(true)}
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>
              )}
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
              <p className="mt-1 text-xs">Drag or tap buttons • {subscriptionTier !== 'free' && '↩️ Undo'}</p>
            </div>
              </>
            )}
          </div>
        </div>
      </div>

      <CreditPromptDialog open={showCreditPrompt} onOpenChange={setShowCreditPrompt} />
      
      {currentCard && currentCard.type === 'creator' && (
        <MatchExplanationDialog
          open={showMatchExplanation}
          onOpenChange={setShowMatchExplanation}
          match={currentCard}
          onConnect={() => handleSwipe("right")}
          onPass={() => handleSwipe("left")}
        />
      )}
    </div>
  );
};

export default Discover;
