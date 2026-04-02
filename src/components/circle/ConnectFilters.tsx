import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, ChevronDown, X, Lock, Sparkles, Crown } from "lucide-react";
import { ROLE_OPTIONS, LOCATION_OPTIONS } from "@/components/profile/ProfileEditDialog";
import { useNavigate } from "react-router-dom";

export interface ConnectFilters {
  role: string;
  location: string;
  collabIntent: string;
  // Pro filters
  verifiedOnly: boolean;
  minFollowers: string;
  experienceLevel: string;
}

interface ConnectFiltersProps {
  filters: ConnectFilters;
  onFiltersChange: (filters: ConnectFilters) => void;
  activeFilterCount: number;
  isPro?: boolean;
}

const COLLAB_INTENT_OPTIONS = [
  { value: 'all', label: 'Any Intent' },
  { value: 'looking_to_hire', label: 'Hiring' },
  { value: 'available_for_hire', label: 'Available' },
  { value: 'open_to_trade', label: 'Open to Trade' },
  { value: 'seeking_collaborators', label: 'Seeking Collaborators' },
  { value: 'just_networking', label: 'Networking' },
];

const EXPERIENCE_OPTIONS = [
  { value: 'all', label: 'Any Experience' },
  { value: 'beginner', label: 'Beginner (0-2 years)' },
  { value: 'intermediate', label: 'Intermediate (3-5 years)' },
  { value: 'experienced', label: 'Experienced (5-10 years)' },
  { value: 'expert', label: 'Expert (10+ years)' },
];

const FOLLOWER_OPTIONS = [
  { value: 'all', label: 'Any Following' },
  { value: '1000', label: '1K+ followers' },
  { value: '5000', label: '5K+ followers' },
  { value: '10000', label: '10K+ followers' },
  { value: '50000', label: '50K+ followers' },
  { value: '100000', label: '100K+ followers' },
];

export const ConnectFiltersComponent = ({ filters, onFiltersChange, activeFilterCount, isPro = false }: ConnectFiltersProps) => {
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
    onFiltersChange({ 
      role: 'all', 
      location: 'all', 
      collabIntent: 'all',
      verifiedOnly: false,
      minFollowers: 'all',
      experienceLevel: 'all'
    });
  };

  const ProFilterOverlay = ({ children }: { children: React.ReactNode }) => (
    <div className="relative">
      <div className="blur-[2px] pointer-events-none opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Button 
          size="sm" 
          variant="secondary"
          className="gap-1.5 text-xs shadow-lg"
          onClick={() => navigate('/subscription')}
        >
          <Crown className="h-3 w-3 text-amber-500" />
          Unlock Pro
        </Button>
      </div>
    </div>
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full mb-4">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs">
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      <CollapsibleContent className="mt-3 space-y-4">
        {/* Basic Filters - Available to all */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Basic Filters
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Role Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <Select 
                value={filters.role} 
                onValueChange={(value) => onFiltersChange({ ...filters, role: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <Select 
                value={filters.location} 
                onValueChange={(value) => onFiltersChange({ ...filters, location: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  {locationOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Collab Intent Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Looking to</label>
              <Select 
                value={filters.collabIntent} 
                onValueChange={(value) => onFiltersChange({ ...filters, collabIntent: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Any Intent" />
                </SelectTrigger>
                <SelectContent>
                  {COLLAB_INTENT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Pro Filters */}
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center gap-2 text-xs">
            <Crown className="h-3 w-3 text-amber-500" />
            <span className="text-amber-500 font-medium">Pro Filters</span>
            {!isPro && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-500">
                <Lock className="h-2.5 w-2.5 mr-1" />
                Upgrade
              </Badge>
            )}
          </div>
          
          {isPro ? (
            // Unlocked Pro Filters
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Verified Only */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Verification</label>
                <Select 
                  value={filters.verifiedOnly ? 'verified' : 'all'}
                  onValueChange={(value) => onFiltersChange({ ...filters, verifiedOnly: value === 'verified' })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Creators" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Creators</SelectItem>
                    <SelectItem value="verified">✓ Verified Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Min Followers */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Min Followers</label>
                <Select 
                  value={filters.minFollowers}
                  onValueChange={(value) => onFiltersChange({ ...filters, minFollowers: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Any Following" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOWER_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Experience Level */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Experience</label>
                <Select 
                  value={filters.experienceLevel}
                  onValueChange={(value) => onFiltersChange({ ...filters, experienceLevel: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Any Experience" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            // Blurred Pro Filters for free users
            <ProFilterOverlay>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Verification</label>
                  <div className="h-9 rounded-md border bg-muted/30 flex items-center px-3 text-sm text-muted-foreground">
                    ✓ Verified Only
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Min Followers</label>
                  <div className="h-9 rounded-md border bg-muted/30 flex items-center px-3 text-sm text-muted-foreground">
                    10K+ followers
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Experience</label>
                  <div className="h-9 rounded-md border bg-muted/30 flex items-center px-3 text-sm text-muted-foreground">
                    Experienced
                  </div>
                </div>
              </div>
            </ProFilterOverlay>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};