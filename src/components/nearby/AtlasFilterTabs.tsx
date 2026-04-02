import { Button } from "@/components/ui/button";
import { Users, Music, Palette, Camera, Building2, Calendar, MapPin, ShoppingBag, Headphones, Bookmark } from "lucide-react";

export type AtlasFilter = 'all' | 'creators' | 'sessions' | 'studio' | 'creative_space' | 'shoot_spot' | 'venue' | 'music_store' | 'art_supply' | 'rental_house' | 'photo_lab' | 'bookmarked';

interface AtlasFilterTabsProps {
  active: AtlasFilter;
  onChange: (filter: AtlasFilter) => void;
  counts: {
    creators: number;
    sessions: number;
    studios: number;
    spaces: number;
    spots: number;
    venues: number;
    music_stores: number;
    art_supplies: number;
    rental_houses: number;
    photo_labs: number;
    bookmarked: number;
  };
}

const TABS: { value: AtlasFilter; label: string; icon: any; countKey?: keyof AtlasFilterTabsProps['counts'] }[] = [
  { value: 'all', label: 'All', icon: MapPin },
  { value: 'bookmarked', label: 'Saved', icon: Bookmark, countKey: 'bookmarked' },
  { value: 'creators', label: 'Creators', icon: Users, countKey: 'creators' },
  { value: 'sessions', label: 'Sessions', icon: Calendar, countKey: 'sessions' },
  { value: 'studio', label: 'Studios', icon: Music, countKey: 'studios' },
  { value: 'creative_space', label: 'Spaces', icon: Palette, countKey: 'spaces' },
  { value: 'shoot_spot', label: 'Spots', icon: Camera, countKey: 'spots' },
  { value: 'venue', label: 'Venues', icon: Building2, countKey: 'venues' },
  { value: 'music_store', label: 'Music Stores', icon: Headphones, countKey: 'music_stores' },
  { value: 'art_supply', label: 'Art Supply', icon: ShoppingBag, countKey: 'art_supplies' },
  { value: 'rental_house', label: 'Rental', icon: Building2, countKey: 'rental_houses' },
  { value: 'photo_lab', label: 'Photo Lab', icon: Camera, countKey: 'photo_labs' },
];

export function AtlasFilterTabs({ active, onChange, counts }: AtlasFilterTabsProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) - (counts.bookmarked || 0);

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {TABS.map(tab => {
        const Icon = tab.icon;
        const count = tab.countKey ? counts[tab.countKey] : total;
        const isActive = active === tab.value;
        
        // Hide tabs with 0 count (except All, Saved, Creators, Sessions, and the main types)
        if (count === 0 && ['music_store', 'art_supply', 'rental_house', 'photo_lab'].includes(tab.value)) {
          return null;
        }
        
        return (
          <Button
            key={tab.value}
            size="sm"
            variant={isActive ? "default" : "outline"}
            className={`shrink-0 gap-1.5 text-xs h-8 ${isActive ? '' : 'text-muted-foreground'}`}
            onClick={() => onChange(tab.value)}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
            {count > 0 && (
              <span className={`text-[10px] px-1 rounded-full ${isActive ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
                {count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
