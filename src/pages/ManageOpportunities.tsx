import { useEffect, useMemo, useState } from "react";
import { CreativeLoader } from "@/components/ui/creative-loader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Briefcase, Clock, MapPin, DollarSign, Eye, Plus,
  Loader2, Users, ArrowRight, Pause, CheckCircle2, XCircle,
  Send, MoreHorizontal, Sparkles, Search, Pencil, Copy as CopyIcon,
  Share2, Filter,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/PageTransition";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  pending_count?: number;
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

const statusConfig: Record<string, { dot: string; pill: string; icon: React.ElementType; label: string }> = {
  active:  { dot: "bg-emerald-500", pill: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2, label: "Live" },
  open:    { dot: "bg-emerald-500", pill: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2, label: "Live" },
  paused:  { dot: "bg-amber-500",   pill: "bg-amber-500/10 text-amber-500 border-amber-500/20",       icon: Pause,        label: "Paused" },
  closed:  { dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground border-border",        icon: XCircle,      label: "Closed" },
  filled:  { dot: "bg-primary",    pill: "bg-primary/10 text-primary border-primary/20",          icon: Users,        label: "Filled" },
};

const appStatusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  pending: { variant: "secondary", label: "Pending" },
  reviewed: { variant: "outline", label: "Reviewed" },
  accepted: { variant: "default", label: "Accepted" },
  rejected: { variant: "destructive", label: "Not Selected" },
};

type SortKey = "newest" | "oldest" | "most_applicants" | "title";
type StatusFilter = "all" | "active" | "paused" | "closed" | "filled";

const ManageOpportunities = () => {
  const [postedGigs, setPostedGigs] = useState<PostedGig[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
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

    if (gigs.length > 0) {
      const ids = gigs.map(g => g.id);
      const { data: apps } = await supabase
        .from("applications")
        .select("opportunity_id, status")
        .in("opportunity_id", ids);
      const counts: Record<string, number> = {};
      const pending: Record<string, number> = {};
      (apps || []).forEach(a => {
        counts[a.opportunity_id] = (counts[a.opportunity_id] || 0) + 1;
        if (a.status === "pending") pending[a.opportunity_id] = (pending[a.opportunity_id] || 0) + 1;
      });
      gigs.forEach(g => {
        (g as PostedGig).applicant_count = counts[g.id] || 0;
        (g as PostedGig).pending_count = pending[g.id] || 0;
      });
    }

    setPostedGigs(gigs as PostedGig[]);
    setApplications(appsRes.data || []);
    setLoading(false);
  };

  const updateGigStatus = async (gigId: string, newStatus: string) => {
    await supabase.from("opportunities").update({ status: newStatus }).eq("id", gigId);
    setPostedGigs(prev => prev.map(g => g.id === gigId ? { ...g, status: newStatus } : g));
    toast({ title: `Gig ${statusConfig[newStatus]?.label?.toLowerCase() || "updated"}` });
  };

  const duplicateGig = async (gigId: string) => {
    const { data: orig } = await supabase.from("opportunities").select("*").eq("id", gigId).maybeSingle();
    if (!orig || !user) return;
    const { id, created_at, updated_at, ...rest } = orig as any;
    const { data: created, error } = await supabase
      .from("opportunities")
      .insert({ ...rest, title: `${orig.title} (copy)`, status: "draft", created_by: user.id })
      .select("id")
      .single();
    if (error) {
      toast({ title: "Couldn't duplicate", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Duplicated as draft" });
    if (created?.id) navigate(`/post-opportunity?edit=${created.id}`);
  };

  const shareGig = async (gigId: string, title: string) => {
    const url = `${window.location.origin}/opportunity/${gigId}`;
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied" });
  };

  const filteredGigs = useMemo(() => {
    let list = [...postedGigs];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g => g.title?.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      list = list.filter(g => {
        if (statusFilter === "active") return g.status === "active" || g.status === "open";
        return g.status === statusFilter;
      });
    }
    switch (sortBy) {
      case "oldest": list.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)); break;
      case "most_applicants": list.sort((a, b) => (b.applicant_count || 0) - (a.applicant_count || 0)); break;
      case "title": list.sort((a, b) => a.title.localeCompare(b.title)); break;
      default: list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    return list;
  }, [postedGigs, search, statusFilter, sortBy]);

  const activeGigs = filteredGigs.filter(g => g.status === "active" || g.status === "open");
  const inactiveGigs = filteredGigs.filter(g => g.status !== "active" && g.status !== "open");

  // counts for status chips (unfiltered by status, respect search)
  const counts = useMemo(() => {
    const base = search.trim()
      ? postedGigs.filter(g => g.title?.toLowerCase().includes(search.toLowerCase()))
      : postedGigs;
    return {
      all: base.length,
      active: base.filter(g => g.status === "active" || g.status === "open").length,
      paused: base.filter(g => g.status === "paused").length,
      filled: base.filter(g => g.status === "filled").length,
      closed: base.filter(g => g.status === "closed").length,
    };
  }, [postedGigs, search]);

  const totalPending = postedGigs.reduce((s, g) => s + (g.pending_count || 0), 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6"><CreativeLoader size="page" /></div>
    );
  }

  const StatusChip = ({ value, label, count }: { value: StatusFilter; label: string; count: number }) => (
    <button
      onClick={() => setStatusFilter(value)}
      className={cn(
        "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap",
        statusFilter === value
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:border-primary/40"
      )}
    >
      {label} <span className="opacity-70">·{count}</span>
    </button>
  );

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
            <p className="text-sm text-muted-foreground">
              {postedGigs.length} listing{postedGigs.length !== 1 && "s"}
              {totalPending > 0 && (
                <> · <span className="text-amber-500 font-semibold">{totalPending} new applicant{totalPending !== 1 && "s"}</span></>
              )}
            </p>
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
                {/* Search + sort */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search your gigs…"
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                    <SelectTrigger className="h-9 w-auto gap-1 text-xs px-2.5">
                      <Filter className="h-3.5 w-3.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                      <SelectItem value="most_applicants">Most applicants</SelectItem>
                      <SelectItem value="title">A → Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status chips */}
                <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
                  <StatusChip value="all" label="All" count={counts.all} />
                  <StatusChip value="active" label="Live" count={counts.active} />
                  <StatusChip value="paused" label="Paused" count={counts.paused} />
                  <StatusChip value="filled" label="Filled" count={counts.filled} />
                  <StatusChip value="closed" label="Closed" count={counts.closed} />
                </div>

                {filteredGigs.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    No gigs match these filters.
                  </div>
                ) : (
                  <>
                    {activeGigs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">
                          Live · {activeGigs.length}
                        </p>
                        {activeGigs.map(gig => (
                          <GigCard key={gig.id} gig={gig} onStatusChange={updateGigStatus} navigate={navigate} onOpenApplicants={openApplicants} onDuplicate={duplicateGig} onShare={shareGig} />
                        ))}
                      </div>
                    )}

                    {inactiveGigs.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">
                          Past · {inactiveGigs.length}
                        </p>
                        {inactiveGigs.map(gig => (
                          <GigCard key={gig.id} gig={gig} onStatusChange={updateGigStatus} navigate={navigate} onOpenApplicants={openApplicants} onDuplicate={duplicateGig} onShare={shareGig} />
                        ))}
                      </div>
                    )}
                  </>
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

// ── Gig Card ──
const GigCard = ({
  gig,
  onStatusChange,
  navigate,
  onOpenApplicants,
  onDuplicate,
  onShare,
}: {
  gig: PostedGig;
  onStatusChange: (id: string, status: string) => void;
  navigate: (path: string) => void;
  onOpenApplicants: (opportunityId: string) => void;
  onDuplicate: (id: string) => void;
  onShare: (id: string, title: string) => void;
}) => {
  const config = statusConfig[gig.status] || statusConfig.active;
  const hasPending = (gig.pending_count || 0) > 0;

  return (
    <Card className={cn("hover:bg-accent/20 transition-all", hasPending && "ring-1 ring-amber-500/30")}>
      <CardContent className="p-3 space-y-2">
        {/* Top row: status pill + title + menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border", config.pill)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
                {config.label}
              </span>
              {gig.type && (
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{gig.type}</span>
              )}
            </div>
            <p
              className="text-sm font-semibold leading-tight cursor-pointer hover:underline line-clamp-2"
              onClick={() => navigate(`/opportunity/${gig.id}`)}
            >
              {gig.title}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => navigate(`/opportunity/${gig.id}`)}>
                <Eye className="h-3.5 w-3.5 mr-2" /> View public page
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/post-opportunity?edit=${gig.id}`)}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShare(gig.id, gig.title)}>
                <Share2 className="h-3.5 w-3.5 mr-2" /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(gig.id)}>
                <CopyIcon className="h-3.5 w-3.5 mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
              {gig.status !== "filled" && (
                <DropdownMenuItem onClick={() => onStatusChange(gig.id, "filled")}>
                  <Users className="h-3.5 w-3.5 mr-2" /> Mark filled
                </DropdownMenuItem>
              )}
              {gig.status !== "closed" && (
                <DropdownMenuItem onClick={() => onStatusChange(gig.id, "closed")} className="text-destructive">
                  <XCircle className="h-3.5 w-3.5 mr-2" /> Close
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
          {gig.compensation && (
            <span className="flex items-center gap-0.5"><DollarSign className="h-3 w-3" /> {gig.compensation}</span>
          )}
          {gig.location && (
            <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {gig.location}</span>
          )}
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(gig.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Action row: applicants is the primary action */}
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/50">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="font-semibold text-foreground">{gig.applicant_count || 0}</span>
            <span>applicant{(gig.applicant_count || 0) !== 1 ? "s" : ""}</span>
            {hasPending && (
              <Badge className="ml-1 h-4 px-1.5 text-[9px] bg-amber-500/15 text-amber-500 border-amber-500/30 hover:bg-amber-500/15">
                {gig.pending_count} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onShare(gig.id, gig.title)}>
              <Share2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => navigate(`/post-opportunity?edit=${gig.id}`)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant={(gig.applicant_count || 0) > 0 ? "default" : "outline"}
              className="h-7 px-2.5 text-xs gap-1"
              onClick={() => (gig.applicant_count || 0) > 0 ? onOpenApplicants(gig.id) : navigate(`/opportunity/${gig.id}`)}
              disabled={(gig.applicant_count || 0) === 0 && gig.status === "closed"}
            >
              {(gig.applicant_count || 0) > 0 ? "Review" : "View"}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ManageOpportunities;
