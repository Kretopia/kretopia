import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Trash2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: { full_name: string; avatar_url: string | null } | null;
}

interface EventCommentsProps {
  eventId: string;
  isCreator: boolean;
}

export const EventComments = ({ eventId, isCreator }: EventCommentsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadComments();

    const channel = supabase
      .channel(`event-comments-${eventId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_comments',
        filter: `event_id=eq.${eventId}`,
      }, () => loadComments())
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'event_comments',
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        setComments(prev => prev.filter(c => c.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const loadComments = async () => {
    const { data, error } = await supabase
      .from('event_comments' as any)
      .select('id, user_id, content, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) { console.error(error); setLoading(false); return; }

    const items = data as any[] || [];
    if (items.length > 0) {
      const userIds = [...new Set(items.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      setComments(items.map((c: any) => ({ ...c, profile: profileMap.get(c.user_id) || null })));
    } else {
      setComments([]);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newComment.trim() || !user) return;
    setSending(true);

    const { error } = await supabase
      .from('event_comments' as any)
      .insert({ event_id: eventId, user_id: user.id, content: newComment.trim() });

    if (error) {
      toast({ title: "Error", description: "Failed to post comment", variant: "destructive" });
    } else {
      setNewComment("");
    }
    setSending(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase
      .from('event_comments' as any)
      .delete()
      .eq('id', commentId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } else {
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-5">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <MessageSquare className="h-10 w-10 mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No comments yet</p>
            <p className="text-xs text-muted-foreground">Start the buzz! Ask questions, share excitement.</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar 
                  className="h-8 w-8 shrink-0 cursor-pointer" 
                  onClick={() => navigate(`/profile/${comment.user_id}`)}
                >
                  <AvatarImage src={comment.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {comment.profile?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                      onClick={() => navigate(`/profile/${comment.user_id}`)}
                    >
                      {comment.profile?.full_name || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                    {(isCreator || comment.user_id === user?.id) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {user ? (
        <div className="p-4 border-t shrink-0">
          <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <Input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={sending || !newComment.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      ) : (
        <div className="p-4 border-t text-center">
          <p className="text-sm text-muted-foreground">Sign up to join the conversation</p>
        </div>
      )}
    </div>
  );
};
