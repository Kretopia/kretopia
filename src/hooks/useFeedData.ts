import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCachedFeed, setCachedFeed } from "@/lib/feedCache";
import { toast } from "sonner";

interface SparkItem {
  id: string;
  type: 'portfolio' | 'award' | 'credit' | 'press' | 'post' | 'community_post';
  user: {
    id: string;
    name: string;
    avatar: string;
    role: string;
    location?: string;
  };
  content: any;
  created_at: string;
  reactions?: number;
  hasReacted?: boolean;
  isSaved?: boolean;
  comments?: any[];
}

export const useFeedData = (activeTab: 'for-you' | 'following') => {
  const [feed, setFeed] = useState<SparkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBasicFeed = async (userId: string) => {
    console.log('[useFeedData] Fetching basic feed');
    
    // Add 5-second timeout for entire operation
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 5000)
    );
    
    const fetchPromise = (async () => {
      // Fetch posts and portfolio in parallel
      const [postsResult, portfolioResult] = await Promise.all([
        supabase
          .from('feed_posts')
          .select('id, user_id, content, media_urls, media_type, created_at, tags')
          .neq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('portfolio_items')
          .select('id, user_id, title, description, media_url, media_type, thumbnail_url, embed_code, tags, view_count, created_at')
          .neq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      const posts = postsResult.data || [];
      const portfolio = portfolioResult.data || [];

      // Get unique user IDs from both
      const allUserIds = [...new Set([
        ...posts.map(p => p.user_id),
        ...portfolio.map(p => p.user_id)
      ])];

      // Fetch all profiles in one query
      const { data: allProfiles } = allUserIds.length > 0 ? await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .in('user_id', allUserIds) : { data: [] };
      
      const profileMap = new Map<string, { user_id: string; full_name: string; avatar_url: string | null; role: string }>(
        (allProfiles || []).map(p => [p.user_id, p] as [string, typeof p])
      );

      return { posts, portfolio, profileMap };
    })();

    const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
    const { posts, portfolio, profileMap } = result;

    const allItems = [
      ...(posts || []).map(post => {
        const profile = profileMap.get(post.user_id);
        return {
          id: post.id,
          type: 'post' as const,
          user: {
            id: post.user_id,
            name: profile?.full_name || 'Unknown',
            avatar: profile?.avatar_url || '',
            role: profile?.role || ''
          },
          content: { ...post, profile },
          created_at: post.created_at
        };
      }),
      ...(portfolio || []).map(item => {
        const profile = profileMap.get(item.user_id);
        return {
          id: item.id,
          type: 'portfolio' as const,
          user: {
            id: item.user_id,
            name: profile?.full_name || 'Unknown',
            avatar: profile?.avatar_url || '',
            role: profile?.role || ''
          },
          content: { ...item, profiles: profile },
          created_at: item.created_at
        };
      })
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return allItems;
  };

  const fetchAIFeed = async (userId: string, userProfile: any) => {
    console.log('[useFeedData] Fetching AI feed');
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-for-you-feed', {
        body: { userId, userProfile }
      });

      if (error) throw error;
      
      if (data?.feed && Array.isArray(data.feed)) {
        const transformedFeed = data.feed.map((item: any) => ({
          id: item.id,
          type: item.activity_type === 'portfolio_item' ? 'portfolio' : 
                item.activity_type === 'feed_post' ? 'post' : item.activity_type,
          user: {
            id: item.user_id,
            name: item.profiles?.full_name || 'Unknown',
            avatar: item.profiles?.avatar_url || '',
            role: item.profiles?.role || '',
            location: item.profiles?.location
          },
          content: item,
          created_at: item.created_at
        }));
        
        return transformedFeed;
      }
      
      return [];
    } catch (error) {
      console.error('[useFeedData] AI feed error:', error);
      throw error;
    }
  };

  const fetchFollowingFeed = async (userId: string) => {
    console.log('[useFeedData] Fetching following feed');
    
    // Fetch connections and their posts/portfolio in parallel
    const { data: connections } = await supabase
      .from('connections')
      .select('connected_user_id')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    const connectionIds = connections?.map(c => c.connected_user_id) || [];
    
    if (connectionIds.length === 0) {
      return [];
    }

    // Fetch posts and portfolio in parallel
    const [postsResult, portfolioResult] = await Promise.all([
      supabase
        .from('feed_posts')
        .select('id, user_id, content, media_urls, media_type, created_at, tags')
        .in('user_id', connectionIds)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('portfolio_items')
        .select('id, user_id, title, description, media_url, media_type, thumbnail_url, embed_code, tags, view_count, created_at')
        .in('user_id', connectionIds)
        .order('created_at', { ascending: false })
        .limit(20)
    ]);

    const posts = postsResult.data || [];
    const portfolio = portfolioResult.data || [];

    // Get unique user IDs
    const allUserIds = [...new Set([
      ...posts.map(p => p.user_id),
      ...portfolio.map(p => p.user_id)
    ])];

    // Fetch all profiles in one query
    const { data: allProfiles } = allUserIds.length > 0 ? await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, role')
      .in('user_id', allUserIds) : { data: [] };
    
    const profileMap = new Map<string, { user_id: string; full_name: string; avatar_url: string | null; role: string }>(
      (allProfiles || []).map(p => [p.user_id, p] as [string, typeof p])
    );

    const allItems = [
      ...(posts || []).map(post => {
        const profile = profileMap.get(post.user_id);
        return {
          id: post.id,
          type: 'post' as const,
          user: {
            id: post.user_id,
            name: profile?.full_name || 'Unknown',
            avatar: profile?.avatar_url || '',
            role: profile?.role || ''
          },
          content: { ...post, profile },
          created_at: post.created_at
        };
      }),
      ...(portfolio || []).map(item => {
        const profile = profileMap.get(item.user_id);
        return {
          id: item.id,
          type: 'portfolio' as const,
          user: {
            id: item.user_id,
            name: profile?.full_name || 'Unknown',
            avatar: profile?.avatar_url || '',
            role: profile?.role || ''
          },
          content: { ...item, profiles: profile },
          created_at: item.created_at
        };
      })
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return allItems;
  };

  const loadFeed = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Please sign in to view feed");
        setLoading(false);
        return;
      }

      // Check cache first (faster UX)
      const cachedData = getCachedFeed<SparkItem[]>(user.id + activeTab);
      if (cachedData) {
        console.log('[useFeedData] Using cached feed');
        setFeed(cachedData);
        setLoading(false);
        return;
      }

      // Add timeout protection (5 seconds)
      const timeoutPromise = new Promise<SparkItem[]>((_, reject) => {
        setTimeout(() => reject(new Error("Loading timed out. Please refresh.")), 5000);
      });

      const fetchPromise = async (): Promise<SparkItem[]> => {
        let feedData: SparkItem[] = [];

        if (activeTab === 'for-you') {
          // Skip AI feed for now - use basic feed for reliability
          // AI feed causes timeouts and can be added back after optimization
          feedData = await fetchBasicFeed(user.id);
        } else {
          feedData = await fetchFollowingFeed(user.id);
        }

        return feedData;
      };

      const feedData = await Promise.race([fetchPromise(), timeoutPromise]);
      setFeed(feedData);
      setCachedFeed(user.id + activeTab, feedData);
    } catch (err: any) {
      console.error('[useFeedData] Error loading feed:', err);
      setError(err.message || "Failed to load feed");
      
      // Try to show fallback content
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const fallback = await fetchBasicFeed(user.id);
          setFeed(fallback);
          toast("Showing limited content. Pull to refresh.", {
            description: "Some features temporarily unavailable"
          });
        }
      } catch {
        toast.error("Failed to load feed. Please refresh the page.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [activeTab]);

  return { feed, loading, error, refetch: loadFeed };
};
