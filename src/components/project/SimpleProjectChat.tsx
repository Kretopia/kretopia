import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, Send, Reply, Pin, PinOff, SmilePlus, X, ChevronDown, Pencil, Trash2, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
  reply_to?: string | null;
  is_pinned?: boolean;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface Collaborator {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface SimpleProjectChatProps {
  projectId: string;
  messages: Message[];
  currentUserId: string;
  onMessageSent: () => void;
  collaborators?: Collaborator[];
}

const QUICK_EMOJIS = ["👍", "❤", "", "😂", "", "👀", "💯", "🙌"];

export const SimpleProjectChat = ({ projectId, messages, currentUserId, onMessageSent, collaborators = [] }: SimpleProjectChatProps) => {
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showPinned, setShowPinned] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch reactions
  useEffect(() => {
    const fetchReactions = async () => {
      const messageIds = messages.map(m => m.id);
      if (messageIds.length === 0) return;
      const { data } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);
      setReactions(data || []);
    };
    fetchReactions();

    // Subscribe to reaction changes
    const channel = supabase
      .channel(`reactions:${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => {
        fetchReactions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [messages, projectId]);

  const pinnedMessages = useMemo(() => messages.filter(m => m.is_pinned), [messages]);

  const filteredCollaborators = useMemo(() => {
    if (!mentionQuery) return collaborators;
    return collaborators.filter(c =>
      c.full_name?.toLowerCase().includes(mentionQuery.toLowerCase())
    );
  }, [collaborators, mentionQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);

    // Check for @mention trigger
    const lastAtIndex = val.lastIndexOf("@");
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || val[lastAtIndex - 1] === " ")) {
      const query = val.slice(lastAtIndex + 1);
      if (!query.includes(" ")) {
        setShowMentions(true);
        setMentionQuery(query);
        setMentionIndex(0);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (collab: Collaborator) => {
    const lastAtIndex = newMessage.lastIndexOf("@");
    const before = newMessage.slice(0, lastAtIndex);
    setNewMessage(`${before}@${collab.full_name} `);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredCollaborators.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex(i => Math.min(i + 1, filteredCollaborators.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredCollaborators[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const insertData: any = {
        project_id: projectId,
        user_id: currentUserId,
        message: newMessage.trim(),
      };
      if (replyTo) {
        insertData.reply_to = replyTo.id;
      }

      const { error } = await supabase.from('project_messages').insert(insertData);
      if (error) throw error;

      // Send notifications (detect @mentions)
      try {
        const { data: senderProfile } = await supabase.from('profiles').select('full_name').eq('user_id', currentUserId).single();
        const { data: project } = await supabase.from('projects').select('created_by, title').eq('id', projectId).single();
        const { data: collabData } = await supabase.from('project_collaborators').select('user_id').eq('project_id', projectId).neq('user_id', currentUserId);

        const usersToNotify = new Set<string>();
        collabData?.forEach(c => usersToNotify.add(c.user_id));
        if (project?.created_by && project.created_by !== currentUserId) usersToNotify.add(project.created_by);

        // Check for @mentions and send priority notifications
        const mentionedUsers = collaborators.filter(c => newMessage.includes(`@${c.full_name}`));
        const senderName = senderProfile?.full_name || 'Someone';
        const projectTitle = project?.title || 'Project';
        const preview = newMessage.trim().length > 50 ? newMessage.trim().substring(0, 50) + '...' : newMessage.trim();

        for (const userId of usersToNotify) {
          const isMentioned = mentionedUsers.some(m => m.id === userId);
          await supabase.from('notifications').insert({
            user_id: userId,
            title: isMentioned ? `${senderName} mentioned you` : `New message in ${projectTitle}`,
            message: `${senderName}: ${preview}`,
            type: 'project',
            category: 'project',
            priority: isMentioned ? 'high' : 'normal',
            link: `/desk/${projectId}?tab=messages`,
            action_url: `/desk/${projectId}?tab=messages`,
            action_text: 'View Messages',
          });
        }
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
      }

      setNewMessage("");
      setReplyTo(null);
      onMessageSent();
    } catch (error: any) {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    const existing = reactions.find(r => r.message_id === messageId && r.user_id === currentUserId && r.emoji === emoji);
    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('message_reactions').insert({ message_id: messageId, user_id: currentUserId, emoji });
    }
  };

  const togglePin = async (messageId: string, currentPinned: boolean) => {
    const { error } = await supabase.from('project_messages').update({ is_pinned: !currentPinned }).eq('id', messageId);
    if (error) {
      toast({ title: "Failed to pin message", variant: "destructive" });
    } else {
      onMessageSent();
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !editText.trim()) return;
    const { error } = await supabase.from('project_messages').update({ message: editText.trim() }).eq('id', editingMessage.id);
    if (error) {
      toast({ title: "Failed to edit message", variant: "destructive" });
    } else {
      setEditingMessage(null);
      setEditText("");
      onMessageSent();
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const { error } = await supabase.from('project_messages').delete().eq('id', messageId);
    if (error) {
      toast({ title: "Failed to delete message", variant: "destructive" });
    } else {
      onMessageSent();
    }
  };

  const getReplyMessage = (replyToId: string | null | undefined) => {
    if (!replyToId) return null;
    return messages.find(m => m.id === replyToId);
  };

  const getReactionsForMessage = (messageId: string) => {
    const msgReactions = reactions.filter(r => r.message_id === messageId);
    const grouped: Record<string, { emoji: string; count: number; users: string[]; hasOwn: boolean }> = {};
    msgReactions.forEach(r => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [], hasOwn: false };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.user_id);
      if (r.user_id === currentUserId) grouped[r.emoji].hasOwn = true;
    });
    return Object.values(grouped);
  };

  // Render @mentions in message text
  const renderMessageText = (text: string) => {
    const parts = text.split(/(@\w[\w\s]*?)(?=\s@|\s|$)/g);
    return parts.map((part, i) => {
      const isMention = collaborators.some(c => part === `@${c.full_name}`);
      if (isMention) {
        return <span key={i} className="font-semibold text-primary">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const dateStr = new Date(msg.created_at).toLocaleDateString();
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup?.date === dateStr) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateStr, messages: [msg] });
    }
  });

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Pinned Messages Banner */}
        {pinnedMessages.length > 0 && (
          <div className="border-b border-border bg-accent/30 px-4 py-2 shrink-0">
            <button
              onClick={() => setShowPinned(!showPinned)}
              className="flex items-center gap-2 text-xs font-medium text-foreground w-full"
            >
              <Pin className="h-3.5 w-3.5 text-primary" />
              <span>{pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? 's' : ''}</span>
              <ChevronDown className={cn("h-3 w-3 ml-auto transition-transform", showPinned && "rotate-180")} />
            </button>
            {showPinned && (
              <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto">
                {pinnedMessages.map(pm => (
                  <div key={pm.id} className="text-xs text-muted-foreground bg-background/60 rounded-md px-3 py-2 flex items-start gap-2">
                    <span className="font-medium text-foreground shrink-0">{pm.profiles?.full_name || 'Unknown'}:</span>
                    <span className="truncate">{pm.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Start the conversation</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Share ideas, updates, and files with your team. Use @mentions to tag teammates.
              </p>
            </div>
          ) : (
            <div className="space-y-6 py-4 px-2">
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[11px] text-muted-foreground font-medium">{group.date}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-1">
                    {group.messages.map((msg) => {
                      const isOwn = msg.user_id === currentUserId;
                      const replyMsg = getReplyMessage(msg.reply_to);
                      const msgReactions = getReactionsForMessage(msg.id);
                      const isHovered = hoveredMessage === msg.id;

                      return (
                        <div
                          key={msg.id}
                          className={cn("group relative px-2 py-1.5 rounded-lg transition-colors", isHovered && "bg-accent/30")}
                          onMouseEnter={() => setHoveredMessage(msg.id)}
                          onMouseLeave={() => setHoveredMessage(null)}
                        >
                          {/* Reply context */}
                          {replyMsg && (
                            <div className={cn("flex items-center gap-2 mb-1 ml-11 text-xs text-muted-foreground")}>
                              <Reply className="h-3 w-3 rotate-180" />
                              <span className="font-medium">{replyMsg.profiles?.full_name || 'Unknown'}</span>
                              <span className="truncate max-w-[200px]">{replyMsg.message}</span>
                            </div>
                          )}

                          <div className="flex gap-3">
                            <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                              <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{msg.profiles?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold">{isOwn ? 'You' : msg.profiles?.full_name || 'Unknown'}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                </span>
                                {msg.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                              </div>
                              {editingMessage?.id === msg.id ? (
                                <div className="flex gap-2 mt-0.5">
                                  <Input
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditMessage(); if (e.key === 'Escape') { setEditingMessage(null); setEditText(""); } }}
                                    className="h-8 text-sm"
                                    autoFocus
                                  />
                                  <Button size="sm" onClick={handleEditMessage} className="h-8 px-2 text-xs">Save</Button>
                                  <Button size="sm" variant="ghost" onClick={() => { setEditingMessage(null); setEditText(""); }} className="h-8 px-2 text-xs">Cancel</Button>
                                </div>
                              ) : (
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed mt-0.5">
                                  {renderMessageText(msg.message)}
                                </p>
                              )}

                              {/* Reactions display */}
                              {msgReactions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {msgReactions.map(r => (
                                    <button
                                      key={r.emoji}
                                      onClick={() => toggleReaction(msg.id, r.emoji)}
                                      className={cn(
                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                                        r.hasOwn
                                          ? "bg-primary/10 border-primary/30 text-primary"
                                          : "bg-muted/50 border-border hover:bg-accent"
                                      )}
                                    >
                                      <span>{r.emoji}</span>
                                      <span className="font-medium">{r.count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Hover action bar */}
                            {isHovered && (
                              <div className="absolute right-2 -top-3 flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-sm px-1 py-0.5 z-10">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="p-1 hover:bg-accent rounded transition-colors">
                                      <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2" side="top" align="center">
                                    <div className="flex gap-1">
                                      {QUICK_EMOJIS.map(emoji => (
                                        <button
                                          key={emoji}
                                          onClick={() => toggleReaction(msg.id, emoji)}
                                          className="hover:bg-accent p-1.5 rounded transition-transform hover:scale-125 text-lg"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }} className="p-1 hover:bg-accent rounded transition-colors">
                                      <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top"><p className="text-xs">Reply</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button onClick={() => togglePin(msg.id, !!msg.is_pinned)} className="p-1 hover:bg-accent rounded transition-colors">
                                      {msg.is_pinned
                                        ? <PinOff className="h-3.5 w-3.5 text-primary" />
                                        : <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                                      }
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top"><p className="text-xs">{msg.is_pinned ? 'Unpin' : 'Pin'}</p></TooltipContent>
                                </Tooltip>
                                {isOwn && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="p-1 hover:bg-accent rounded transition-colors">
                                        <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" side="top">
                                      <DropdownMenuItem onClick={() => { setEditingMessage(msg); setEditText(msg.message); }}>
                                        <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMessage(msg.id)}>
                                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Reply Preview */}
        {replyTo && (
          <div className="border-t border-border bg-accent/30 px-4 py-2 flex items-center gap-3 shrink-0">
            <Reply className="h-4 w-4 text-primary shrink-0 rotate-180" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary">{replyTo.profiles?.full_name || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground truncate">{replyTo.message}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-accent rounded-md">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Message Input */}
        <div className="border-t border-border p-3 mt-auto shrink-0 bg-background">
          <div className="relative">
            {/* @Mention autocomplete */}
            {showMentions && filteredCollaborators.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-20 max-h-40 overflow-y-auto">
                {filteredCollaborators.map((collab, i) => (
                  <button
                    key={collab.id}
                    onClick={() => insertMention(collab)}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                      i === mentionIndex && "bg-accent"
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={collab.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{collab.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{collab.full_name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  placeholder={replyTo ? "Reply..." : "Type a message... Use @ to mention"}
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  className="pr-10 rounded-xl bg-muted/50 border-border/50"
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                size="icon"
                className="rounded-xl shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
