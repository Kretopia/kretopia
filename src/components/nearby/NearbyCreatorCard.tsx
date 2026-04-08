import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusAvatar } from "@/components/ui/status-avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, MessageCircle, User } from "lucide-react";

export interface NearbyCreator {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  bio: string | null;
  location: string | null;
  professional_skills: any;
  latitude: number;
  longitude: number;
  distance_km: number;
  location_precision?: 'exact' | 'approximate' | 'area_only';
}

export const getSkills = (skills: any): string[] => {
  if (!skills) return [];
  if (Array.isArray(skills)) {
    return skills.slice(0, 3).map((s: any) => typeof s === 'string' ? s : s.skill || s.name || '');
  }
  return [];
};

export const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  return `${km.toFixed(1)}km away`;
};

interface CreatorCardProps {
  creator: NearbyCreator;
  onViewProfile: (userId: string) => void;
  onMessage: (userId: string) => void;
}

export const CreatorCard = ({ creator, onViewProfile, onMessage }: CreatorCardProps) => {
  const skills = getSkills(creator.professional_skills);
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <StatusAvatar
            src={creator.avatar_url}
            fallback={creator.full_name?.charAt(0) || 'U'}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{creator.full_name}</h4>
            <p className="text-sm text-muted-foreground truncate">{creator.role}</p>
            <p className="text-xs text-primary flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {formatDistance(creator.distance_km)}
            </p>
          </div>
        </div>
        
        {creator.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{creator.bio}</p>
        )}
        
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {skills.map((skill, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
            ))}
          </div>
        )}
        
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onViewProfile(creator.user_id)}>
            <User className="h-3 w-3 mr-1" />
            Profile
          </Button>
          <Button size="sm" className="flex-1" onClick={() => onMessage(creator.user_id)}>
            <MessageCircle className="h-3 w-3 mr-1" />
            Connect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface CreatorListItemProps {
  creator: NearbyCreator;
  isSelected: boolean;
  onClick: () => void;
  onViewProfile: (userId: string) => void;
}

export const CreatorListItem = ({ creator, isSelected, onClick, onViewProfile }: CreatorListItemProps) => {
  const skills = getSkills(creator.professional_skills);
  
  return (
    <Card 
      className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-md'}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <StatusAvatar
            src={creator.avatar_url}
            fallback={creator.full_name?.charAt(0) || 'U'}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{creator.full_name}</h4>
            <p className="text-xs text-muted-foreground truncate">{creator.role}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-primary flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {formatDistance(creator.distance_km)}
              </span>
              {skills.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4">{skills[0]}</Badge>
              )}
            </div>
          </div>
          <Button 
            size="sm" variant="ghost" className="h-8 w-8 p-0"
            onClick={(e) => { e.stopPropagation(); onViewProfile(creator.user_id); }}
          >
            <User className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
