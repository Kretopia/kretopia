import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, Crown } from "lucide-react";
import { InviteCollaboratorDialog } from "@/components/project/InviteCollaboratorDialog";

interface PeopleSectionProps {
  collaborators: Array<{ id: string; full_name: string; avatar_url: string | null; role: string | null }>;
  ownerUserId: string;
  currentUserId: string;
  isOwner: boolean;
  projectId: string;
  onUpdated: () => void;
}

export const PeopleSection = ({
  collaborators,
  ownerUserId,
  currentUserId,
  isOwner,
  projectId,
  onUpdated,
}: PeopleSectionProps) => {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-5 space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
          The People
        </h2>
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
            return (
              <button
                key={c.id}
                type="button"
                disabled={isMe}
                onClick={() => navigate(`/messages?user=${c.id}`)}
                className="shrink-0 flex flex-col items-center gap-1.5 w-16 group"
              >
                <div className="relative">
                  <Avatar className="h-14 w-14 ring-2 ring-border group-enabled:group-hover:ring-primary transition-all">
                    <AvatarImage src={c.avatar_url || undefined} />
                    <AvatarFallback className="text-sm font-semibold">
                      {c.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {c.id === ownerUserId && (
                    <Crown className="absolute -top-1 -right-1 h-3.5 w-3.5 text-primary fill-primary/30" />
                  )}
                </div>
                <p className="text-[11px] font-medium text-center leading-tight line-clamp-1 max-w-full">
                  {isMe ? "You" : c.full_name.split(" ")[0]}
                </p>
                {c.role && (
                  <p className="text-[9px] text-muted-foreground leading-none line-clamp-1 max-w-full">
                    {c.role}
                  </p>
                )}
              </button>
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
