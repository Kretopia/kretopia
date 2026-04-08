import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageTransition } from "@/components/PageTransition";
import { 
  Search, UserSearch, MapPin, Star, ArrowLeft, Filter, 
  CheckCircle2, Loader2, MessageCircle, Eye, X 
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_FILTERS = [
  "All Roles",
  "Music Production", "Videography", "Photography", "Graphic Design",
  "Content Creation", "Songwriting", "Video Editing", "Animation",
  "Social Media Management", "Copywriting", "Modeling", "Acting",
  "Styling", "Event Production", "DJing", "Illustration",
];

const LOCATION_FILTERS = [
  "Anywhere", "Trinidad & Tobago", "Jamaica", "Barbados", "United States",
  "United Kingdom", "Canada", "Nigeria", "South Africa",
];

export default function TalentFinder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [locationFilter, setLocationFilter] = useState("Anywhere");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCreators();
  }, [roleFilter, locationFilter]);

  const fetchCreators = async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, role, location, bio, skills, badge, average_rating, total_reviews")
      .eq("account_type", "individual")
      .eq("onboarding_complete", true)
      .order("average_rating", { ascending: false, nullsFirst: false })
      .limit(50);

    if (roleFilter !== "All Roles") {
      query = query.ilike("role", `%${roleFilter}%`);
    }
    if (locationFilter !== "Anywhere") {
      query = query.ilike("location", `%${locationFilter}%`);
    }

    const { data } = await query;
    setCreators(data || []);
    setLoading(false);
  };

  const filteredCreators = searchQuery.trim()
    ? creators.filter(c =>
        c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.skills || []).some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : creators;

  return (
    <PageTransition>
      <Helmet>
        <title>Find Talent | ThriveIN</title>
        <meta name="description" content="Browse and search verified creative talent for your next project." />
      </Helmet>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <UserSearch className="h-5 w-5 text-primary" />
              Find Talent
            </h1>
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            className="gap-1 h-8"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, skill, or role..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_FILTERS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_FILTERS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Active filter badges */}
        {(roleFilter !== "All Roles" || locationFilter !== "Anywhere") && (
          <div className="flex gap-2 flex-wrap">
            {roleFilter !== "All Roles" && (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setRoleFilter("All Roles")}>
                {roleFilter} <X className="h-3 w-3" />
              </Badge>
            )}
            {locationFilter !== "Anywhere" && (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setLocationFilter("Anywhere")}>
                {locationFilter} <X className="h-3 w-3" />
              </Badge>
            )}
          </div>
        )}

        {/* Results count */}
        <p className="text-xs text-muted-foreground">
          {loading ? "Searching..." : `${filteredCreators.length} creator${filteredCreators.length !== 1 ? "s" : ""} found`}
        </p>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredCreators.length === 0 ? (
          <div className="text-center py-12">
            <UserSearch className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-medium mb-1">No creators found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCreators.map((creator) => (
              <Card
                key={creator.user_id}
                className="p-3 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
                onClick={() => navigate(`/profile/${creator.user_id}`)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={creator.avatar_url} />
                    <AvatarFallback>{creator.full_name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold truncate">{creator.full_name}</span>
                      {creator.badge && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </div>
                    {creator.role && (
                      <p className="text-xs text-muted-foreground truncate">{creator.role}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      {creator.location && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" /> {creator.location}
                        </span>
                      )}
                      {creator.average_rating > 0 && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                          {creator.average_rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {creator.skills && creator.skills.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {creator.skills.slice(0, 3).map((skill: string) => (
                          <Badge key={skill} variant="secondary" className="text-[10px] h-5 px-1.5">{skill}</Badge>
                        ))}
                        {creator.skills.length > 3 && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">+{creator.skills.length - 3}</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] gap-1 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${creator.user_id}`);
                      }}
                    >
                      <Eye className="h-3 w-3" /> View
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
