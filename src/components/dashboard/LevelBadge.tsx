import { getLevelData, getXPForLevel, getXPForNextLevel } from "@/lib/gamification";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";

interface LevelBadgeProps {
  level: number;
  xp: number;
}

export function LevelBadge({ level, xp }: LevelBadgeProps) {
  const levelData = getLevelData(level);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const xpInLevel = xp - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const progress = (xpInLevel / xpNeeded) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`text-4xl bg-gradient-to-r ${levelData.color} bg-clip-text text-transparent`}>
            {levelData.icon}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Thrive Status</p>
            <h3 className={`text-2xl font-bold bg-gradient-to-r ${levelData.color} bg-clip-text text-transparent`}>
              {levelData.name}
            </h3>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{xp} XP</p>
          <p className="text-xs text-muted-foreground">
            {xpNeeded - xpInLevel} to next tier
          </p>
        </div>
      </div>
      
      <div className="space-y-1">
        <Progress value={progress} className="h-2" />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3" />
          <span>{Math.round(progress)}% to {getLevelData(level + 1).name}</span>
        </div>
      </div>
    </div>
  );
}
