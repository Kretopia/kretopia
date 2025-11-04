import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

interface ChallengeEntryCardProps {
  entry: {
    id: string;
    title: string;
    description: string | null;
    media_url: string;
    thumbnail_url: string | null;
    vote_count: number;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  hasVoted: boolean;
  onVote: () => void;
}

export const ChallengeEntryCard = ({ entry, hasVoted, onVote }: ChallengeEntryCardProps) => {
  return (
    <div className="group relative rounded-lg overflow-hidden border bg-card hover-lift">
      <div className="aspect-square relative overflow-hidden">
        <img
          src={entry.thumbnail_url || entry.media_url}
          alt={entry.title}
          className="w-full h-full object-cover transition-transform group-hover:scale-110"
        />
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold line-clamp-1">{entry.title}</h4>
          {entry.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{entry.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={entry.profiles.avatar_url || undefined} />
              <AvatarFallback>{entry.profiles.full_name[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{entry.profiles.full_name}</span>
          </div>

          <Button
            size="sm"
            variant={hasVoted ? "default" : "outline"}
            onClick={onVote}
            className="gap-1"
          >
            <Heart className={`h-4 w-4 ${hasVoted ? 'fill-current' : ''}`} />
            {entry.vote_count}
          </Button>
        </div>
      </div>
    </div>
  );
};
