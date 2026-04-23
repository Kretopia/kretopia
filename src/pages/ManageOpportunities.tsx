import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase, Clock, MapPin, DollarSign, Eye, Plus,
  Loader2, Users, ArrowRight, Pause, CheckCircle2, XCircle,
  Send, MoreHorizontal, Sparkles
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/PageTransition";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostedGig {
  id: string;
  title: string;
  status: string;
  created_at: string;
  compensation: string | null;
  location: string | null;
  type: string | null;
  applicant_count?: number;
}

interface Application {
  id: string;
  opportunity_title: string;
  opportunity_type: string;
  compensation: string;
  location: string;
  status: string;
  created_at: string;
  cover_letter: string;
  opportunity_id: string;
}

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  active: { color: "text-emerald-500", icon: CheckCircle2, label: "Active" },
  open: { color: "text-emerald-500", icon: CheckCircle2, label: "Active" },
  paused: { color: "text-amber-500", icon: Pause, label: "Paused" },
  closed: { color: "text-muted-foreground", icon: XCircle, label: "Closed" },
  filled: { color: "text-blue-500", icon: Users, label: "Filled" },
};

const appStatusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  pending: { variant: "secondary", label: "Pending" },
  reviewed: { variant: "outline", label: "Reviewed" },
  accepted: { variant: "default", label: "Accepted" },
  rejected: { variant: "destructive", label: "Not Selected" },
};

const ManageOpportunities = () => {
  const [postedGigs, setPostedGigs] = useState<PostedGig[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const openApplicants = (opportunityId: string) => {
    navigate(`/opportunity-dashboard?opportunity=${opportunityId}`);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [gigsRes, appsRes] = await Promise.all([
      // @ts-ignore – deep type instantiation
      supabase
        .from("opportunities")
        .select("id, title, status, created_at, compensation, location, type")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_applications_view")
        .select("*")
        .eq("applicant_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const gigs = gigsRes.data || [];

    // Get applicant counts
    if (gigs.length > 0) {
      const ids = gigs.map(g => g.id);
      const { data: apps } = await supabase
        .from("applications")
        .select("opportunity_id")
        .in("opportunity_id", ids);
      const counts: Record<string, number> = {};
      (apps || []).forEach(a => {
        counts[a.opportunity_id] = (counts[a.opportunity_id] || 0) + 1;
      });
      gigs.forEach(g => {
        (g as PostedGig).applicant_count = counts[g.id] || 0;
      });
    }

    setPostedGigs(gigs as PostedGig[]);
    setApplications(appsRes.data || []);
    setLoading(false);
  };

  const updateGigStatus = async (gigId: string, newStatus: string) => {
    await supabase.from("opportunities").update({ status: newStatus }).eq("id", gigId);
    setPostedGigs(prev => prev.map(g => g.id === gigId ? { ...g, status: newStatus } : g));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--mode-accent))]" />
      </div>
    );
  }

  const activeGigs = postedGigs.filter(g => g.status === "active" || g.status === "open");
  const inactiveGigs = postedGigs.filter(g => g.status !== "active" && g.status !== "open");

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-36 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b-2 border-primary/20 pb-4">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="brand-eyebrow">Your listings</p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-[-0.03em] flex items-center gap-2 leading-[1.05]">
              <Briefcase className="h-6 w-6 text-primary shrink-0" />
              <span className="min-w-0 break-words">Gig Manager</span>
            </h1>
            <p className="text-sm text-muted-foreground">Your listings and your own applications</p>
          </div>
          <Button size="sm" onClick={() => navigate("/post-opportunity")} className="gap-1.5 shrink-0">
            <Plus className="h-3.5 w-3.5" /> Post Gig
          </Button>
        </div>

        <Tabs defaultValue="listings" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="listings" className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> My Listings ({postedGigs.length})
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> My Applications ({applications.length})
            </TabsTrigger>
          </TabsList>

          {/* ── MY LISTINGS ── */}
          <TabsContent value="listings" className="mt-4 space-y-3">
            {postedGigs.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                eyebrow="No listings yet"
                title="Post your first gig"
                description="Reach thousands of vetted creators in minutes. Paid, barter, or collab — your call."
                action={{ label: "Post a Gig", icon: Plus, onClick: () => navigate("/post-opportunity") }}
                secondaryAction={{ label: "Browse examples", onClick: () => navigate("/opportunities") }}
              />
            ) : (
              <>
                {/* Active */}
                {activeGigs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Active ({activeGigs.length})</p>
                    {activeGigs.map(gig => (
                       <GigCard key={gig.id} gig={gig} onStatusChange={updateGigStatus} navigate={navigate} onOpenApplicants={openApplicants} />
                    ))}
                  </div>
                )}

                {/* Inactive */}
                {inactiveGigs.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Past ({inactiveGigs.length})</p>
                    {inactiveGigs.map(gig => (
                       <GigCard key={gig.id} gig={gig} onStatusChange={updateGigStatus} navigate={navigate} onOpenApplicants={openApplicants} />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── MY APPLICATIONS ── */}
          <TabsContent value="applications" className="mt-4 space-y-3">
            {applications.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                eyebrow="Nothing in flight"
                title="Apply to your first gig"
                description="The fastest way to land work is to send 3 strong applications today. We'll notify you the moment a poster responds."
                action={{ label: "Browse Gigs", icon: ArrowRight, onClick: () => navigate("/opportunities") }}
              />
            ) : (
              <div className="space-y-2">
                {applications.map(app => (
                  <Card
                    key={app.id}
                    className="cursor-pointer hover:bg-accent/20 transition-all"
                    onClick={() => navigate(`/opportunity/${app.opportunity_id}`)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{app.opportunity_title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {app.opportunity_type && (
                              <span className="flex items-center gap-0.5">
                                <Briefcase className="h-3 w-3" /> {app.opportunity_type}
                              </span>
                            )}
                            {app.compensation && (
                              <span className="flex items-center gap-0.5">
                                <DollarSign className="h-3 w-3" /> {app.compensation}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge variant={appStatusConfig[app.status]?.variant || "secondary"} className="text-[10px] shrink-0">
                          {appStatusConfig[app.status]?.label || app.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

// ── Gig Card Component ──
const GigCard = ({
  gig,
  onStatusChange,
  navigate,
  onOpenApplicants,
}: {
  gig: PostedGig;
  onStatusChange: (id: string, status: string) => void;
  navigate: (path: string) => void;
  onOpenApplicants: (opportunityId: string) => void;
}) => {
  const config = statusConfig[gig.status] || statusConfig.active;
  const StatusIcon = config.icon;

  return (
    <Card className="hover:bg-accent/20 transition-all">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5 shrink-0", config.color)}>
            <StatusIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p
                className="text-sm font-semibold truncate cursor-pointer hover:underline"
                onClick={() => navigate(`/opportunity/${gig.id}`)}
              >
                {gig.title}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/opportunity/${gig.id}`)}>
                    <Eye className="h-3.5 w-3.5 mr-2" /> View
                  </DropdownMenuItem>
                  {(gig.applicant_count || 0) > 0 && (
                    <DropdownMenuItem onClick={() => onOpenApplicants(gig.id)}>
                      <Users className="h-3.5 w-3.5 mr-2" /> View Applicants
                    </DropdownMenuItem>
                  )}
                  {(gig.status === "active" || gig.status === "open") && (
                    <DropdownMenuItem onClick={() => onStatusChange(gig.id, "paused")}>
                      <Pause className="h-3.5 w-3.5 mr-2" /> Pause
                    </DropdownMenuItem>
                  )}
                  {gig.status === "paused" && (
                    <DropdownMenuItem onClick={() => onStatusChange(gig.id, "active")}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Reactivate
                    </DropdownMenuItem>
                  )}
                  {gig.status !== "closed" && (
                    <DropdownMenuItem onClick={() => onStatusChange(gig.id, "closed")}>
                      <XCircle className="h-3.5 w-3.5 mr-2" /> Close
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
              {gig.compensation && (
                <span className="flex items-center gap-0.5">
                  <DollarSign className="h-3 w-3" /> {gig.compensation}
                </span>
              )}
              {gig.location && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" /> {gig.location}
                </span>
              )}
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(gig.created_at), { addSuffix: true })}
              </span>
            </div>

            {(gig.applicant_count || 0) > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 mt-1.5 text-xs gap-1 text-[hsl(var(--mode-accent))] px-1.5"
                onClick={() => onOpenApplicants(gig.id)}
              >
                <Users className="h-3 w-3" /> View {gig.applicant_count} applicant{gig.applicant_count !== 1 ? "s" : ""}
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ManageOpportunities;
