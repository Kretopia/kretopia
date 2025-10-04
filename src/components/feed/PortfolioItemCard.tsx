import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Play, Eye, Sparkles } from "lucide-react";
import { MediaPlayerModal } from "@/components/profile/MediaPlayerModal";

interface PortfolioItemCardProps {
  item: {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    media_url: string;
    media_type: string;
    thumbnail_url: string | null;
    tags: string[];
    view_count: number;
    created_at: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
      role: string;
    };
  };
}

export const PortfolioItemCard = ({ item }: PortfolioItemCardProps) => {
  const [showPlayer, setShowPlayer] = useState(false);

  const isPlayable = item.media_type === 'video' || item.media_type === 'audio';

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-all">
        <div 
          className="relative aspect-video bg-gradient-to-br from-primary/10 to-primary/5 cursor-pointer group"
          onClick={() => isPlayable ? setShowPlayer(true) : window.open(item.media_url, '_blank')}
        >
          {item.thumbnail_url ? (
            <img 
              src={item.thumbnail_url} 
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : item.media_type === 'image' ? (
            <img 
              src={item.media_url} 
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="h-16 w-16 text-primary/50" />
            </div>
          )}
          
          {isPlayable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="h-16 w-16 text-white" />
            </div>
          )}

          <Badge className="absolute top-2 right-2 bg-background/90 backdrop-blur">
            <Sparkles className="h-3 w-3 mr-1" />
            Portfolio
          </Badge>
        </div>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={item.profiles.avatar_url || undefined} />
              <AvatarFallback>{item.profiles.full_name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{item.profiles.full_name}</p>
              <p className="text-xs text-muted-foreground">{item.profiles.role}</p>
            </div>
          </div>

          {/* Title & Description */}
          <h3 className="font-semibold mb-1">{item.title}</h3>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {item.description}
            </p>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {item.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {item.view_count}
            </div>
            <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
          </div>
        </div>
      </Card>

      {isPlayable && showPlayer && (
        <MediaPlayerModal
          isOpen={showPlayer}
          onClose={() => setShowPlayer(false)}
          item={{
            title: item.title,
            description: item.description || '',
            media_type: item.media_type,
            media_url: item.media_url
          }}
        />
      )}
    </>
  );
};