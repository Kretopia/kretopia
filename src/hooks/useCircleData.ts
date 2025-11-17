import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRemainingSwipes, type SubscriptionTier } from "@/lib/subscriptionLimits";
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
  const [dailySwipesLeft, setDailySwipesLeft] = useState<number>(20);

  const fetchConnections = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
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
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );

      const fetchPromise = (async () => {
        // Get user profile and swipe data in parallel
        const [profileResult, swipesResult, connectionsResult] = await Promise.all([
          supabase.from('profiles').select('daily_swipes').eq('user_id', userId).maybeSingle(),
          supabase.from('swipes').select('target_id').eq('user_id', userId),
          supabase.from('connections')
            .select('user_id, connected_user_id')
            .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)
            .eq('status', 'accepted')
        ]);

        // Update swipes left
        const userProfile = profileResult.data;
        if (userProfile) {
          const remaining = getRemainingSwipes(subscriptionTier, userProfile.daily_swipes || 0);
          setDailySwipesLeft(remaining === -1 ? 999 : remaining);
        }

        const swipedIds = new Set(swipesResult.data?.map(s => s.target_id) || []);
        const connectedUserIds = new Set(
          connectionsResult.data?.map(conn => 
            conn.user_id === userId ? conn.connected_user_id : conn.user_id
          ) || []
        );

        // Fetch creators with optimized query
        let profilesQuery = supabase
          .from('profiles')
          .select('user_id, full_name, role, bio, avatar_url, location, professional_skills, passion_skills, level, badge')
          .neq('user_id', userId)
          .not('full_name', 'is', null)
          .not('bio', 'is', null)
          .not('avatar_url', 'is', null)
          .limit(20);

        if (filters.role !== 'all') {
          profilesQuery = profilesQuery.eq('role', filters.role);
        }
        
        const { data: profiles, error: profilesError } = await profilesQuery;
        
        if (profilesError) throw profilesError;

        // Filter profiles
        const filteredProfiles = (profiles || []).filter(profile => 
          !connectedUserIds.has(profile.user_id) &&
          !swipedIds.has(profile.user_id) &&
          profile.full_name && 
          profile.full_name !== 'New User' && 
          profile.role && 
          profile.avatar_url &&
          profile.bio &&
          profile.bio.length > 20
        );

        // Filter by skills
        const profilesWithSkills = filteredProfiles.filter(profile => {
          const professionalSkills = Array.isArray(profile.professional_skills) ? profile.professional_skills.length : 0;
          const passionSkills = Array.isArray(profile.passion_skills) ? profile.passion_skills.length : 0;
          return (professionalSkills + passionSkills) >= 2;
        });

        // Get portfolio counts
        let profilesWithPortfolio = profilesWithSkills;
        
        if (profilesWithSkills.length > 0) {
          const profileIds = profilesWithSkills.map(p => p.user_id);
          const { data: portfolioCounts } = await supabase
            .from('portfolio_items')
            .select('user_id')
            .in('user_id', profileIds)
            .limit(100);
          
          const portfolioMap = new Map<string, number>();
          portfolioCounts?.forEach(item => {
            portfolioMap.set(item.user_id, (portfolioMap.get(item.user_id) || 0) + 1);
          });

          profilesWithPortfolio = profilesWithSkills.filter(profile => 
            (portfolioMap.get(profile.user_id) || 0) >= 1
          );
        }
        
        // Fallback if no profiles with portfolio
        if (profilesWithPortfolio.length === 0) {
          profilesWithPortfolio = profilesWithSkills.slice(0, 10);
        }

        const creatorCards: CreatorCard[] = profilesWithPortfolio.map(profile => ({
          id: profile.user_id,
          user_id: profile.user_id,
          name: profile.full_name,
          title: profile.role,
          location: profile.location || 'Remote',
          image: profile.avatar_url || '',
          description: profile.bio || 'Creative professional',
          badge: profile.badge,
          level: profile.level
        }));

        // Set featured creator (OG badge priority)
        const ogCreators = creatorCards.filter(c => c.badge === 'og');
        const featuredCandidate = ogCreators.length > 0 ? ogCreators[0] : creatorCards[0];
        
        if (featuredCandidate) {
          setFeaturedCreator(featuredCandidate);
          setMatchCards(creatorCards.filter(c => c.id !== featuredCandidate.id));
        } else {
          setMatchCards(creatorCards);
        }
      })();

      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error: any) {
      console.error('[useCircleData] Error fetching match creators:', error);
      if (error.message !== 'Request timeout') {
        toast.error('Failed to load creators');
      }
      setMatchCards([]);
    } finally {
      setMatchLoading(false);
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
        await supabase
          .from('profiles')
          .update({ daily_swipes: (currentProfile.daily_swipes || 0) + 1 })
          .eq('user_id', userId);
        
        setDailySwipesLeft(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('[useCircleData] Error updating swipe count:', error);
    }
  }, [userId]);

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
    setDailySwipesLeft
  };
};
