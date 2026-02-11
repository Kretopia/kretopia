import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FeedPost } from "@/components/feed/FeedPost";
import { Loader2, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SparkUnifiedFeedProps {
  currentUserId: string;
  categoryFilter: string;
}

const POST_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  activity: { label: "Activity", emoji: "⚡" },
  feedback_request: { label: "Seeking Feedback", emoji: "💡" },
  post: { label: "", emoji: "" },
};

const SOURCE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  credit: { label: "🎬 New Credit", color: "text-purple-500" },
  award: { label: "🏆 Award", color: "text-amber-500" },
  portfolio: { label: "✨ New Work", color: "text-primary" },
  press: { label: "📰 Press", color: "text-blue-500" },
};

export const SparkUnifiedFeed = ({ currentUserId, categoryFilter }: SparkUnifiedFeedProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel("spark-unified-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_posts" }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [categoryFilter]);

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from("feed_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data) return;

      // Fetch profiles
      const userIds = [...new Set(data.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, role")
        .in("user_id", userIds);

      const enriched = data.map((post) => {
        const profile = profiles?.find((p) => p.user_id === post.user_id);
        return {
          ...post,
          media_urls: post.media_urls || [],
          tags: post.tags || [],
          profile: {
            full_name: profile?.full_name || "Creative",
            avatar_url: profile?.avatar_url,
            role: profile?.role || "Creator",
          },
        };
      });

      setPosts(enriched);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <Flame className="h-8 w-8 mx-auto text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No sparks yet. Be the first to post!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const typeInfo = POST_TYPE_LABELS[post.post_type] || POST_TYPE_LABELS.post;
        const sourceInfo = post.source_type ? SOURCE_TYPE_LABELS[post.source_type] : null;

        return (
          <div key={post.id}>
            {/* Activity / feedback badge */}
            {(typeInfo.label || sourceInfo) && (
              <div className="flex items-center gap-2 mb-2 ml-1">
                {sourceInfo && (
                  <Badge variant="outline" className={`text-[10px] ${sourceInfo.color}`}>
                    {sourceInfo.label}
                  </Badge>
                )}
                {typeInfo.label && (
                  <Badge variant="secondary" className="text-[10px]">
                    {typeInfo.emoji} {typeInfo.label}
                  </Badge>
                )}
              </div>
            )}
            <FeedPost
              post={post}
              onDelete={fetchPosts}
            />
          </div>
        );
      })}
    </div>
  );
};
