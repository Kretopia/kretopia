import { useEffect, useState, useRef } from "react";
import { PageTip } from "@/components/PageTip";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, ArrowLeft, Search, CheckCheck, Check, MoreVertical, Trash2, MessageCircle, ArrowRight, Briefcase, Reply } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { StartProjectFromMatchDialog } from "@/components/project/StartProjectFromMatchDialog";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { IceBreakers } from "@/components/messages/IceBreakers";
import { TypingIndicator, useTypingStatus } from "@/components/messages/TypingIndicator";
import { MessageAttachments, AttachmentPreview } from "@/components/messages/MessageAttachments";
import { MessageRequests } from "@/components/messages/MessageRequests";
import { GroupsList, type GroupRoom } from "@/components/messages/GroupsList";
import { GroupChatPanel } from "@/components/messages/GroupChatPanel";
import { CreateGroupDialog } from "@/components/messages/CreateGroupDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOnlinePresence, OnlineDot } from "@/components/messages/OnlinePresence";
import { MessageReplyBanner, InlineReply } from "@/components/messages/MessageReply";
import { FileText } from "lucide-react";
import { ConversationListSkeleton } from "@/components/skeletons/MessagesSkeletons";
import { PageTransition } from "@/components/PageTransition";

interface Conversation {
  conversation_id: string;
  message_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender_name: string;
  sender_avatar: string;
  receiver_name: string;
  receiver_avatar: string;
  match_id: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  match_id: string | null;
  attachment_url?: string;
  attachment_type?: 'image' | 'file';
  attachment_name?: string;
  reply_to_id?: string | null;
  reply_to_content?: string | null;
  reply_to_sender_name?: string | null;
}

interface Attachment {
  url: string;
  type: 'image' | 'file';
  fileName?: string;
}

interface ReplyTo {
  id: string;
  content: string;
  senderName: string;
}

interface Connection {
  id: string;
  status: string;
}

const Messages = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  
  const navigationState = location.state as { receiverId?: string; receiverName?: string } | null;
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    navigationState?.receiverId || searchParams.get("user") || searchParams.get("userId")
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [connections, setConnections] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'inbox' | 'groups' | 'requests'>('inbox');
  const [requestCount, setRequestCount] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<GroupRoom | null>(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [otherUser, setOtherUser] = useState<{
    id: string;
    name: string;
    avatar: string;
    role?: string;
  } | null>(null);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Online presence
  const onlineUsers = useOnlinePresence(currentUserId);
  
  // Typing status hook
  const { setTyping } = useTypingStatus(selectedConversation || '', currentUserId);

  // Sync URL params with selected conversation when they change
  useEffect(() => {
    const userIdFromUrl = navigationState?.receiverId || searchParams.get("user") || searchParams.get("userId");
    if (userIdFromUrl && userIdFromUrl !== selectedConversation) {
      setSelectedConversation(userIdFromUrl);
    }
  }, [searchParams, navigationState]);
  
  // Track page view
  useEffect(() => {
    const trackPageView = async () => {
      const { analytics } = await import("@/lib/analytics");
      analytics.pageView("messages");
    };
    trackPageView();
  }, []);

  useEffect(() => {
    if (user?.id) {
      setCurrentUserId(user.id);
      
      supabase
        .from('profiles')
        .select('role, full_name')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setCurrentUserRole(data.role);
            setCurrentUserName(data.full_name || 'You');
          }
        }, () => {});
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (currentUserId && isMounted) {
        await Promise.all([
          fetchConnections(),
          fetchConversations(),
          subscribeToMessages()
        ]);
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (selectedConversation && currentUserId) {
      fetchMessages(selectedConversation);
      markMessagesAsRead(selectedConversation);
      setReplyTo(null);
      
      const trackConversation = async () => {
        const { analytics } = await import("@/lib/analytics");
        analytics.featureUsed("conversation_opened", { partner_id: selectedConversation });
      };
      trackConversation();
    }
  }, [selectedConversation, currentUserId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConnections = async () => {
    try {
      const [outgoingResult, incomingResult, matchesResult] = await Promise.all([
        supabase
          .from("connections")
          .select("connected_user_id")
          .eq("user_id", currentUserId)
          .eq("status", "accepted"),
        supabase
          .from("connections")
          .select("user_id")
          .eq("connected_user_id", currentUserId)
          .eq("status", "accepted"),
        supabase
          .from("matches")
          .select("user1_id, user2_id")
          .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
          .eq("status", "active"),
      ]);

      const connectedIds = new Set<string>();
      outgoingResult.data?.forEach((c) => connectedIds.add(c.connected_user_id));
      incomingResult.data?.forEach((c) => connectedIds.add(c.user_id));
      matchesResult.data?.forEach((m) => {
        connectedIds.add(m.user1_id === currentUserId ? m.user2_id : m.user1_id);
      });

      setConnections(connectedIds);
    } catch (error) {
      console.error('[Messages] Error fetching connections:', error);
    }
  };

  const fetchConversations = async () => {
    setConversationsLoading(true);
    try {
      const [conversationsResult, unreadResult] = await Promise.all([
        supabase
          .from("conversation_list")
          .select("*")
          .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
          .order("created_at", { ascending: false }),
        supabase
          .from("messages")
          .select("sender_id")
          .eq("receiver_id", currentUserId)
          .eq("read", false)
      ]);

      if (conversationsResult.error) {
        console.error("Error fetching conversations:", conversationsResult.error);
        return;
      }

      setConversations(conversationsResult.data || []);

      if (unreadResult.data) {
        const counts = new Map<string, number>();
        unreadResult.data.forEach((msg) => {
          const current = counts.get(msg.sender_id) || 0;
          counts.set(msg.sender_id, current + 1);
        });
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error('[Messages] Error fetching conversations:', error);
      setConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const [messagesResult, profileResult] = await Promise.all([
        supabase
          .from("messages")
          .select("*")
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`
          )
          .order("created_at", { ascending: true }),
        supabase
          .from("profiles")
          .select("full_name, avatar_url, role")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (messagesResult.error) {
        console.error("Error fetching messages:", messagesResult.error);
        return;
      }

      setMessages(messagesResult.data || []);

      if (profileResult.data) {
        setOtherUser({
          id: userId,
          name: profileResult.data.full_name,
          avatar: profileResult.data.avatar_url,
          role: profileResult.data.role,
        });
      }
    } catch (error) {
      console.error('[Messages] Error fetching messages:', error);
      setMessages([]);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("messages-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `or(sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId})`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as Message;
            if (
              selectedConversation &&
              (newMsg.sender_id === selectedConversation ||
                newMsg.receiver_id === selectedConversation)
            ) {
              setMessages((prev) => [...prev, newMsg]);
              markMessagesAsRead(selectedConversation);
            }
            fetchConversations();
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? (payload.new as Message) : msg
              )
            );
            fetchConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markMessagesAsRead = async (userId: string) => {
    const { error } = await supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", currentUserId)
      .eq("sender_id", userId)
      .eq("read", false);
    
    if (!error) {
      setUnreadCounts(prev => {
        const newCounts = new Map(prev);
        newCounts.delete(userId);
        return newCounts;
      });
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachment) || !selectedConversation) return;

    const messageContent = attachment 
      ? (newMessage.trim() ? `${newMessage.trim()}\n[${attachment.type === 'image' ? '📷 Image' : '📎 ' + (attachment.fileName || 'File')}](${attachment.url})`
        : `[${attachment.type === 'image' ? '📷 Image' : '📎 ' + (attachment.fileName || 'File')}](${attachment.url})`)
      : newMessage.trim();

    const insertData: any = {
      sender_id: currentUserId,
      receiver_id: selectedConversation,
      content: messageContent,
      read: false,
    };

    // Add reply metadata if replying
    if (replyTo) {
      insertData.reply_to_id = replyTo.id;
      insertData.reply_to_content = replyTo.content.substring(0, 200);
      insertData.reply_to_sender_name = replyTo.senderName;
    }

    const { error } = await supabase.from("messages").insert(insertData);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return;
    }

    // Send push notification to receiver
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', currentUserId)
      .single();

    if (senderProfile) {
      const { notifyMessage } = await import("@/lib/pushNotifications");
      const preview = attachment ? (attachment.type === 'image' ? '📷 Sent an image' : '📎 Sent a file') : messageContent;
      await notifyMessage(
        selectedConversation,
        senderProfile.full_name || 'Someone',
        preview
      );

      supabase.functions.invoke('send-user-email', {
        body: {
          type: 'message',
          recipientId: selectedConversation,
          data: { messagePreview: preview }
        }
      }).catch(err => console.error('[Messages] Email notification failed:', err));
    }

    const { analytics } = await import("@/lib/analytics");
    analytics.messageSent(selectedConversation, 'direct');

    setNewMessage("");
    setAttachment(null);
    setReplyTo(null);
  };

  const getConversationPartner = (conv: Conversation) => {
    return conv.sender_id === currentUserId
      ? {
          id: conv.receiver_id,
          name: conv.receiver_name,
          avatar: conv.receiver_avatar,
        }
      : {
          id: conv.sender_id,
          name: conv.sender_name,
          avatar: conv.sender_avatar,
        };
  };

  const getUnreadCount = (userId: string) => {
    return unreadCounts.get(userId) || 0;
  };

  const isConnectionAccepted = (userId: string) => connections.has(userId);

  const filteredConversations = conversations.filter((conv) => {
    const partner = getConversationPartner(conv);
    const partnerName = partner.name || '';
    const matchesSearch = partnerName.toLowerCase().includes(searchQuery.toLowerCase());
    const isConnected = isConnectionAccepted(partner.id);
    return matchesSearch && isConnected;
  });

  const conversationCount = filteredConversations.length;
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    setTyping(true);
    
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    const timeout = setTimeout(() => {
      setTyping(false);
    }, 2000);
    setTypingTimeout(timeout);
  };

  const handleReply = (msg: Message) => {
    const senderName = msg.sender_id === currentUserId ? currentUserName : (otherUser?.name || 'Unknown');
    setReplyTo({
      id: msg.id,
      content: msg.content,
      senderName,
    });
    inputRef.current?.focus();
  };

  return (
    <PageTransition>
    <div className="flex h-[calc(100dvh-4rem)] max-w-7xl mx-auto overflow-hidden pb-20 lg:pb-0">
      {/* Conversations List */}
      <div
        className={`${
          selectedConversation ? "hidden md:flex" : "flex"
        } w-full md:w-[340px] lg:w-96 flex-col border-r border-border bg-card`}
      >
        <div className="p-3 sm:p-4 border-b-2 border-primary/20 space-y-2.5 sm:space-y-4">
          <div className="space-y-1">
            <p className="brand-eyebrow">Your inbox</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-[-0.03em]">Messages</h2>
          </div>
          <PageTip
            id="messages"
            title="Your conversations live here"
            message="Match with creators in Circle first, then come here to chat. Tip: mention something specific from their profile to break the ice!"
          />
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'inbox' | 'groups' | 'requests')}>
            <TabsList className="w-full">
              <TabsTrigger value="inbox" className="flex-1 text-xs sm:text-sm">
                Direct {conversationCount > 0 && <Badge variant="secondary" className="ml-1">{conversationCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex-1 text-xs sm:text-sm">
                Groups
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex-1 text-xs sm:text-sm">
                Requests {requestCount > 0 && <Badge variant="destructive" className="ml-1">{requestCount}</Badge>}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === 'inbox' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-full h-9 sm:h-10 text-sm"
              />
            </div>
          )}
        </div>
        
        <ScrollArea className="flex-1">
          {activeTab === 'requests' ? (
            <MessageRequests 
              currentUserId={currentUserId}
              onAccept={() => {
                fetchConnections();
                fetchConversations();
              }}
              onSelectConversation={(userId) => {
                setActiveTab('inbox');
                setSelectedConversation(userId);
              }}
            />
          ) : conversationsLoading ? (
            <ConversationListSkeleton />
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mb-5 mx-auto w-20 h-20 rounded-2xl bg-energy/10 border-2 border-energy/30 flex items-center justify-center shadow-glow-lime">
                <MessageCircle className="h-10 w-10 text-energy" />
              </div>
              <p className="brand-eyebrow mb-2">{searchQuery ? "No matches" : "Inbox zero"}</p>
              <p className="text-xl font-black tracking-[-0.02em] mb-2">
                {searchQuery ? "Nothing matches that" : "Your conversations live here"}
              </p>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                {searchQuery
                  ? "Try a different name or keyword."
                  : "Match with creators in Circle, then come back to start the conversation."}
              </p>
              {!searchQuery && (
                <>
                  <Button onClick={() => navigate("/circle")} variant="lime" size="sm" className="gap-2">
                    Discover Creators
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <PushNotificationPrompt trigger="message" className="mt-4" />
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredConversations.map((conv) => {
                const partner = getConversationPartner(conv);
                const unreadCount = getUnreadCount(partner.id);
                const isOnline = onlineUsers.has(partner.id);
                
                return (
                  <div
                    key={conv.conversation_id}
                    onClick={() => setSelectedConversation(partner.id)}
                    className={`flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors active:bg-accent/70 ${
                      selectedConversation === partner.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-11 w-11 sm:h-14 sm:w-14 border-2 border-background">
                        <AvatarImage src={partner.avatar} />
                        <AvatarFallback className="text-base sm:text-lg">
                          {(partner.name || 'U')
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <OnlineDot isOnline={isOnline} />
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-[10px] sm:text-xs font-bold text-primary-foreground">
                            {unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm sm:text-base truncate">{partner.name || 'Unknown'}</p>
                          {isOnline && (
                            <span className="text-[10px] text-success font-medium">online</span>
                          )}
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(conv.created_at), {
                            addSuffix: true,
                          }).replace('about ', '')}
                        </span>
                      </div>
                      
                      <p className={`text-xs sm:text-sm truncate ${
                        unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                      }`}>
                        {conv.sender_id === currentUserId ? (
                          <span className="inline-flex items-center gap-1">
                            {conv.read ? (
                              <CheckCheck className="h-3 w-3 text-primary" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            {conv.content}
                          </span>
                        ) : (
                          conv.content
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-background pb-20 lg:pb-0">
          {/* Chat Header */}
          <div className="p-3 sm:p-4 border-b border-border flex items-center gap-2.5 sm:gap-3 bg-card">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setSelectedConversation(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {otherUser && (
              <>
                <div className="relative">
                  <Avatar
                    className="h-9 w-9 sm:h-11 sm:w-11 cursor-pointer border-2 border-background"
                    onClick={() => navigate(`/profile/${otherUser.id}`)}
                  >
                    <AvatarImage src={otherUser.avatar} />
                    <AvatarFallback className="text-sm sm:text-lg">
                      {(otherUser.name || 'U')
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <OnlineDot isOnline={onlineUsers.has(otherUser.id)} />
                </div>
                <div className="flex-1 cursor-pointer" onClick={() => navigate(`/profile/${otherUser.id}`)}>
                  <h3 className="font-semibold hover:underline">
                    {otherUser.name || 'Unknown'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {onlineUsers.has(otherUser.id) ? (
                      <span className="text-success">Online</span>
                    ) : (
                      otherUser.role || ''
                    )}
                  </p>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex gap-2"
                  onClick={() => setShowProjectDialog(true)}
                >
                  <Briefcase className="h-4 w-4" />
                  Start Project
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/profile/${otherUser.id}`)}>
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowProjectDialog(true)} className="sm:hidden">
                      <Briefcase className="h-4 w-4 mr-2" />
                      Start Project Together
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Ice Breakers for new conversations */}
          {otherUser && messages.length === 0 && (
            <IceBreakers
              recipientId={otherUser.id}
              recipientName={otherUser.name || 'Creator'}
              recipientRole={otherUser.role}
              currentUserRole={currentUserRole}
              onSelectIceBreaker={(message) => setNewMessage(message)}
            />
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="relative mb-4">
                    <Avatar className="h-20 w-20 ring-4 ring-primary/10">
                      <AvatarImage src={otherUser?.avatar} />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-accent/20">
                        {(otherUser?.name || 'U').split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    {onlineUsers.has(otherUser?.id || '') && (
                      <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-background" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{otherUser?.name || 'Unknown'}</h3>
                  {otherUser?.role && (
                    <Badge variant="secondary" className="mb-3 text-xs">{otherUser.role}</Badge>
                  )}
                  <div className="flex gap-2 mb-4">
                    <Button
                      onClick={() => navigate(`/profile/${otherUser?.id}`)}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs"
                    >
                      View Profile
                    </Button>
                    <Button
                      onClick={() => setShowProjectDialog(true)}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs gap-1"
                    >
                      <Briefcase className="h-3 w-3" /> Start Project
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-[240px]">
                    Pick a conversation starter above or type your own message to connect
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwn = msg.sender_id === currentUserId;
                  const showAvatar = index === messages.length - 1 || 
                    messages[index + 1]?.sender_id !== msg.sender_id;
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 group ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      {!isOwn && showAvatar && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={otherUser?.avatar} />
                          <AvatarFallback className="text-xs">
                            {(otherUser?.name || 'U').split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {!isOwn && !showAvatar && <div className="w-8" />}
                      
                      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[75%]`}>
                        {/* Inline reply reference */}
                        {msg.reply_to_content && (
                          <InlineReply
                            content={msg.reply_to_content}
                            senderName={msg.reply_to_sender_name || 'Unknown'}
                            isOwn={isOwn}
                          />
                        )}
                        
                        {/* Check if message contains an attachment link */}
                        {msg.content.includes('](http') ? (
                          <div className="space-y-2">
                            {msg.content.match(/\[📷 Image\]\((https?:\/\/[^\)]+)\)/) && (
                              <a 
                                href={msg.content.match(/\[📷 Image\]\((https?:\/\/[^\)]+)\)/)?.[1]} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img 
                                  src={msg.content.match(/\[📷 Image\]\((https?:\/\/[^\)]+)\)/)?.[1]} 
                                  alt="Shared image" 
                                  className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-border"
                                />
                              </a>
                            )}
                            {msg.content.match(/\[📎 ([^\]]+)\]\((https?:\/\/[^\)]+)\)/) && (
                              <a 
                                href={msg.content.match(/\[📎 ([^\]]+)\]\((https?:\/\/[^\)]+)\)/)?.[2]} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                                  isOwn ? "bg-primary/80 text-primary-foreground" : "bg-muted"
                                }`}
                              >
                                <FileText className="h-4 w-4" />
                                <span className="text-sm underline">
                                  {msg.content.match(/\[📎 ([^\]]+)\]\(/)?.[1] || 'Download file'}
                                </span>
                              </a>
                            )}
                            {msg.content.replace(/\[📷 Image\]\([^\)]+\)/, '').replace(/\[📎 [^\]]+\]\([^\)]+\)/, '').trim() && (
                              <div
                                className={`rounded-2xl px-4 py-2.5 ${
                                  isOwn
                                    ? "bg-primary text-primary-foreground rounded-br-sm"
                                    : "bg-muted rounded-bl-sm"
                                }`}
                              >
                                <p className="text-sm break-words whitespace-pre-wrap">
                                  {msg.content.replace(/\[📷 Image\]\([^\)]+\)/, '').replace(/\[📎 [^\]]+\]\([^\)]+\)/, '').trim()}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`rounded-2xl px-4 py-2.5 ${
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted rounded-bl-sm"
                            }`}
                          >
                            <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-1 px-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.created_at), {
                              addSuffix: true,
                            }).replace('about ', '')}
                          </span>
                          {isOwn && (
                            msg.read ? (
                              <CheckCheck className="h-3 w-3 text-primary" />
                            ) : (
                              <Check className="h-3 w-3 text-muted-foreground" />
                            )
                          )}
                          {/* Reply button */}
                          <button
                            onClick={() => handleReply(msg)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-0.5 rounded hover:bg-muted"
                            title="Reply"
                          >
                            <Reply className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Typing Indicator */}
            {selectedConversation && currentUserId && (
              <TypingIndicator 
                recipientId={selectedConversation} 
                currentUserId={currentUserId} 
              />
            )}
          </ScrollArea>

          {/* Message Input */}
          <div className="p-3 sm:p-4 border-t border-border bg-card/95 backdrop-blur-sm space-y-2">
            {/* Reply Banner */}
            {replyTo && (
              <MessageReplyBanner replyTo={replyTo} onCancel={() => setReplyTo(null)} />
            )}
            
            {/* Attachment Preview */}
            {attachment && (
              <AttachmentPreview
                url={attachment.url}
                type={attachment.type}
                fileName={attachment.fileName}
                onRemove={() => setAttachment(null)}
              />
            )}
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setTyping(false);
                sendMessage();
              }}
              className="flex items-center gap-2"
            >
              <MessageAttachments
                onAttach={(url, type, fileName) => setAttachment({ url, type, fileName })}
                disabled={!!attachment}
              />
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder={replyTo ? "Reply..." : "Type a message..."}
                  className="flex-1 rounded-full pr-10 bg-muted/50"
                />
              </div>
              <Button 
                type="submit" 
                size="icon" 
                disabled={!newMessage.trim() && !attachment}
                className="rounded-full h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 shadow-sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground bg-background">
          <div className="text-center space-y-2">
            <div className="text-4xl mb-4"></div>
            <p className="text-xl font-semibold">Your Messages</p>
            <p className="text-sm">Send messages to creators you've connected with</p>
          </div>
        </div>
      )}

      {/* Start Project Dialog */}
      {otherUser && (
        <StartProjectFromMatchDialog
          open={showProjectDialog}
          onOpenChange={setShowProjectDialog}
          matchedUser={{
            id: otherUser.id,
            name: otherUser.name || 'Unknown',
            role: otherUser.role || 'Creator',
            avatar: otherUser.avatar
          }}
          matchId={matchId}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
    </PageTransition>
  );
};

export default Messages;
