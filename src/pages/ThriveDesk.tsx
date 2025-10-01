import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskBoard } from "@/components/project/TaskBoard";
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
  const [files, setFiles] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editedProject, setEditedProject] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
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

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(filesChannel);
    };
  }, [projectId]);

  const fetchProjectData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch project
    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectData) {
      setProject(projectData);

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
    <div className="flex flex-col h-screen">
      {/* Mobile Header */}
      <div className="border-b px-4 py-3 bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{project.title}</h1>
            <Badge variant="secondary" className="text-xs">{project.status}</Badge>
          </div>
        </div>
      </div>

      {/* Mobile Tabs */}
      <Tabs defaultValue="messages" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-2 bg-background">
          <TabsList className="w-full justify-start h-12 bg-transparent">
            <TabsTrigger value="messages" className="gap-1.5 text-xs">
              <Send className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5 text-xs">
              <CheckSquare className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Details</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="messages" className="flex-1 flex flex-col m-0 overflow-hidden">
          <ScrollArea className="flex-1 px-4">
            <div className="py-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <div className="flex gap-2">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={msg.profiles?.avatar_url} />
                      <AvatarFallback>{msg.profiles?.full_name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm truncate">{msg.profiles?.full_name || 'User'}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                      {msg.file_url && (
                        <div className="mt-2">
                          {isImageFile(msg.file_type) ? (
                            <img src={msg.file_url} alt={msg.file_name} className="rounded-lg max-w-full h-auto" />
                          ) : (
                            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" 
                               className="flex items-center gap-2 p-2 bg-secondary rounded-lg text-sm">
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{msg.file_name}</span>
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
          <div className="border-t p-3 bg-background">
            {attachedFile && (
              <div className="mb-2 p-2 bg-secondary rounded-lg flex items-center gap-2 text-sm">
                <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="flex-1 truncate">{attachedFile.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setAttachedFile(null)}>Remove</Button>
              </div>
            )}
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} />
              <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                className="flex-1 text-sm"
              />
              <Button onClick={handleSendMessage} disabled={sendingMessage} size="icon">
                {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="flex-1 m-0 p-3 overflow-auto">
          <TaskBoard tasks={tasks} projectId={projectId!} onUpdate={fetchProjectData} />
        </TabsContent>

        <TabsContent value="details" className="flex-1 m-0 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Project Details</h3>
                {project.description && <p className="text-sm mb-3">{project.description}</p>}
                {project.budget && (
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <DollarSign className="h-4 w-4" />
                    <span>{project.budget}</span>
                  </div>
                )}
                {project.deadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Due {new Date(project.deadline).toLocaleDateString()}</span>
                  </div>
                )}
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderDesktopLayout = () => (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      <ResizablePanel defaultSize={65} minSize={50}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                {isEditingProject ? (
                  <div className="flex-1">
                    <Input
                      value={editedProject?.title || ""}
                      onChange={(e) => setEditedProject({ ...editedProject, title: e.target.value })}
                      className="text-xl font-semibold"
                      placeholder="Project title"
                    />
                  </div>
                ) : (
                  <div>
                    <h1 className="text-2xl font-semibold">{project.title}</h1>
                    <p className="text-sm text-muted-foreground mt-1">Collaborative workspace</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{project.status}</Badge>
                {isEditingProject ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingProject(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleSaveProject}>
                      <Save className="h-4 w-4 mr-2" />Save Project
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={startEditing}>
                    <Edit className="h-4 w-4 mr-2" />Edit
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Tabs */}
          <Tabs defaultValue="messages" className="flex-1 flex flex-col">
            <div className="border-b px-6">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="messages" className="gap-2">
                  <Send className="h-4 w-4" />Messages
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-2">
                  <CheckSquare className="h-4 w-4" />Tasks
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-2">
                  <Clock className="h-4 w-4" />Timeline
                </TabsTrigger>
                <TabsTrigger value="team" className="gap-2">
                  <Users className="h-4 w-4" />Team
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="messages" className="flex-1 flex flex-col m-0">
              <ScrollArea className="flex-1 px-6">
                <div className="py-4 space-y-6 max-w-4xl">
                  {messages.map((msg) => (
                    <div key={msg.id} className="space-y-3">
                      <div className="flex gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={msg.profiles?.avatar_url} />
                          <AvatarFallback>{msg.profiles?.full_name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-sm">{msg.profiles?.full_name || 'User'}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{msg.message}</p>
                          {msg.file_url && (
                            <div className="mt-3">
                              {isImageFile(msg.file_type) ? (
                                <div className="rounded-lg overflow-hidden border max-w-md">
                                  <img src={msg.file_url} alt={msg.file_name} className="w-full h-auto" />
                                </div>
                              ) : (
                                <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                                   className="inline-flex items-center gap-2 px-4 py-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
                                  <FileText className="h-5 w-5 text-primary" />
                                  <div className="text-left">
                                    <p className="text-sm font-medium">{msg.file_name}</p>
                                    <p className="text-xs text-muted-foreground">{formatFileSize(msg.file_size)}</p>
                                  </div>
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
              <div className="border-t p-4">
                <div className="max-w-4xl">
                  {attachedFile && (
                    <div className="mb-2 p-2 bg-secondary rounded-lg flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      <span className="text-sm flex-1">{attachedFile.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => setAttachedFile(null)}>Remove</Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} />
                    <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={sendingMessage}>
                      {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="flex-1 m-0 p-6 overflow-auto">
              <TaskBoard tasks={tasks} projectId={projectId!} onUpdate={fetchProjectData} />
            </TabsContent>

            <TabsContent value="timeline" className="flex-1 m-0 p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Project Timeline</h3>
                <Card className="p-6">
                  <div className="space-y-6">
                    {project.deadline && (
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Project Deadline</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(project.deadline).toLocaleDateString('en-US', { 
                              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Created</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(project.created_at).toLocaleDateString('en-US', { 
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="team" className="flex-1 m-0 p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Team Members</h3>
                <Card className="p-6 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Team collaboration features coming soon!</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    You'll be able to invite team members, assign roles, and collaborate in real-time.
                  </p>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={35} minSize={30} maxSize={50}>
        <div className="h-full border-l bg-muted/30">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {isEditingProject ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Edit Project Details</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={editedProject?.description || ""}
                        onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
                        placeholder="Project description..."
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Budget</Label>
                      <Input
                        value={editedProject?.budget || ""}
                        onChange={(e) => setEditedProject({ ...editedProject, budget: e.target.value })}
                        placeholder="e.g., $5,000 - $10,000"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Deadline</Label>
                      <Input
                        type="date"
                        value={editedProject?.deadline?.split('T')[0] || ""}
                        onChange={(e) => setEditedProject({ ...editedProject, deadline: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select 
                        value={editedProject?.status || "active"} 
                        onValueChange={(value) => setEditedProject({ ...editedProject, status: value })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Project Details</h3>
                  <div className="space-y-3">
                    {project.description && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Description</p>
                        <p className="text-sm">{project.description}</p>
                      </div>
                    )}
                    {project.budget && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{project.budget}</span>
                      </div>
                    )}
                    {project.deadline && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Due {new Date(project.deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Quick Tasks</h3>
                  <CreateTaskDialog projectId={projectId!} onSuccess={fetchProjectData} />
                </div>
                <div className="space-y-2">
                  {tasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No tasks yet</p>
                  ) : (
                    tasks.slice(0, 5).map((task) => (
                      <TaskItem key={task.id} task={task} onUpdate={fetchProjectData} compact />
                    ))
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Recent Files</h3>
                  <FileUploadDialog projectId={projectId!} onSuccess={fetchProjectData} />
                </div>
                <div className="space-y-2">
                  {files.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No files yet</p>
                  ) : (
                    files.slice(0, 5).map((file) => (
                      <a
                        key={file.id}
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                        </div>
                      </a>
                    ))
                  )}
                </div>
              </div>
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
