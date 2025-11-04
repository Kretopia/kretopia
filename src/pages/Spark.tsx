import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Bookmark
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
  type: 'portfolio' | 'award' | 'credit' | 'press' | 'post';
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
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    let fetchTimeout: NodeJS.Timeout;

    const loadFeed = async () => {
      if (isMounted) {
        await fetchSparkFeed();
      }
    };

    loadFeed();
    
    // Track page view
    const trackPageView = async () => {
      const { analytics } = await import("@/lib/analytics");
      analytics.pageView("spark");
    };
    trackPageView();

    // Debounced refresh function to avoid excessive refetches
    const debouncedRefresh = () => {
      clearTimeout(fetchTimeout);
      fetchTimeout = setTimeout(() => {
        if (isMounted) {
          fetchSparkFeed();
        }
      }, 2000); // Wait 2 seconds before refetching
    };

    // Set up real-time updates with debouncing - only for main content types
    const feedChannel = supabase
      .channel('spark-feed-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'portfolio_items' }, debouncedRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_posts' }, debouncedRefresh)
      .subscribe();

    return () => {
      isMounted = false;
      clearTimeout(fetchTimeout);
      supabase.removeChannel(feedChannel);
    };
  }, []);

  // Optimized feed loading - fetch less data initially, load more on scroll
  const fetchBasicFeed = async (userId: string) => {
    console.log('[Spark] Starting feed fetch for user:', userId);
    
    try {
      // Fetch with timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Feed load timeout')), 10000)
      );

      // Fetch content and profiles separately for reliability
      const [portfolioData, feedPostsData] = await Promise.all([
        supabase
          .from('portfolio_items')
          .select('id, user_id, title, description, media_url, media_type, thumbnail_url, created_at')
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('feed_posts')
          .select('id, user_id, content, media_urls, media_type, created_at')
          .order('created_at', { ascending: false })
          .limit(15)
      ]);

      console.log('[Spark] Raw data fetched:', {
        portfolio: { count: portfolioData?.data?.length || 0, error: portfolioData.error },
        posts: { count: feedPostsData?.data?.length || 0, error: feedPostsData.error }
      });

      if (portfolioData.error) {
        console.error('[Spark] Portfolio error:', portfolioData.error);
      }
      
      if (feedPostsData.error) {
        console.error('[Spark] Feed posts error:', feedPostsData.error);
      }

      // Get all user IDs from content
      const portfolioItems = portfolioData.data || [];
      const feedPosts = feedPostsData.data || [];
      
      const allUserIds = [
        ...portfolioItems.map(item => item.user_id),
        ...feedPosts.map(item => item.user_id)
      ];

      console.log('[Spark] Total items before profile fetch:', portfolioItems.length + feedPosts.length);
      console.log('[Spark] Unique user IDs:', [...new Set(allUserIds)].length);

      if (allUserIds.length === 0) {
        console.log('[Spark] No content found');
        setSparkFeed([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for all users at once
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, location')
        .in('user_id', [...new Set(allUserIds)]);

      console.log('[Spark] Profiles fetched:', { count: profiles?.length || 0, error: profilesError });

      if (profilesError) {
        console.error('[Spark] Profiles error:', profilesError);
      }

      // Create a map for quick profile lookup
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Combine content and attach profiles
      const allContent = [
        ...portfolioItems.map(item => ({ 
          ...item, 
          activity_type: 'portfolio', 
          profile: profileMap.get(item.user_id) 
        })),
        ...feedPosts.map(item => ({ 
          ...item, 
          activity_type: 'feed_post', 
          profile: profileMap.get(item.user_id) 
        }))
      ];

      console.log('[Spark] Content before filtering:', allContent.length);

      const filteredContent = allContent
        .filter(item => {
          const hasProfile = item.profile?.full_name;
          if (!hasProfile) {
            console.log('[Spark] Filtered out item - no profile:', item.id);
          }
          return hasProfile;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20);

      console.log('[Spark] Content after filtering:', filteredContent.length);

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

      console.log('[Spark] Final feed items:', feed.length);
      setSparkFeed(feed);
      setCachedFeed(userId, feed);
    } catch (error) {
      console.error('[Spark] Error loading feed:', error);
      setSparkFeed([]);
      toast({
        title: "Feed loading issue",
        description: "Showing limited content. Try refreshing.",
        variant: "default"
      });
    } finally {
      console.log('[Spark] Setting loading to false');
      setLoading(false);
    }
  };

  const fetchSparkFeed = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check cache first and show immediately
      const cached = getCachedFeed<SparkItem[]>(user.id);
      if (cached && cached.length > 0) {
        setSparkFeed(cached);
        setLoading(false);
        console.log('[Spark] Using cached feed');
        // Still refresh in background for new content
        fetchBasicFeed(user.id).catch(err => console.error('[Spark] Background refresh failed:', err));
        return;
      }
      
      // No cache - show loading and fetch
      console.log('[Spark] No cache, fetching fresh feed...');
      setLoading(true);
      await fetchBasicFeed(user.id);
    } catch (error) {
      console.error('[Spark] Error fetching spark feed:', error);
      toast({
        title: "Error loading feed",
        description: "Please try again",
        variant: "destructive"
      });
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
      
      sonnerToast.success("Removed from saved sparks");
    } else {
      // Add bookmark
      await supabase
        .from('saved_sparks')
        .insert([{ user_id: user.id, item_type: itemType, item_id: itemId }]);
      
      sonnerToast.success("Saved to your sparks!");
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
              {item.type}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Content based on type */}
          {item.type === 'portfolio' && (
            <div>
              {(item.content.thumbnail_url || item.content.media_url) && (
                <>
                  {item.content.media_type === 'video' || item.content.media_url?.match(/\.(mp4|mov|avi|webm)$/i) ? (
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
                  ) : item.content.media_type === 'audio' || item.content.media_url?.match(/\.(mp3|wav|ogg|m4a)$/i) ? (
                    <div className="w-full mb-2">
                      <audio 
                        controls 
                        className="w-full"
                      >
                        <source src={item.content.media_url} />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  ) : (
                    <img 
                      src={item.content.thumbnail_url || item.content.media_url} 
                      alt={item.content.title}
                      className="w-full h-auto object-cover rounded-md mb-2 max-h-96"
                    />
                  )}
                </>
              )}
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
                <Bookmark className={`h-5 w-5 ${item.isSaved ? 'fill-current' : ''}`} />
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
        title="For You - ThriveIN"
        description="AI-powered personalized feed - Share your spark, get feedback from peers, get inspiration"
      />
      <div className="min-h-screen p-4 sm:p-6">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold">For You</h1>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI-Powered
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Share your spark, get feedback from peers, get inspiration</p>
            </div>
            <Button
              onClick={() => setShowSavedSparks(true)}
              variant="outline"
              className="gap-2"
            >
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Saved</span>
            </Button>
          </div>

          {/* Feed */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sparkFeed.length === 0 ? (
            <Card className="p-8 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No content yet</h3>
              <p className="text-muted-foreground mb-4">
                Start discovering creators to see their latest work
              </p>
              <Button onClick={() => navigate('/discover')}>
                Explore Creators
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {sparkFeed.map(renderSparkItem)}
            </div>
          )}
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
