import { useState, useEffect } from "react";
import { Flame, MessageCircle, Share2, Bookmark, MoreVertical, Plus, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreatePostDialog } from "@/components/spark/CreatePostDialog";
import { MediaPlayerModal } from "@/components/profile/MediaPlayerModal";
import { getMediaThumbnail } from "@/lib/mediaUtils";

interface SparkPost {
  id: string;
  user_id: string;
  title?: string;
  description?: string;
  media_url: string;
  media_type: string;
  thumbnail_url?: string;
  tags?: string[];
  likes: number;
  comments: number;
  profile?: {
    full_name: string;
    avatar_url?: string;
    role: string;
  };
}

const Spark = () => {
  const [posts, setPosts] = useState<SparkPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SparkPost | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user's connections (both directions)
      const { data: connections, error: connectionsError } = await supabase
        .from('connections')
        .select('user_id, connected_user_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);

      if (connectionsError) throw connectionsError;

      // Extract connected user IDs
      const connectedUserIds = connections?.map(conn => 
        conn.user_id === user.id ? conn.connected_user_id : conn.user_id
      ) || [];

      // Include current user's posts too
      connectedUserIds.push(user.id);

      // Fetch all posts from connected users (both Spark posts and Portfolio items)
      const { data, error } = await supabase
        .from('portfolio_items')
        .select(`
          *,
          profiles!portfolio_items_user_id_fkey (
            full_name,
            avatar_url,
            role
          )
        `)
        .in('user_id', connectedUserIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedPosts = data?.map(item => ({
        id: item.id,
        user_id: item.user_id,
        title: item.title,
        description: item.description,
        media_url: item.media_url,
        media_type: item.media_type,
        thumbnail_url: item.thumbnail_url,
        tags: item.tags,
        likes: item.view_count || 0,
        comments: 0,
        profile: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      })) || [];

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to load feed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (likedPosts.has(postId)) {
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
      
      // Update local state
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likes: Math.max(0, p.likes - 1) } : p
      ));
    } else {
      setLikedPosts(prev => new Set(prev).add(postId));
      
      // Update local state
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likes: p.likes + 1 } : p
      ));
      
      // Update in database
      const post = posts.find(p => p.id === postId);
      if (post) {
        const { error } = await supabase
          .from('portfolio_items')
          .update({ view_count: (post.likes + 1) })
          .eq('id', postId);

        if (error) console.error('Error updating like:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Flame className="mx-auto mb-4 h-16 w-16 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20 md:p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 flex items-center gap-2 text-4xl font-bold">
              <Flame className="h-8 w-8 text-primary" />
              Spark
            </h1>
            <p className="text-muted-foreground">Discover inspiring work from your circle</p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            Create
          </Button>
        </div>

        {/* Masonry Grid */}
        <div className="columns-1 gap-4 space-y-4 md:columns-2 lg:columns-3 xl:columns-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isLiked={likedPosts.has(post.id)}
              onLike={() => handleLike(post.id)}
              onMediaClick={() => setSelectedPost(post)}
            />
          ))}
        </div>

        {posts.length === 0 && (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="text-center">
              <Flame className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
              <h2 className="mb-2 text-2xl font-bold">No posts yet</h2>
              <p className="text-muted-foreground">Connect with others to see their sparks!</p>
            </div>
          </div>
        )}
      </div>

      <CreatePostDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onPostCreated={fetchPosts}
      />

      {selectedPost && (
        <MediaPlayerModal
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          item={{
            title: selectedPost.title || "Post",
            description: selectedPost.description || "",
            media_url: selectedPost.media_url,
            media_type: selectedPost.media_type
          }}
        />
      )}
    </div>
  );
};

const PostCard = ({
  post,
  isLiked,
  onLike,
  onMediaClick
}: {
  post: SparkPost;
  isLiked: boolean;
  onLike: () => void;
  onMediaClick: () => void;
}) => {
  return (
    <div className="group relative break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-smooth hover:shadow-glow">
      {/* Media */}
      <div className="relative overflow-hidden cursor-pointer" onClick={onMediaClick}>
        {post.media_type === 'audio' ? (
          <div className="flex h-48 items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <div className="text-center">
              <Music className="mx-auto mb-2 h-12 w-12 text-primary" />
              <p className="text-sm font-medium">Audio Track</p>
            </div>
          </div>
        ) : (
          <img
            src={getMediaThumbnail(post)}
            alt={post.title || 'Post'}
            className="h-auto w-full object-cover"
          />
        )}

        {/* Overlay Actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-white/90 text-foreground hover:bg-white"
          >
            <Share2 className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-white/90 text-foreground hover:bg-white"
          >
            <Bookmark className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Profile Info */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary">
              {post.profile?.avatar_url ? (
                <img
                  src={post.profile.avatar_url}
                  alt={post.profile.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary-foreground">
                  {post.profile?.full_name?.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold">{post.profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{post.profile?.role}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>

        {/* Title & Description */}
        {post.title && (
          <h3 className="mb-1 font-semibold line-clamp-2">{post.title}</h3>
        )}
        {post.description && (
          <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
            {post.description}
          </p>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 border-t border-border pt-3">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1.5 ${isLiked ? 'text-primary' : ''}`}
            onClick={onLike}
          >
            <Flame className={`h-4 w-4 ${isLiked ? 'fill-primary' : ''}`} />
            <span className="text-xs font-medium">{post.likes}</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs font-medium">{post.comments}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Spark;
