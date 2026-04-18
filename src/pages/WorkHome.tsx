import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  FolderKanban, Briefcase, DollarSign, ArrowRight, Plus,
  Clock, CheckCircle2, Loader2,
  Building2, Users, UserSearch, Star, Wallet
} from "lucide-react";
import { CrossModeNudge } from "@/components/CrossModeNudge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { CreateProjectDialog } from "@/components/project/CreateProjectDialog";
import { PageTransition } from "@/components/PageTransition";
import { PageHeader } from "@/components/ui/page-header";

interface WidgetProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  action?: { label: string; path: string };
  className?: string;
}

const Widget = ({ title, icon: Icon, children, action, className }: WidgetProps) => {
  const navigate = useNavigate();
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[hsl(var(--mode-accent))]" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {action && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => navigate(action.path)}>
            {action.label} <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
      <CardContent className="px-4 pb-4 pt-1">{children}</CardContent>
    </Card>
  );
};

// ── Brand/Company Dashboard ──────────────────────────────────
const BrandWorkHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [applicantCounts, setApplicantCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({ posted: 0, active: 0, hired: 0, avgRating: 0 });
  const [showCreateProject, setShowCreateProject] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      // Fetch opportunities
      const { data: opps } = await supabase
        .from("opportunities")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setOpportunities(opps || []);

      // Get applicant counts per opportunity
      if (opps && opps.length > 0) {
        const oppIds = opps.map(o => o.id);
        const { data: apps } = await supabase
          .from("applications")
          .select("opportunity_id")
          .in("opportunity_id", oppIds);
        
        const counts: Record<string, number> = {};
        (apps || []).forEach(a => {
          counts[a.opportunity_id] = (counts[a.opportunity_id] || 0) + 1;
        });
        setApplicantCounts(counts);
      }

      // Stats
      const { count: totalPosted } = await supabase
        .from("opportunities")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id);

      const { count: activeCount } = await supabase
        .from("opportunities")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .eq("status", "active");

      // Hired count
      const { data: userOpps } = await supabase
        .from("opportunities")
        .select("id")
        .eq("created_by", user.id);
      
      let hiredCount = 0;
      if (userOpps && userOpps.length > 0) {
        const ids = userOpps.map(o => o.id);
        const { count } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .in("opportunity_id", ids)
          .eq("status", "accepted");
        hiredCount = count || 0;
      }

      // Average rating
      const { data: reviewData } = await supabase
        .from("company_reviews")
        .select("rating")
        .eq("company_id", user.id);
      const avgRating = reviewData && reviewData.length > 0
        ? reviewData.reduce((sum, r) => sum + r.rating, 0) / reviewData.length
        : 0;

      setStats({
        posted: totalPosted || 0,
        active: activeCount || 0,
        hired: hiredCount,
        avgRating,
      });

      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--mode-accent))]" />
      </div>
    );
  }

  const activeOpps = opportunities.filter(o => o.status === "active" || o.status === "open");
  const closedOpps = opportunities.filter(o => o.status !== "active" && o.status !== "open");

  return (
    <PageTransition>
      <Helmet>
        <title>Hiring Dashboard | ThriveIN</title>
        <meta name="description" content="Manage your talent pipeline — post gigs, review applicants, and hire creators." />
      </Helmet>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24 space-y-4">
        <PageHeader
          eyebrow="Hiring HQ"
          title="Find, hire & manage talent"
          subtitle="Your command center for creative recruitment."
          icon={Building2}
          size="sm"
        />

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-3 text-center cursor-pointer hover:border-energy/40 hover:bg-accent/30 transition-all" onClick={() => navigate("/manage-opportunities")}>
            <p className="text-xl font-black tracking-tight">{stats.posted}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Posted</p>
          </Card>
          <Card className="p-3 text-center cursor-pointer hover:border-energy/40 hover:bg-accent/30 transition-all" onClick={() => navigate("/manage-opportunities")}>
            <p className="text-xl font-black tracking-tight text-energy">{stats.active}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Active</p>
          </Card>
          <Card className="p-3 text-center cursor-pointer hover:border-energy/40 hover:bg-accent/30 transition-all">
            <p className="text-xl font-black tracking-tight">{stats.hired}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Hired</p>
          </Card>
          <Card className="p-3 text-center cursor-pointer hover:border-energy/40 hover:bg-accent/30 transition-all">
            <p className="text-xl font-black tracking-tight flex items-center justify-center gap-0.5">
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
              {stats.avgRating > 0 && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Rating</p>
          </Card>
        </div>

        {/* Active Listings */}
        <Widget title="Active Listings" icon={Briefcase} action={{ label: "Manage", path: "/manage-opportunities" }}>
          {activeOpps.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm font-medium mb-1">Post your first opportunity</p>
              <p className="text-xs text-muted-foreground mb-3">Attract top creative talent by posting a gig or job listing.</p>
              <Button size="sm" onClick={() => navigate("/post-opportunity")} className="gap-1">
                <Plus className="h-3 w-3" /> Post a Gig
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {activeOpps.slice(0, 5).map((opp) => (
                <div
                  key={opp.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 cursor-pointer transition-all"
                  onClick={() => navigate(`/opportunity/${opp.id}`)}
                >
                  <Briefcase className="h-3.5 w-3.5 text-[hsl(var(--mode-accent))] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium truncate block">{opp.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(opp.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {applicantCounts[opp.id] > 0 && (
                      <Badge variant="secondary" className="text-[10px] gap-0.5">
                        <Users className="h-2.5 w-2.5" /> {applicantCounts[opp.id]}
                      </Badge>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Widget>

        {/* Find Talent CTA */}
        <Card 
          className="p-4 cursor-pointer hover:border-primary/30 transition-all bg-gradient-to-r from-primary/5 to-accent/5 border-primary/10"
          onClick={() => navigate("/talent-finder")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <UserSearch className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Find Talent</p>
              <p className="text-xs text-muted-foreground">Describe what you need — paid or barter — AI matches you instantly</p>
            </div>
            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
          </div>
        </Card>

        {/* Past Listings */}
        {closedOpps.length > 0 && (
          <Widget title="Past Listings" icon={Clock} action={{ label: "All", path: "/manage-opportunities" }}>
            <div className="space-y-2">
              {closedOpps.slice(0, 3).map((opp) => (
                <div
                  key={opp.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 cursor-pointer transition-all opacity-70"
                  onClick={() => navigate(`/opportunity/${opp.id}`)}
                >
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate flex-1">{opp.title}</span>
                  <Badge variant="secondary" className="text-[10px] capitalize">{opp.status}</Badge>
                </div>
              ))}
            </div>
          </Widget>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate("/post-opportunity")}>
            <Briefcase className="h-4 w-4" />
            <span className="text-xs">Post a Gig</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate("/talent-finder")}>
            <UserSearch className="h-4 w-4" />
            <span className="text-xs">Find Talent</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate("/thrivepay")}>
            <DollarSign className="h-4 w-4" />
            <span className="text-xs">Payments</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate("/profile")}>
            <Building2 className="h-4 w-4" />
            <span className="text-xs">Company Page</span>
          </Button>
        </div>
      </div>

      <CreateProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onSuccess={() => setShowCreateProject(false)}
      />
    </PageTransition>
  );
};

// ── Individual Creator Dashboard ──────────────────────────────
const CreatorWorkHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [gigs, setGigs] = useState<any[]>([]);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [pendingMilestones, setPendingMilestones] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [earnings, setEarnings] = useState({ pending: 0, total: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [projRes, gigsRes, msRes, invoicesRes] = await Promise.all([
        supabase.from("projects").select("*").order("updated_at", { ascending: false }).limit(20),
        // @ts-ignore – deep type instantiation
        supabase.from("opportunities").select("id, title, status, created_at, compensation").eq("created_by", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("milestones").select("id", { count: "exact", head: true }).eq("status", "pending"),
        // @ts-ignore – deep type instantiation
        supabase.from("invoices").select("amount, status, currency").eq("user_id", user.id),
      ]);
      setProjects(projRes.data || []);
      setGigs(gigsRes.data || []);
      setPendingMilestones(msRes.count || 0);

      // Calculate earnings
      const invoices = invoicesRes.data || [];
      const pendingAmount = invoices.filter((i: any) => i.status === "pending" || i.status === "sent").reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
      const totalAmount = invoices.filter((i: any) => i.status === "paid").reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
      setEarnings({ pending: pendingAmount, total: totalAmount });

      // Build recent activity from projects
      const allProjects = projRes.data || [];
      const activity = allProjects
        .slice(0, 5)
        .map((p: any) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          time: p.updated_at,
        }));
      setRecentActivity(activity);

      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--mode-accent))]" />
      </div>
    );
  }

  const activeProjects = projects.filter(p => p.status === "active");
  const completedProjects = projects.filter(p => p.status === "completed" || p.status === "archived");
  const activeGigs = gigs.filter(g => g.status === "active" || g.status === "open");

  return (
    <PageTransition>
      <Helmet>
        <title>Creative HQ | ThriveIN</title>
        <meta name="description" content="Your creative business command center — projects, gigs, payments, and tools all in one place." />
      </Helmet>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-36 space-y-4">
        <PageHeader
          eyebrow="Creative HQ"
          title="Your business, in focus"
          subtitle="Projects, gigs, and payments — all in one command center."
          icon={FolderKanban}
          size="sm"
          actions={<CrossModeNudge targetMode="create" label="Switch to Explore →" targetPath="/scene" />}
        />

        {/* At-a-glance stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center cursor-pointer hover:border-energy/40 hover:bg-accent/30 transition-all" onClick={() => navigate("/desk/projects")}>
            <p className="text-2xl font-black tracking-tight text-energy">{activeProjects.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Active</p>
          </Card>
          <Card className="p-3 text-center cursor-pointer hover:border-energy/40 hover:bg-accent/30 transition-all" onClick={() => navigate("/manage-opportunities")}>
            <p className="text-2xl font-black tracking-tight">{activeGigs.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Open Gigs</p>
          </Card>
          <Card className="p-3 text-center cursor-pointer hover:border-energy/40 hover:bg-accent/30 transition-all" onClick={() => navigate("/thrivepay")}>
            <p className="text-2xl font-black tracking-tight">{pendingMilestones}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Pending</p>
          </Card>
        </div>

        {/* Active Projects */}
        <Widget title="Active Projects" icon={FolderKanban} action={{ label: "All", path: "/desk/projects" }}>
          {activeProjects.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm font-medium mb-1">Start your first workspace</p>
              <p className="text-xs text-muted-foreground mb-3">Manage any creative project — freelance gigs, client work, or personal projects.</p>
              <Button size="sm" onClick={() => setShowCreateProject(true)} className="gap-1">
                <Plus className="h-3 w-3" /> Create Workspace
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {activeProjects.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 cursor-pointer transition-all" onClick={() => navigate(`/desk/${p.id}`)}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  <span className="text-sm font-medium truncate flex-1">{p.title}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Widget>

        {/* Your Gigs - summary only, manage is on the Gigs tab */}
        <Widget title="Your Gigs" icon={Briefcase}>
          {activeGigs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">No open gig listings</p>
          ) : (
            <div className="space-y-2">
              {activeGigs.slice(0, 3).map((g) => (
                <div key={g.id} className="flex flex-col gap-1 p-2.5 rounded-lg hover:bg-accent/30 cursor-pointer transition-all" onClick={() => navigate(`/opportunity/${g.id}`)}>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-[hsl(var(--mode-accent))] shrink-0" />
                    <span className="text-sm font-medium truncate">{g.title}</span>
                  </div>
                  {g.compensation && (
                    <p className="text-[10px] text-muted-foreground truncate pl-5.5">{g.compensation}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Widget>

        {/* ThrivePay Glance */}
        <Widget title="ThrivePay" icon={Wallet} action={{ label: "Details", path: "/thrivepay" }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 rounded-lg bg-accent/20">
              <p className="text-lg font-bold">${earnings.pending.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-accent/20">
              <p className="text-lg font-bold">${earnings.total.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Earned</p>
            </div>
          </div>
        </Widget>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <Widget title="Recent Activity" icon={Clock}>
            <div className="space-y-2">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 cursor-pointer transition-all" onClick={() => navigate(`/desk/${a.id}`)}>
                  <div className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    a.status === "active" ? "bg-success" : "bg-muted-foreground"
                  )} />
                  <span className="text-sm truncate flex-1">{a.title}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(a.time), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </Widget>
        )}

        {/* Completed Projects */}
        {completedProjects.length > 0 && (
          <Widget title="Past Projects" icon={CheckCircle2} action={{ label: "All", path: "/desk/projects" }}>
            <div className="space-y-2">
              {completedProjects.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 cursor-pointer transition-all opacity-70" onClick={() => navigate(`/desk/${p.id}`)}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate flex-1">{p.title}</span>
                  <Badge variant="secondary" className="text-[10px]">Completed</Badge>
                </div>
              ))}
            </div>
          </Widget>
        )}
      </div>

      <CreateProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onSuccess={() => setShowCreateProject(false)}
      />
    </PageTransition>
  );
};

// ── Main WorkHome — routes to correct dashboard ──────────────
const WorkHome = () => {
  const { user } = useAuth();
  const [accountType, setAccountType] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    supabase
      .from("profiles")
      .select("account_type")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setAccountType(data?.account_type || "individual");
        setChecking(false);
      });
  }, [user]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--mode-accent))]" />
      </div>
    );
  }

  if (accountType === "company") return <BrandWorkHome />;
  return <CreatorWorkHome />;
};

export default WorkHome;
