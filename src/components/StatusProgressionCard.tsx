import { type StatusResult, getAllTiers, getTierIndex } from "@/lib/statusEngine";
import { Shield, Zap, Award, Star, Crown, Sparkles, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const TIER_ICONS = {
  hobbyist: Shield,
  freelancer: Zap,
  thriver: Award,
  professional: Star,
  celebrity: Crown,
  icon: Sparkles,
};

interface StatusProgressionCardProps {
  status: StatusResult;
  className?: string;
}

export function StatusProgressionCard({ status, className }: StatusProgressionCardProps) {
  const allTiers = getAllTiers();
  const currentIdx = status.tierIndex;

  // Progress within current tier toward next
  const currentTierData = allTiers[currentIdx];
  const nextTierData = currentIdx < allTiers.length - 1 ? allTiers[currentIdx + 1] : null;
  const progressPercent = nextTierData
    ? Math.min(100, ((status.points - currentTierData.min) / (nextTierData.min - currentTierData.min)) * 100)
    : 100;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Current Status Header */}
      <div className={cn(
        "relative overflow-hidden rounded-xl border p-4",
        "bg-gradient-to-br",
        status.gradient,
      )}>
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(45deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 8px)`,
        }} />

        <div className="relative flex items-center gap-4">
          {/* Status Ring */}
          <div className={cn(
            "relative h-16 w-16 rounded-full flex items-center justify-center",
            status.ringClass,
            status.tier === "icon" && "animate-pulse",
          )}>
            <div className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center",
              "bg-gradient-to-br",
              status.gradient,
            )}>
              {(() => {
                const Icon = TIER_ICONS[status.tier];
                return <Icon className={cn("h-6 w-6", status.color)} />;
              })()}
            </div>
            {status.tier === "icon" && (
              <div className="absolute -inset-1 rounded-full bg-primary/20 blur-md -z-10" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
              ThriveStatus™
            </p>
            <h3 className={cn("text-xl font-bold", status.color)}>
              {status.label}
            </h3>
            {status.socialProofLabel && (
              <span className={cn(
                "inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1",
                "bg-gradient-to-r",
                status.gradient,
                status.color,
              )}>
                {status.socialProofLabel}
              </span>
            )}
          </div>

          <div className="text-right shrink-0">
            <p className={cn("text-2xl font-bold tabular-nums", status.color)}>
              {status.points}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Points
            </p>
          </div>
        </div>

        {/* Progress to next tier */}
        {nextTierData && status.pointsToNext != null && (
          <div className="relative mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground font-medium">
                {status.label}
              </span>
              <span className={cn("font-semibold", status.color)}>
                {status.pointsToNext} pts to {nextTierData.label}
              </span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}
      </div>

      {/* Tier Ladder */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold px-1">
          Status Ladder
        </p>
        <div className="space-y-0.5">
          {allTiers.map((tierData, idx) => {
            const Icon = TIER_ICONS[tierData.tier];
            const isCurrentOrBelow = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            const isLocked = idx > currentIdx;

            return (
              <div
                key={tierData.tier}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isCurrent && "bg-gradient-to-r border",
                  isCurrent && tierData.gradient,
                  !isCurrent && isCurrentOrBelow && "opacity-60",
                  isLocked && "opacity-40",
                )}
              >
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                  isCurrent ? tierData.ringClass : "ring-1 ring-border",
                )}>
                  {isLocked ? (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <Icon className={cn("h-3.5 w-3.5", isCurrent ? tierData.color : "text-muted-foreground")} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-xs font-semibold",
                    isCurrent ? tierData.color : "text-muted-foreground",
                  )}>
                    {tierData.label}
                  </p>
                  {tierData.socialProofLabel && (
                    <p className="text-[9px] text-muted-foreground truncate">
                      {tierData.socialProofLabel}
                    </p>
                  )}
                </div>

                <span className={cn(
                  "text-[10px] tabular-nums shrink-0",
                  isCurrent ? tierData.color : "text-muted-foreground",
                )}>
                  {tierData.min}+
                </span>

                {isCurrent && (
                  <ChevronRight className={cn("h-3 w-3 shrink-0", tierData.color)} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Perks */}
      <div className="space-y-1.5 px-1">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
          Your Perks
        </p>
        <div className="flex flex-wrap gap-1.5">
          {status.perks.map(perk => (
            <span
              key={perk}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border",
                "bg-card text-muted-foreground",
              )}
            >
              {perk}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
