import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Reply, Smile, Pin, Crown, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export interface CircleMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  media_url: string | null;
  media_type: string | null;
  message_type: string;
  reply_to_id: string | null;
  poll_data: any;
  is_pinned: boolean;
  sender_name?: string;
  sender_avatar?: string;
  sender_role?: string;
  reactions?: Record<string, string[]>;
  reply_preview?: { content: string; sender_name: string } | null;
}

interface Props {
  msg: CircleMessage;
  isOwn: boolean;
  userId?: string;
  onReply: (msg: CircleMessage) => void;
  onReact: (msgId: string) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  showReactions: string | null;
  isAdmin: boolean;
  onPin?: (msgId: string, isPinned: boolean) => void;
}

const REACTION_EMOJIS = ["🔥", "❤️", "🙌", "💯", "😂", "🎯"];

const roleIndicator = (role?: string) => {
  if (role === 'admin') return <Crown className="h-2.5 w-2.5 text-amber-500 inline ml-0.5" />;
  if (role === 'moderator') return <Shield className="h-2.5 w-2.5 text-blue-500 inline ml-0.5" />;
  return null;
};

export const CircleMessageBubble = ({
  msg, isOwn, userId, onReply, onReact, onToggleReaction, showReactions, isAdmin, onPin,
}: Props) => (
  <div className="group px-1">
    {/* Pinned indicator */}
    {msg.is_pinned && (
      <div className="flex items-center gap-1 text-[10px] text-amber-600 mb-0.5 ml-8">
        <Pin className="h-2.5 w-2.5" /> Pinned message
      </div>
    )}
    
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
          isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md",
          msg.is_pinned && "ring-1 ring-amber-500/30"
        )}>
          {!isOwn && (
            <p className="text-[10px] font-medium mb-0.5 opacity-70">
              {msg.sender_name}{roleIndicator(msg.sender_role)}
            </p>
          )}

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

        {/* Reactions */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-0.5", isOwn && "justify-end")}>
            {Object.entries(msg.reactions).map(([emoji, userIds]) => (
              <button
                key={emoji}
                onClick={() => onToggleReaction(msg.id, emoji)}
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full border transition-colors",
                  userIds.includes(userId || "")
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

      {/* Actions */}
      <div className={cn("flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mb-1", isOwn && "flex-row-reverse")}>
        <button className="p-1 rounded hover:bg-muted/80 text-muted-foreground" onClick={() => onReply(msg)} title="Reply">
          <Reply className="h-3 w-3" />
        </button>
        <button className="p-1 rounded hover:bg-muted/80 text-muted-foreground relative" onClick={() => onReact(msg.id)} title="React">
          <Smile className="h-3 w-3" />
        </button>
        {isAdmin && onPin && (
          <button className="p-1 rounded hover:bg-muted/80 text-muted-foreground" onClick={() => onPin(msg.id, !msg.is_pinned)} title={msg.is_pinned ? "Unpin" : "Pin"}>
            <Pin className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>

    {/* Reaction picker */}
    {showReactions === msg.id && (
      <div className={cn("flex gap-1 mt-1 ml-8 p-1.5 bg-card rounded-full border border-border/50 shadow-lg w-fit", isOwn && "ml-auto mr-8")}>
        {REACTION_EMOJIS.map(emoji => (
          <button key={emoji} className="text-sm hover:scale-125 transition-transform p-0.5" onClick={() => onToggleReaction(msg.id, emoji)}>
            {emoji}
          </button>
        ))}
      </div>
    )}
  </div>
);
