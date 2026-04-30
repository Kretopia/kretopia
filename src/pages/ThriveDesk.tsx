import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Menu, X, PanelRightOpen, FolderKanban } from "lucide-react";
import { ProjectSettingsMenu } from "@/components/project/ProjectSettingsMenu";
import { SimpleProjectHeader } from "@/components/project/SimpleProjectHeader";
import { WorkspaceSidebar } from "@/components/project/WorkspaceSidebar";
import { WorkspaceQuickPanel } from "@/components/project/WorkspaceQuickPanel";
import { DeskTabBar } from "@/components/project/DeskTabBar";
import { ConfirmCreditBanner } from "@/components/project/ConfirmCreditBanner";
import { AgentModeBanner } from "@/components/project/AgentModeBanner";
import { ProjectInviteAcceptBanner } from "@/components/project/ProjectInviteAcceptBanner";
import { DeskTabContent } from "@/components/project/DeskTabContent";
import { useAgentRole } from "@/hooks/useAgentRole";
import { DeskAILauncher } from "@/components/project/ai/DeskAILauncher";
import { ProjectFlowTimeline } from "@/components/project/flow/ProjectFlowTimeline";
import { NextStepBar } from "@/components/project/flow/NextStepBar";
import { MobileProjectHub } from "@/components/project/mobile/MobileProjectHub";
import { StudioRoom } from "@/components/project/studio/StudioRoom";
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
  const {
    loading, project, collaborators, files, messages, tasks, milestones,
    projects, userRole, isPro, user, fetchProjectData,
  } = useProjectData(projectId);

  const [activeTab, setActiveTab] = useState("today");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickPanelOpen, setQuickPanelOpen] = useState(true);
  const isMobile = useIsMobile();
  const isMobileHub = isMobile && activeTab === "today";

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
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
          <h2 className="text-lg font-bold mb-1">Workspace not found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This workspace may have been removed or you don't have access.
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
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
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
          <SimpleProjectHeader
            project={project}
            collaborators={collaborators}
            onCollaboratorsChanged={fetchProjectData}
            compact
          />
          <ProjectSettingsMenu
            project={project}
            currentUserId={user?.id || ""}
            isPro={isPro}
            onProjectUpdated={fetchProjectData}
            onNavigateToTab={setActiveTab}
          />
        </header>

        {/* Project Flow Timeline + Next Step + Tab Bar — desktop only */}
        <div className={cn(isMobile && "hidden")}>
          <ProjectFlowTimeline
            flow={flow}
            onStageClick={(_stageId, tab) => setActiveTab(tab)}
            onPinStage={handlePinStage}
          />
          <NextStepBar nextStep={flow.nextStep} onAction={goToTabWithIntent} />
          <DeskTabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            taskCount={tasks.filter(t => t.status !== 'done').length}
            messageCount={messages.length}
            workspaceType={project?.workspace_type ?? "general"}
            dealType={project?.deal_type ?? "paid"}
          />
        </div>

        {/* Mobile back-to-hub bar — visible when drilled into a section */}
        {isMobile && !isMobileHub && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/60 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs gap-1"
              onClick={() => setActiveTab("today")}
            >
              <ArrowLeft className="h-4 w-4" />
              Hub
            </Button>
            <span className="text-xs font-semibold capitalize text-muted-foreground truncate">
              {activeTab.replace(/_/g, " ")}
            </span>
          </div>
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
          {isMobileHub ? (
            <StudioRoom
              project={project}
              tasks={tasks}
              files={files}
              collaborators={collaborators as any}
              currentUserId={user?.id || ""}
              onUpdated={fetchProjectData}
              onNavigateToTab={goToTabWithIntent}
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

          {/* Quick Panel Toggle - Desktop only */}
          {!quickPanelOpen && (
            <div className="hidden xl:flex items-start pt-3 pr-2 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQuickPanelOpen(true)}>
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Right Quick Panel - Desktop only */}
          {quickPanelOpen && (
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

      {/* Floating AI Assistant — only show when mobile Hub isn't rendering its own combined FAB */}
      {user && projectId && !isMobileHub && (
        <DeskAILauncher
          projectId={projectId}
          userId={user.id}
          isPro={isPro}
          hideOnMobile={isMobile && activeTab === "messages"}
        />
      )}
    </div>
  );
};

export default ThriveDesk;
