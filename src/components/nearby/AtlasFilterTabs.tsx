import { Button } from "@/components/ui/button";
import { Users, Music, Palette, Camera, Building2, Calendar, MapPin, ShoppingBag, Headphones, Bookmark, ChevronDown, SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

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

const PRIMARY_TABS: { value: AtlasFilter; label: string; icon: any; countKey?: keyof AtlasFilterTabsProps['counts'] }[] = [
  { value: 'all', label: 'All', icon: MapPin },
  { value: 'bookmarked', label: 'Saved', icon: Bookmark, countKey: 'bookmarked' },
  { value: 'creators', label: 'Creators', icon: Users, countKey: 'creators' },
  { value: 'sessions', label: 'Sessions', icon: Calendar, countKey: 'sessions' },
];

const MORE_TABS: { value: AtlasFilter; label: string; icon: any; countKey: keyof AtlasFilterTabsProps['counts'] }[] = [
  { value: 'studio', label: 'Studios', icon: Music, countKey: 'studios' },
  { value: 'creative_space', label: 'Creative Spaces', icon: Palette, countKey: 'spaces' },
  { value: 'shoot_spot', label: 'Shoot Spots', icon: Camera, countKey: 'spots' },
  { value: 'venue', label: 'Venues', icon: Building2, countKey: 'venues' },
  { value: 'music_store', label: 'Music Stores', icon: Headphones, countKey: 'music_stores' },
  { value: 'art_supply', label: 'Art Supply', icon: ShoppingBag, countKey: 'art_supplies' },
  { value: 'rental_house', label: 'Rental Houses', icon: Building2, countKey: 'rental_houses' },
  { value: 'photo_lab', label: 'Photo Labs', icon: Camera, countKey: 'photo_labs' },
];

export function AtlasFilterTabs({ active, onChange, counts }: AtlasFilterTabsProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) - (counts.bookmarked || 0);
  const isMoreActive = MORE_TABS.some(t => t.value === active);
  const activeMoreLabel = MORE_TABS.find(t => t.value === active)?.label;

  return (
    <div className="flex gap-1.5 items-center">
      {/* Primary quick-access tabs */}
      {PRIMARY_TABS.map(tab => {
        const Icon = tab.icon;
        const count = tab.countKey ? counts[tab.countKey] : total;
        const isActive = active === tab.value;
        
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

      {/* More filter dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant={isMoreActive ? "default" : "outline"}
            className={`shrink-0 gap-1.5 text-xs h-8 ${isMoreActive ? '' : 'text-muted-foreground'}`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {isMoreActive ? activeMoreLabel : 'More'}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Locations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {MORE_TABS.map(tab => {
            const Icon = tab.icon;
            const count = counts[tab.countKey];
            return (
              <DropdownMenuItem
                key={tab.value}
                onClick={() => onChange(tab.value)}
                className={`gap-2 ${active === tab.value ? 'bg-primary/10 text-primary' : ''}`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{tab.label}</span>
                {count > 0 && (
                  <span className="text-[10px] text-muted-foreground">{count}</span>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
