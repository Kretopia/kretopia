import { type StatusResult } from "@/lib/statusEngine";
import { Shield, Award, Crown, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TIER_ICONS = {
  emerging: Shield,
  proven: Award,
  elite: Crown,
  legacy: Star,
  icon: Sparkles,
};

interface StatusBadgeProps {
  status: StatusResult;
  showPoints?: boolean;
  size?: "sm" | "md";
}

export function StatusBadge({ status, showPoints = false, size = "sm" }: StatusBadgeProps) {
  const Icon = TIER_ICONS[status.tier];
  const isSmall = size === "sm";

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 backdrop-blur-sm",
      status.tier === "icon" && "border-primary/40 bg-primary/5",
      status.tier === "elite" && "border-accent/40 bg-accent/5",
      status.tier === "legacy" && "border-foreground/30 bg-foreground/5",
      status.tier === "proven" && "border-border bg-muted/50",
      status.tier === "emerging" && "border-border bg-muted/30",
    )}>
      <Icon className={cn(
        status.color,
        isSmall ? "h-3 w-3" : "h-4 w-4",
      )} />
      <span className={cn(
        "font-semibold",
        status.color,
        isSmall ? "text-[10px]" : "text-xs",
      )}>
        {status.label}
      </span>
      {showPoints && (
        <span className={cn(
          "text-muted-foreground",
          isSmall ? "text-[9px]" : "text-[10px]",
        )}>
          {status.points}pts
        </span>
      )}
    </div>
  );
}
