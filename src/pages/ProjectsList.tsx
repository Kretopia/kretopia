import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Plus, Briefcase, Clock, CheckCircle2, Circle, ArrowRight, Sparkles, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MyPendingInvitations } from "@/components/project/MyPendingInvitations";
import { CreateProjectDialog } from "@/components/project/CreateProjectDialog";
import { formatDistanceToNow } from "date-fns";

const ProjectsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProjects();
      const trackPage = async () => {
        const { analytics } = await import("@/lib/analytics");
        analytics.pageView("projects_list");
      };
      trackPage();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setProjects(projectsData || []);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast({ title: "Error loading projects", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'active': return <Circle className="h-3 w-3 fill-green-500 text-green-500" />;
      case 'completed': return <CheckCircle2 className="h-3 w-3 text-blue-500" />;
      default: return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeProjects = projects.filter(p => p.status === 'active');
  const otherProjects = projects.filter(p => p.status !== 'active');

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8 pb-24 md:pb-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Projects</h1>
              <p className="text-sm text-muted-foreground">Your collaboration workspaces</p>
            </div>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Project</span>
        </Button>
      </div>

      {/* Pending Invitations */}
      <MyPendingInvitations />

      {/* Stats row */}
      {projects.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center bg-card/50">
            <p className="text-2xl font-bold">{projects.length}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total</p>
          </Card>
          <Card className="p-4 text-center bg-card/50">
            <p className="text-2xl font-bold text-green-500">{activeProjects.length}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Active</p>
          </Card>
          <Card className="p-4 text-center bg-card/50">
            <p className="text-2xl font-bold text-blue-500">{projects.filter(p => p.status === 'completed').length}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Completed</p>
          </Card>
        </div>
      )}

      {projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Projects Yet</h2>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Start by matching with creators in Circle, then create projects to collaborate seamlessly.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/circle')}>
                Find Collaborators
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group cursor-pointer hover:bg-accent/30 transition-all hover:shadow-md border-border/50"
              onClick={() => navigate(`/desk/${project.id}`)}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(project.status)}
                    <h3 className="font-semibold truncate">{project.title}</h3>
                  </div>
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 ml-5">
                      {project.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          fetchProjects();
        }}
      />
    </div>
  );
};

export default ProjectsList;
