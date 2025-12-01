import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Plus, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ProjectsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // Get projects where user is creator
      const { data: createdProjects, error: createdError } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', user?.id);

      if (createdError) throw createdError;

      // Get projects where user is collaborator
      const { data: collabData, error: collabError } = await supabase
        .from('project_collaborators')
        .select('project_id')
        .eq('user_id', user?.id)
        .eq('status', 'accepted');

      if (collabError) throw collabError;

      // Get the actual project details for collaborations
      let collabProjects: any[] = [];
      if (collabData && collabData.length > 0) {
        const projectIds = collabData.map(c => c.project_id);
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .in('id', projectIds);
        
        if (projectsError) throw projectsError;
        collabProjects = projects || [];
      }

      // Combine and deduplicate
      const allProjects = [...(createdProjects || []), ...collabProjects];
      const uniqueProjects = Array.from(
        new Map(allProjects.map(p => [p.id, p])).values()
      ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      setProjects(uniqueProjects);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error loading projects",
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

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ThriveDesk</h1>
          <p className="text-muted-foreground">Your collaboration spaces</p>
        </div>
        <Button onClick={() => navigate('/circle')}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No Projects Yet</CardTitle>
            <CardDescription className="text-center mb-4">
              Start by matching with creators in Circle, then create projects to collaborate
            </CardDescription>
            <Button onClick={() => navigate('/circle')}>
              Find Collaborators
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Card 
              key={project.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate(`/desk/${project.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{project.title}</CardTitle>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    project.status === 'active' ? 'bg-green-500/20 text-green-500' :
                    project.status === 'completed' ? 'bg-blue-500/20 text-blue-500' :
                    'bg-gray-500/20 text-gray-500'
                  }`}>
                    {project.status}
                  </span>
                </div>
                {project.description && (
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsList;
