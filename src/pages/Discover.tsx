import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { X, Sparkles, MapPin, DollarSign, CheckCircle2, Zap, Briefcase, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { OpportunityFiltersComponent, type OpportunityFilterState } from "@/components/discover/OpportunityFiltersComponent";
import { CreditPromptDialog } from "@/components/discover/CreditPromptDialog";
import { UndoSwipeButton } from "@/components/discover/UndoSwipeButton";
import { useUndoSwipe } from "@/hooks/useUndoSwipe";
import { useSwipeGestures } from "@/hooks/useSwipeGestures";
import { getRemainingSwipes, type SubscriptionTier } from "@/lib/subscriptionLimits";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { SEO } from "@/components/SEO";

interface Card {
  id: string;
  name: string;
  title: string;
  location: string;
  image: string;
  tags: string[];
  compensation?: string;
  description: string;
  created_by?: string;
  created_at?: string;
}

const Discover = () => {
  const { subscriptionInfo } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dailySwipesLeft, setDailySwipesLeft] = useState<number>(20);
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState({ name: "", description: "" });
  
  const subscriptionTier = subscriptionInfo.tier as SubscriptionTier;
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { undosRemaining, trackSwipe, undoLastSwipe, checkUndosRemaining } = useUndoSwipe(subscriptionTier);

  const swipeGestures = useSwipeGestures({
    onSwipeLeft: () => handleSwipe("left"),
    onSwipeRight: () => handleSwipe("right")
  });

  const [opportunityFilters, setOpportunityFilters] = useState<OpportunityFilterState>({
    search: '',
    type: 'all',
    location: 'all',
    compensation: 'all',
    remote: false,
    skills: [],
    urgent: false,
    sortBy: 'newest'
  });

  useEffect(() => {
    const state = location.state as { cardIndex?: number };
    if (state?.cardIndex !== undefined) {
      setCurrentIndex(state.cardIndex);
    }
    
    // Track page view
    const trackPageView = async () => {
      const { analytics } = await import("@/lib/analytics");
      analytics.pageView("discover");
    };
    trackPageView();
  }, [location.state]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const fetchData = async () => {
      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.error('[Discover] Query timeout after 10 seconds');
          setLoading(false);
          toast({
            title: "Loading timeout",
            description: "Please refresh the page",
            variant: "destructive"
          });
        }
      }, 10000);

      try {
        console.log('[Discover] Starting to fetch data...');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!isMounted) {
          clearTimeout(timeoutId);
          return;
        }
        if (!user) {
          console.error('[Discover] No authenticated user');
          clearTimeout(timeoutId);
          setLoading(false);
          return;
        }
      
        setLoading(true);
        console.log('[Discover] User authenticated:', user.id);

        const [
          profileResult,
          swipesResult
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('swipes').select('target_id, target_type').eq('user_id', user.id)
        ]);
      
        if (!isMounted) return;
      
        const userProfile = profileResult.data;
      
        if (userProfile) {
          const remaining = getRemainingSwipes(subscriptionTier, userProfile.daily_swipes || 0);
          setDailySwipesLeft(remaining === -1 ? 999 : remaining);
        }

        const swipedIds = new Set(swipesResult.data?.map(s => s.target_id) || []);

        console.log('[Discover] Fetching opportunities...');
        let opportunitiesQuery = supabase
          .from('opportunities')
          .select('*')
          .eq('status', 'active')
          .neq('created_by', user.id);

        // Apply type filter
        if (opportunityFilters.type !== 'all') {
          opportunitiesQuery = opportunitiesQuery.eq('type', opportunityFilters.type);
        }

        // Apply location filter
        if (opportunityFilters.location !== 'all') {
          if (opportunityFilters.location === 'remote') {
            opportunitiesQuery = opportunitiesQuery.or('location.ilike.%remote%,location.is.null');
          } else {
            opportunitiesQuery = opportunitiesQuery.ilike('location', `%${opportunityFilters.location}%`);
          }
        }

        // Apply remote filter
        if (opportunityFilters.remote) {
          opportunitiesQuery = opportunitiesQuery.or('location.ilike.%remote%,location.is.null');
        }

        // Apply compensation filter
        if (opportunityFilters.compensation !== 'all') {
          opportunitiesQuery = opportunitiesQuery.ilike('compensation', `%${opportunityFilters.compensation}%`);
        }

        const { data: opportunities, error: opportunitiesError } = await opportunitiesQuery.limit(30);
        
        if (opportunitiesError) {
          console.error('[Discover] Error fetching opportunities:', opportunitiesError);
        }
        
        console.log('[Discover] Fetched opportunities:', opportunities?.length || 0);

        // Filter out already swiped opportunities
        let filteredOpportunities = (opportunities || []).filter(opp => !swipedIds.has(opp.id));

        // Apply client-side search filter
        if (opportunityFilters.search) {
          const searchLower = opportunityFilters.search.toLowerCase();
          filteredOpportunities = filteredOpportunities.filter(opp => 
            opp.title.toLowerCase().includes(searchLower) ||
            opp.description.toLowerCase().includes(searchLower) ||
            opp.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
          );
        }

        // Apply client-side skills filter
        if (opportunityFilters.skills.length > 0) {
          filteredOpportunities = filteredOpportunities.filter(opp =>
            opportunityFilters.skills.some(skill =>
              opp.skills?.some((oppSkill: string) => 
                oppSkill.toLowerCase().includes(skill.toLowerCase())
              )
            )
          );
        }

        // Apply urgent filter
        if (opportunityFilters.urgent) {
          filteredOpportunities = filteredOpportunities.filter(opp =>
            opp.tags?.some((tag: string) => tag.toLowerCase().includes('urgent'))
          );
        }

        const opportunityCards: Card[] = filteredOpportunities.map(opp => ({
          id: opp.id,
          name: opp.title,
          title: opp.type.charAt(0).toUpperCase() + opp.type.slice(1),
          location: opp.location || 'Remote',
          image: opp.image_url || `https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=500&fit=crop`,
          tags: opp.tags || [],
          compensation: opp.compensation,
          description: opp.description,
          created_by: opp.created_by,
          created_at: opp.created_at,
        }));

        // Apply sorting
        if (opportunityFilters.sortBy === 'newest') {
          opportunityCards.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        } else if (opportunityFilters.sortBy === 'oldest') {
          opportunityCards.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        } else if (opportunityFilters.sortBy === 'urgent') {
          opportunityCards.sort((a, b) => {
            const aUrgent = a.tags?.some(tag => tag.toLowerCase().includes('urgent')) ? 1 : 0;
            const bUrgent = b.tags?.some(tag => tag.toLowerCase().includes('urgent')) ? 1 : 0;
            return bUrgent - aUrgent;
          });
        }

        console.log('[Discover] Created opportunity cards:', opportunityCards.length);
        setCards(opportunityCards);
      
        if (isMounted) {
          console.log('[Discover] Finished fetching data, setting loading to false');
          clearTimeout(timeoutId);
          setLoading(false);
        }
      } catch (error) {
        console.error('[Discover] Error in fetchData:', error);
        if (isMounted) {
          clearTimeout(timeoutId);
          setLoading(false);
          toast({
            title: "Error loading data",
            description: "Please try refreshing the page",
            variant: "destructive"
          });
        }
      }
    };

    fetchData();
    checkUndosRemaining();
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [opportunityFilters, subscriptionTier]);

  const handleSwipe = async (direction: "left" | "right") => {
    const currentCard = cards[currentIndex];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Track swipe
    const { analytics } = await import("@/lib/analytics");
    analytics.swipe(direction, currentCard.id);

    // Animation
    await swipeGestures.animateSwipe(direction);

    if (dailySwipesLeft <= 0) {
      setUpgradeFeature({
        name: "Unlimited Swipes",
        description: "You've reached your daily swipe limit. Upgrade to Thriver for unlimited daily swipes!"
      });
      setShowUpgradeDialog(true);
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
      target_type: 'opportunity',
      direction,
      is_super_like: false,
    }).select().single();

    if (swipeData) {
      trackSwipe(swipeData as any);
    }

    if (direction === "right") {
      toast({ title: "Interest Sent! 💫", description: `Interested in ${currentCard.name}` });
    }
    
    setCurrentIndex(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 pb-20">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 sm:h-16 sm:w-16 animate-spin text-primary" />
          <p className="text-sm sm:text-base text-muted-foreground">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  const currentCard = currentIndex < cards.length ? cards[currentIndex] : null;
  const nextCard = currentIndex + 1 < cards.length ? cards[currentIndex + 1] : null;
  const hasMoreCards = currentIndex < cards.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24 md:pb-8">
      <SEO 
        title="Discover - Opportunities"
        description="Discover exciting opportunities. Swipe to find your perfect project or gig."
      />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Discover Opportunities</h1>
            </div>
            
            {/* Swipes Badge */}
            {subscriptionTier === 'free' ? (
              <Badge 
                variant={dailySwipesLeft <= 3 ? "destructive" : "secondary"} 
                className="gap-1 text-xs cursor-pointer"
                onClick={() => dailySwipesLeft <= 3 && navigate('/subscription')}
              >
                <Zap className="h-3 w-3" />
                <span>{dailySwipesLeft}/10 swipes</span>
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                <span>Unlimited</span>
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[250px_1fr] gap-6">
            {/* Filters Sidebar */}
            <div className="hidden lg:block">
              <OpportunityFiltersComponent
                filters={opportunityFilters}
                onFilterChange={setOpportunityFilters}
                isPremium={subscriptionTier !== 'free'}
                userLevel={1}
              />
            </div>

            {/* Swipe Cards */}
            <div className="max-w-md mx-auto w-full">
              {/* Mobile Filters */}
              <div className="lg:hidden mb-3">
                <OpportunityFiltersComponent
                  filters={opportunityFilters}
                  onFilterChange={setOpportunityFilters}
                  isPremium={subscriptionTier !== 'free'}
                  userLevel={1}
                />
              </div>

              {hasMoreCards && (
                <div className="mb-3 text-center text-sm text-muted-foreground">
                  {currentIndex + 1} / {cards.length}
                </div>
              )}

              {!hasMoreCards ? (
                <div className="relative mb-6 overflow-hidden rounded-3xl border bg-card shadow-lg">
                  <div className="relative h-96 flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
                    <div className="text-center p-6">
                      <Sparkles className="mx-auto mb-4 h-16 w-16 text-primary animate-pulse" />
                      <h2 className="mb-2 text-2xl font-bold">All Caught Up!</h2>
                      <p className="text-muted-foreground mb-6">
                        {cards.length === 0 
                          ? "No opportunities available right now. Post your own or check back soon!"
                          : "You've seen all opportunities. Ready to start your protected workspace?"}
                      </p>
                      <div className="flex flex-col gap-3 items-center">
                        <Button 
                          onClick={() => navigate('/projects')}
                          className="shadow-glow"
                          size="lg"
                        >
                          <Briefcase className="h-5 w-5 mr-2" />
                          View Your Workspaces
                        </Button>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => window.location.reload()}
                          >
                            Refresh
                          </Button>
                          <Button 
                            onClick={() => navigate('/manage-opportunities')}
                          >
                            Post Opportunity
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative mb-6">
                    {/* Next card (background) */}
                    {nextCard && (
                      <div 
                        className="absolute inset-0 overflow-hidden rounded-3xl border bg-card shadow-lg"
                        style={{
                          transform: 'scale(0.95) translateY(10px)',
                          opacity: 0.5,
                          zIndex: 0,
                        }}
                      >
                        <div className="relative h-96">
                          <img src={nextCard.image} alt={nextCard.name} className="h-full w-full object-cover" />
                        </div>
                      </div>
                    )}

                    {/* Current card */}
                    {currentCard && (
                      <div
                        ref={swipeGestures.cardRef}
                        className="relative overflow-hidden rounded-3xl border bg-card shadow-2xl cursor-grab active:cursor-grabbing select-none"
                        style={{
                          transform: swipeGestures.swipeDirection 
                            ? `translateX(${swipeGestures.swipeDirection === 'right' ? '150%' : '-150%'}) rotate(${swipeGestures.swipeDirection === 'right' ? '30deg' : '-30deg'})`
                            : `translateX(${swipeGestures.dragOffset.x}px) rotate(${swipeGestures.dragOffset.x * 0.1}deg)`,
                          transition: swipeGestures.swipeDirection ? 'transform 0.3s ease-out' : swipeGestures.isDragging ? 'none' : 'transform 0.2s ease-out',
                          zIndex: 1,
                        }}
                        onMouseDown={swipeGestures.handleDragStart}
                        onMouseMove={swipeGestures.handleDragMove}
                        onMouseUp={swipeGestures.handleDragEnd}
                        onMouseLeave={swipeGestures.handleDragEnd}
                        onTouchStart={swipeGestures.handleDragStart}
                        onTouchMove={swipeGestures.handleDragMove}
                        onTouchEnd={swipeGestures.handleDragEnd}
                      >
                        <div className="relative h-96">
                          <img 
                            src={currentCard.image} 
                            alt={currentCard.name} 
                            className="h-full w-full object-cover" 
                            draggable={false}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                          
                          {/* Swipe overlays */}
                          {swipeGestures.swipeDirection === 'right' && (
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                              <div className="bg-green-500 text-white px-8 py-4 rounded-full text-2xl font-bold">
                                INTERESTED
                              </div>
                            </div>
                          )}
                          {swipeGestures.swipeDirection === 'left' && (
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
                                <h2 className="text-2xl font-bold mb-2">{currentCard.name}</h2>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="secondary">{currentCard.title}</Badge>
                                  {currentCard.compensation && (
                                    <Badge variant="outline" className="gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      {currentCard.compensation}
                                    </Badge>
                                  )}
                                </div>
                                {currentCard.location && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    {currentCard.location}
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="text-sm line-clamp-3">{currentCard.description}</p>
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
                      <CheckCircle2 className="h-6 w-6" />
                    </Button>
                  </div>

                  {/* Undo button */}
                  {undosRemaining > 0 && currentIndex > 0 && (
                    <UndoSwipeButton
                      onClick={async () => {
                        const undone = await undoLastSwipe();
                        if (undone) {
                          setCurrentIndex(Math.max(0, currentIndex - 1));
                          swipeGestures.resetSwipe();
                        }
                      }}
                      disabled={swipeGestures.isDragging}
                      userTier={subscriptionTier}
                      undosRemaining={undosRemaining}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreditPromptDialog
        open={showCreditPrompt}
        onOpenChange={setShowCreditPrompt}
      />

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        currentTier={subscriptionTier as SubscriptionTier}
        feature={upgradeFeature.name}
        description={upgradeFeature.description}
      />
    </div>
  );
};

export default Discover;
