import { Trophy, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface SparkChallengeWinCardProps {
  challengeTitle: string;
  xpReward: number;
  entryTitle?: string;
  thumbnailUrl?: string;
}

export const SparkChallengeWinCard = ({
  challengeTitle,
  xpReward,
  entryTitle,
  thumbnailUrl,
}: SparkChallengeWinCardProps) => {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-primary/5 overflow-hidden">
      {thumbnailUrl && (
        <div className="h-32 overflow-hidden">
          <img src={thumbnailUrl} alt={entryTitle || challengeTitle} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Challenge Won!</span>
          <Badge variant="secondary" className="text-[10px] ml-auto">+{xpReward} XP</Badge>
        </div>
        <p className="text-sm font-semibold">{challengeTitle}</p>
        {entryTitle && (
          <p className="text-xs text-muted-foreground">Entry: "{entryTitle}"</p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/cre8")}
          className="w-full text-xs gap-1.5"
        >
          <Flame className="h-3 w-3" />
          Join Cre8 Arena
        </Button>
      </div>
    </div>
  );
};
