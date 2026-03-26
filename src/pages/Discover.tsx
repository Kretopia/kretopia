import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FramedAvatar } from "@/components/ui/framed-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin, Verified, Grid3X3, List, SlidersHorizontal, X, Users, Briefcase, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { DiscoveryGate, DiscoveryUpsell } from "@/components/DiscoveryGate";
import { Helmet } from "react-helmet-async";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface DiscoverProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
  bio: string | null;
  location: string | null;
  professional_skills: any;
  badge: string | null;
  verification_score: number | null;
  level: number | null;
  xp: number | null;
  account_type: string | null;
  company_name: string | null;
  job_title: string | null;
  industry: string | null;
  collab_intent: string | null;
}

const ROLE_CATEGORIES = [
  "All Roles",
  "Music Producer", "Songwriter", "Singer", "DJ", "Beat Maker", "Sound Engineer",
  "Videographer", "Director", "Editor", "Cinematographer", "VFX Artist", "Colorist",
  "Graphic Designer", "UI/UX Designer", "Illustrator", "Motion Designer", "3D Artist",
  "Photographer", "Content Creator", "Social Media Manager", "Copywriter", "Blogger",
  "Web Developer", "App Developer", "Game Developer",
  "Actor", "Model", "Dancer", "Choreographer", "Voice Actor",
  "Makeup Artist", "Stylist", "Fashion Designer",
  "Podcast Host", "Brand Strategist", "Event Planner", "Manager",
];

const LOCATIONS = [
  "All Locations",
  "Remote", "New York", "Los Angeles", "London", "Toronto", "Lagos",
  "Kingston", "Port of Spain", "Miami", "Atlanta", "Berlin", "Paris",
  "Tokyo", "Sydney", "Bali", "Dubai", "Cape Town", "Mumbai",
];

const Discover = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") || "All Roles");
  const [locationFilter, setLocationFilter] = useState(searchParams.get("location") || "All Locations");
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get("verified") === "true");
  const [availableOnly, setAvailableOnly] = useState(searchParams.get("available") === "true");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "recent");

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("public_profiles_discovery")
        .select("*", { count: "exact" })
        .eq("onboarding_completed", true);

      // Exclude self
      if (user?.id) {
        query = query.neq("user_id", user.id);
      }

      // Search
      if (search.trim()) {
        query = query.or(`full_name.ilike.%${search}%,role.ilike.%${search}%,bio.ilike.%${search}%,location.ilike.%${search}%`);
      }

      // Role filter
      if (roleFilter && roleFilter !== "All Roles") {
        query = query.ilike("role", `%${roleFilter}%`);
      }

      // Location filter
      if (locationFilter && locationFilter !== "All Locations") {
        query = query.ilike("location", `%${locationFilter}%`);
      }

      // Verified only
      if (verifiedOnly) {
        query = query.gte("verification_score", 50);
      }

      // Sort
      if (sortBy === "recent") {
        query = query.order("created_at", { ascending: false });
      } else if (sortBy === "level") {
        query = query.order("level", { ascending: false });
      } else if (sortBy === "xp") {
        query = query.order("xp", { ascending: false });
      }

      query = query.limit(48);

      const { data, error, count } = await query;

      if (error) throw error;
      setProfiles(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("[Discover] Error fetching profiles:", err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, locationFilter, verifiedOnly, availableOnly, sortBy, user?.id]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (roleFilter !== "All Roles") params.set("role", roleFilter);
    if (locationFilter !== "All Locations") params.set("location", locationFilter);
    if (verifiedOnly) params.set("verified", "true");
    if (availableOnly) params.set("available", "true");
    if (sortBy !== "recent") params.set("sort", sortBy);
    setSearchParams(params, { replace: true });
  }, [search, roleFilter, locationFilter, verifiedOnly, availableOnly, sortBy]);

  const activeFilterCount = [
    roleFilter !== "All Roles",
    locationFilter !== "All Locations",
    verifiedOnly,
    availableOnly,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setRoleFilter("All Roles");
    setLocationFilter("All Locations");
    setVerifiedOnly(false);
    setAvailableOnly(false);
    setSearch("");
  };

  return (
    <>
      <Helmet>
        <title>Discover Creators | ThriveIN</title>
        <meta name="description" content="Browse and discover talented creatives — musicians, designers, videographers, and more." />
      </Helmet>

      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-2xl font-bold">Discover</h1>
                <p className="text-sm text-muted-foreground">
                  {totalCount.toLocaleString()} creators to explore
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search + Filter bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search creators, skills, locations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="relative flex-shrink-0">
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-6 mt-6">
                    <div className="space-y-2">
                      <Label>Role / Profession</Label>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLE_CATEGORIES.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Select value={locationFilter} onValueChange={setLocationFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LOCATIONS.map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Sort By</Label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recent">Most Recent</SelectItem>
                          <SelectItem value="level">Highest Level</SelectItem>
                          <SelectItem value="xp">Most XP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <Label htmlFor="verified-only">Verified only</Label>
                      <Switch id="verified-only" checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" className="flex-1" onClick={clearFilters}>
                        Clear All
                      </Button>
                      <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Active filter badges */}
            {activeFilterCount > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {roleFilter !== "All Roles" && (
                  <Badge variant="secondary" className="gap-1">
                    {roleFilter}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setRoleFilter("All Roles")} />
                  </Badge>
                )}
                {locationFilter !== "All Locations" && (
                  <Badge variant="secondary" className="gap-1">
                    {locationFilter}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setLocationFilter("All Locations")} />
                  </Badge>
                )}
                {verifiedOnly && (
                  <Badge variant="secondary" className="gap-1">
                    Verified
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setVerifiedOnly(false)} />
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-3" />
                    <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No creators found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your filters or search terms</p>
              <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {profiles.map((profile, index) => (
                <DiscoveryGate key={profile.user_id} totalItems={profiles.length} freePreviewCount={6} index={index} itemLabel="creators">
                  <ProfileCard profile={profile} onClick={() => navigate(`/profile/${profile.user_id}`)} />
                </DiscoveryGate>
              ))}
              <DiscoveryUpsell totalItems={profiles.length} freePreviewCount={6} itemLabel="creators" />
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile, index) => (
                <DiscoveryGate key={profile.user_id} totalItems={profiles.length} freePreviewCount={6} index={index} itemLabel="creators">
                  <ProfileListItem profile={profile} onClick={() => navigate(`/profile/${profile.user_id}`)} />
                </DiscoveryGate>
              ))}
              <DiscoveryUpsell totalItems={profiles.length} freePreviewCount={6} itemLabel="creators" />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

function ProfileCard({ profile, onClick }: { profile: DiscoverProfile; onClick: () => void }) {
  const skills = Array.isArray(profile.professional_skills) 
    ? profile.professional_skills.slice(0, 3).map((s: any) => typeof s === 'string' ? s : s?.skill || '').filter(Boolean)
    : [];
  const isVerified = (profile.verification_score || 0) >= 50;

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 group overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-4 text-center">
        <div className="relative mx-auto w-16 h-16 mb-3">
          <FramedAvatar src={profile.avatar_url} fallback={(profile.full_name || "?")[0]} className="h-16 w-16" />
          {isVerified && (
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <Verified className="h-3 w-3 text-primary-foreground" />
            </div>
          )}
        </div>

        <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
          {profile.full_name}
        </h3>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {profile.role || profile.job_title || "Creator"}
        </p>

        {profile.location && (
          <div className="flex items-center justify-center gap-1 mt-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground truncate">{profile.location}</span>
          </div>
        )}

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mt-2">
            {skills.map((skill: string) => (
              <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        {profile.level && profile.level > 1 && (
          <div className="mt-2">
            <Badge variant="outline" className="text-[10px] gap-0.5">
              <Sparkles className="h-2.5 w-2.5" />
              Lv.{profile.level}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileListItem({ profile, onClick }: { profile: DiscoverProfile; onClick: () => void }) {
  const skills = Array.isArray(profile.professional_skills) 
    ? profile.professional_skills.slice(0, 5).map((s: any) => typeof s === 'string' ? s : s?.skill || '').filter(Boolean)
    : [];
  const isVerified = (profile.verification_score || 0) >= 50;

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <FramedAvatar src={profile.avatar_url} fallback={(profile.full_name || "?")[0]} className="h-12 w-12" />
          {isVerified && (
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
              <Verified className="h-2.5 w-2.5 text-primary-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{profile.full_name}</h3>
            {profile.level && profile.level > 1 && (
              <Badge variant="outline" className="text-[10px] gap-0.5 flex-shrink-0">
                <Sparkles className="h-2.5 w-2.5" />
                Lv.{profile.level}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {profile.role || profile.job_title || "Creator"}
            {profile.location && ` · ${profile.location}`}
          </p>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {skills.map((skill: string) => (
                <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Button variant="outline" size="sm" className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); onClick(); }}>
          View
        </Button>
      </CardContent>
    </Card>
  );
}

export default Discover;
