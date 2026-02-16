import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Send, Loader2, MessageSquare, Pin, Reply, Smile, MoreVertical, Users, Shield, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const REACTION_EMOJIS = ["🔥", "❤️", "👏", "💡", "🎯", "😂"];

interface RoomMessage {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  pinned_at: string | null;
  pinned_by: string | null;
  reply_to_id: string | null;
  profile?: { full_name: string; avatar_url: string | null };
  reactions?: Record<string, string[]>; // emoji -> user_ids
  reply_preview?: { content: string; full_name: string } | null;
}

interface RoomInfo {
  id: string;
  title: string;
  description: string | null;
  category: string;
  message_count: number;
  created_by: string;
  member_count: number;
  rules: string | null;
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
  const [replyTo, setReplyTo] = useState<RoomMessage | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("member");
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileCacheRef = useRef<Map<string, { full_name: string; avatar_url: string | null }>>(new Map());

  useEffect(() => {
    fetchRoom();
    fetchMessages();
    joinRoom();
    fetchUserRole();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "spark_room_messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const newMsg = payload.new as any;
          const profile = await getProfile(newMsg.user_id);
          const enriched: RoomMessage = { ...newMsg, profile, reactions: {} };
          if (newMsg.reply_to_id) {
            enriched.reply_preview = await getReplyPreview(newMsg.reply_to_id);
          }
          setMessages((prev) => [...prev, enriched]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getProfile = async (uid: string) => {
    if (profileCacheRef.current.has(uid)) return profileCacheRef.current.get(uid)!;
    const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", uid).maybeSingle();
    const profile = { full_name: data?.full_name || "Creator", avatar_url: data?.avatar_url || null };
    profileCacheRef.current.set(uid, profile);
    return profile;
  };

  const getReplyPreview = async (msgId: string) => {
    const found = messages.find((m) => m.id === msgId);
    if (found) return { content: found.content, full_name: found.profile?.full_name || "Creator" };
    const { data } = await supabase.from("spark_room_messages").select("content, user_id").eq("id", msgId).maybeSingle();
    if (!data) return null;
    const profile = await getProfile(data.user_id);
    return { content: data.content, full_name: profile.full_name };
  };

  const joinRoom = async () => {
    await supabase.from("spark_room_members").upsert(
      { room_id: roomId, user_id: userId, role: "member" },
      { onConflict: "room_id,user_id" }
    );
  };

  const fetchUserRole = async () => {
    const { data } = await supabase
      .from("spark_room_members")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data) setUserRole(data.role);
    
    // Room creator is always admin
    const { data: roomData } = await supabase.from("spark_rooms").select("created_by").eq("id", roomId).single();
    if (roomData?.created_by === userId) setUserRole("admin");
  };

  const fetchRoom = async () => {
    const { data } = await supabase
      .from("spark_rooms")
      .select("id, title, description, category, message_count, created_by, member_count, rules")
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
      if (!data || data.length === 0) { setMessages([]); setLoading(false); return; }

      const userIds = [...new Set(data.map((m) => m.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      profiles?.forEach((p) => {
        profileCacheRef.current.set(p.user_id, { full_name: p.full_name || "Creator", avatar_url: p.avatar_url });
      });

      // Fetch reactions
      const msgIds = data.map((m) => m.id);
      const { data: reactions } = await supabase.from("spark_room_reactions").select("*").in("message_id", msgIds);

      const reactionMap: Record<string, Record<string, string[]>> = {};
      reactions?.forEach((r) => {
        if (!reactionMap[r.message_id]) reactionMap[r.message_id] = {};
        if (!reactionMap[r.message_id][r.emoji]) reactionMap[r.message_id][r.emoji] = [];
        reactionMap[r.message_id][r.emoji].push(r.user_id);
      });

      const enriched = await Promise.all(data.map(async (msg) => {
        const profile = profiles?.find((p) => p.user_id === msg.user_id);
        let reply_preview = null;
        if (msg.reply_to_id) {
          const replyMsg = data.find((m) => m.id === msg.reply_to_id);
          if (replyMsg) {
            const rp = profiles?.find((p) => p.user_id === replyMsg.user_id);
            reply_preview = { content: replyMsg.content, full_name: rp?.full_name || "Creator" };
          }
        }
        return {
          ...msg,
          profile: profile ? { full_name: profile.full_name || "Creator", avatar_url: profile.avatar_url } : { full_name: "Creator", avatar_url: null },
          reactions: reactionMap[msg.id] || {},
          reply_preview,
        };
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
        reply_to_id: replyTo?.id || null,
      });
      if (error) throw error;
      setMessageText("");
      setReplyTo(null);
    } catch (error: any) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    setShowReactionPicker(null);
    const existing = messages.find((m) => m.id === messageId)?.reactions?.[emoji];
    if (existing?.includes(userId)) {
      await supabase.from("spark_room_reactions").delete().eq("message_id", messageId).eq("user_id", userId).eq("emoji", emoji);
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const updated = { ...m.reactions };
          if (updated[emoji]) updated[emoji] = updated[emoji].filter((id) => id !== userId);
          if (updated[emoji]?.length === 0) delete updated[emoji];
          return { ...m, reactions: updated };
        })
      );
    } else {
      await supabase.from("spark_room_reactions").insert({ message_id: messageId, user_id: userId, emoji });
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const updated = { ...m.reactions };
          if (!updated[emoji]) updated[emoji] = [];
          updated[emoji] = [...updated[emoji], userId];
          return { ...m, reactions: updated };
        })
      );
    }
  };

  const handlePin = async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    const isPinned = !!msg.pinned_at;
    await supabase.from("spark_room_messages").update({
      pinned_at: isPinned ? null : new Date().toISOString(),
      pinned_by: isPinned ? null : userId,
    }).eq("id", messageId);
    setMessages((prev) =>
      prev.map((m) => m.id === messageId ? { ...m, pinned_at: isPinned ? null : new Date().toISOString(), pinned_by: isPinned ? null : userId } : m)
    );
    toast.success(isPinned ? "Unpinned" : "Pinned! 📌");
  };

  const fetchMembers = async () => {
    const { data } = await supabase.from("spark_room_members").select("*").eq("room_id", roomId);
    if (!data) return;
    const userIds = data.map((m) => m.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
    setMembers(data.map((m) => ({
      ...m,
      profile: profiles?.find((p) => p.user_id === m.user_id),
    })));
    setShowMembers(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const pinnedMessages = messages.filter((m) => m.pinned_at);
  const isModOrAdmin = userRole === "admin" || userRole === "moderator";

  if (loading && !room) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      {/* Room Header */}
      <div className="flex items-center gap-3 pb-3 border-b mb-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{room?.title}</h2>
          {room?.description && <p className="text-xs text-muted-foreground truncate">{room.description}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={fetchMembers}>
            <Users className="h-3.5 w-3.5" />
            {room?.member_count || 0}
          </Button>
          <Badge variant="secondary" className="text-[10px]">
            <MessageSquare className="h-3 w-3 mr-1" />
            {room?.message_count || 0}
          </Badge>
        </div>
      </div>

      {/* Pinned messages banner */}
      {pinnedMessages.length > 0 && (
        <div className="bg-muted/50 border rounded-lg p-2 mb-2 space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Pin className="h-3 w-3" /> Pinned ({pinnedMessages.length})
          </div>
          {pinnedMessages.slice(0, 2).map((pm) => (
            <p key={pm.id} className="text-xs truncate text-foreground/80">
              <span className="font-medium">{pm.profile?.full_name}:</span> {pm.content}
            </p>
          ))}
        </div>
      )}

      {/* Members panel */}
      {showMembers && (
        <div className="bg-muted/30 border rounded-lg p-3 mb-2 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Members ({members.length})</h3>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowMembers(false)}>Close</Button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1.5">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={m.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">{m.profile?.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{m.profile?.full_name || "Member"}</span>
                  {m.role !== "member" && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {m.role === "admin" ? <Shield className="h-2.5 w-2.5 mr-0.5" /> : null}
                      {m.role}
                    </Badge>
                  )}
                </div>
                {isModOrAdmin && m.user_id !== userId && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                    onClick={async () => {
                      await supabase.from("spark_room_members").update({ is_muted: !m.is_muted }).eq("id", m.id);
                      fetchMembers();
                      toast.success(m.is_muted ? "Unmuted" : "Muted");
                    }}
                  >
                    <UserMinus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
            <div key={msg.id} className={`group flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
              {!isOwn && (
                <Avatar className="h-7 w-7 flex-shrink-0 mt-4">
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

                {/* Reply preview */}
                {msg.reply_preview && (
                  <div className={cn("text-[11px] px-2 py-1 mb-0.5 rounded border-l-2 border-primary/40 bg-muted/50", isOwn ? "ml-auto" : "")}>
                    <span className="font-medium">{msg.reply_preview.full_name}:</span>{" "}
                    <span className="text-muted-foreground">{msg.reply_preview.content.slice(0, 60)}</span>
                  </div>
                )}

                <div className="relative">
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm",
                      isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md",
                      msg.pinned_at && "ring-1 ring-orange-400/50"
                    )}
                  >
                    {msg.pinned_at && <Pin className="h-3 w-3 text-orange-400 inline mr-1" />}
                    {msg.content}
                  </div>

                  {/* Action buttons (visible on hover) */}
                  <div className={cn(
                    "absolute top-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
                    isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"
                  )}>
                    <button
                      className="h-6 w-6 rounded-full bg-background border flex items-center justify-center hover:bg-muted"
                      onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                    >
                      <Smile className="h-3 w-3" />
                    </button>
                    <button
                      className="h-6 w-6 rounded-full bg-background border flex items-center justify-center hover:bg-muted"
                      onClick={() => setReplyTo(msg)}
                    >
                      <Reply className="h-3 w-3" />
                    </button>
                    {isModOrAdmin && (
                      <button
                        className="h-6 w-6 rounded-full bg-background border flex items-center justify-center hover:bg-muted"
                        onClick={() => handlePin(msg.id)}
                      >
                        <Pin className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Reaction picker */}
                  {showReactionPicker === msg.id && (
                    <div className={cn(
                      "absolute bottom-full mb-1 flex gap-0.5 bg-background border rounded-full px-1 py-0.5 shadow-lg z-10",
                      isOwn ? "right-0" : "left-0"
                    )}>
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center text-sm"
                          onClick={() => handleReaction(msg.id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reactions display */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className={cn("flex flex-wrap gap-1 mt-1", isOwn ? "justify-end" : "")}>
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(msg.id, emoji)}
                        className={cn(
                          "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
                          users.includes(userId) ? "bg-primary/10 border-primary/30" : "bg-muted/50 border-transparent hover:border-muted"
                        )}
                      >
                        <span>{emoji}</span>
                        <span className="text-[10px] text-muted-foreground">{users.length}</span>
                      </button>
                    ))}
                  </div>
                )}

                <p className={`text-[10px] text-muted-foreground mt-0.5 ${isOwn ? "text-right mr-1" : "ml-1"}`}>
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-t text-xs">
          <Reply className="h-3 w-3 text-primary" />
          <span className="truncate flex-1">
            Replying to <span className="font-medium">{replyTo.profile?.full_name}</span>: {replyTo.content.slice(0, 50)}
          </span>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setReplyTo(null)}>✕</Button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t mt-2">
        <Input
          placeholder={replyTo ? "Reply..." : "Type a message..."}
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
