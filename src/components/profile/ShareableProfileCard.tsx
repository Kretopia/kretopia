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
      const rect = cardRef.current.getBoundingClientRect();
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // sharp but keeps exact proportions
        width: rect.width,
        height: rect.height,
        backgroundColor: "#0a0612", // solid background so corners don't look warped
        useCORS: true,
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

  // Story size: 9:16 aspect ratio
  const cardWidth = 270;
  const cardHeight = 480;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "profile" ? "Share Your Profile Card" : "Invite Friends Card"}
          </DialogTitle>
        </DialogHeader>

        {/* Card Preview - Story Size 9:16 */}
        <div className="flex justify-center py-2">
          <div
            ref={cardRef}
            className="rounded-2xl overflow-hidden relative flex-shrink-0"
            style={{
              width: cardWidth,
              height: cardHeight,
              background: "linear-gradient(165deg, #1a0a2e 0%, #0f0a1e 50%, #0a0612 100%)",
            }}
          >
            {/* Decorative top gradient glow */}
            <div 
              className="absolute -top-10 left-1/2 -translate-x-1/2 w-[250px] h-[150px] opacity-50"
              style={{
                background: "radial-gradient(ellipse at center, rgba(139, 92, 246, 0.6) 0%, transparent 70%)",
                filter: "blur(25px)",
              }}
            />

            {/* Content - fixed height sections */}
            <div className="relative z-10 h-full flex flex-col px-5 py-4">
              {/* Profile Section - fixed */}
              <div className="flex flex-col items-center text-center flex-shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-md opacity-50 scale-110" />
                  <Avatar className="h-16 w-16 border-2 border-white/30 shadow-xl relative">
                    <AvatarImage src={profile.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-xl font-bold">
                      {profile.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <h3 className="text-lg font-bold text-white mt-2 tracking-tight">
                  {profile.full_name || "Creative"}
                </h3>
                
                <p className="text-purple-300/80 text-xs font-medium">
                  {profile.role || "Creator"}
                </p>
                
                {profile.location && (
                  <p className="text-white/50 text-[10px] mt-0.5 flex items-center gap-1">
                    <span>📍</span> {profile.location}
                  </p>
                )}
                
                {verification && (
                  <div className="flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                    <verification.icon className={`h-3 w-3 ${verification.color}`} />
                    <span className={`text-[10px] font-semibold ${verification.color}`}>
                      {verification.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Skills - fixed */}
              {topSkills.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-3 flex-shrink-0">
                  {topSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full bg-white/10 text-white/90 text-[9px] font-medium border border-white/10"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Portfolio Grid - flexible */}
              {topPortfolio.length > 0 && (
                <div className="mt-3 flex-1 min-h-0">
                  <div className="grid grid-cols-3 gap-1.5 w-full">
                    {topPortfolio.map((item) => (
                      <div
                        key={item.id}
                        className="aspect-square rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/10"
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

              {/* Footer with QR and Branding - always visible at bottom */}
              <div className="mt-auto pt-3 flex-shrink-0">
                {/* CTA Text */}
                <p className="text-white/60 text-[10px] text-center mb-3 leading-relaxed">
                  {mode === "profile" 
                    ? "Scan to view my full portfolio & connect" 
                    : "Scan to join ThriveIN & collaborate"
                  }
                </p>
                
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-white font-bold text-base tracking-tight">Thrive</span>
                      <span className="font-bold text-base tracking-tight text-purple-400">IN</span>
                    </div>
                    <p className="text-white/40 text-[8px]">
                      thrivein.io
                    </p>
                    {mode === "invite" && inviteCode && (
                      <p className="text-white/50 text-[9px] mt-0.5">
                        Code: <span className="font-mono font-bold text-purple-400">{inviteCode}</span>
                      </p>
                    )}
                  </div>
                  <div className="bg-white p-1.5 rounded-lg shadow-lg">
                    <QRCodeSVG
                      value={qrUrl}
                      size={48}
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
