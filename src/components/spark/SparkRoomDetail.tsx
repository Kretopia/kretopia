import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface RoomMessage {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface RoomInfo {
  id: string;
  title: string;
  description: string | null;
  category: string;
  message_count: number;
  created_by: string;
}

interface SparkRoomDetailProps {
  roomId: string;
  userId: string;
  onBack: () => void;
}

export const SparkRoomDetail = ({ roomId, userId, onBack }: SparkRoomDetailProps) => {
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileCacheRef = useRef<Map<string, { full_name: string; avatar_url: string | null }>>(new Map());

  useEffect(() => {
    fetchRoom();
    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "spark_room_messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const newMsg = payload.new as any;
          const profile = await getProfile(newMsg.user_id);
          setMessages((prev) => [...prev, { ...newMsg, profile }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getProfile = async (uid: string) => {
    if (profileCacheRef.current.has(uid)) {
      return profileCacheRef.current.get(uid)!;
    }
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", uid)
      .maybeSingle();
    const profile = { full_name: data?.full_name || "Creator", avatar_url: data?.avatar_url || null };
    profileCacheRef.current.set(uid, profile);
    return profile;
  };

  const fetchRoom = async () => {
    const { data } = await supabase
      .from("spark_rooms")
      .select("id, title, description, category, message_count, created_by")
      .eq("id", roomId)
      .single();
    if (data) setRoom(data);
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("spark_room_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;
      if (!data || data.length === 0) {
        setMessages([]);
        return;
      }

      const userIds = [...new Set(data.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      profiles?.forEach((p) => {
        profileCacheRef.current.set(p.user_id, { full_name: p.full_name || "Creator", avatar_url: p.avatar_url });
      });

      const enriched = data.map((msg) => ({
        ...msg,
        profile: profiles?.find((p) => p.user_id === msg.user_id)
          ? { full_name: profiles.find((p) => p.user_id === msg.user_id)!.full_name || "Creator", avatar_url: profiles.find((p) => p.user_id === msg.user_id)!.avatar_url }
          : { full_name: "Creator", avatar_url: null },
      }));

      setMessages(enriched);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from("spark_room_messages").insert({
        room_id: roomId,
        user_id: userId,
        content: messageText.trim(),
      });

      if (error) throw error;
      setMessageText("");
    } catch (error: any) {
      toast.error("Failed to send message");
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading && !room) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      {/* Room Header */}
      <div className="flex items-center gap-3 pb-3 border-b mb-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{room?.title}</h2>
          {room?.description && (
            <p className="text-xs text-muted-foreground truncate">{room.description}</p>
          )}
        </div>
        <Badge variant="secondary" className="text-[10px] flex-shrink-0">
          <MessageSquare className="h-3 w-3 mr-1" />
          {room?.message_count || 0}
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && !loading && (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Start the conversation!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.user_id === userId;
          return (
            <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
              {!isOwn && (
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarImage src={msg.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{msg.profile?.full_name?.[0]}</AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-[75%] ${isOwn ? "items-end" : ""}`}>
                {!isOwn && (
                  <p className="text-[11px] text-muted-foreground font-medium mb-0.5 ml-1">
                    {msg.profile?.full_name}
                  </p>
                )}
                <div
                  className={`rounded-2xl px-3 py-2 text-sm ${
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
                <p className={`text-[10px] text-muted-foreground mt-0.5 ${isOwn ? "text-right mr-1" : "ml-1"}`}>
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t mt-3">
        <Input
          placeholder="Type a message..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={!messageText.trim() || sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
