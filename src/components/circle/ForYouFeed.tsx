import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Heart, X, Clock, Loader2, MapPin, Eye, Undo2, UserPlus, Lightbulb } from "lucide-react";
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
  
  // Filters
  const [filters, setFilters] = useState<ConnectFilters>({
    role: 'all',
    location: 'all',
    collabIntent: 'all',
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
        // Check for mutual match
        const { data: theirSwipe } = await supabase
          .from('swipes')
          .select('id')
          .eq('user_id', currentCreator.user_id)
          .eq('target_id', user!.id)
          .eq('direction', 'right')
          .maybeSingle();

        if (theirSwipe) {
          // Create match
          await supabase.from('matches').insert({
            user1_id: user!.id,
            user2_id: currentCreator.user_id,
            match_type: 'creator',
            status: 'active',
          });

          await supabase.from('connections').insert([
            { user_id: user!.id, connected_user_id: currentCreator.user_id, status: 'accepted' },
            { user_id: currentCreator.user_id, connected_user_id: user!.id, status: 'accepted' }
          ]);

          onMatch({
            name: currentCreator.full_name,
            avatar: currentCreator.avatar_url,
            role: currentCreator.role,
            userId: currentCreator.user_id,
          });
        } else {
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

  useEffect(() => {
    if (user?.id) {
      loadDailyPicks();
    }
  }, [user?.id, filters]);

  const loadDailyPicks = async () => {
    setLoading(true);
    try {
      // Get current user's profile for matching
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role, location, professional_skills, collab_intent')
        .eq('user_id', user!.id)
        .single();

      // Get already swiped users today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: swipedToday } = await supabase
        .from('swipes')
        .select('target_id')
        .eq('user_id', user!.id)
        .gte('created_at', today.toISOString());

      const swipedIds = swipedToday?.map(s => s.target_id) || [];
      
      // Get connections to exclude
      const { data: connections } = await supabase
        .from('connections')
        .select('connected_user_id')
        .eq('user_id', user!.id);
      
      const connectedIds = connections?.map(c => c.connected_user_id) || [];
      const excludeIds = [...swipedIds, ...connectedIds, user!.id];

      // Get curated picks with visibility requirements
      let query = supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url, location, collab_intent, professional_skills')
        .not('avatar_url', 'is', null)
        .not('bio', 'is', null)
        .gt('bio', '')
        .limit(50); // Fetch more, then filter

      // Apply filters
      if (filters.role !== 'all') {
        query = query.eq('role', filters.role);
      }
      if (filters.location !== 'all') {
        query = query.eq('location', filters.location);
      }
      if (filters.collabIntent !== 'all') {
        query = query.eq('collab_intent', filters.collabIntent);
      }

      if (excludeIds.length > 0) {
        query = query.not('user_id', 'in', `(${excludeIds.join(',')})`);
      }

      const { data: candidates } = await query;

      if (!candidates || candidates.length === 0) {
        setPicks([]);
        setLoading(false);
        return;
      }

      // Score and rank candidates
      const scoredPicks = candidates.map(candidate => {
        let score = 70;
        const reasons: string[] = [];

        if (candidate.location && currentProfile?.location && 
            candidate.location.toLowerCase() === currentProfile.location.toLowerCase()) {
          score += 10;
          reasons.push(`📍 Based in ${candidate.location}`);
        }

        if (candidate.role && currentProfile?.role) {
          const complementaryPairs: Record<string, string[]> = {
            'Photographer': ['Model', 'Videographer', 'Content Creator'],
            'Videographer': ['Photographer', 'Music Producer', 'Content Creator'],
            'Music Producer': ['Vocalist', 'Songwriter', 'Videographer'],
            'Content Creator': ['Photographer', 'Videographer', 'Graphic Designer'],
          };
          const complementary = complementaryPairs[currentProfile.role] || [];
          if (complementary.includes(candidate.role)) {
            score += 15;
            reasons.push(`🎯 Complementary skill: ${candidate.role}`);
          } else if (candidate.role === currentProfile.role) {
            score += 5;
            reasons.push(`✨ Fellow ${candidate.role}`);
          }
        }

        if (candidate.collab_intent && currentProfile?.collab_intent) {
          const intentMatch = {
            'looking_to_hire': 'available_for_hire',
            'available_for_hire': 'looking_to_hire',
            'seeking_collaborators': 'seeking_collaborators',
            'open_to_trade': 'open_to_trade',
          };
          if (intentMatch[currentProfile.collab_intent as keyof typeof intentMatch] === candidate.collab_intent) {
            score += 10;
            reasons.push('🤝 Matching collaboration goals');
          }
        }

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

      scoredPicks.sort((a, b) => b.match_score - a.match_score);
      setPicks(scoredPicks.slice(0, DAILY_LIMIT));
      setCurrentIndex(0);
    } catch (error) {
      console.error('[ForYou] Error loading picks:', error);
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!lastSwiped) return;
    
    try {
      // Delete the last swipe
      await supabase
        .from('swipes')
        .delete()
        .eq('user_id', user!.id)
        .eq('target_id', lastSwiped.user_id);
      
      // Re-add to picks
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

  // Calculate active filter count
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
        {/* Filters - show even in empty state */}
        <ConnectFiltersComponent 
          filters={filters}
          onFiltersChange={setFilters}
          activeFilterCount={activeFilterCount}
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
              <Button variant="outline" onClick={() => setFilters({ role: 'all', location: 'all', collabIntent: 'all' })}>
                Clear Filters
              </Button>
            )}
            <Button onClick={() => setShowInvite(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Creators
            </Button>
          </div>
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
          <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
            {/* Match Score Badge - Clickable for AI Explanation */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMatchExplanation(true);
              }}
              className="absolute top-4 right-4 cursor-pointer group"
            >
              <Badge className="bg-primary text-primary-foreground px-3 py-1.5 text-sm gap-1.5 group-hover:bg-primary/90 transition-colors">
                <Lightbulb className="h-3.5 w-3.5" />
                {currentCreator.match_score}% match
              </Badge>
            </button>

            {/* View Profile Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewUserId(currentCreator.user_id);
              }}
            >
              <Eye className="h-5 w-5" />
            </Button>

            {/* Creator Info */}
            <div className="space-y-3">
              <div>
                <h2 className="text-2xl font-bold">{currentCreator.full_name || 'Unknown Creator'}</h2>
                <p className="text-lg text-white/80">{currentCreator.role || 'Creator'}</p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {currentCreator.location && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 gap-1">
                    <MapPin className="h-3 w-3" />
                    {currentCreator.location}
                  </Badge>
                )}
                {currentCreator.collab_intent && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    {getCollabIntentLabel(currentCreator.collab_intent)}
                  </Badge>
                )}
              </div>

              {/* Match Reasons */}
              <div className="space-y-1 pt-2 border-t border-white/20">
                <p className="text-xs text-white/60 uppercase tracking-wide">Why you match</p>
                {currentCreator.match_reasons.map((reason, i) => (
                  <p key={i} className="text-sm text-white/90">{reason}</p>
                ))}
              </div>
            </div>
          </div>
        </SwipeCard>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        {/* Undo */}
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={handleUndo}
          disabled={!lastSwiped || actionLoading}
        >
          <Undo2 className="h-5 w-5" />
        </Button>

        {/* Pass */}
        <Button
          variant="outline"
          size="icon"
          className="h-16 w-16 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => {
            animateSwipe('left');
          }}
          disabled={actionLoading}
        >
          <X className="h-8 w-8" />
        </Button>

        {/* Like */}
        <Button
          size="icon"
          className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 text-white"
          onClick={() => {
            animateSwipe('right');
          }}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Heart className="h-8 w-8 fill-current" />
          )}
        </Button>

        {/* View Profile */}
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={() => setPreviewUserId(currentCreator.user_id)}
        >
          <Eye className="h-5 w-5" />
        </Button>
      </div>

      {/* Swipe Hint */}
      <p className="text-xs text-muted-foreground mt-4">
        Swipe or use buttons • Drag left to pass, right to connect
      </p>

      {/* Profile Preview Dialog */}
      <ProfilePreviewDialog
        userId={previewUserId}
        open={!!previewUserId}
        onOpenChange={(open) => !open && setPreviewUserId(null)}
      />

      {/* AI Match Explanation Dialog */}
      <MatchExplanationDialog
        open={showMatchExplanation}
        onOpenChange={setShowMatchExplanation}
        match={{
          user_id: currentCreator.user_id,
          name: currentCreator.full_name || 'Creator',
          title: currentCreator.role || 'Creator',
          location: currentCreator.location || '',
          image: currentCreator.avatar_url || '',
          matchScore: currentCreator.match_score,
          matchReasons: currentCreator.match_reasons,
        }}
        onConnect={() => animateSwipe('right')}
        onPass={() => animateSwipe('left')}
      />
    </div>
  );
};