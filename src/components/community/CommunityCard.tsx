import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MapPin, Lock } from "lucide-react";

interface Community {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_url: string | null;
  member_count: number;
  is_official: boolean;
  is_private: boolean;
  category: string | null;
  location: string | null;
  is_member?: boolean;
}

interface CommunityCardProps {
  community: Community;
  onJoin: (id: string) => void;
  onView: (id: string) => void;
}

export function CommunityCard({ community, onJoin, onView }: CommunityCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Cover Image */}
      {community.cover_url && (
        <div className="h-24 sm:h-32 overflow-hidden">
          <img 
            src={community.cover_url} 
            alt={community.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-4">
        {/* Community Info */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-12 w-12 border-2 border-background">
            <AvatarImage src={community.image_url || undefined} />
            <AvatarFallback>{community.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{community.name}</h3>
              {community.is_official && (
                <Badge variant="secondary" className="text-xs">Official</Badge>
              )}
              {community.is_private && <Lock className="h-3 w-3 text-muted-foreground" />}
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {community.description}
            </p>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{community.member_count} {community.member_count === 1 ? 'member' : 'members'}</span>
          </div>
          {community.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{community.location}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {community.is_member ? (
          <Button 
            onClick={() => onView(community.id)}
            className="w-full"
            variant="secondary"
          >
            View Community
          </Button>
        ) : (
          <Button 
            onClick={() => onJoin(community.id)}
            className="w-full"
          >
            Join Community
          </Button>
        )}
      </div>
    </Card>
  );
}