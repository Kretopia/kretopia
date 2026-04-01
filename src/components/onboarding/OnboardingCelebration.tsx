import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Share2, ArrowRight, Shield } from "lucide-react";
import Confetti from "react-dom-confetti";
import { useNavigate } from "react-router-dom";

interface OnboardingCelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userRole: string;
  pendingConnect?: string | null;
}

const confettiConfig = {
  angle: 90,
  spread: 200,
  startVelocity: 45,
  elementCount: 80,
  dragFriction: 0.1,
  duration: 4000,
  stagger: 3,
  width: "10px",
  height: "10px",
  colors: ["#4f46e5", "#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#818cf8"],
};

export function OnboardingCelebration({
  open,
  onOpenChange,
  userName,
  userRole,
  pendingConnect,
}: OnboardingCelebrationProps) {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setShowConfetti(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowConfetti(false);
    }
  }, [open]);

  const handleContinue = () => {
    onOpenChange(false);
    // Check for pending event join - redirect to event page
    const pendingEventJoin = sessionStorage.getItem('pending_event_join');
    if (pendingEventJoin) {
      sessionStorage.removeItem('pending_event_join');
      navigate(`/event/${pendingEventJoin}`);
    } else if (pendingConnect) {
      navigate(`/profile/${pendingConnect}?from=match`);
    } else {
      navigate("/circle");
    }
  };

  const handleShareCard = () => {
    onOpenChange(false);
    navigate("/profile?share=true");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 border-none bg-gradient-to-b from-primary/20 via-background to-background max-h-[90dvh] overflow-y-auto">
        {/* Multiple confetti sources */}
        <div className="absolute top-0 left-1/4 z-50">
          <Confetti active={showConfetti} config={confettiConfig} />
        </div>
        <div className="absolute top-0 left-1/2 z-50">
          <Confetti active={showConfetti} config={confettiConfig} />
        </div>
        <div className="absolute top-0 left-3/4 z-50">
          <Confetti active={showConfetti} config={confettiConfig} />
        </div>

        <div className="p-8 text-center space-y-6">
          {/* Badge Animation */}
          <div className="relative inline-flex">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary via-primary to-indigo-700 flex items-center justify-center shadow-lg shadow-primary/30">
              <Shield className="h-12 w-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-xs font-bold animate-bounce">
              BETA
            </div>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-bold mb-1">
              Your profile is live! 🎉
            </h2>
            <p className="text-lg font-medium text-primary">
              Welcome, {userName?.split(" ")[0] || "Creator"}
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              You've earned the exclusive <span className="font-semibold text-accent-foreground">Beta Pioneer</span> badge
            </p>
          </div>

          {/* Badge Card */}
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-bold text-primary">Beta Pioneer</span>
            </div>
            <p className="text-xs text-muted-foreground">
              As one of our earliest members, this badge permanently marks your profile.
              You also get <span className="font-semibold text-primary">1 month of free Pro access</span>!
            </p>
          </div>

          {/* Perks */}
          <div className="text-left space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
              <span>+100 XP starter bonus credited</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
              <span>5 invite codes to share with friends</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
              <span>Beta Pioneer badge on your profile forever</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button onClick={handleContinue} className="w-full gap-2" size="lg">
              Start Exploring <ArrowRight className="h-4 w-4" />
            </Button>
            <Button onClick={handleShareCard} variant="outline" className="w-full gap-2">
              <Share2 className="h-4 w-4" />
              Share Your Creator Card
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
