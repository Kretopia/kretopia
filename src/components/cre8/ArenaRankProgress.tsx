import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ARENA_RANKS, getRankByName, getRankIndex, getNextRank } from "@/lib/arenaRanks";
import { ArenaRankBadge } from "./ArenaRankBadge";
import { Trophy, Flame, Target, Star } from "lucide-react";

interface ArenaRankProgressProps {
  rank: string;
  totalWins: number;
  totalEntries: number;
  top10Finishes: number;
  allStarFinishes: number;
  currentStreak: number;
  totalVotes: number;
  totalXP: number;
}

export const ArenaRankProgress = ({
  rank,
  totalWins,
  totalEntries,
  top10Finishes,
  allStarFinishes,
  currentStreak,
  totalVotes,
  totalXP,
}: ArenaRankProgressProps) => {
  const currentRank = getRankByName(rank);
  const nextRank = getNextRank(rank);
  const rankIdx = getRankIndex(rank);

  // Calculate progress to next rank
  let progressPercent = 100;
  let progressLabel = "Max rank achieved!";
  if (nextRank) {
    // Simple heuristic based on wins required
    const currentMin = currentRank.minWins;
    const nextMin = nextRank.minWins || (currentMin + 5);
    const diff = nextMin - currentMin;
    const progress = Math.min(totalWins - currentMin, diff);
    progressPercent = diff > 0 ? Math.round((progress / diff) * 100) : 0;
    progressLabel = `${totalWins}/${nextMin} wins to ${nextRank.displayName}`;
  }

  const stats = [
    { icon: Trophy, label: "Wins", value: totalWins, color: "text-yellow-500" },
    { icon: Target, label: "Entries", value: totalEntries, color: "text-blue-500" },
    { icon: Star, label: "Top 10%", value: top10Finishes, color: "text-purple-500" },
    { icon: Flame, label: "Streak", value: currentStreak, color: "text-orange-500" },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Arena Rank
          </CardTitle>
          <ArenaRankBadge rank={rank} size="md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rank progression bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{currentRank.icon} {currentRank.displayName}</span>
            {nextRank && <span>{nextRank.icon} {nextRank.displayName}</span>}
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{progressLabel}</p>
        </div>

        {/* All ranks visualization */}
        <div className="flex gap-1">
          {ARENA_RANKS.map((r, i) => (
            <div
              key={r.name}
              className={`flex-1 h-1.5 rounded-full ${
                i <= rankIdx
                  ? `bg-gradient-to-r ${r.gradient}`
                  : "bg-muted"
              }`}
              title={r.displayName}
            />
          ))}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className={`h-4 w-4 mx-auto mb-0.5 ${stat.color}`} />
              <p className="text-sm font-bold tabular-nums">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total Arena XP</span>
          <Badge variant="secondary" className="font-bold tabular-nums">
            {totalXP.toLocaleString()} XP
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
