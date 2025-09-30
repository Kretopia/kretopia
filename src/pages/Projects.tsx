import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Briefcase, Plus, Search, FolderKanban, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { z } from "zod";

const projectSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().trim().max(500, "Description must be less than 500 characters").optional(),
  budget: z.string().trim().max(50, "Budget must be less than 50 characters").optional(),
  deadline: z.string().optional(),
});

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  deadline: string | null;
  budget: string | null;
  match_id: string | null;
  matches?: {
    user1_id: string;
    user2_id: string;
  };
  collaborator?: {
    full_name: string;
    avatar_url: string | null;
  };
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    budget: "",
    deadline: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // First, fetch matches where user is involved
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('id, user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!matchesData || matchesData.length === 0) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const matchIds = matchesData.map(m => m.id);

    // Fetch projects for these matches
    const { data: projectsData, error } = await supabase
      .from('projects')
      .select('*')
      .in('match_id', matchIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
      setProjects([]);
    } else {
      // Fetch collaborator details
      const projectsWithCollaborators = await Promise.all(
        (projectsData || []).map(async (project) => {
          const match = matchesData.find(m => m.id === project.match_id);
          if (!match) return { ...project, matches: null, collaborator: null };

          const collaboratorId = match.user1_id === user.id 
            ? match.user2_id 
            : match.user1_id;

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', collaboratorId)
            .maybeSingle();

          return {
            ...project,
            matches: match,
            collaborator: profile,
          };
        })
      );

      setProjects(projectsWithCollaborators);
    }
    setLoading(false);
  };

  const handleCreateProject = async () => {
    try {
      // Validate input
      const validationResult = projectSchema.safeParse(newProject);
      
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please sign in to create a project",
          variant: "destructive",
        });
        return;
      }

      // Create solo project without a match (match_id can be null for solo projects)
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          match_id: null,
          title: validationResult.data.title,
          description: validationResult.data.description || null,
          budget: validationResult.data.budget || null,
          deadline: validationResult.data.deadline || null,
          status: 'active',
        })
        .select()
        .single();

      if (projectError) {
        console.error('Project creation error:', projectError);
        toast({
          title: "Error",
          description: `Failed to create project: ${projectError.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success! 🎉",
        description: "Project created successfully",
      });
      setCreateDialogOpen(false);
      setNewProject({ title: "", description: "", budget: "", deadline: "" });
      fetchProjects(); // Refresh the list
      navigate(`/desk/${project.id}`);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'on_hold':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FolderKanban className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-primary';
      case 'completed':
        return 'text-accent';
      case 'on_hold':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Briefcase className="mx-auto mb-4 h-16 w-16 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold flex items-center gap-2">
              <FolderKanban className="h-8 w-8 text-primary" />
              ThriveDesk
            </h1>
            <p className="text-muted-foreground">
              Organize your projects, collabs & opportunities
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Project Title *</Label>
                  <Input
                    id="title"
                    placeholder="My Awesome Project"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What is this project about?"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget (Optional)</Label>
                  <Input
                    id="budget"
                    placeholder="$1,000 - $5,000"
                    value={newProject.budget}
                    onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline (Optional)</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newProject.deadline}
                    onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreateProject} className="w-full" variant="gradient">
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderKanban className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">
              {searchQuery ? "No projects found" : "No Projects Yet"}
            </h2>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? "Try adjusting your search" 
                : "Create your first project to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setCreateDialogOpen(true)} variant="gradient">
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="p-6 cursor-pointer transition-smooth hover:shadow-glow"
                onClick={() => navigate(`/desk/${project.id}`)}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg bg-primary/10 p-2 ${getStatusColor(project.status)}`}>
                      {getStatusIcon(project.status)}
                    </div>
                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                      {project.status}
                    </Badge>
                  </div>
                </div>

                <h3 className="mb-2 text-lg font-semibold line-clamp-1">{project.title}</h3>
                
                {project.description && (
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                  {project.collaborator && project.matches?.user1_id !== project.matches?.user2_id && (
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                        {project.collaborator.full_name.charAt(0)}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
