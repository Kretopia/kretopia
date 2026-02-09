import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Heart, X, Clock, Loader2, MapPin, Eye, Undo2, UserPlus, RefreshCw, Crown, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SwipeCard } from "@/components/ui/swipe-card";
import { useSwipeGestures } from "@/hooks/useSwipeGestures";
import { InviteDialog } from "@/components/InviteDialog";
import { ConnectFiltersComponent, ConnectFilters } from "./ConnectFilters";
import { MatchExplanationDialog } from "@/components/discover/MatchExplanationDialog";
import { TIER_LIMITS, getRemainingSwipes, SubscriptionTier } from "@/lib/subscriptionLimits";

interface ForYouCreator {
  user_id: string;
  full_name: string;
  role: string;
  bio: string;
  avatar_url: string;
  location: string;
  collab_intent: string;
  match_score: number;
  match_reasons: string[];
}

interface ForYouFeedProps {
  onMatch: (user: { name: string; avatar: string; role: string; userId: string }) => void;
}

// Demo cards for preview when no real candidates exist
const DEMO_CARDS: ForYouCreator[] = [
  {
    user_id: 'demo-1',
    full_name: 'Maya Chen',
    role: 'Photographer',
    bio: 'Award-winning portrait and lifestyle photographer based in Bali. Specializing in natural light and authentic moments. Love collaborating with brands and creators!',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    location: 'Bali, Indonesia',
    collab_intent: 'seeking_collaborators',
    match_score: 92,
    match_reasons: ['📍 Based in Bali, Indonesia', '🎯 Complementary skill: Photographer', '🤝 Matching collaboration goals'],
  },
  {
    user_id: 'demo-2',
    full_name: 'Alex Rivera',
    role: 'Videographer',
    bio: 'Cinematic storyteller & drone pilot. Creating visual narratives for brands and creators across Southeast Asia. Let\'s make something epic together!',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    location: 'Canggu, Bali',
    collab_intent: 'available_for_hire',
    match_score: 87,
    match_reasons: ['📍 Based in Canggu, Bali', '🎯 Complementary skill: Videographer'],
  },
  {
    user_id: 'demo-3',
    full_name: 'Sophie Laurent',
    role: 'Content Creator',
    bio: 'Lifestyle & travel content creator with 250k followers. Always looking for talented photographers and videographers for brand collaborations!',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    location: 'Ubud, Bali',
    collab_intent: 'looking_to_hire',
    match_score: 85,
    match_reasons: ['📍 Based in Ubud, Bali', '💼 Looking to hire creators'],
  },
  {
    user_id: 'demo-4',
    full_name: 'Jordan Kim',
    role: 'Music Producer',
    bio: 'Lo-fi beats & ambient soundscapes. Creating custom music for videos, podcasts, and brand content. Open to trades with visual creators!',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
    location: 'Seminyak, Bali',
    collab_intent: 'open_to_trade',
    match_score: 78,
    match_reasons: ['🔄 Open to trade collaborations', '✨ Fellow creative in Bali'],
  },
];

export const ForYouFeed = ({ onMatch }: ForYouFeedProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [picks, setPicks] = useState<ForYouCreator[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [lastSwiped, setLastSwiped] = useState<ForYouCreator | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showMatchExplanation, setShowMatchExplanation] = useState(false);
  const [userTier, setUserTier] = useState<SubscriptionTier>('free');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [demoMode, setDemoMode] = useState(false);
  const [dailySwipesLeft, setDailySwipesLeft] = useState<number>(30);
  
  // Filters
  const [filters, setFilters] = useState<ConnectFilters>({
    role: 'all',
    location: 'all',
    collabIntent: 'all',
    verifiedOnly: false,
    minFollowers: 'all',
    experienceLevel: 'all',
  });

  const maxSwipes = TIER_LIMITS[userTier].swipesPerDay;
  const isSwipeLimitReached = maxSwipes !== -1 && dailySwipesLeft <= 0;

  const currentCreator = demoMode ? DEMO_CARDS[currentIndex] : picks[currentIndex];
  const remainingPicks = demoMode ? DEMO_CARDS.length - currentIndex : picks.length - currentIndex;

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!currentCreator || actionLoading) return;
    
    // Demo mode: just advance index without DB calls
    if (demoMode) {
      setCurrentIndex(prev => prev + 1);
      if (direction === 'right') {
        toast.success(`Demo: Interest sent to ${currentCreator.full_name}! 💫`);
      }
      resetSwipe();
      return;
    }
    
    // Check swipe limit for non-Pro users
    if (isSwipeLimitReached) {
      toast.error("Daily swipe limit reached!");
      // Track swipe limit hit
      const { analytics: limitAnalytics } = await import("@/lib/analytics");
      limitAnalytics.swipeLimitHit('free');
      navigate('/subscription');
      return;
    }
    
    setActionLoading(true);
    
    try {
      // Record swipe
      await supabase.from('swipes').insert({
        user_id: user!.id,
        target_id: currentCreator.user_id,
        target_type: 'profile',
        direction: direction,
        is_super_like: false,
      });

      // Track analytics
      const { analytics } = await import("@/lib/analytics");
      analytics.swipe(direction, currentCreator.user_id);

      if (direction === 'right') {
        // Check for mutual match (they already swiped right on us)
        const { data: theirSwipe, error: swipeCheckError } = await supabase
          .from('swipes')
          .select('id')
          .eq('user_id', currentCreator.user_id)
          .eq('target_id', user!.id)
          .eq('direction', 'right')
          .maybeSingle();

        console.log('[ForYou] Checking if they swiped on us:', { theirSwipe, swipeCheckError });

        if (theirSwipe) {
          console.log('[ForYou] 🎉 MUTUAL MATCH DETECTED!');
          
          // Track match creation
          analytics.match(currentCreator.user_id);
          
          // It's a match! Create match record
          const { error: matchError } = await supabase.from('matches').insert({
            user1_id: user!.id,
            user2_id: currentCreator.user_id,
            match_type: 'creator',
            status: 'active',
          });
          
          if (matchError) {
            console.error('[ForYou] Error creating match:', matchError);
          }

          // Create/update connections as accepted
          const { error: conn1Error } = await supabase.from('connections').upsert({
            user_id: user!.id, 
            connected_user_id: currentCreator.user_id, 
            status: 'accepted'
          }, { onConflict: 'user_id,connected_user_id' });
          
          if (conn1Error) {
            console.error('[ForYou] Error creating connection 1:', conn1Error);
          }

          const { error: conn2Error } = await supabase.from('connections').upsert({
            user_id: currentCreator.user_id, 
            connected_user_id: user!.id, 
            status: 'accepted'
          }, { onConflict: 'user_id,connected_user_id' });
          
          if (conn2Error) {
            console.error('[ForYou] Error creating connection 2:', conn2Error);
          }

          // Send notifications to both users
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('user_id', user!.id)
            .single();

          // Notify the other user about the match
          await supabase.from('notifications').insert({
            user_id: currentCreator.user_id,
            type: 'match',
            title: "It's a Match! 🎉",
            message: `You and ${myProfile?.full_name || 'a creator'} both want to connect!`,
            link: `/messages?user=${user!.id}`,
          });

          // Notify current user about the match
          await supabase.from('notifications').insert({
            user_id: user!.id,
            type: 'match',
            title: "It's a Match! 🎉",
            message: `You and ${currentCreator.full_name} both want to connect!`,
            link: `/messages?user=${currentCreator.user_id}`,
          });

          // Trigger the match celebration
          onMatch({
            name: currentCreator.full_name,
            avatar: currentCreator.avatar_url,
            role: currentCreator.role,
            userId: currentCreator.user_id,
          });
          
          toast.success(`It's a Match! 🎉`, { description: `You and ${currentCreator.full_name} both want to connect!` });
        } else {
          console.log('[ForYou] No mutual swipe yet, creating pending connection');
          
          // No match yet, create pending connection from us to them
          const { error: pendingError } = await supabase.from('connections').upsert({
            user_id: user!.id, 
            connected_user_id: currentCreator.user_id, 
            status: 'pending'
          }, { onConflict: 'user_id,connected_user_id' });
          
          if (pendingError) {
            console.error('[ForYou] Error creating pending connection:', pendingError);
          }
          
          toast.success(`Interest sent to ${currentCreator.full_name}! 💫`);
        }
      }

      // Update swipe count
      const { data: profileData } = await supabase
        .from('profiles')
        .select('daily_swipes')
        .eq('user_id', user!.id)
        .single();
      
      const newSwipeCount = (profileData?.daily_swipes || 0) + 1;
      await supabase
        .from('profiles')
        .update({ daily_swipes: newSwipeCount })
        .eq('user_id', user!.id);
      
      setDailySwipesLeft(prev => Math.max(0, prev - 1));

      setLastSwiped(currentCreator);
      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      console.error('[ForYou] Swipe error:', error);
      toast.error('Something went wrong');
    } finally {
      setActionLoading(false);
      resetSwipe();
    }
  };

  const {
    isDragging,
    dragOffset,
    swipeDirection,
    cardRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    resetSwipe,
    animateSwipe
  } = useSwipeGestures({
    onSwipeLeft: () => handleSwipe('left'),
    onSwipeRight: () => handleSwipe('right'),
    swipeThreshold: 120,
    dragThreshold: 60
  });

  const loadDailyPicks = useCallback(async () => {
    if (!user?.id) {
      console.log('[ForYou] No user, skipping load');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log('[ForYou] ========== LOADING PICKS ==========');
    console.log('[ForYou] Current user ID:', user.id);
    
    try {
      // Step 1: Get current user's profile and update swipe count
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role, location, collab_intent, subscription_tier, daily_swipes, last_swipe_reset')
        .eq('user_id', user.id)
        .single();

      if (currentProfile?.subscription_tier) {
        setUserTier(currentProfile.subscription_tier as SubscriptionTier);
      }
      
      // Update swipes remaining
      const tier = (currentProfile?.subscription_tier || 'free') as SubscriptionTier;
      const today = new Date().toISOString().split('T')[0];
      const lastReset = currentProfile?.last_swipe_reset 
        ? new Date(currentProfile.last_swipe_reset).toISOString().split('T')[0] 
        : null;
      
      if (lastReset !== today) {
        await supabase
          .from('profiles')
          .update({ daily_swipes: 0, last_swipe_reset: new Date().toISOString() })
          .eq('user_id', user.id);
        setDailySwipesLeft(TIER_LIMITS[tier].swipesPerDay === -1 ? 999 : TIER_LIMITS[tier].swipesPerDay);
      } else {
        const swipesUsed = currentProfile?.daily_swipes || 0;
        const remaining = getRemainingSwipes(tier, swipesUsed);
        setDailySwipesLeft(remaining === -1 ? 999 : remaining);
      }

      // Step 2: Fetch ALL data in parallel for speed
      const [swipesResult, connectionsResult, portfolioResult, profilesResult] = await Promise.all([
        // Get swipes this user has made
        supabase.from('swipes').select('target_id').eq('user_id', user.id),
        // Get accepted connections only
        supabase.from('connections').select('user_id, connected_user_id').eq('status', 'accepted'),
        // Get all portfolio items to find users with portfolios
        supabase.from('portfolio_items').select('user_id'),
        // Get all profiles with onboarding completed
        supabase.from('profiles').select('user_id, full_name, role, bio, avatar_url, location, collab_intent, onboarding_completed')
          .eq('onboarding_completed', true)
      ]);

      // Build exclusion sets
      const swipedUserIds = new Set(swipesResult.data?.map(s => s.target_id) || []);
      console.log('[ForYou] User has swiped on:', swipedUserIds.size, 'profiles');

      const connectedUserIds = new Set<string>();
      connectionsResult.data?.forEach(c => {
        if (c.user_id === user.id) connectedUserIds.add(c.connected_user_id);
        if (c.connected_user_id === user.id) connectedUserIds.add(c.user_id);
      });
      console.log('[ForYou] User is connected to:', connectedUserIds.size, 'profiles');

      // Build portfolio user set
      const portfolioUserIds = new Set<string>();
      const portfolioCountMap = new Map<string, number>();
      portfolioResult.data?.forEach(item => {
        portfolioUserIds.add(item.user_id);
        portfolioCountMap.set(item.user_id, (portfolioCountMap.get(item.user_id) || 0) + 1);
      });
      console.log('[ForYou] Users with portfolios:', portfolioUserIds.size);

      // Step 3: Filter candidates
      const allProfiles = profilesResult.data || [];
      console.log('[ForYou] Total profiles fetched:', allProfiles.length);

      const candidates = allProfiles.filter(p => {
        // Exclude self
        if (p.user_id === user.id) return false;
        // Exclude already swiped
        if (swipedUserIds.has(p.user_id)) return false;
        // Exclude accepted connections
        if (connectedUserIds.has(p.user_id)) return false;
        // Must have avatar
        if (!p.avatar_url || p.avatar_url.trim() === '') return false;
        // Must have bio (20+ chars)
        if (!p.bio || p.bio.trim().length < 20) return false;
        // Must have at least 1 portfolio item
        if (!portfolioUserIds.has(p.user_id)) return false;
        return true;
      });

      console.log('[ForYou] Candidates after filtering:', candidates.length, candidates.map(c => c.full_name));

      // Step 4: Apply user filters
      let filteredCandidates = [...candidates];
      
      if (filters.role !== 'all') {
        filteredCandidates = filteredCandidates.filter(p => 
          p.role?.toLowerCase().includes(filters.role.toLowerCase())
        );
      }
      if (filters.location !== 'all') {
        filteredCandidates = filteredCandidates.filter(p => 
          p.location?.toLowerCase().includes(filters.location.toLowerCase())
        );
      }
      if (filters.collabIntent !== 'all') {
        filteredCandidates = filteredCandidates.filter(p => p.collab_intent === filters.collabIntent);
      }

      console.log('[ForYou] After user filters:', filteredCandidates.length);

      // Step 5: Score and rank candidates
      const scoredPicks = filteredCandidates.map(candidate => {
        let score = 70;
        const reasons: string[] = [];

        // Location match
        if (candidate.location && currentProfile?.location) {
          const candLoc = candidate.location.toLowerCase();
          const userLoc = currentProfile.location.toLowerCase().split(',')[0];
          if (candLoc.includes(userLoc)) {
            score += 10;
            reasons.push(`📍 Based in ${candidate.location}`);
          }
        }

        // Complementary roles
        if (candidate.role && currentProfile?.role) {
          const complementaryPairs: Record<string, string[]> = {
            'Photographer': ['Model', 'Videographer', 'Content Creator'],
            'Videographer': ['Photographer', 'Music Producer', 'Content Creator'],
            'Music Producer': ['Vocalist', 'Songwriter', 'Videographer'],
            'Content Creator': ['Photographer', 'Videographer', 'Graphic Designer'],
            'Entrepreneur': ['Content Creator', 'Photographer', 'Videographer', 'Graphic Designer', 'Brand Designer'],
          };
          const complementary = complementaryPairs[currentProfile.role] || [];
          if (complementary.some(role => candidate.role?.includes(role))) {
            score += 15;
            reasons.push(`🎯 Complementary skill: ${candidate.role}`);
          } else if (candidate.role === currentProfile.role) {
            score += 5;
            reasons.push(`✨ Fellow ${candidate.role}`);
          }
        }

        // Collaboration intent match
        if (candidate.collab_intent && currentProfile?.collab_intent) {
          const intentMatch: Record<string, string> = {
            'looking_to_hire': 'available_for_hire',
            'available_for_hire': 'looking_to_hire',
            'seeking_collaborators': 'seeking_collaborators',
            'open_to_trade': 'open_to_trade',
          };
          if (intentMatch[currentProfile.collab_intent] === candidate.collab_intent) {
            score += 10;
            reasons.push('🤝 Matching collaboration goals');
          }
        }

        if (reasons.length === 0) {
          reasons.push('✨ Active creator on ThriveIN');
        }

        return {
          user_id: candidate.user_id,
          full_name: candidate.full_name || 'Creator',
          role: candidate.role || 'Creator',
          bio: candidate.bio || '',
          avatar_url: candidate.avatar_url || '',
          location: candidate.location || 'Remote',
          collab_intent: candidate.collab_intent || '',
          match_score: Math.min(99, score),
          match_reasons: reasons,
        };
      });

      // Sort by score descending
      scoredPicks.sort((a, b) => b.match_score - a.match_score);

      // Take top 20
      const finalPicks = scoredPicks.slice(0, 20);
      console.log('[ForYou] Final picks:', finalPicks.length, finalPicks.map(p => p.full_name));

      setPicks(finalPicks);
      setCurrentIndex(0);
      setDebugInfo(`Found ${finalPicks.length} matches`);
      
    } catch (error) {
      console.error('[ForYou] Error loading picks:', error);
      setDebugInfo('Error loading profiles');
      setPicks([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, filters]);

  useEffect(() => {
    loadDailyPicks();
  }, [loadDailyPicks]);

  const handleUndo = async () => {
    if (!lastSwiped || userTier === 'free') {
      if (userTier === 'free') {
        toast.error('Upgrade to Pro to undo swipes!');
        navigate('/subscription');
      }
      return;
    }

    try {
      await supabase
        .from('swipes')
        .delete()
        .eq('user_id', user!.id)
        .eq('target_id', lastSwiped.user_id);

      await supabase
        .from('connections')
        .delete()
        .eq('user_id', user!.id)
        .eq('connected_user_id', lastSwiped.user_id);

      setPicks(prev => [lastSwiped, ...prev.slice(currentIndex)]);
      setCurrentIndex(0);
      setLastSwiped(null);
      toast.success('Swipe undone!');
    } catch (error) {
      console.error('[ForYou] Undo error:', error);
      toast.error('Could not undo swipe');
    }
  };

  const handleLike = async () => {
    if (!currentCreator) return;
    await animateSwipe('right');
    await handleSwipe('right');
  };

  const handlePass = async () => {
    if (!currentCreator) return;
    await animateSwipe('left');
    await handleSwipe('left');
  };

  const getCollabIntentLabel = (intent: string | null) => {
    const labels: Record<string, string> = {
      'looking_to_hire': '💼 Hiring',
      'available_for_hire': '✋ For Hire',
      'open_to_trade': '🔄 Trade',
      'seeking_collaborators': '🤝 Collab',
      'just_networking': '👋 Networking',
    };
    return intent ? labels[intent] : null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Finding your matches...</p>
      </div>
    );
  }

  // Swipe limit reached state
  if (isSwipeLimitReached && !demoMode) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
          <Lock className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-2">Daily Limit Reached</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-sm">
          You've used all {maxSwipes} swipes for today. Upgrade to Pro for unlimited swipes!
        </p>
        <Button 
          onClick={() => navigate('/subscription')}
          className="gap-2 bg-gradient-to-r from-primary to-primary/80"
        >
          <Crown className="h-4 w-4" />
          Upgrade to Pro
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          Swipes reset at midnight
        </p>
      </div>
    );
  }

  // Empty state - show demo mode option
  if (!currentCreator && !demoMode) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <EmptyState
            icon={Sparkles}
            title="All Caught Up!"
            description="You've seen all available creators. Invite more creators to join!"
            action={{
              label: "Invite Creators",
              onClick: () => setShowInvite(true)
            }}
          />
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={loadDailyPicks} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button 
              onClick={() => {
                setDemoMode(true);
                setCurrentIndex(0);
              }} 
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview Demo
            </Button>
          </div>
        </div>
        <InviteDialog open={showInvite} onOpenChange={setShowInvite} />
      </>
    );
  }

  // Demo mode end state
  if (demoMode && currentIndex >= DEMO_CARDS.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <EmptyState
          icon={Sparkles}
          title="Demo Complete!"
          description="That's how the swipe experience looks. Exit demo to see real creators."
        />
        <div className="mt-6 flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              setDemoMode(false);
              setCurrentIndex(0);
            }} 
            className="gap-2"
          >
            Exit Demo
          </Button>
          <Button 
            onClick={() => setCurrentIndex(0)} 
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Restart Demo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Demo Mode Banner */}
        {demoMode && (
          <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Demo Mode - Preview Only</span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                setDemoMode(false);
                setCurrentIndex(0);
              }}
            >
              Exit Demo
            </Button>
          </div>
        )}

        {/* Filters - hide in demo mode */}
        {!demoMode && (
          <div className="mb-4">
            <ConnectFiltersComponent 
              filters={filters}
              onFiltersChange={setFilters}
              activeFilterCount={Object.values(filters).filter(v => v !== 'all' && v !== false).length}
              isPro={userTier !== 'free'}
            />
          </div>
        )}

        {/* Swipe Card */}
        <div className="relative mb-4 min-h-[400px] h-[60vh] max-h-[500px]">
          <SwipeCard
            ref={cardRef}
            dragOffset={dragOffset}
            isDragging={isDragging}
            swipeDirection={swipeDirection}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            showOverlay={true}
            className="absolute inset-0 rounded-xl"
          >
            {/* Card Background */}
            <div className="absolute inset-0 rounded-xl overflow-hidden">
              {currentCreator.avatar_url ? (
                <img 
                  src={currentCreator.avatar_url} 
                  alt={currentCreator.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            </div>

            {/* Card Content */}
            <div className="relative z-10 h-full flex flex-col justify-end p-5">
              {/* AI Match Score Badge */}
              <button
                onClick={() => setShowMatchExplanation(true)}
                className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                <span className="text-sm font-semibold">{currentCreator.match_score}%</span>
              </button>

              {/* Profile Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-white/20">
                    <AvatarImage src={currentCreator.avatar_url} />
                    <AvatarFallback>{currentCreator.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold text-white">{currentCreator.full_name}</h3>
                    <p className="text-white/80 text-sm">{currentCreator.role}</p>
                  </div>
                </div>

                {/* Location & Intent */}
                <div className="flex flex-wrap gap-2">
                  {currentCreator.location && (
                    <Badge variant="secondary" className="bg-white/10 text-white border-0">
                      <MapPin className="h-3 w-3 mr-1" />
                      {currentCreator.location}
                    </Badge>
                  )}
                  {getCollabIntentLabel(currentCreator.collab_intent) && (
                    <Badge variant="secondary" className="bg-white/10 text-white border-0">
                      {getCollabIntentLabel(currentCreator.collab_intent)}
                    </Badge>
                  )}
                </div>

                {/* Bio Preview */}
                <p className="text-white/70 text-sm line-clamp-2">
                  {currentCreator.bio}
                </p>

                {/* Match Reasons */}
                <div className="flex flex-wrap gap-1.5">
                  {currentCreator.match_reasons?.slice(0, 2).map((reason, i) => (
                    <span key={i} className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded-full">
                      {reason}
                    </span>
                  ))}
                </div>

                {/* View Profile Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/10 w-fit"
                  onClick={() => setPreviewUserId(currentCreator.user_id)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Profile
                </Button>
              </div>
            </div>
          </SwipeCard>

          {/* Remaining count */}
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white/80 text-sm">
            <Clock className="h-3.5 w-3.5" />
            {remainingPicks} left today
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 py-4">
          <Button
            size="lg"
            variant="outline"
            className="h-16 w-16 rounded-full border-2 border-muted-foreground/30 hover:border-red-500 hover:bg-red-500/10"
            onClick={handlePass}
            disabled={actionLoading}
          >
            <X className="h-7 w-7 text-muted-foreground" />
          </Button>
          
          {lastSwiped && userTier !== 'free' && (
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-12 rounded-full border-2"
              onClick={handleUndo}
            >
              <Undo2 className="h-5 w-5" />
            </Button>
          )}
          
          <Button
            size="lg"
            className="h-16 w-16 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg"
            onClick={handleLike}
            disabled={actionLoading}
          >
            <Heart className="h-7 w-7 text-white" fill="white" />
          </Button>
        </div>
      </div>

      {/* Profile Preview Dialog */}
      <ProfilePreviewDialog
        userId={previewUserId}
        open={!!previewUserId}
        onOpenChange={(open) => !open && setPreviewUserId(null)}
        demoProfile={demoMode && currentCreator ? {
          full_name: currentCreator.full_name,
          role: currentCreator.role,
          bio: currentCreator.bio,
          avatar_url: currentCreator.avatar_url,
          location: currentCreator.location,
          collab_intent: currentCreator.collab_intent,
          match_score: currentCreator.match_score,
          match_reasons: currentCreator.match_reasons,
        } : null}
      />

      {/* Match Explanation Dialog */}
      <MatchExplanationDialog
        open={showMatchExplanation}
        onOpenChange={setShowMatchExplanation}
        match={{
          user_id: currentCreator?.user_id,
          name: currentCreator?.full_name || '',
          title: currentCreator?.role || '',
          location: currentCreator?.location || '',
          image: currentCreator?.avatar_url || '',
          matchScore: currentCreator?.match_score || 0,
          matchReasons: currentCreator?.match_reasons || []
        }}
        onConnect={() => {
          setShowMatchExplanation(false);
          handleLike();
        }}
        onPass={() => {
          setShowMatchExplanation(false);
          handlePass();
        }}
      />

      <InviteDialog open={showInvite} onOpenChange={setShowInvite} />
    </>
  );
};
