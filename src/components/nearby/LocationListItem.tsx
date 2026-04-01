import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, DollarSign, Camera, Building2, Palette, Music } from "lucide-react";

interface CreativeLocation {
  id: string;
  name: string;
  description?: string;
  location_type: string;
  category?: string;
  address?: string;
  city?: string;
  latitude: number;
  longitude: number;
  cover_image_url?: string;
  image_urls?: string[];
  tags?: string[];
  amenities?: string[];
  is_rentable?: boolean;
  price_per_hour?: number;
  price_currency?: string;
  average_rating?: number;
  review_count?: number;
  is_verified?: boolean;
  creator_name?: string;
  creator_avatar?: string;
  distance_km: number;
}

interface LocationListItemProps {
  location: CreativeLocation;
  isSelected: boolean;
  onClick: () => void;
  formatDistance: (km: number) => string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  studio: { icon: Music, color: 'text-purple-500', label: 'Studio' },
  creative_space: { icon: Palette, color: 'text-emerald-500', label: 'Space' },
  shoot_spot: { icon: Camera, color: 'text-rose-500', label: 'Spot' },
  venue: { icon: Building2, color: 'text-blue-500', label: 'Venue' },
};

export function LocationListItem({ location, isSelected, onClick, formatDistance }: LocationListItemProps) {
  const config = TYPE_CONFIG[location.location_type] || TYPE_CONFIG.shoot_spot;
  const Icon = config.icon;

  return (
    <Card 
      className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-md'}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Icon / Image */}
          {location.cover_image_url ? (
            <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0">
              <img src={location.cover_image_url} alt={location.name} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-medium text-sm truncate">{location.name}</h4>
              {location.is_verified && (
                <Badge variant="secondary" className="text-[8px] h-3.5 px-1">✓</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5">
                <Icon className={`h-2.5 w-2.5 ${config.color}`} />
                {config.label}
              </Badge>
              {(location.average_rating ?? 0) > 0 && (
                <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-amber-500" />
                  {Number(location.average_rating).toFixed(1)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-primary flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {formatDistance(location.distance_km)}
              </span>
              {location.is_rentable && location.price_per_hour && (
                <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                  <DollarSign className="h-3 w-3" />
                  {location.price_per_hour}/{location.price_currency || 'USD'}/hr
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export type { CreativeLocation };
