import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Share2, Shield, Users, Briefcase, Globe, Sparkles } from "lucide-react";
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
    const pendingEventJoin = sessionStorage.getItem("pending_event_join");
    if (pendingEventJoin) {
      sessionStorage.removeItem("pending_event_join");
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

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/subscription");
  };

  const firstName = userName?.split(" ")[0] || "Creator";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 border-none overflow-hidden max-h-[90dvh] overflow-y-auto">
        {/* Gradient header */}
        <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/70 pt-12 pb-8 px-8 text-center overflow-hidden">
          <div className="absolute top-[-20px] left-[-20px] w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute bottom-[-30px] right-[-20px] w-48 h-48 rounded-full bg-white/5" />

          {/* Confetti */}
          <div className="absolute top-0 left-1/4 z-50"><Confetti active={showConfetti} config={confettiConfig} /></div>
          <div className="absolute top-0 left-1/2 z-50"><Confetti active={showConfetti} config={confettiConfig} /></div>
          <div className="absolute top-0 left-3/4 z-50"><Confetti active={showConfetti} config={confettiConfig} /></div>

          <div className="relative inline-flex mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/20">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-3 bg-accent text-accent-foreground rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide shadow-lg animate-bounce">
              BETA
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Welcome, {firstName}!</h2>
          <p className="text-white/80 text-sm">
            Your professional profile is live on ThriveIN
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Creator Site Preview — upsell */}
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/3 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-md">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold">Your Creator Website</p>
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">PRO</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Turn your profile into a beautiful, standalone website — perfect for link-in-bio. Get your own yourname.thrivein.app URL.
                </p>
                {/* Mini preview */}
                <div className="relative rounded-lg overflow-hidden border border-border/50 bg-gradient-to-br from-[#0a0a0c] to-[#1a1a2e] p-3 mb-3">
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                    <div className="h-2 w-24 rounded bg-white/20" />
                    <div className="h-1.5 w-32 rounded bg-white/10" />
                    <div className="flex gap-1.5 mt-2">
                      <div className="h-6 w-16 rounded bg-[#ff00ff]/30" />
                      <div className="h-6 w-16 rounded bg-white/10" />
                    </div>
                  </div>
                  <div className="absolute top-1.5 right-1.5 text-[8px] text-white/40 font-mono">
                    {firstName.toLowerCase()}.thrivein.app
                  </div>
                </div>
                <Button size="sm" onClick={handleUpgrade} className="w-full gap-1.5 text-xs h-8">
                  <Sparkles className="h-3 w-3" />
                  Unlock Creator Site — from $15/mo
                </Button>
              </div>
            </div>
          </div>

          {/* What's next cards */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What's next</p>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Browse gigs & opportunities</p>
                <p className="text-xs text-muted-foreground">Find work that matches your skills</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Connect with creatives</p>
                <p className="text-xs text-muted-foreground">Your AI-enriched profile is working in the background</p>
              </div>
            </div>
          </div>

          {/* Beta badge */}
          <div className="bg-gradient-to-r from-primary/8 to-accent/5 border border-primary/15 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Beta Pioneer Badge</p>
                <p className="text-xs text-muted-foreground">Permanently on your profile as an early member</p>
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
