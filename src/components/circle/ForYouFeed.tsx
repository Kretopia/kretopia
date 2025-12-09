import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Heart, X, Clock, Loader2, MapPin, Eye, Undo2, UserPlus, Lightbulb, RefreshCw } from "lucide-react";
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
  const [userTier, setUserTier] = useState<string>('free');
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // Filters
  const [filters, setFilters] = useState<ConnectFilters>({
    role: 'all',
    location: 'all',
    collabIntent: 'all',
    verifiedOnly: false,
    minFollowers: 'all',
    experienceLevel: 'all',
  });

  const DAILY_LIMIT = 20;

  const currentCreator = picks[currentIndex];
  const remainingPicks = picks.length - currentIndex;

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!currentCreator || actionLoading) return;
    
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
        const { data: theirSwipe } = await supabase
          .from('swipes')
          .select('id')
          .eq('user_id', currentCreator.user_id)
          .eq('target_id', user!.id)
          .eq('direction', 'right')
          .maybeSingle();

        if (theirSwipe) {
          // It's a match! Create match record
          await supabase.from('matches').insert({
            user1_id: user!.id,
            user2_id: currentCreator.user_id,
            match_type: 'creator',
            status: 'active',
          });

          // Update existing pending connections to accepted, or create new ones
          await supabase
            .from('connections')
            .update({ status: 'accepted' })
            .or(`and(user_id.eq.${user!.id},connected_user_id.eq.${currentCreator.user_id}),and(user_id.eq.${currentCreator.user_id},connected_user_id.eq.${user!.id})`);

          // Insert connections if they don't exist
          await supabase.from('connections').upsert([
            { user_id: user!.id, connected_user_id: currentCreator.user_id, status: 'accepted' },
            { user_id: currentCreator.user_id, connected_user_id: user!.id, status: 'accepted' }
          ], { onConflict: 'user_id,connected_user_id', ignoreDuplicates: true });

          onMatch({
            name: currentCreator.full_name,
            avatar: currentCreator.avatar_url,
            role: currentCreator.role,
            userId: currentCreator.user_id,
          });
        } else {
          // No match yet, create pending connection from us to them
          await supabase.from('connections').upsert({
            user_id: user!.id, 
            connected_user_id: currentCreator.user_id, 
            status: 'pending'
          }, { onConflict: 'user_id,connected_user_id', ignoreDuplicates: true });
          
          toast.success(`Interest sent to ${currentCreator.full_name}! 💫`);
        }
      }

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
    if (!user?.id) return;
    
    setLoading(true);
    setDebugInfo('Loading...');
    
    try {
      console.log('[ForYou] ========== LOADING PICKS ==========');
      console.log('[ForYou] Current user ID:', user.id);
      
      // Step 1: Get current user's profile
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role, location, professional_skills, collab_intent, subscription_tier')
        .eq('user_id', user.id)
        .single();

      if (currentProfile?.subscription_tier) {
        setUserTier(currentProfile.subscription_tier);
      }

      // Step 2: Get ALL swipes this user has made
      const { data: mySwipes } = await supabase
        .from('swipes')
        .select('target_id')
        .eq('user_id', user.id);

      const swipedUserIds = mySwipes?.map(s => s.target_id) || [];
      console.log('[ForYou] User has swiped on:', swipedUserIds.length, 'profiles');

      // Step 3: Get ONLY accepted connections (not pending - pending means waiting for reciprocation)
      const { data: acceptedConns } = await supabase
        .from('connections')
        .select('user_id, connected_user_id')
        .eq('status', 'accepted');

      // Filter to only MY accepted connections
      const myAcceptedConnections = acceptedConns?.filter(c => 
        c.user_id === user.id || c.connected_user_id === user.id
      ) || [];
      
      const connectedUserIds = myAcceptedConnections.map(c => 
        c.user_id === user.id ? c.connected_user_id : c.user_id
      );
      console.log('[ForYou] User is connected to:', connectedUserIds.length, 'profiles');

      // Step 4: Build the exclusion list
      const excludeSet = new Set([
        ...swipedUserIds,
        ...connectedUserIds,
        user.id // Always exclude self
      ]);
      const excludeIds = Array.from(excludeSet);
      console.log('[ForYou] Total exclusion list:', excludeIds.length, 'IDs');
      console.log('[ForYou] Exclusion IDs:', excludeIds);

      // Step 5: Get ALL profiles that meet basic criteria
      const { data: allProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url, location, collab_intent, professional_skills, onboarding_completed')
        .eq('onboarding_completed', true)
        .not('avatar_url', 'is', null)
        .not('bio', 'is', null)
        .limit(100);

      if (profileError) {
        console.error('[ForYou] Profile query error:', profileError);
        setDebugInfo('Error loading profiles');
        setPicks([]);
        setLoading(false);
        return;
      }

      console.log('[ForYou] All eligible profiles from DB:', allProfiles?.length);
      allProfiles?.forEach(p => {
        console.log(`[ForYou]   - ${p.full_name} (${p.user_id})`);
      });

      // Step 6: Filter out excluded IDs in JavaScript (more reliable than Supabase)
      // Also filter out empty avatar/bio strings
      const candidates = allProfiles?.filter(p => {
        // Check if excluded
        if (excludeSet.has(p.user_id)) {
          console.log(`[ForYou] EXCLUDING (already swiped/connected/self): ${p.full_name}`);
          return false;
        }
        // Check avatar not empty
        if (!p.avatar_url || p.avatar_url.trim() === '') {
          console.log(`[ForYou] EXCLUDING (no avatar): ${p.full_name}`);
          return false;
        }
        // Check bio not empty
        if (!p.bio || p.bio.trim() === '') {
          console.log(`[ForYou] EXCLUDING (no bio): ${p.full_name}`);
          return false;
        }
        console.log(`[ForYou] KEEPING: ${p.full_name}`);
        return true;
      }) || [];

      console.log('[ForYou] After exclusion, candidates:', candidates.length);
      candidates.forEach(c => console.log(`[ForYou]   Candidate: ${c.full_name}`));
      
      setDebugInfo(`Found ${candidates.length} candidates after filtering`);

      // Step 7: Apply user filters if set
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

      if (filteredCandidates.length === 0) {
        console.log('[ForYou] No candidates left after filtering!');
        setPicks([]);
        setCurrentIndex(0);
        setLoading(false);
        return;
      }

      // Step 8: Score and rank candidates
      const scoredPicks = filteredCandidates.map(candidate => {
        let score = 70;
        const reasons: string[] = [];

        // Location match
        if (candidate.location && currentProfile?.location && 
            candidate.location.toLowerCase() === currentProfile.location.toLowerCase()) {
          score += 10;
          reasons.push(`📍 Based in ${candidate.location}`);
        }

        // Complementary roles
        if (candidate.role && currentProfile?.role) {
          const complementaryPairs: Record<string, string[]> = {
            'Photographer': ['Model', 'Videographer', 'Content Creator'],
            'Videographer': ['Photographer', 'Music Producer', 'Content Creator'],
            'Music Producer': ['Vocalist', 'Songwriter', 'Videographer'],
            'Content Creator': ['Photographer', 'Videographer', 'Graphic Designer'],
            'Entrepreneur': ['Content Creator', 'Photographer', 'Videographer', 'Graphic Designer'],
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

        // Add some randomness to prevent same order
        score += Math.floor(Math.random() * 10);

        if (reasons.length === 0) {
          reasons.push(`Active ${candidate.role || 'creator'} in the community`);
        }

        return {
          ...candidate,
          match_score: Math.min(score, 99),
          match_reasons: reasons.slice(0, 3)
        };
      });

      // Sort by score descending
      scoredPicks.sort((a, b) => b.match_score - a.match_score);
      
      const finalPicks = scoredPicks.slice(0, DAILY_LIMIT);
      console.log('[ForYou] Final picks:', finalPicks.length);
      finalPicks.forEach(p => console.log(`[ForYou]   Pick: ${p.full_name} (score: ${p.match_score})`));
      
      setPicks(finalPicks);
      setCurrentIndex(0);
      setDebugInfo(`Loaded ${finalPicks.length} picks`);
    } catch (error) {
      console.error('[ForYou] Error loading picks:', error);
      setDebugInfo('Error: ' + String(error));
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filters]);

  useEffect(() => {
    if (user?.id) {
      loadDailyPicks();
    }
  }, [user?.id, loadDailyPicks]);

  const handleUndo = async () => {
    if (!lastSwiped) return;
    
    try {
      await supabase
        .from('swipes')
        .delete()
        .eq('user_id', user!.id)
        .eq('target_id', lastSwiped.user_id);
      
      setPicks(prev => {
        const newPicks = [...prev];
        newPicks.splice(currentIndex, 0, lastSwiped);
        return newPicks;
      });
      
      setLastSwiped(null);
      toast.success('Undo successful!');
    } catch (error) {
      console.error('[ForYou] Undo error:', error);
    }
  };

  const getCollabIntentLabel = (intent: string) => {
    const labels: Record<string, string> = {
      'looking_to_hire': '💼 Hiring',
      'available_for_hire': '✋ Available',
      'open_to_trade': '🔄 Trade',
      'seeking_collaborators': '🤝 Collaborating',
      'just_networking': '👋 Networking',
    };
    return labels[intent] || intent;
  };

  const activeFilterCount = [filters.role, filters.location, filters.collabIntent].filter(f => f !== 'all').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Finding your best matches...</p>
      </div>
    );
  }

  if (!currentCreator || currentIndex >= picks.length) {
    return (
      <>
        <ConnectFiltersComponent 
          filters={filters}
          onFiltersChange={setFilters}
          activeFilterCount={activeFilterCount}
          isPro={userTier === 'pro' || userTier === 'studio'}
        />
        
        <div className="text-center py-12">
          <div className="mb-6 p-6 rounded-full bg-primary/10 inline-flex">
            <Sparkles className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-3">
            {activeFilterCount > 0 ? 'No matches with these filters' : 'All caught up!'}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {activeFilterCount > 0 
              ? 'Try adjusting your filters to see more creators.'
              : `You've viewed all picks for today. Invite more creators to grow your network!`
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {activeFilterCount > 0 && (
              <Button variant="outline" onClick={() => setFilters({ role: 'all', location: 'all', collabIntent: 'all', verifiedOnly: false, minFollowers: 'all', experienceLevel: 'all' })}>
                Clear Filters
              </Button>
            )}
            <Button variant="outline" onClick={loadDailyPicks} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={() => setShowInvite(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Creators
            </Button>
          </div>
          {/* Debug info for testing */}
          <p className="text-xs text-muted-foreground mt-4">{debugInfo}</p>
        </div>
        <InviteDialog open={showInvite} onOpenChange={setShowInvite} />
      </>
    );
  }

  const nextCreator = picks[currentIndex + 1];

  return (
    <div className="flex flex-col items-center">
      {/* Filters */}
      <div className="w-full max-w-sm mb-4">
        <ConnectFiltersComponent 
          filters={filters}
          onFiltersChange={setFilters}
          activeFilterCount={activeFilterCount}
          isPro={userTier === 'pro' || userTier === 'studio'}
        />
      </div>
      
      {/* Stats Bar */}
      <div className="w-full max-w-sm mb-4 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Your Matches</span>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          {remainingPicks} left
        </Badge>
      </div>

      {/* Card Stack */}
      <div className="relative w-full max-w-sm h-[500px] mb-6">
        {/* Next card preview */}
        {nextCreator && (
          <div 
            className="absolute inset-0 rounded-2xl overflow-hidden opacity-50 scale-95"
            style={{ 
              backgroundImage: `url(${nextCreator.avatar_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(2px)'
            }}
          />
        )}

        {/* Current swipe card */}
        <SwipeCard
          ref={cardRef}
          dragOffset={dragOffset}
          swipeDirection={swipeDirection}
          isDragging={isDragging}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          className="absolute inset-0 rounded-2xl overflow-hidden"
        >
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${currentCreator.avatar_url})` }}
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          
          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-between p-6">
            {/* Top section - Match score */}
            <div className="flex justify-between items-start">
              <Button
                variant="ghost"
                size="sm"
                className="bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm"
                onClick={() => setPreviewUserId(currentCreator.user_id)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Profile
              </Button>
              
              {/* Clickable match score badge */}
              <button
                onClick={() => setShowMatchExplanation(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/80 to-purple-500/80 text-white text-sm font-bold backdrop-blur-sm hover:from-primary hover:to-purple-500 transition-all cursor-pointer"
              >
                <Sparkles className="h-3 w-3" />
                {currentCreator.match_score}% Match
              </button>
            </div>

            {/* Bottom section - Info and actions */}
            <div className="space-y-4">
              {/* User info */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-white/30">
                    <AvatarImage src={currentCreator.avatar_url} />
                    <AvatarFallback>{currentCreator.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{currentCreator.full_name}</h2>
                    <p className="text-white/80">{currentCreator.role}</p>
                  </div>
                </div>

                {/* Location and collab intent */}
                <div className="flex flex-wrap gap-2">
                  {currentCreator.location && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      <MapPin className="h-3 w-3 mr-1" />
                      {currentCreator.location}
                    </Badge>
                  )}
                  {currentCreator.collab_intent && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      {getCollabIntentLabel(currentCreator.collab_intent)}
                    </Badge>
                  )}
                </div>

                {/* Bio preview */}
                <p className="text-white/70 text-sm line-clamp-2">{currentCreator.bio}</p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-6 pt-2">
                {lastSwiped && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-12 w-12 rounded-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                    onClick={handleUndo}
                    disabled={actionLoading}
                  >
                    <Undo2 className="h-5 w-5" />
                  </Button>
                )}
                
                <Button
                  size="icon"
                  className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90 text-white shadow-lg"
                  onClick={() => handleSwipe('left')}
                  disabled={actionLoading}
                >
                  <X className="h-8 w-8" />
                </Button>
                
                <Button
                  size="icon"
                  className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg"
                  onClick={() => handleSwipe('right')}
                  disabled={actionLoading}
                >
                  <Heart className="h-8 w-8" />
                </Button>
              </div>
            </div>
          </div>
        </SwipeCard>
      </div>

      {/* Profile Preview Dialog */}
      {previewUserId && (
        <ProfilePreviewDialog
          userId={previewUserId}
          open={!!previewUserId}
          onOpenChange={(open) => !open && setPreviewUserId(null)}
        />
      )}

      {/* Match Explanation Dialog */}
      {showMatchExplanation && currentCreator && (
        <MatchExplanationDialog
          open={showMatchExplanation}
          onOpenChange={setShowMatchExplanation}
          match={{
            user_id: currentCreator.user_id,
            name: currentCreator.full_name,
            title: currentCreator.role,
            location: currentCreator.location || '',
            image: currentCreator.avatar_url,
            matchScore: currentCreator.match_score,
            matchReasons: currentCreator.match_reasons,
          }}
          onConnect={() => {
            setShowMatchExplanation(false);
            handleSwipe('right');
          }}
          onPass={() => {
            setShowMatchExplanation(false);
            handleSwipe('left');
          }}
        />
      )}

      {/* Invite Dialog */}
      <InviteDialog open={showInvite} onOpenChange={setShowInvite} />
    </div>
  );
};
