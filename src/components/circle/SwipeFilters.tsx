import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter, X, Lock, Sparkles, Crown, Zap, CheckCircle, Star, Users, MapPin, Briefcase, Target } from "lucide-react";
import { ROLE_OPTIONS, LOCATION_OPTIONS } from "@/components/profile/ProfileEditDialog";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface SwipeFiltersState {
  role: string;
  location: string;
  collabIntent: string;
  // Pro filters
  verifiedOnly: boolean;
  minFollowers: string;
  experienceLevel: string;
  aiMatchOnly: boolean;
}

interface SwipeFiltersProps {
  filters: SwipeFiltersState;
  onFiltersChange: (filters: SwipeFiltersState) => void;
  isPro?: boolean;
  profilesCount?: number;
}

const COLLAB_INTENT_OPTIONS = [
  { value: 'all', label: 'Any Intent', icon: Target },
  { value: 'looking_to_hire', label: 'Hiring', emoji: '💼' },
  { value: 'available_for_hire', label: 'Available', emoji: '✋' },
  { value: 'open_to_trade', label: 'Open to Trade', emoji: '🔄' },
  { value: 'seeking_collaborators', label: 'Seeking Collaborators', emoji: '🤝' },
  { value: 'just_networking', label: 'Networking', emoji: '👋' },
];

const EXPERIENCE_OPTIONS = [
  { value: 'all', label: 'Any Level' },
  { value: 'beginner', label: 'Beginner (0-2 yrs)', emoji: '🌱' },
  { value: 'intermediate', label: 'Intermediate (3-5 yrs)', emoji: '📈' },
  { value: 'experienced', label: 'Experienced (5-10 yrs)', emoji: '⭐' },
  { value: 'expert', label: 'Expert (10+ yrs)', emoji: '🏆' },
];

const FOLLOWER_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: '1000', label: '1K+' },
  { value: '5000', label: '5K+' },
  { value: '10000', label: '10K+' },
  { value: '50000', label: '50K+' },
  { value: '100000', label: '100K+' },
];

export const DEFAULT_SWIPE_FILTERS: SwipeFiltersState = {
  role: 'all',
  location: 'all',
  collabIntent: 'all',
  verifiedOnly: false,
  minFollowers: 'all',
  experienceLevel: 'all',
  aiMatchOnly: false,
};

export function SwipeFilters({ filters, onFiltersChange, isPro = false, profilesCount = 0 }: SwipeFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    ...ROLE_OPTIONS.filter(r => r.value !== 'Other'),
  ];

  const locationOptions = [
    { value: 'all', label: 'All Locations' },
    ...LOCATION_OPTIONS.filter(l => l.value !== 'Other'),
  ];

  const clearFilters = () => {
    onFiltersChange(DEFAULT_SWIPE_FILTERS);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.role !== 'all') count++;
    if (filters.location !== 'all') count++;
    if (filters.collabIntent !== 'all') count++;
    if (filters.verifiedOnly) count++;
    if (filters.minFollowers !== 'all') count++;
    if (filters.experienceLevel !== 'all') count++;
    if (filters.aiMatchOnly) count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

  const FilterSection = ({ title, icon: Icon, children, isPremium = false }: { 
    title: string; 
    icon: React.ElementType; 
    children: React.ReactNode;
    isPremium?: boolean;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", isPremium ? "text-amber-500" : "text-muted-foreground")} />
        <span className={cn("text-sm font-medium", isPremium && "text-amber-500")}>{title}</span>
        {isPremium && !isPro && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-500">
            <Lock className="h-2.5 w-2.5 mr-0.5" />
            Pro
          </Badge>
        )}
      </div>
      {children}
    </div>
  );

  const ProLockedOverlay = ({ children }: { children: React.ReactNode }) => (
    <div className="relative">
      <div className="blur-[2px] pointer-events-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Button 
          size="sm" 
          className="gap-1.5 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg"
          onClick={() => navigate('/subscription')}
        >
          <Crown className="h-3 w-3" />
          Unlock Pro
        </Button>
      </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Match Filters
            </SheetTitle>
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                  <X className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {profilesCount} creators match your filters
          </p>
        </SheetHeader>

        <div className="py-6 space-y-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* AI Match - Pro Feature */}
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">AI Smart Match</span>
                    {!isPro && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px]">
                        Pro
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Only show high-compatibility matches</p>
                </div>
              </div>
              {isPro ? (
                <Switch
                  checked={filters.aiMatchOnly}
                  onCheckedChange={(checked) => onFiltersChange({ ...filters, aiMatchOnly: checked })}
                />
              ) : (
                <Button 
                  size="sm" 
                  className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  onClick={() => navigate('/subscription')}
                >
                  <Crown className="h-3 w-3" />
                  Unlock
                </Button>
              )}
            </div>
          </div>

          {/* Basic Filters */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
              <Sparkles className="h-3 w-3" />
              Basic Filters
            </div>
            
            {/* Role */}
            <FilterSection title="Role" icon={Briefcase}>
              <Select 
                value={filters.role} 
                onValueChange={(value) => onFiltersChange({ ...filters, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSection>

            {/* Location */}
            <FilterSection title="Location" icon={MapPin}>
              <Select 
                value={filters.location} 
                onValueChange={(value) => onFiltersChange({ ...filters, location: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  {locationOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSection>

            {/* Collaboration Intent */}
            <FilterSection title="Looking to" icon={Target}>
              <Select 
                value={filters.collabIntent} 
                onValueChange={(value) => onFiltersChange({ ...filters, collabIntent: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Intent" />
                </SelectTrigger>
                <SelectContent>
                  {COLLAB_INTENT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {'emoji' in opt ? `${opt.emoji} ${opt.label}` : opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSection>
          </div>

          {/* Pro Filters Section */}
          <div className="pt-4 border-t space-y-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
              <Crown className="h-3 w-3 text-amber-500" />
              <span className="text-amber-500">Pro Filters</span>
            </div>

            {isPro ? (
              <>
                {/* Verified Only */}
                <FilterSection title="Verification" icon={CheckCircle} isPremium>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="text-sm font-medium">Verified Creators Only</p>
                      <p className="text-xs text-muted-foreground">Show only verified profiles</p>
                    </div>
                    <Switch
                      checked={filters.verifiedOnly}
                      onCheckedChange={(checked) => onFiltersChange({ ...filters, verifiedOnly: checked })}
                    />
                  </div>
                </FilterSection>

                {/* Min Followers */}
                <FilterSection title="Minimum Followers" icon={Users} isPremium>
                  <div className="flex flex-wrap gap-2">
                    {FOLLOWER_OPTIONS.map(opt => (
                      <Button
                        key={opt.value}
                        variant={filters.minFollowers === opt.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => onFiltersChange({ ...filters, minFollowers: opt.value })}
                        className="text-xs"
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </FilterSection>

                {/* Experience Level */}
                <FilterSection title="Experience Level" icon={Star} isPremium>
                  <Select 
                    value={filters.experienceLevel}
                    onValueChange={(value) => onFiltersChange({ ...filters, experienceLevel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any Experience" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {'emoji' in opt ? `${opt.emoji} ${opt.label}` : opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterSection>
              </>
            ) : (
              <ProLockedOverlay>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="text-sm font-medium">Verified Creators Only</p>
                      <p className="text-xs text-muted-foreground">Show only verified profiles</p>
                    </div>
                    <Switch disabled />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" disabled className="text-xs">10K+</Button>
                    <Button variant="outline" size="sm" disabled className="text-xs">50K+</Button>
                    <Button variant="outline" size="sm" disabled className="text-xs">100K+</Button>
                  </div>
                  <div className="h-10 rounded-md border bg-muted/30 flex items-center px-3 text-sm text-muted-foreground">
                    ⭐ Experience Level
                  </div>
                </div>
              </ProLockedOverlay>
            )}
          </div>
        </div>

        {/* Apply Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => setIsOpen(false)}
          >
            Show {profilesCount} Creators
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
