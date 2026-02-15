import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { SparkPromptStories } from "@/components/spark/SparkPromptStories";
import { SparkPostComposer } from "@/components/spark/SparkPostComposer";
import { SparkUnifiedFeed } from "@/components/spark/SparkUnifiedFeed";
import { SparkRoomList } from "@/components/spark/SparkRoomList";
import { SparkRoomDetail } from "@/components/spark/SparkRoomDetail";
import { Flame, MessageSquare, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "all", label: "All", emoji: "🔥" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "visual", label: "Visual Art", emoji: "🎨" },
  { id: "fashion", label: "Fashion", emoji: "👗" },
  { id: "film", label: "Film", emoji: "🎬" },
  { id: "photography", label: "Photo", emoji: "📸" },
  { id: "design", label: "Design", emoji: "✏️" },
  { id: "writing", label: "Writing", emoji: "✍️" },
];

interface SparkPrompt {
  id: string;
  title: string;
  description: string;
  prompt_type: string;
  category: string;
  tags: string[];
  active_date: string;
  response_count: number;
}

const Spark = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<SparkPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [feedKey, setFeedKey] = useState(0);
  const [showRooms, setShowRooms] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  useEffect(() => {
    fetchPrompts();
    if (user?.id) fetchProfile();
  }, [user?.id]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, role")
      .eq("user_id", user.id)
      .single();
    setUserProfile(data);
  };

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("spark_prompts")
        .select("*")
        .eq("is_active", true)
        .or(`active_date.eq.${today},prompt_type.eq.weekly_challenge`)
        .order("prompt_type", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        await generateDailyPrompt();
      } else {
        setPrompts(data);
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyPrompt = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-spark-prompt");
      if (error) throw error;
      if (data?.prompts) setPrompts(data.prompts);
    } catch (error) {
      console.error("Error generating prompt:", error);
      const fallback: SparkPrompt = {
        id: "fallback",
        title: "Show us your creative workspace 🎨",
        description: "Share a photo, describe it, or link to something that inspires your work today.",
        prompt_type: "daily",
        category: "general",
        tags: ["workspace", "inspiration"],
        active_date: new Date().toISOString().split("T")[0],
        response_count: 0,
      };
      setPrompts([fallback]);
    }
  };

  const handlePostCreated = () => {
    setFeedKey((k) => k + 1);
    toast({ title: "Posted! 🔥" });
  };

  const handlePromptResponse = () => {
    setFeedKey((k) => k + 1);
    fetchPrompts();
    toast({ title: "Spark shared! 🔥", description: "Your response is live" });
  };

  // Room detail view
  if (selectedRoomId && user) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Spark Room | ThriveIN" description="Join the conversation in this Spark room." />
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
          <SparkRoomDetail
            roomId={selectedRoomId}
            userId={user.id}
            onBack={() => setSelectedRoomId(null)}
          />
        </div>
      </div>
    );
  }

  // Rooms list view
  if (showRooms && user) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Spark Rooms | ThriveIN" description="Topic-based creative conversations." />
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowRooms(false)} className="gap-1 -ml-2">
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back
            </Button>
            <h1 className="text-lg font-bold">Spark Rooms</h1>
          </div>
          <SparkRoomList userId={user.id} onSelectRoom={setSelectedRoomId} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Spark - Creative Community Feed | ThriveIN"
        description="Share your work, get feedback, find inspiration, and celebrate fellow creatives."
      />

      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-4">
        {/* Header with Rooms shortcut */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h1 className="text-xl font-bold">Spark</h1>
          </div>
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRooms(true)}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              Rooms
            </Button>
          )}
        </div>

        {/* Prompt stories (compact) */}
        {!loading && prompts.length > 0 && (
          <SparkPromptStories
            prompts={prompts}
            userId={user?.id || ""}
            onResponseSubmitted={handlePromptResponse}
          />
        )}

        {/* Post composer */}
        {user && (
          <SparkPostComposer
            userId={user.id}
            userAvatar={userProfile?.avatar_url}
            userName={userProfile?.full_name}
            onPostCreated={handlePostCreated}
          />
        )}

        {/* Category chips — single scrollable row */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-sm">{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        <SparkUnifiedFeed
          key={feedKey}
          currentUserId={user?.id || ""}
          categoryFilter={selectedCategory}
        />
      </div>
    </div>
  );
};

export default Spark;
