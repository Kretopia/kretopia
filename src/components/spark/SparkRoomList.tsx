import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
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

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("spark_rooms")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false });

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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rooms.length} active room{rooms.length !== 1 ? "s" : ""}
        </p>
        <CreateRoomDialog userId={userId} onRoomCreated={fetchRooms} />
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No rooms yet. Start the first conversation!</p>
          <CreateRoomDialog userId={userId} onRoomCreated={fetchRooms} />
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => {
            const catMeta = CATEGORY_META[room.category] || CATEGORY_META.general;
            return (
              <Card
                key={room.id}
                className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => onSelectRoom(room.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{catMeta.emoji}</span>
                      <h3 className="font-semibold truncate">{room.title}</h3>
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
                      <span>by {room.creator_name}</span>
                      <span>{formatDistanceToNow(new Date(room.created_at), { addSuffix: true })}</span>
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
