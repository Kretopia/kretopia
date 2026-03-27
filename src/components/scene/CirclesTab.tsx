import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus, Loader2, MessageSquare, Users, Search, Send, ArrowLeft,
  Share2, Lock, Globe, Smile, Reply, Copy, Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Circle {
  id: string;
  title: string;
  description: string | null;
  category: string;
  icon_emoji: string;
  cover_image_url: string | null;
  member_count: number;
  message_count: number;
  created_by: string;
  created_at: string;
  is_active: boolean;
  is_private: boolean;
  invite_code: string | null;
  creator_name?: string;
  creator_avatar?: string;
  is_member?: boolean;
}

interface CircleMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  media_url: string | null;
  media_type: string | null;
  message_type: string;
  reply_to_id: string | null;
  poll_data: any;
  sender_name?: string;
  sender_avatar?: string;
  reactions?: Record<string, string[]>; // emoji -> user_ids
  reply_preview?: { content: string; sender_name: string } | null;
}

const CIRCLE_CATEGORIES = [
  { value: "general", label: "General", emoji: "💬" },
  { value: "music", label: "Music", emoji: "🎵" },
  { value: "film", label: "Film & Video", emoji: "🎬" },
  { value: "design", label: "Design", emoji: "🎨" },
  { value: "photo", label: "Photography", emoji: "📸" },
  { value: "tech", label: "Creative Tech", emoji: "💻" },
  { value: "business", label: "Creator Biz", emoji: "💰" },
  { value: "collab", label: "Collabs", emoji: "🤝" },
  { value: "feedback", label: "Feedback", emoji: "🎯" },
  { value: "podcast", label: "Podcasters", emoji: "🎙️" },
  { value: "writing", label: "Writers", emoji: "✍️" },
  { value: "events", label: "Events & Culture", emoji: "🌍" },
];

const REACTION_EMOJIS = ["🔥", "❤️", "🙌", "💯", "😂", "🎯"];

export const CirclesTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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
        user ? supabase.from("spark_room_members").select("room_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);
      const memberRoomIds = new Set(membershipsRes.data?.map((m: any) => m.room_id) || []);

      setCircles(roomsData.map(r => ({
        ...r,
        icon_emoji: r.icon_emoji || "💬",
        is_private: r.is_private || false,
        invite_code: r.invite_code || null,
        creator_name: profileMap.get(r.created_by)?.full_name || "Unknown",
        creator_avatar: profileMap.get(r.created_by)?.avatar_url || undefined,
        is_member: memberRoomIds.has(r.id),
      })));
    } catch (err) {
      console.error("Error fetching circles:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchCircles(); }, [fetchCircles]);

  const filteredCircles = circles.filter(c =>
    !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedCircle) {
    return <CircleDetail circle={selectedCircle} onBack={() => { setSelectedCircle(null); fetchCircles(); }} />;
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search circles..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50" />
        </div>
        <CreateCircleDialog open={showCreate} onOpenChange={setShowCreate} onCreated={fetchCircles} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filteredCircles.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="font-semibold mb-1">No circles yet</p>
          <p className="text-sm text-muted-foreground mb-4">Start a conversation with the community</p>
          <Button variant="gradient" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Create Circle</Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredCircles.map(circle => (
            <CircleCard key={circle.id} circle={circle} onClick={() => setSelectedCircle(circle)} />
          ))}
        </div>
      )}
    </div>
  );
};

const CircleCard = ({ circle, onClick }: { circle: Circle; onClick: () => void }) => (
  <div className="flex gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/5 cursor-pointer transition-all hover:shadow-md" onClick={onClick}>
    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-xl">
      {circle.icon_emoji}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <h3 className="font-semibold text-sm truncate">{circle.title}</h3>
        {circle.is_private && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
        {circle.is_member && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">Joined</Badge>}
      </div>
      {circle.description && <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{circle.description}</p>}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {circle.member_count}</span>
        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {circle.message_count}</span>
      </div>
    </div>
  </div>
);

// ─── Circle Detail with rich messaging ───
const CircleDetail = ({ circle, onBack }: { circle: Circle; onBack: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isMember, setIsMember] = useState(circle.is_member || false);
  const [replyTo, setReplyTo] = useState<CircleMessage | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("spark_room_messages")
      .select("*")
      .eq("room_id", circle.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data?.length) {
      const userIds = [...new Set(data.map(m => m.user_id))];
      const replyIds = data.filter(m => m.reply_to_id).map(m => m.reply_to_id);

      const [profilesRes, reactionsRes, repliesRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds),
        supabase.from("spark_message_reactions").select("*").in("message_id", data.map(m => m.id)),
        replyIds.length > 0
          ? supabase.from("spark_room_messages").select("id, content, user_id").in("id", replyIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);
      
      // Build reactions map: message_id -> { emoji -> [user_ids] }
      const reactionsMap = new Map<string, Record<string, string[]>>();
      reactionsRes.data?.forEach((r: any) => {
        if (!reactionsMap.has(r.message_id)) reactionsMap.set(r.message_id, {});
        const map = reactionsMap.get(r.message_id)!;
        if (!map[r.emoji]) map[r.emoji] = [];
        map[r.emoji].push(r.user_id);
      });

      const replyMap = new Map<string, { content: string; sender_name: string }>(
        (repliesRes.data || []).map((r: any) => [r.id, {
          content: r.content?.substring(0, 60) || "",
          sender_name: profileMap.get(r.user_id)?.full_name || "Unknown",
        }])
      );

      setMessages(data.map(m => ({
        ...m,
        message_type: m.message_type || "text",
        reply_to_id: m.reply_to_id || null,
        poll_data: m.poll_data || null,
        media_type: m.media_type || null,
        sender_name: profileMap.get(m.user_id)?.full_name || "Unknown",
        sender_avatar: profileMap.get(m.user_id)?.avatar_url || undefined,
        reactions: reactionsMap.get(m.id) || {},
        reply_preview: m.reply_to_id ? replyMap.get(m.reply_to_id) || null : null,
      })));
    } else {
      setMessages([]);
    }
    setLoading(false);
  }, [circle.id]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`circle-${circle.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "spark_room_messages", filter: `room_id=eq.${circle.id}` }, () => fetchMessages())
      .on("postgres_changes", { event: "*", schema: "public", table: "spark_message_reactions" }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [circle.id, fetchMessages]);

  const joinCircle = async () => {
    if (!user) return;
    await supabase.from("spark_room_members").insert({ room_id: circle.id, user_id: user.id });
    setIsMember(true);
    toast({ title: "Joined!", description: `You're now in ${circle.title}` });
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim() || sending) return;
    setSending(true);
    if (!isMember) {
      await supabase.from("spark_room_members").insert({ room_id: circle.id, user_id: user.id });
      setIsMember(true);
    }
    await supabase.from("spark_room_messages").insert({
      room_id: circle.id,
      user_id: user.id,
      content: newMessage.trim(),
      reply_to_id: replyTo?.id || null,
      message_type: "text",
    });
    setNewMessage("");
    setReplyTo(null);
    setSending(false);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }

    if (!isMember) {
      await supabase.from("spark_room_members").insert({ room_id: circle.id, user_id: user.id });
      setIsMember(true);
    }

    const ext = file.name.split(".").pop();
    const path = `circles/${circle.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file);
    if (error) { toast({ title: "Upload failed", variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);

    const mediaType = file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image";
    await supabase.from("spark_room_messages").insert({
      room_id: circle.id,
      user_id: user.id,
      content: "",
      media_url: urlData.publicUrl,
      media_type: mediaType,
      message_type: "media",
    });
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const msg = messages.find(m => m.id === messageId);
    const hasReacted = msg?.reactions?.[emoji]?.includes(user.id);
    if (hasReacted) {
      await supabase.from("spark_message_reactions").delete()
        .eq("message_id", messageId).eq("user_id", user.id).eq("emoji", emoji);
    } else {
      await supabase.from("spark_message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
    }
    setShowReactions(null);
  };

  const shareCircle = async () => {
    const url = `${window.location.origin}/scene?circle=${circle.invite_code || circle.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copied! 🔗", description: "Share it with others" });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border/50">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-lg shrink-0">
          {circle.icon_emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="font-semibold text-sm truncate">{circle.title}</h2>
            {circle.is_private ? <Lock className="h-3 w-3 text-muted-foreground" /> : <Globe className="h-3 w-3 text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground">{circle.member_count} members</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={shareCircle}>
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
        </Button>
        {!isMember && <Button size="sm" variant="gradient" onClick={joinCircle}>Join</Button>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 space-y-1">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.user_id === user?.id;
            return (
              <div key={msg.id} className="group px-1">
                {/* Reply preview */}
                {msg.reply_preview && (
                  <div className={cn("flex mb-0.5", isOwn && "justify-end")}>
                    <div className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-0.5 max-w-[60%] truncate flex items-center gap-1">
                      <Reply className="h-2.5 w-2.5 shrink-0" />
                      <span className="font-medium">{msg.reply_preview.sender_name}:</span> {msg.reply_preview.content}
                    </div>
                  </div>
                )}
                <div className={cn("flex gap-2 items-end", isOwn && "flex-row-reverse")}>
                  {!isOwn && (
                    <Avatar className="h-6 w-6 shrink-0 mb-1">
                      <AvatarImage src={msg.sender_avatar || ""} />
                      <AvatarFallback className="text-[9px]">{msg.sender_name?.[0]}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="max-w-[75%]">
                    <div className={cn(
                      "rounded-2xl px-3 py-2 relative",
                      isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
                    )}>
                      {!isOwn && <p className="text-[10px] font-medium mb-0.5 opacity-70">{msg.sender_name}</p>}

                      {/* Media content */}
                      {msg.media_url && msg.media_type === "image" && (
                        <img src={msg.media_url} className="rounded-lg max-h-52 mb-1" alt="shared" loading="lazy" />
                      )}
                      {msg.media_url && msg.media_type === "video" && (
                        <video src={msg.media_url} controls className="rounded-lg max-h-52 mb-1 w-full" />
                      )}
                      {msg.media_url && msg.media_type === "audio" && (
                        <audio src={msg.media_url} controls className="mb-1 w-full max-w-[200px]" />
                      )}

                      {msg.content && <p className="text-sm break-words">{msg.content}</p>}
                      <p className={cn("text-[10px] mt-0.5 opacity-50", isOwn ? "text-primary-foreground" : "text-muted-foreground")}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Reactions display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className={cn("flex flex-wrap gap-1 mt-0.5", isOwn && "justify-end")}>
                        {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded-full border transition-colors",
                              userIds.includes(user?.id || "")
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-muted/50 border-border/50 hover:bg-muted"
                            )}
                          >
                            {emoji} {userIds.length}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action buttons (visible on hover) */}
                  <div className={cn("flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mb-1", isOwn && "flex-row-reverse")}>
                    <button
                      className="p-1 rounded hover:bg-muted/80 text-muted-foreground"
                      onClick={() => setReplyTo(msg)}
                      title="Reply"
                    >
                      <Reply className="h-3 w-3" />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-muted/80 text-muted-foreground relative"
                      onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                      title="React"
                    >
                      <Smile className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Reaction picker */}
                {showReactions === msg.id && (
                  <div className={cn("flex gap-1 mt-1 ml-8 p-1.5 bg-card rounded-full border border-border/50 shadow-lg w-fit", isOwn && "ml-auto mr-8")}>
                    {REACTION_EMOJIS.map(emoji => (
                      <button key={emoji} className="text-sm hover:scale-125 transition-transform p-0.5" onClick={() => toggleReaction(msg.id, emoji)}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border/30 bg-muted/30">
          <Reply className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground truncate flex-1">
            Replying to <span className="font-medium text-foreground">{replyTo.sender_name}</span>: {replyTo.content?.substring(0, 50)}
          </p>
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => setReplyTo(null)}>
            <span className="text-xs">✕</span>
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2 pt-3 border-t border-border/50">
        <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleMediaUpload} />
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileRef.current?.click()}>
          <Plus className="h-4 w-4" />
        </Button>
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          className="flex-1 h-9"
        />
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendMessage} disabled={!newMessage.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// ─── Create Circle Dialog ───
const CreateCircleDialog = ({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  const selectedCat = CIRCLE_CATEGORIES.find(c => c.value === category);

  const handleCreate = async () => {
    if (!user || !title.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.from("spark_rooms").insert({
        title: title.trim(),
        description: description.trim() || null,
        category,
        icon_emoji: selectedCat?.emoji || "💬",
        is_private: isPrivate,
        created_by: user.id,
      }).select().single();

      if (error) throw error;
      if (data) {
        await supabase.from("spark_room_members").insert({ room_id: data.id, user_id: user.id });
      }
      toast({ title: "Circle created! 🎉", description: `${title} is live` });
      setTitle(""); setDescription(""); setCategory("general"); setIsPrivate(false);
      onOpenChange(false);
      onCreated();
    } catch {
      toast({ title: "Error", description: "Couldn't create circle", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="gradient" size="sm" className="gap-1.5 shrink-0"><Plus className="h-4 w-4" /> Circle</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create a Circle</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <Input placeholder="Circle name..." value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
          <Textarea placeholder="What's this circle about? (optional)" value={description} onChange={e => setDescription(e.target.value)} maxLength={300} className="min-h-[80px]" />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Category</p>
            <div className="flex flex-wrap gap-1.5">
              {CIRCLE_CATEGORIES.map(cat => (
                <Button key={cat.value} variant={category === cat.value ? "default" : "outline"} size="sm" className="text-xs h-7 rounded-full gap-1" onClick={() => setCategory(cat.value)}>
                  {cat.emoji} {cat.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant={isPrivate ? "default" : "outline"} size="sm" className="gap-1.5 text-xs h-7 rounded-full" onClick={() => setIsPrivate(!isPrivate)}>
              {isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
              {isPrivate ? "Private" : "Public"}
            </Button>
            <p className="text-[10px] text-muted-foreground">{isPrivate ? "Invite only" : "Anyone can join"}</p>
          </div>
          <Button className="w-full" variant="gradient" onClick={handleCreate} disabled={!title.trim() || creating}>
            {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Circle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
