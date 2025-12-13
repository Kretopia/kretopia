import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send } from "lucide-react";
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
        // Get current user's name
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', currentUserId)
          .single();

        // Get project collaborators
        const { data: collaborators } = await supabase
          .from('project_collaborators')
          .select('user_id')
          .eq('project_id', projectId)
          .neq('user_id', currentUserId);

        // Get project owner
        const { data: project } = await supabase
          .from('projects')
          .select('created_by, title')
          .eq('id', projectId)
          .single();

        // Create list of users to notify (collaborators + owner, excluding sender)
        const usersToNotify = new Set<string>();
        collaborators?.forEach(c => usersToNotify.add(c.user_id));
        if (project?.created_by && project.created_by !== currentUserId) {
          usersToNotify.add(project.created_by);
        }

        // Send notifications
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
            link: `/thrivedesk/${projectId}`,
            action_url: `/thrivedesk/${projectId}`,
            action_text: 'View Project',
          });
        }
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
        // Don't fail the message send if notifications fail
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

  return (
    <Card className="flex flex-col h-[70vh] md:h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Project Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        <ScrollArea className="flex-1 px-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((msg) => {
                const isOwn = msg.user_id === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {msg.profiles?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col gap-1 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">
                          {isOwn ? 'You' : msg.profiles?.full_name || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={sending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={sending || !newMessage.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
