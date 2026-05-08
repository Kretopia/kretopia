import { useState, useEffect } from "react";
import { CreativeLoader } from "@/components/ui/creative-loader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, MoreHorizontal, FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6 pb-32 md:pb-12 overflow-y-auto">
      {/* Header — warm studio tone */}
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase mb-1">
            ThriveDesk
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
            Your studio rooms
          </h1>
          {projects.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {activeCount} in progress · {completedCount} delivered
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowVoiceCreate(true)}
            size="sm"
            className="gap-1.5 rounded-full"
          >
            <Plus className="h-4 w-4" />
            <span>New project</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowWizard(true)}
            className="gap-1.5 text-xs"
            title="Advanced setup"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Advanced</span>
          </Button>
        </div>
      </header>

      {/* Pending Invitations */}
      <MyPendingInvitations />

      {/* Studio Cards grid (or empty state) */}
      <StudioCardsGrid
        projects={projects as any}
        invoicesByProject={invoicesByProject}
        onNewProject={() => setShowVoiceCreate(true)}
      />

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
