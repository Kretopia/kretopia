import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Plus, UserPlus, Loader2 } from "lucide-react";
import { z } from "zod";

const projectSchema = z.object({
  title: z.string().trim().min(1, "Project name is required").max(100),
  description: z.string().trim().max(500).optional(),
  inviteEmail: z.string().email("Invalid email").optional().or(z.literal("")),
});

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    inviteEmail: "",
  });

  const handleCreate = async () => {
    try {
      setCreating(true);

      // Validate
      const validationResult = projectSchema.safeParse(formData);
      if (!validationResult.success) {
        toast({
          title: "Invalid input",
          description: validationResult.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      // Check session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast({
          title: "Session expired",
          description: "Please sign in again",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please sign in to create a project",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Create project with explicit user ID
      const projectData = {
        title: validationResult.data.title,
        description: validationResult.data.description || null,
        created_by: user.id,
        status: 'active' as const,
        match_id: null,
      };

      console.log('Creating project with data:', projectData);
      console.log('User ID:', user.id);

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      if (projectError) {
        console.error('Project creation error:', projectError);
        throw projectError;
      }

      // Send invite if email provided
      if (validationResult.data.inviteEmail) {
        const { error: inviteError } = await supabase
          .from('project_collaborators')
          .insert({
            project_id: project.id,
            email: validationResult.data.inviteEmail,
            invited_by: user.id,
            role: 'member',
            status: 'pending',
          });

        if (inviteError) {
          console.error('Failed to send invite:', inviteError);
          toast({
            title: "Project created!",
            description: "But failed to send invitation. You can invite them later.",
          });
        } else {
          toast({
            title: "Project created! 🎉",
            description: "Invitation sent successfully.",
          });
        }
      } else {
        toast({
          title: "Project created! 🎉",
          description: "You can now add tasks, milestones, and more.",
        });
      }

      // Reset form
      setFormData({ title: "", description: "", inviteEmail: "" });
      onOpenChange(false);
      onSuccess();
      
      // Navigate to project
      navigate(`/desk/${project.id}`);
    } catch (error: any) {
      console.error('Project creation error:', error);
      toast({
        title: "Failed to create project",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Project</DialogTitle>
          <DialogDescription>
            Start with the basics. You can add budget, deadlines, and milestones later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold">
              Project Name *
            </Label>
            <Input
              id="title"
              placeholder="e.g., Website Redesign, Music Video Production"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-12 text-base"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-semibold">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="What are you working on?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="text-base resize-none"
            />
          </div>

          {/* Team Invite */}
          <div className="space-y-2">
            <Label htmlFor="inviteEmail" className="text-base font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Team Member <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="inviteEmail"
              type="email"
              placeholder="colleague@example.com"
              value={formData.inviteEmail}
              onChange={(e) => setFormData({ ...formData, inviteEmail: e.target.value })}
              className="h-12 text-base"
            />
            <p className="text-xs text-muted-foreground">
              Invite a client or collaborator. They'll get an email to join this project.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12"
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              className="flex-1 h-12 font-semibold"
              variant="gradient"
              disabled={creating || !formData.title.trim()}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Info footer */}
        <div className="bg-muted/50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
          <p className="text-xs text-muted-foreground">
            💡 After creation, you can add budget, deadlines, milestones, and payment details in project settings.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
