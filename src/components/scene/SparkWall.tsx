import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Flame, MessageCircle, Paperclip, Loader2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SparkPost {
  id: string;
  user_id: string;
  content: string | null;
  media_urls: any;
  media_type: string | null;
  post_type: string;
  created_at: string;
  portfolio_item_id: string | null;
  auto_activity_message: string | null;
  is_portfolio_item: boolean | null;
  category: string | null;
  // joined
  profile?: {
    full_name: string;
    avatar_url: string | null;
    role: string | null;
  };
  portfolio_item?: {
    title: string;
    media_url: string;
    media_type: string;
    thumbnail_url: string | null;
    description: string | null;
  };
  reaction_count: number;
  comment_count: number;
  has_reacted: boolean;
  has_clipped: boolean;
}

export const SparkWall = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<SparkPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      // Get feed posts with portfolio items
      const { data: feedPosts } = await supabase
        .from("feed_posts")
        .select(`
          *,
          portfolio_items (
            title, media_url, media_type, thumbnail_url, description
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!feedPosts?.length) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Get profiles for these users
      const userIds = [...new Set(feedPosts.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, role")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Get reaction counts
      const postIds = feedPosts.map(p => p.id);
      const { data: reactions } = await supabase
        .from("feed_reactions")
        .select("post_id, user_id")
        .in("post_id", postIds);

      const reactionCounts = new Map<string, number>();
      const userReactions = new Set<string>();
      reactions?.forEach(r => {
        reactionCounts.set(r.post_id, (reactionCounts.get(r.post_id) || 0) + 1);
        if (r.user_id === user?.id) userReactions.add(r.post_id);
      });

      // Get comment counts
      const { data: comments } = await supabase
        .from("feed_comments")
        .select("post_id")
        .in("post_id", postIds);

      const commentCounts = new Map<string, number>();
      comments?.forEach(c => {
        commentCounts.set(c.post_id, (commentCounts.get(c.post_id) || 0) + 1);
      });

      // Get user clips
      const { data: clips } = user ? await supabase
        .from("feed_clips")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds) : { data: [] };

      const clippedPosts = new Set(clips?.map(c => c.post_id) || []);

      const enriched: SparkPost[] = feedPosts.map(p => ({
        ...p,
        profile: profileMap.get(p.user_id) || { full_name: "Unknown", avatar_url: null, role: null },
        portfolio_item: p.portfolio_items as any,
        reaction_count: reactionCounts.get(p.id) || 0,
        comment_count: commentCounts.get(p.id) || 0,
        has_reacted: userReactions.has(p.id),
        has_clipped: clippedPosts.has(p.id),
      }));

      setPosts(enriched);
    } catch (err) {
      console.error("Error fetching spark posts:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleReaction = async (postId: string, hasReacted: boolean) => {
    if (!user) return;
    if (hasReacted) {
      await supabase.from("feed_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("feed_reactions").insert({ post_id: postId, user_id: user.id, reaction_type: "fire" });
    }
    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      has_reacted: !hasReacted,
      reaction_count: hasReacted ? p.reaction_count - 1 : p.reaction_count + 1,
    } : p));
  };

  const handleClip = async (postId: string, hasClipped: boolean) => {
    if (!user) return;
    if (hasClipped) {
      await supabase.from("feed_clips").delete().eq("post_id", postId).eq("user_id", user.id);
      toast({ title: "Unclipped", description: "Removed from your clips" });
    } else {
      await supabase.from("feed_clips").insert({ post_id: postId, user_id: user.id });
      toast({ title: "Clipped! 📎", description: "Saved to your collection" });
    }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, has_clipped: !hasClipped } : p));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Flame className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <p className="font-semibold mb-1">The Scene is quiet... for now</p>
        <p className="text-sm text-muted-foreground">
          Add work to your portfolio and it'll appear here for the community to discover.
        </p>
      </Card>
    );
  }

  return (
    <div className="columns-2 gap-2 space-y-2">
      {posts.map(post => (
        <SparkCard
          key={post.id}
          post={post}
          onReact={() => handleReaction(post.id, post.has_reacted)}
          onClip={() => handleClip(post.id, post.has_clipped)}
          onNavigate={(userId) => navigate(`/profile/${userId}`)}
        />
      ))}
    </div>
  );
};

const SparkCard = ({ 
  post, onReact, onClip, onNavigate 
}: { 
  post: SparkPost; 
  onReact: () => void; 
  onClip: () => void; 
  onNavigate: (userId: string) => void;
}) => {
  const mediaUrl = post.portfolio_item?.thumbnail_url || post.portfolio_item?.media_url || getFirstMediaUrl(post.media_urls);
  const title = post.portfolio_item?.title || post.auto_activity_message || post.content;
  const isImage = post.portfolio_item?.media_type === "image" || post.media_type === "image";
  const isVideo = post.portfolio_item?.media_type === "video" || post.media_type === "video";

  return (
    <div className="break-inside-avoid rounded-xl overflow-hidden border border-border/50 bg-card group">
      {/* Media */}
      {mediaUrl && (
        <div 
          className="relative cursor-pointer overflow-hidden"
          onClick={() => onNavigate(post.user_id)}
        >
          {isVideo ? (
            <video 
              src={mediaUrl} 
              className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
              muted
              loop
              playsInline
              onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
              onMouseLeave={(e) => (e.target as HTMLVideoElement).pause()}
            />
          ) : (
            <img 
              src={mediaUrl} 
              alt={title || "Creative work"} 
              className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-2.5">
        {/* Creator info */}
        <div 
          className="flex items-center gap-2 mb-1.5 cursor-pointer" 
          onClick={() => onNavigate(post.user_id)}
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={post.profile?.avatar_url || ""} />
            <AvatarFallback className="text-[10px]">{post.profile?.full_name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate hover:text-primary transition-colors">
              {post.profile?.full_name}
            </p>
          </div>
        </div>

        {/* Title */}
        {title && !mediaUrl && (
          <p className="text-xs text-muted-foreground line-clamp-3 mb-1.5">{title}</p>
        )}
        {title && mediaUrl && (
          <p className="text-xs font-medium line-clamp-1 mb-1.5">{title}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 px-2 gap-1", post.has_reacted && "text-orange-500")}
            onClick={onReact}
          >
            <Flame className={cn("h-3.5 w-3.5", post.has_reacted && "fill-orange-500")} />
            {post.reaction_count > 0 && <span className="text-[10px]">{post.reaction_count}</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1"
            onClick={() => onNavigate(post.user_id)}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {post.comment_count > 0 && <span className="text-[10px]">{post.comment_count}</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 px-2 ml-auto", post.has_clipped && "text-primary")}
            onClick={onClip}
          >
            <Paperclip className={cn("h-3.5 w-3.5", post.has_clipped && "fill-primary/20")} />
          </Button>
        </div>
      </div>
    </div>
  );
};

function getFirstMediaUrl(mediaUrls: any): string | null {
  if (!mediaUrls) return null;
  if (Array.isArray(mediaUrls) && mediaUrls.length > 0) return mediaUrls[0];
  if (typeof mediaUrls === "string") return mediaUrls;
  return null;
}
