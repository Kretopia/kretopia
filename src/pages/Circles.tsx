import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MessageSquareMore, TrendingUp, Plus, Search, Users, Sparkles, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircleCard, type CircleData } from "@/components/circle/CircleCard";
import { CircleRecommendations } from "@/components/circle/CircleRecommendations";
import { CircleActivityDigest } from "@/components/circle/CircleActivityDigest";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "all", label: "All", emoji: "🌐" },
  { value: "music", label: "Music", emoji: "🎵" },
  { value: "film", label: "Film", emoji: "🎬" },
  { value: "design", label: "Design", emoji: "🎨" },
  { value: "photo", label: "Photo", emoji: "📸" },
  { value: "tech", label: "Tech", emoji: "💻" },
  { value: "business", label: "Biz", emoji: "💰" },
  { value: "collab", label: "Collabs", emoji: "🤝" },
  { value: "podcast", label: "Podcast", emoji: "🎙️" },
  { value: "writing", label: "Writers", emoji: "✍️" },
  { value: "events", label: "Events", emoji: "🌍" },
];

const CirclesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [circles, setCircles] = useState<CircleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("explore");

  const fetchCircles = useCallback(async () => {
    setLoading(true);
    try {
      const { data: roomsData } = await supabase
        .from("spark_rooms")
        .select("*")
        .eq("is_active", true)
        .order("member_count", { ascending: false });

      if (!roomsData?.length) { setCircles([]); setLoading(false); return; }

      const creatorIds = [...new Set(roomsData.map(r => r.created_by))];
      const [profilesRes, membershipsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", creatorIds),
        user ? supabase.from("spark_room_members").select("room_id, role").eq("user_id", user.id) : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);
      const memberMap = new Map((membershipsRes.data as any[])?.map(m => [m.room_id, m.role]) || []);

      setCircles(roomsData.map(r => ({
        ...r,
        icon_emoji: r.icon_emoji || "💬",
        is_private: r.is_private || false,
        is_paid: r.is_paid || false,
        price_monthly: r.price_monthly || 0,
        currency: r.currency || "USD",
        circle_type: r.circle_type || "community",
        invite_code: r.invite_code || null,
        rules: r.rules || null,
        cover_url: r.cover_url || null,
        creator_name: profileMap.get(r.created_by)?.full_name || "Unknown",
        creator_avatar: profileMap.get(r.created_by)?.avatar_url || undefined,
        is_member: memberMap.has(r.id),
        user_role: memberMap.get(r.id) || undefined,
      })));
    } catch (err) {
      console.error("Error fetching circles:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchCircles(); }, [fetchCircles]);

  const myCircles = circles.filter(c => c.is_member);
  const trendingCircles = circles.slice(0, 5);

  const displayCircles = (activeTab === "mine" ? myCircles : circles).filter(c => {
    const matchSearch = !searchQuery || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = activeCategory === "all" || c.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <>
      <Helmet>
        <title>Circles | ThriveIN</title>
        <meta name="description" content="Join community spaces, discuss ideas, and grow with fellow creatives on ThriveIN." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-24">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <MessageSquareMore className="h-5 w-5 text-primary" />
                  Circles
                </h1>
                <p className="text-sm text-muted-foreground">Community spaces for creatives</p>
              </div>
              <Button variant="gradient" size="sm" className="gap-1.5" onClick={() => navigate("/circles/create")}>
                <Plus className="h-4 w-4" /> Create
              </Button>
            </div>
          </div>

          {/* Trending Banner */}
          {trendingCircles.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trending</p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {trendingCircles.map(c => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/circle/${c.id}`)}
                    className="flex items-center gap-2 bg-card border border-border/50 rounded-full px-3 py-1.5 shrink-0 hover:bg-accent/10 transition-colors"
                  >
                    <span className="text-sm">{c.icon_emoji}</span>
                    <span className="text-xs font-medium truncate max-w-[100px]">{c.title}</span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">{c.member_count}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Recommendations */}
          <CircleRecommendations className="mb-3" />

          {/* Activity Digest (for My Circles tab context) */}
          {activeTab === "mine" && <CircleActivityDigest className="mb-3" />}

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search circles..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors border",
                  activeCategory === cat.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border/50 text-muted-foreground hover:bg-accent/10"
                )}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Tabs: Explore / My Circles */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-3 h-9">
              <TabsTrigger value="explore" className="gap-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                Explore
              </TabsTrigger>
              <TabsTrigger value="mine" className="gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" />
                My Circles
                {myCircles.length > 0 && (
                  <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">
                    {myCircles.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="explore" className="mt-0">
              <CirclesList circles={displayCircles} loading={loading} navigate={navigate} />
            </TabsContent>

            <TabsContent value="mine" className="mt-0">
              {!loading && myCircles.length === 0 ? (
                <Card className="p-8 text-center">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-semibold mb-1">No circles yet</p>
                  <p className="text-sm text-muted-foreground mb-4">Join circles to connect with other creatives</p>
                  <Button variant="gradient" size="sm" onClick={() => setActiveTab("explore")}>
                    <Sparkles className="h-4 w-4 mr-2" /> Explore Circles
                  </Button>
                </Card>
              ) : (
                <CirclesList circles={displayCircles} loading={loading} navigate={navigate} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

const CirclesList = ({ circles, loading, navigate }: { circles: CircleData[]; loading: boolean; navigate: (path: string) => void }) => {
  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (circles.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquareMore className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No circles match your search</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {circles.map(circle => (
        <CircleCard key={circle.id} circle={circle} onClick={() => navigate(`/circle/${circle.id}`)} />
      ))}
    </div>
  );
};

export default CirclesPage;
