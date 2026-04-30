import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Hand } from "lucide-react";
import { InviteCollaboratorDialog } from "@/components/project/InviteCollaboratorDialog";
import { cn } from "@/lib/utils";

interface PeopleSectionProps {
  collaborators: Array<{ id: string; full_name: string; avatar_url: string | null; role: string | null }>;
  ownerUserId: string;
  currentUserId: string;
  isOwner: boolean;
  projectId: string;
  onUpdated: () => void;
  onlineUserIds?: Set<string>;
  onKnock?: (toUserId: string, toName: string) => void | Promise<void>;
}

export const PeopleSection = ({
  collaborators,
  ownerUserId,
  currentUserId,
  isOwner,
  projectId,
  onUpdated,
  onlineUserIds,
  onKnock,
}: PeopleSectionProps) => {
  const navigate = useNavigate();
  const onlineCount = collaborators.filter(
    (c) => c.id !== currentUserId && onlineUserIds?.has(c.id),
  ).length;

  return (
    <section className="px-4 py-5 space-y-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
            The People
          </h2>
          {onlineCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 dark:text-green-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {onlineCount} in the room
            </span>
          )}
        </div>
        {isOwner && (
          <div className="-mr-2 scale-90 origin-right">
            <InviteCollaboratorDialog projectId={projectId} onInvite={onUpdated} />
          </div>
        )}
      </header>

      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex gap-3 pb-1">
          {collaborators.map((c) => {
            const isMe = c.id === currentUserId;
            const isOnline = !isMe && (onlineUserIds?.has(c.id) ?? false);
            return (
              <div key={c.id} className="shrink-0 flex flex-col items-center gap-1.5 w-16 group">
                <button
                  type="button"
                  disabled={isMe}
                  onClick={() => navigate(`/messages?user=${c.id}`)}
                  className="relative"
                  aria-label={isMe ? "You" : `Message ${c.full_name}`}
                >
                  <Avatar
                    className={cn(
                      "h-14 w-14 ring-2 transition-all",
                      isOnline
                        ? "ring-green-500"
                        : "ring-border group-enabled:group-hover:ring-primary",
                    )}
                  >
                    <AvatarImage src={c.avatar_url || undefined} />
                    <AvatarFallback className="text-sm font-semibold">
                      {c.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {c.id === ownerUserId && (
                    <Crown className="absolute -top-1 -right-1 h-3.5 w-3.5 text-primary fill-primary/30" />
                  )}
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-background" />
                  )}
                </button>

                <p className="text-[11px] font-medium text-center leading-tight line-clamp-1 max-w-full">
                  {isMe ? "You" : c.full_name.split(" ")[0]}
                </p>
                {c.role && (
                  <p className="text-[9px] text-muted-foreground leading-none line-clamp-1 max-w-full">
                    {c.role}
                  </p>
                )}

                {isOnline && onKnock && (
                  <button
                    type="button"
                    onClick={() => onKnock(c.id, c.full_name)}
                    className="inline-flex items-center gap-1 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 text-[10px] font-semibold transition-colors"
                    aria-label={`Knock ${c.full_name}`}
                  >
                    <Hand className="h-2.5 w-2.5" />
                    Knock
                  </button>
                )}
              </div>
            );
          })}

          {isOwner && (
            <div className="shrink-0 flex flex-col items-center gap-1.5 w-16">
              <InviteCollaboratorDialog projectId={projectId} onInvite={onUpdated} />
              <p className="text-[11px] text-muted-foreground">Add</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
