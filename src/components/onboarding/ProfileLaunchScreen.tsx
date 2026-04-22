import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Copy, MessageCircle, Twitter, Instagram, ArrowRight, DollarSign, Briefcase, Check, Share2 } from "lucide-react";
import Confetti from "react-dom-confetti";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface ProfileLaunchScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  fullName: string;
  role?: string;
  avatarUrl?: string;
  topCredit?: string | null;
  creditsCount?: number;
  pendingConnect?: string | null;
}

const confettiConfig = {
  angle: 90,
  spread: 280,
  startVelocity: 55,
  elementCount: 140,
  dragFriction: 0.1,
  duration: 5000,
  stagger: 2,
  width: "10px",
  height: "10px",
  colors: ["#7B61FF", "#C6FF00", "#a78bfa", "#10b981", "#f59e0b", "#3b82f6"],
};

/**
 * Wave 2: "Your profile is LIVE" celebration moment.
 * Replaces the old direct-to-/circle redirect with a pride + share + next-step screen.
 */
export function ProfileLaunchScreen({
  open,
  onOpenChange,
  userId,
  fullName,
  role,
  avatarUrl,
  topCredit,
  creditsCount = 0,
  pendingConnect,
}: ProfileLaunchScreenProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showConfetti, setShowConfetti] = useState(false);
  const [copied, setCopied] = useState(false);

  const profileUrl = useMemo(
    () => `https://www.thrivein.io/profile/${userId}`,
    [userId]
  );

  const shareCopy = useMemo(() => {
    if (topCredit) {
      return `I just verified my work on ${topCredit} (and more) on ThriveIN — see my creative résumé:`;
    }
    if (creditsCount > 0) {
      return `I just verified ${creditsCount} of my projects on ThriveIN — see my creative résumé:`;
    }
    return `This is my verified creative profile on ThriveIN — check it out:`;
  }, [topCredit, creditsCount]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setShowConfetti(true), 250);
      return () => clearTimeout(t);
    }
    setShowConfetti(false);
    setCopied(false);
  }, [open]);

  const trackShare = async (channel: string) => {
    try {
      const { analytics } = await import("@/lib/analytics");
      analytics.featureUsed(`profile_launch_share_${channel}`);
    } catch {}
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareCopy} ${profileUrl}`);
      setCopied(true);
      trackShare("copy");
      toast({ title: "Link copied!", description: "Paste it anywhere to share your profile." });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleWhatsApp = () => {
    trackShare("whatsapp");
    const text = encodeURIComponent(`${shareCopy} ${profileUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleTwitter = () => {
    trackShare("twitter");
    const text = encodeURIComponent(shareCopy);
    const url = encodeURIComponent(profileUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const handleInstagram = async () => {
    trackShare("instagram");
    // IG has no web share intent — copy and prompt
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast({
        title: "Link copied — open Instagram",
        description: "Paste into your story or bio. Tap 'Continue' when done.",
      });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleContinue = () => {
    onOpenChange(false);
    const pendingEventJoin = sessionStorage.getItem("pending_event_join");
    if (pendingEventJoin) {
      sessionStorage.removeItem("pending_event_join");
      navigate(`/event/${pendingEventJoin}`);
    } else if (pendingConnect) {
      navigate(`/profile/${pendingConnect}?from=match`);
    } else {
      navigate("/home");
    }
  };

  const goSetRate = () => {
    onOpenChange(false);
    navigate("/profile?edit=rate");
  };

  const goBrowseGigs = () => {
    onOpenChange(false);
    navigate("/gigs");
  };

  const firstName = fullName?.split(" ")[0] || "Creator";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 border-none overflow-hidden max-h-[92dvh] overflow-y-auto bg-card">
        {/* Confetti anchors */}
        <div className="absolute top-0 left-1/4 z-50"><Confetti active={showConfetti} config={confettiConfig} /></div>
        <div className="absolute top-0 left-1/2 z-50"><Confetti active={showConfetti} config={confettiConfig} /></div>
        <div className="absolute top-0 left-3/4 z-50"><Confetti active={showConfetti} config={confettiConfig} /></div>

        {/* Header — gradient with profile preview */}
        <div className="relative bg-gradient-to-br from-primary via-primary/80 to-energy/40 pt-10 pb-7 px-6 text-center overflow-hidden">
          <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-energy/10 blur-2xl" />
          <div className="absolute -bottom-20 -right-12 w-56 h-56 rounded-full bg-white/5 blur-2xl" />

          <div className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-energy text-energy-foreground text-[10px] font-bold tracking-widest mb-4 shadow-lg shadow-energy/30">
            <Sparkles className="h-3 w-3" />
            YOUR PROFILE IS LIVE
          </div>

          <div className="relative flex justify-center mb-3">
            <Avatar className="h-24 w-24 ring-4 ring-energy shadow-2xl">
              <AvatarImage src={avatarUrl} className="object-cover" />
              <AvatarFallback className="bg-primary/40 text-white text-2xl font-bold">
                {firstName.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
          </div>

          <h2 className="text-2xl font-black text-white mb-0.5 tracking-tight">{fullName}</h2>
          {role && <p className="text-white/80 text-sm font-medium">{role}</p>}

          {creditsCount > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 text-[11px] font-semibold backdrop-blur-sm">
              <Check className="h-3 w-3 text-energy" />
              {creditsCount} verified credit{creditsCount === 1 ? "" : "s"}
            </div>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Pride copy */}
          <div className="text-center space-y-1">
            <p className="text-base font-bold">
              Way to go, {firstName} — your creative résumé is ready 🎉
            </p>
            <p className="text-xs text-muted-foreground">
              Share it now to get your first profile views.
            </p>
          </div>

          {/* PRIMARY: Share buttons */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Share2 className="h-3.5 w-3.5 text-energy" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Share your profile
              </p>
            </div>

            <Button
              onClick={handleCopy}
              size="lg"
              className="w-full h-12 gap-2 bg-energy text-energy-foreground hover:bg-energy/90 font-bold"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied — paste anywhere" : "Copy profile link"}
            </Button>

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={handleWhatsApp} className="h-10 gap-1.5 text-xs">
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
              <Button variant="outline" size="sm" onClick={handleInstagram} className="h-10 gap-1.5 text-xs">
                <Instagram className="h-3.5 w-3.5" />
                Instagram
              </Button>
              <Button variant="outline" size="sm" onClick={handleTwitter} className="h-10 gap-1.5 text-xs">
                <Twitter className="h-3.5 w-3.5" />
                X / Twitter
              </Button>
            </div>

            <p className="text-[10px] text-center text-muted-foreground/70 font-mono truncate">
              {profileUrl.replace("https://www.", "")}
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-2 text-[10px] uppercase tracking-widest text-muted-foreground">Or do this next</span></div>
          </div>

          {/* SECONDARY: Next-step CTAs */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={goSetRate}
              className="text-left p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              <DollarSign className="h-4 w-4 text-primary mb-1.5" />
              <p className="text-xs font-semibold">Set your rate</p>
              <p className="text-[10px] text-muted-foreground">Get hired faster</p>
            </button>
            <button
              onClick={goBrowseGigs}
              className="text-left p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              <Briefcase className="h-4 w-4 text-primary mb-1.5" />
              <p className="text-xs font-semibold">Browse gigs</p>
              <p className="text-[10px] text-muted-foreground">Apply with one tap</p>
            </button>
          </div>

          {/* Continue */}
          <Button
            onClick={handleContinue}
            variant="ghost"
            className="w-full gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Skip for now — go to my home
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
