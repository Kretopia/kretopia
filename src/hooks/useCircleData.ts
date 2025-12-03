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

      const swipedUserIds = new Set(existingSwipes?.map(s => s.target_id) || []);
      console.log('[useCircleData] Already swiped on:', swipedUserIds.size, 'users');

      // Fetch all potential profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url, location, badge, level, professional_skills')
        .neq('user_id', userId)
        .not('full_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (profilesError) {
        console.error('[useCircleData] Query error:', profilesError);
        throw profilesError;
      }

      console.log('[useCircleData] Raw profiles fetched:', profiles?.length || 0);

      // Filter out already-swiped users in JavaScript (more reliable than Supabase syntax)
      let filtered = (profiles || []).filter(p => !swipedUserIds.has(p.user_id));
      console.log('[useCircleData] After filtering swiped:', filtered.length);
      
      // Apply role filter
      if (filters.role && filters.role !== 'all') {
        filtered = filtered.filter(p => p.role === filters.role);
      }

      // Filter profiles with meaningful content
      filtered = filtered.filter(p => 
        p.full_name && 
        p.full_name !== 'New User' && 
        p.bio && 
        p.bio.length > 10
      );

      console.log('[useCircleData] After quality filter:', filtered.length);

      // Transform profiles to cards
      const cards: CreatorCard[] = filtered.map(profile => ({
        id: profile.user_id, // Use user_id as card id for consistent tracking
        user_id: profile.user_id,
        name: profile.full_name || 'Creator',
        title: profile.role || 'Creative',
        location: profile.location || 'Remote',
        image: profile.avatar_url || '',
        description: profile.bio || '',
        badge: profile.badge,
        level: profile.level,
        matchScore: Math.floor(Math.random() * 15) + 85, // 85-99%
        matchReasons: []
      }));

      console.log('[useCircleData] Final cards:', cards.length);

      // Set featured creator (OG badge priority)
      const ogCreators = cards.filter(c => c.badge === 'og');
      const featuredCandidate = ogCreators.length > 0 ? ogCreators[0] : cards[0];
      
      if (featuredCandidate) {
        setFeaturedCreator(featuredCandidate);
        // Don't filter out featured - include all cards
      }
      
      setMatchCards(cards);
      
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
      
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('daily_swipes, last_swipe_reset')
        .eq('user_id', userId)
        .single();
      
      const today = new Date().toDateString();
      const lastReset = userProfile?.last_swipe_reset ? new Date(userProfile.last_swipe_reset).toDateString() : null;
      
      // Reset swipes if it's a new day
      if (lastReset !== today) {
        await supabase
          .from('profiles')
          .update({ 
            daily_swipes: 0, 
            last_swipe_reset: new Date().toISOString() 
          })
          .eq('user_id', userId);
        
        setDailySwipesLeft(maxSwipes === -1 ? 999 : maxSwipes);
      } else {
        const swipesUsed = userProfile?.daily_swipes || 0;
        const remaining = getRemainingSwipes(subscriptionTier, swipesUsed);
        setDailySwipesLeft(remaining === -1 ? 999 : remaining);
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
        
        setDailySwipesLeft(prev => Math.max(0, prev - 1));
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
