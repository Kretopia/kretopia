import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageCircle, 
  Share2, 
  ExternalLink,
  Loader2,
  Flame,
  Sparkles,
  Users,
  MapPin,
  Trophy,
  Award,
  Newspaper,
  Film,
  UserPlus,
  Send,
  Play,
  Bookmark,
  Paperclip
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { SEO } from "@/components/SEO";
import { DirectMessageDialog } from "@/components/DirectMessageDialog";
import { MediaPlayerModal } from "@/components/profile/MediaPlayerModal";
import { SavedSparksDialog } from "@/components/SavedSparksDialog";
import { toast as sonnerToast } from "sonner";
import DOMPurify from "dompurify";
import { getCachedFeed, setCachedFeed } from "@/lib/feedCache";

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
  showComments?: boolean;
  commentText?: string;
}

const Circle = () => {
  const [sparkFeed, setSparkFeed] = useState<SparkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [showSavedSparks, setShowSavedSparks] = useState(false);
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const loadFeed = async () => {
      if (isMounted) {
        await fetchSparkFeed(activeTab);
      }
    };

    loadFeed();
    
    // Track page view
    const trackPageView = async () => {
      const { analytics } = await import("@/lib/analytics");
      analytics.pageView("spark");
    };
    trackPageView();

    // REMOVED: Real-time subscriptions for better performance
    // Users can manually refresh to see new content

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // Simplified feed fetch - skip AI edge function for speed
  const fetchForYouFeed = async (userId: string) => {
    console.log('[Spark] Fetching For You feed for user:', userId);
    
    try {
      // Fetch recent content from ALL users (limit 20 each for speed)
      const [postsData, portfolioData] = await Promise.all([
        supabase
          .from('feed_posts')
          .select('id, user_id, content, media_urls, media_type, created_at, tags')
          .neq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('portfolio_items')
          .select('id, user_id, title, description, media_url, media_type, thumbnail_url, created_at')
          .neq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      const posts = postsData.data || [];
      const portfolio = portfolioData.data || [];
      
      // Get unique user IDs
      const userIds = [...new Set([
        ...posts.map(p => p.user_id),
        ...portfolio.map(p => p.user_id)
      ])];

      if (userIds.length === 0) {
        setSparkFeed([]);
        setLoading(false);
        return;
      }

      // Fetch all profiles at once
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, location')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Combine and transform
      const allItems: SparkItem[] = [
        ...posts.map(post => {
          const profile = profileMap.get(post.user_id);
          return profile ? {
            id: post.id,
            type: 'post' as const,
            user: {
              id: post.user_id,
              name: profile.full_name,
              avatar: profile.avatar_url || '',
              role: profile.role || 'Creator',
              location: profile.location
            },
            content: post,
            created_at: post.created_at,
            reactions: 0,
            hasReacted: false,
            isSaved: false,
            showComments: false,
            comments: [],
            commentText: ''
          } : null;
        }),
        ...portfolio.map(item => {
          const profile = profileMap.get(item.user_id);
          return profile ? {
            id: item.id,
            type: 'portfolio' as const,
            user: {
              id: item.user_id,
              name: profile.full_name,
              avatar: profile.avatar_url || '',
              role: profile.role || 'Creator',
              location: profile.location
            },
            content: item,
            created_at: item.created_at,
            reactions: 0,
            hasReacted: false,
            isSaved: false,
            showComments: false,
            comments: [],
            commentText: ''
          } : null;
        })
      ].filter(Boolean) as SparkItem[];

      // Sort by date
      allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('[Spark] Feed loaded:', allItems.length, 'items');
      setSparkFeed(allItems);
      setCachedFeed(userId, allItems);
      setLoading(false);
    } catch (error) {
      console.error('[Spark] Error fetching For You feed:', error);
      setSparkFeed([]);
      setLoading(false);
    }
  };

  // Fetch content from connections only
  const fetchFollowingFeed = async (userId: string) => {
    console.log('[Spark] Starting following feed fetch for user:', userId);
    
    try {
      // Get user's connections
      const { data: connections } = await supabase
        .from('connections')
        .select('connected_user_id, user_id')
        .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)
        .eq('status', 'accepted');

      const connectedUserIds = connections?.map(c => 
        c.user_id === userId ? c.connected_user_id : c.user_id
      ) || [];

      // Include user's own content
      const userIdsToFetch = [userId, ...connectedUserIds];

      if (userIdsToFetch.length === 0) {
        setSparkFeed([]);
        setLoading(false);
        return;
      }

      // Fetch content from user and connections
      const [feedPostsData, portfolioData] = await Promise.all([
        supabase
          .from('feed_posts')
          .select('id, user_id, content, media_urls, media_type, created_at')
          .in('user_id', userIdsToFetch)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('portfolio_items')
          .select('id, user_id, title, description, media_url, media_type, thumbnail_url, embed_code, tags, view_count, created_at')
          .in('user_id', userIdsToFetch)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);
      
      const feedPostsError = feedPostsData.error;
      const portfolioError = portfolioData.error;

      console.log('[Spark] Following feed data fetched:', {
        posts: { count: feedPostsData?.data?.length || 0, error: feedPostsError },
        portfolio: { count: portfolioData?.data?.length || 0, error: portfolioError }
      });

      const feedPosts = feedPostsData.data || [];
      const portfolioItems = portfolioData.data || [];
      
      const allUserIds = [
        ...feedPosts.map(item => item.user_id),
        ...portfolioItems.map(item => item.user_id)
      ];

      if (allUserIds.length === 0) {
        setSparkFeed([]);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, location')
        .in('user_id', [...new Set(allUserIds)]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const allContent = [
        ...feedPosts.map(item => ({ 
          ...item, 
          activity_type: 'feed_post', 
          profile: profileMap.get(item.user_id) 
        })),
        ...portfolioItems.map(item => ({ 
          ...item, 
          activity_type: 'portfolio', 
          profile: profileMap.get(item.user_id) 
        }))
      ];

      const filteredContent = allContent
        .filter(item => item.profile?.full_name)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 30);

      const feed: SparkItem[] = filteredContent.map((item: any) => {
        const profile = item.profile;
        return {
          id: item.id,
          type: item.activity_type === 'feed_post' ? 'post' : item.activity_type,
          user: {
            id: item.user_id,
            name: profile.full_name,
            avatar: profile.avatar_url || '',
            role: profile.role || 'Creator',
            location: profile.location || undefined
          },
          content: item,
          created_at: item.created_at,
          reactions: 0,
          showComments: false,
          comments: [],
          commentText: ''
        };
      });

      setSparkFeed(feed);
      setLoading(false);
    } catch (error) {
      console.error('[Spark] Error loading following feed:', error);
      setSparkFeed([]);
      setLoading(false);
    }
  };

  // Fetch community posts only
  const fetchCommunitiesFeed = async (userId: string) => {
    console.log('[Spark] Starting communities feed fetch for user:', userId);
    
    try {
      // Get user's community memberships
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', userId);

      const communityIds = memberships?.map(m => m.community_id) || [];

      if (communityIds.length === 0) {
        setSparkFeed([]);
        setLoading(false);
        return;
      }

      // Fetch community posts
      const { data: communityPostsData, error: communityError } = await supabase
        .from('community_posts')
        .select('id, user_id, community_id, content, media_urls, media_type, created_at')
        .in('community_id', communityIds)
        .order('created_at', { ascending: false })
        .limit(30);

      console.log('[Spark] Community posts data:', {
        count: communityPostsData?.length || 0,
        error: communityError
      });

      const communityPosts = communityPostsData || [];
      const allUserIds = communityPosts.map(item => item.user_id);

      if (allUserIds.length === 0) {
        setSparkFeed([]);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, location')
        .in('user_id', [...new Set(allUserIds)]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const feed: SparkItem[] = communityPosts
        .filter(item => profileMap.get(item.user_id)?.full_name)
        .map((item: any) => {
          const profile = profileMap.get(item.user_id);
          return {
            id: item.id,
            type: 'community_post',
            user: {
              id: item.user_id,
              name: profile!.full_name,
              avatar: profile!.avatar_url || '',
              role: profile!.role || 'Creator',
              location: profile!.location || undefined
            },
            content: item,
            created_at: item.created_at,
            reactions: 0,
            showComments: false,
            comments: [],
            commentText: ''
          };
        });

      setSparkFeed(feed);
      setLoading(false);
    } catch (error) {
      console.error('[Spark] Error loading communities feed:', error);
      setSparkFeed([]);
      setLoading(false);
    }
  };

  // Main feed fetch coordinator
  const fetchSparkFeed = async (tab: 'for-you' | 'following' = 'for-you') => {
    try {
      console.log('[Spark] fetchSparkFeed started for tab:', tab);
      setLoading(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[Spark] Auth error:', userError);
        setLoading(false);
        return;
      }
      
      if (!user) {
        console.log('[Spark] No user found');
        setLoading(false);
        return;
      }

      console.log('[Spark] User found:', user.id);

      // Set a timeout for the entire fetch operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 20000); // 20 second timeout
      });

      // Route to appropriate feed based on tab with caching
      const fetchPromise = async () => {
        if (tab === 'following') {
          await fetchFollowingFeed(user.id);
        } else {
          // For You tab - check cache first
          const cached = getCachedFeed<SparkItem[]>(user.id);
          if (cached && cached.length > 0) {
            console.log('[Spark] Using cached feed with', cached.length, 'items');
            setSparkFeed(cached);
            setLoading(false);
            return;
          }
          
          console.log('[Spark] No cache, fetching fresh feed...');
          await fetchForYouFeed(user.id);
        }
      };

      await Promise.race([fetchPromise(), timeoutPromise]);
    } catch (error: any) {
      console.error('[Spark] Error in fetchSparkFeed:', error);
      
      // Show user-friendly error
      if (error.message === 'Request timeout') {
        toast({
          title: "Loading slowly",
          description: "Using limited content",
          variant: "default"
        });
      } else {
        toast({
          title: "Error loading feed",
          description: "Please try again",
          variant: "destructive"
        });
      }
      
      setSparkFeed([]);
      setLoading(false);
    }
  };

  const handleConnect = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          user_id: user.id,
          connected_user_id: userId,
          status: 'pending'
        });

      if (error) throw error;

      // Track connection request
      const { analytics } = await import("@/lib/analytics");
      analytics.connectionRequest(userId);

      toast({
        title: "Connection request sent",
        description: "They'll be notified of your request"
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Connection failed",
        description: "Could not send request",
        variant: "destructive"
      });
    }
  };

  const handleMessage = (userId: string, userName: string, userAvatar: string) => {
    setSelectedUser({ user_id: userId, full_name: userName, avatar_url: userAvatar });
    setShowMessageDialog(true);
  };

  const handleReaction = async (itemId: string, itemType: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (itemType === 'portfolio') {
      // Check if user already reacted
      const { data: existing } = await supabase
        .from('portfolio_reactions')
        .select('id')
        .eq('portfolio_item_id', itemId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Remove reaction
        await supabase
          .from('portfolio_reactions')
          .delete()
          .eq('id', existing.id);
      } else {
        // Add reaction
        await supabase
          .from('portfolio_reactions')
          .insert([{ portfolio_item_id: itemId, user_id: user.id }]);
      }

      // Update local state
      setSparkFeed(prev => prev.map(item => {
        if (item.id === itemId) {
          const newReactions = existing ? (item.reactions || 1) - 1 : (item.reactions || 0) + 1;
          return { ...item, reactions: newReactions, hasReacted: !existing };
        }
        return item;
      }));
    } else if (itemType === 'post') {
      // Check if user already reacted
      const { data: existing } = await supabase
        .from('feed_reactions')
        .select('id')
        .eq('post_id', itemId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Remove reaction
        await supabase
          .from('feed_reactions')
          .delete()
          .eq('id', existing.id);
      } else {
        // Add reaction
        await supabase
          .from('feed_reactions')
          .insert([{ post_id: itemId, user_id: user.id }]);
      }

      // Update local state
      setSparkFeed(prev => prev.map(item => {
        if (item.id === itemId) {
          const newReactions = existing ? (item.reactions || 1) - 1 : (item.reactions || 0) + 1;
          return { ...item, reactions: newReactions, hasReacted: !existing };
        }
        return item;
      }));
    } else if (itemType === 'community_post') {
      // Check if user already reacted
      const { data: existing } = await supabase
        .from('community_post_reactions')
        .select('id')
        .eq('post_id', itemId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Remove reaction
        await supabase
          .from('community_post_reactions')
          .delete()
          .eq('id', existing.id);
      } else {
        // Add reaction
        await supabase
          .from('community_post_reactions')
          .insert([{ post_id: itemId, user_id: user.id }]);
      }

      // Update local state
      setSparkFeed(prev => prev.map(item => {
        if (item.id === itemId) {
          const newReactions = existing ? (item.reactions || 1) - 1 : (item.reactions || 0) + 1;
          return { ...item, reactions: newReactions, hasReacted: !existing };
        }
        return item;
      }));
    }
  };

  const handleBookmark = async (itemId: string, itemType: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_sparks')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .single();

    if (existing) {
      // Remove bookmark
      await supabase
        .from('saved_sparks')
        .delete()
        .eq('id', existing.id);
      
      sonnerToast.success("Unclipped!");
    } else {
      // Add bookmark
      await supabase
        .from('saved_sparks')
        .insert([{ user_id: user.id, item_type: itemType, item_id: itemId }]);
      
      sonnerToast.success("Clipped! View in your collection");
    }

    // Update local state
    setSparkFeed(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, isSaved: !existing };
      }
      return item;
    }));
  };

  const toggleComments = async (itemId: string, itemType: string) => {
    const item = sparkFeed.find(i => i.id === itemId);
    if (!item) return;

    const isOpening = !item.showComments;
    
    // Toggle the comments section
    setSparkFeed(feed => feed.map(i => 
      i.id === itemId ? { ...i, showComments: !i.showComments } : i
    ));

    // If opening and no comments loaded yet, fetch them
    if (isOpening && !item.comments) {
      await fetchCommentsForItem(itemId, itemType);
    }
  };

  const handleCommentSubmit = async (itemId: string, itemType: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const item = sparkFeed.find(i => i.id === itemId);
    if (!item || !item.commentText?.trim()) return;

    let tableName = '';
    let columnName = '';

    switch (itemType) {
      case 'portfolio':
        tableName = 'portfolio_comments';
        columnName = 'portfolio_item_id';
        break;
      case 'award':
        tableName = 'award_comments';
        columnName = 'award_id';
        break;
      case 'press':
        tableName = 'press_comments';
        columnName = 'press_link_id';
        break;
      case 'credit':
        tableName = 'credit_comments';
        columnName = 'credit_id';
        break;
      case 'post':
        tableName = 'feed_comments';
        columnName = 'post_id';
        break;
      case 'community_post':
        tableName = 'community_post_comments';
        columnName = 'post_id';
        break;
      default:
        return;
    }

    try {
      const { error } = await supabase
        .from(tableName as any)
        .insert([{
          [columnName]: itemId,
          user_id: user.id,
          content: item.commentText
        }]);

      if (error) throw error;

      // Refresh comments
      await fetchCommentsForItem(itemId, itemType);
      
      // Clear comment text
      setSparkFeed(feed => feed.map(i => 
        i.id === itemId ? { ...i, commentText: '' } : i
      ));

      sonnerToast.success("Comment posted!");
    } catch (error) {
      console.error('Error adding comment:', error);
      sonnerToast.error("Failed to add comment");
    }
  };

  const fetchCommentsForItem = async (itemId: string, itemType: string) => {
    let tableName = '';
    let columnName = '';

    switch (itemType) {
      case 'portfolio':
        tableName = 'portfolio_comments';
        columnName = 'portfolio_item_id';
        break;
      case 'award':
        tableName = 'award_comments';
        columnName = 'award_id';
        break;
      case 'press':
        tableName = 'press_comments';
        columnName = 'press_link_id';
        break;
      case 'credit':
        tableName = 'credit_comments';
        columnName = 'credit_id';
        break;
      case 'post':
        tableName = 'feed_comments';
        columnName = 'post_id';
        break;
      case 'community_post':
        tableName = 'community_post_comments';
        columnName = 'post_id';
        break;
      default:
        return;
    }

    const { data } = await supabase
      .from(tableName as any)
      .select('*, profiles:user_id(full_name, avatar_url)')
      .eq(columnName, itemId)
      .order('created_at', { ascending: true });

    setSparkFeed(feed => feed.map(i => 
      i.id === itemId ? { ...i, comments: data || [] } : i
    ));
  };

  const updateCommentText = (itemId: string, text: string) => {
    setSparkFeed(feed => feed.map(i => 
      i.id === itemId ? { ...i, commentText: text } : i
    ));
  };

  const renderSparkItem = (item: SparkItem) => {
    return (
      <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <Link 
              to={`/profile/${item.user.id}`} 
              className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
            >
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarImage src={item.user.avatar} />
                <AvatarFallback>{item.user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold truncate text-base">{item.user.name}</p>
                <p className="text-sm text-muted-foreground truncate">{item.user.role}</p>
                {item.user.location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {item.user.location}
                  </p>
                )}
              </div>
            </Link>
            <Badge variant="outline" className="flex-shrink-0 ml-2 capitalize">
              {item.type === 'portfolio' && <Film className="h-3 w-3 mr-1" />}
              {item.type === 'award' && <Trophy className="h-3 w-3 mr-1" />}
              {item.type === 'press' && <Newspaper className="h-3 w-3 mr-1" />}
              {item.type === 'credit' && <Award className="h-3 w-3 mr-1" />}
              {item.type === 'post' && <Sparkles className="h-3 w-3 mr-1" />}
              {item.type === 'community_post' && <Users className="h-3 w-3 mr-1" />}
              {item.type === 'community_post' ? 'Community' : item.type}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Content based on type */}
          {item.type === 'portfolio' && (
            <div>
              {(() => {
                // Handle YouTube embeds
                if (item.content.media_url?.includes('youtube.com') || item.content.media_url?.includes('youtu.be')) {
                  const videoId = item.content.media_url.includes('youtu.be') 
                    ? item.content.media_url.split('youtu.be/')[1]?.split('?')[0]
                    : new URL(item.content.media_url).searchParams.get('v');
                  
                  return videoId ? (
                    <div className="relative w-full mb-2 rounded-md overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        className="absolute top-0 left-0 w-full h-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  ) : null;
                }
                
                // Handle Spotify embeds
                if (item.content.media_url?.includes('spotify.com')) {
                  const spotifyId = item.content.media_url.split('spotify.com/')[1];
                  return spotifyId ? (
                    <div className="w-full mb-2">
                      <iframe
                        src={`https://open.spotify.com/embed/${spotifyId}`}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                      />
                    </div>
                  ) : null;
                }

                // Handle Vimeo embeds
                if (item.content.media_url?.includes('vimeo.com')) {
                  const vimeoId = item.content.media_url.split('vimeo.com/')[1]?.split('?')[0];
                  return vimeoId ? (
                    <div className="relative w-full mb-2 rounded-md overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        src={`https://player.vimeo.com/video/${vimeoId}`}
                        className="absolute top-0 left-0 w-full h-full"
                        allowFullScreen
                        allow="autoplay; fullscreen; picture-in-picture"
                      />
                    </div>
                  ) : null;
                }

                // Handle SoundCloud embeds
                if (item.content.media_url?.includes('soundcloud.com')) {
                  return (
                    <div className="w-full mb-2">
                      <iframe
                        width="100%"
                        height="166"
                        scrolling="no"
                        frameBorder="no"
                        allow="autoplay"
                        src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(item.content.media_url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`}
                      />
                    </div>
                  );
                }
                
                // Handle direct media files
                if (item.content.thumbnail_url || item.content.media_url) {
                  if (item.content.media_type === 'video' || item.content.media_url?.match(/\.(mp4|mov|avi|webm)$/i)) {
                    return (
                      <div 
                        className="relative w-full rounded-md mb-2 max-h-96 cursor-pointer group"
                        onClick={() => setSelectedMedia({
                          title: item.content.title,
                          description: item.content.description,
                          media_type: 'video',
                          media_url: item.content.media_url
                        })}
                      >
                        <img 
                          src={item.content.thumbnail_url || item.content.media_url} 
                          alt={item.content.title}
                          className="w-full h-full object-cover rounded-md"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="h-16 w-16 text-white" fill="white" />
                        </div>
                      </div>
                    );
                  }
                  
                  if (item.content.media_type === 'audio' || item.content.media_url?.match(/\.(mp3|wav|ogg|m4a)$/i)) {
                    return (
                      <div className="w-full mb-2">
                        <audio 
                          controls 
                          className="w-full"
                        >
                          <source src={item.content.media_url} />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    );
                  }
                  
                  return (
                    <img 
                      src={item.content.thumbnail_url || item.content.media_url} 
                      alt={item.content.title}
                      className="w-full h-auto object-cover rounded-md mb-2 max-h-96"
                    />
                  );
                }
                
                return null;
              })()}
              <h3 className="font-semibold text-lg">{item.content.title}</h3>
              {item.content.description && (
                <p className="text-sm text-muted-foreground mt-1">{item.content.description}</p>
              )}
            </div>
          )}

          {item.type === 'award' && (
            <div>
              {item.content.image_url && (
                <img 
                  src={item.content.image_url} 
                  alt={item.content.title}
                  className="w-full h-auto object-cover rounded-md mb-2 max-h-96"
                />
              )}
              <h3 className="font-semibold text-lg">{item.content.title}</h3>
              <p className="text-sm text-muted-foreground">{item.content.organization}</p>
              {item.content.description && (
                <p className="text-sm mt-1">{item.content.description}</p>
              )}
            </div>
          )}

          {item.type === 'press' && (
            <div>
              {item.content.thumbnail_url && (
                <img 
                  src={item.content.thumbnail_url} 
                  alt={item.content.title}
                  className="w-full h-auto object-cover rounded-md mb-2 max-h-96"
                />
              )}
              <h3 className="font-semibold text-lg">{item.content.title}</h3>
              <p className="text-sm text-muted-foreground">{item.content.publication}</p>
              {item.content.excerpt && (
                <p className="text-sm mt-1 line-clamp-2">{item.content.excerpt}</p>
              )}
              {item.content.url && (
                <a 
                  href={item.content.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary flex items-center gap-1 mt-2 hover:underline"
                >
                  Read article <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {item.type === 'credit' && (
            <div>
              {item.content.thumbnail_url && (
                <>
                  {item.content.thumbnail_url.match(/\.(mp4|mov|avi|webm)$/i) ? (
                    <div 
                      className="relative w-full rounded-md mb-2 max-h-96 cursor-pointer group"
                      onClick={() => setSelectedMedia({
                        title: item.content.project_name,
                        description: `${item.content.role} • ${item.content.platform}`,
                        media_type: 'video',
                        media_url: item.content.thumbnail_url
                      })}
                    >
                      <video 
                        className="w-full h-full object-cover rounded-md"
                        muted
                      >
                        <source src={item.content.thumbnail_url} type="video/mp4" />
                      </video>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-16 w-16 text-white" fill="white" />
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={item.content.thumbnail_url} 
                      alt={item.content.project_name}
                      className="w-full h-auto object-cover rounded-md mb-2 max-h-96"
                    />
                  )}
                </>
              )}
              <h3 className="font-semibold text-lg">{item.content.project_name}</h3>
              <p className="text-sm text-muted-foreground">
                {item.content.role} • {item.content.platform} ({item.content.year})
              </p>
            </div>
          )}

          {item.type === 'post' && (
            <div>
              {item.content.image_url && (
                <>
                  {item.content.image_url.match(/\.(mp4|mov|avi|webm)$/i) ? (
                    <div 
                      className="relative w-full rounded-md mb-2 max-h-96 cursor-pointer group"
                      onClick={() => setSelectedMedia({
                        title: 'Video Post',
                        description: '',
                        media_type: 'video',
                        media_url: item.content.image_url
                      })}
                    >
                      <video 
                        className="w-full h-full object-cover rounded-md"
                        muted
                      >
                        <source src={item.content.image_url} type="video/mp4" />
                      </video>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-16 w-16 text-white" fill="white" />
                      </div>
                    </div>
                  ) : item.content.image_url.match(/\.(mp3|wav|ogg|m4a)$/i) ? (
                    <div className="w-full mb-2">
                      <audio 
                        controls 
                        className="w-full"
                      >
                        <source src={item.content.image_url} />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  ) : (
                    <img 
                      src={item.content.image_url} 
                      alt="Post"
                      className="w-full h-auto object-cover rounded-md mb-2 max-h-96"
                    />
                  )}
                </>
              )}
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(item.content.content || '') 
                }}
              />
            </div>
          )}

          {item.type === 'community_post' && (
            <div>
              {item.content.media_urls && item.content.media_urls.length > 0 && (
                <>
                  {item.content.media_urls[0].match(/\.(mp4|mov|avi|webm)$/i) ? (
                    <div 
                      className="relative w-full rounded-md mb-2 max-h-96 cursor-pointer group"
                      onClick={() => setSelectedMedia({
                        title: 'Community Video',
                        description: '',
                        media_type: 'video',
                        media_url: item.content.media_urls[0]
                      })}
                    >
                      <video 
                        className="w-full h-full object-cover rounded-md"
                        muted
                      >
                        <source src={item.content.media_urls[0]} type="video/mp4" />
                      </video>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-16 w-16 text-white" fill="white" />
                      </div>
                    </div>
                  ) : item.content.media_urls[0].match(/\.(mp3|wav|ogg|m4a)$/i) ? (
                    <div className="w-full mb-2">
                      <audio 
                        controls 
                        className="w-full"
                      >
                        <source src={item.content.media_urls[0]} />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  ) : (
                    <img 
                      src={item.content.media_urls[0]} 
                      alt="Community Post"
                      className="w-full h-auto object-cover rounded-md mb-2 max-h-96"
                    />
                  )}
                </>
              )}
              <p className="text-sm">{item.content.content}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleReaction(item.id, item.type)}
                  className={`gap-1.5 ${item.hasReacted ? 'text-orange-500' : ''}`}
                >
                  <Flame className={`h-5 w-5 ${item.hasReacted ? 'fill-orange-500' : ''}`} />
                  <span className="text-sm font-medium">{item.reactions || 0}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => toggleComments(item.id, item.type)}
                  className="gap-1.5"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.comments?.length || 0}</span>
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBookmark(item.id, item.type)}
              >
                <Paperclip className={`h-5 w-5 ${item.isSaved ? 'fill-current' : ''}`} />
              </Button>
            </div>

            {/* Comments Section */}
            {item.showComments && (
              <div className="space-y-3 pt-3 border-t">
                {/* Existing Comments */}
                {item.comments?.map((comment: any) => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.profiles?.avatar_url} />
                      <AvatarFallback>{comment.profiles?.full_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-muted rounded-lg p-2">
                        <p className="text-sm font-semibold">{comment.profiles?.full_name}</p>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Add Comment */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={item.commentText || ''}
                    onChange={(e) => updateCommentText(item.id, e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <Button
                    size="icon"
                    onClick={() => handleCommentSubmit(item.id, item.type)}
                    disabled={!item.commentText?.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <SEO
        title="Spark - ThriveIN"
        description="AI-powered personalized feed - Share your spark, get feedback from peers, get inspiration"
      />
      <div className="min-h-screen p-4 sm:p-6">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Spark</h1>
              <p className="text-sm text-muted-foreground">Share your spark, get feedback from peers, get inspiration</p>
            </div>
            <Button
              onClick={() => setShowSavedSparks(true)}
              variant="outline"
              className="gap-2"
            >
              <Paperclip className="h-4 w-4" />
              <span className="hidden sm:inline">Clipped</span>
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => {
            setActiveTab(v as 'for-you' | 'following');
            setLoading(true);
          }} className="w-full">
            <TabsList className="w-full mb-6 h-auto">
              <TabsTrigger value="for-you" className="flex-1 gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>For You</span>
              </TabsTrigger>
              <TabsTrigger value="following" className="flex-1 gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Following</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="for-you" className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : sparkFeed.length === 0 ? (
                <Card className="p-8 text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No content yet</h3>
                  <p className="text-muted-foreground mb-4">
                    AI-powered feed will show personalized content based on your interests
                  </p>
                  <Button onClick={() => navigate('/circle')}>
                    Explore Creators
                  </Button>
                </Card>
              ) : (
                <div className="space-y-6">
                  {sparkFeed.map(renderSparkItem)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="following" className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : sparkFeed.length === 0 ? (
                <Card className="p-8 text-center">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Connect with creators to see their latest work here
                  </p>
                  <Button onClick={() => navigate('/circle')}>
                    Find Connections
                  </Button>
                </Card>
              ) : (
                <div className="space-y-6">
                  {sparkFeed.map(renderSparkItem)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {selectedUser && (
        <DirectMessageDialog
          open={showMessageDialog}
          onOpenChange={setShowMessageDialog}
          recipientId={selectedUser.user_id}
          recipientName={selectedUser.full_name}
          recipientAvatar={selectedUser.avatar_url}
        />
      )}

      {selectedMedia && (
        <MediaPlayerModal
          isOpen={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
          item={selectedMedia}
        />
      )}

      <SavedSparksDialog
        open={showSavedSparks}
        onOpenChange={setShowSavedSparks}
      />
    </>
  );
};

export default Circle;
