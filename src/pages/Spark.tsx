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
import { Flame, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const CREATIVE_CATEGORIES = [
  { id: "all", label: "All", emoji: "🔥" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "visual", label: "Visual Art", emoji: "🎨" },
  { id: "fashion", label: "Fashion", emoji: "👗" },
  { id: "film", label: "Film", emoji: "🎬" },
  { id: "photography", label: "Photo", emoji: "📸" },
  { id: "design", label: "Design", emoji: "✏️" },
  { id: "writing", label: "Writing", emoji: "✍️" },
  { id: "credit", label: "Credits", emoji: "🎬" },
  { id: "award", label: "Awards", emoji: "🏆" },
  { id: "press", label: "Press", emoji: "📰" },
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

type SparkTab = "feed" | "rooms";

const Spark = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<SparkPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [feedKey, setFeedKey] = useState(0);
  const [activeTab, setActiveTab] = useState<SparkTab>("feed");
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

  // If viewing a room detail
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

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Spark - Creative Community Feed | ThriveIN"
        description="Share your work, get feedback, find inspiration, and celebrate fellow creatives."
      />

      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          <h1 className="text-xl font-bold">Spark</h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab("feed")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === "feed"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Flame className="h-4 w-4" />
            Feed
          </button>
          <button
            onClick={() => setActiveTab("rooms")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === "rooms"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="h-4 w-4" />
            Rooms
          </button>
        </div>

        {activeTab === "feed" && (
          <>
            {/* Stories-style prompt bar */}
            {!loading && prompts.length > 0 && (
              <SparkPromptStories
                prompts={prompts}
                userId={user?.id || ""}
                onResponseSubmitted={handlePromptResponse}
              />
            )}

            {loading && (
              <div className="flex gap-3 overflow-hidden">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-16 h-16 rounded-full bg-muted animate-pulse flex-shrink-0" />
                ))}
              </div>
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

            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
              {CREATIVE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                    "border",
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                  )}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Unified feed */}
            <SparkUnifiedFeed
              key={feedKey}
              currentUserId={user?.id || ""}
              categoryFilter={selectedCategory}
            />
          </>
        )}

        {activeTab === "rooms" && user && (
          <SparkRoomList userId={user.id} onSelectRoom={setSelectedRoomId} />
        )}

        {activeTab === "rooms" && !user && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Sign in to join Spark Rooms</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Spark;
