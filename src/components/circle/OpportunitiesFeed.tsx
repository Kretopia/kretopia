import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PostOpportunityDialog } from "@/components/PostOpportunityDialog";
import { 
  Briefcase, Handshake, ArrowRightLeft, MapPin, Clock, 
  DollarSign, Plus, ChevronRight, Sparkles, User, ShieldCheck, AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, differenceInDays, parseISO } from "date-fns";

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
  { value: "job", label: "Jobs", icon: Briefcase },
  { value: "collab", label: "Collabs", icon: Handshake },
  { value: "barter", label: "Barter", icon: ArrowRightLeft },
] as const;

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Briefcase }> = {
  job: { label: "Paid Job", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: Briefcase },
  collab: { label: "Collaboration", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Handshake },
  collaboration: { label: "Collaboration", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Handshake },
  barter: { label: "Barter/Trade", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: ArrowRightLeft },
  internship: { label: "Internship", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: Briefcase },
};

export const OpportunitiesFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [creators, setCreators] = useState<Record<string, CreatorProfile>>({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
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
        // Handle both "collab" and "collaboration" type values
        if (activeFilter === "collab") {
          query = query.in("type", ["collab", "collaboration"]);
        } else {
          query = query.eq("type", activeFilter);
        }
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
  }, [activeFilter]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const getTypeConfig = (type: string) => {
    return TYPE_CONFIG[type] || TYPE_CONFIG.job;
  };

  return (
    <div className="space-y-4">
      {/* Header with Post CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Opportunities</h3>
          <p className="text-sm text-muted-foreground">Jobs, collabs & barter from the community</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/opportunity-dashboard')}>
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">My Listings</span>
          </Button>
          <PostOpportunityDialog
            open={postDialogOpen}
            onOpenChange={setPostDialogOpen}
            onSuccess={() => {
              setPostDialogOpen(false);
              fetchOpportunities();
            }}
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Post
              </Button>
            }
          />
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TYPE_FILTERS.map(filter => {
          const Icon = filter.icon;
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
              <Icon className="h-3.5 w-3.5" />
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

        return (
          <Card key={opp.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/opportunity/${opp.id}`)}>
            <CardContent className="p-4">
              <div className="flex gap-3">
                {/* Image or Icon */}
                {opp.image_url ? (
                  <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
                    <img src={opp.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="shrink-0 w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                    <TypeIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {/* Type Badge + Trust Badges */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${config.color}`}>
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                    {opp.compensation && (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        <DollarSign className="h-3 w-3" />
                        {opp.compensation}
                      </Badge>
                    )}
                    {opp.created_at && differenceInDays(new Date(), parseISO(opp.created_at)) >= 14 && (
                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Closing Soon
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                    {opp.title}
                  </h4>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {opp.description}
                  </p>

                  {/* Meta Row */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {creator && (
                      <span className="flex items-center gap-1">
                        {creator.avatar_url ? (
                          <img src={creator.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        {creator.full_name || "Anonymous"}
                      </span>
                    )}
                    {opp.location && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {opp.location}
                      </span>
                    )}
                    {opp.created_at && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(opp.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>

                  {/* Skills */}
                  {opp.skills && opp.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 max-h-8 overflow-hidden">
                      {opp.skills.slice(0, 3).map(skill => (
                        <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0 truncate max-w-[120px]">
                          {skill}
                        </Badge>
                      ))}
                      {opp.skills.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{opp.skills.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
