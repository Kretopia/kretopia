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
  const [dailySwipesLeft, setDailySwipesLeft] = useState<number>(20);

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
      console.log('[useCircleData] Starting fetch...');
      
      // Get current user profile for AI matching
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, professional_skills, location')
        .eq('user_id', userId)
        .single();

      // SIMPLIFIED: Just get profiles with basic info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url, location, badge, level, professional_skills')
        .neq('user_id', userId)
        .not('full_name', 'is', null)
        .not('bio', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20); // Reduced to 20 for speed

      if (profilesError) {
        console.error('[useCircleData] Query error:', profilesError);
        throw profilesError;
      }

      console.log('[useCircleData] Fetched profiles:', profiles?.length || 0);

      // Simple filtering
      let filtered = profiles || [];
      
      if (filters.role !== 'all') {
        filtered = filtered.filter(p => p.role === filters.role);
      }

      // Filter out profiles with no name/bio
      filtered = filtered.filter(p => 
        p.full_name && 
        p.full_name !== 'New User' && 
        p.bio && 
        p.bio.length > 20
      );

      // Generate AI match explanations for each profile
      const cardsWithAI = await Promise.all(
        filtered.map(async (profile) => {
          try {
            const { data: aiMatch } = await supabase.functions.invoke('generate-match-explanation', {
              body: {
                currentUser: currentUserProfile,
                targetUser: profile
              }
            });

            return {
              id: profile.user_id,
              user_id: profile.user_id,
              name: profile.full_name,
              title: profile.role,
              location: profile.location || 'Remote',
              image: profile.avatar_url || '',
              description: profile.bio || 'Creative professional',
              badge: profile.badge,
              level: profile.level,
              matchScore: aiMatch?.score || 85,
              matchReasons: aiMatch?.reasons || []
            };
          } catch (aiError) {
            console.error('[useCircleData] AI match error:', aiError);
            // Return card without AI insights if generation fails
            return {
              id: profile.user_id,
              user_id: profile.user_id,
              name: profile.full_name,
              title: profile.role,
              location: profile.location || 'Remote',
              image: profile.avatar_url || '',
              description: profile.bio || 'Creative professional',
              badge: profile.badge,
              level: profile.level,
              matchScore: 85,
              matchReasons: []
            };
          }
        })
      );

      console.log('[useCircleData] Transformed cards with AI:', cardsWithAI.length);

      // Set featured creator (OG badge priority)
      const ogCreators = cardsWithAI.filter(c => c.badge === 'og');
      const featuredCandidate = ogCreators.length > 0 ? ogCreators[0] : cardsWithAI[0];
      
      if (featuredCandidate) {
        setFeaturedCreator(featuredCandidate);
        setMatchCards(cardsWithAI.filter(c => c.id !== featuredCandidate.id));
      } else {
        setMatchCards(cardsWithAI);
      }
      
      setDailySwipesLeft(999); // Simplified for beta
    } catch (error: any) {
      console.error('[useCircleData] Error fetching match creators:', error);
      toast.error('Failed to load creators');
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
