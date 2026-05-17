import { useState, useEffect } from "react";
import { CreativeLoader } from "@/components/ui/creative-loader";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2, Menu, X, PanelRightOpen, PanelLeftClose, PanelLeftOpen, FolderKanban } from "lucide-react";
import { ProjectSettingsMenu } from "@/components/project/ProjectSettingsMenu";
import { SimpleProjectHeader } from "@/components/project/SimpleProjectHeader";
import { WorkspaceSidebar } from "@/components/project/WorkspaceSidebar";
import { WorkspaceQuickPanel } from "@/components/project/WorkspaceQuickPanel";
import { StudioToolBar } from "@/components/project/StudioToolBar";
import { ConfirmCreditBanner } from "@/components/project/ConfirmCreditBanner";
import { AgentModeBanner } from "@/components/project/AgentModeBanner";
import { ProjectInviteAcceptBanner } from "@/components/project/ProjectInviteAcceptBanner";
import { DeskTabContent } from "@/components/project/DeskTabContent";
import { useAgentRole } from "@/hooks/useAgentRole";

import { ProjectFlowTimeline } from "@/components/project/flow/ProjectFlowTimeline";
import { NextStepBar } from "@/components/project/flow/NextStepBar";
import { MobileProjectHub } from "@/components/project/mobile/MobileProjectHub";
import { StudioRoom } from "@/components/project/studio/StudioRoom";
import { DeskCommandPalette } from "@/components/desk/DeskCommandPalette";
import { VoiceCommandSheet } from "@/components/desk/VoiceCommandSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft } from "lucide-react";
import { useProjectData } from "@/hooks/useProjectData";
import { useProjectFlow, type ProjectFlowStageId } from "@/hooks/useProjectFlow";
import { useProjectFlowExtras } from "@/hooks/useProjectFlowExtras";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ThriveDesk = () => {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const {
    loading, project, collaborators, files, messages, tasks, milestones,
    projects, userRole, isPro, user, fetchProjectData,
  } = useProjectData(projectId);

  const [activeTab, setActiveTab] = useState("today");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("thrivedesk:sidebar-open") !== "false";
  });
  useEffect(() => {
    localStorage.setItem("thrivedesk:sidebar-open", String(desktopSidebarOpen));
  }, [desktopSidebarOpen]);
  const [quickPanelOpen, setQuickPanelOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [voiceCmdOpen, setVoiceCmdOpen] = useState(false);
  const isMobile = useIsMobile();
  // Studio Room is the default for "today" tab on BOTH mobile and desktop now
  const isStudioRoom = activeTab === "today";

  const agentRole = useAgentRole(project, user?.id || "");

  const flowExtras = useProjectFlowExtras(projectId, project?.updated_at);
  const flow = useProjectFlow({
    messageCount: messages.length,
    noteCount: flowExtras.noteCount,
    taskCount: tasks.length,
    taskDoneCount: tasks.filter((t) => t.status === "done").length,
    fileCount: files.length,
    approvalApprovedCount: flowExtras.approvalApprovedCount,
    approvalPendingCount: flowExtras.approvalPendingCount,
    contractCount: flowExtras.contractCount,
    contractSignedCount: flowExtras.contractSignedCount,
    invoiceCount: flowExtras.invoiceCount,
    invoicePaidCount: flowExtras.invoicePaidCount,
    milestoneCount: milestones.length,
    projectStatus: project?.status,
    pinnedStage: project?.pinned_stage,
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") setActiveTab(detail);
    };
    window.addEventListener("thrivedesk:set-tab", handler);
    return () => window.removeEventListener("thrivedesk:set-tab", handler);
  }, []);

  useEffect(() => {
    if (!project || searchParams.get("section") !== "sponsors") return;
    setActiveTab("today");
    window.dispatchEvent(new CustomEvent("thrivedesk:set-tab", { detail: "today" }));
    window.setTimeout(() => {
      document.getElementById("studio-sponsors")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  }, [project, searchParams]);

  // Broadcast tab changes so global UI (e.g. Copilot FAB) can react.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("thrivedesk:tab-changed", { detail: activeTab }),
    );
  }, [activeTab]);

  // Navigate to a tab and optionally broadcast an "intent" so the target tab
  // can pre-fill (e.g. open create dialog). Listeners are added in target components.
  const goToTabWithIntent = (tab: string, intent?: string) => {
    setActiveTab(tab);
    if (intent) {
      // Defer so the tab mounts first
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("thrivedesk:intent", { detail: { tab, intent } }));
      }, 50);
    }
  };

  const handlePinStage = async (stageId: ProjectFlowStageId | null) => {
    if (!projectId) return;
    const { error } = await supabase
      .from("projects")
      .update({ pinned_stage: stageId })
      .eq("id", projectId);
    if (error) {
      toast.error("Couldn't update stage");
      return;
    }
    toast.success(stageId ? "Stage pinned" : "Stage unpinned");
    fetchProjectData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {/* Header skeleton */}
        <div className="px-4 pt-4 pb-3 border-b border-border/40 space-y-2">
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="h-7 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-muted/70 animate-pulse" />
        </div>
        {/* Tab strip skeleton */}
        <div className="px-4 py-3 flex gap-2 overflow-hidden border-b border-border/30">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-8 w-20 rounded-full bg-muted animate-pulse shrink-0"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
        {/* Body skeleton */}
        <div className="px-4 py-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-muted animate-pulse"
              style={{ animationDelay: `${i * 90}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-bold mb-1">Studio not found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This studio may have been removed or you don't have access.
          </p>
          <Button onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row overflow-hidden bg-background h-[calc(100dvh-4rem)] pb-[calc(6.5rem+env(safe-area-inset-bottom))] touch-pan-y lg:h-[100dvh] lg:pb-0">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Left Sidebar - Project List */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-all duration-200 lg:relative",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
        desktopSidebarOpen ? "lg:w-64" : "lg:w-0 lg:border-r-0 lg:overflow-hidden"
      )}>
        <WorkspaceSidebar
          projects={projects}
          activeProjectId={projectId}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Workspace Header */}
        <header className="h-14 border-b-2 border-primary/20 bg-gradient-to-r from-card via-card to-primary/5 backdrop-blur-sm flex items-center gap-3 px-4 shrink-0 shadow-sm">
          <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex shrink-0"
            onClick={() => setDesktopSidebarOpen((v) => !v)}
            aria-label={desktopSidebarOpen ? "Hide studios" : "Show studios"}
            title={desktopSidebarOpen ? "Hide studios" : "Show studios"}
          >
            {desktopSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </Button>
          <SimpleProjectHeader
            project={project}
            collaborators={collaborators}
            onCollaboratorsChanged={fetchProjectData}
            compact
          />
          <ProjectSettingsMenu
            project={project}
            collaborators={collaborators}
            currentUserId={user?.id || ""}
            isPro={isPro}
            onProjectUpdated={fetchProjectData}
            onNavigateToTab={setActiveTab}
          />
        </header>

        {/* Desktop-only flow timeline + next step (only when in Studio) */}
        {!isMobile && isStudioRoom && (
          <div>
            <ProjectFlowTimeline
              flow={flow}
              onStageClick={(_stageId, tab) => setActiveTab(tab)}
              onPinStage={handlePinStage}
            />
            <NextStepBar nextStep={flow.nextStep} onAction={goToTabWithIntent} />
          </div>
        )}

        {/* Unified tool bar — same on mobile and desktop when drilled into a tool */}
        {!isStudioRoom && (
          <StudioToolBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            workspaceType={project?.workspace_type ?? "general"}
            dealType={project?.deal_type ?? "paid"}
            taskCount={tasks.filter(t => t.status !== 'done').length}
            messageCount={messages.length}
          />
        )}

        {/* Agent Mode Banner — visible when agent_mode is true */}
        <AgentModeBanner agentRole={agentRole} />

        {/* Pending invite — accept inline */}
        <ProjectInviteAcceptBanner projectId={projectId!} onAccepted={fetchProjectData} />

        {/* Credit Confirmation Banner */}
        <ConfirmCreditBanner
          projectId={projectId!}
          projectTitle={project.title}
          onConfirmed={fetchProjectData}
        />

        {/* Content + Quick Panel */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {isStudioRoom ? (
            <StudioRoom
              project={project}
              tasks={tasks}
              files={files}
              collaborators={collaborators as any}
              currentUserId={user?.id || ""}
              onUpdated={fetchProjectData}
              onNavigateToTab={goToTabWithIntent}
              nextStep={flow.nextStep}
            />
          ) : (
            <DeskTabContent
              activeTab={activeTab}
              projectId={projectId!}
              project={project}
              messages={messages}
              tasks={tasks}
              files={files}
              milestones={milestones}
              collaborators={collaborators}
              currentUserId={user?.id || ""}
              userRole={userRole}
              isPro={isPro}
              agentRole={agentRole}
              onUpdate={fetchProjectData}
            />
          )}

          {/* Quick Panel Toggle - Desktop only, hidden in Studio */}
          {!isStudioRoom && !quickPanelOpen && (
            <div className="hidden xl:flex items-start pt-3 pr-2 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQuickPanelOpen(true)}>
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Right Quick Panel - Desktop only, hidden in Studio */}
          {!isStudioRoom && quickPanelOpen && (
            <div className="hidden xl:block w-80 border-l border-border bg-card/30 overflow-y-auto shrink-0">
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Panel</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setQuickPanelOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <WorkspaceQuickPanel
                tasks={tasks}
                files={files}
                collaborators={collaborators}
                projectId={projectId!}
                onTasksChanged={fetchProjectData}
                currentUserId={user?.id || ""}
                onNavigateToTab={setActiveTab}
              />
            </div>
          )}
        </div>
      </div>

      {/* Thrive Copilot is mounted globally via ThriveAgentFab — no per-page launcher needed. */}

      {/* Global ⌘K palette + voice command — available across the workspace */}
      <DeskCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onVoiceCommand={() => setVoiceCmdOpen(true)}
      />
      <VoiceCommandSheet open={voiceCmdOpen} onOpenChange={setVoiceCmdOpen} />
    </div>
  );
};

export default ThriveDesk;
