import { Badge } from "@/components/ui/badge";
import { Shield, Star, Award, Crown, Sparkles } from "lucide-react";
import { getLevelData } from "@/lib/gamification";

interface VerificationBadgeProps {
  level: number;
  xp: number;
  className?: string;
  showLabel?: boolean;
}

export function VerificationBadge({ level, xp, className = "", showLabel = true }: VerificationBadgeProps) {
  const levelData = getLevelData(level);
  
  const getIcon = () => {
    if (level >= 76) return Crown;
    if (level >= 51) return Award;
    if (level >= 31) return Star;
    if (level >= 11) return Shield;
    return Sparkles;
  };
  
  const Icon = getIcon();
  
  return (
    <Badge 
      className={`gap-1.5 bg-gradient-to-r ${levelData.color} text-white border-0 ${className}`}
      title={`${levelData.name} - Level ${level}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {showLabel && <span className="font-semibold">{levelData.name}</span>}
    </Badge>
  );
}
