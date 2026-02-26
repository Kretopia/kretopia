import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRemainingSwipes, type SubscriptionTier, TIER_LIMITS } from "@/lib/subscriptionLimits";
import { toast } from "sonner";

interface Connection {
  user_id: string;
  full_name: string;
  role: string;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  badge: string;
  level: number;
}

interface CreatorCard {
  id: string;
  user_id: string;
  name: string;
  title: string;
  location: string;
  image: string;
  description: string;
  badge?: string;
  level?: number;
  matchScore?: number;
  matchReasons?: string[];
  collab_intent?: string;
  verification_tier?: string;
  verification_status?: string;
  achievement_badges?: string[];
  subscription_tier?: string;
}

interface CreatorFilters {
  role: string;
  minFollowers: number;
  verified: boolean;
  level: string;
  badge: string;
}

export const useCircleData = (userId: string | undefined, subscriptionTier: SubscriptionTier) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [matchCards, setMatchCards] = useState<CreatorCard[]>([]);
  const [featuredCreator, setFeaturedCreator] = useState<CreatorCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [dailySwipesLeft, setDailySwipesLeft] = useState<number>(30);

  const fetchConnections = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );

      const fetchPromise = (async () => {
        // Get connections
        const { data: connectionsData } = await supabase
          .from('connections')
          .select('connected_user_id, user_id')
          .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)
          .eq('status', 'accepted');

        if (!connectionsData || connectionsData.length === 0) {
          return [];
        }

        // Get connected user IDs
        const connectedUserIds = connectionsData.map(c => 
          c.user_id === userId ? c.connected_user_id : c.user_id
        );

        // Fetch profiles separately
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, role, bio, avatar_url, location, badge, level')
          .in('user_id', connectedUserIds);

        return profiles || [];
      })();

      const profiles = await Promise.race([fetchPromise, timeoutPromise]) as Connection[];
      setConnections(profiles);
    } catch (error: any) {
      console.error('[useCircleData] Error fetching connections:', error);
      if (error.message !== 'Request timeout') {
        toast.error('Failed to load your network');
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchMatchCreators = useCallback(async (filters: CreatorFilters) => {
    if (!userId) return;
    
    setMatchLoading(true);
    try {
      console.log('[useCircleData] Starting fetch for user:', userId);
      
      // Get all users current user has already swiped on
      const { data: existingSwipes, error: swipeError } = await supabase
        .from('swipes')
        .select('target_id')
        .eq('user_id', userId);

      if (swipeError) {
        console.error('[useCircleData] Error fetching swipes:', swipeError);
      }

      // Get all users current user is already connected with
      const { data: existingConnections, error: connectionError } = await supabase
        .from('connections')
        .select('connected_user_id, user_id')
        .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (connectionError) {
        console.error('[useCircleData] Error fetching connections:', connectionError);
      }

      // Build set of user IDs to exclude (swiped + connected)
      const swipedUserIds = new Set(existingSwipes?.map(s => s.target_id) || []);
      const connectedUserIds = new Set(
        (existingConnections || []).map(c => 
          c.user_id === userId ? c.connected_user_id : c.user_id
        )
      );
      const excludedUserIds = new Set([...swipedUserIds, ...connectedUserIds]);
      
      console.log('[useCircleData] Already swiped on:', swipedUserIds.size, 'users');
      console.log('[useCircleData] Already connected with:', connectedUserIds.size, 'users');

      // Fetch all potential profiles WITH portfolio count for quality filtering
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url, location, badge, level, professional_skills, collab_intent, verification_tier, verification_status, achievement_badges, subscription_tier')
        .neq('user_id', userId)
        .not('full_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (profilesError) {
        console.error('[useCircleData] Query error:', profilesError);
        throw profilesError;
      }

      console.log('[useCircleData] Raw profiles fetched:', profiles?.length || 0);

      // Filter out already-swiped and already-connected users - use efficient Set lookup
      let filtered = (profiles || []).filter(p => !excludedUserIds.has(p.user_id));
      
      // Apply role filter
      if (filters.role && filters.role !== 'all') {
        filtered = filtered.filter(p => p.role === filters.role);
      }

      // QUALITY FILTER: Only show profiles with valid avatars
      filtered = filtered.filter(p => 
        p.avatar_url && 
        p.avatar_url.startsWith('http')
      );

      console.log('[useCircleData] After filtering:', filtered.length);

      // Transform profiles to cards
      const cards: CreatorCard[] = filtered.map(profile => ({
        id: profile.user_id,
        user_id: profile.user_id,
        name: profile.full_name || 'Creator',
        title: profile.role || 'Creative',
        location: profile.location || 'Remote',
        image: profile.avatar_url || '',
        description: profile.bio || '',
        badge: profile.badge,
        level: profile.level,
        matchScore: Math.floor(Math.random() * 15) + 85,
        matchReasons: [],
        collab_intent: profile.collab_intent,
        verification_tier: profile.verification_tier,
        verification_status: profile.verification_status,
        achievement_badges: profile.achievement_badges as string[] || [],
        subscription_tier: (profile as any).subscription_tier,
        email_verified: (profile as any).email_verified,
        phone_verified: (profile as any).phone_verified,
        id_verified: (profile as any).id_verified,
        payment_verified: (profile as any).payment_verified,
      }));

      // Priority placement: Pro/Founder profiles get boosted to top
      const proCards = cards.filter(c => c.subscription_tier === 'pro' || c.subscription_tier === 'founder');
      const freeCards = cards.filter(c => c.subscription_tier !== 'pro' && c.subscription_tier !== 'founder');
      // Shuffle within each group for fairness, then concatenate
      const shuffleArray = <T,>(arr: T[]): T[] => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };
      const sortedCards = [...shuffleArray(proCards), ...shuffleArray(freeCards)];

      console.log('[useCircleData] Final cards:', sortedCards.length, '(Pro boosted:', proCards.length, ')');

      // Set featured creator (OG badge priority)
      const ogCreators = sortedCards.filter(c => c.badge === 'og');
      const featuredCandidate = ogCreators.length > 0 ? ogCreators[0] : sortedCards[0];
      
      if (featuredCandidate) {
        setFeaturedCreator(featuredCandidate);
      }
      
      setMatchCards(sortedCards);
      
      // Calculate remaining swipes
      await updateSwipesRemaining();
      
    } catch (error: any) {
      console.error('[useCircleData] Error fetching match creators:', error);
      toast.error('Failed to load creators');
      setMatchCards([]);
    } finally {
      setMatchLoading(false);
    }
  }, [userId, subscriptionTier]);

  const updateSwipesRemaining = useCallback(async () => {
    if (!userId) return;

    try {
      const maxSwipes = TIER_LIMITS[subscriptionTier].swipesPerDay;
      
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('daily_swipes, last_swipe_reset')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('[useCircleData] Error fetching swipe data:', error);
        return;
      }
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const lastReset = userProfile?.last_swipe_reset 
        ? new Date(userProfile.last_swipe_reset).toISOString().split('T')[0] 
        : null;
      
      console.log('[useCircleData] Swipe check - today:', today, 'lastReset:', lastReset, 'dailySwipes:', userProfile?.daily_swipes);
      
      // Reset swipes if it's a new day
      if (lastReset !== today) {
        await supabase
          .from('profiles')
          .update({ 
            daily_swipes: 0, 
            last_swipe_reset: new Date().toISOString() 
          })
          .eq('user_id', userId);
        
        const newRemaining = maxSwipes === -1 ? 999 : maxSwipes;
        console.log('[useCircleData] New day - resetting to:', newRemaining);
        setDailySwipesLeft(newRemaining);
      } else {
        const swipesUsed = userProfile?.daily_swipes || 0;
        const remaining = getRemainingSwipes(subscriptionTier, swipesUsed);
        const displayRemaining = remaining === -1 ? 999 : remaining;
        console.log('[useCircleData] Same day - swipesUsed:', swipesUsed, 'remaining:', displayRemaining);
        setDailySwipesLeft(displayRemaining);
      }
    } catch (error) {
      console.error('[useCircleData] Error checking swipes:', error);
    }
  }, [userId, subscriptionTier]);

  const updateSwipeCount = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('daily_swipes')
        .eq('user_id', userId)
        .single();
      
      if (currentProfile) {
        const newCount = (currentProfile.daily_swipes || 0) + 1;
        await supabase
          .from('profiles')
          .update({ daily_swipes: newCount })
          .eq('user_id', userId);
        
        console.log('[useCircleData] Swipe count updated to:', newCount);
        setDailySwipesLeft(prev => {
          const newRemaining = Math.max(0, prev - 1);
          console.log('[useCircleData] Daily swipes left updated:', prev, '->', newRemaining);
          return newRemaining;
        });
      }
    } catch (error) {
      console.error('[useCircleData] Error updating swipe count:', error);
    }
  }, [userId]);

  // Remove a card from the local state after swiping
  const removeCard = useCallback((cardId: string) => {
    setMatchCards(prev => prev.filter(card => card.id !== cardId));
  }, []);

  return {
    connections,
    matchCards,
    featuredCreator,
    loading,
    matchLoading,
    dailySwipesLeft,
    fetchConnections,
    fetchMatchCreators,
    updateSwipeCount,
    setDailySwipesLeft,
    removeCard
  };
};
