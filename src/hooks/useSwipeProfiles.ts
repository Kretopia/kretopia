import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SwipeFiltersState, DEFAULT_SWIPE_FILTERS } from '@/components/circle/SwipeFilters';
import { locationMatchesFilter } from '@/lib/locationGroups';

export interface SwipeProfile {
  id: string;
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
  credits_count?: number;
  awards_count?: number;
  verification_tier?: string | null;
  instagram_followers?: number | null;
  youtube_subscribers?: number | null;
  tiktok_followers?: number | null;
  twitter_followers?: number | null;
  spotify_listeners?: number | null;
  xp?: number;
  is_claimed?: boolean;
  imported_from_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function useSwipeProfiles(currentUserId: string | undefined, filters: SwipeFiltersState = DEFAULT_SWIPE_FILTERS) {
  const [profiles, setProfiles] = useState<SwipeProfile[]>([]);
  const [allProfiles, setAllProfiles] = useState<SwipeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchProfiles = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Get users already swiped on
      const { data: swipedData } = await supabase
        .from('swipes')
        .select('target_id')
        .eq('user_id', currentUserId)
        .eq('target_type', 'profile');

      const swipedIds = new Set(swipedData?.map(s => s.target_id) || []);

      // Step 1b: Get blocked users
      const { data: blockedData } = await supabase
        .from('user_blocks')
        .select('blocked_user_id')
        .eq('blocker_id', currentUserId);

      const { data: blockedByData } = await supabase
        .from('user_blocks')
        .select('blocker_id')
        .eq('blocked_user_id', currentUserId);

      const blockedIds = new Set([
        ...(blockedData?.map(b => b.blocked_user_id) || []),
        ...(blockedByData?.map(b => b.blocker_id) || [])
      ]);

      // Step 2: Get accepted connections
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

      // Step 3: Fetch profiles
      const { data: fetchedProfiles, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id, user_id, full_name, role, bio, avatar_url, location, level,
          professional_skills, passion_skills, badge, collab_intent,
          onboarding_completed, verification_tier,
          instagram_followers, youtube_subscribers, tiktok_followers,
          twitter_followers, spotify_listeners, xp, is_claimed, imported_from_url,
          latitude, longitude
        `)
        .neq('user_id', currentUserId)
        .not('avatar_url', 'is', null)
        .neq('avatar_url', '')
        .eq('onboarding_completed', true)
        .limit(200);

      if (profileError) throw profileError;

      // Step 4: Filter out swiped, connected, blocked
      let filtered = (fetchedProfiles || []).filter(p => {
        if (swipedIds.has(p.user_id)) return false;
        if (connectedIds.has(p.user_id)) return false;
        if (blockedIds.has(p.user_id)) return false;
        if (!p.bio || p.bio.length < 20) return false;
        // Hide non-ODOS unclaimed profiles from discovery
        if (p.is_claimed === false && p.badge !== 'odos') return false;
        // Hide incomplete profiles
        if (!p.full_name || p.full_name === 'New User' || p.full_name === '') return false;
        if (!p.role || p.role === 'Creator' || p.role === '') return false;
        return true;
      });

      // Step 5: Portfolio/credits/awards counts
      if (filtered.length > 0) {
        const userIds = filtered.map(p => p.user_id);
        const [portfolioResult, creditsResult, awardsResult] = await Promise.all([
          supabase.from('credits').select('user_id').in('user_id', userIds),
          supabase.from('credits').select('user_id').in('user_id', userIds),
          supabase.from('awards').select('user_id').in('user_id', userIds)
        ]);

        const portfolioCounts = new Map<string, number>();
        portfolioResult.data?.forEach(item => {
          portfolioCounts.set(item.user_id, (portfolioCounts.get(item.user_id) || 0) + 1);
        });
        const creditsCounts = new Map<string, number>();
        creditsResult.data?.forEach(item => {
          creditsCounts.set(item.user_id, (creditsCounts.get(item.user_id) || 0) + 1);
        });
        const awardsCounts = new Map<string, number>();
        awardsResult.data?.forEach(item => {
          awardsCounts.set(item.user_id, (awardsCounts.get(item.user_id) || 0) + 1);
        });

        filtered = filtered
          .map(p => ({
            ...p,
            portfolio_count: portfolioCounts.get(p.user_id) || 0,
            credits_count: creditsCounts.get(p.user_id) || 0,
            awards_count: awardsCounts.get(p.user_id) || 0
          }))
          .filter(p => (p.portfolio_count >= 1) || (p.credits_count >= 1) || (p.awards_count >= 1));
      }

      // Smart Match scoring — rank by skill/role/location overlap with current user.
      // Falls back to random for new users with thin profiles.
      const { data: meProfile } = await supabase
        .from('profiles')
        .select('role, location, professional_skills, passion_skills')
        .eq('user_id', currentUserId)
        .maybeSingle();

      const extractSkills = (raw: any): string[] => {
        if (!raw) return [];
        const arr = Array.isArray(raw) ? raw : Object.values(raw);
        return arr
          .map((s: any) => (typeof s === 'string' ? s : s?.skill || s?.name || ''))
          .filter(Boolean)
          .map((s: string) => s.toLowerCase());
      };

      const mySkills = new Set([
        ...extractSkills(meProfile?.professional_skills),
        ...extractSkills(meProfile?.passion_skills),
      ]);
      const myRole = (meProfile?.role || '').toLowerCase();
      const myLocation = (meProfile?.location || '').toLowerCase();
      const myCity = myLocation.split(',')[0]?.trim();

      const scoreProfile = (p: typeof filtered[number]): number => {
        let score = 0;
        const theirSkills = extractSkills(p.professional_skills);
        const skillOverlap = theirSkills.filter(s => mySkills.has(s)).length;
        score += Math.min(skillOverlap, 5) * 20; // up to 100
        if (myRole && p.role && p.role.toLowerCase() === myRole) score += 30;
        if (p.location && myLocation && p.location.toLowerCase().includes(myCity || '___')) score += 25;
        // Tie-break: a bit of social proof
        score += Math.min((p.credits_count || 0) + (p.portfolio_count || 0), 10);
        // Small jitter so identical scores don't always render same order
        score += Math.random() * 0.5;
        return score;
      };

      const hasSignal = mySkills.size > 0 || !!myRole || !!myLocation;
      const cacheKey = `swipe_order_${currentUserId}`;
      const cachedOrder = sessionStorage.getItem(cacheKey);
      let ordered: typeof filtered;

      if (cachedOrder) {
        try {
          const orderIds: string[] = JSON.parse(cachedOrder);
          const idSet = new Set(filtered.map(p => p.user_id));
          const orderedFromCache = orderIds
            .filter(id => idSet.has(id))
            .map(id => filtered.find(p => p.user_id === id)!);
          const newProfiles = filtered.filter(p => !orderIds.includes(p.user_id));
          const newOrdered = hasSignal
            ? newProfiles.sort((a, b) => scoreProfile(b) - scoreProfile(a))
            : newProfiles.sort(() => Math.random() - 0.5);
          ordered = [...orderedFromCache, ...newOrdered];
        } catch {
          ordered = hasSignal
            ? filtered.sort((a, b) => scoreProfile(b) - scoreProfile(a))
            : filtered.sort(() => Math.random() - 0.5);
        }
      } else {
        ordered = hasSignal
          ? filtered.sort((a, b) => scoreProfile(b) - scoreProfile(a))
          : filtered.sort(() => Math.random() - 0.5);
      }

      // Cache the order
      sessionStorage.setItem(cacheKey, JSON.stringify(ordered.map(p => p.user_id)));

      setAllProfiles(ordered);
      setHasFetched(true);
    } catch (err: any) {
      console.error('[useSwipeProfiles] Error:', err);
      setError(err.message || 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Apply filters
  useEffect(() => {
    if (allProfiles.length === 0) {
      setProfiles([]);
      return;
    }

    let filtered = [...allProfiles];

    // Multi-role filter
    const roles = filters.roles || [];
    if (roles.length > 0) {
      filtered = filtered.filter(p =>
        roles.some(r => p.role?.toLowerCase() === r.toLowerCase())
      );
    } else if (filters.role && filters.role !== 'all') {
      // Legacy single role
      filtered = filtered.filter(p => p.role?.toLowerCase() === filters.role.toLowerCase());
    }

    // Location filter — cascading country/city
    if (filters.locationCountry && filters.locationCountry !== 'all') {
      filtered = filtered.filter(p =>
        locationMatchesFilter(p.location, filters.locationCountry, filters.locationCity)
      );
    } else if (filters.location && filters.location !== 'all') {
      // Legacy
      filtered = filtered.filter(p => locationMatchesFilter(p.location, filters.location));
    }

    // Near Me — sort by distance using user's coordinates
    if (filters.nearMe && filters.userLat != null && filters.userLon != null) {
      const userLat = filters.userLat;
      const userLon = filters.userLon;
      const toRad = (deg: number) => deg * Math.PI / 180;
      const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // km
      };
      filtered = filtered
        .filter(p => p.latitude != null && p.longitude != null)
        .map(p => ({ ...p, _distance: haversine(userLat, userLon, p.latitude!, p.longitude!) }))
        .sort((a, b) => (a as any)._distance - (b as any)._distance);
    }

    // Collab intent
    if (filters.collabIntent !== 'all') {
      filtered = filtered.filter(p => p.collab_intent === filters.collabIntent);
    }

    // Verified only (Pro)
    if (filters.verifiedOnly) {
      filtered = filtered.filter(p =>
        p.verification_tier === 'elite' || p.verification_tier === 'industry' || p.verification_tier === 'profile'
      );
    }

    // Skills
    if (filters.skills.length > 0) {
      filtered = filtered.filter(p => {
        const profileSkills = Array.isArray(p.professional_skills)
          ? p.professional_skills.map((s: any) => (typeof s === 'string' ? s : s?.skill || '').toLowerCase())
          : [];
        return filters.skills.some(skill => profileSkills.includes(skill.toLowerCase()));
      });
    }

    // Min followers (Pro)
    if (filters.minFollowers !== 'all') {
      const minCount = parseInt(filters.minFollowers);
      filtered = filtered.filter(p => {
        const total = (p.instagram_followers || 0) + (p.youtube_subscribers || 0) +
          (p.tiktok_followers || 0) + (p.twitter_followers || 0) + (p.spotify_listeners || 0);
        return total >= minCount;
      });
    }

    // Experience level (Pro)
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

    // AI match (Pro)
    if (filters.aiMatchOnly) {
      filtered = filtered
        .filter(p => (p.xp || 0) > 100 || (p.level || 1) > 3)
        .sort((a, b) => ((b.xp || 0) + (b.level || 1) * 100) - ((a.xp || 0) + (a.level || 1) * 100));
    }

    setProfiles(filtered);
  }, [allProfiles, filters]);

  // Auto-fetch
  useEffect(() => {
    if (currentUserId && !hasFetched) {
      fetchProfiles();
    } else if (!currentUserId) {
      setLoading(false);
    }
  }, [currentUserId, hasFetched, fetchProfiles]);

  const removeProfile = useCallback((userId: string) => {
    setProfiles(prev => prev.filter(p => p.user_id !== userId));
    setAllProfiles(prev => {
      const updated = prev.filter(p => p.user_id !== userId);
      // Update cached order
      if (currentUserId) {
        sessionStorage.setItem(`swipe_order_${currentUserId}`, JSON.stringify(updated.map(p => p.user_id)));
      }
      return updated;
    });
  }, [currentUserId]);

  return {
    profiles,
    allProfilesCount: allProfiles.length,
    loading,
    error,
    fetchProfiles,
    removeProfile
  };
}
