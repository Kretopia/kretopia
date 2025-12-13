import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Copy, Check, Image } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ShareableProfileCard } from "./ShareableProfileCard";

interface ShareProfileDialogProps {
  profile: {
    full_name: string;
    role: string;
    bio?: string;
    user_id: string;
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ShareProfileDialog = ({ profile, portfolioItems = [], open, onOpenChange }: ShareProfileDialogProps) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const { toast } = useToast();

  const profileUrl = `https://www.thrivein.io/profile/${profile.user_id}`;
  
  const shareText = `Check out my creative portfolio on ThriveIN! 🎨✨

${profile.full_name} | ${profile.role}
${profile.bio ? profile.bio.slice(0, 100) + (profile.bio.length > 100 ? '...' : '') : ''}

View my work, collaborations, and achievements:
${profileUrl}

#CreativePortfolio #ThriveIN`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.full_name}'s Creative Portfolio`,
          text: shareText,
          url: profileUrl,
        });
        toast({
          title: "Shared successfully",
          description: "Profile shared via native share",
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
  };

  const handleSocialShare = (platform: string) => {
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(profile.full_name + "'s Creative Portfolio on ThriveIN")}&body=${encodeURIComponent(shareText)}`;
        break;
    }
    
    if (shareUrl) {
      // Create a temporary link element and click it
      const link = document.createElement('a');
      link.href = shareUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Opening share dialog",
        description: `Redirecting to ${platform}...`,
      });
    }
  };

  const copyToClipboard = async (text: string, type: 'url' | 'text') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      }
      toast({
        title: "Copied!",
        description: type === 'url' ? "Profile link copied to clipboard" : "Share text copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Share Your Profile</DialogTitle>
          <DialogDescription>
            Your all-in-one link to showcase your creative work
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Create Profile Card - NEW */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">Create Profile Card</h4>
                <p className="text-xs text-muted-foreground">Beautiful card for Instagram, Stories & more</p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsCardDialogOpen(true)}
                className="gap-2"
              >
                <Image className="h-4 w-4" />
                Create
              </Button>
            </div>
          </div>

          {/* Profile URL */}
          <div className="space-y-2">
            <Label htmlFor="profile-url">Your Profile Link</Label>
            <div className="flex gap-2">
              <Input
                id="profile-url"
                value={profileUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(profileUrl, 'url')}
              >
                {copiedUrl ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Pre-written share text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="share-text">Ready-to-Share Copy</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(shareText, 'text')}
              >
                {copiedText ? (
                  <>
                    <Check className="h-3 w-3 mr-1 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <textarea
              id="share-text"
              value={shareText}
              readOnly
              rows={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* Native share button (for mobile) */}
          {navigator.share && (
            <div className="pt-2 border-t">
              <Button
                variant="default"
                className="w-full"
                onClick={handleNativeShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share via...
              </Button>
            </div>
          )}

          {/* Social share buttons */}
          <div className="pt-2 border-t">
            <Label className="mb-3 block">Share on</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSocialShare('twitter')}
                type="button"
              >
                Twitter/X
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSocialShare('linkedin')}
                type="button"
              >
                LinkedIn
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSocialShare('facebook')}
                type="button"
              >
                Facebook
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSocialShare('whatsapp')}
                type="button"
              >
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSocialShare('email')}
                type="button"
              >
                Email
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Shareable Profile Card Dialog */}
      <ShareableProfileCard
        open={isCardDialogOpen}
        onOpenChange={setIsCardDialogOpen}
        profile={profile}
        portfolioItems={portfolioItems}
      />
    </Dialog>
  );
};
