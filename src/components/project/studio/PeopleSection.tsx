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
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--energy))]">
            The Crew
          </p>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black leading-none tracking-tight">
              The People
            </h2>
            {onlineCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--energy)/0.15)] ring-1 ring-[hsl(var(--energy)/0.35)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--energy))]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--energy))] opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--energy))]" />
                </span>
                {onlineCount} live
              </span>
            )}
          </div>
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
                        ? "ring-[hsl(var(--energy))] shadow-[0_0_10px_hsl(var(--energy)/0.5)]"
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
                    <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-[hsl(var(--energy))] ring-2 ring-background" />
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
                    className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--energy)/0.15)] hover:bg-[hsl(var(--energy)/0.25)] text-[hsl(var(--energy))] ring-1 ring-[hsl(var(--energy)/0.3)] px-2 py-0.5 text-[10px] font-bold transition-colors"
                    aria-label={`Knock ${c.full_name}`}
                  >
                    <Hand className="h-2.5 w-2.5" />
                    Knock
                  </button>
                )}
              </div>
            );
          })}

        </div>
      </div>
    </section>
  );
};
