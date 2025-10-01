import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseMediaUrl } from "@/lib/mediaUtils";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    title: string;
    description: string;
    media_type: string;
    media_url: string;
  };
}

export const MediaPlayerModal = ({ isOpen, onClose, item }: MediaPlayerModalProps) => {
  const mediaInfo = parseMediaUrl(item.media_url);

  const renderPlayer = () => {
    // If we have platform-specific embed info
    if (mediaInfo) {
      return (
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
          <iframe
            src={mediaInfo.embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    // Fallback for direct media files
    if (item.media_type === 'video') {
      return (
        <video
          src={item.media_url}
          controls
          autoPlay
          className="w-full aspect-video rounded-lg bg-black"
        />
      );
    }

    if (item.media_type === 'audio') {
      return (
        <div className="p-8 bg-muted rounded-lg flex flex-col items-center gap-4">
          <div className="w-full max-w-md">
            <audio src={item.media_url} controls autoPlay className="w-full" />
          </div>
        </div>
      );
    }

    if (item.media_type === 'image') {
      return (
        <img
          src={item.media_url}
          alt={item.title}
          className="w-full max-h-[70vh] object-contain rounded-lg"
        />
      );
    }

    // Default fallback
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Media preview not available</p>
        <Button variant="outline" asChild>
          <a href={item.media_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in new tab
          </a>
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription>Media preview</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {renderPlayer()}
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
