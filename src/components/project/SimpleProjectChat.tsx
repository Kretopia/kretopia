import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface SimpleProjectChatProps {
  projectId: string;
  messages: Message[];
  currentUserId: string;
  onMessageSent: () => void;
}

export const SimpleProjectChat = ({ projectId, messages, currentUserId, onMessageSent }: SimpleProjectChatProps) => {
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('project_messages')
        .insert({
          project_id: projectId,
          user_id: currentUserId,
          message: newMessage.trim(),
        });

      if (error) throw error;

      // Send notification to all other project collaborators
      try {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', currentUserId)
          .single();

        const { data: collaborators } = await supabase
          .from('project_collaborators')
          .select('user_id')
          .eq('project_id', projectId)
          .neq('user_id', currentUserId);

        const { data: project } = await supabase
          .from('projects')
          .select('created_by, title')
          .eq('id', projectId)
          .single();

        const usersToNotify = new Set<string>();
        collaborators?.forEach(c => usersToNotify.add(c.user_id));
        if (project?.created_by && project.created_by !== currentUserId) {
          usersToNotify.add(project.created_by);
        }

        const senderName = senderProfile?.full_name || 'Someone';
        const projectTitle = project?.title || 'Project';
        const messagePreview = newMessage.trim().length > 50 
          ? newMessage.trim().substring(0, 50) + '...' 
          : newMessage.trim();

        for (const userId of usersToNotify) {
          await supabase.from('notifications').insert({
            user_id: userId,
            title: `New message in ${projectTitle}`,
            message: `${senderName}: ${messagePreview}`,
            type: 'project',
            category: 'project',
            priority: 'normal',
            link: `/desk/${projectId}`,
            action_url: `/desk/${projectId}`,
            action_text: 'View Project',
          });
        }
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
      }

      setNewMessage("");
      onMessageSent();
    } catch (error: any) {
      console.error('Send message error:', error);
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
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
    <div className="flex flex-col h-[calc(100dvh-12rem)] md:h-[calc(100dvh-10rem)]">
      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Start the conversation</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Share ideas, updates, and files with your team right here.
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
                <div className="space-y-3">
                  {group.messages.map((msg) => {
                    const isOwn = msg.user_id === currentUserId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                          <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {msg.profiles?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex flex-col gap-1 max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">
                              {isOwn ? 'You' : msg.profiles?.full_name || 'Unknown'}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <div
                            className={`rounded-2xl px-4 py-2.5 ${
                              isOwn
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-muted rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                          </div>
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

      {/* Message Input */}
      <div className="border-t border-border pt-4 mt-auto">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
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
  );
};
