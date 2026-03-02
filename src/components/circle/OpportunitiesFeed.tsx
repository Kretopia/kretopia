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
import { 
  Briefcase, Handshake, ArrowRightLeft, MapPin, Clock, 
  DollarSign, Plus, ChevronRight, Sparkles, User, AlertTriangle,
  Search, Zap, Target, GraduationCap, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, differenceInDays, parseISO } from "date-fns";
import { EasyApplyButton } from "@/components/opportunity/EasyApplyButton";
import { BookmarkButton } from "@/components/opportunity/BookmarkButton";

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
}

interface CreatorProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

const TYPE_FILTERS = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "job", label: "💼 Jobs", icon: Briefcase },
  { value: "collab", label: "🤝 Collabs", icon: Handshake },
  { value: "gig", label: "⚡ Gigs", icon: Zap },
  { value: "project", label: "🎯 Projects", icon: Target },
  { value: "internship", label: "🎓 Internships", icon: GraduationCap },
  { value: "barter", label: "🔄 Barter", icon: ArrowRightLeft },
] as const;

const SKILLS_OPTIONS = [
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
];

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Briefcase }> = {
  job: { label: "Paid Job", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: Briefcase },
  collab: { label: "Collaboration", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Handshake },
  collaboration: { label: "Collaboration", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Handshake },
  gig: { label: "Gig / One-Off", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Zap },
  project: { label: "Project-Based", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20", icon: Target },
  internship: { label: "Internship", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: GraduationCap },
  barter: { label: "Barter/Trade", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: ArrowRightLeft },
};

export const OpportunitiesFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [creators, setCreators] = useState<Record<string, CreatorProfile>>({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("all");
  const [postDialogOpen, setPostDialogOpen] = useState(false);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("opportunities")
        .select("*")
        .eq("status", "active")
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

      const { data, error } = await query;
      if (error) throw error;
      setOpportunities(data || []);

      // Fetch creator profiles (filter out null created_by for guest posts)
      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map(o => o.created_by).filter(Boolean))] as string[];
        if (creatorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url, role")
            .in("user_id", creatorIds);

          if (profiles) {
            const map: Record<string, CreatorProfile> = {};
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
  }, [activeFilter, searchQuery, selectedSkill]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const getTypeConfig = (type: string) => {
    return TYPE_CONFIG[type] || TYPE_CONFIG.job;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2.5">
              <Briefcase className="h-6 w-6" />
              Opportunities
            </h1>
            <p className="text-sm text-muted-foreground">
              Find gigs, jobs, and creative collaborations
            </p>
          </div>
          <PostOpportunityDialog
            open={postDialogOpen}
            onOpenChange={setPostDialogOpen}
            onSuccess={() => {
              setPostDialogOpen(false);
              fetchOpportunities();
            }}
            trigger={
              <Button size="sm" className="gap-1.5 shrink-0">
                <Plus className="h-4 w-4" />
                Post
              </Button>
            }
          />
        </div>
        <div className="flex gap-2">
          <SavedOpportunitiesDialog />
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/opportunity-dashboard')}>
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">My Listings</span>
          </Button>
        </div>
      </div>

      {/* Search & Skills Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search opportunities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Select value={selectedSkill} onValueChange={setSelectedSkill}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Skill" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Skills</SelectItem>
            {SKILLS_OPTIONS.map(skill => (
              <SelectItem key={skill} value={skill}>{skill}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active filter badges */}
      {(searchQuery || selectedSkill !== "all") && (
        <div className="flex gap-2 flex-wrap">
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchQuery}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
            </Badge>
          )}
          {selectedSkill !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Skill: {selectedSkill}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedSkill("all")} />
            </Badge>
          )}
        </div>
      )}

      {/* Type Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TYPE_FILTERS.map(filter => {
          const isActive = activeFilter === filter.value;
          return (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Opportunities List */}
      {!loading && opportunities.length === 0 && (
        <div className="text-center py-10">
          <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h4 className="font-semibold mb-1">No opportunities yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Be the first to post a {activeFilter === "all" ? "job or collaboration" : activeFilter}!
          </p>
          <Button onClick={() => setPostDialogOpen(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Post an Opportunity
          </Button>
        </div>
      )}

      {!loading && opportunities.map(opp => {
        const config = getTypeConfig(opp.type);
        const TypeIcon = config.icon;
        const creator = opp.created_by ? creators[opp.created_by] : null;
        const isClosingSoon = opp.created_at && differenceInDays(new Date(), parseISO(opp.created_at)) >= 14;

        return (
          <Card key={opp.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/opportunity/${opp.id}`)}>
            <CardContent className="p-3 sm:p-4">
              {/* Top row: badges */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <Badge variant="outline" className={`text-[11px] shrink-0 ${config.color}`}>
                    <TypeIcon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                  {isClosingSoon && (
                    <Badge variant="outline" className="text-[11px] shrink-0 bg-amber-500/10 text-amber-600 border-amber-500/20">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Closing Soon
                    </Badge>
                  )}
                </div>
                <BookmarkButton opportunityId={opp.id} size="sm" />
              </div>

              {/* Main content row */}
              <div className="flex gap-3">
                {/* Thumbnail */}
                {opp.image_url ? (
                  <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-muted">
                    <img src={opp.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-muted flex items-center justify-center">
                    <TypeIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <h4 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {opp.title}
                  </h4>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {opp.description}
                  </p>
                </div>
              </div>

              {/* Compensation */}
              {opp.compensation && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-[11px] bg-green-500/10 text-green-600 border-green-500/20">
                    <DollarSign className="h-3 w-3 mr-0.5" />
                    {opp.compensation}
                  </Badge>
                </div>
              )}

              {/* Meta Row */}
              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground overflow-x-auto">
                {creator && (
                  <span className="flex items-center gap-1 shrink-0">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                    <span className="truncate max-w-[100px]">{creator.full_name || "Anonymous"}</span>
                  </span>
                )}
                {opp.location && (
                  <span className="flex items-center gap-0.5 shrink-0">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[80px]">{opp.location}</span>
                  </span>
                )}
                {opp.created_at && (
                  <span className="flex items-center gap-0.5 shrink-0">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(opp.created_at), { addSuffix: true })}
                  </span>
                )}
              </div>

              {/* Skills + Apply row */}
              <div className="flex items-end justify-between gap-2 mt-2">
                {opp.skills && opp.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                    {opp.skills.slice(0, 3).map(skill => (
                      <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0 truncate max-w-[100px]">
                        {skill}
                      </Badge>
                    ))}
                    {opp.skills.length > 3 && (
                      <span className="text-[10px] text-muted-foreground self-center">+{opp.skills.length - 3}</span>
                    )}
                  </div>
                ) : (
                  <div />
                )}
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <EasyApplyButton opportunityId={opp.id} opportunityTitle={opp.title} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
