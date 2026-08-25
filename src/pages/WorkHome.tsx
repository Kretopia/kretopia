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
  Briefcase, DollarSign, ArrowRight, Plus, Mic,
  Clock, Loader2, ChevronLeft, Folder, Inbox,
  Building2, Users, UserSearch, Star,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { VoiceFirstCreateModal } from "@/components/project/studio/VoiceFirstCreateModal";
import { StudioCardsGrid } from "@/components/project/studio/StudioCardsGrid";
import { LooseProjectsCarousel } from "@/components/project/studio/LooseProjectsCarousel";
import { StudioFoldersBar, type StudioFolder } from "@/components/project/studio/StudioFoldersBar";
import { toast } from "sonner";
import { TodayStrip } from "@/components/desk/TodayStrip";
import { DeskCommandPalette } from "@/components/desk/DeskCommandPalette";
import { VoiceCommandSheet } from "@/components/desk/VoiceCommandSheet";
import { WrapMyWeekSheet } from "@/components/desk/WrapMyWeekSheet";
import { MyPendingInvitations } from "@/components/project/MyPendingInvitations";
import { PageTransition } from "@/components/PageTransition";
import { SectionCard } from "@/components/ui/section-card";
import { SoundStagesRail } from "@/components/circle/SoundStagesRail";
import { SpeedTonightCard } from "@/components/home/SpeedTonightCard";
import { CastingCallsRail } from "@/components/opportunity/CastingCallsRail";
import { RecentRecordingsRail } from "@/components/calls/RecentRecordingsRail";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import { CarouselPositionDots } from "@/components/ui/glass/CarouselPositionDots";
import { FeaturePageHeader } from "@/components/features/FeaturePageHeader";
import { KretoTip } from "@/components/agent/KretoTip";
import { STUDIO_TUTORIAL, STUDIO_BRAND_TUTORIAL } from "@/components/landing/kretopia/tutorialContent";

interface ProjectPersonRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  collaborator_status: string | null;
}

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
        <title>Studios | Kretopia</title>
        <meta name="description" content="Your hiring command center — post gigs, review applicants, and hire creators." />
      </Helmet>

      <FeaturePageHeader
        eyebrow="Hiring HQ"
        title="Studios."
        accentTitle="Your hiring command center."
        subtitle="Post, review applicants, find talent and track every hire — all in one room, same as a creator's Studio."
        tutorial={{ featureKey: "studio-brand", label: "How Studios works for Brands", steps: STUDIO_BRAND_TUTORIAL }}
      />

      {/* Wider on desktop, capped for readability — same treatment as the
          creator Studios dashboard, so a Brand's Desk genuinely spans the
          page as a real dashboard instead of a narrow single-column stack. */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-24 md:pb-12 space-y-5">
        <TodayStrip
          onVoice={() => setVoiceCmdOpen(true)}
          onCommandPalette={() => setPaletteOpen(true)}
          onWrapWeek={() => setWrapWeekOpen(true)}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <Card className="p-3 md:p-4 text-center cursor-pointer hover:border-energy/40 hover:bg-accent/30 transition-all" onClick={() => navigate("/manage-opportunities")}>
            <p className="text-xl md:text-2xl font-black tracking-tight">{stats.posted}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Posted</p>
          </Card>
          <Card className="p-3 md:p-4 text-center cursor-pointer hover:border-energy/40 hover:bg-accent/30 transition-all" onClick={() => navigate("/manage-opportunities")}>
            <p className="text-xl md:text-2xl font-black tracking-tight text-energy">{stats.active}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Active</p>
          </Card>
          <Card className="p-3 md:p-4 text-center cursor-pointer hover:border-energy/40 hover:bg-accent/30 transition-all">
            <p className="text-xl md:text-2xl font-black tracking-tight">{stats.hired}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Hired</p>
          </Card>
          <Card className="p-3 md:p-4 text-center cursor-pointer hover:border-energy/40 hover:bg-accent/30 transition-all">
            <p className="text-xl md:text-2xl font-black tracking-tight flex items-center justify-center gap-0.5">
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
              {stats.avgRating > 0 && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Rating</p>
          </Card>
        </div>

        {/* Two-column dashboard body on desktop — listings get the wide
            column since they're the thing a Brand actually scans, Find
            Talent + quick actions sit in a persistent side rail instead of
            competing for the same vertical stack. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-5">
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
          </div>

          <div className="space-y-5">
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

            <div className="grid grid-cols-2 gap-3">
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
  const [folders, setFolders] = useState<StudioFolder[]>([]);
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [recentCollaborators, setRecentCollaborators] = useState<
    { id: string; full_name: string; avatar_url: string | null; role: string | null }[]
  >([]);
  const [collabApi, setCollabApi] = useState<CarouselApi>();
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const fetchFolders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("studio_folders")
      .select("id, name, color, sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setFolders((data as StudioFolder[]) || []);
  };

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
    fetchFolders().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Recent collaborators across the user's most recently active projects.
  // Reuses the existing get_project_people RPC (same one useProjectData
  // calls for a single project) rather than adding a new aggregate query
  // or RPC -- just runs it over a few projects and dedupes client-side.
  useEffect(() => {
    if (!user || projects.length === 0) return;
    let cancelled = false;
    (async () => {
      const topProjects = projects.slice(0, 5);
      const results = await Promise.all(
        topProjects.map((p) =>
          supabase
            .rpc("get_project_people" as any, { _project_id: p.id })
            .then(
              ({ data }) => (data ?? []) as ProjectPersonRow[],
              () => [] as ProjectPersonRow[]
            )
        )
      );
      if (cancelled) return;
      const seen = new Set<string>();
      const people: { id: string; full_name: string; avatar_url: string | null; role: string | null }[] = [];
      for (const rows of results) {
        for (const p of rows) {
          if (p.collaborator_status !== "accepted") continue;
          if (p.user_id === user.id) continue;
          if (seen.has(p.user_id)) continue;
          seen.add(p.user_id);
          people.push({ id: p.user_id, full_name: p.full_name || "Member", avatar_url: p.avatar_url, role: p.role });
        }
      }
      setRecentCollaborators(people.slice(0, 10));
    })();
    return () => { cancelled = true; };
  }, [user, projects]);

  if (loading) {
    return <WorkHomeSkeleton variant="studio" />;
  }

  const activeProjects = projects.filter(p => p.status === "active");
  const completedProjects = projects.filter(p => p.status === "completed" || p.status === "archived");

  const folderCounts = (() => {
    const counts: Record<string, number> = { unfiled: 0 };
    for (const p of projects) {
      const key = (p as any).studio_folder_id || "unfiled";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  })();

  const visibleProjects = projects.filter((p) => {
    if (folderFilter === "all") return true;
    if (folderFilter === "unfiled") return !(p as any).studio_folder_id;
    return (p as any).studio_folder_id === folderFilter;
  });

  return (
    <PageTransition>
      <Helmet>
        <title>Studios | Kretopia</title>
        <meta name="description" content="Studios — your project rooms. Voice-first project management for creatives." />
      </Helmet>

      <FeaturePageHeader
        eyebrow="Projects & Workspaces"
        title="Studios."
        accentTitle="One room per project."
        subtitle="Brief, collaborators, milestones, and payment — all inside the same room, from kickoff to delivery."
        tutorial={{ featureKey: "studio", label: "How Studios works", steps: STUDIO_TUTORIAL }}
      />

      {/* Wider on desktop, capped for readability */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-36 md:pb-12 space-y-5">
        <KretoTip compact />
        {activeProjects.length > 0 && (
          <div className="flex justify-end">
            <Badge className="bg-[hsl(var(--signal-teal))] text-black hover:bg-[hsl(var(--signal-teal))] gap-1 font-bold border-0">
              {activeProjects.length} Active
            </Badge>
          </div>
        )}
        {/* Voice as a primary interaction, not a passive tip — real mic
            button wired to the existing VoiceCommandSheet, styled with
            Kreto's solid accent treatment (formerly a sunset gradient,
            flattened in the design system reset). */}
        <button
          type="button"
          onClick={() => setVoiceCmdOpen(true)}
          className="btn-glass btn-glass-outline group inline-flex items-center gap-2.5 rounded-full pl-1.5 pr-4 py-1.5"
        >
          <span
            className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: "var(--kretopia-sunset, hsl(327 100% 59%))" }}
          >
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-40 motion-reduce:animate-none"
              style={{ background: "var(--kretopia-sunset, hsl(327 100% 59%))" }}
              aria-hidden
            />
            <Mic className="relative h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold text-foreground">Just talk — Kreto's listening</span>
          <span className="hidden md:inline text-xs text-muted-foreground">
            · <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">⌘K</kbd> anywhere
          </span>
        </button>

        {/* Dominant creation CTA — Studio creation is the primary action on
            this page, so it's the first thing after the title, not a small
            button competing with the header. */}
        <button
          type="button"
          onClick={() => setShowCreateProject(true)}
          className="btn-glass btn-glass-primary group w-full rounded-2xl p-5 sm:p-6 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base sm:text-lg font-black tracking-tight">New project</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Tell Kreto what you're making — voice or text — and we'll set up the room.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>

        {(() => {
          const moveProject = async (projectId: string, folderId: string | null) => {
            if (!user) return;
            const { error } = await supabase
              .from("projects")
              .update({ studio_folder_id: folderId })
              .eq("id", projectId)
              .eq("created_by", user.id);
            if (error) {
              toast.error(error.message || "Couldn't move project");
              return;
            }
            const folderName = folderId
              ? (folders.find(f => f.id === folderId)?.name ?? "folder")
              : "Unfiled";
            toast.success(`Moved to ${folderName}`);
            fetchProjects();
          };

          const hasFolders = folders.length > 0;
          const atRoot = folderFilter === "all";
          const currentFolder = folders.find((f) => f.id === folderFilter);
          const unfiledProjects = projects.filter((p) => !(p as any).studio_folder_id);

          // ── INSIDE A FOLDER (Drive-style detail view) ──
          if (!atRoot && projects.length > 0) {
            const folderName =
              folderFilter === "unfiled" ? "Unfiled" : currentFolder?.name ?? "Folder";
            const FolderIcon = folderFilter === "unfiled" ? Inbox : Folder;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFolderFilter("all")}
                    className="h-9 -ml-2 gap-1 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Folders
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-11 w-11 rounded-2xl bg-muted grid place-items-center">
                    <FolderIcon className="h-5 w-5 text-foreground/80" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-black tracking-[-0.02em] truncate">
                      {folderName}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {visibleProjects.length}{" "}
                      {visibleProjects.length === 1 ? "project" : "projects"}
                    </p>
                  </div>
                </div>
                <StudioCardsGrid
                  projects={visibleProjects as any}
                  invoicesByProject={invoicesByProject}
                  onNewProject={() => setShowCreateProject(true)}
                  folders={folders}
                  onMoveToFolder={moveProject}
                  hideHero
                />
              </div>
            );
          }

          // ── ROOT — folders grid + loose projects below ──
          return (
            <>
              {user && (projects.length > 0 || hasFolders) && (
                <StudioFoldersBar
                  userId={user.id}
                  folders={folders}
                  counts={folderCounts}
                  selected={folderFilter}
                  onSelect={setFolderFilter}
                  onChanged={() => { fetchFolders(); fetchProjects(); }}
                  onDropProject={moveProject}
                />
              )}

              {hasFolders ? (
                unfiledProjects.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-end justify-between">
                      <h2 className="text-base font-bold">Loose projects</h2>
                      <span className="text-xs text-muted-foreground">
                        {unfiledProjects.length} unfiled · drag onto a folder to file
                      </span>
                    </div>
                    <LooseProjectsCarousel
                      projects={unfiledProjects as any}
                      invoicesByProject={invoicesByProject}
                      folders={folders}
                      onMoveToFolder={moveProject}
                    />
                  </div>
                )
              ) : (
                <>
                  {projects.length > 0 && (
                    <div className="flex items-end justify-between pt-1">
                      <h2 className="text-base font-bold">Your studio rooms</h2>
                      <span className="text-xs text-muted-foreground">
                        {activeProjects.length} in progress · {completedProjects.length} delivered
                      </span>
                    </div>
                  )}
                  <StudioCardsGrid
                    projects={projects as any}
                    invoicesByProject={invoicesByProject}
                    onNewProject={() => setShowCreateProject(true)}
                    folders={folders}
                    onMoveToFolder={moveProject}
                  />
                </>
              )}
            </>
          );
        })()}

        {/* Session & Activity — control-room block. Live Sound Stages,
            tonight's speed session, today's plan, and pending invites used
            to be four independent stacked sections; same components, same
            data, one shared surface. Each inner piece keeps its own real
            data-fetching and self-hiding-when-empty behavior untouched. */}
        <SectionCard title="Session & Activity">
          <div>
            <h3 className="text-sm font-semibold mb-2">Live &amp; upcoming</h3>
            {/* Real Sound Stages data (own loading/empty states, realtime-
                subscribed), reused as-is from Circle rather than rebuilt
                here. Joining sends you to the real room-joining flow at
                /soundstages instead of a second, duplicate implementation
                of the Daily.co join/render logic. */}
            <SoundStagesRail onJoin={() => navigate("/soundstages")} />
          </div>
          <SpeedTonightCard />
          <TodayStrip
            onVoice={() => setVoiceCmdOpen(true)}
            onCommandPalette={() => setPaletteOpen(true)}
            onWrapWeek={() => setWrapWeekOpen(true)}
          />
          <MyPendingInvitations />
        </SectionCard>

        {/* Casting & Collaborators — control-room block. Open casting
            calls, recent recordings, and the people you've worked with
            most recently used to be three independent stacked sections. */}
        <SectionCard title="Casting & Collaborators">
          <div>
            <h3 className="text-sm font-semibold mb-2">Casting calls</h3>
            {/* Real open opportunities of type "casting". Reuses
                GigRailCard as-is (same card used in OpportunitiesFeed's
                grid) rather than a new card design. */}
            <CastingCallsRail />
          </div>
          <RecentRecordingsRail />
          {/* Recent collaborators — real people from the user's most
              recently active projects, via the same get_project_people RPC
              useProjectData already calls per-project; just run over a few
              projects and deduped here. Self-hides when there's nobody yet. */}
          {recentCollaborators.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Recent collaborators</h3>
              <div className="relative">
              <Carousel setApi={setCollabApi} opts={{ align: "start", dragFree: true, duration: reducedMotion ? 0 : 20 }} className="w-full" aria-label="Recent collaborators">
                <CarouselContent className="-ml-3">
                  {recentCollaborators.map((c) => (
                    <CarouselItem key={c.id} className="pl-3 basis-auto">
                      <button
                        type="button"
                        onClick={() => navigate(`/profile/${c.id}`)}
                        className="w-28 rounded-2xl border border-border bg-card p-3 text-center transition-all hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="h-14 w-14 mx-auto rounded-full overflow-hidden bg-muted mb-2">
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt={c.full_name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                              {c.full_name[0]}
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-semibold truncate">{c.full_name}</p>
                        {c.role && <p className="text-[10px] text-muted-foreground truncate">{c.role}</p>}
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious variant="glass" className="hidden sm:flex -left-3" aria-label="Previous — recent collaborators" />
                <CarouselNext variant="glass" className="hidden sm:flex -right-3" aria-label="Next — recent collaborators" />
              </Carousel>
              <CarouselPositionDots api={collabApi} label="Recent collaborators" className="mt-2" />
              </div>
            </div>
          )}
        </SectionCard>
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
    return <WorkHomeSkeleton variant="shell" />;
  }

  if (accountType === "company") return <BrandWorkHome />;
  return <CreatorWorkHome />;
};

export default WorkHome;
