import { memo } from "react";
import { TodayWorkspace } from "@/components/project/today/TodayWorkspace";
import { FileBrowser } from "@/components/project/files/FileBrowser";
import { TasksWorkspace } from "@/components/project/tasks/TasksWorkspace";
import { SimpleProjectChat } from "@/components/project/SimpleProjectChat";
import { MilestoneBoard } from "@/components/project/MilestoneBoard";
import { InvoiceGenerator } from "@/components/project/InvoiceGenerator";
import { ProjectNotes } from "@/components/project/ProjectNotes";
import { AIBriefBuilder } from "@/components/project/AIBriefBuilder";
import { AIAutomation } from "@/components/project/AIAutomation";
import { ApprovalWorkflows } from "@/components/project/ApprovalWorkflows";
import { CreativeAssetLibrary } from "@/components/project/CreativeAssetLibrary";
import { ProjectTemplatePicker } from "@/components/project/ProjectTemplatePicker";
import { CreativeBoard } from "@/components/project/CreativeBoard";
import { ScopeGuardian } from "@/components/project/ScopeGuardian";
import { ContractsList } from "@/components/project/contracts/ContractsList";
import { UsageLimitBanner } from "@/components/project/ProGate";
import { FreeTierGate } from "@/components/FreeTierGate";
import { cn } from "@/lib/utils";
import type { Collaborator } from "@/hooks/useProjectData";

const FREE_LIMITS = { files: 10, tasks: 20, boardItems: 15 };

interface DeskTabContentProps {
  activeTab: string;
  projectId: string;
  project: any;
  messages: any[];
  tasks: any[];
  files: any[];
  milestones: any[];
  collaborators: Collaborator[];
  currentUserId: string;
  userRole: "creator" | "client";
  isPro: boolean;
  onUpdate: () => void;
}

export const DeskTabContent = memo(({
  activeTab,
  projectId,
  project,
  messages,
  tasks,
  files,
  milestones,
  collaborators,
  currentUserId,
  userRole,
  isPro,
  onUpdate,
}: DeskTabContentProps) => {
  const setTab = (tab: string) => {
    // dispatch via custom event so parent can pick it up without prop drilling
    window.dispatchEvent(new CustomEvent("thrivedesk:set-tab", { detail: tab }));
  };
  return (
  <div className={cn("flex-1 min-h-0 min-w-0", activeTab === "messages" || activeTab === "today" ? "flex flex-col" : "overflow-y-auto")}>
    {activeTab === "today" && (
      <TodayWorkspace
        projectId={projectId}
        isPro={isPro}
        tasks={tasks}
        messages={messages}
        files={files}
        milestones={milestones}
        collaborators={collaborators}
        currentUserId={currentUserId}
        onUpdate={onUpdate}
        onNavigateToTab={setTab}
      />
    )}

    {activeTab === "messages" && (
      <SimpleProjectChat
        projectId={projectId}
        messages={messages}
        currentUserId={currentUserId}
        onMessageSent={onUpdate}
        collaborators={collaborators}
      />
    )}

    {activeTab !== "messages" && activeTab !== "today" && (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        {activeTab === "tasks" && (
          <>
            <UsageLimitBanner current={tasks.length} limit={FREE_LIMITS.tasks} itemName="tasks" isPro={isPro} />
            <TasksWorkspace
              projectId={projectId}
              tasks={tasks}
              onUpdate={onUpdate}
              collaborators={collaborators}
              currentUserId={currentUserId}
            />
          </>
        )}

        {activeTab === "files" && (
          <>
            <UsageLimitBanner current={files.length} limit={FREE_LIMITS.files} itemName="files" isPro={isPro} />
            <FileBrowser projectId={projectId} files={files} onFileUploaded={onUpdate} />
          </>
        )}

        {activeTab === "approvals" && (
          <FreeTierGate feature="approvalRequests" featureLabel="Approval Workflows" description="Upgrade to Pro for unlimited approval workflows, visual feedback, and status tracking.">
            <ApprovalWorkflows projectId={projectId} currentUserId={currentUserId} collaborators={collaborators} userRole={userRole} />
          </FreeTierGate>
        )}

        {activeTab === "assets" && (
          <CreativeAssetLibrary projectId={projectId} currentUserId={currentUserId} />
        )}

        {activeTab === "board" && (
          <CreativeBoard projectId={projectId} currentUserId={currentUserId} />
        )}

        {activeTab === "contracts" && (
          <ContractsList projectId={projectId} currentUserId={currentUserId} collaborators={collaborators} />
        )}

        {activeTab === "scope" && (
          <ScopeGuardian
            projectId={projectId}
            project={project}
            milestones={milestones}
            onMilestonesGenerated={onUpdate}
          />
        )}

        {activeTab === "finance" && (
          <FreeTierGate feature="milestones" featureLabel="Finance Tools" description="Upgrade to Pro for unlimited milestones, invoices, and project payments.">
            <div className="space-y-6">
              <MilestoneBoard
                milestones={milestones}
                projectId={projectId}
                onUpdate={onUpdate}
                userRole={userRole}
                collaborators={collaborators}
                projectOwnerId={project?.created_by}
              />
              <div className="flex justify-end">
                <InvoiceGenerator projectId={projectId} />
              </div>
            </div>
          </FreeTierGate>
        )}

        {activeTab === "notes" && <ProjectNotes projectId={projectId} />}

        {activeTab === "templates" && (
          <FreeTierGate feature="templateUses" featureLabel="Project Templates" description="Upgrade to Pro for unlimited templates for music videos, brand campaigns, podcasts, and more.">
            <ProjectTemplatePicker projectId={projectId} currentUserId={currentUserId} onApplied={onUpdate} />
          </FreeTierGate>
        )}

        {activeTab === "ai" && (
          <FreeTierGate feature="aiBriefs" featureLabel="AI Tools" description="Upgrade to Pro for unlimited AI-powered briefs, automation, and creative tools.">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AIBriefBuilder projectId={projectId} projectTitle={project.title} projectDescription={project.description} />
              <AIAutomation projectId={projectId} projectTitle={project.title} projectDescription={project.description} onUpdate={onUpdate} />
            </div>
          </FreeTierGate>
        )}
      </div>
    )}
  </div>
  );
});

DeskTabContent.displayName = "DeskTabContent";
