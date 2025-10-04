import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getTierByPoints, getNextTier, getPointsToNextTier, getTierProgress } from "@/lib/tierSystem";
import { TrendingUp, Star } from "lucide-react";

interface TierProgressCardProps {
  currentPoints: number;
}

export const TierProgressCard = ({ currentPoints }: TierProgressCardProps) => {
  const currentTier = getTierByPoints(currentPoints);
  const nextTier = getNextTier(currentPoints);
  const pointsNeeded = getPointsToNextTier(currentPoints);
  const progress = getTierProgress(currentPoints);

  return (
    <Card className={`overflow-hidden bg-gradient-to-br ${currentTier.gradient} border-2`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl">{currentTier.icon}</span>
              <div>
                <h3 className="text-xl font-bold">{currentTier.displayName}</h3>
                <p className="text-sm text-muted-foreground">Current Tier</p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
            <Star className="h-3 w-3 mr-1" />
            {currentPoints.toLocaleString()} pts
          </Badge>
        </div>

        {nextTier && pointsNeeded !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress to {nextTier.displayName}</span>
              <span className="font-semibold">{pointsNeeded.toLocaleString()} pts needed</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>{progress.toFixed(0)}% complete</span>
            </div>
          </div>
        )}

        {!nextTier && (
          <div className="text-center py-2">
            <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
              🎉 Highest Tier Achieved!
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
};
