import { Button } from "@/components/ui/button";
import { Users, Music, Palette, Camera, Building2, Calendar, MapPin } from "lucide-react";

export type AtlasFilter = 'all' | 'creators' | 'sessions' | 'studio' | 'creative_space' | 'shoot_spot' | 'venue';

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
  };
}

const TABS: { value: AtlasFilter; label: string; icon: any; countKey?: keyof AtlasFilterTabsProps['counts'] }[] = [
  { value: 'all', label: 'All', icon: MapPin },
  { value: 'creators', label: 'Creators', icon: Users, countKey: 'creators' },
  { value: 'sessions', label: 'Sessions', icon: Calendar, countKey: 'sessions' },
  { value: 'studio', label: 'Studios', icon: Music, countKey: 'studios' },
  { value: 'creative_space', label: 'Spaces', icon: Palette, countKey: 'spaces' },
  { value: 'shoot_spot', label: 'Spots', icon: Camera, countKey: 'spots' },
  { value: 'venue', label: 'Venues', icon: Building2, countKey: 'venues' },
];

export function AtlasFilterTabs({ active, onChange, counts }: AtlasFilterTabsProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {TABS.map(tab => {
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
    </div>
  );
}
