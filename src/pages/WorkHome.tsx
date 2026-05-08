import { useState, useEffect } from "react";
import { CreativeLoader } from "@/components/ui/creative-loader";

// Lightweight skeleton used while WorkHome variants load — avoids the
// "black screen" flash from the full-page CreativeLoader.
const WorkHomeSkeleton = ({ variant = "studio" }: { variant?: "studio" | "hiring" | "shell" }) => (
  <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-6">
    <div className="space-y-2">
      <div className="h-3 w-24 rounded bg-muted animate-pulse" />
      <div className="h-7 w-56 rounded bg-muted animate-pulse" />
      <div className="h-4 w-40 rounded bg-muted animate-pulse" />
    </div>
    {variant !== "shell" && (
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[78px] min-w-[136px] flex-1 rounded-xl bg-muted animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    )}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: variant === "hiring" ? 3 : 4 }).map((_, i) => (
        <div
          key={i}
          className="h-44 rounded-2xl bg-muted animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  </div>
);
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  FolderKanban, Briefcase, DollarSign, ArrowRight, Plus, Mic,
  Clock, Loader2,
  Building2, Users, UserSearch, Star,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { VoiceFirstCreateModal } from "@/components/project/studio/VoiceFirstCreateModal";
import { StudioCardsGrid } from "@/components/project/studio/StudioCardsGrid";
import { TodayStrip } from "@/components/desk/TodayStrip";
import { DeskCommandPalette } from "@/components/desk/DeskCommandPalette";
import { VoiceCommandSheet } from "@/components/desk/VoiceCommandSheet";
import { WrapMyWeekSheet } from "@/components/desk/WrapMyWeekSheet";
import { MyPendingInvitations } from "@/components/project/MyPendingInvitations";
import { PageTransition } from "@/components/PageTransition";
import { PageHeader } from "@/components/ui/page-header";
import { CopilotLauncher } from "@/components/agent/CopilotLauncher";

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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [voiceCmdOpen, setVoiceCmdOpen] = useState(false);
  const [wrapWeekOpen, setWrapWeekOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data: opps } = await supabase
        .from("opportunities")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setOpportunities(opps || []);

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

      const { count: totalPosted } = await supabase
        .from("opportunities")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id);
      const { count: activeCount } = await supabase
        .from("opportunities")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .eq("status", "active");

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
    return <WorkHomeSkeleton variant="hiring" />;
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

        <TodayStrip
          onVoice={() => setVoiceCmdOpen(true)}
          onCommandPalette={() => setPaletteOpen(true)}
          onWrapWeek={() => setWrapWeekOpen(true)}
        />

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
              <p className="text-xs text-muted-foreground">Describe what you need — paid or barter — Smart Match finds them instantly</p>
            </div>
            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
          </div>
        </Card>

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

      <VoiceFirstCreateModal
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onCreated={() => setShowCreateProject(false)}
      />
      <DeskCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onVoiceCreate={() => setShowCreateProject(true)}
        onVoiceCommand={() => setVoiceCmdOpen(true)}
      />
      <VoiceCommandSheet open={voiceCmdOpen} onOpenChange={setVoiceCmdOpen} />
      <WrapMyWeekSheet open={wrapWeekOpen} onOpenChange={setWrapWeekOpen} />
    </PageTransition>
  );
};

// ── Individual Creator Dashboard — Studio-first ──────────────
const CreatorWorkHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [invoicesByProject, setInvoicesByProject] = useState<
    Record<string, "paid" | "invoiced" | "unsent">
  >({});
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [voiceCmdOpen, setVoiceCmdOpen] = useState(false);
  const [wrapWeekOpen, setWrapWeekOpen] = useState(false);

  const fetchProjects = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });
      const list = projectsData || [];
      setProjects(list);

      if (list.length) {
        const ids = list.map((p) => p.id);
        const { data: invs } = await (supabase as any)
          .from("invoices")
          .select("project_id, status")
          .in("project_id", ids);
        const map: Record<string, "paid" | "invoiced" | "unsent"> = {};
        for (const id of ids) map[id] = "unsent";
        for (const row of invs || []) {
          const cur = map[row.project_id];
          if (row.status === "paid") map[row.project_id] = "paid";
          else if (cur !== "paid") map[row.project_id] = "invoiced";
        }
        setInvoicesByProject(map);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6"><CreativeLoader size="page" /></div>
    );
  }

  const activeProjects = projects.filter(p => p.status === "active");
  const completedProjects = projects.filter(p => p.status === "completed" || p.status === "archived");

  return (
    <PageTransition>
      <Helmet>
        <title>ThriveDesk | ThriveIN</title>
        <meta name="description" content="ThriveDesk — your studio rooms. Voice-first project management for creatives." />
      </Helmet>

      {/* Wider on desktop, capped for readability */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-36 md:pb-12 space-y-5">
        {/* Hero header */}
        <div className="border-b-2 border-primary/20 pb-4">
          <p className="brand-eyebrow mb-2">Projects & Workspaces</p>
          <div className="flex items-center gap-3 flex-wrap">
            <FolderKanban className="h-9 w-9 md:h-10 md:w-10 text-primary shrink-0" strokeWidth={2.5} />
            <h1 className="text-3xl md:text-5xl font-black tracking-[-0.04em] leading-none">ThriveDesk</h1>
            {activeProjects.length > 0 && (
              <Badge className="bg-energy text-energy-foreground hover:bg-energy gap-1 font-bold border-0">
                {activeProjects.length} Active
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                onClick={() => setShowCreateProject(true)}
                size="sm"
                className="gap-1.5 rounded-full font-semibold"
              >
                <Plus className="h-4 w-4" />
                <span>New project</span>
              </Button>
              <CopilotLauncher
                label="Ask Copilot"
                prompt="What's the most useful thing I can do across my projects today?"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Built for creatives. Save time — use your voice.
            <span className="hidden md:inline"> · Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono ml-1">⌘K</kbd> to jump anywhere</span>
          </p>
        </div>

        {/* Today Strip — what needs me right now */}
        <TodayStrip
          onVoice={() => setVoiceCmdOpen(true)}
          onCommandPalette={() => setPaletteOpen(true)}
          onWrapWeek={() => setWrapWeekOpen(true)}
        />

        {/* Pending invites */}
        <MyPendingInvitations />

        {/* Studio rooms grid */}
        {projects.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <h2 className="text-base font-bold">Your studio rooms</h2>
              <span className="text-xs text-muted-foreground">
                {activeProjects.length} in progress · {completedProjects.length} delivered
              </span>
            </div>
          </div>
        )}

        <StudioCardsGrid
          projects={projects as any}
          invoicesByProject={invoicesByProject}
          onNewProject={() => setShowCreateProject(true)}
        />
      </div>

      {/* Voice-first create */}
      <VoiceFirstCreateModal
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onCreated={() => {
          setShowCreateProject(false);
          fetchProjects();
        }}
      />

      {/* Command palette + voice command */}
      <DeskCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onVoiceCreate={() => setShowCreateProject(true)}
        onVoiceCommand={() => setVoiceCmdOpen(true)}
      />
      <VoiceCommandSheet open={voiceCmdOpen} onOpenChange={setVoiceCmdOpen} />
      <WrapMyWeekSheet open={wrapWeekOpen} onOpenChange={setWrapWeekOpen} />
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
      <div className="min-h-screen flex items-center justify-center px-6"><CreativeLoader size="page" /></div>
    );
  }

  if (accountType === "company") return <BrandWorkHome />;
  return <CreatorWorkHome />;
};

export default WorkHome;
