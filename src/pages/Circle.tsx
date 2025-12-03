import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartConnectionSuggestions } from "@/components/circle/SmartConnectionSuggestions";
import { ConnectionList } from "@/components/circle/ConnectionList";
import { MatchFeed } from "@/components/circle/MatchFeed";
import { SEO } from "@/components/SEO";
import { Users, Sparkles, Heart, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CreatorFilters, type CreatorFilterState } from "@/components/discover/CreatorFilters";
import { MatchCelebrationDialog } from "@/components/discover/MatchCelebrationDialog";
import { useUndoSwipe } from "@/hooks/useUndoSwipe";
import { useSwipeGestures } from "@/hooks/useSwipeGestures";
import { UndoSwipeButton } from "@/components/discover/UndoSwipeButton";
import { type SubscriptionTier } from "@/lib/subscriptionLimits";
import { useToast } from "@/hooks/use-toast";
import { useCircleData } from "@/hooks/useCircleData";

export default function Circle() {
  const { user, subscriptionInfo } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("match");
  const [showMatchCelebration, setShowMatchCelebration] = useState(false);
  const [matchedUser, setMatchedUser] = useState<{ name: string; avatar: string; role: string; userId: string } | null>(null);
  const [isProcessingSwipe, setIsProcessingSwipe] = useState(false);
  const [creatorFilters, setCreatorFilters] = useState<CreatorFilterState>({
    search: '',
    role: 'all',
    location: 'all',
    minFollowers: 0,
    verified: false,
    level: 'all',
    badge: 'all',
    sortBy: 'recommended',
    activeOnly: false
  });
  
  const { toast: toastHook } = useToast();
  const subscriptionTier = subscriptionInfo.tier as SubscriptionTier;
  const { undosRemaining, trackSwipe, undoLastSwipe, checkUndosRemaining } = useUndoSwipe(subscriptionTier);
  
  const {
    connections,
    matchCards,
    loading,
    matchLoading,
    dailySwipesLeft,
    fetchConnections,
    fetchMatchCreators,
    updateSwipeCount,
    removeCard,
    setDailySwipesLeft
  } = useCircleData(user?.id, subscriptionTier);
  
  const swipeGestures = useSwipeGestures({
    onSwipeLeft: () => !isProcessingSwipe && handleSwipe("left"),
    onSwipeRight: () => !isProcessingSwipe && handleSwipe("right")
  });

  // Load data when tab changes
  useEffect(() => {
    if (!user) return;
    
    if (activeTab === "network") {
      fetchConnections();
    } else if (activeTab === "match") {
      fetchMatchCreators(creatorFilters);
    }
  }, [activeTab, user?.id]);

  // Initial load
  useEffect(() => {
    if (user?.id) {
      checkUndosRemaining();
      fetchMatchCreators(creatorFilters);
    }
  }, [user?.id]);

  const handleSwipe = async (direction: "left" | "right") => {
    if (isProcessingSwipe) return;
    
    const currentCard = matchCards[0];
    if (!user || !currentCard) {
      console.log('[Circle] No user or card to swipe');
      return;
    }

    setIsProcessingSwipe(true);
    console.log('[Circle] Processing swipe:', direction, 'on', currentCard.name);

    try {
      // Track analytics
      const { analytics } = await import("@/lib/analytics");
      analytics.swipe(direction, currentCard.user_id);

      // Check swipe limits for free users
      if (subscriptionTier === 'free' && dailySwipesLeft <= 0) {
        analytics.swipeLimitHit(subscriptionTier);
        toastHook({
          title: "Daily limit reached",
          description: "Upgrade to Pro for unlimited swipes!",
          variant: "destructive"
        });
        navigate('/subscription');
        return;
      }

      // Animate the swipe
      await swipeGestures.animateSwipe(direction);

      // Remove card from UI immediately (Tinder behavior)
      removeCard(currentCard.id);

      // Update swipe count
      await updateSwipeCount();

      // Record swipe in database
      const { data: swipeData, error: swipeError } = await supabase
        .from('swipes')
        .insert({
          user_id: user.id,
          target_id: currentCard.user_id,
          target_type: 'profile',
          direction,
          is_super_like: false,
        })
        .select()
        .single();

      if (swipeError) {
        console.error('[Circle] Failed to record swipe:', swipeError);
        toast.error('Failed to record swipe');
        return;
      }

      if (swipeData) {
        trackSwipe(swipeData as any);
        console.log('[Circle] Swipe recorded successfully');
      }

      // Handle right swipe (like)
      if (direction === "right") {
        // Get current user's profile for notifications
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role')
          .eq('user_id', user.id)
          .single();

        // Check if they already swiped right on us (mutual match)
        const { data: theirSwipe } = await supabase
          .from('swipes')
          .select('id')
          .eq('user_id', currentCard.user_id)
          .eq('target_id', user.id)
          .eq('direction', 'right')
          .maybeSingle();

        if (theirSwipe) {
          // IT'S A MATCH!
          console.log('[Circle] MATCH FOUND!');
          
          // Create match record
          const { error: matchError } = await supabase
            .from('matches')
            .insert({
              user1_id: user.id,
              user2_id: currentCard.user_id,
              match_type: 'creator',
              status: 'active',
            });

          if (matchError) {
            console.error('[Circle] Failed to create match:', matchError);
          } else {
            analytics.match(currentCard.user_id);

            // Create bidirectional connections
            await supabase.from('connections').insert([
              { user_id: user.id, connected_user_id: currentCard.user_id, status: 'accepted' },
              { user_id: currentCard.user_id, connected_user_id: user.id, status: 'accepted' }
            ]);

            // Send notifications to both users
            await supabase.from('notifications').insert([
              {
                user_id: currentCard.user_id,
                title: "🎉 It's a Match!",
                message: `You and ${senderProfile?.full_name || 'Someone'} both want to connect!`,
                type: 'match',
                category: 'collaboration',
                priority: 'high',
                link: '/messages',
                image_url: senderProfile?.avatar_url,
              },
              {
                user_id: user.id,
                title: "🎉 It's a Match!",
                message: `You and ${currentCard.name} both want to connect!`,
                type: 'match',
                category: 'collaboration',
                priority: 'high',
                link: '/messages',
                image_url: currentCard.image,
              }
            ]);

            // Show celebration dialog
            setMatchedUser({
              name: currentCard.name,
              avatar: currentCard.image,
              role: currentCard.title,
              userId: currentCard.user_id,
            });
            setShowMatchCelebration(true);
          }
        } else {
          // No match yet - send interest notification
          await supabase.from('notifications').insert({
            user_id: currentCard.user_id,
            title: "💫 Someone's Interested!",
            message: `${senderProfile?.full_name || 'A creator'} wants to connect with you. Swipe to see who!`,
            type: 'interest',
            category: 'collaboration',
            priority: 'normal',
            link: '/circle',
            image_url: senderProfile?.avatar_url,
          });

          toast.success(`Interest sent to ${currentCard.name}! 💫`);
        }
      }
    } catch (error) {
      console.error('[Circle] Swipe error:', error);
      toast.error('Something went wrong');
    } finally {
      swipeGestures.resetSwipe();
      setIsProcessingSwipe(false);
    }
  };

  const handleMessage = (userId: string) => {
    navigate(`/messages?user=${userId}`);
  };

  const handleUndoSwipe = async () => {
    const undone = await undoLastSwipe();
    if (undone) {
      // Refresh the cards to get the undone card back
      fetchMatchCreators(creatorFilters);
      swipeGestures.resetSwipe();
    }
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="suggestions" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Suggestions</span>
            </TabsTrigger>
            <TabsTrigger value="match" className="gap-2">
              <Heart className="h-4 w-4" />
              Match
            </TabsTrigger>
            <TabsTrigger value="network" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Network</span>
            </TabsTrigger>
          </TabsList>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-4">
            <SmartConnectionSuggestions />
          </TabsContent>

          {/* Match Tab */}
          <TabsContent value="match" className="space-y-4">
            {/* Swipes Counter */}
            <div className="flex justify-center mb-2">
              {subscriptionTier === 'free' ? (
                <Badge 
                  variant={dailySwipesLeft <= 5 ? "destructive" : "secondary"} 
                  className="gap-1 cursor-pointer"
                  onClick={() => dailySwipesLeft <= 5 && navigate('/subscription')}
                >
                  <Zap className="h-3 w-3" />
                  {dailySwipesLeft}/30 swipes left
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Unlimited ✨
                </Badge>
              )}
            </div>

            <div className="grid lg:grid-cols-[250px_1fr] gap-6">
              {/* Filters - Desktop only */}
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
                {/* Card Counter */}
                {matchCards.length > 0 && (
                  <div className="mb-2 text-center text-sm text-muted-foreground">
                    {matchCards.length} creator{matchCards.length !== 1 ? 's' : ''} to discover
                  </div>
                )}

                <MatchFeed
                  cards={matchCards}
                  currentIndex={0}
                  loading={matchLoading}
                  dragOffset={swipeGestures.dragOffset}
                  swipeDirection={swipeGestures.swipeDirection}
                  isDragging={swipeGestures.isDragging || isProcessingSwipe}
                  onSwipeLeft={() => handleSwipe("left")}
                  onSwipeRight={() => handleSwipe("right")}
                  onDragStart={swipeGestures.handleDragStart}
                  onDragMove={swipeGestures.handleDragMove}
                  onDragEnd={swipeGestures.handleDragEnd}
                  cardRef={swipeGestures.cardRef}
                />

                {/* Undo button */}
                {undosRemaining > 0 && matchCards.length > 0 && (
                  <div className="mt-24">
                    <UndoSwipeButton
                      onClick={handleUndoSwipe}
                      disabled={isProcessingSwipe}
                      userTier={subscriptionTier}
                      undosRemaining={undosRemaining}
                    />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* My Network Tab */}
          <TabsContent value="network" className="space-y-4">
            <div className="mb-4">
              <p className="text-muted-foreground">
                {connections.length} connection{connections.length !== 1 ? 's' : ''}
              </p>
            </div>

            {connections.length === 0 && !loading ? (
              <div className="text-center py-12">
                <div className="mb-6 p-6 rounded-full bg-primary/10 inline-flex">
                  <Users className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">No Connections Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Start swiping to find your creative collaborators!
                </p>
                <Button onClick={() => setActiveTab("match")} className="gap-2">
                  <Heart className="h-5 w-5" />
                  Start Matching
                </Button>
              </div>
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
    </div>
  );
}
