import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getRankByName, getNextRank } from "@/lib/arenaRanks";

interface ArenaRankBadgeProps {
  rank: string;
  showTooltip?: boolean;
  size?: "sm" | "md";
}

export const ArenaRankBadge = ({ rank, showTooltip = true, size = "sm" }: ArenaRankBadgeProps) => {
  const rankData = getRankByName(rank);
  const nextRank = getNextRank(rank);

  const badge = (
    <Badge
      className={`gap-1 bg-gradient-to-r ${rankData.gradient} text-white border-0 ${
        size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
      }`}
    >
      <span>{rankData.icon}</span>
      {rankData.displayName}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{rankData.displayName}</p>
          <p className="text-xs text-muted-foreground">{rankData.description}</p>
          {nextRank && (
            <p className="text-xs mt-1">
              Next: {nextRank.icon} {nextRank.displayName}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
