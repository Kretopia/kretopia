import { useState, useEffect, useMemo } from "react";
import { CreativeLoader } from "@/components/ui/creative-loader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, MoreHorizontal, FolderKanban, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MyPendingInvitations } from "@/components/project/MyPendingInvitations";
import { CreateProjectDialog } from "@/components/project/CreateProjectDialog";
import { StudioCardsGrid } from "@/components/project/studio/StudioCardsGrid";
import { VoiceFirstCreateModal } from "@/components/project/studio/VoiceFirstCreateModal";

const ProjectsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [invoicesByProject, setInvoicesByProject] = useState<
    Record<string, "paid" | "invoiced" | "unsent">
  >({});
  const [showVoiceCreate, setShowVoiceCreate] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "planning" | "wrapping" | "completed">("all");
  const [payFilter, setPayFilter] = useState<"all" | "unsent" | "invoiced" | "paid">("all");

  useEffect(() => {
    if (user) {
      fetchProjects();
      const trackPage = async () => {
        const { analytics } = await import("@/lib/analytics");
        analytics.pageView("projects_list");
      };
      trackPage();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data: projectsData, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const list = projectsData || [];
      setProjects(list);

      // Best-effort: classify each project's invoice status for the payment dot
      if (list.length) {
        const ids = list.map((p) => p.id);
        const { data: invs } = await supabase
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
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error loading projects",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6 pb-32 md:pb-12">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="h-7 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-36 rounded bg-muted animate-pulse" />
        </div>
        {/* Stat chips skeleton */}
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[78px] min-w-[136px] rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-muted animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const activeCount = projects.filter((p) => p.status === "active").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (payFilter !== "all" && (invoicesByProject[p.id] ?? "unsent") !== payFilter) return false;
      if (q) {
        const hay = `${p.title ?? ""} ${p.client_name ?? ""} ${p.description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [projects, query, statusFilter, payFilter, invoicesByProject]);

  const filtersActive = query.trim() !== "" || statusFilter !== "all" || payFilter !== "all";

  const STATUS_CHIPS: { id: typeof statusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "In progress" },
    { id: "planning", label: "Planning" },
    { id: "wrapping", label: "Wrapping" },
    { id: "completed", label: "Delivered" },
  ];
  const PAY_CHIPS: { id: typeof payFilter; label: string; dot?: string }[] = [
    { id: "unsent", label: "No invoice", dot: "bg-rose-500" },
    { id: "invoiced", label: "Invoiced", dot: "bg-amber-500" },
    { id: "paid", label: "Paid", dot: "bg-emerald-500" },
  ];

  return (
    <div className="container max-w-6xl mx-auto py-3 sm:py-4 px-3 sm:px-4 space-y-3 sm:space-y-4 pb-32 md:pb-12 overflow-y-auto">
      {/* Header — lite, single line */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FolderKanban className="h-4 w-4 text-primary shrink-0" />
          <h1 className="text-xl font-black tracking-[-0.03em] truncate">Studios</h1>
          {projects.length > 0 && (
            <span className="text-[11px] text-muted-foreground font-medium shrink-0">
              · {activeCount} active
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowWizard(true)}
          className="h-8 w-8 text-muted-foreground"
          title="Advanced setup"
          aria-label="Advanced setup"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </header>

      {/* Pending Invitations (only if any) */}
      <MyPendingInvitations />

      {/* Search + quick filters (only when there's something to search) */}
      {projects.length > 2 && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rooms, clients, briefs…"
              className="pl-9 pr-9 h-10 rounded-full bg-muted/40 border-border/60"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5 scrollbar-none">
            {STATUS_CHIPS.map((c) => (
              <button
                key={c.id}
                onClick={() => setStatusFilter(c.id)}
                className={cn(
                  "shrink-0 h-7 px-3 rounded-full text-[11px] font-semibold transition-colors border",
                  statusFilter === c.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {c.label}
              </button>
            ))}
            <span className="shrink-0 h-4 w-px bg-border mx-1" />
            {PAY_CHIPS.map((c) => (
              <button
                key={c.id}
                onClick={() => setPayFilter(payFilter === c.id ? "all" : c.id)}
                className={cn(
                  "shrink-0 h-7 px-3 rounded-full text-[11px] font-semibold transition-colors border inline-flex items-center gap-1.5",
                  payFilter === c.id
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
                {c.label}
              </button>
            ))}
            {filtersActive && (
              <button
                onClick={() => { setQuery(""); setStatusFilter("all"); setPayFilter("all"); }}
                className="shrink-0 h-7 px-2.5 rounded-full text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Studio Cards grid (or empty state) */}
      {filtersActive && filteredProjects.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-sm font-semibold mb-1">No rooms match those filters</p>
          <p className="text-xs text-muted-foreground mb-4">Try a different search or clear the filters.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setQuery(""); setStatusFilter("all"); setPayFilter("all"); }}
          >
            Clear filters
          </Button>
        </Card>
      ) : (
        <StudioCardsGrid
          projects={filteredProjects as any}
          invoicesByProject={invoicesByProject}
          onNewProject={() => setShowVoiceCreate(true)}
        />
      )}

      {/* Floating New Project FAB */}
      <Button
        onClick={() => setShowVoiceCreate(true)}
        size="lg"
        className="fixed right-4 bottom-32 sm:bottom-24 md:bottom-8 z-30 h-14 w-14 rounded-full shadow-xl p-0"
        aria-label="New project"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Voice-first entry */}
      <VoiceFirstCreateModal
        open={showVoiceCreate}
        onOpenChange={setShowVoiceCreate}
        onCreated={fetchProjects}
      />

      {/* Power-user wizard (kept for advanced/agent flows) */}
      <CreateProjectDialog
        open={showWizard}
        onOpenChange={setShowWizard}
        onSuccess={() => {
          setShowWizard(false);
          fetchProjects();
        }}
      />
    </div>
  );
};

export default ProjectsList;
