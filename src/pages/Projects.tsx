import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ProjectTemplates } from "@/components/project/ProjectTemplates";
import { CreateProjectDialog } from "@/components/project/CreateProjectDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Briefcase, Plus, Search, FolderKanban, Clock, CheckCircle2, AlertCircle, DollarSign } from "lucide-react";
import { type SubscriptionTier } from "@/lib/subscriptionLimits";
import { UpgradeDialog } from "@/components/UpgradeDialog";

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
  const { subscriptionInfo } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Use subscription tier from auth context
  const subscriptionTier = subscriptionInfo.tier as SubscriptionTier;

  useEffect(() => {
    let isMounted = true;
    
    const loadProjects = async () => {
      if (isMounted) {
        await fetchProjects();
      }
    };
    
    loadProjects();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Simplified query - just fetch all projects user has access to
      // RLS will handle the filtering via the security definer function
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        // Don't show error toast if it's just empty results
        if (error.code !== 'PGRST116') {
          toast({
            title: "Loading issue",
            description: "Couldn't load projects. Tap to retry.",
            variant: "destructive",
          });
        }
        setProjects([]);
        setLoading(false);
        return;
      }

      if (!projectsData || projectsData.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      // Fetch match details for matched projects
      const matchIds = projectsData
        .filter(p => p.match_id)
        .map(p => p.match_id)
        .filter((id, index, self) => id && self.indexOf(id) === index); // unique non-null ids

      // Batch fetch matches data
      let matchesData: any[] = [];
      if (matchIds.length > 0) {
        const { data } = await supabase
          .from('matches')
          .select('id, user1_id, user2_id')
          .in('id', matchIds);
        matchesData = data || [];
      }
      
      // Get all unique collaborator IDs
      const collaboratorIds = projectsData
        .filter(p => p.match_id)
        .map(p => {
          const match = matchesData.find(m => m.id === p.match_id);
          if (!match) return null;
          return match.user1_id === user.id ? match.user2_id : match.user1_id;
        })
        .filter(Boolean);
      
      // Batch fetch ALL collaborator profiles at once
      let collaboratorsMap = new Map();
      if (collaboratorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', collaboratorIds);
        
        profiles?.forEach(p => collaboratorsMap.set(p.user_id, p));
      }
      
      // Map projects with their collaborator data
      const projectsWithCollaborators = projectsData.map(project => {
        if (!project.match_id) {
          return { ...project, matches: null, collaborator: null };
        }

        const match = matchesData.find(m => m.id === project.match_id);
        if (!match) return { ...project, matches: null, collaborator: null };

        const collaboratorId = match.user1_id === user.id ? match.user2_id : match.user1_id;
        const collaborator = collaboratorsMap.get(collaboratorId);

        return {
          ...project,
          matches: match,
          collaborator: collaborator || null,
        };
      });

      setProjects(projectsWithCollaborators);
    } catch (err) {
      console.error('Unexpected error:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    // Projects feature not part of MVP, but keeping the dialog functional
    setCreateDialogOpen(true);
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
    <div className="min-h-screen p-3 sm:p-6 md:p-8 pb-24 sm:pb-6">
      <div className="mx-auto max-w-6xl">
        {/* Header - Mobile optimized */}
        <div className="mb-5 sm:mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="mb-1.5 text-2xl sm:text-3xl font-bold flex items-center gap-2.5">
              <FolderKanban className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              Projects
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage projects & collaborations
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto md:shrink-0">
            <ProjectTemplates onSelect={fetchProjects} />
            <Button
              variant="gradient"
              size="lg"
              className="gap-2 w-full sm:w-auto whitespace-nowrap h-12 rounded-xl font-semibold"
              onClick={handleOpenCreateDialog}
            >
              <Plus className="h-5 w-5" />
              New Project
            </Button>
          </div>
        </div>

        {/* Search - Mobile optimized */}
        <div className="mb-5 sm:mb-8 relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base rounded-xl border-2"
          />
        </div>

        {/* Projects Grid - Mobile optimized */}
        {filteredProjects.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center rounded-2xl border-2">
            <FolderKanban className="mx-auto mb-4 h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground" />
            <h2 className="mb-2 text-xl sm:text-2xl font-semibold">
              {searchQuery ? "No projects found" : "No Projects Yet"}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-5">
              {searchQuery 
                ? "Try adjusting your search" 
                : "Create your first project to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={handleOpenCreateDialog} variant="gradient" size="lg" className="h-12 px-8 rounded-xl">
                <Plus className="mr-2 h-5 w-5" />
                Create Project
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="p-5 cursor-pointer transition-smooth hover:shadow-glow active:scale-[0.98] rounded-2xl border-2"
                onClick={() => navigate(`/desk/${project.id}`)}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`rounded-xl bg-primary/10 p-2 ${getStatusColor(project.status)}`}>
                      {getStatusIcon(project.status)}
                    </div>
                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="text-xs font-semibold">
                      {project.status}
                    </Badge>
                  </div>
                  {project.collaborator && project.matches?.user1_id !== project.matches?.user2_id && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-semibold text-primary-foreground ring-2 ring-primary/20">
                      {project.collaborator.full_name.charAt(0)}
                    </div>
                  )}
                </div>

                <h3 className="mb-2 text-lg font-semibold line-clamp-1">{project.title}</h3>
                
                {project.description && (
                  <p className="mb-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm pt-3 border-t">
                  <div className="text-muted-foreground font-medium">
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                  {project.budget && (
                    <div className="flex items-center gap-1 text-primary font-semibold">
                      <DollarSign className="h-4 w-4" />
                      <span>{project.budget}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchProjects}
      />

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        currentTier={subscriptionTier}
        feature="Unlimited Projects"
        description="Free tier allows 1 active project. Upgrade to Pro for unlimited projects and unlock the full power of collaboration!"
        benefits={[
          "Unlimited active projects",
          "Unlimited swipes to find collaborators",
          "AI match explanations",
          "Undo swipe feature (3/day)",
          "Profile verification badge",
          "Advanced profile sections"
        ]}
      />
    </div>
  );
};

export default Projects;
