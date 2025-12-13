import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, Loader2, CheckCircle, Shield, Award } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ShareableProfileCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    user_id: string;
    full_name: string;
    role?: string;
    avatar_url?: string;
    verification_tier?: string;
    professional_skills?: string[];
    location?: string;
  };
  portfolioItems?: Array<{
    id: string;
    thumbnail_url?: string;
    media_url?: string;
    title?: string;
  }>;
  mode?: "profile" | "invite";
}

export const ShareableProfileCard = ({
  open,
  onOpenChange,
  profile,
  portfolioItems = [],
  mode = "profile",
}: ShareableProfileCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  // Fetch user's invite code only for invite mode
  useEffect(() => {
    const fetchInviteCode = async () => {
      if (!open || !profile.user_id || mode !== "invite") return;
      
      const { data } = await supabase
        .from("invites")
        .select("invite_code")
        .eq("inviter_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data?.invite_code) {
        setInviteCode(data.invite_code);
      }
    };
    
    fetchInviteCode();
  }, [open, profile.user_id, mode]);

  // Profile mode: QR goes to profile page
  // Invite mode: QR goes to signup with invite code
  const profileUrl = `${window.location.origin}/profile/${profile.user_id}`;
  const signupUrl = inviteCode 
    ? `${window.location.origin}/?code=${inviteCode}`
    : `${window.location.origin}/`;
  
  const qrUrl = mode === "profile" ? profileUrl : signupUrl;
  
  // Handle skills that might be objects or strings
  const topSkills = (profile.professional_skills?.slice(0, 3) || []).map((skill: any) => {
    if (typeof skill === 'string') return skill;
    if (skill && typeof skill === 'object' && skill.skill) return skill.skill;
    return null;
  }).filter(Boolean);
  
  const topPortfolio = portfolioItems.slice(0, 3);

  const getVerificationBadge = () => {
    switch (profile.verification_tier) {
      case "elite":
        return { icon: Award, label: "Elite Verified", color: "text-amber-400" };
      case "industry":
        return { icon: Shield, label: "Industry Verified", color: "text-purple-400" };
      case "verified":
        return { icon: CheckCircle, label: "Verified", color: "text-emerald-400" };
      default:
        return null;
    }
  };

  const verification = getVerificationBadge();

  const generateImage = async () => {
    if (!cardRef.current) return null;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
      });
      return canvas;
    } catch (error) {
      console.error("Error generating card:", error);
      toast.error("Failed to generate card");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const canvas = await generateImage();
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `thrivein-${profile.full_name?.replace(/\s+/g, "-").toLowerCase() || "profile"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Card downloaded!");
  };

  const handleShare = async () => {
    // In the Lovable preview (inside an iframe), the Web Share API often fails.
    // If we're not in the top window, fall back to download so users can still share.
    if (window.self !== window.top) {
      toast.info("In preview, sharing isn't supported. Downloading the card so you can share it.");
      await handleDownload();
      return;
    }

    // Simplest & most reliable: use native share for URL + text only
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.full_name} on ThriveIN`,
          text:
            mode === "invite"
              ? `Join me on ThriveIN!\n${qrUrl}`
              : `Check out my creative profile on ThriveIN!\n${qrUrl}`,
          url: qrUrl,
        });
        toast.success("Shared successfully!");
      } catch (error: any) {
        if (error?.name === "AbortError") return; // user cancelled
        console.error("Share error:", error);
        // On real devices this is unlikely, but if it happens we just fall back silently
        await handleDownload();
      }
      return;
    }

    // No Web Share API – fall back to download
    toast.info("Sharing not supported in this browser, downloading image instead");
    await handleDownload();
  };

  // Story size: 9:16 aspect ratio (compact to fit dialog)
  const cardWidth = 260;
  const cardHeight = 462;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === "profile" ? "Share Your Profile Card" : "Invite Friends Card"}
          </DialogTitle>
        </DialogHeader>

        {/* Card Preview - Story Size 9:16 */}
        <div className="flex justify-center py-2 overflow-hidden">
          <div
            ref={cardRef}
            className="rounded-3xl overflow-hidden relative"
            style={{
              width: cardWidth,
              height: cardHeight,
              background: "linear-gradient(165deg, #1a0a2e 0%, #0f0a1e 50%, #0a0612 100%)",
            }}
          >
            {/* Decorative top gradient glow */}
            <div 
              className="absolute -top-20 left-1/2 -translate-x-1/2 w-[300px] h-[200px] opacity-60"
              style={{
                background: "radial-gradient(ellipse at center, rgba(139, 92, 246, 0.5) 0%, rgba(168, 85, 247, 0.2) 40%, transparent 70%)",
                filter: "blur(30px)",
              }}
            />
            
            {/* Decorative bottom gradient */}
            <div 
              className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[200px] h-[100px] opacity-40"
              style={{
                background: "radial-gradient(ellipse at center, rgba(236, 72, 153, 0.4) 0%, transparent 70%)",
                filter: "blur(20px)",
              }}
            />

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col px-6 py-5">
              {/* Profile Section */}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-md opacity-60 scale-110" />
                  <Avatar className="h-20 w-20 border-[3px] border-white/30 shadow-2xl relative">
                    <AvatarImage src={profile.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-2xl font-bold">
                      {profile.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <h3 className="text-xl font-bold text-white mt-3 tracking-tight">
                  {profile.full_name || "Creative"}
                </h3>
                
                <p className="text-purple-300/80 text-sm font-medium">
                  {profile.role || "Creator"}
                </p>
                
                {profile.location && (
                  <p className="text-white/50 text-xs mt-1 flex items-center gap-1">
                    <span>📍</span> {profile.location}
                  </p>
                )}
                
                {verification && (
                  <div className="flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 border border-emerald-500/30">
                    <verification.icon className={`h-3.5 w-3.5 ${verification.color}`} />
                    <span className={`text-[11px] font-semibold ${verification.color}`}>
                      {verification.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Skills */}
              {topSkills.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                  {topSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-[10px] font-medium backdrop-blur-sm border border-white/10"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Portfolio Grid */}
              {topPortfolio.length > 0 && (
                <div className="mt-4 flex-1 flex items-center">
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {topPortfolio.map((item) => (
                      <div
                        key={item.id}
                        className="aspect-square rounded-xl overflow-hidden bg-white/5 shadow-lg ring-1 ring-white/10"
                      >
                        <img
                          src={item.thumbnail_url || item.media_url || "/placeholder.svg"}
                          alt={item.title || "Portfolio"}
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA Text */}
              <div className="mt-auto pt-3 text-center">
                <p className="text-white/70 text-[11px] leading-relaxed">
                  {mode === "profile" 
                    ? "Scan to view my full portfolio and connect with me" 
                    : "Scan to join ThriveIN and collaborate with top creators"
                  }
                </p>
              </div>

              {/* Footer with QR and Branding */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-white font-bold text-lg tracking-tight">Thrive</span>
                      <span className="font-bold text-lg tracking-tight text-purple-400">IN</span>
                    </div>
                    <p className="text-white/40 text-[9px] mt-0.5">
                      thrivein.io
                    </p>
                    {mode === "invite" && inviteCode && (
                      <p className="text-white/50 text-[10px] mt-1">
                        Code: <span className="font-mono font-bold text-purple-400">{inviteCode}</span>
                      </p>
                    )}
                  </div>
                  <div className="bg-white p-1.5 rounded-lg shadow-xl">
                    <QRCodeSVG
                      value={qrUrl}
                      size={52}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex-1"
            variant="outline"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download
          </Button>
          <Button
            onClick={handleShare}
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4 mr-2" />
            )}
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
