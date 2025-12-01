import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SimpleProjectHeaderProps {
  project: {
    id: string;
    title: string;
    description: string | null;
    status: string | null;
  };
  collaborators: Array<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  }>;
}

export const SimpleProjectHeader = ({ project, collaborators }: SimpleProjectHeaderProps) => {
  const navigate = useNavigate();
  
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'planning': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

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

      {/* Collaborators */}
      <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
        <Users className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex -space-x-2">
            {collaborators.slice(0, 3).map((collab) => (
              <Avatar key={collab.id} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={collab.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {collab.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-sm text-muted-foreground truncate">
            {collaborators.length === 1
              ? collaborators[0].full_name
              : `${collaborators.length} collaborators`}
          </span>
        </div>
      </div>
    </div>
  );
};
