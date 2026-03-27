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
import GigCard, { type GigCreatorProfile } from "@/components/opportunity/GigCard";
import { 
  Briefcase, Handshake, ArrowRightLeft,
  Plus, Sparkles, Zap, Target, GraduationCap, X,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BookmarkButton } from "@/components/opportunity/BookmarkButton";
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
}

// Use shared GigCreatorProfile from GigCard

const TYPE_FILTERS = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "barter", label: "🔄 Barter", icon: ArrowRightLeft },
  { value: "job", label: "💼 Paid", icon: Briefcase },
  { value: "collab", label: "🤝 Collabs", icon: Handshake },
  { value: "gig", label: "⚡ Gigs", icon: Zap },
  { value: "project", label: "🎯 Projects", icon: Target },
  { value: "internship", label: "🎓 Learn", icon: GraduationCap },
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
  }, [activeFilter, searchQuery, selectedSkill]);

  useEffect(() => { fetchOpportunities(); }, [fetchOpportunities]);

  const getTypeConfig = (type: string) => TYPE_CONFIG[type] || TYPE_CONFIG.job;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2.5">
              <Briefcase className="h-6 w-6" />
              Gigs
            </h1>
            <p className="text-sm text-muted-foreground">
              Jobs, barters, collabs & creative work
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
        <div className="text-center py-10">
          <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h4 className="font-semibold mb-1">No gigs posted yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Be the first to post a {activeFilter === "all" ? "gig or barter" : activeFilter}!
          </p>
          <Button onClick={() => setPostDialogOpen(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Post a Gig
          </Button>
        </div>
      )}

      {/* Cards */}
      {!loading && opportunities.map((opp, index) => {
        const config = getTypeConfig(opp.type);
        const TypeIcon = config.icon;
        const creator = opp.created_by ? creators[opp.created_by] : null;
        const isClosingSoon = opp.created_at && differenceInDays(new Date(), parseISO(opp.created_at)) >= 14;
        const isBarter = opp.type === "barter";

        return (
          <DiscoveryGate key={opp.id} totalItems={opportunities.length} freePreviewCount={4} index={index} itemLabel="gigs">
          <Card
            key={opp.id}
            className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer group ${
              isBarter ? "border-purple-500/20" : ""
            }`}
            onClick={() => navigate(`/opportunity/${opp.id}`)}
          >
            <CardContent className="p-0">
              {/* Barter Exchange Banner */}
              {isBarter && (opp.barter_offering || opp.barter_requesting) && (
                <div className="px-3 py-2 bg-purple-500/5 border-b border-purple-500/10">
                  <div className="flex items-center gap-2 text-xs">
                    <Gift className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                    <span className="font-medium text-purple-700 dark:text-purple-300 truncate">
                      {opp.barter_offering || "Trade offer"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-purple-400 shrink-0" />
                    <span className="text-purple-600 dark:text-purple-400 truncate">
                      {opp.barter_requesting || "Content needed"}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-3 sm:p-4">
                {/* Top row: badges */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <Badge variant="outline" className={`text-[11px] shrink-0 ${config.bgColor} ${config.color}`}>
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                    {isClosingSoon && (
                      <Badge variant="outline" className="text-[11px] shrink-0 bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Closing Soon
                      </Badge>
                    )}
                    {isBarter && opp.min_followers && (
                      <Badge variant="outline" className="text-[11px] shrink-0 bg-muted text-muted-foreground">
                        {opp.min_followers >= 1000 ? `${(opp.min_followers / 1000).toFixed(0)}k+` : `${opp.min_followers}+`} followers
                      </Badge>
                    )}
                  </div>
                  <BookmarkButton opportunityId={opp.id} size="sm" />
                </div>

                {/* Main content row */}
                <div className="flex gap-3">
                  {opp.image_url ? (
                    <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-muted">
                      <img src={opp.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center ${
                      isBarter ? "bg-purple-500/10" : "bg-muted"
                    }`}>
                      <TypeIcon className={`h-5 w-5 ${isBarter ? "text-purple-500" : "text-muted-foreground"}`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                      {opp.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {opp.description}
                    </p>
                  </div>
                </div>

                {/* Compensation / Barter value */}
                {opp.compensation && !isBarter && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[11px] bg-green-500/10 text-green-600 border-green-500/20">
                      <DollarSign className="h-3 w-3 mr-0.5" />
                      {opp.compensation}
                    </Badge>
                    {(opp.type === "job" || opp.type === "gig" || opp.type === "project") && (
                      <Badge variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/20 gap-0.5">
                        <Shield className="h-3 w-3" />
                        Escrow Protected
                      </Badge>
                    )}
                  </div>
                )}

                {/* Platform badges for barter */}
                {isBarter && opp.platform_requirements && opp.platform_requirements.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {opp.platform_requirements.map(p => (
                      <Badge key={p} variant="outline" className="text-[10px] capitalize">
                        {p}
                      </Badge>
                    ))}
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

                {/* Skills + Apply */}
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
                  ) : <div />}
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <EasyApplyButton opportunityId={opp.id} opportunityTitle={opp.title} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </DiscoveryGate>
        );
      })}
      {!loading && <DiscoveryUpsell totalItems={opportunities.length} freePreviewCount={4} itemLabel="gigs" />}
    </div>
  );
};
