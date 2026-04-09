import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Filter, Lock, X, Search } from "lucide-react";

export interface OpportunityFilterState {
  search: string;
  type: string;
  location: string;
  compensation: string;
  remote: boolean;
  skills: string[];
  urgent: boolean;
  sortBy: string;
}

interface OpportunityFiltersComponentProps {
  filters: OpportunityFilterState;
  onFilterChange: (filters: OpportunityFilterState) => void;
  isPremium: boolean;
  userLevel: number;
}

export const OpportunityFiltersComponent = ({ filters, onFilterChange, isPremium, userLevel }: OpportunityFiltersComponentProps) => {
  const navigate = useNavigate();
  const clearFilters = () => {
    onFilterChange({
      search: '',
      type: 'all',
      location: 'all',
      compensation: 'all',
      remote: false,
      skills: [],
      urgent: false,
      sortBy: 'newest'
    });
  };

  const hasActiveFilters = 
    filters.search ||
    filters.type !== 'all' || 
    filters.location !== 'all' || 
    filters.compensation !== 'all' ||
    filters.remote ||
    filters.skills.length > 0 ||
    filters.urgent ||
    filters.sortBy !== 'newest';

  const activeFilterCount = 
    (filters.search ? 1 : 0) +
    (filters.type !== 'all' ? 1 : 0) +
    (filters.location !== 'all' ? 1 : 0) +
    (filters.compensation !== 'all' ? 1 : 0) +
    (filters.remote ? 1 : 0) +
    filters.skills.length +
    (filters.urgent ? 1 : 0);

  const availableSkills = [
    'Photography', 'Videography', 'Music Production', 'Writing', 
    'Design', 'Animation', 'Social Media', 'Marketing',
    'Film Directing', 'Cinematography', 'Audio Engineering', 'Singing',
    'DJing', 'Fashion Design', 'Makeup Artistry', 'Styling',
    'Acting', 'Dance', 'Illustration', 'Content Creation',
    'Beat Making', 'Mixing & Mastering', 'Sound Design', 'Voice Over',
    'Video Editing', 'Motion Graphics', 'VFX', 'Color Grading',
    'Graphic Design', 'UI/UX Design', 'Brand Identity', '3D Modeling',
    'Web Development', 'App Development', 'Copywriting', 'SEO',
    'Podcast Production', 'Live Streaming', 'Event Production',
    'Wardrobe Styling', 'Hair Styling', 'Nail Art', 'Set Design'
  ];

  const handleSkillToggle = (skill: string) => {
    const newSkills = filters.skills.includes(skill)
      ? filters.skills.filter(s => s !== skill)
      : [...filters.skills, skill];
    onFilterChange({ ...filters, skills: newSkills });
  };

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="space-y-2">
        <Label>Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search opportunities..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
      </div>

      {/* Sort By */}
      <div className="space-y-2">
        <Label>Sort By</Label>
        <Select value={filters.sortBy} onValueChange={(value) => onFilterChange({ ...filters, sortBy: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="urgent">Urgent First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Free Filters */}
      <div className="space-y-4 pt-2 border-t">
        <Label className="text-xs font-semibold text-muted-foreground uppercase">Basic Filters</Label>
        
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={filters.type} onValueChange={(value) => onFilterChange({ ...filters, type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="job">Paid Job</SelectItem>
              <SelectItem value="collab">Collaboration</SelectItem>
              <SelectItem value="gig">Gig / One-Off</SelectItem>
              <SelectItem value="project">Project-Based</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
              <SelectItem value="barter">Barter / Trade</SelectItem>
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
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="onsite">On-site</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label>Remote Only</Label>
          <Switch
            checked={filters.remote}
            onCheckedChange={(checked) => onFilterChange({ ...filters, remote: checked })}
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
          <Label>Compensation</Label>
          <Select 
            value={filters.compensation} 
            onValueChange={(value) => onFilterChange({ ...filters, compensation: value })}
            disabled={!isPremium}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any compensation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any compensation</SelectItem>
              <SelectItem value="paid">Paid Only</SelectItem>
              <SelectItem value="unpaid">Unpaid/Volunteer</SelectItem>
              <SelectItem value="equity">Equity</SelectItem>
              <SelectItem value="negotiable">Negotiable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Skills Required</Label>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
            {availableSkills.map((skill) => (
              <Badge
                key={skill}
                variant={filters.skills.includes(skill) ? "default" : "outline"}
                className={`cursor-pointer ${!isPremium ? 'pointer-events-none' : ''}`}
                onClick={() => isPremium && handleSkillToggle(skill)}
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>Urgent Opportunities Only</Label>
          <Switch
            checked={filters.urgent}
            onCheckedChange={(checked) => onFilterChange({ ...filters, urgent: checked })}
            disabled={!isPremium}
          />
        </div>
      </div>

      {!isPremium && (
        <Button variant="default" className="w-full" onClick={() => navigate('/subscription')}>
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
              <Badge variant="default" className="ml-auto min-w-6 justify-center">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Opportunity Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <FilterContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
