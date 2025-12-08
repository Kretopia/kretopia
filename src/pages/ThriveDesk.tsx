import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { SimpleProjectHeader } from "@/components/project/SimpleProjectHeader";
import { SimpleFileSharing } from "@/components/project/SimpleFileSharing";
import { SimpleTaskList } from "@/components/project/SimpleTaskList";
import { SimpleProgressTracker } from "@/components/project/SimpleProgressTracker";
import { SimpleProjectChat } from "@/components/project/SimpleProjectChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ThriveDesk = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("chat");

  useEffect(() => {
    if (projectId && user) {
      fetchProjectData();
      
      // Track project workspace view
      const trackProjectView = async () => {
        const { analytics } = await import("@/lib/analytics");
        analytics.pageView("thrivedesk");
        analytics.featureUsed("thrivedesk_opened", { project_id: projectId });
      };
      trackProjectView();
    }
  }, [projectId, user]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);

      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Check if user has access
      if (!user) throw new Error('Not authenticated');
      
      const { data: hasAccess } = await supabase
        .rpc('user_has_project_access', {
          project_id_param: projectId,
          user_id_param: user.id
        });

      if (!hasAccess) {
        toast({
          title: "Access denied",
          description: "You don't have access to this project",
          variant: "destructive",
        });
        navigate('/circle');
        return;
      }

      setProject(projectData);

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
              collabs.push({
                id: collab.user_id,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                role: profile.role,
              });
            }
          }
        }
      }

      // Add project creator
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .eq('user_id', projectData.created_by)
        .single();

      if (creatorProfile) {
        collabs.unshift({
          id: creatorProfile.user_id,
          full_name: creatorProfile.full_name,
          avatar_url: creatorProfile.avatar_url,
          role: creatorProfile.role,
        });
      }

      setCollaborators(collabs);

      // Fetch files
      const { data: filesData } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      setFiles(filesData || []);

      // Fetch messages with profiles
      const { data: messagesData } = await supabase
        .from('project_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (messagesData) {
        const enrichedMessages = await Promise.all(
          messagesData.map(async (msg) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('user_id', msg.user_id)
              .single();
            
            return {
              ...msg,
              profiles: profile,
            };
          })
        );
        setMessages(enrichedMessages);
      }

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      setTasks(tasksData || []);

      // Subscribe to real-time updates
      const channel = supabase
        .channel(`project:${projectId}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'project_files', filter: `project_id=eq.${projectId}` },
          () => fetchProjectData()
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'project_messages', filter: `project_id=eq.${projectId}` },
          () => fetchProjectData()
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'project_tasks', filter: `project_id=eq.${projectId}` },
          () => fetchProjectData()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error: any) {
      console.error('Error fetching project data:', error);
      toast({
        title: "Error loading project",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const completedTasks = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6 pb-24 md:pb-6">
      <SimpleProjectHeader 
        project={project} 
        collaborators={collaborators} 
        onCollaboratorsChanged={fetchProjectData}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-6">
          <SimpleProjectChat
            projectId={projectId!}
            messages={messages}
            currentUserId={user?.id || ''}
            onMessageSent={fetchProjectData}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <SimpleTaskList
            projectId={projectId!}
            tasks={tasks}
            onTasksChanged={fetchProjectData}
            currentUserId={user?.id || ''}
          />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <SimpleFileSharing
            projectId={projectId!}
            files={files}
            onFileUploaded={fetchProjectData}
          />
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          <SimpleProgressTracker
            completedTasks={completedTasks}
            totalTasks={tasks.length}
            projectStatus={project.status}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ThriveDesk;
