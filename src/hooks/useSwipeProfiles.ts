import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SwipeFiltersState, DEFAULT_SWIPE_FILTERS } from '@/components/circle/SwipeFilters';

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
  verification_tier?: string | null;
  instagram_followers?: number | null;
  youtube_subscribers?: number | null;
  tiktok_followers?: number | null;
  twitter_followers?: number | null;
  spotify_listeners?: number | null;
  xp?: number;
  is_claimed?: boolean;
  imported_from_url?: string | null;
}

export function useSwipeProfiles(currentUserId: string | undefined, filters: SwipeFiltersState = DEFAULT_SWIPE_FILTERS) {
  const [profiles, setProfiles] = useState<SwipeProfile[]>([]);
  const [allProfiles, setAllProfiles] = useState<SwipeProfile[]>([]);
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

      // Step 3: Fetch all profiles except current user with valid avatar and bio
      // Include unclaimed profiles (is_claimed = false) which have onboarding_completed = true
      const { data: fetchedProfiles, error: profileError } = await supabase
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
          onboarding_completed,
          verification_tier,
          instagram_followers,
          youtube_subscribers,
          tiktok_followers,
          twitter_followers,
          spotify_listeners,
          xp,
          is_claimed,
          imported_from_url
        `)
        .neq('user_id', currentUserId)
        .not('avatar_url', 'is', null)
        .neq('avatar_url', '')
        .eq('onboarding_completed', true)
        .limit(200);

      if (profileError) {
        console.error('[useSwipeProfiles] Profile fetch error:', profileError);
        throw profileError;
      }

      console.log('[useSwipeProfiles] Total profiles fetched:', fetchedProfiles?.length);

      // Step 4: Filter out swiped, connected users, and profiles not meeting minimum requirements
      let filtered = (fetchedProfiles || []).filter(p => {
        // Not already swiped
        if (swipedIds.has(p.user_id)) return false;
        // Not already connected
        if (connectedIds.has(p.user_id)) return false;
        // Must have bio with minimum 20 characters
        if (!p.bio || p.bio.length < 20) return false;
        return true;
      });

      console.log('[useSwipeProfiles] After filtering:', filtered.length);

      // Step 5: Get portfolio counts - unclaimed profiles skip portfolio requirement
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

        // Add portfolio count - unclaimed profiles don't require portfolio items
        filtered = filtered
          .map(p => ({
            ...p,
            portfolio_count: portfolioCounts.get(p.user_id) || 0
          }))
          .filter(p => {
            // Unclaimed profiles can appear without portfolio items (they have imported credits instead)
            if (p.is_claimed === false) return true;
            // Claimed profiles need at least 1 portfolio item
            return p.portfolio_count >= 1;
          });
        
        console.log('[useSwipeProfiles] After portfolio filter:', filtered.length);
      }

      // Step 6: Shuffle for variety
      const shuffled = filtered.sort(() => Math.random() - 0.5);

      setAllProfiles(shuffled);
      setHasFetched(true);
      console.log('[useSwipeProfiles] Final profiles:', shuffled.length);

    } catch (err: any) {
      console.error('[useSwipeProfiles] Error:', err);
      setError(err.message || 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Apply filters to profiles
  useEffect(() => {
    if (allProfiles.length === 0) {
      setProfiles([]);
      return;
    }

    let filtered = [...allProfiles];

    // Apply role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(p => p.role?.toLowerCase() === filters.role.toLowerCase());
    }

    // Apply location filter
    if (filters.location !== 'all') {
      filtered = filtered.filter(p => p.location?.toLowerCase().includes(filters.location.toLowerCase()));
    }

    // Apply collab intent filter
    if (filters.collabIntent !== 'all') {
      filtered = filtered.filter(p => p.collab_intent === filters.collabIntent);
    }

    // Apply verified only filter (Pro)
    if (filters.verifiedOnly) {
      filtered = filtered.filter(p => 
        p.verification_tier === 'elite' || 
        p.verification_tier === 'industry' || 
        p.verification_tier === 'profile'
      );
    }

    // Apply min followers filter (Pro) - sum all social followers
    if (filters.minFollowers !== 'all') {
      const minCount = parseInt(filters.minFollowers);
      filtered = filtered.filter(p => {
        const totalFollowers = 
          (p.instagram_followers || 0) + 
          (p.youtube_subscribers || 0) + 
          (p.tiktok_followers || 0) + 
          (p.twitter_followers || 0) + 
          (p.spotify_listeners || 0);
        return totalFollowers >= minCount;
      });
    }

    // Apply experience level filter (Pro) - based on XP/level
    if (filters.experienceLevel !== 'all') {
      filtered = filtered.filter(p => {
        const level = p.level || 1;
        switch (filters.experienceLevel) {
          case 'beginner': return level <= 5;
          case 'intermediate': return level > 5 && level <= 15;
          case 'experienced': return level > 15 && level <= 30;
          case 'expert': return level > 30;
          default: return true;
        }
      });
    }

    // Apply AI match filter (Pro) - sort by XP/level as proxy for quality
    if (filters.aiMatchOnly) {
      filtered = filtered
        .filter(p => (p.xp || 0) > 100 || (p.level || 1) > 3)
        .sort((a, b) => ((b.xp || 0) + (b.level || 1) * 100) - ((a.xp || 0) + (a.level || 1) * 100));
    }

    console.log('[useSwipeProfiles] After applying filters:', filtered.length);
    setProfiles(filtered);
  }, [allProfiles, filters]);

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
    setAllProfiles(prev => prev.filter(p => p.user_id !== userId));
  }, []);

  return {
    profiles,
    allProfilesCount: allProfiles.length,
    loading,
    error,
    fetchProfiles,
    removeProfile
  };
}
