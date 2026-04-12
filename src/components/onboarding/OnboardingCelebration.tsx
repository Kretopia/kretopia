import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Share2, ArrowRight, Shield, Zap, Users, Star } from "lucide-react";
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
  spread: 260,
  startVelocity: 50,
  elementCount: 120,
  dragFriction: 0.1,
  duration: 5000,
  stagger: 2,
  width: "10px",
  height: "10px",
  colors: ["#4338CA", "#6366f1", "#818cf8", "#f59e0b", "#10b981", "#3b82f6", "#a78bfa"],
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
      <DialogContent className="sm:max-w-md p-0 border-none overflow-hidden max-h-[90dvh] overflow-y-auto">
        {/* Gradient header */}
        <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/70 pt-12 pb-8 px-8 text-center overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-[-20px] left-[-20px] w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute bottom-[-30px] right-[-20px] w-48 h-48 rounded-full bg-white/5" />
          
          {/* Confetti sources */}
          <div className="absolute top-0 left-1/4 z-50"><Confetti active={showConfetti} config={confettiConfig} /></div>
          <div className="absolute top-0 left-1/2 z-50"><Confetti active={showConfetti} config={confettiConfig} /></div>
          <div className="absolute top-0 left-3/4 z-50"><Confetti active={showConfetti} config={confettiConfig} /></div>

          {/* Badge */}
          <div className="relative inline-flex mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/20">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-3 bg-accent text-accent-foreground rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide shadow-lg animate-bounce">
              BETA
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">You're in!</h2>
          <p className="text-white/80 text-sm">
            Welcome to ThriveIN, {userName?.split(" ")[0] || "Creator"}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
              <Zap className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-primary">100</p>
              <p className="text-[10px] text-muted-foreground">XP Earned</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
              <Star className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-primary">5</p>
              <p className="text-[10px] text-muted-foreground">Invite Codes</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
              <Shield className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-primary">Pro</p>
              <p className="text-[10px] text-muted-foreground">1 Month Free</p>
            </div>
          </div>

          {/* Badge card */}
          <div className="bg-gradient-to-r from-primary/8 to-accent/5 border border-primary/15 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Beta Pioneer Badge</p>
                <p className="text-xs text-muted-foreground">Permanently on your profile as one of our earliest members</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button onClick={handleContinue} className="w-full gap-2 h-12 text-base bg-gradient-to-r from-primary to-primary/80 hover:opacity-90" size="lg">
              Start Exploring <ArrowRight className="h-4 w-4" />
            </Button>
            <Button onClick={handleShareCard} variant="outline" className="w-full gap-2 h-10">
              <Share2 className="h-4 w-4" />
              Share Your Creator Card
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
