import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Filter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface OpportunityFilters {
  search: string;
  type: string;
  location: string;
  skills: string[];
  compensation: string;
}

interface OpportunityFiltersProps {
  filters: OpportunityFilters;
  onFilterChange: (filters: OpportunityFilters) => void;
  availableSkills: string[];
}

export const OpportunityFiltersComponent = ({ filters, onFilterChange, availableSkills }: OpportunityFiltersProps) => {
  const handleSkillToggle = (skill: string) => {
    const newSkills = filters.skills.includes(skill)
      ? filters.skills.filter(s => s !== skill)
      : [...filters.skills, skill];
    onFilterChange({ ...filters, skills: newSkills });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      type: '',
      location: '',
      skills: [],
      compensation: ''
    });
  };

  const hasActiveFilters = filters.search || filters.type || filters.location || filters.skills.length > 0 || filters.compensation;

  const FilterContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Search</Label>
        <Input
          placeholder="Search opportunities..."
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={filters.type} onValueChange={(value) => onFilterChange({ ...filters, type: value })}>
          <SelectTrigger>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All types</SelectItem>
            <SelectItem value="collaboration">Collaboration</SelectItem>
            <SelectItem value="job">Job</SelectItem>
            <SelectItem value="gig">Gig</SelectItem>
            <SelectItem value="project">Project</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <Select value={filters.location} onValueChange={(value) => onFilterChange({ ...filters, location: value })}>
          <SelectTrigger>
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All locations</SelectItem>
            <SelectItem value="remote">Remote</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
            <SelectItem value="onsite">On-site</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Compensation</Label>
        <Select value={filters.compensation} onValueChange={(value) => onFilterChange({ ...filters, compensation: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Any compensation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any compensation</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid/Volunteer</SelectItem>
            <SelectItem value="equity">Equity</SelectItem>
            <SelectItem value="negotiable">Negotiable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Skills</Label>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
          {availableSkills.slice(0, 20).map((skill) => (
            <Badge
              key={skill}
              variant={filters.skills.includes(skill) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleSkillToggle(skill)}
            >
              {skill}
            </Badge>
          ))}
        </div>
      </div>

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
              <Badge variant="secondary" className="ml-auto">
                {filters.skills.length + (filters.type ? 1 : 0) + (filters.location ? 1 : 0) + (filters.compensation ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <FilterContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
