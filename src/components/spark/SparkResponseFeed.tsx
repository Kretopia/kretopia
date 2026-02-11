import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, ExternalLink, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface SparkResponse {
  id: string;
  user_id: string;
  response_type: string;
  content: string | null;
  media_url: string | null;
  link_url: string | null;
  link_title: string | null;
  like_count: number;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
  liked_by_me?: boolean;
}

interface SparkResponseFeedProps {
  promptId: string;
  currentUserId: string;
}

export const SparkResponseFeed = ({ promptId, currentUserId }: SparkResponseFeedProps) => {
  const [responses, setResponses] = useState<SparkResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResponses();

    // Realtime subscription
    const channel = supabase
      .channel(`spark-responses-${promptId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'spark_responses',
        filter: `prompt_id=eq.${promptId}`,
      }, () => {
        fetchResponses();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [promptId]);

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('spark_responses')
        .select('*')
        .eq('prompt_id', promptId)
        .order('like_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data) return;

      // Fetch profiles for all response authors
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .in('user_id', userIds);

      // Check which ones current user liked
      let likedIds: string[] = [];
      if (currentUserId) {
        const { data: likes } = await supabase
          .from('spark_likes')
          .select('response_id')
          .eq('user_id', currentUserId)
          .in('response_id', data.map(r => r.id));
        likedIds = likes?.map(l => l.response_id) || [];
      }

      const enriched = data.map(r => ({
        ...r,
        profile: profiles?.find(p => p.user_id === r.user_id),
        liked_by_me: likedIds.includes(r.id),
      }));

      setResponses(enriched);
    } catch (error) {
      console.error('Error fetching responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (responseId: string, isLiked: boolean) => {
    if (!currentUserId) return;

    try {
      if (isLiked) {
        await supabase
          .from('spark_likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('response_id', responseId);
      } else {
        await supabase
          .from('spark_likes')
          .insert({ user_id: currentUserId, response_id: responseId });
      }

      // Optimistic update
      setResponses(prev => prev.map(r => 
        r.id === responseId 
          ? { ...r, liked_by_me: !isLiked, like_count: r.like_count + (isLiked ? -1 : 1) }
          : r
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No responses yet. Be the first! 🔥</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        {responses.length} Spark{responses.length !== 1 ? 's' : ''}
      </h3>
      
      {responses.map(response => (
        <Card key={response.id} className="overflow-hidden">
          <CardContent className="p-4 space-y-3">
            {/* Author */}
            <div className="flex items-center gap-2">
              <Avatar 
                className="h-8 w-8 cursor-pointer" 
                onClick={() => navigate(`/view/${response.user_id}`)}
              >
                <AvatarImage src={response.profile?.avatar_url || ''} />
                <AvatarFallback className="text-xs">
                  {response.profile?.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{response.profile?.full_name || 'Anonymous'}</p>
                <p className="text-[10px] text-muted-foreground">
                  {response.profile?.role} · {formatDistanceToNow(new Date(response.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Content */}
            {response.content && (
              <p className="text-sm leading-relaxed">{response.content}</p>
            )}

            {/* Image */}
            {response.media_url && (
              <img 
                src={response.media_url} 
                alt="Spark response" 
                className="w-full h-48 object-cover rounded-lg"
                loading="lazy"
              />
            )}

            {/* Link */}
            {response.link_url && (
              <a 
                href={response.link_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm text-primary truncate">
                  {response.link_title || response.link_url}
                </span>
              </a>
            )}

            {/* Actions */}
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className={cn("gap-1.5", response.liked_by_me && "text-red-500")}
                onClick={() => toggleLike(response.id, !!response.liked_by_me)}
              >
                <Heart className={cn("h-4 w-4", response.liked_by_me && "fill-current")} />
                {response.like_count > 0 && <span className="text-xs">{response.like_count}</span>}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
