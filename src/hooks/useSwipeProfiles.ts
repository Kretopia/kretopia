import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SwipeProfile {
  user_id: string;
  full_name: string;
  role: string;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  level: number;
  professional_skills: any;
  passion_skills: any;
  badge: string | null;
  collab_intent: string | null;
  portfolio_count?: number;
}

export function useSwipeProfiles(currentUserId: string | undefined) {
  const [profiles, setProfiles] = useState<SwipeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  console.log('[useSwipeProfiles] Hook called with userId:', currentUserId, 'hasFetched:', hasFetched, 'loading:', loading);

  const fetchProfiles = useCallback(async () => {
    console.log('[useSwipeProfiles] fetchProfiles called, userId:', currentUserId);
    
    if (!currentUserId) {
      console.log('[useSwipeProfiles] No current user ID, returning early');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useSwipeProfiles] Starting fetch for user:', currentUserId);

      // Step 1: Get users already swiped on
      const { data: swipedData, error: swipeError } = await supabase
        .from('swipes')
        .select('target_id')
        .eq('user_id', currentUserId)
        .eq('target_type', 'profile');

      if (swipeError) {
        console.error('[useSwipeProfiles] Swipe query error:', swipeError);
      }

      const swipedIds = new Set(swipedData?.map(s => s.target_id) || []);
      console.log('[useSwipeProfiles] Already swiped:', swipedIds.size);

      // Step 2: Get accepted connections (exclude from feed)
      const { data: connectionsOut } = await supabase
        .from('connections')
        .select('connected_user_id')
        .eq('user_id', currentUserId)
        .eq('status', 'accepted');

      const { data: connectionsIn } = await supabase
        .from('connections')
        .select('user_id')
        .eq('connected_user_id', currentUserId)
        .eq('status', 'accepted');

      const connectedIds = new Set([
        ...(connectionsOut?.map(c => c.connected_user_id) || []),
        ...(connectionsIn?.map(c => c.user_id) || [])
      ]);
      console.log('[useSwipeProfiles] Already connected:', connectedIds.size);

      // Step 3: Fetch all profiles except current user with valid avatar, bio, and onboarding complete
      const { data: allProfiles, error: profileError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          role,
          bio,
          avatar_url,
          location,
          level,
          professional_skills,
          passion_skills,
          badge,
          collab_intent,
          onboarding_completed
        `)
        .neq('user_id', currentUserId)
        .not('avatar_url', 'is', null)
        .neq('avatar_url', '')
        .eq('onboarding_completed', true)
        .limit(100);

      if (profileError) {
        console.error('[useSwipeProfiles] Profile fetch error:', profileError);
        throw profileError;
      }

      console.log('[useSwipeProfiles] Total profiles fetched:', allProfiles?.length);

      // Step 4: Filter out swiped, connected users, and profiles not meeting minimum requirements
      let filtered = (allProfiles || []).filter(p => {
        // Not already swiped
        if (swipedIds.has(p.user_id)) return false;
        // Not already connected
        if (connectedIds.has(p.user_id)) return false;
        // Must have bio with minimum 20 characters
        if (!p.bio || p.bio.length < 20) return false;
        return true;
      });

      console.log('[useSwipeProfiles] After filtering:', filtered.length);

      // Step 5: Get portfolio counts and filter profiles that have at least 1 portfolio item
      if (filtered.length > 0) {
        const userIds = filtered.map(p => p.user_id);
        const { data: portfolioData } = await supabase
          .from('portfolio_items')
          .select('user_id')
          .in('user_id', userIds);

        const portfolioCounts = new Map<string, number>();
        portfolioData?.forEach(item => {
          portfolioCounts.set(item.user_id, (portfolioCounts.get(item.user_id) || 0) + 1);
        });

        // Add portfolio count and filter to only include profiles with at least 1 portfolio item
        filtered = filtered
          .map(p => ({
            ...p,
            portfolio_count: portfolioCounts.get(p.user_id) || 0
          }))
          .filter(p => p.portfolio_count >= 1);
        
        console.log('[useSwipeProfiles] After portfolio filter:', filtered.length);
      }

      // Step 6: Shuffle for variety
      const shuffled = filtered.sort(() => Math.random() - 0.5);

      setProfiles(shuffled);
      setHasFetched(true);
      console.log('[useSwipeProfiles] Final profiles:', shuffled.length);

    } catch (err: any) {
      console.error('[useSwipeProfiles] Error:', err);
      setError(err.message || 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Auto-fetch when currentUserId becomes available
  useEffect(() => {
    console.log('[useSwipeProfiles] useEffect triggered - userId:', currentUserId, 'hasFetched:', hasFetched);
    
    if (currentUserId && !hasFetched) {
      console.log('[useSwipeProfiles] Triggering auto-fetch for user:', currentUserId);
      fetchProfiles();
    } else if (!currentUserId) {
      console.log('[useSwipeProfiles] No userId, stopping loading');
      setLoading(false);
    } else {
      console.log('[useSwipeProfiles] Already fetched, not re-fetching');
    }
  }, [currentUserId, hasFetched, fetchProfiles]);

  const removeProfile = useCallback((userId: string) => {
    setProfiles(prev => prev.filter(p => p.user_id !== userId));
  }, []);

  return {
    profiles,
    loading,
    error,
    fetchProfiles,
    removeProfile
  };
}
