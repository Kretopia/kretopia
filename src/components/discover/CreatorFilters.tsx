import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Filter, Lock, X, Search, Sparkles } from "lucide-react";

export interface CreatorFilterState {
  search: string;
  role: string;
  location: string;
  minFollowers: number;
  verified: boolean;
  level: string;
  badge: string;
  sortBy: string;
  activeOnly: boolean;
}

interface CreatorFiltersProps {
  filters: CreatorFilterState;
  onFilterChange: (filters: CreatorFilterState) => void;
  isPremium: boolean;
  userLevel: number;
  inlineMode?: boolean; // When true, renders filter content directly without sheet wrapper
}

export const CreatorFilters = ({ filters, onFilterChange, isPremium, userLevel, inlineMode = false }: CreatorFiltersProps) => {
  const navigate = useNavigate();
  const clearFilters = () => {
    onFilterChange({
      search: '',
      role: 'all',
      location: 'all',
      minFollowers: 0,
      verified: false,
      level: 'all',
      badge: 'all',
      sortBy: 'recommended',
      activeOnly: false
    });
  };

  const hasActiveFilters = 
    filters.search ||
    filters.role !== 'all' || 
    filters.location !== 'all' ||
    filters.minFollowers > 0 || 
    filters.verified ||
    filters.level !== 'all' ||
    filters.badge !== 'all' ||
    filters.sortBy !== 'recommended' ||
    filters.activeOnly;

  const activeFilterCount = 
    (filters.search ? 1 : 0) +
    (filters.role !== 'all' ? 1 : 0) +
    (filters.location !== 'all' ? 1 : 0) +
    (filters.minFollowers > 0 ? 1 : 0) +
    (filters.verified ? 1 : 0) +
    (filters.level !== 'all' ? 1 : 0) +
    (filters.badge !== 'all' ? 1 : 0) +
    (filters.activeOnly ? 1 : 0);

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="space-y-2">
        <Label>Search Creators</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, skills..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
      </div>

      {/* Sort By */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Sort By
          {filters.sortBy === 'recommended' && <Sparkles className="h-3 w-3 text-primary" />}
        </Label>
        <Select value={filters.sortBy} onValueChange={(value) => onFilterChange({ ...filters, sortBy: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recommended">Smart Recommended</SelectItem>
            <SelectItem value="newest">Newest Members</SelectItem>
            <SelectItem value="active">Most Active</SelectItem>
            <SelectItem value="level">Highest Level</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Free Filters */}
      <div className="space-y-4 pt-2 border-t">
        <Label className="text-xs font-semibold text-muted-foreground uppercase">Basic Filters</Label>
        
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={filters.role} onValueChange={(value) => onFilterChange({ ...filters, role: value })}>
            <SelectTrigger>
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="Creator">Creator</SelectItem>
              <SelectItem value="Musician">Musician</SelectItem>
              <SelectItem value="Photographer">Photographer</SelectItem>
              <SelectItem value="Videographer">Videographer</SelectItem>
              <SelectItem value="Writer">Writer</SelectItem>
              <SelectItem value="Designer">Designer</SelectItem>
              <SelectItem value="Artist">Artist</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <Select value={filters.location} onValueChange={(value) => onFilterChange({ ...filters, location: value })}>
            <SelectTrigger>
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="bali">Bali, Indonesia</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="asia">Asia</SelectItem>
              <SelectItem value="europe">Europe</SelectItem>
              <SelectItem value="americas">Americas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label>Active Members Only</Label>
          <Switch
            checked={filters.activeOnly}
            onCheckedChange={(checked) => onFilterChange({ ...filters, activeOnly: checked })}
          />
        </div>
      </div>

      {/* Premium Filters */}
      <div className={`space-y-4 pt-4 border-t ${!isPremium ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">Premium Filters</Label>
          {!isPremium && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Locked
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <Label>Minimum Social Following</Label>
          <Slider
            value={[filters.minFollowers]}
            onValueChange={(value) => onFilterChange({ ...filters, minFollowers: value[0] })}
            min={0}
            max={1000000}
            step={5000}
            disabled={!isPremium}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground text-center">
            {filters.minFollowers >= 1000000 
              ? `${(filters.minFollowers / 1000000).toFixed(1)}M+ followers`
              : filters.minFollowers >= 1000 
              ? `${(filters.minFollowers / 1000).toFixed(0)}K+ followers`
              : filters.minFollowers > 0 ? `${filters.minFollowers}+ followers` : 'Any following size'}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Verified Profiles Only</Label>
            <p className="text-xs text-muted-foreground">Profiles with verified credentials</p>
          </div>
          <Switch
            checked={filters.verified}
            onCheckedChange={(checked) => onFilterChange({ ...filters, verified: checked })}
            disabled={!isPremium}
          />
        </div>

        <div className="space-y-2">
          <Label>Experience Level</Label>
          <Select 
            value={filters.level} 
            onValueChange={(value) => onFilterChange({ ...filters, level: value })}
            disabled={!isPremium}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="1-5">Beginner (1-5)</SelectItem>
              <SelectItem value="6-10">Intermediate (6-10)</SelectItem>
              <SelectItem value="11+">Advanced (11+)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Member Status</Label>
          <Select 
            value={filters.badge} 
            onValueChange={(value) => onFilterChange({ ...filters, badge: value })}
            disabled={!isPremium}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="og">OG Members</SelectItem>
              <SelectItem value="beta">Beta Members</SelectItem>
              <SelectItem value="odos">🌿 ODOS Members</SelectItem>
              <SelectItem value="verified">✓ Verified</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isPremium && (
        <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
          <div className="flex items-start gap-3 mb-3">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm mb-1">Unlock Advanced Filters</p>
              <p className="text-xs text-muted-foreground">
                Find your perfect collaborators with smart filtering
              </p>
            </div>
          </div>
          <Button variant="default" className="w-full" onClick={() => navigate('/subscription')}>
            Upgrade to Pro
          </Button>
        </div>
      )}

      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters} className="w-full gap-2">
          <X className="h-4 w-4" />
          Clear {activeFilterCount} {activeFilterCount === 1 ? 'Filter' : 'Filters'}
        </Button>
      )}
    </div>
  );

  // If inlineMode is true, just render the filter content directly
  if (inlineMode) {
    return <FilterContent />;
  }

  return (
    <>
      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <FilterContent />
      </div>

      {/* Mobile Filter Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="lg:hidden w-full gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="default" className="ml-auto min-w-6 justify-center">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Find Your Match</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <FilterContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
