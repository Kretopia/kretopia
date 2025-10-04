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
  Send, 
  Plus,
  ArrowLeft,
  Calendar,
  DollarSign,
  Loader2,
  Image as ImageIcon,
  FileText,
  MoreVertical,
  Paperclip,
  Edit,
  Save,
  Monitor,
  CheckSquare,
  Clock,
  Users
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const { data: tasksData } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (tasksData) setTasks(tasksData);

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
      fetchProjectData();
    } catch (error: any) {
      toast({
        title: "Failed to send",
        description: error.message || "Could not send your message.",
        variant: "destructive",
      });
    }
    setSendingMessage(false);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const isImageFile = (fileType: string) => {
    return fileType?.startsWith('image/');
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
  const renderMobileLayout = () => (
    <div className="flex flex-col h-screen pb-16">
      {/* Mobile Header - Improved touch targets */}
      <div className="border-b px-3 py-3 bg-background sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate leading-tight mb-1">{project.title}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{project.status}</Badge>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{userRole === 'client' ? 'Client' : 'Creator'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <InviteCollaboratorDialog 
              projectId={projectId || ''} 
              onInvite={fetchProjectData}
            />
            <InvoiceGenerator 
              projectId={projectId || ''}
            />
            <ProjectSettings 
              project={project} 
              onUpdate={fetchProjectData}
              userRole={userRole}
            />
          </div>
        </div>
      </div>

      {/* Mobile Tabs - Larger touch targets */}
      <Tabs defaultValue="messages" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b bg-background shadow-sm">
          <TabsList className="w-full justify-around h-16 bg-transparent rounded-none p-0">
            <TabsTrigger value="messages" className="flex-1 gap-1.5 data-[state=active]:bg-primary/5 data-[state=active]:border-b-2 data-[state=active]:border-primary h-full flex-col">
              <Send className="h-5 w-5" />
              <span className="text-xs font-medium">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1 gap-1.5 data-[state=active]:bg-primary/5 data-[state=active]:border-b-2 data-[state=active]:border-primary h-full flex-col">
              <CheckSquare className="h-5 w-5" />
              <span className="text-xs font-medium">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="milestones" className="flex-1 gap-1.5 data-[state=active]:bg-primary/5 data-[state=active]:border-b-2 data-[state=active]:border-primary h-full flex-col">
              <DollarSign className="h-5 w-5" />
              <span className="text-xs font-medium">Pay</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex-1 gap-1.5 data-[state=active]:bg-primary/5 data-[state=active]:border-b-2 data-[state=active]:border-primary h-full flex-col">
              <FileText className="h-5 w-5" />
              <span className="text-xs font-medium">Info</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="messages" className="flex-1 flex flex-col m-0 overflow-hidden">
          <ScrollArea className="flex-1 px-4">
            <div className="py-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-primary/10">
                    <AvatarImage src={msg.profiles?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                      {msg.profiles?.full_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <span className="font-semibold text-sm truncate">{msg.profiles?.full_name || 'User'}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="bg-secondary/50 rounded-2xl rounded-tl-none p-3">
                      <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                      {msg.file_url && (
                        <div className="mt-2">
                          {isImageFile(msg.file_type) ? (
                            <img src={msg.file_url} alt={msg.file_name} className="rounded-lg max-w-full h-auto border border-border" />
                          ) : (
                            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" 
                               className="flex items-center gap-2 p-2.5 bg-background rounded-lg text-sm active:bg-muted border border-border">
                              <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
                              <span className="truncate text-xs">{msg.file_name}</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <div className="border-t p-4 bg-background safe-area-bottom shadow-lg">
            {attachedFile && (
              <div className="mb-3 p-3 bg-primary/5 rounded-xl flex items-center gap-2.5 text-sm border border-primary/20">
                <Paperclip className="h-4 w-4 flex-shrink-0 text-primary" />
                <span className="flex-1 truncate font-medium">{attachedFile.name}</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAttachedFile(null)}>✕</Button>
              </div>
            )}
            <div className="flex gap-2.5">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} />
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-5 w-5" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                className="flex-1 h-12 text-base rounded-xl border-2"
              />
              <Button onClick={handleSendMessage} disabled={sendingMessage} size="icon" className="h-12 w-12 rounded-xl flex-shrink-0">
                {sendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="flex-1 m-0 overflow-auto">
          <TaskBoard tasks={tasks} projectId={projectId!} onUpdate={fetchProjectData} />
        </TabsContent>

        <TabsContent value="milestones" className="flex-1 m-0 overflow-auto">
          <MilestoneBoard 
            milestones={milestones} 
            projectId={projectId!} 
            onUpdate={fetchProjectData}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="details" className="flex-1 m-0 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              <Card className="p-3">
                <h3 className="font-semibold text-sm mb-2">Project Details</h3>
                {project.description && <p className="text-sm mb-3 leading-relaxed">{project.description}</p>}
                {project.budget && (
                  <div className="flex items-center gap-2 text-sm mb-2 p-2 bg-secondary/50 rounded">
                    <DollarSign className="h-4 w-4" />
                    <span>{project.budget}</span>
                  </div>
                )}
                {project.deadline && (
                  <div className="flex items-center gap-2 text-sm p-2 bg-secondary/50 rounded">
                    <Calendar className="h-4 w-4" />
                    <span>Due {new Date(project.deadline).toLocaleDateString()}</span>
                  </div>
                )}
              </Card>
              <Card className="p-3">
                <h3 className="font-semibold text-sm mb-3">Progress</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-secondary/50 rounded">
                    <p className="text-2xl font-bold">{tasks.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Tasks</p>
                  </div>
                  <div className="text-center p-3 bg-secondary/50 rounded">
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

  const renderDesktopLayout = () => (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      <ResizablePanel defaultSize={70} minSize={55}>
        <div className="flex flex-col h-full">
          {/* Compact Header */}
          <div className="border-b px-4 py-3 bg-secondary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/projects')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {isEditingProject ? (
                  <Input
                    value={editedProject?.title || ""}
                    onChange={(e) => setEditedProject({ ...editedProject, title: e.target.value })}
                    className="text-lg font-semibold h-8"
                    placeholder="Project title"
                  />
                ) : (
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-semibold truncate">{project.title}</h1>
                    <p className="text-xs text-muted-foreground">Workspace for {project.title}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="secondary" className="text-xs">{project.status}</Badge>
                <InvoiceGenerator 
                  projectId={projectId || ''}
                />
                <InviteCollaboratorDialog projectId={projectId || ''} onInvite={fetchProjectData} />
                <ProjectSettings 
                  project={project} 
                  onUpdate={fetchProjectData}
                  userRole={userRole}
                />
              </div>
            </div>
          </div>

          {/* Compact Tabs */}
          <Tabs defaultValue="messages" className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b px-3 bg-background">
              <TabsList className="h-10 bg-transparent">
                <TabsTrigger value="messages" className="gap-1.5 text-xs px-3">
                  <Send className="h-3.5 w-3.5" />Messages
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-1.5 text-xs px-3">
                  <CheckSquare className="h-3.5 w-3.5" />Tasks
                </TabsTrigger>
                <TabsTrigger value="milestones" className="gap-1.5 text-xs px-3">
                  <DollarSign className="h-3.5 w-3.5" />Milestones
                </TabsTrigger>
                <TabsTrigger value="files" className="gap-1.5 text-xs px-3">
                  <FileText className="h-3.5 w-3.5" />Files
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="messages" className="flex-1 flex flex-col m-0 overflow-hidden">
              <ScrollArea className="flex-1 px-4">
                <div className="py-3 space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex gap-2.5">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={msg.profiles?.avatar_url} />
                        <AvatarFallback className="text-xs">{msg.profiles?.full_name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="font-semibold text-xs">{msg.profiles?.full_name || 'User'}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        {msg.file_url && (
                          <div className="mt-2">
                            {isImageFile(msg.file_type) ? (
                              <div className="rounded-lg overflow-hidden border max-w-sm">
                                <img src={msg.file_url} alt={msg.file_name} className="w-full h-auto" />
                              </div>
                            ) : (
                              <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                                 className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors text-xs max-w-xs">
                                <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="truncate font-medium">{msg.file_name}</p>
                                  {msg.file_size && <p className="text-xs text-muted-foreground">{formatFileSize(msg.file_size)}</p>}
                                </div>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="border-t p-3 bg-background">
                {attachedFile && (
                  <div className="mb-2 p-2 bg-secondary rounded-lg flex items-center gap-2 text-xs">
                    <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="flex-1 truncate">{attachedFile.name}</span>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setAttachedFile(null)}>Remove</Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} />
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="flex-1 h-9 text-sm"
                  />
                  <Button onClick={handleSendMessage} disabled={sendingMessage} size="icon" className="h-9 w-9">
                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="flex-1 m-0 p-3 overflow-auto">
              <TaskBoard tasks={tasks} projectId={projectId!} onUpdate={fetchProjectData} />
            </TabsContent>

            <TabsContent value="milestones" className="flex-1 m-0 p-3 overflow-auto">
              <MilestoneBoard 
                milestones={milestones} 
                projectId={projectId!} 
                onUpdate={fetchProjectData}
                userRole={userRole}
              />
            </TabsContent>

            <TabsContent value="files" className="flex-1 m-0 overflow-auto">
              <ScrollArea className="h-full">
                <div className="p-3">
                  {files.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No files yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {files.map((file) => (
                        <Card key={file.id} className="p-3 hover:bg-accent/50 transition-colors">
                          <div className="flex items-start gap-2">
                            {isImageFile(file.file_type) ? (
                              <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <a href={file.file_url} target="_blank" rel="noopener noreferrer" 
                                 className="font-medium text-xs hover:underline truncate block">
                                {file.file_name}
                              </a>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {file.profiles?.full_name} • {formatFileSize(file.file_size || 0)}
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
          </Tabs>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={30} minSize={25}>
        <div className="h-full overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {/* Time Tracker */}
              <TimeTracker projectId={projectId!} />

              {/* AI Task Assistant */}
              <AIAutomation 
                projectId={projectId!}
                projectTitle={project.title}
                projectDescription={project.description}
                onUpdate={fetchProjectData}
              />

              {/* Quick Tasks */}
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5" />
                    Quick Tasks
                  </h3>
                  <CreateTaskDialog projectId={projectId!} onSuccess={fetchProjectData} />
                </div>
                {tasks.slice(0, 4).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No tasks yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {tasks.slice(0, 4).map((task) => (
                      <TaskItem key={task.id} task={task} onUpdate={fetchProjectData} compact />
                    ))}
                  </div>
                )}
              </Card>

              {/* Recent Files */}
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Recent Files
                  </h3>
                  <FileUploadDialog projectId={projectId!} onSuccess={fetchProjectData} />
                </div>
                {files.slice(0, 3).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No files yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {files.slice(0, 3).map((file) => (
                      <a key={file.id} href={file.file_url} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 transition-colors">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate font-medium">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size || 0)}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </Card>

              {/* Project Details */}
              {!isEditingProject && (
                <Card className="p-3">
                  <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <Monitor className="h-3.5 w-3.5" />
                    Project Details
                  </h3>
                  <div className="space-y-2 text-xs">
                    {project.budget && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{project.budget}</span>
                      </div>
                    )}
                    {project.deadline && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Due {new Date(project.deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="pt-2 grid grid-cols-2 gap-2 text-center border-t">
                      <div>
                        <p className="text-lg font-semibold">{tasks.length}</p>
                        <p className="text-muted-foreground">Tasks</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{milestones.length}</p>
                        <p className="text-muted-foreground">Milestones</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      {isMobile ? renderMobileLayout() : renderDesktopLayout()}
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
