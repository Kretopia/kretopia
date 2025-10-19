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
  Play
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { SEO } from "@/components/SEO";
import { DirectMessageDialog } from "@/components/DirectMessageDialog";
import { MediaPlayerModal } from "@/components/profile/MediaPlayerModal";
import DOMPurify from "dompurify";

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
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSparkFeed();
    
    // Track page view
    const trackPageView = async () => {
      const { analytics } = await import("@/lib/analytics");
      analytics.pageView("spark");
    };
    trackPageView();

    // Set up real-time updates
    const feedChannel = supabase
      .channel('spark-feed-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'portfolio_items' }, () => fetchSparkFeed())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'awards' }, () => fetchSparkFeed())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'press_links' }, () => fetchSparkFeed())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_posts' }, () => fetchSparkFeed())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'credits' }, () => fetchSparkFeed())
      .subscribe();

    return () => {
      supabase.removeChannel(feedChannel);
    };
  }, []);

  const fetchSparkFeed = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get user profile to filter recommendations
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role, location, professional_skills, passion_skills')
        .eq('user_id', user.id)
        .single();

      // Fetch diverse content - including user's own content
      const [portfolioItems, awardItems, pressItems, creditItems, postItems] = await Promise.all([
        supabase.from('portfolio_items').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('awards').select('*').order('created_at', { ascending: false }).limit(15),
        supabase.from('press_links').select('*').order('created_at', { ascending: false }).limit(15),
        supabase.from('credits').select('*').order('created_at', { ascending: false }).limit(15),
        supabase.from('feed_posts').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      // Get all user IDs
      const allUserIds = [...new Set([
        ...(portfolioItems.data || []).map(i => i.user_id),
        ...(awardItems.data || []).map(i => i.user_id),
        ...(pressItems.data || []).map(i => i.user_id),
        ...(creditItems.data || []).map(i => i.user_id),
        ...(postItems.data || []).map(i => i.user_id)
      ])];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, location')
        .in('user_id', allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Transform into unified feed format
      const feed: SparkItem[] = [
        ...(portfolioItems.data || []).filter(item => profileMap.has(item.user_id)).map(item => {
          const profile = profileMap.get(item.user_id)!;
          return { id: item.id, type: 'portfolio' as const, user: { id: profile.user_id, name: profile.full_name, avatar: profile.avatar_url, role: profile.role, location: profile.location }, content: item, created_at: item.created_at, reactions: 0 };
        }),
        ...(awardItems.data || []).filter(item => profileMap.has(item.user_id)).map(item => {
          const profile = profileMap.get(item.user_id)!;
          return { id: item.id, type: 'award' as const, user: { id: profile.user_id, name: profile.full_name, avatar: profile.avatar_url, role: profile.role, location: profile.location }, content: item, created_at: item.created_at, reactions: 0 };
        }),
        ...(pressItems.data || []).filter(item => profileMap.has(item.user_id)).map(item => {
          const profile = profileMap.get(item.user_id)!;
          return { id: item.id, type: 'press' as const, user: { id: profile.user_id, name: profile.full_name, avatar: profile.avatar_url, role: profile.role, location: profile.location }, content: item, created_at: item.created_at, reactions: 0 };
        }),
        ...(creditItems.data || []).filter(item => profileMap.has(item.user_id)).map(item => {
          const profile = profileMap.get(item.user_id)!;
          return { id: item.id, type: 'credit' as const, user: { id: profile.user_id, name: profile.full_name, avatar: profile.avatar_url, role: profile.role, location: profile.location }, content: item, created_at: item.created_at, reactions: 0 };
        }),
        ...(postItems.data || []).filter(item => profileMap.has(item.user_id)).map(item => {
          const profile = profileMap.get(item.user_id)!;
          return { id: item.id, type: 'post' as const, user: { id: profile.user_id, name: profile.full_name, avatar: profile.avatar_url, role: profile.role, location: profile.location }, content: item, created_at: item.created_at, reactions: 0 };
        })
      ];

      // Sort by created_at
      feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Fetch reactions and comments for portfolio and posts
      const portfolioIds = feed.filter(f => f.type === 'portfolio').map(f => f.id);
      const postIds = feed.filter(f => f.type === 'post').map(f => f.id);

      const [portfolioReactions, postReactions, postComments] = await Promise.all([
        portfolioIds.length > 0 
          ? supabase.from('portfolio_reactions').select('portfolio_item_id, user_id').in('portfolio_item_id', portfolioIds)
          : Promise.resolve({ data: [] }),
        postIds.length > 0
          ? supabase.from('feed_reactions').select('post_id, user_id').in('post_id', postIds)
          : Promise.resolve({ data: [] }),
        postIds.length > 0
          ? supabase.from('feed_comments').select('*, profiles:user_id(full_name, avatar_url)').in('post_id', postIds).order('created_at', { ascending: true })
          : Promise.resolve({ data: [] })
      ]);

      // Build reaction maps
      const portfolioReactionMap = new Map<string, { count: number; hasReacted: boolean }>();
      (portfolioReactions.data || []).forEach(r => {
        const current = portfolioReactionMap.get(r.portfolio_item_id) || { count: 0, hasReacted: false };
        portfolioReactionMap.set(r.portfolio_item_id, {
          count: current.count + 1,
          hasReacted: current.hasReacted || r.user_id === user.id
        });
      });

      const postReactionMap = new Map<string, { count: number; hasReacted: boolean }>();
      (postReactions.data || []).forEach(r => {
        const current = postReactionMap.get(r.post_id) || { count: 0, hasReacted: false };
        postReactionMap.set(r.post_id, {
          count: current.count + 1,
          hasReacted: current.hasReacted || r.user_id === user.id
        });
      });

      // Build comment map
      const commentMap = new Map<string, any[]>();
      (postComments.data || []).forEach(c => {
        const comments = commentMap.get(c.post_id) || [];
        comments.push(c);
        commentMap.set(c.post_id, comments);
      });

      // Update feed with reactions and comments
      feed.forEach(item => {
        if (item.type === 'portfolio') {
          const reactionData = portfolioReactionMap.get(item.id);
          item.reactions = reactionData?.count || 0;
          item.hasReacted = reactionData?.hasReacted || false;
        } else if (item.type === 'post') {
          const reactionData = postReactionMap.get(item.id);
          item.reactions = reactionData?.count || 0;
          item.hasReacted = reactionData?.hasReacted || false;
          item.comments = commentMap.get(item.id) || [];
        }
      });

      setSparkFeed(feed);
    } catch (error) {
      console.error('Error fetching spark feed:', error);
      toast({
        title: "Error loading feed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
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
    if (!user) {
      toast({ title: "Please sign in to react", variant: "destructive" });
      return;
    }

    try {
      const item = sparkFeed.find(i => i.id === itemId);
      if (!item) return;

      // Handle different item types
      if (itemType === 'portfolio') {
        if (item.hasReacted) {
          await supabase
            .from('portfolio_reactions')
            .delete()
            .eq('portfolio_item_id', itemId)
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('portfolio_reactions')
            .insert({ portfolio_item_id: itemId, user_id: user.id });
        }
      } else if (itemType === 'post') {
        if (item.hasReacted) {
          await supabase
            .from('feed_reactions')
            .delete()
            .eq('post_id', itemId)
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('feed_reactions')
            .insert({ post_id: itemId, user_id: user.id });
        }
      }

      // Update local state
      setSparkFeed(feed => feed.map(i => {
        if (i.id === itemId) {
          return {
            ...i,
            hasReacted: !i.hasReacted,
            reactions: (i.reactions || 0) + (i.hasReacted ? -1 : 1)
          };
        }
        return i;
      }));
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast({ title: "Failed to react", variant: "destructive" });
    }
  };

  const toggleComments = (itemId: string) => {
    setSparkFeed(feed => feed.map(i => 
      i.id === itemId ? { ...i, showComments: !i.showComments } : i
    ));
  };

  const handleCommentSubmit = async (itemId: string, itemType: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const item = sparkFeed.find(i => i.id === itemId);
    if (!item || !item.commentText?.trim()) return;

    try {
      if (itemType === 'post') {
        const { error } = await supabase
          .from('feed_comments')
          .insert({
            post_id: itemId,
            user_id: user.id,
            content: item.commentText
          });

        if (error) throw error;

        // Refresh comments
        await fetchCommentsForItem(itemId, itemType);
        
        // Clear comment text
        setSparkFeed(feed => feed.map(i => 
          i.id === itemId ? { ...i, commentText: '' } : i
        ));

        toast({ title: "Comment added!" });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({ title: "Failed to add comment", variant: "destructive" });
    }
  };

  const fetchCommentsForItem = async (itemId: string, itemType: string) => {
    if (itemType === 'post') {
      const { data } = await supabase
        .from('feed_comments')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .eq('post_id', itemId)
        .order('created_at', { ascending: true });

      setSparkFeed(feed => feed.map(i => 
        i.id === itemId ? { ...i, comments: data || [] } : i
      ));
    }
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
                onClick={() => toggleComments(item.id)}
                className="gap-1.5"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm font-medium">{item.comments?.length || 0}</span>
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
        title="Spark 🔥 - ThriveIN"
        description="Discover creative content from the ThriveIN community. Connect with creators and explore their work."
      />
      <div className="min-h-screen p-4 sm:p-6">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6 flex items-center gap-2">
            <Flame className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Spark</h1>
              <p className="text-sm text-muted-foreground">Discover the creative community</p>
            </div>
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
    </>
  );
};

export default Circle;