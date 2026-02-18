import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, MessageSquare, CheckSquare, FolderOpen, DollarSign, StickyNote, Sparkles, LayoutGrid, Plus, Search, Bell, ChevronLeft, Menu, X, CheckCircle2, Library, LayoutTemplate, Wallet, PanelRightClose, PanelRightOpen, Crown } from "lucide-react";
import { ProjectSettingsMenu } from "@/components/project/ProjectSettingsMenu";
import { SimpleProjectHeader } from "@/components/project/SimpleProjectHeader";
import { SimpleFileSharing } from "@/components/project/SimpleFileSharing";
import { TaskBoard } from "@/components/project/TaskBoard";
import { SimpleProjectChat } from "@/components/project/SimpleProjectChat";
import { MilestoneBoard } from "@/components/project/MilestoneBoard";
import { InvoiceGenerator } from "@/components/project/InvoiceGenerator";
import { ProjectNotes } from "@/components/project/ProjectNotes";
// AccountingDashboard moved to standalone /accounting route
import { AIBriefBuilder } from "@/components/project/AIBriefBuilder";
import { AIAutomation } from "@/components/project/AIAutomation";
import { WorkspaceSidebar } from "@/components/project/WorkspaceSidebar";
import { WorkspaceQuickPanel } from "@/components/project/WorkspaceQuickPanel";
import { ApprovalWorkflows } from "@/components/project/ApprovalWorkflows";
import { CreativeAssetLibrary } from "@/components/project/CreativeAssetLibrary";
import { ProjectTemplatePicker } from "@/components/project/ProjectTemplatePicker";
import { CreativeBoard } from "@/components/project/CreativeBoard";
import { UsageLimitBanner } from "@/components/project/ProGate";
import { FreeTierGate } from "@/components/FreeTierGate";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ThriveDesk = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, subscriptionInfo } = useAuth();
  const isPro = subscriptionInfo.tier === 'pro';
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("messages");
  const [userRole, setUserRole] = useState<'creator' | 'client'>('creator');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickPanelOpen, setQuickPanelOpen] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    if (projectId && user) {
      fetchProjectData(true);
      const trackProjectView = async () => {
        const { analytics } = await import("@/lib/analytics");
        analytics.pageView("thrivedesk");
        analytics.featureUsed("thrivedesk_opened", { project_id: projectId });
      };
      trackProjectView();
    }
  }, [projectId, user]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, title, status, updated_at')
      .order('updated_at', { ascending: false });
    setProjects(data || []);
  };

  const fetchProjectData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (projectError) throw projectError;
      if (!user) throw new Error('Not authenticated');
      
      const { data: hasAccess } = await supabase
        .rpc('user_has_project_access', {
          project_id_param: projectId,
          user_id_param: user.id
        });
      if (!hasAccess) {
        toast({ title: "Access denied", description: "You don't have access to this project", variant: "destructive" });
        navigate('/circle');
        return;
      }

      setProject(projectData);
      setUserRole(projectData.created_by === user.id ? 'client' : 'creator');

      // Fetch collaborators
      const { data: collabData } = await supabase
        .from('project_collaborators')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'accepted');

      const collabs: any[] = [];
      if (collabData) {
        for (const collab of collabData) {
          if (collab.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url, role')
              .eq('user_id', collab.user_id)
              .single();
            if (profile) {
              collabs.push({ id: collab.user_id, full_name: profile.full_name, avatar_url: profile.avatar_url, role: profile.role });
            }
          }
        }
      }

      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .eq('user_id', projectData.created_by)
        .single();
      if (creatorProfile) {
        collabs.unshift({ id: creatorProfile.user_id, full_name: creatorProfile.full_name, avatar_url: creatorProfile.avatar_url, role: creatorProfile.role });
      }
      setCollaborators(collabs);

      // Fetch files
      const { data: filesData } = await supabase.from('project_files').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      setFiles(filesData || []);

      // Fetch messages with profiles
      const { data: messagesData } = await supabase.from('project_messages').select('*, reply_to, is_pinned').eq('project_id', projectId).order('created_at', { ascending: true });
      if (messagesData) {
        const enrichedMessages = await Promise.all(
          messagesData.map(async (msg) => {
            const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('user_id', msg.user_id).single();
            return { ...msg, profiles: profile };
          })
        );
        setMessages(enrichedMessages);
      }

      // Fetch tasks
      const { data: tasksData } = await supabase.from('project_tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      setTasks(tasksData || []);

      // Fetch milestones
      const { data: milestonesData } = await supabase.from('milestones').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
      setMilestones(milestonesData || []);

      // Subscribe to real-time updates
      const channel = supabase
        .channel(`project:${projectId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_files', filter: `project_id=eq.${projectId}` }, () => fetchProjectData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_messages', filter: `project_id=eq.${projectId}` }, () => fetchProjectData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_tasks', filter: `project_id=eq.${projectId}` }, () => fetchProjectData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones', filter: `project_id=eq.${projectId}` }, () => fetchProjectData())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } catch (error: any) {
      console.error('Error fetching project data:', error);
      toast({ title: "Error loading project", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const FREE_LIMITS = { files: 10, tasks: 20, boardItems: 15 };

  const tabs = [
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "files", label: "Files", icon: FolderOpen },
    { id: "board", label: "Board", icon: LayoutGrid },
    { id: "approvals", label: "Approvals", icon: CheckCircle2 },
    { id: "finance", label: "Finance", icon: Wallet },
  ];

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
            currentUserId={user?.id || ''}
            isPro={isPro}
            onProjectUpdated={fetchProjectData}
            onNavigateToTab={setActiveTab}
          />
        </header>

        {/* Tab Bar */}
        <div className="border-b border-border bg-card/50 px-4 shrink-0">
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content + Quick Panel */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Main Content */}
          <div className={cn("flex-1 min-h-0 min-w-0", activeTab === "messages" ? "flex flex-col" : "overflow-y-auto")}>
            {activeTab === "messages" && (
              <SimpleProjectChat
                projectId={projectId!}
                messages={messages}
                currentUserId={user?.id || ''}
                onMessageSent={fetchProjectData}
                collaborators={collaborators}
              />
            )}
            {activeTab !== "messages" && (
              <div className="p-4 md:p-6 pb-24 md:pb-6">
                {activeTab === "tasks" && (
                  <>
                    <UsageLimitBanner current={tasks.length} limit={FREE_LIMITS.tasks} itemName="tasks" isPro={isPro} />
                    <TaskBoard
                      projectId={projectId!}
                      tasks={tasks}
                      onUpdate={fetchProjectData}
                      collaborators={collaborators}
                    />
                  </>
                )}
                {activeTab === "files" && (
                  <>
                    <UsageLimitBanner current={files.length} limit={FREE_LIMITS.files} itemName="files" isPro={isPro} />
                    <SimpleFileSharing
                      projectId={projectId!}
                      files={files}
                      onFileUploaded={fetchProjectData}
                    />
                  </>
                )}
                {activeTab === "approvals" && (
                  <FreeTierGate feature="approvalRequests" featureLabel="Approval Workflows" description="Upgrade to Pro for unlimited approval workflows, visual feedback, and status tracking.">
                    <ApprovalWorkflows
                      projectId={projectId!}
                      currentUserId={user?.id || ''}
                      collaborators={collaborators}
                      userRole={userRole}
                    />
                  </FreeTierGate>
                )}
                {activeTab === "assets" && (
                  <CreativeAssetLibrary
                    projectId={projectId!}
                    currentUserId={user?.id || ''}
                  />
                )}
                {activeTab === "board" && (
                  <CreativeBoard
                    projectId={projectId!}
                    currentUserId={user?.id || ''}
                  />
                )}
                {activeTab === "finance" && (
                  <FreeTierGate feature="milestones" featureLabel="Finance Tools" description="Upgrade to Pro for unlimited milestones, invoices, and project payments.">
                    <div className="space-y-6">
                      <MilestoneBoard
                        milestones={milestones}
                        projectId={projectId!}
                        onUpdate={fetchProjectData}
                        userRole={userRole}
                      />
                      <div className="flex justify-end">
                        <InvoiceGenerator projectId={projectId!} />
                      </div>
                    </div>
                  </FreeTierGate>
                )}
                {activeTab === "notes" && (
                  <ProjectNotes projectId={projectId!} />
                )}
                {activeTab === "templates" && (
                  <FreeTierGate feature="templateUses" featureLabel="Project Templates" description="Upgrade to Pro for unlimited templates for music videos, brand campaigns, podcasts, and more.">
                    <ProjectTemplatePicker
                      projectId={projectId!}
                      currentUserId={user?.id || ''}
                      onApplied={fetchProjectData}
                    />
                  </FreeTierGate>
                )}
                {activeTab === "ai" && (
                  <FreeTierGate feature="aiBriefs" featureLabel="AI Tools" description="Upgrade to Pro for unlimited AI-powered briefs, automation, and creative tools.">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <AIBriefBuilder
                        projectId={projectId!}
                        projectTitle={project.title}
                        projectDescription={project.description}
                      />
                      <AIAutomation
                        projectId={projectId!}
                        projectTitle={project.title}
                        projectDescription={project.description}
                        onUpdate={fetchProjectData}
                      />
                    </div>
                  </FreeTierGate>
                )}
              </div>
            )}
          </div>

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
                currentUserId={user?.id || ''}
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
