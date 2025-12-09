import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, ChevronDown, X } from "lucide-react";
import { ROLE_OPTIONS, LOCATION_OPTIONS } from "@/components/profile/ProfileEditDialog";

export interface ConnectFilters {
  role: string;
  location: string;
  collabIntent: string;
}

interface ConnectFiltersProps {
  filters: ConnectFilters;
  onFiltersChange: (filters: ConnectFilters) => void;
  activeFilterCount: number;
}

const COLLAB_INTENT_OPTIONS = [
  { value: 'all', label: 'Any Intent' },
  { value: 'looking_to_hire', label: '💼 Hiring' },
  { value: 'available_for_hire', label: '✋ Available' },
  { value: 'open_to_trade', label: '🔄 Open to Trade' },
  { value: 'seeking_collaborators', label: '🤝 Seeking Collaborators' },
  { value: 'just_networking', label: '👋 Networking' },
];

export const ConnectFiltersComponent = ({ filters, onFiltersChange, activeFilterCount }: ConnectFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    ...ROLE_OPTIONS.filter(r => r.value !== 'Other'),
  ];

  const locationOptions = [
    { value: 'all', label: 'All Locations' },
    ...LOCATION_OPTIONS.filter(l => l.value !== 'Other'),
  ];

  const clearFilters = () => {
    onFiltersChange({ role: 'all', location: 'all', collabIntent: 'all' });
  };

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

      <CollapsibleContent className="mt-3 space-y-3">
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
      </CollapsibleContent>
    </Collapsible>
  );
};
