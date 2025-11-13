import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, Loader2, Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useFileUpload } from "@/hooks/useFileUpload";

interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[] | null;
  media_type: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
  reaction_count?: number;
  has_reacted?: boolean;
}

interface CommunityFeedProps {
  communityId: string;
}

export function CommunityFeed({ communityId }: CommunityFeedProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newPost, setNewPost] = useState("");

  useEffect(() => {
    fetchPosts();
    subscribeToChanges();
  }, [communityId]);

  const fetchPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      // Get profiles separately
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Get reaction counts and user reactions
      const postsWithReactions = await Promise.all(
        (postsData || []).map(async (post) => {
          const { count } = await supabase
            .from('community_post_reactions')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { data: userReaction } = await supabase
            .from('community_post_reactions')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user?.id || '')
            .maybeSingle();

          const profile = profilesMap.get(post.user_id) || {
            full_name: 'Unknown User',
            avatar_url: null,
            role: 'Creator'
          };

          return {
            ...post,
            profiles: profile,
            reaction_count: count || 0,
            has_reacted: !!userReaction
          };
        })
      );

      setPosts(postsWithReactions);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel(`community-posts-${communityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_posts',
          filter: `community_id=eq.${communityId}`
        },
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handlePost = async () => {
    if (!newPost.trim() || !user) return;

    setPosting(true);
    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          community_id: communityId,
          user_id: user.id,
          content: newPost.trim()
        });

      if (error) throw error;

      // Track community post
      const { trackEvent } = await import("@/lib/analytics");
      await trackEvent({
        eventName: 'community_post_created',
        eventCategory: 'engagement',
        properties: { community_id: communityId }
      });

      setNewPost("");
      toast.success("Posted!");
    } catch (error) {
      console.error('Error posting:', error);
      toast.error('Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const toggleReaction = async (postId: string, hasReacted: boolean) => {
    if (!user) return;

    try {
      if (hasReacted) {
        await supabase
          .from('community_post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('community_post_reactions')
          .insert({
            post_id: postId,
            user_id: user.id
          });
      }

      fetchPosts();
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New Post */}
      <Card className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>
              {user?.user_metadata?.full_name?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="Share with the community..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" disabled>
                <ImageIcon className="h-4 w-4 mr-2" />
                Add Media
              </Button>
              
              <Button 
                onClick={handlePost}
                disabled={!newPost.trim() || posting}
                size="sm"
              >
                {posting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No posts yet. Be the first to share!</p>
        </Card>
      ) : (
        posts.map((post) => (
          <Card key={post.id} className="p-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  {post.profiles?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">
                    {post.profiles?.full_name || 'Unknown User'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {post.profiles?.role}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                <p className="text-sm whitespace-pre-wrap mb-3">{post.content}</p>
                
                {/* Media */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <img 
                      src={post.media_urls[0]} 
                      alt="Post media"
                      className="w-full max-h-96 object-cover"
                    />
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleReaction(post.id, post.has_reacted || false)}
                    className={post.has_reacted ? "text-red-500" : ""}
                  >
                    <Heart className={`h-4 w-4 mr-1 ${post.has_reacted ? 'fill-current' : ''}`} />
                    {post.reaction_count || 0}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}