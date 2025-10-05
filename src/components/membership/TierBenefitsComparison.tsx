import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Lock } from "lucide-react";
import { TIER_LEVELS, getTierByPoints } from "@/lib/tierSystem";
import { useNavigate } from "react-router-dom";

interface TierBenefitsComparisonProps {
  currentPoints: number;
}

export const TierBenefitsComparison = ({ currentPoints }: TierBenefitsComparisonProps) => {
  const navigate = useNavigate();
  const currentTier = getTierByPoints(currentPoints);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {TIER_LEVELS.map((tier) => {
          const isCurrentTier = tier.name === currentTier.name;
          const isUnlocked = currentPoints >= tier.minPoints;

          return (
            <Card
              key={tier.name}
              className={`relative overflow-hidden ${
                isCurrentTier ? "ring-2 ring-primary shadow-xl" : ""
              }`}
            >
              {/* Gradient Background */}
              <div className={`h-32 bg-gradient-to-br ${tier.color} relative`}>
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative h-full flex flex-col items-center justify-center text-white">
                  <span className="text-4xl mb-2">{tier.icon}</span>
                  <h3 className="text-xl font-bold">{tier.displayName}</h3>
                  <p className="text-xs opacity-90">
                    {tier.minPoints.toLocaleString()}
                    {tier.maxPoints ? ` - ${tier.maxPoints.toLocaleString()}` : "+"} pts
                  </p>
                </div>
              </div>

              <div className="p-6">
                {isCurrentTier && (
                  <Badge className="mb-4 w-full justify-center">Your Level</Badge>
                )}

                <div className="space-y-3 mb-6">
                  {tier.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <Check
                        className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                          isUnlocked ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <span className={isUnlocked ? "" : "text-muted-foreground"}>
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>

                {!isUnlocked && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>
                      {(tier.minPoints - currentPoints).toLocaleString()} points to unlock
                    </span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-3">How to Earn Points</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline">+100</Badge>
            <span>Complete profile</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">+500</Badge>
            <span>Complete project</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">+150</Badge>
            <span>Receive review</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">+25</Badge>
            <span>Make connection</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">+20</Badge>
            <span>Visit partner</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">+5</Badge>
            <span>Daily login</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
