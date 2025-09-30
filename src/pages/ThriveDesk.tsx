import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  CheckSquare, 
  Upload, 
  Send, 
  Plus,
  ArrowLeft,
  Calendar,
  DollarSign,
  Loader2
} from "lucide-react";

const ThriveDesk = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
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

      // Fetch messages
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
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('project_messages')
      .insert({
        project_id: projectId,
        user_id: user?.id,
        message: newMessage,
      });

    if (error) {
      toast({
        title: "Failed to send",
        description: "Could not send your message.",
        variant: "destructive",
      });
    } else {
      setNewMessage("");
      fetchProjectData();
    }
    setSendingMessage(false);
  };

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
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{project.title}</h1>
              <Badge className="mt-1">{project.status}</Badge>
            </div>
          </div>
        </div>

        {/* Project Info */}
        <Card className="mb-6">
          <CardContent className="flex gap-6 p-6">
            {project.budget && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{project.budget}</span>
              </div>
            )}
            {project.deadline && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Due {new Date(project.deadline).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="chat" className="space-y-4">
          <TabsList>
            <TabsTrigger value="chat" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-2">
              <Upload className="h-4 w-4" />
              Files
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <Card>
              <CardContent className="p-0">
                <div className="h-[500px] flex flex-col">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={msg.profiles?.avatar_url} />
                          <AvatarFallback>
                            {msg.profiles?.full_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-semibold text-sm">
                              {msg.profiles?.full_name || 'User'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t p-4 flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} disabled={sendingMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tasks</CardTitle>
                <CreateTaskDialog projectId={projectId!} onSuccess={fetchProjectData} />
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No tasks yet. Create one to get started!
                  </p>
                ) : (
                  tasks.map((task) => (
                    <TaskItem key={task.id} task={task} onUpdate={fetchProjectData} />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Files</CardTitle>
                <FileUploadDialog projectId={projectId!} onSuccess={fetchProjectData} />
              </CardHeader>
              <CardContent className="space-y-2">
                {files.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No files uploaded yet
                  </p>
                ) : (
                  files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded by {file.profiles?.full_name} • {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Task Item Component
const TaskItem = ({ task, onUpdate }: any) => {
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

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <p className="font-medium">{task.title}</p>
        {task.description && (
          <p className="text-sm text-muted-foreground">{task.description}</p>
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
  const { toast } = useToast();

  const handleCreate = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('project_tasks')
      .insert({
        project_id: projectId,
        title,
        description,
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
      setOpen(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
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
        <Button size="sm">
          <Upload className="h-4 w-4 mr-1" />
          Upload File
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
