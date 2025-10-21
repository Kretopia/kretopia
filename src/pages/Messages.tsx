import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, ArrowLeft, Search, CheckCheck, Check, MoreVertical, Info, Trash2, Archive, MessageCircle, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";

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
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  // Check for receiverId from navigation state first, then search params
  const navigationState = location.state as { receiverId?: string; receiverName?: string } | null;
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    navigationState?.receiverId || searchParams.get("userId")
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("primary");
  const [connections, setConnections] = useState<Set<string>>(new Set());
  const [otherUser, setOtherUser] = useState<{
    id: string;
    name: string;
    avatar: string;
    role?: string;
  } | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (currentUserId && isMounted) {
        // Run all initial fetches in parallel
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
    }
  }, [selectedConversation, currentUserId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchConnections = async () => {
    // Batch all connection queries in parallel
    const [outgoingResult, incomingResult, matchesResult] = await Promise.all([
      supabase.from("connections").select("connected_user_id").eq("user_id", currentUserId).eq("status", "accepted"),
      supabase.from("connections").select("user_id").eq("connected_user_id", currentUserId).eq("status", "accepted"),
      supabase.from("matches").select("user1_id, user2_id").or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`).eq("status", "active")
    ]);

    const connectedIds = new Set<string>();
    outgoingResult.data?.forEach((c) => connectedIds.add(c.connected_user_id));
    incomingResult.data?.forEach((c) => connectedIds.add(c.user_id));
    matchesResult.data?.forEach((m) => {
      connectedIds.add(m.user1_id === currentUserId ? m.user2_id : m.user1_id);
    });

    setConnections(connectedIds);
  };

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from("conversation_list")
      .select("*")
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return;
    }

    setConversations(data || []);
  };

  const fetchMessages = async (userId: string) => {
    // Batch messages and profile fetch in parallel
    const [messagesResult, profileResult] = await Promise.all([
      supabase.from("messages").select("*").or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`
      ).order("created_at", { ascending: true }),
      supabase.from("profiles").select("full_name, avatar_url, role").eq("user_id", userId).maybeSingle()
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
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", currentUserId)
      .eq("sender_id", userId)
      .eq("read", false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const { error } = await supabase.from("messages").insert({
      sender_id: currentUserId,
      receiver_id: selectedConversation,
      content: newMessage.trim(),
      read: false,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return;
    }

    setNewMessage("");
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
    return conversations.filter(
      (c) =>
        !c.read &&
        c.sender_id === userId &&
        c.receiver_id === currentUserId
    ).length;
  };

  const isConnectionAccepted = (userId: string) => connections.has(userId);

  const filteredConversations = conversations.filter((conv) => {
    const partner = getConversationPartner(conv);
    const matchesSearch = partner.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isConnected = isConnectionAccepted(partner.id);
    
    if (activeTab === "primary") {
      return matchesSearch && isConnected;
    } else {
      return matchesSearch && !isConnected;
    }
  });

  const primaryCount = conversations.filter(c => 
    isConnectionAccepted(getConversationPartner(c).id)
  ).length;

  const requestsCount = conversations.filter(c => 
    !isConnectionAccepted(getConversationPartner(c).id)
  ).length;

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-7xl mx-auto overflow-hidden">
      {/* Conversations List */}
      <div
        className={`${
          selectedConversation ? "hidden md:flex" : "flex"
        } w-full md:w-96 flex-col border-r border-border bg-card`}
      >
        <div className="p-3 sm:p-4 border-b border-border space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold">Messages</h2>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-full"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="primary" className="relative">
                Primary
                {primaryCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5">
                    {primaryCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" className="relative">
                Requests
                {requestsCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5">
                    {requestsCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1">
          {activeTab === "requests" && requestsCount > 0 && (
            <div className="p-4 bg-accent/50 border-b border-border">
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Message requests from people you haven't connected with yet.</p>
              </div>
            </div>
          )}
          
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mb-4 mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-semibold mb-2">
                {searchQuery ? "No messages found" : activeTab === "primary" ? "No messages yet" : "No requests"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery 
                  ? "Try adjusting your search"
                  : activeTab === "primary" 
                  ? "Start by discovering and connecting with other creators!"
                  : "Message requests from non-connections will appear here"}
              </p>
              {!searchQuery && activeTab === "primary" && (
                <Button onClick={() => navigate("/discover")} size="sm" className="gap-2">
                  Discover Creators
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredConversations.map((conv) => {
                const partner = getConversationPartner(conv);
                const unreadCount = getUnreadCount(partner.id);
                const isRequest = activeTab === "requests";
                
                return (
                  <div
                    key={conv.conversation_id}
                    onClick={() => setSelectedConversation(partner.id)}
                    className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                      selectedConversation === partner.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-14 w-14 border-2 border-background">
                        <AvatarImage src={partner.avatar} />
                        <AvatarFallback className="text-lg">
                          {partner.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-xs font-bold text-primary-foreground">
                            {unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-semibold truncate">{partner.name}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(conv.created_at), {
                            addSuffix: true,
                          }).replace('about ', '')}
                        </span>
                      </div>
                      
                      <p className={`text-sm truncate ${
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
                      
                      {isRequest && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Message request
                        </p>
                      )}
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
        <div className="flex-1 flex flex-col bg-background">
          {/* Chat Header */}
          <div className="p-4 border-b border-border flex items-center gap-3 bg-card">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSelectedConversation(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {otherUser && (
              <>
                <Avatar
                  className="h-11 w-11 cursor-pointer border-2 border-background"
                  onClick={() => navigate(`/profile/${otherUser.id}`)}
                >
                  <AvatarImage src={otherUser.avatar} />
                  <AvatarFallback className="text-lg">
                    {otherUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 cursor-pointer" onClick={() => navigate(`/profile/${otherUser.id}`)}>
                  <h3 className="font-semibold hover:underline">
                    {otherUser.name}
                  </h3>
                  {otherUser.role && (
                    <p className="text-sm text-muted-foreground">{otherUser.role}</p>
                  )}
                </div>
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
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Connection Request Banner */}
          {otherUser && !isConnectionAccepted(otherUser.id) && (
            <Card className="m-4 p-4 bg-accent/50 border-accent">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">Message Request</p>
                  <p className="text-sm text-muted-foreground">
                    {otherUser.name} isn't in your connections yet. Be careful about what you share.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default">Accept Request</Button>
                    <Button size="sm" variant="outline">Delete</Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Avatar className="h-20 w-20 mb-4">
                    <AvatarImage src={otherUser?.avatar} />
                    <AvatarFallback className="text-2xl">
                      {otherUser?.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-lg font-semibold mb-1">{otherUser?.name}</h3>
                  {otherUser?.role && (
                    <p className="text-sm text-muted-foreground mb-4">{otherUser.role}</p>
                  )}
                  <Button
                    onClick={() => navigate(`/profile/${otherUser?.id}`)}
                    variant="outline"
                    size="sm"
                  >
                    View Profile
                  </Button>
                  <p className="text-sm text-muted-foreground mt-6">
                    Send a message to start the conversation
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
                      className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      {!isOwn && showAvatar && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={otherUser?.avatar} />
                          <AvatarFallback className="text-xs">
                            {otherUser?.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {!isOwn && !showAvatar && <div className="w-8" />}
                      
                      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          }`}
                        >
                          <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                        </div>
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
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-border bg-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message..."
                className="flex-1 rounded-full"
                disabled={otherUser && !isConnectionAccepted(otherUser.id)}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!newMessage.trim() || (otherUser && !isConnectionAccepted(otherUser.id))}
                className="rounded-full"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground bg-background">
          <div className="text-center space-y-2">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-xl font-semibold">Your Messages</p>
            <p className="text-sm">Send messages to creators you've connected with</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
