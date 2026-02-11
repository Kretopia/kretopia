import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ArrowLeft, UserPlus, X, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { InviteCollaboratorDialog } from "./InviteCollaboratorDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SimpleProjectHeaderProps {
  project: {
    id: string;
    title: string;
    description: string | null;
    status: string | null;
    created_by: string;
  };
  collaborators: Array<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  }>;
  onCollaboratorsChanged?: () => void;
  compact?: boolean;
}

export const SimpleProjectHeader = ({ project, collaborators, onCollaboratorsChanged, compact }: SimpleProjectHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [collaboratorToRemove, setCollaboratorToRemove] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  
  const isOwner = user?.id === project.created_by;
  
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'planning': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleRemoveCollaborator = async () => {
    if (!collaboratorToRemove) return;
    
    setRemoving(true);
    try {
      const { error } = await supabase
        .from('project_collaborators')
        .delete()
        .eq('project_id', project.id)
        .eq('user_id', collaboratorToRemove.id);

      if (error) throw error;

      toast({
        title: "Collaborator removed",
        description: `${collaboratorToRemove.name} has been removed from the project`,
      });
      
      onCollaboratorsChanged?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
      setRemoveDialogOpen(false);
      setCollaboratorToRemove(null);
    }
  };

  const confirmRemove = (collab: { id: string; full_name: string }) => {
    setCollaboratorToRemove({ id: collab.id, name: collab.full_name });
    setRemoveDialogOpen(true);
  };

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold truncate">{project.title}</h1>
              <Badge variant="outline" className={`${getStatusColor(project.status)} text-[10px] px-1.5 py-0`}>
                {project.status || 'Planning'}
              </Badge>
            </div>
            {project.description && (
              <p className="text-xs text-muted-foreground truncate">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex -space-x-1.5">
            {collaborators.slice(0, 3).map((collab) => (
              <Avatar key={collab.id} className="h-6 w-6 border-2 border-background">
                <AvatarImage src={collab.avatar_url || undefined} />
                <AvatarFallback className="text-[9px]">{collab.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
            {collaborators.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-medium">
                +{collaborators.length - 3}
              </div>
            )}
          </div>
          {isOwner && (
            <InviteCollaboratorDialog projectId={project.id} onInvite={() => onCollaboratorsChanged?.()} />
          )}
        </div>

        {/* Remove Confirmation Dialog */}
        <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove collaborator?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {collaboratorToRemove?.name} from this project?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveCollaborator} disabled={removing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {removing ? "Removing..." : "Remove"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold truncate">{project.title}</h1>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        <Badge variant="outline" className={getStatusColor(project.status)}>
          {project.status || 'Planning'}
        </Badge>
      </div>

      {/* Collaborators with Invite Button */}
      <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
        <Users className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="flex -space-x-2">
                  {collaborators.slice(0, 3).map((collab, index) => (
                    <Avatar key={collab.id} className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={collab.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {collab.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {collaborators.length > 3 && (
                    <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                      +{collaborators.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-sm text-muted-foreground truncate">
                  {collaborators.length === 1
                    ? collaborators[0].full_name
                    : `${collaborators.length} collaborators`}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {collaborators.map((collab) => (
                <DropdownMenuItem 
                  key={collab.id} 
                  className="flex items-center gap-3 p-2"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={collab.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {collab.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-1">
                      {collab.full_name}
                      {collab.id === project.created_by && (
                        <Crown className="h-3 w-3 text-yellow-500" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{collab.role}</p>
                  </div>
                  {isOwner && collab.id !== project.created_by && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => confirmRemove(collab)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </DropdownMenuItem>
              ))}
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <div className="p-2">
                    <InviteCollaboratorDialog 
                      projectId={project.id} 
                      onInvite={() => onCollaboratorsChanged?.()} 
                    />
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Quick Invite Button */}
        {isOwner && (
          <InviteCollaboratorDialog 
            projectId={project.id} 
            onInvite={() => onCollaboratorsChanged?.()} 
          />
        )}
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove collaborator?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {collaboratorToRemove?.name} from this project? 
              They will no longer have access to project files, tasks, or messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveCollaborator}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};