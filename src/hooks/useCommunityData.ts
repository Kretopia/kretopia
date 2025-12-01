import { useState, useCallback } from "react";
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
  const [loading, setLoading] = useState(false); // Disabled - no auto-fetch
  const [error, setError] = useState<string | null>(null);

  const fetchCommunities = useCallback(async () => {
    // DISABLED: Communities are hidden in MVP
    setLoading(false);
    return;
  }, [userId]);

  const fetchMyCommunities = useCallback(async () => {
    // DISABLED: Communities are hidden in MVP
    return;
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

  // DISABLED: Auto-fetch removed for MVP
  // useEffect(() => {
  //   fetchCommunities();
  // }, [fetchCommunities]);

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
