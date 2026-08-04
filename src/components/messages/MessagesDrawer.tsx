import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/pages/messages/useConversations";
import { cn } from "@/lib/utils";

/**
 * MessagesDrawer — right-side inbox drawer.
 * Mirrors the Menu (Navbar) and Notifications (NotificationCenter) sheets:
 * same side, overlay, spacing, close behaviour and animation primitives.
 */
export const MessagesDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, conversationsLoading, unreadCounts } = useConversations(user?.id || "");

  const totalUnread = useMemo(
    () => Array.from(unreadCounts.values()).reduce((a, b) => a + b, 0),
    [unreadCounts]
  );

  const rows = useMemo(() => {
    if (!user) return [];
    const seen = new Set<string>();
    return conversations
      .map((c) => {
        const isSender = c.sender_id === user.id;
        const otherId = isSender ? c.receiver_id : c.sender_id;
        return {
          otherId,
          name: (isSender ? c.receiver_name : c.sender_name) || "Creator",
          avatar: isSender ? c.receiver_avatar : c.sender_avatar,
          content: c.content,
          created_at: c.created_at,
          unread: unreadCounts.get(otherId) || 0,
        };
      })
      .filter((r) => {
        if (seen.has(r.otherId)) return false;
        seen.add(r.otherId);
        return true;
      });
  }, [conversations, unreadCounts, user]);

  const open = (otherId: string) => {
    setIsOpen(false);
    navigate(`/messages?user=${otherId}`);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10" aria-label="Messages">
          <MessageCircle className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
          {totalUnread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
            >
              {totalUnread > 9 ? "9+" : totalUnread}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Messages</span>
          </SheetTitle>
          <SheetDescription>
            {totalUnread > 0
              ? `You have ${totalUnread} unread message${totalUnread > 1 ? "s" : ""}`
              : "All caught up!"}
          </SheetDescription>
          <Button
            variant="link"
            size="sm"
            className="w-fit p-0 h-auto text-xs"
            onClick={() => {
              setIsOpen(false);
              navigate("/messages");
            }}
          >
            Open full inbox →
          </Button>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] mt-6">
          {conversationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-1 pr-2">
              {rows.map((r) => (
                <button
                  key={r.otherId}
                  type="button"
                  onClick={() => open(r.otherId)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent/50",
                    r.unread > 0 && "bg-accent/30"
                  )}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={r.avatar || undefined} alt={r.name} />
                    <AvatarFallback>{r.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {r.created_at
                          ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true })
                          : ""}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{r.content}</p>
                  </div>
                  {r.unread > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 shrink-0 px-1.5 text-[10px]">
                      {r.unread > 9 ? "9+" : r.unread}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default MessagesDrawer;
