import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Community {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_url: string | null;
  member_count: number;
  is_official: boolean;
  is_private: boolean;
  category: string | null;
  location: string | null;
  is_member?: boolean;
}

export const useCommunityData = (userId: string | undefined) => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[useCommunityData] Starting fetch...');
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );
      
      // Fetch all public communities with timeout
      const fetchPromise = supabase
        .from('communities')
        .select('id, name, description, image_url, cover_url, member_count, is_official, is_private, category, location')
        .eq('is_private', false)
        .order('is_official', { ascending: false })
        .order('member_count', { ascending: false })
        .limit(20);

      const { data: allCommunities, error: commError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      if (commError) throw commError;

      console.log('[useCommunityData] Fetched communities:', allCommunities?.length || 0);

      // Always show communities, even if not logged in
      if (!allCommunities || allCommunities.length === 0) {
        console.warn('[useCommunityData] No communities found');
        setCommunities([]);
        setMyCommunities([]);
        setLoading(false);
        return;
      }

      if (!userId) {
        // Not logged in - show all communities as not joined
        setCommunities(allCommunities.map(c => ({ ...c, is_member: false })));
        setMyCommunities([]);
        setLoading(false);
        return;
      }

      // Fetch user's memberships separately
      const { data: memberships, error: memberError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', userId);

      if (memberError) {
        console.warn('[useCommunityData] Failed to fetch memberships:', memberError);
        // Show communities without membership info
        setCommunities(allCommunities.map(c => ({ ...c, is_member: false })));
        setMyCommunities([]);
        setLoading(false);
        return;
      }

      const membershipIds = new Set(memberships?.map(m => m.community_id) || []);

      // Mark which communities user is member of
      const communitiesWithMembership = (allCommunities || []).map(comm => ({
        ...comm,
        is_member: membershipIds.has(comm.id)
      }));

      const discoverCommunities = communitiesWithMembership.filter(c => !c.is_member);
      const joinedCommunities = communitiesWithMembership.filter(c => c.is_member);

      console.log('[useCommunityData] Discover:', discoverCommunities.length, 'My:', joinedCommunities.length);

      setCommunities(discoverCommunities);
      setMyCommunities(joinedCommunities);
    } catch (err: any) {
      console.error('[useCommunityData] Error:', err);
      setError(err.message || 'Failed to load communities');
      // Don't show toast on timeout - just show empty state
      if (!err.message?.includes('timeout')) {
        toast.error('Failed to load communities');
      }
      // Set empty arrays so UI shows empty state instead of infinite loading
      setCommunities([]);
      setMyCommunities([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const joinCommunity = async (communityId: string) => {
    if (!userId) {
      toast.error('Please sign in to join communities');
      return false;
    }

    try {
      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: userId,
          role: 'member'
        });

      if (error) throw error;

      // Update local state optimistically
      const community = communities.find(c => c.id === communityId);
      if (community) {
        setCommunities(prev => prev.filter(c => c.id !== communityId));
        setMyCommunities(prev => [...prev, { ...community, is_member: true }]);
      }

      toast.success('Joined community!');
      return true;
    } catch (err: any) {
      console.error('Error joining community:', err);
      toast.error('Failed to join community');
      return false;
    }
  };

  const leaveCommunity = async (communityId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state optimistically
      const community = myCommunities.find(c => c.id === communityId);
      if (community) {
        setMyCommunities(prev => prev.filter(c => c.id !== communityId));
        setCommunities(prev => [...prev, { ...community, is_member: false }]);
      }

      toast.success('Left community');
      return true;
    } catch (err: any) {
      console.error('Error leaving community:', err);
      toast.error('Failed to leave community');
      return false;
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  return {
    communities,
    myCommunities,
    loading,
    error,
    joinCommunity,
    leaveCommunity,
    refetch: fetchCommunities
  };
};
