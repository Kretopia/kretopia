import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Hash, Megaphone, Calendar, ShoppingBag, Image,
  Plus, Send, Settings, Users, Lock, Globe, DollarSign, Loader2,
  Share2, Check, Pin, Reply, MessageSquare, Crown, BarChart3,
} from "lucide-react";
import { CircleMessageBubble, type CircleMessage } from "@/components/circle/CircleMessageBubble";
import { CircleAdminPanel } from "@/components/circle/CircleAdminPanel";
import { CirclePollCreator } from "@/components/circle/CirclePollCreator";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { cn } from "@/lib/utils";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  icon_emoji: string;
  channel_type: string;
  position: number;
  is_default: boolean;
}

const CHANNEL_ICONS: Record<string, typeof Hash> = {
  text: Hash,
  announcements: Megaphone,
  events: Calendar,
  shop: ShoppingBag,
  media: Image,
};

const CircleDetail = () => {
  const { circleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [circle, setCircle] = useState<any>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [circleEvents, setCircleEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState("member");
  const [replyTo, setReplyTo] = useState<CircleMessage | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState("text");
  const [copied, setCopied] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = userRole === "admin" || circle?.created_by === user?.id;
  const isMod = isAdmin || userRole === "moderator";

  // Fetch circle data
  useEffect(() => {
    if (!circleId) return;
    const fetchCircle = async () => {
      setLoading(true);
      const [circleRes, channelsRes, membershipRes, membersRes, eventsRes] = await Promise.all([
        supabase.from("spark_rooms").select("*").eq("id", circleId).single(),
        supabase.from("circle_channels").select("*").eq("circle_id", circleId).order("position"),
        user ? supabase.from("spark_room_members").select("role").eq("room_id", circleId).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("spark_room_members").select("user_id, role").eq("room_id", circleId),
        supabase.from("creative_jams").select("id, title, start_time, status, cover_image_url, venue_name").eq("circle_id", circleId).order("start_time", { ascending: true }).limit(10),
      ]);

      if (circleRes.data) setCircle(circleRes.data);
      
      let chans = (channelsRes.data || []) as Channel[];
      
      // Auto-create default channel if none exist and user is the creator
      if (chans.length === 0 && circleRes.data && user && circleRes.data.created_by === user.id) {
        const { data: newChan } = await supabase.from("circle_channels").insert({
          circle_id: circleId,
          name: "general",
          channel_type: "text",
          icon_emoji: "💬",
          position: 0,
          is_default: true,
          created_by: user.id,
        } as any).select().single();
        if (newChan) chans = [newChan as Channel];
      }
      
      setChannels(chans);
      if (chans.length > 0) setActiveChannel(chans.find(c => c.is_default) || chans[0]);

      if (membershipRes.data) {
        setIsMember(true);
        setUserRole(membershipRes.data.role || "member");
      }

      // Fetch member profiles
      if (membersRes.data?.length) {
        const userIds = membersRes.data.map((m: any) => m.user_id);
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        setMembers(membersRes.data.map((m: any) => ({
          ...m,
          full_name: profileMap.get(m.user_id)?.full_name || "Unknown",
          avatar_url: profileMap.get(m.user_id)?.avatar_url,
        })));
      }

      setCircleEvents(eventsRes.data || []);
      setLoading(false);
    };
    fetchCircle();
  }, [circleId, user]);

  // Fetch messages for active channel
  const fetchMessages = useCallback(async () => {
    if (!activeChannel) return;
    setMsgLoading(true);
    
    let query = supabase
      .from("spark_room_messages")
      .select("*")
      .eq("room_id", circleId!)
      .order("created_at", { ascending: true })
      .limit(100);

    // For default channel, also include messages without channel_id (legacy)
    if (activeChannel.is_default) {
      query = query.or(`channel_id.eq.${activeChannel.id},channel_id.is.null`);
    } else {
      query = query.eq("channel_id", activeChannel.id);
    }

    const { data } = await query;

    if (data?.length) {
      const userIds = [...new Set(data.map(m => m.user_id))];
      const [profilesRes, reactionsRes, membersRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds),
        supabase.from("spark_message_reactions").select("*").in("message_id", data.map(m => m.id)),
        supabase.from("spark_room_members").select("user_id, role").eq("room_id", circleId!).in("user_id", userIds),
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);
      const roleMap = new Map((membersRes.data as any[])?.map(m => [m.user_id, m.role]) || []);
      const reactionsMap = new Map<string, Record<string, string[]>>();
      reactionsRes.data?.forEach((r: any) => {
        if (!reactionsMap.has(r.message_id)) reactionsMap.set(r.message_id, {});
        const map = reactionsMap.get(r.message_id)!;
        if (!map[r.emoji]) map[r.emoji] = [];
        map[r.emoji].push(r.user_id);
      });

      setMessages(data.map(m => ({
        ...m,
        message_type: m.message_type || "text",
        reply_to_id: m.reply_to_id || null,
        poll_data: m.poll_data || null,
        media_type: m.media_type || null,
        is_pinned: m.is_pinned || false,
        sender_name: profileMap.get(m.user_id)?.full_name || "Unknown",
        sender_avatar: profileMap.get(m.user_id)?.avatar_url || undefined,
        sender_role: roleMap.get(m.user_id) || "member",
        reactions: reactionsMap.get(m.id) || {},
        reply_preview: null,
      })));
    } else {
      setMessages([]);
    }
    setMsgLoading(false);
  }, [circleId, activeChannel]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  // Realtime
  useEffect(() => {
    if (!circleId) return;
    const channel = supabase
      .channel(`circle-page-${circleId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "spark_room_messages", filter: `room_id=eq.${circleId}` }, () => fetchMessages())
      .on("postgres_changes", { event: "*", schema: "public", table: "spark_message_reactions" }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [circleId, fetchMessages]);

  const joinCircle = async () => {
    if (!user || !circle) return;
    if (circle.is_paid && circle.price_monthly > 0) {
      try {
        const { data, error } = await supabase.functions.invoke('join-paid-circle', { body: { circleId: circle.id } });
        if (error) throw error;
        if (data?.url) window.open(data.url, '_blank');
      } catch (err: any) {
        toast({ title: "Payment Error", description: err?.message || "Could not start payment", variant: "destructive" });
      }
      return;
    }
    await supabase.from("spark_room_members").insert({ room_id: circle.id, user_id: user.id });
    // System welcome message
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
    const memberName = profile?.full_name || "A new member";
    await supabase.from("spark_room_messages").insert({
      room_id: circle.id,
      user_id: user.id,
      content: `👋 ${memberName} just joined the circle! Welcome aboard!`,
      message_type: "system",
    });
    // Auto-welcome DM
    try {
      const { data: roomData } = await supabase
        .from("spark_rooms")
        .select("welcome_message, created_by")
        .eq("id", circle.id)
        .single();
      if (roomData?.welcome_message && roomData.created_by !== user.id) {
        await supabase.from("messages").insert({
          sender_id: roomData.created_by,
          receiver_id: user.id,
          content: roomData.welcome_message,
        });
      }
    } catch (e) {
      console.error("Welcome DM failed:", e);
    }
    setIsMember(true);
    setUserRole("member");
    toast({ title: "Welcome! 🎉", description: `You're now in ${circle.title}` });
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim() || sending || !activeChannel || !isMember) return;
    setSending(true);
    await supabase.from("spark_room_messages").insert({
      room_id: circle.id,
      user_id: user.id,
      content: newMessage.trim(),
      reply_to_id: replyTo?.id || null,
      message_type: "text",
      channel_id: activeChannel.id,
    } as any);
    setNewMessage("");
    setReplyTo(null);
    setSending(false);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeChannel) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }
    if (!isMember) {
      toast({ title: "Join required", description: "You must join this circle first", variant: "destructive" });
      return;
    }
    const ext = file.name.split(".").pop();
    const path = `circles/${circle.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file);
    if (error) { toast({ title: "Upload failed", variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
    const mediaType = file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image";
    await supabase.from("spark_room_messages").insert({
      room_id: circle.id, user_id: user.id, content: "",
      media_url: urlData.publicUrl, media_type: mediaType, message_type: "media",
      channel_id: activeChannel.id,
    } as any);
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const msg = messages.find(m => m.id === messageId);
    const hasReacted = msg?.reactions?.[emoji]?.includes(user.id);
    if (hasReacted) {
      await supabase.from("spark_message_reactions").delete().eq("message_id", messageId).eq("user_id", user.id).eq("emoji", emoji);
    } else {
      await supabase.from("spark_message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
    }
    setShowReactions(null);
  };

  const pinMessage = async (messageId: string, pin: boolean) => {
    await supabase.from("spark_room_messages").update({ is_pinned: pin, pinned_by: pin ? user?.id : null }).eq("id", messageId);
    fetchMessages();
    toast({ title: pin ? "Message pinned 📌" : "Message unpinned" });
  };

  const handlePollVote = async (messageId: string, optionIndex: number) => {
    if (!user?.id) return;
    const msg = messages.find(m => m.id === messageId);
    if (!msg?.poll_data) return;
    const pollData = JSON.parse(JSON.stringify(msg.poll_data));
    const alreadyVoted = pollData.options.some((o: any) => o.votes?.includes(user.id));
    if (alreadyVoted) return;
    pollData.options[optionIndex].votes = [...(pollData.options[optionIndex].votes || []), user.id];
    await supabase.from("spark_room_messages").update({ poll_data: pollData } as any).eq("id", messageId);
    fetchMessages();
  };

  const shareCircle = async () => {
    const url = `https://www.thrivein.io/circle/${circle.id}`;
    const shareText = `Join "${circle.title}" on ThriveIN — where creatives connect, collaborate, and grow together 🚀\n\n${url}`;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (navigator.share) {
        await navigator.share({ title: circle.title, text: shareText, url });
      } else {
        toast({ title: "Link copied! 🔗" });
      }
    } catch {
      toast({ title: "Link copied! 🔗" });
    }
  };

  const createChannel = async () => {
    if (!user || !newChannelName.trim()) return;
    await supabase.from("circle_channels").insert({
      circle_id: circleId!,
      name: newChannelName.trim(),
      channel_type: newChannelType,
      icon_emoji: newChannelType === "announcements" ? "📢" : newChannelType === "events" ? "📅" : newChannelType === "shop" ? "🛍️" : newChannelType === "media" ? "📸" : "💬",
      position: channels.length,
      created_by: user.id,
    } as any);
    setNewChannelName("");
    setShowNewChannel(false);
    // Refetch channels
    const { data } = await supabase.from("circle_channels").select("*").eq("circle_id", circleId!).order("position");
    setChannels((data || []) as Channel[]);
    toast({ title: "Channel created! 🎉" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Circle not found</p>
        <Button onClick={() => navigate("/circle?tab=circles")}>Go back</Button>
      </div>
    );
  }

  const pinnedMessages = messages.filter(m => m.is_pinned);

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar toggle */}
      <div className={cn(
        "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity lg:hidden",
        showSidebar ? "opacity-100" : "opacity-0 pointer-events-none"
      )} onClick={() => setShowSidebar(false)} />

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform lg:relative lg:translate-x-0",
        showSidebar ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Circle header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setShowSidebar(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
              {circle.icon_emoji || "💬"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-sm truncate">{circle.title}</h2>
              <p className="text-[10px] text-muted-foreground">{members.length} members</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" className="flex-1 text-xs h-7" onClick={shareCircle}>
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Share2 className="h-3 w-3 mr-1" />} Share
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowAdmin(true)}>
                <Settings className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Channels */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Channels</p>
              {isAdmin && (
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowNewChannel(!showNewChannel)}>
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>

            {showNewChannel && (
              <div className="px-2 py-1.5 space-y-2">
                <Input
                  placeholder="Channel name"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  className="h-7 text-xs"
                  onKeyDown={e => e.key === "Enter" && createChannel()}
                />
                <div className="flex flex-wrap gap-1">
                  {["text", "announcements", "events", "shop", "media"].map(t => (
                    <Button
                      key={t}
                      variant={newChannelType === t ? "default" : "outline"}
                      size="sm"
                      className="text-[10px] h-5 px-1.5 rounded-full capitalize"
                      onClick={() => setNewChannelType(t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
                <Button size="sm" className="w-full h-7 text-xs" onClick={createChannel} disabled={!newChannelName.trim()}>
                  Create
                </Button>
              </div>
            )}

            {channels.map(ch => {
              const Icon = CHANNEL_ICONS[ch.channel_type] || Hash;
              return (
                <button
                  key={ch.id}
                  onClick={() => { setActiveChannel(ch); setShowSidebar(false); }}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                    activeChannel?.id === ch.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </button>
              );
            })}
          </div>

          {/* Events section */}
          <div className="p-2 border-t border-border/50">
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Events</p>
              {isMember && (
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowCreateEvent(true)}>
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
            {circleEvents.length === 0 ? (
              <p className="text-[10px] text-muted-foreground px-2">No upcoming events</p>
            ) : (
              circleEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => navigate(`/scene?tab=events&event=${ev.id}`)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="truncate font-medium text-foreground">{ev.title}</p>
                    <p className="text-[10px]">
                      {new Date(ev.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Members section */}
          <div className="p-2 border-t border-border/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
              Members — {members.length}
            </p>
            {members.slice(0, 15).map(m => (
              <button
                key={m.user_id}
                onClick={() => navigate(`/profile/${m.user_id}`)}
                className="flex items-center gap-2 w-full px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <span className="text-xs truncate flex-1 text-left">{m.full_name}</span>
                {m.role === "admin" && <Crown className="h-3 w-3 text-amber-500" />}
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Join button */}
        {!isMember && (
          <div className="p-3 border-t border-border">
            <Button className="w-full" variant="gradient" onClick={joinCircle}>
              {circle.is_paid ? `Join • $${circle.price_monthly}/mo` : "Join Circle"}
            </Button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/50">
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setShowSidebar(true)}>
            <Hash className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hidden lg:flex" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {activeChannel && (
            <>
              {(() => { const Icon = CHANNEL_ICONS[activeChannel.channel_type] || Hash; return <Icon className="h-4 w-4 text-muted-foreground" />; })()}
              <h3 className="font-semibold text-sm">{activeChannel.name}</h3>
              {activeChannel.description && (
                <span className="text-xs text-muted-foreground truncate hidden sm:block">— {activeChannel.description}</span>
              )}
            </>
          )}
          <div className="flex-1" />
          {pinnedMessages.length > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Pin className="h-2.5 w-2.5" /> {pinnedMessages.length}
            </Badge>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setShowSidebar(true)}>
            <Users className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {msgLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : activeChannel?.channel_type === "events" ? (
            <div className="space-y-3 py-4">
              <div className="text-center">
                <Calendar className="h-10 w-10 mx-auto text-primary/40 mb-2" />
                <p className="text-sm font-medium mb-1">Circle Events</p>
                <p className="text-xs text-muted-foreground mb-4">Events linked to this circle</p>
                {isMember && (
                  <Button variant="gradient" size="sm" onClick={() => setShowCreateEvent(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Create Event
                  </Button>
                )}
              </div>
              {circleEvents.map(ev => (
                <Card
                  key={ev.id}
                  className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/scene?tab=events&event=${ev.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ev.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                      {ev.venue_name && <p className="text-[10px] text-muted-foreground">{ev.venue_name}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No messages yet in #{activeChannel?.name}</p>
            </div>
          ) : (
            messages.map(msg => (
              <CircleMessageBubble
                key={msg.id}
                msg={msg}
                isOwn={msg.user_id === user?.id}
                userId={user?.id}
                onReply={setReplyTo}
                onReact={(id) => setShowReactions(showReactions === id ? null : id)}
                onToggleReaction={toggleReaction}
                showReactions={showReactions}
                isAdmin={isMod}
                onPin={isMod ? pinMessage : undefined}
                onPollVote={handlePollVote}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply indicator */}
        {replyTo && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border/30 bg-muted/30">
            <Reply className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground truncate flex-1">
              Replying to <span className="font-medium text-foreground">{replyTo.sender_name}</span>
            </p>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setReplyTo(null)}>
              <span className="text-xs">✕</span>
            </Button>
          </div>
        )}

        {/* Poll Creator */}
        {showPollCreator && (
          <div className="px-3 pt-2">
            <CirclePollCreator
              onSubmit={async (question, options) => {
                const pollData = { question, options: options.map(o => ({ text: o, votes: [] as string[] })) };
                if (!activeChannel?.id || !user || !circle) return;
                const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single();
                await supabase.from("spark_room_messages").insert({
                  room_id: circle.id,
                  channel_id: activeChannel.id,
                  user_id: user.id,
                  content: `📊 ${question}`,
                  message_type: "poll",
                  poll_data: pollData,
                } as any);
                setShowPollCreator(false);
                setNewMessage("");
                fetchMessages();
              }}
              onCancel={() => setShowPollCreator(false)}
            />
          </div>
        )}

        {/* Input */}
        {activeChannel?.channel_type !== "events" && isMember && (
          <div className="flex gap-2 p-3 border-t border-border bg-card/50">
            <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleMediaUpload} />
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileRef.current?.click()}>
              <Plus className="h-4 w-4" />
            </Button>
            {isMod && (
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowPollCreator(!showPollCreator)}>
                <BarChart3 className="h-4 w-4" />
              </Button>
            )}
            <Input
              placeholder={`Message #${activeChannel?.name || "general"}...`}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              className="flex-1 h-9"
            />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendMessage} disabled={!newMessage.trim() || sending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Admin Panel */}
      {showAdmin && circle && <CircleAdminPanel circle={circle} onClose={() => setShowAdmin(false)} />}

      {/* Create Event Dialog - pre-linked to this circle */}
      <CreateSessionDialog
        open={showCreateEvent}
        onOpenChange={setShowCreateEvent}
        onCreated={() => {
          // Refetch events
          supabase.from("creative_jams").select("id, title, start_time, status, cover_image_url, venue_name")
            .eq("circle_id", circleId!).order("start_time").limit(10)
            .then(({ data }) => setCircleEvents(data || []));
        }}
        defaultCircleId={circleId}
      />
    </div>
  );
};

export default CircleDetail;
