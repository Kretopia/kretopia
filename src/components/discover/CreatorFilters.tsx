import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Filter, Lock, X } from "lucide-react";

export interface CreatorFilterState {
  role: string;
  minFollowers: number;
  verified: boolean;
  level: string;
  badge: string;
}

interface CreatorFiltersProps {
  filters: CreatorFilterState;
  onFilterChange: (filters: CreatorFilterState) => void;
  isPremium: boolean;
  userLevel: number;
}

export const CreatorFilters = ({ filters, onFilterChange, isPremium, userLevel }: CreatorFiltersProps) => {
  const clearFilters = () => {
    onFilterChange({
      role: 'all',
      minFollowers: 0,
      verified: false,
      level: 'all',
      badge: 'all'
    });
  };

  const hasActiveFilters = 
    filters.role !== 'all' || 
    filters.minFollowers > 0 || 
    filters.verified ||
    filters.level !== 'all' ||
    filters.badge !== 'all';

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Free Filters */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Role (Free)</Label>
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
      </div>

      {/* Premium Filters */}
      <div className={`space-y-4 ${!isPremium ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">Premium Filters</Label>
          {!isPremium && <Lock className="h-3 w-3 text-muted-foreground" />}
        </div>

        <div className="space-y-2">
          <Label>Minimum Followers</Label>
          <Slider
            value={[filters.minFollowers]}
            onValueChange={(value) => onFilterChange({ ...filters, minFollowers: value[0] })}
            min={0}
            max={1000000}
            step={10000}
            disabled={!isPremium}
          />
          <p className="text-sm text-muted-foreground">
            {filters.minFollowers >= 1000000 
              ? `${(filters.minFollowers / 1000000).toFixed(1)}M+`
              : filters.minFollowers >= 1000 
              ? `${(filters.minFollowers / 1000).toFixed(0)}K+`
              : filters.minFollowers > 0 ? `${filters.minFollowers}+` : 'Any'}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Label>Verified Metrics Only</Label>
          <Switch
            checked={filters.verified}
            onCheckedChange={(checked) => onFilterChange({ ...filters, verified: checked })}
            disabled={!isPremium}
          />
        </div>

        <div className="space-y-2">
          <Label>Level</Label>
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
              <SelectItem value="1-5">Level 1-5</SelectItem>
              <SelectItem value="6-10">Level 6-10</SelectItem>
              <SelectItem value="11+">Level 11+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Badge</Label>
          <Select 
            value={filters.badge} 
            onValueChange={(value) => onFilterChange({ ...filters, badge: value })}
            disabled={!isPremium}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Badges" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Badges</SelectItem>
              <SelectItem value="og">OG Members</SelectItem>
              <SelectItem value="beta">Beta Members</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isPremium && (
        <Button variant="default" className="w-full" onClick={() => window.location.href = '/subscription'}>
          Unlock Premium Filters
        </Button>
      )}

      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters} className="w-full gap-2">
          <X className="h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );

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
              <Badge variant="secondary" className="ml-auto">Active</Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Creator Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <FilterContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
