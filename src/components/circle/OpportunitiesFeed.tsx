import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PostOpportunityDialog } from "@/components/PostOpportunityDialog";
import { SavedOpportunitiesDialog } from "@/components/opportunity/SavedOpportunitiesDialog";
import { ScoutGigDialog } from "@/components/opportunity/ScoutGigDialog";
import GigCard, { type GigCreatorProfile } from "@/components/opportunity/GigCard";
import { 
  Briefcase, Handshake, ArrowRightLeft,
  Plus, Sparkles, Zap, Target, GraduationCap, X,
  Search, MapPin, SlidersHorizontal, DollarSign,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { DiscoveryGate, DiscoveryUpsell } from "@/components/DiscoveryGate";

interface Opportunity {
  id: string;
  title: string;
  description: string;
  type: string;
  compensation: string | null;
  location: string | null;
  skills: string[] | null;
  tags: string[] | null;
  created_at: string | null;
  created_by: string | null;
  duration: string | null;
  image_url: string | null;
  status: string | null;
  barter_offering: string | null;
  barter_requesting: string | null;
  platform_requirements: string[] | null;
  min_followers: number | null;
  scouted_by: string | null;
}

// Use shared GigCreatorProfile from GigCard

const TYPE_FILTERS = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "barter", label: "Barter", icon: ArrowRightLeft },
  { value: "job", label: "Paid", icon: Briefcase },
  { value: "collab", label: "Collabs", icon: Handshake },
  { value: "gig", label: "Gigs", icon: Zap },
  { value: "project", label: "Projects", icon: Target },
  { value: "internship", label: "Learn", icon: GraduationCap },
] as const;

const SKILLS_OPTIONS = [
  'Photography', 'Videography', 'Music Production', 'Writing',
  'Design', 'Animation', 'Social Media', 'Marketing',
  'Content Creation', 'DJing', 'Singing', 'Acting',
  'Dance', 'Makeup Artistry', 'Styling', 'Video Editing',
  'Motion Graphics', 'Graphic Design', 'Podcast Production', 'Live Streaming',
];

// TYPE_CONFIG moved to shared GigCard component

export const OpportunitiesFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [creators, setCreators] = useState<Record<string, GigCreatorProfile>>({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("all");
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState("all");
  const [compensationFilter, setCompensationFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = [activeFilter !== "all", selectedSkill !== "all", locationFilter !== "all", compensationFilter !== "all"].filter(Boolean).length;

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("opportunities")
        .select("*")
        .in("status", ["active", "open"])
        .order("created_at", { ascending: false })
        .limit(30);

      if (activeFilter !== "all") {
        if (activeFilter === "collab") {
          query = query.in("type", ["collab", "collaboration"]);
        } else {
          query = query.eq("type", activeFilter);
        }
      }

      if (searchQuery.trim()) {
        query = query.ilike("title", `%${searchQuery.trim()}%`);
      }

      if (selectedSkill !== "all") {
        query = query.contains("skills", [selectedSkill]);
      }

      if (locationFilter !== "all") {
        query = query.ilike("location", `%${locationFilter}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Sort priority gigs to the top
      let sorted = ((data as any[]) || []).sort((a, b) => {
        const aPriority = a.is_priority && a.priority_expires_at && new Date(a.priority_expires_at) > new Date() ? 1 : 0;
        const bPriority = b.is_priority && b.priority_expires_at && new Date(b.priority_expires_at) > new Date() ? 1 : 0;
        return bPriority - aPriority;
      });
      setOpportunities(sorted);

      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map(o => o.created_by).filter(Boolean))] as string[];
        if (creatorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url, role")
            .in("user_id", creatorIds);
          if (profiles) {
            const map: Record<string, GigCreatorProfile> = {};
            profiles.forEach(p => { map[p.user_id] = p; });
            setCreators(map);
          }
        }
      }
    } catch (error) {
      console.error("[OpportunitiesFeed] Error:", error);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery, selectedSkill, locationFilter]);

  useEffect(() => { fetchOpportunities(); }, [fetchOpportunities]);

  

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2.5 text-foreground">
              <Briefcase className="h-6 w-6 text-primary" />
              Browse Gigs
            </h1>
            <p className="text-sm text-[hsl(220,10%,45%)]">
              Productions, barters, collabs & creative work
            </p>
          </div>
          <PostOpportunityDialog
            open={postDialogOpen}
            onOpenChange={setPostDialogOpen}
            onSuccess={() => { setPostDialogOpen(false); fetchOpportunities(); }}
            trigger={
              <Button size="sm" className="gap-1.5 shrink-0">
                <Plus className="h-4 w-4" />
                Post
              </Button>
            }
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <SavedOpportunitiesDialog />
          <ScoutGigDialog />
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/opportunity-dashboard')}>
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">My Listings</span>
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search gigs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery("")}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filter Gigs
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-5 py-4">
              {/* Type Filter */}
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                  Type
                </label>
                <Select value={activeFilter} onValueChange={setActiveFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_FILTERS.map(filter => (
                      <SelectItem key={filter.value} value={filter.value}>{filter.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Skill Filter */}
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Skill
                </label>
                <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Skills" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Skills</SelectItem>
                    {SKILLS_OPTIONS.map(skill => (
                      <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Location
                </label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Location</SelectItem>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="Bali">Bali</SelectItem>
                    <SelectItem value="Trinidad">Trinidad</SelectItem>
                    <SelectItem value="New York">New York</SelectItem>
                    <SelectItem value="Los Angeles">Los Angeles</SelectItem>
                    <SelectItem value="London">London</SelectItem>
                    <SelectItem value="Lagos">Lagos</SelectItem>
                    <SelectItem value="Toronto">Toronto</SelectItem>
                    <SelectItem value="Kingston">Kingston</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Compensation Filter */}
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <DollarSign className="h-3.5 w-3.5 text-primary" />
                  Compensation
                </label>
                <Select value={compensationFilter} onValueChange={setCompensationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="paid">Paid Only</SelectItem>
                    <SelectItem value="barter">Barter/Trade</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setActiveFilter("all");
                    setSelectedSkill("all");
                    setLocationFilter("all");
                    setCompensationFilter("all");
                  }}
                >
                  Clear All
                </Button>
                <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
                  Show Results
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active filter badges */}
      {(searchQuery || activeFilter !== "all" || selectedSkill !== "all" || locationFilter !== "all" || compensationFilter !== "all") && (
        <div className="flex gap-2 flex-wrap">
          {activeFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {TYPE_FILTERS.find(f => f.value === activeFilter)?.label || activeFilter}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setActiveFilter("all")} />
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchQuery}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
            </Badge>
          )}
          {selectedSkill !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {selectedSkill}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedSkill("all")} />
            </Badge>
          )}
          {locationFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {locationFilter}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setLocationFilter("all")} />
            </Badge>
          )}
          {compensationFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {compensationFilter}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setCompensationFilter("all")} />
            </Badge>
          )}
        </div>
      )}


      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" />
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && opportunities.length === 0 && (
        <div className="text-center py-14 px-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <h4 className="text-lg font-bold mb-2">No gigs here yet</h4>
          <p className="text-sm text-muted-foreground mb-1 max-w-xs mx-auto">
            {activeFilter !== "all" || searchQuery
              ? "Try adjusting your filters to see more results."
              : "Be the first to post an opportunity — paid gig, barter, or collab."}
          </p>
          <p className="text-xs text-muted-foreground/70 mb-6">
            New gigs are posted daily by creatives worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => setPostDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Post a Gig
            </Button>
            {(activeFilter !== "all" || searchQuery || selectedSkill !== "all" || locationFilter !== "all") && (
              <Button variant="outline" onClick={() => { setActiveFilter("all"); setSearchQuery(""); setSelectedSkill("all"); setLocationFilter("all"); setCompensationFilter("all"); }}>
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Cards */}
      {!loading && opportunities.map((opp, index) => {
        // Don't show scout's profile as the poster — show "Scouted for" label instead
        const creator = opp.scouted_by ? null : (opp.created_by ? creators[opp.created_by] : null);

        return (
          <DiscoveryGate key={opp.id} totalItems={opportunities.length} freePreviewCount={4} index={index} itemLabel="gigs">
            <GigCard opportunity={opp} creator={creator} />
          </DiscoveryGate>
        );
      })}
      {!loading && <DiscoveryUpsell totalItems={opportunities.length} freePreviewCount={4} itemLabel="gigs" />}
    </div>
  );
};
