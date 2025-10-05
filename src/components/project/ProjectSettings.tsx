import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, Trash2, Archive, AlertTriangle } from "lucide-react";

interface ProjectSettingsProps {
  project: any;
  onUpdate: () => void;
  userRole: 'creator' | 'client';
}

export function ProjectSettings({ project, onUpdate, userRole }: ProjectSettingsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [editedProject, setEditedProject] = useState({
    title: project?.title || '',
    description: project?.description || '',
    budget: project?.budget || '',
    deadline: project?.deadline || '',
    status: project?.status || 'active',
  });

  // Update form when project prop changes
  useEffect(() => {
    if (project) {
      setEditedProject({
        title: project.title || '',
        description: project.description || '',
        budget: project.budget || '',
        deadline: project.deadline || '',
        status: project.status || 'active',
      });
    }
  }, [project]);

  if (!project) return null;

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          title: editedProject.title,
          description: editedProject.description,
          budget: editedProject.budget,
          deadline: editedProject.deadline,
          status: editedProject.status,
        })
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: "Settings saved! ✓",
        description: "Your project has been updated.",
      });
      setOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleArchive = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'archived' })
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: "Project archived",
        description: "You can restore it later from your projects list.",
      });
      setArchiveDialogOpen(false);
      setOpen(false);
      navigate('/projects');
    } catch (error: any) {
      toast({
        title: "Failed to archive",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (confirmText !== project.title) {
      toast({
        title: "Confirmation failed",
        description: "Please type the project name exactly as shown.",
        variant: "destructive",
      });
      return;
    }

    setDeleting(true);
    try {
      // Delete in order: messages, tasks, milestones, files, then project
      await supabase.from('project_messages').delete().eq('project_id', project.id);
      await supabase.from('project_tasks').delete().eq('project_id', project.id);
      await supabase.from('milestones').delete().eq('project_id', project.id);
      await supabase.from('time_entries').delete().eq('project_id', project.id);
      await supabase.from('project_files').delete().eq('project_id', project.id);
      await supabase.from('project_collaborators').delete().eq('project_id', project.id);
      
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: "Project deleted",
        description: "All project data has been permanently removed.",
      });
      navigate('/projects');
    } catch (error: any) {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <Settings className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
            <DialogDescription>
              Manage your project settings, team, and danger zone
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* General Settings */}
            {userRole === 'client' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">General Settings</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="title">Project Title</Label>
                    <Input
                      id="title"
                      value={editedProject.title}
                      onChange={(e) => setEditedProject({ ...editedProject, title: e.target.value })}
                      placeholder="My awesome project"
                    />
                  </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editedProject.description}
                    onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
                    placeholder="What's this project about?"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="budget">Budget</Label>
                    <Input
                      id="budget"
                      value={editedProject.budget}
                      onChange={(e) => setEditedProject({ ...editedProject, budget: e.target.value })}
                      placeholder="$5,000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={editedProject.deadline}
                      onChange={(e) => setEditedProject({ ...editedProject, deadline: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={editedProject.status} onValueChange={(val) => setEditedProject({ ...editedProject, status: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
                <Button onClick={handleSave} className="w-full">
                  Save Changes
                </Button>
              </div>
            )}

            {/* Project Info - visible to all */}
            {userRole !== 'client' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Project Information</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Title</Label>
                    <p className="mt-1">{project.title}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1">{project.description || 'No description'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-muted-foreground">Budget</Label>
                      <p className="mt-1">{project.budget || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Deadline</Label>
                      <p className="mt-1">{project.deadline || 'Not set'}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="mt-1 capitalize">{project.status}</p>
                  </div>
                </div>
              </div>
            )}

            {userRole === 'client' && <Separator />}

            {/* Danger Zone - only for owners */}
            {userRole === 'client' && (
              <div className="space-y-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Danger Zone</h3>
              </div>
              
              <div className="border border-destructive/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">Archive Project</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hide this project from active view. You can restore it later.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setArchiveDialogOpen(true)}
                    className="flex-shrink-0"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                </div>

                <Separator />

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm text-destructive">Delete Project</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Permanently delete this project and all associated data. This cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the project from your active projects. You can restore it anytime from your archived projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete Project Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will <strong>permanently delete</strong> all project data including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All messages and conversations</li>
                <li>All tasks and their history</li>
                <li>All milestones and payment records</li>
                <li>All files and attachments</li>
                <li>All time tracking entries</li>
                <li>All collaborator invitations</li>
              </ul>
              <p className="font-semibold text-destructive">This action cannot be undone!</p>
              <div className="pt-2">
                <Label htmlFor="confirm">Type <strong>{project.title}</strong> to confirm:</Label>
                <Input
                  id="confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type project name here"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmText !== project.title || deleting}
            >
              {deleting ? "Deleting..." : "Delete Forever"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
