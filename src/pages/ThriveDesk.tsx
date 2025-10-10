import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TaskBoard } from "@/components/project/TaskBoard";
import { MilestoneBoard } from "@/components/project/MilestoneBoard";
import { AIAutomation } from "@/components/project/AIAutomation";
import { TimeTracker } from "@/components/project/TimeTracker";
import { InviteCollaboratorDialog } from "@/components/project/InviteCollaboratorDialog";
import { InvoiceGenerator } from "@/components/project/InvoiceGenerator";
import { ProjectSettings } from "@/components/project/ProjectSettings";
import { MessagePanel } from "@/components/project/MessagePanel";
import { ActivityTimeline } from "@/components/project/ActivityTimeline";
import { NotificationBell } from "@/components/project/NotificationBell";
import { ProjectPresence } from "@/components/project/ProjectPresence";
import { PostAsOpportunityDialog } from "@/components/project/PostAsOpportunityDialog";
import { PendingInvitations } from "@/components/project/PendingInvitations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Plus,
  ArrowLeft,
  Calendar,
  DollarSign,
  Loader2,
  FileText,
  CheckSquare,
  Clock,
  Users,
  Send,
  Search,
  Settings,
  LayoutDashboard,
  MessageSquare,
  FolderKanban,
  BarChart3,
  Sparkles,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const ThriveDesk = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<'creator' | 'client'>('creator');
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeView, setActiveView] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }

    // Payment handling
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const milestoneId = params.get('milestone');
    const useEscrow = params.get('escrow') === 'true';

    if (paymentStatus === 'success' && milestoneId) {
      const updateMilestonePayment = async () => {
        try {
          const checkoutSessionId = params.get('session_id');
          
          if (useEscrow) {
            const { data: sessionData, error: sessionError } = await supabase.functions.invoke('get-payment-intent', {
              body: { sessionId: checkoutSessionId },
            });

            if (!sessionError && sessionData?.paymentIntentId) {
              const { error } = await supabase
                .from('milestones')
                .update({ 
                  status: 'pending',
                  escrow_status: 'authorized',
                  payment_intent_id: sessionData.paymentIntentId,
                })
                .eq('id', milestoneId);

              if (error) throw error;
              toast({
                title: "Escrow secured! 🔒",
                description: "Funds are held safely. They'll be released when you approve the work.",
              });
            }
          } else {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
              .from('milestones')
              .update({ 
                status: 'paid', 
                paid_at: new Date().toISOString(),
                paid_to: user?.id,
                escrow_status: 'none',
              })
              .eq('id', milestoneId);

            if (error) throw error;
            toast({
              title: "Payment successful! 💰",
              description: "Milestone has been marked as paid.",
            });
          }

          fetchProjectData();
        } catch (error: any) {
          console.error('Error updating milestone:', error);
          toast({
            title: "Payment received",
            description: "But failed to update milestone status. Please contact support.",
            variant: "destructive",
          });
        }
      };
      updateMilestonePayment();
      window.history.replaceState({}, '', `/desk/${projectId}`);
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: "Payment cancelled",
        description: "You can retry the payment anytime.",
      });
      window.history.replaceState({}, '', `/desk/${projectId}`);
    }
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time subscriptions
  useEffect(() => {
    if (!projectId) return;

    const messagesChannel = supabase
      .channel(`project-messages-${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_messages',
        filter: `project_id=eq.${projectId}`
      }, () => {
        fetchProjectData();
      })
      .subscribe();

    const tasksChannel = supabase
      .channel(`project-tasks-${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_tasks',
        filter: `project_id=eq.${projectId}`
      }, () => {
        fetchProjectData();
      })
      .subscribe();

    const filesChannel = supabase
      .channel(`project-files-${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_files',
        filter: `project_id=eq.${projectId}`
      }, () => {
        fetchProjectData();
      })
      .subscribe();

    const milestonesChannel = supabase
      .channel(`project-milestones-${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'milestones',
        filter: `project_id=eq.${projectId}`
      }, () => {
        fetchProjectData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(filesChannel);
      supabase.removeChannel(milestonesChannel);
    };
  }, [projectId]);

  const fetchProjectData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (profileData) setUserProfile(profileData);

    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectData) {
      setProject(projectData);
      setUserRole(projectData.created_by === user.id ? 'client' : 'creator');

      const { data: messagesData } = await supabase
        .from('project_messages')
        .select('*, profiles(full_name, avatar_url)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (messagesData) setMessages(messagesData);

      const { data: tasksData } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (tasksData) setTasks(tasksData);

      const { data: milestonesData } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (milestonesData) setMilestones(milestonesData);

      const { data: filesData } = await supabase
        .from('project_files')
        .select('*, profiles(full_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (filesData) setFiles(filesData);
    }

    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !attachedFile) return;

    setSendingMessage(true);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      let fileUrl = null;
      let fileName = null;
      let fileSize = null;
      let fileType = null;

      if (attachedFile) {
        const maxSize = 50 * 1024 * 1024;
        if (attachedFile.size > maxSize) {
          throw new Error(`File size must be less than 50MB`);
        }

        const filePath = `${projectId}/${Date.now()}-${attachedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, attachedFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('project-files')
          .getPublicUrl(filePath);

        fileUrl = data.publicUrl;
        fileName = attachedFile.name;
        fileSize = attachedFile.size;
        fileType = attachedFile.type;

        await supabase.from('project_files').insert({
          project_id: projectId,
          user_id: user?.id,
          file_name: fileName,
          file_url: fileUrl,
          file_size: fileSize,
          file_type: fileType,
        });
      }

      const { error } = await supabase
        .from('project_messages')
        .insert({
          project_id: projectId,
          user_id: user?.id,
          message: newMessage || (attachedFile ? `Shared ${attachedFile.name}` : ''),
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          file_type: fileType,
        });

      if (error) throw error;

      setNewMessage("");
      setAttachedFile(null);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error: any) {
      toast({
        title: "Failed to send",
        description: error.message || "Could not send your message.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Maximum file size is 50MB",
          variant: "destructive",
        });
        return;
      }
      setAttachedFile(file);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'messages', label: 'Messages', icon: MessageSquare, count: messages.length },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: tasks.length },
    { id: 'milestones', label: 'Milestones', icon: DollarSign, count: milestones.length },
    { id: 'files', label: 'Files', icon: FileText, count: files.length },
    { id: 'time', label: 'Time Tracking', icon: Clock },
    { id: 'activity', label: 'Activity', icon: BarChart3 },
    { id: 'automation', label: 'AI Automation', icon: Sparkles },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Mobile Header */}
        <div className="flex-shrink-0 bg-card border-b px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/projects')}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">{project.title}</h1>
              <p className="text-xs text-muted-foreground truncate">{project.description || "Project workspace"}</p>
            </div>
            <NotificationBell projectId={projectId || ''} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-9 w-9"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {sidebarOpen && (
          <div className="flex-shrink-0 bg-card border-b">
            <ScrollArea className="h-64">
              <div className="p-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant={activeView === item.id ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start mb-1",
                        activeView === item.id && "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                      onClick={() => {
                        setActiveView(item.id);
                        setSidebarOpen(false);
                      }}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.count !== undefined && item.count > 0 && (
                        <span className="text-xs bg-primary/20 px-2 py-0.5 rounded-full">
                          {item.count}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              {activeView === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-card rounded-lg p-4 border">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckSquare className="h-4 w-4 text-primary" />
                        <p className="text-xs text-muted-foreground">Tasks</p>
                      </div>
                      <p className="text-2xl font-bold">{tasks.length}</p>
                    </div>
                    <div className="bg-card rounded-lg p-4 border">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <p className="text-xs text-muted-foreground">Milestones</p>
                      </div>
                      <p className="text-2xl font-bold">{milestones.length}</p>
                    </div>
                  </div>
                  <PendingInvitations projectId={projectId || ''} />
                  <ProjectPresence projectId={projectId || ''} />
                  <InviteCollaboratorDialog projectId={projectId || ''} onInvite={fetchProjectData} />
                  <PostAsOpportunityDialog projectId={projectId || ''} projectTitle={project.title} />
                </div>
              )}
              
              {activeView === 'messages' && (
                <MessagePanel
                  messages={messages}
                  newMessage={newMessage}
                  setNewMessage={setNewMessage}
                  attachedFile={attachedFile}
                  setAttachedFile={setAttachedFile}
                  sendingMessage={sendingMessage}
                  onSendMessage={handleSendMessage}
                  onFileAttach={handleFileAttach}
                  messagesEndRef={messagesEndRef}
                />
              )}
              
              {activeView === 'tasks' && (
                <TaskBoard tasks={tasks} projectId={projectId || ''} onUpdate={fetchProjectData} />
              )}
              
              {activeView === 'milestones' && (
                <MilestoneBoard milestones={milestones} projectId={projectId || ''} userRole={userRole} onUpdate={fetchProjectData} />
              )}
              
              {activeView === 'files' && (
                <div className="space-y-3">
                  {files.map((file) => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-card rounded-lg border hover:bg-accent transition-colors"
                    >
                      <FileText className="h-5 w-5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
              
              {activeView === 'time' && <TimeTracker projectId={projectId || ''} />}
              {activeView === 'activity' && <ActivityTimeline projectId={projectId || ''} />}
              {activeView === 'automation' && <AIAutomation projectId={projectId || ''} projectTitle={project.title} onUpdate={fetchProjectData} />}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-card border-r flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <Button 
            variant="ghost" 
            className="w-full justify-start mb-3 h-9"
            onClick={() => navigate('/projects')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {userProfile?.full_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{project.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {userRole === 'client' ? 'Client' : 'Creator'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeView === item.id ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start mb-1 transition-all",
                    activeView === item.id && "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                  onClick={() => setActiveView(item.id)}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-xs bg-primary/20 px-2 py-0.5 rounded-full font-medium">
                      {item.count}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-3 border-t">
          <ProjectSettings project={project} onUpdate={fetchProjectData} userRole={userRole} />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex-shrink-0 h-14 border-b bg-card/50 backdrop-blur-sm flex items-center px-6 gap-4">
          <div className="flex-1 flex items-center gap-3">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search anything..."
                className="pl-10 h-9 bg-background/50 border-border/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ProjectPresence projectId={projectId || ''} />
            <NotificationBell projectId={projectId || ''} />
            <Separator orientation="vertical" className="h-6" />
            <InviteCollaboratorDialog projectId={projectId || ''} onInvite={fetchProjectData} />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              {activeView === 'overview' && (
                <div className="space-y-6 max-w-7xl mx-auto">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Project Overview</h2>
                    <p className="text-muted-foreground">{project.description || "Manage your project workspace"}</p>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-card rounded-xl p-5 border hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <CheckSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{tasks.length}</p>
                          <p className="text-xs text-muted-foreground">Active Tasks</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-card rounded-xl p-5 border hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{milestones.length}</p>
                          <p className="text-xs text-muted-foreground">Milestones</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-card rounded-xl p-5 border hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{messages.length}</p>
                          <p className="text-xs text-muted-foreground">Messages</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-card rounded-xl p-5 border hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{files.length}</p>
                          <p className="text-xs text-muted-foreground">Files</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 space-y-4">
                      <div className="bg-card rounded-xl border p-5">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 text-primary" />
                          Recent Tasks
                        </h3>
                        <TaskBoard tasks={tasks.slice(0, 5)} projectId={projectId || ''} onUpdate={fetchProjectData} />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <PendingInvitations projectId={projectId || ''} />
                      <PostAsOpportunityDialog projectId={projectId || ''} projectTitle={project.title} />
                    </div>
                  </div>
                </div>
              )}
              
              {activeView === 'messages' && (
                <div className="h-[calc(100vh-12rem)] max-w-5xl mx-auto">
                  <div className="bg-card rounded-xl border h-full flex flex-col">
                    <div className="p-4 border-b">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Messages
                      </h2>
                    </div>
                    <MessagePanel
                      messages={messages}
                      newMessage={newMessage}
                      setNewMessage={setNewMessage}
                      attachedFile={attachedFile}
                      setAttachedFile={setAttachedFile}
                      sendingMessage={sendingMessage}
                      onSendMessage={handleSendMessage}
                      onFileAttach={handleFileAttach}
                      messagesEndRef={messagesEndRef}
                      compact={true}
                    />
                  </div>
                </div>
              )}
              
              {activeView === 'tasks' && (
                <div className="max-w-7xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-1">Tasks</h2>
                    <p className="text-muted-foreground">Manage and track your project tasks</p>
                  </div>
                  <TaskBoard tasks={tasks} projectId={projectId || ''} onUpdate={fetchProjectData} />
                </div>
              )}
              
              {activeView === 'milestones' && (
                <div className="max-w-7xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-1">Milestones & Payments</h2>
                    <p className="text-muted-foreground">Track project milestones and manage payments</p>
                  </div>
                  <MilestoneBoard milestones={milestones} projectId={projectId || ''} userRole={userRole} onUpdate={fetchProjectData} />
                </div>
              )}
              
              {activeView === 'files' && (
                <div className="max-w-5xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-1">Files</h2>
                    <p className="text-muted-foreground">All project files and documents</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {files.map((file) => (
                      <a
                        key={file.id}
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-card rounded-xl p-4 border hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(file.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {activeView === 'time' && (
                <div className="max-w-5xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-1">Time Tracking</h2>
                    <p className="text-muted-foreground">Track time spent on project tasks</p>
                  </div>
                  <TimeTracker projectId={projectId || ''} />
                </div>
              )}
              
              {activeView === 'activity' && (
                <div className="max-w-5xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-1">Activity Timeline</h2>
                    <p className="text-muted-foreground">Recent project activity and updates</p>
                  </div>
                  <ActivityTimeline projectId={projectId || ''} />
                </div>
              )}
              
              {activeView === 'automation' && (
                <div className="max-w-5xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-1">AI Automation</h2>
                    <p className="text-muted-foreground">Automate tasks with AI assistance</p>
                  </div>
                  <AIAutomation projectId={projectId || ''} projectTitle={project.title} onUpdate={fetchProjectData} />
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
};

export default ThriveDesk;
