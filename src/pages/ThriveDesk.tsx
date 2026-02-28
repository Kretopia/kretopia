import { useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Menu, X, PanelRightOpen } from "lucide-react";
import { ProjectSettingsMenu } from "@/components/project/ProjectSettingsMenu";
import { SimpleProjectHeader } from "@/components/project/SimpleProjectHeader";
import { WorkspaceSidebar } from "@/components/project/WorkspaceSidebar";
import { WorkspaceQuickPanel } from "@/components/project/WorkspaceQuickPanel";
import { DeskTabBar } from "@/components/project/DeskTabBar";
import { DeskTabContent } from "@/components/project/DeskTabContent";
import { useProjectData } from "@/hooks/useProjectData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ThriveDesk = () => {
  const { projectId } = useParams();
  const {
    loading, project, collaborators, files, messages, tasks, milestones,
    projects, userRole, isPro, user, fetchProjectData,
  } = useProjectData(projectId);

  const [activeTab, setActiveTab] = useState("messages");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickPanelOpen, setQuickPanelOpen] = useState(true);

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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row overflow-hidden bg-background h-[calc(100dvh-8rem)] lg:h-[100dvh]">
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
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-3 px-4 shrink-0">
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

        {/* Tab Bar */}
        <DeskTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content + Quick Panel */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
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
            onUpdate={fetchProjectData}
          />

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
    </div>
  );
};

export default ThriveDesk;
