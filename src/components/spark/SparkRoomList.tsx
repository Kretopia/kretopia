import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, Users, Search, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  all: { emoji: "🔥", label: "All" },
  general: { emoji: "💬", label: "General" },
  music: { emoji: "🎵", label: "Music" },
  "visual-art": { emoji: "🎨", label: "Visual Art" },
  film: { emoji: "🎬", label: "Film" },
  photography: { emoji: "📸", label: "Photo" },
  design: { emoji: "✏️", label: "Design" },
  writing: { emoji: "✍️", label: "Writing" },
  feedback: { emoji: "💡", label: "Feedback" },
  collab: { emoji: "🤝", label: "Collab" },
};

interface SparkRoom {
  id: string;
  title: string;
  description: string | null;
  category: string;
  member_count: number;
  message_count: number;
  created_at: string;
  created_by: string;
  is_trending: boolean;
  last_message_at: string;
  creator_name?: string;
  creator_avatar?: string;
}

interface SparkRoomListProps {
  userId: string;
  onSelectRoom: (roomId: string) => void;
}

export const SparkRoomList = ({ userId, onSelectRoom }: SparkRoomListProps) => {
  const [rooms, setRooms] = useState<SparkRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "trending">("recent");

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("spark_rooms")
        .select("*")
        .eq("is_active", true)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map((r) => r.created_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", creatorIds);

        const enriched = data.map((room) => {
          const profile = profiles?.find((p) => p.user_id === room.created_by);
          return {
            ...room,
            creator_name: profile?.full_name || "Creator",
            creator_avatar: profile?.avatar_url,
          };
        });
        setRooms(enriched);
      } else {
        setRooms([]);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms
    .filter((room) => {
      if (categoryFilter !== "all" && room.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return room.title.toLowerCase().includes(q) || room.description?.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "trending") {
        return b.message_count - a.message_count;
      }
      return new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime();
    });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search rooms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key)}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
              categoryFilter === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="text-sm">{meta.emoji}</span>
            {meta.label}
          </button>
        ))}
      </div>

      {/* Sort & count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredRooms.length} room{filteredRooms.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSortBy("recent")}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
              sortBy === "recent" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="h-3 w-3" /> Recent
          </button>
          <button
            onClick={() => setSortBy("trending")}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
              sortBy === "trending" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="h-3 w-3" /> Trending
          </button>
          <CreateRoomDialog userId={userId} onRoomCreated={fetchRooms} />
        </div>
      </div>

      {filteredRooms.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {search || categoryFilter !== "all" ? "No rooms match your filter" : "No rooms yet. Start the first conversation!"}
          </p>
          {!search && categoryFilter === "all" && (
            <CreateRoomDialog userId={userId} onRoomCreated={fetchRooms} />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRooms.map((room) => {
            const catMeta = CATEGORY_META[room.category] || CATEGORY_META.general;
            return (
              <Card
                key={room.id}
                className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-l-4"
                style={{ borderLeftColor: room.is_trending ? "hsl(var(--primary))" : "transparent" }}
                onClick={() => onSelectRoom(room.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{catMeta.emoji}</span>
                      <h3 className="font-semibold truncate">{room.title}</h3>
                      {room.is_trending && (
                        <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-destructive text-destructive-foreground">
                          <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                          HOT
                        </Badge>
                      )}
                    </div>
                    {room.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {room.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {room.message_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {room.member_count}
                      </span>
                      <span>by {room.creator_name}</span>
                      <span>{formatDistanceToNow(new Date(room.last_message_at || room.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                    {catMeta.label}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
