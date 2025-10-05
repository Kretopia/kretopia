import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Plus,
  ArrowLeft,
  Calendar,
  DollarSign,
  Loader2,
  Image as ImageIcon,
  FileText,
  CheckSquare,
  Clock,
  Users,
  Monitor,
  Send,
  Search
} from "lucide-react";

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
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editedProject, setEditedProject] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }

    // Check for payment success/failure in URL
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const milestoneId = params.get('milestone');
    const useEscrow = params.get('escrow') === 'true';

    if (paymentStatus === 'success' && milestoneId) {
      // Fetch the payment intent from the milestone
      const updateMilestonePayment = async () => {
        try {
          // First get the checkout session to retrieve payment intent
          const checkoutSessionId = params.get('session_id');
          
          if (useEscrow) {
            // For escrow, we need to get the payment intent ID
            const { data: sessionData, error: sessionError } = await supabase.functions.invoke('get-payment-intent', {
              body: { sessionId: checkoutSessionId },
            });

            if (!sessionError && sessionData?.paymentIntentId) {
              // Update milestone with payment intent for escrow
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
            // Regular payment - mark as paid immediately
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

      // Clean URL
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

    // Fetch user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (profileData) setUserProfile(profileData);

    // Fetch project
    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectData) {
      setProject(projectData);

      // Determine user role (creator is client who pays, others are creators/freelancers)
      setUserRole(projectData.created_by === user.id ? 'client' : 'creator');

      // Fetch messages with file info
      const { data: messagesData } = await supabase
        .from('project_messages')
        .select('*, profiles(full_name, avatar_url)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (messagesData) setMessages(messagesData);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        toast({ title: "Error loading tasks", description: tasksError.message, variant: "destructive" });
      }
      if (tasksData) {
        console.log('Fetched tasks:', tasksData);
        setTasks(tasksData);
      }

      // Fetch milestones
      const { data: milestonesData } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (milestonesData) setMilestones(milestonesData);

      // Fetch files
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

      // Upload file if attached
      if (attachedFile) {
        // Validate file size (max 50MB for MVP)
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

        // Also add to project_files table for tracking
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
      
      // Scroll to bottom after sending
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
      // Validate file size
      const maxSize = 50 * 1024 * 1024; // 50MB
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

  const isImageFile = (fileType: string) => {
    return fileType?.startsWith('image/');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSaveProject = async () => {
    if (!editedProject) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          title: editedProject.title,
          description: editedProject.description,
          budget: editedProject.budget,
          deadline: editedProject.deadline,
          status: editedProject.status,
        })
        .eq('id', projectId);

      if (error) throw error;

      setProject(editedProject);
      setIsEditingProject(false);
      toast({
        title: "Project saved! 🎉",
        description: "Your changes have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEditing = () => {
    setEditedProject({ ...project });
    setIsEditingProject(true);
  };


  // Responsive rendering
  const renderTabletLayout = () => (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Modern Tablet Header */}
      <div className="border-b px-6 py-4 bg-card/50 backdrop-blur flex-shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 hover:bg-muted" 
            onClick={() => navigate('/projects')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{project.title}</h1>
            <p className="text-sm text-muted-foreground truncate">{project.description || "Workspace"}</p>
          </div>
          <Avatar className="h-9 w-9">
            <AvatarImage src={userProfile?.avatar_url} />
            <AvatarFallback className="text-sm bg-primary text-primary-foreground">
              {userProfile?.full_name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
        <Input 
          placeholder="Search..."
          className="bg-muted/50 border-0 h-10"
        />
      </div>

      {/* Modern Tablet Tabs */}
      <Tabs defaultValue="tasks" className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="border-b bg-background flex-shrink-0 px-6">
          <TabsList className="w-full justify-start h-12 bg-transparent rounded-none p-0 gap-6">
            <TabsTrigger 
              value="messages" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 gap-2"
            >
              <Send className="h-4 w-4" />
              <span className="font-medium">Messages</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              <span className="font-medium">Tasks</span>
            </TabsTrigger>
            <TabsTrigger 
              value="milestones" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 gap-2"
            >
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">Milestones</span>
            </TabsTrigger>
            <TabsTrigger 
              value="details" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 gap-2"
            >
              <FileText className="h-4 w-4" />
              <span className="font-medium">Details</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="messages" className="flex-1 m-0 p-0 overflow-hidden flex flex-col min-h-0">
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
            compact={false}
          />
        </TabsContent>

        <TabsContent value="tasks" className="flex-1 m-0 p-0 overflow-auto min-h-0">
          <div className="p-2">
            <TaskBoard tasks={tasks} projectId={projectId!} onUpdate={fetchProjectData} />
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="flex-1 m-0 p-0 overflow-auto min-h-0">
          <div className="p-2">
            <MilestoneBoard 
              milestones={milestones} 
              projectId={projectId!} 
              onUpdate={fetchProjectData}
              userRole={userRole}
            />
          </div>
        </TabsContent>

        <TabsContent value="details" className="flex-1 m-0 p-0 overflow-auto min-h-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Quick Actions */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <InviteCollaboratorDialog 
                    projectId={projectId || ''} 
                    onInvite={fetchProjectData}
                  />
                  <InvoiceGenerator 
                    projectId={projectId || ''}
                  />
                </div>
              </Card>

              {/* Pending Invitations */}
              <PendingInvitations projectId={projectId} />

              {/* Project Info */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">About Project</h3>
                {project.description && <p className="text-sm mb-3 leading-relaxed text-muted-foreground">{project.description}</p>}
                <div className="space-y-2">
                  {project.budget && (
                    <div className="flex items-center gap-2 text-sm p-2 bg-secondary/30 rounded">
                      <DollarSign className="h-4 w-4" />
                      <span>{project.budget}</span>
                    </div>
                  )}
                  {project.deadline && (
                    <div className="flex items-center gap-2 text-sm p-2 bg-secondary/30 rounded">
                      <Calendar className="h-4 w-4" />
                      <span>Due {new Date(project.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Stats */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3">Progress</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-secondary/30 rounded">
                    <p className="text-2xl font-bold">{tasks.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Tasks</p>
                  </div>
                  <div className="text-center p-3 bg-secondary/30 rounded">
                    <p className="text-2xl font-bold">{milestones.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Milestones</p>
                  </div>
                </div>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderMobileLayout = () => (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      {/* Modern Mobile Header */}
      <div className="border-b px-4 py-3 bg-card/50 backdrop-blur flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 hover:bg-muted" 
            onClick={() => navigate('/projects')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">{project.title}</h1>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarImage src={userProfile?.avatar_url} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {userProfile?.full_name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
        <Input 
          placeholder="Search..."
          className="bg-muted/50 border-0 h-9 text-sm"
        />
      </div>

      {/* Modern Mobile Tabs */}
      <Tabs defaultValue="tasks" className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="border-b bg-background flex-shrink-0">
          <TabsList className="w-full justify-around h-12 bg-transparent rounded-none p-0">
            <TabsTrigger 
              value="messages" 
              className="flex-1 gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary h-full flex-col py-2 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent"
            >
              <Send className="h-4 w-4" />
              <span className="text-xs font-medium">Chat</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="flex-1 gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary h-full flex-col py-2 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent"
            >
              <CheckSquare className="h-4 w-4" />
              <span className="text-xs font-medium">Tasks</span>
            </TabsTrigger>
            <TabsTrigger 
              value="milestones" 
              className="flex-1 gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary h-full flex-col py-2 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent"
            >
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Pay</span>
            </TabsTrigger>
            <TabsTrigger 
              value="details" 
              className="flex-1 gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary h-full flex-col py-2 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent"
            >
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium">More</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="messages" className="flex-1 m-0 p-0 overflow-hidden flex flex-col min-h-0">
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
            compact={false}
          />
        </TabsContent>

        <TabsContent value="tasks" className="flex-1 m-0 p-0 overflow-auto min-h-0">
          <div className="p-2">
            <TaskBoard tasks={tasks} projectId={projectId!} onUpdate={fetchProjectData} />
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="flex-1 m-0 p-0 overflow-auto min-h-0">
          <div className="p-2">
            <MilestoneBoard 
              milestones={milestones} 
              projectId={projectId!} 
              onUpdate={fetchProjectData}
              userRole={userRole}
            />
          </div>
        </TabsContent>

        <TabsContent value="details" className="flex-1 m-0 p-0 overflow-auto min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {/* Quick Actions */}
              <Card className="p-3">
                <h3 className="font-semibold text-xs mb-2.5 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <InviteCollaboratorDialog 
                    projectId={projectId || ''} 
                    onInvite={fetchProjectData}
                  />
                  <InvoiceGenerator 
                    projectId={projectId || ''}
                  />
                </div>
              </Card>

              {/* Project Info */}
              <Card className="p-3">
                <h3 className="font-semibold text-xs mb-2">About Project</h3>
                {project.description && <p className="text-xs mb-2.5 leading-relaxed text-muted-foreground">{project.description}</p>}
                <div className="space-y-1.5">
                  {project.budget && (
                    <div className="flex items-center gap-2 text-xs p-1.5 bg-secondary/30 rounded">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>{project.budget}</span>
                    </div>
                  )}
                  {project.deadline && (
                    <div className="flex items-center gap-2 text-xs p-1.5 bg-secondary/30 rounded">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Due {new Date(project.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Stats */}
              <Card className="p-3">
                <h3 className="font-semibold text-xs mb-2.5">Progress</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2.5 bg-secondary/30 rounded">
                    <p className="text-xl font-bold">{tasks.length}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Tasks</p>
                  </div>
                  <div className="text-center p-2.5 bg-secondary/30 rounded">
                    <p className="text-xl font-bold">{milestones.length}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Milestones</p>
                  </div>
                </div>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderDesktopLayout = () => (
    <div className="h-screen flex flex-col bg-background">
      {/* Modern Header */}
      <div className="border-b bg-card/50 backdrop-blur px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 hover:bg-muted" 
              onClick={() => navigate('/projects')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 max-w-md">
              <Input 
                placeholder="Search..."
                className="bg-muted/50 border-0 h-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <NotificationBell projectId={projectId || ''} />
            <Avatar className="h-8 w-8">
              <AvatarImage src={userProfile?.avatar_url} />
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {userProfile?.full_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={70} minSize={50}>
          <div className="flex flex-col h-full">
            {/* Project Header */}
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold">{project.title}</h1>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New
                  </Button>
                  <ProjectSettings 
                    project={project} 
                    onUpdate={fetchProjectData}
                    userRole={userRole}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{project.description || "Workspace for collaboration"}</p>
              
              <Tabs defaultValue="messages" className="w-full">
                <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-auto p-0 gap-6">
                  <TabsTrigger 
                    value="messages" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3"
                  >
                    Messages
                  </TabsTrigger>
                  <TabsTrigger 
                    value="tasks" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3"
                  >
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger 
                    value="files" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3"
                  >
                    Files
                  </TabsTrigger>
                  <TabsTrigger 
                    value="board" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3"
                  >
                    Board
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="messages" className="m-0 h-full">
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
                      compact={false}
                    />
                  </TabsContent>

                  <TabsContent value="tasks" className="m-0 mt-4">
                    <ScrollArea className="h-[calc(100vh-280px)]">
                      <div className="px-6">
                        <TaskBoard tasks={tasks} projectId={projectId!} onUpdate={fetchProjectData} />
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="files" className="m-0 mt-4">
                    <ScrollArea className="h-[calc(100vh-280px)]">
                      <div className="px-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Files</h3>
                          <FileUploadDialog projectId={projectId} onSuccess={fetchProjectData} />
                        </div>
                        {files.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No files yet</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {files.map((file) => (
                              <Card key={file.id} className="p-4 hover:bg-muted/50 transition-colors border-muted">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded bg-muted">
                                    {isImageFile(file.file_type) ? (
                                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                      <FileText className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <a 
                                      href={file.file_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="font-medium text-sm hover:underline truncate block"
                                    >
                                      {file.file_name}
                                    </a>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {formatFileSize(file.file_size || 0)}
                                    </p>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="board" className="m-0 mt-4">
                    <ScrollArea className="h-[calc(100vh-280px)]">
                      <div className="px-6">
                        <MilestoneBoard 
                          milestones={milestones} 
                          projectId={projectId!} 
                          onUpdate={fetchProjectData}
                          userRole={userRole}
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
          <div className="h-full border-l bg-card/30">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Quick Actions */}
                <Card className="border-muted bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Tasks</span>
                      <CreateTaskDialog projectId={projectId} onSuccess={fetchProjectData} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {tasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No tasks yet</p>
                    ) : (
                      tasks.slice(0, 5).map((task: any) => (
                        <TaskItem key={task.id} task={task} onUpdate={fetchProjectData} compact={true} />
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Files Quick View */}
                <Card className="border-muted bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Files</span>
                      <FileUploadDialog projectId={projectId} onSuccess={fetchProjectData} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {files.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No files yet</p>
                    ) : (
                      files.slice(0, 3).map((file: any) => (
                        <a 
                          key={file.id}
                          href={file.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors"
                        >
                          <div className="p-1.5 rounded bg-muted">
                            {isImageFile(file.file_type) ? (
                              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{file.file_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatFileSize(file.file_size || 0)}
                            </p>
                          </div>
                        </a>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Pending Invitations */}
                <PendingInvitations projectId={projectId} />

                {/* Activity Timeline */}
                <ActivityTimeline projectId={projectId!} />

                {/* Time Tracker */}
                <TimeTracker projectId={projectId!} />

                {/* Quick Invite */}
                <Card className="border-muted bg-card">
                  <CardContent className="pt-4">
                    <InviteCollaboratorDialog projectId={projectId || ''} onInvite={fetchProjectData} />
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading workspace...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center gap-4 p-4">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Project Not Found</h2>
          <p className="text-muted-foreground">This project doesn't exist or you don't have access to it.</p>
        </div>
        <Button onClick={() => navigate('/projects')} size="lg">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>
    );
  }

  // Improved responsive logic for tablets
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 640 && window.innerWidth < 1024;
  
  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      {isMobile ? renderMobileLayout() : isTablet ? renderTabletLayout() : renderDesktopLayout()}
    </div>
  );
};


// Task Item Component
const TaskItem = ({ task, onUpdate, compact = false }: any) => {
  const { toast } = useToast();

  const updateTaskStatus = async (newStatus: string) => {
    const { error } = await supabase
      .from('project_tasks')
      .update({ status: newStatus })
      .eq('id', task.id);

    if (error) {
      toast({
        title: "Failed to update",
        variant: "destructive",
      });
    } else {
      onUpdate();
    }
  };

  if (compact) {
    return (
      <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={(e) => updateTaskStatus(e.target.checked ? 'completed' : 'todo')}
          className="mt-1 h-4 w-4 rounded border-border"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
          {task.due_date && (
            <p className="text-xs text-muted-foreground">
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <p className="font-medium">{task.title}</p>
        {task.description && (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        )}
        {task.due_date && (
          <p className="text-xs text-muted-foreground mt-1">
            Due: {new Date(task.due_date).toLocaleDateString()}
          </p>
        )}
      </div>
      <Select value={task.status} onValueChange={updateTaskStatus}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todo">To Do</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

// Create Task Dialog
const CreateTaskDialog = ({ projectId, onSuccess }: any) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!title.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('project_tasks')
      .insert({
        project_id: projectId,
        title,
        description,
        due_date: dueDate || null,
        created_by: user?.id,
      });

    if (error) {
      toast({
        title: "Failed to create task",
        variant: "destructive",
      });
    } else {
      setTitle("");
      setDescription("");
      setDueDate("");
      setOpen(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details..." />
          </div>
          <div>
            <Label>Due Date (optional)</Label>
            <Input 
              type="date" 
              value={dueDate} 
              onChange={(e) => setDueDate(e.target.value)} 
            />
          </div>
          <Button onClick={handleCreate} className="w-full">Create Task</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// File Upload Dialog
const FileUploadDialog = ({ projectId, onSuccess }: any) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [storageInfo, setStorageInfo] = useState<{used: number, limit: number} | null>(null);
  const { toast } = useToast();

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file limit

  useEffect(() => {
    if (open) {
      fetchStorageInfo();
    }
  }, [open]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const fetchStorageInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('storage_used_bytes, storage_limit_bytes')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      setStorageInfo({
        used: profile.storage_used_bytes || 0,
        limit: profile.storage_limit_bytes || 1073741824
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}. Your file is ${formatFileSize(file.size)}.`,
        variant: "destructive",
      });
      e.target.value = '';
      setSelectedFile(null);
      return;
    }

    // Check storage availability
    if (storageInfo && (storageInfo.used + file.size) > storageInfo.limit) {
      const availableSpace = storageInfo.limit - storageInfo.used;
      toast({
        title: "Not enough storage",
        description: `You need ${formatFileSize(file.size)} but only have ${formatFileSize(availableSpace)} available. Upgrade your plan for more storage.`,
        variant: "destructive",
      });
      e.target.value = '';
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to upload files.",
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    const filePath = `${projectId}/${Date.now()}-${selectedFile.name}`;

    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Upload failed",
          description: uploadError.message || "Failed to upload file to storage.",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          user_id: user.id,
          file_name: selectedFile.name,
          file_url: data.publicUrl,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        toast({
          title: "Failed to save file",
          description: dbError.message || "File uploaded but could not be saved to database.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success! 🎉",
          description: `${selectedFile.name} (${formatFileSize(selectedFile.size)}) uploaded successfully.`,
        });
        setSelectedFile(null);
        setOpen(false);
        onSuccess();
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast({
        title: "Unexpected error",
        description: error.message || "An unexpected error occurred during upload.",
        variant: "destructive",
      });
    }
    
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setSelectedFile(null);
      }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {storageInfo && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Storage Used</span>
                <span className="font-medium">
                  {formatFileSize(storageInfo.used)} / {formatFileSize(storageInfo.limit)}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((storageInfo.used / storageInfo.limit) * 100, 100)}%` }}
                />
              </div>
              {(storageInfo.used / storageInfo.limit) > 0.8 && (
                <p className="text-sm text-amber-600">
                  ⚠️ You're running low on storage. Consider upgrading your plan.
                </p>
              )}
            </div>
          )}
          <div>
            <Label>Select File (Max {formatFileSize(MAX_FILE_SIZE)})</Label>
            <Input
              type="file"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </div>
          {selectedFile && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>File:</strong> {selectedFile.name}</p>
              <p><strong>Size:</strong> {formatFileSize(selectedFile.size)}</p>
              <p><strong>Type:</strong> {selectedFile.type || 'Unknown'}</p>
            </div>
          )}
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading...</span>
            </div>
          )}
          <Button 
            onClick={handleFileUpload} 
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            {uploading ? "Uploading..." : "Upload File"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ThriveDesk;
