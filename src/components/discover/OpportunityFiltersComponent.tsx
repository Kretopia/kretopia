import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Filter, Lock, X } from "lucide-react";

export interface OpportunityFilterState {
  type: string;
  location: string;
  compensation: string;
  remote: boolean;
  skills: string[];
  urgent: boolean;
}

interface OpportunityFiltersComponentProps {
  filters: OpportunityFilterState;
  onFilterChange: (filters: OpportunityFilterState) => void;
  isPremium: boolean;
  userLevel: number;
}

export const OpportunityFiltersComponent = ({ filters, onFilterChange, isPremium, userLevel }: OpportunityFiltersComponentProps) => {
  const clearFilters = () => {
    onFilterChange({
      type: 'all',
      location: 'all',
      compensation: 'all',
      remote: false,
      skills: [],
      urgent: false
    });
  };

  const hasActiveFilters = 
    filters.type !== 'all' || 
    filters.location !== 'all' || 
    filters.compensation !== 'all' ||
    filters.remote ||
    filters.skills.length > 0 ||
    filters.urgent;

  const availableSkills = [
    'Photography', 'Videography', 'Music Production', 'Writing', 
    'Design', 'Animation', 'Social Media', 'Marketing'
  ];

  const handleSkillToggle = (skill: string) => {
    const newSkills = filters.skills.includes(skill)
      ? filters.skills.filter(s => s !== skill)
      : [...filters.skills, skill];
    onFilterChange({ ...filters, skills: newSkills });
  };

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Free Filters */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Type (Free)</Label>
          <Select value={filters.type} onValueChange={(value) => onFilterChange({ ...filters, type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="collaboration">Collaboration</SelectItem>
              <SelectItem value="job">Job</SelectItem>
              <SelectItem value="gig">Gig</SelectItem>
              <SelectItem value="project">Project</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Location (Free)</Label>
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
          <Label>Remote Only (Free)</Label>
          <Switch
            checked={filters.remote}
            onCheckedChange={(checked) => onFilterChange({ ...filters, remote: checked })}
          />
        </div>
      </div>

      {/* Premium Filters */}
      <div className={`space-y-4 ${!isPremium ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">Premium Filters</Label>
          {!isPremium && <Lock className="h-3 w-3 text-muted-foreground" />}
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
