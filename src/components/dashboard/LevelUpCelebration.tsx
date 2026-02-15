import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getLevelData } from "@/lib/gamification";
import { getTierByPoints } from "@/lib/tierSystem";
import { Sparkles, ArrowRight, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Confetti from "react-dom-confetti";

interface LevelUpCelebrationProps {
  newLevel: number;
  xp: number;
  previousLevel: number;
  open: boolean;
  onClose: () => void;
}

const confettiConfig = {
  angle: 90,
  spread: 360,
  startVelocity: 40,
  elementCount: 70,
  dragFriction: 0.12,
  duration: 3000,
  stagger: 3,
  width: "10px",
  height: "10px",
  colors: ["#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#10b981"],
};

export function LevelUpCelebration({ newLevel, xp, previousLevel, open, onClose }: LevelUpCelebrationProps) {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const levelData = getLevelData(newLevel);
  const tier = getTierByPoints(xp);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setShowConfetti(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowConfetti(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center border-0 bg-gradient-to-b from-background to-muted/50">
        <div className="flex justify-center">
          <Confetti active={showConfetti} config={confettiConfig} />
        </div>
        
        <div className="py-6 space-y-6">
          {/* Level Icon */}
          <div className="relative mx-auto w-24 h-24">
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${levelData.color} flex items-center justify-center text-5xl animate-bounce`}>
              {levelData.icon}
            </div>
            <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              {newLevel}
            </div>
          </div>

          {/* Celebration Text */}
          <div>
            <h2 className="text-2xl font-bold mb-1">Level Up! 🎉</h2>
            <p className="text-muted-foreground">
              You reached <span className={`font-bold bg-gradient-to-r ${levelData.color} bg-clip-text text-transparent`}>Level {newLevel}</span>
            </p>
            <p className={`text-lg font-bold mt-2 bg-gradient-to-r ${levelData.color} bg-clip-text text-transparent`}>
              {levelData.name}
            </p>
          </div>

          {/* Tier Info */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">{tier.icon}</span>
              <span className={`font-bold bg-gradient-to-r ${tier.color} bg-clip-text text-transparent`}>
                {tier.displayName} Tier
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{xp.toLocaleString()} XP Total</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button onClick={() => { onClose(); navigate("/rewards"); }} variant="default" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              Spend XP in Shop
            </Button>
            <Button onClick={onClose} variant="ghost" className="gap-2">
              Keep Going <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
