import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, Loader2, CheckCircle, Shield, Award } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

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
}

export const ShareableProfileCard = ({
  open,
  onOpenChange,
  profile,
  portfolioItems = [],
}: ShareableProfileCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const profileUrl = `${window.location.origin}/profile/${profile.user_id}`;
  const topSkills = profile.professional_skills?.slice(0, 3) || [];
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
    const canvas = await generateImage();
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Failed to create image");
          return;
        }

        const file = new File([blob], "thrivein-profile.png", { type: "image/png" });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${profile.full_name} on ThriveIN`,
            text: `Check out my creative profile on ThriveIN!`,
          });
          toast.success("Shared successfully!");
        } else {
          // Fallback to download
          handleDownload();
        }
      }, "image/png");
    } catch (error) {
      console.error("Share error:", error);
      handleDownload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Profile Card</DialogTitle>
        </DialogHeader>

        {/* Card Preview */}
        <div className="flex justify-center py-4">
          <div
            ref={cardRef}
            className="w-[340px] rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)",
            }}
          >
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20 border-2 border-white/20">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-2xl">
                    {profile.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-white truncate">
                    {profile.full_name || "Creative"}
                  </h3>
                  <p className="text-white/70 text-sm truncate">
                    {profile.role || "Creator"}
                  </p>
                  {profile.location && (
                    <p className="text-white/50 text-xs mt-1">📍 {profile.location}</p>
                  )}
                  {verification && (
                    <div className="flex items-center gap-1 mt-2">
                      <verification.icon className={`h-4 w-4 ${verification.color}`} />
                      <span className={`text-xs ${verification.color}`}>
                        {verification.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Skills */}
            {topSkills.length > 0 && (
              <div className="px-6 pb-4">
                <div className="flex flex-wrap gap-2">
                  {topSkills.map((skill, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="bg-white/10 text-white/90 border-white/20 text-xs"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio Preview */}
            {topPortfolio.length > 0 && (
              <div className="px-6 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  {topPortfolio.map((item) => (
                    <div
                      key={item.id}
                      className="aspect-square rounded-lg overflow-hidden bg-white/5"
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

            {/* Footer with QR */}
            <div className="px-6 pb-6 flex items-center justify-between">
              <div>
                <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1">
                  Find me on
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-white font-bold text-lg">Thrive</span>
                  <span className="text-primary font-bold text-lg">IN</span>
                </div>
              </div>
              <div className="bg-white p-2 rounded-lg">
                <QRCodeSVG
                  value={profileUrl}
                  size={60}
                  level="M"
                  includeMargin={false}
                />
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
