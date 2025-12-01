import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartConnectionSuggestions } from "@/components/circle/SmartConnectionSuggestions";
import { ConnectionList } from "@/components/circle/ConnectionList";
import { MatchFeed } from "@/components/circle/MatchFeed";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO } from "@/components/SEO";
import { Users, Sparkles, UserPlus, Zap, Heart } from "lucide-react";
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

// Interfaces moved to useCircleData hook

export default function Circle() {
  const { user, subscriptionInfo } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("suggestions");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [showMatchCelebration, setShowMatchCelebration] = useState(false);
  const [matchedUser, setMatchedUser] = useState<{ name: string; avatar: string; role: string; userId: string } | null>(null);
  const [swipedCardIds, setSwipedCardIds] = useState<Set<string>>(new Set());
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
  
  // Use custom hook for data fetching
  const {
    connections,
    matchCards,
    featuredCreator,
    loading,
    matchLoading,
    dailySwipesLeft,
    fetchConnections,
    fetchMatchCreators,
    updateSwipeCount,
    setDailySwipesLeft
  } = useCircleData(user?.id, subscriptionTier);
  
  const swipeGestures = useSwipeGestures({
    onSwipeLeft: () => handleSwipe("left"),
    onSwipeRight: () => handleSwipe("right")
  });

  useEffect(() => {
    if (!user) return;
    
    // Only fetch when tab becomes active
    if (activeTab === "network") {
      fetchConnections();
    } else if (activeTab === "match") {
      // Clear swiped cards state when fetching fresh profiles
      setSwipedCardIds(new Set());
      fetchMatchCreators(creatorFilters);
    }
  }, [activeTab, user?.id]);

  useEffect(() => {
    checkUndosRemaining();
  }, []);

  // Removed - logic moved to useCircleData hook

  const handleSwipe = async (direction: "left" | "right") => {
    const availableCards = matchCards.filter(card => !swipedCardIds.has(card.id));
    const currentCard = availableCards[0];
    if (!user || !currentCard) return;

    // Track swipe
    const { analytics } = await import("@/lib/analytics");
    analytics.swipe(direction, currentCard.user_id);

    // Check swipe limits BEFORE animation
    if (subscriptionTier === 'free' && dailySwipesLeft <= 0) {
      toastHook({
        title: "Daily limit reached",
        description: "Upgrade to Pro for unlimited swipes!",
        variant: "destructive"
      });
      navigate('/subscription');
      return;
    }

    // Animation
    await swipeGestures.animateSwipe(direction);

    // Mark card as swiped immediately
    setSwipedCardIds(prev => new Set(prev).add(currentCard.id));

    // Update swipe count via hook
    await updateSwipeCount();

    const { data: swipeData, error: swipeError } = await supabase.from('swipes').insert({
      user_id: user.id,
      target_id: currentCard.user_id, // Fixed: use user_id, not card id
      target_type: 'creator',
      direction,
      is_super_like: false,
    }).select().single();

    if (swipeError) {
      console.error('[Circle] Failed to create swipe:', swipeError);
      toast.error('Failed to record swipe');
      return;
    }

    if (swipeData) {
      trackSwipe(swipeData as any);
      console.log('[Circle] Swipe recorded:', { target: currentCard.user_id, direction });
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

        // Send email notifications to both users
        try {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              recipientId: currentCard.user_id,
              type: 'match',
              data: {
                matchedUserName: senderProfile?.full_name || 'A creator',
                matchedUserRole: senderProfile?.role || 'Creative Professional'
              }
            }
          });

          await supabase.functions.invoke('send-notification-email', {
            body: {
              recipientId: user.id,
              type: 'match',
              data: {
                matchedUserName: currentCard.name,
                matchedUserRole: currentCard.title
              }
            }
          });
        } catch (emailError) {
          console.error('Failed to send match email notifications:', emailError);
        }

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
    
    swipeGestures.resetSwipe();
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
                  <span>{dailySwipesLeft}/30 swipes today</span>
                  {dailySwipesLeft <= 3 && <span className="hidden sm:inline">• Upgrade for unlimited</span>}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Sparkles className="h-3 w-3" />
                  <span>Unlimited swipes ✨</span>
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
                {(() => {
                  const availableCards = matchCards.filter(card => !swipedCardIds.has(card.id));
                  const remainingCount = availableCards.length;
                  const totalCount = matchCards.length;
                  
                  return (
                    <>
                      {remainingCount > 0 && (
                        <div className="mb-3 text-center text-sm text-muted-foreground">
                          {totalCount - remainingCount + 1} / {totalCount}
                        </div>
                      )}

                      <MatchFeed
                        cards={availableCards}
                        currentIndex={0}
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
                      {undosRemaining > 0 && swipedCardIds.size > 0 && remainingCount > 0 && (
                        <div className="mt-24">
                          <UndoSwipeButton
                            onClick={async () => {
                              const undone = await undoLastSwipe();
                              if (undone) {
                                // Remove the last swiped card ID
                                setSwipedCardIds(prev => {
                                  const newSet = new Set(prev);
                                  const lastId = Array.from(prev).pop();
                                  if (lastId) newSet.delete(lastId);
                                  return newSet;
                                });
                                swipeGestures.resetSwipe();
                              }
                            }}
                            disabled={swipeGestures.isDragging}
                            userTier={subscriptionTier}
                            undosRemaining={undosRemaining}
                          />
                        </div>
                      )}
                    </>
                  );
                })()}
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
              <div className="text-center py-12">
                <div className="mb-6 p-6 rounded-full bg-primary/10 inline-flex">
                  <Users className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Build Your Network</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Start swiping on creators in the Match tab to build meaningful connections and grow your creative network.
                </p>
                <Button size="lg" onClick={() => setActiveTab("match")} className="gap-2">
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
              navigate('/messages');
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
