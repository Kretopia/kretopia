import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreVertical, Settings, Trash2, StickyNote, FolderLock, Clapperboard, ListChecks, UserCheck, Music2, History, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ReviewPromptDialog } from "./ReviewPromptDialog";
import { ProjectCreditsDialog } from "./ProjectCreditsDialog";

interface ProjectSettingsMenuProps {
  project: {
    id: string;
    title: string;
    description: string | null;
    status: string | null;
    created_by: string;
    workspace_type?: string | null;
  };
  collaborators?: Array<{ id: string; full_name: string; avatar_url: string | null }>;
  currentUserId: string;
  isPro: boolean;
  onProjectUpdated: () => void;
  onNavigateToTab: (tab: string) => void;
}

export function ProjectSettingsMenu({
  project,
  collaborators = [],
  currentUserId,
  isPro,
  onProjectUpdated,
  onNavigateToTab,
}: ProjectSettingsMenuProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reviewPromptOpen, setReviewPromptOpen] = useState(false);
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || "");
  const [status, setStatus] = useState(project.status || "planning");

  const isOwner = currentUserId === project.created_by;

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ title, description: description || null, status })
        .eq("id", project.id);
      if (error) throw error;
      toast({ title: "Project updated" });
      setSettingsOpen(false);
      onProjectUpdated();
      
      // Trigger credits + review prompt when project is marked as completed
      if (status === "completed" && project.status !== "completed") {
        setTimeout(() => setCreditsDialogOpen(true), 500);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      // Delete related data first
      await supabase.from("project_messages").delete().eq("project_id", project.id);
      await supabase.from("project_tasks").delete().eq("project_id", project.id);
      await supabase.from("project_files").delete().eq("project_id", project.id);
      await supabase.from("project_collaborators").delete().eq("project_id", project.id);
      await supabase.from("milestones").delete().eq("project_id", project.id);
      await supabase.from("board_items").delete().eq("project_id", project.id);
      await supabase.from("creative_assets").delete().eq("project_id", project.id);
      
      const { error } = await supabase.from("projects").delete().eq("id", project.id);
      if (error) throw error;

      toast({ title: "Project deleted", description: "The project has been permanently deleted" });
      navigate("/desk");
    } catch (error: any) {
      toast({ title: "Error deleting project", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const secondaryTabs = [
    { id: "notes", label: "Notes", icon: StickyNote, proOnly: false },
    { id: "assets", label: "Assets", icon: Library, proOnly: false },
    { id: "templates", label: "Templates", icon: LayoutTemplate, proOnly: true },
    { id: "ai", label: "AI Tools", icon: Sparkles, proOnly: true },
  ];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs text-muted-foreground">More Tools</DropdownMenuLabel>
          <DropdownMenuGroup>
            {secondaryTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => onNavigateToTab(tab.id)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.proOnly && !isPro && (
                    <Crown className="h-3 w-3 text-amber-500 ml-auto" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Project</DropdownMenuLabel>

          {isOwner && (
            <DropdownMenuItem
              onClick={() => {
                setTitle(project.title);
                setDescription(project.description || "");
                setStatus(project.status || "planning");
                setSettingsOpen(true);
              }}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
          )}

          {isOwner && (
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete Project
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
            <DialogDescription>Update your project details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-title">Title</Label>
              <Input
                id="project-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Project title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={saving || !title.trim()}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{project.title}</strong> and all its messages, tasks, files, and data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Credits on Completion */}
      <ProjectCreditsDialog
        open={creditsDialogOpen}
        onOpenChange={setCreditsDialogOpen}
        projectId={project.id}
        projectTitle={project.title}
        collaborators={collaborators}
        onCreditsAssigned={() => {
          // After credits assigned, show review prompt if there are collaborators
          if (collaborators.length > 1) {
            setTimeout(() => setReviewPromptOpen(true), 500);
          }
          onProjectUpdated();
        }}
      />

      {/* Review Prompt on Completion */}
      <ReviewPromptDialog
        open={reviewPromptOpen}
        onOpenChange={setReviewPromptOpen}
        projectId={project.id}
        projectTitle={project.title}
        collaborators={collaborators}
      />
    </>
  );
}
