import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FeedPost } from "@/components/feed/FeedPost";
import { Loader2, Flame } from "lucide-react";

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
      const { data: profiles } = await (supabase
        .from("feed_profiles" as any)
        .select("user_id, full_name, avatar_url, role")
        .in("user_id", userIds)) as { data: { user_id: string; full_name: string; avatar_url: string | null; role: string }[] | null };

      // Fetch portfolio item data for activity posts that reference portfolio items
      const portfolioSourceIds = data
        .filter((p) => p.source_type === "portfolio" && p.source_id)
        .map((p) => p.source_id);
      
      let portfolioItems: any[] = [];
      if (portfolioSourceIds.length > 0) {
        const { data: items } = await supabase
          .from("portfolio_items")
          .select("id, title, media_type, media_url, thumbnail_url")
          .in("id", portfolioSourceIds);
        portfolioItems = items || [];
      }

      const enriched = data.map((post) => {
        const profile = profiles?.find((p) => p.user_id === post.user_id);
        
        // Enrich portfolio activity posts with media URL and thumbnail
        let linkUrl = post.link_url;
        let linkTitle = post.link_title;
        let portfolioThumbnail: string | null = null;
        if (post.source_type === "portfolio" && post.source_id) {
          const portfolioItem = portfolioItems.find((pi) => pi.id === post.source_id);
          if (portfolioItem) {
            if (!linkUrl && portfolioItem.media_url) {
              linkUrl = portfolioItem.media_url;
              linkTitle = portfolioItem.title;
            }
            // Always grab the thumbnail for preview
            portfolioThumbnail = portfolioItem.thumbnail_url || null;
          }
        }

        return {
          ...post,
          link_url: linkUrl,
          link_title: linkTitle,
          portfolio_thumbnail: portfolioThumbnail,
          media_urls: post.media_urls || [],
          tags: post.tags || [],
          profile: {
            full_name: profile?.full_name || "New Creative",
            avatar_url: profile?.avatar_url || null,
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
    <div className="space-y-3">
      {posts.map((post) => (
        <FeedPost
          key={post.id}
          post={post}
          onDelete={fetchPosts}
        />
      ))}
    </div>
  );
};
