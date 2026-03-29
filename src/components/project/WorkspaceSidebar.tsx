import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Briefcase, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateProjectDialog } from "@/components/project/CreateProjectDialog";

interface WorkspaceSidebarProps {
  projects: Array<{
    id: string;
    title: string;
    status: string | null;
    updated_at: string;
  }>;
  activeProjectId?: string;
  onClose: () => void;
}

export function WorkspaceSidebar({ projects, activeProjectId, onClose }: WorkspaceSidebarProps) {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const getStatusDot = (status: string | null) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-muted-foreground/50';
    }
  };

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Sidebar Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">Workspaces</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Project List */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
              Your Projects
            </p>
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  navigate(`/desk/${project.id}`);
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sm",
                  activeProjectId === project.id
                    ? "bg-primary/10 text-primary font-medium border border-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <div className={cn("h-2 w-2 rounded-full shrink-0", getStatusDot(project.status))} />
                <span className="truncate">{project.title}</span>
              </button>
            ))}

            {projects.length === 0 && (
              <div className="text-center py-8 px-4">
                <Briefcase className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No projects yet</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* New Project Button */}
        <div className="p-3 border-t border-border shrink-0">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-sm"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      <CreateProjectDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSuccess={() => setShowCreate(false)}
      />
    </>
  );
}
