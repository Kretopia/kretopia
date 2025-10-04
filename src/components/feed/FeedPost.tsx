import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { Flame, MessageCircle, Send, MoreVertical, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FeedPostProps {
  post: {
    id: string;
    user_id: string;
    content: string | null;
    media_urls: any[];
    media_type: string | null;
    tags: string[];
    created_at: string;
    profile: {
      full_name: string;
      avatar_url: string | null;
      role: string;
    };
  };
  onDelete?: () => void;
}

export const FeedPost = ({ post, onDelete }: FeedPostProps) => {
  const [reactions, setReactions] = useState<number>(0);
  const [hasReacted, setHasReacted] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchReactions();
    fetchComments();
    getCurrentUser();
  }, [post.id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchReactions = async () => {
    const { data } = await supabase
      .from('feed_reactions')
      .select('*')
      .eq('post_id', post.id);

    setReactions(data?.length || 0);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setHasReacted(data?.some(r => r.user_id === user.id) || false);
    }
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('feed_comments')
      .select(`
        *,
        profiles!feed_comments_user_id_fkey(full_name, avatar_url)
      `)
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    setComments(data || []);
  };

  const handleReaction = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (hasReacted) {
      await supabase
        .from('feed_reactions')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('feed_reactions')
        .insert({ post_id: post.id, user_id: user.id });
    }

    fetchReactions();
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('feed_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: commentText.trim()
        });

      if (error) throw error;

      setCommentText("");
      fetchComments();
    } catch (error: any) {
      toast({
        title: "Failed to post comment",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('feed_posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast({
        title: "Post deleted",
        description: "Your post has been removed"
      });

      onDelete?.();
    } catch (error: any) {
      toast({
        title: "Failed to delete post",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const renderMedia = () => {
    if (!post.media_urls || post.media_urls.length === 0) return null;

    return (
      <div className={`grid gap-2 mt-3 ${
        post.media_urls.length === 1 ? 'grid-cols-1' :
        post.media_urls.length === 2 ? 'grid-cols-2' :
        'grid-cols-2 md:grid-cols-3'
      }`}>
        {post.media_urls.map((media: any, index: number) => (
          <div key={index} className="relative rounded-lg overflow-hidden bg-muted">
            {media.type === 'image' ? (
              <img
                src={media.url}
                alt={`Media ${index + 1}`}
                className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(media.url, '_blank')}
              />
            ) : media.type === 'video' ? (
              <video
                src={media.url}
                controls
                className="w-full h-48 object-cover"
              />
            ) : media.type === 'audio' ? (
              <div className="flex items-center justify-center h-32 bg-gradient-to-br from-primary/10 to-primary/5">
                <audio src={media.url} controls className="w-full px-4" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={post.profile.avatar_url || undefined} />
            <AvatarFallback>{post.profile.full_name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{post.profile.full_name}</p>
            <p className="text-xs text-muted-foreground">{post.profile.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </span>
          {currentUserId === post.user_id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {post.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Media */}
      {renderMedia()}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReaction}
          className={hasReacted ? 'text-orange-500' : ''}
        >
          <Flame className={`h-4 w-4 mr-1 ${hasReacted ? 'fill-orange-500' : ''}`} />
          {reactions}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          {comments.length}
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="space-y-3 pt-3 border-t">
          {/* Existing Comments */}
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={(comment.profiles as any)?.avatar_url || undefined} />
                <AvatarFallback>{(comment.profiles as any)?.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-sm font-semibold">{(comment.profiles as any)?.full_name}</p>
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
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <Button
              size="icon"
              onClick={handleComment}
              disabled={!commentText.trim() || submittingComment}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
