import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Heart, X, Clock, RefreshCw, Loader2, MapPin, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDistanceToNow } from "date-fns";

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
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [viewedToday, setViewedToday] = useState<Set<string>>(new Set());

  const DAILY_LIMIT = 10;

  useEffect(() => {
    if (user?.id) {
      loadDailyPicks();
    }
  }, [user?.id]);

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
        .limit(DAILY_LIMIT);

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
        let score = 70; // Base score
        const reasons: string[] = [];

        // Location match bonus
        if (candidate.location && currentProfile?.location && 
            candidate.location.toLowerCase() === currentProfile.location.toLowerCase()) {
          score += 10;
          reasons.push(`📍 Based in ${candidate.location}`);
        }

        // Complementary roles bonus
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

        // Collab intent alignment
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

        // Add some randomization to prevent staleness
        score += Math.floor(Math.random() * 10);

        // Ensure at least one reason
        if (reasons.length === 0) {
          reasons.push(`Active ${candidate.role || 'creator'} in the community`);
        }

        return {
          ...candidate,
          match_score: Math.min(score, 99),
          match_reasons: reasons.slice(0, 3)
        };
      });

      // Sort by score and take top picks
      scoredPicks.sort((a, b) => b.match_score - a.match_score);
      setPicks(scoredPicks.slice(0, DAILY_LIMIT));
      setLastRefresh(new Date());
    } catch (error) {
      console.error('[ForYou] Error loading picks:', error);
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (creator: ForYouCreator, action: 'like' | 'pass') => {
    if (actionLoading) return;
    setActionLoading(creator.user_id);

    try {
      // Record swipe
      const { error: swipeError } = await supabase
        .from('swipes')
        .insert({
          user_id: user!.id,
          target_id: creator.user_id,
          target_type: 'profile',
          direction: action === 'like' ? 'right' : 'left',
          is_super_like: false,
        });

      if (swipeError) throw swipeError;

      // Track analytics
      const { analytics } = await import("@/lib/analytics");
      analytics.swipe(action === 'like' ? 'right' : 'left', creator.user_id);

      // Remove from list
      setPicks(prev => prev.filter(p => p.user_id !== creator.user_id));
      setViewedToday(prev => new Set(prev).add(creator.user_id));

      if (action === 'like') {
        // Check for mutual match
        const { data: theirSwipe } = await supabase
          .from('swipes')
          .select('id')
          .eq('user_id', creator.user_id)
          .eq('target_id', user!.id)
          .eq('direction', 'right')
          .maybeSingle();

        if (theirSwipe) {
          // Create match
          await supabase.from('matches').insert({
            user1_id: user!.id,
            user2_id: creator.user_id,
            match_type: 'creator',
            status: 'active',
          });

          await supabase.from('connections').insert([
            { user_id: user!.id, connected_user_id: creator.user_id, status: 'accepted' },
            { user_id: creator.user_id, connected_user_id: user!.id, status: 'accepted' }
          ]);

          onMatch({
            name: creator.full_name,
            avatar: creator.avatar_url,
            role: creator.role,
            userId: creator.user_id,
          });
        } else {
          toast.success(`Interest sent to ${creator.full_name}! 💫`);
        }
      }
    } catch (error) {
      console.error('[ForYou] Action error:', error);
      toast.error('Something went wrong');
    } finally {
      setActionLoading(null);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Curating your daily picks...</p>
      </div>
    );
  }

  if (picks.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="All caught up!"
        description={`You've viewed all ${DAILY_LIMIT} picks for today. Come back tomorrow for fresh recommendations!`}
        action={{
          label: "Browse All Creators",
          onClick: () => navigate('/circle?tab=browse')
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Today's Top Picks</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {picks.length} creator{picks.length !== 1 ? 's' : ''} curated for you
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            {picks.length}/{DAILY_LIMIT} left
          </Badge>
        </div>
      </Card>

      {/* Picks List */}
      <div className="space-y-3">
        {picks.map((creator, index) => (
          <Card 
            key={creator.user_id} 
            className="p-4 hover:shadow-md transition-all"
          >
            <div className="flex gap-4">
              {/* Avatar */}
              <Avatar 
                className="h-16 w-16 cursor-pointer border-2 border-primary/20"
                onClick={() => setPreviewUserId(creator.user_id)}
              >
                <AvatarImage src={creator.avatar_url} />
                <AvatarFallback className="text-lg">
                  {(creator.full_name || 'U').split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold truncate">{creator.full_name || 'Unknown'}</h4>
                    <p className="text-sm text-muted-foreground">{creator.role || 'Creator'}</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-0 shrink-0">
                    {creator.match_score}% match
                  </Badge>
                </div>

                {/* Location & Intent */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {creator.location && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <MapPin className="h-3 w-3" />
                      {creator.location}
                    </Badge>
                  )}
                  {creator.collab_intent && (
                    <Badge variant="secondary" className="text-xs">
                      {getCollabIntentLabel(creator.collab_intent)}
                    </Badge>
                  )}
                </div>

                {/* Match Reasons */}
                <div className="mt-2 space-y-1">
                  {creator.match_reasons.map((reason, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{reason}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => setPreviewUserId(creator.user_id)}
              >
                <Eye className="h-4 w-4" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleAction(creator, 'pass')}
                disabled={actionLoading === creator.user_id}
              >
                <X className="h-4 w-4" />
                Pass
              </Button>
              <Button
                size="sm"
                className="gap-2 flex-1"
                onClick={() => handleAction(creator, 'like')}
                disabled={actionLoading === creator.user_id}
              >
                {actionLoading === creator.user_id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Heart className="h-4 w-4" />
                )}
                Connect
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Refresh info */}
      {lastRefresh && (
        <p className="text-center text-xs text-muted-foreground">
          Last updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
        </p>
      )}

      {/* Profile Preview Dialog */}
      <ProfilePreviewDialog
        userId={previewUserId}
        open={!!previewUserId}
        onOpenChange={(open) => !open && setPreviewUserId(null)}
      />
    </div>
  );
};
