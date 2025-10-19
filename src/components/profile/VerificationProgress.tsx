import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Lock, TrendingUp } from "lucide-react";
import { getLevelData, getXPForNextLevel } from "@/lib/gamification";
import { VerificationBadge } from "./VerificationBadge";

interface VerificationProgressProps {
  level: number;
  xp: number;
  portfolioCount: number;
  creditsCount: number;
  awardsCount: number;
  pressCount: number;
  socialVerified: boolean;
  onRequestVerification?: () => void;
}

export function VerificationProgress({
  level,
  xp,
  portfolioCount,
  creditsCount,
  awardsCount,
  pressCount,
  socialVerified,
  onRequestVerification,
}: VerificationProgressProps) {
  const currentLevelData = getLevelData(level);
  const nextLevelData = getLevelData(level + 1);
  const xpForNext = getXPForNextLevel(level);
  const progress = (xp / xpForNext) * 100;

  const requirements = [
    { label: "Portfolio Projects", current: portfolioCount, needed: 3, met: portfolioCount >= 3 },
    { label: "Credits Added", current: creditsCount, needed: 5, met: creditsCount >= 5 },
    { label: "Awards Listed", current: awardsCount, needed: 2, met: awardsCount >= 2 },
    { label: "Press Features", current: pressCount, needed: 1, met: pressCount >= 1 },
    { label: "Social Verified", current: socialVerified ? 1 : 0, needed: 1, met: socialVerified },
  ];

  const totalMet = requirements.filter(r => r.met).length;
  const allRequirementsMet = totalMet === requirements.length;

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Your Verification Status</h3>
          <p className="text-sm text-muted-foreground">
            Complete your profile to level up your badge
          </p>
        </div>
        <VerificationBadge level={level} xp={xp} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress to {nextLevelData.name}</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {xpForNext - xp} XP needed for next level
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Requirements</h4>
          <Badge variant="outline">
            {totalMet}/{requirements.length} Complete
          </Badge>
        </div>
        
        <div className="space-y-2">
          {requirements.map((req, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card/50"
            >
              {req.met ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{req.label}</p>
                <p className="text-xs text-muted-foreground">
                  {req.current} / {req.needed} {req.met ? "✓" : ""}
                </p>
              </div>
              {!req.met && (
                <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {allRequirementsMet && onRequestVerification && (
        <Button 
          onClick={onRequestVerification}
          className="w-full gap-2"
          size="lg"
        >
          <TrendingUp className="w-4 h-4" />
          Level Up Your Badge
        </Button>
      )}

      {!allRequirementsMet && (
        <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
          <p className="text-sm text-muted-foreground text-center">
            Complete {requirements.length - totalMet} more requirement{requirements.length - totalMet > 1 ? 's' : ''} to request verification
          </p>
        </div>
      )}
    </Card>
  );
}
