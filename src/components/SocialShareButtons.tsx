import { Button } from "@/components/ui/button";
import { Share2, Link2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SocialShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  variant?: "icon" | "full";
}

export function SocialShareButtons({ url, title, description, variant = "icon" }: SocialShareButtonsProps) {
  const fullUrl = url.startsWith("http") ? url : `https://www.thrivein.io${url}`;
  const text = `${title}${description ? ` — ${description}` : ""}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedText = encodeURIComponent(text);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: fullUrl });
        return;
      } catch {}
    }
    handleCopyLink();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${text}\n${fullUrl}`);
    toast.success("Link copied!");
  };

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    x: `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };

  if (variant === "icon") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Share2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleNativeShare}>
            <Share2 className="mr-2 h-4 w-4" /> Share...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(shareLinks.whatsapp, "_blank")}>
            <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(shareLinks.x, "_blank")}>
            𝕏 <span className="ml-2">Post on X</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(shareLinks.linkedin, "_blank")}>
            in <span className="ml-2">LinkedIn</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            <Link2 className="mr-2 h-4 w-4" /> Copy Link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleNativeShare} className="gap-1.5">
        <Share2 className="h-3.5 w-3.5" /> Share
      </Button>
    </div>
  );
}
