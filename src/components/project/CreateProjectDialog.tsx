import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Plus, UserPlus, Loader2, Users, Mail } from "lucide-react";
import { z } from "zod";

const projectSchema = z.object({
  title: z.string().trim().min(1, "Project name is required").max(100),
  description: z.string().trim().max(500).optional(),
  inviteEmail: z.string().optional().or(z.literal("")),
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
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showInviteDropdown, setShowInviteDropdown] = useState(false);

  // Filter connected users based on search
  const filteredConnections = connectedUsers.filter((user) =>
    user.full_name.toLowerCase().includes(formData.inviteEmail.toLowerCase()) ||
    user.role?.toLowerCase().includes(formData.inviteEmail.toLowerCase())
  );

  // Check if input looks like an email
  const isEmailFormat = formData.inviteEmail.includes("@") && formData.inviteEmail.includes(".");

  // Load connected users when dialog opens
  useEffect(() => {
    if (open) {
      loadConnectedUsers();
    } else {
      // Reset state when dialog closes
      setFormData({ title: "", description: "", inviteEmail: "" });
      setSelectedUser(null);
      setShowInviteDropdown(false);
    }
  }, [open]);

  const loadConnectedUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all accepted connections
      const { data: outgoing } = await supabase
        .from("connections")
        .select("connected_user_id")
        .eq("user_id", user.id)
        .eq("status", "accepted");

      const { data: incoming } = await supabase
        .from("connections")
        .select("user_id")
        .eq("connected_user_id", user.id)
        .eq("status", "accepted");

      const { data: matches } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq("status", "active");

      const connectedIds = new Set<string>();
      outgoing?.forEach((c) => connectedIds.add(c.connected_user_id));
      incoming?.forEach((c) => connectedIds.add(c.user_id));
      matches?.forEach((m) => {
        connectedIds.add(m.user1_id === user.id ? m.user2_id : m.user1_id);
      });

      if (connectedIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, role")
          .in("user_id", Array.from(connectedIds));

        setConnectedUsers(profiles || []);
      }
    } catch (error) {
      console.error("Error loading connected users:", error);
    }
  };

  const handleCreate = async () => {
    try {
      setCreating(true);

      // Validate email only if not using selected user from circle
      const emailToValidate = selectedUser ? "" : formData.inviteEmail;
      const validationData = { ...formData, inviteEmail: emailToValidate };
      
      const validationResult = projectSchema.safeParse(validationData);
      if (!validationResult.success) {
        toast({
          title: "Invalid input",
          description: validationResult.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
      
      // Additional email validation only if email provided and no user selected
      if (!selectedUser && emailToValidate && !emailToValidate.includes("@")) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address",
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

      // Create project - created_by is set by database trigger but included for TypeScript
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: validationResult.data.title,
          description: validationResult.data.description || null,
          created_by: user.id, // Required by TypeScript, trigger ensures correctness
          status: 'active' as const,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Get user profile for inviter name
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      // Send invite if user selected or email provided
      if (selectedUser) {
        // Get invitee's email for notification
        const { data: { user: inviteeUser } } = await supabase.auth.admin.getUserById(selectedUser.user_id);
        const inviteeEmail = inviteeUser?.email;

        // Invite by user_id (from circle)
        const { error: inviteError } = await supabase
          .from('project_collaborators')
          .insert({
            project_id: project.id,
            user_id: selectedUser.user_id,
            email: inviteeEmail || `user-${selectedUser.user_id}@platform.invite`,
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
          // Send email and notification
          if (inviteeEmail) {
            await supabase.functions.invoke('send-project-invitation', {
              body: {
                email: inviteeEmail,
                projectTitle: validationResult.data.title,
                projectId: project.id,
                inviterName: userProfile?.full_name || 'A ThriveIN user',
                inviteeUserId: selectedUser.user_id,
              }
            });
          }
          
          toast({
            title: "Project created! 🎉",
            description: `Invitation sent to ${selectedUser.full_name}`,
          });
        }
      } else if (validationResult.data.inviteEmail) {
        // Invite by email
        const { error: inviteError } = await supabase
          .from('project_collaborators')
          .insert({
            project_id: project.id,
            email: validationResult.data.inviteEmail.toLowerCase(),
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
          // Send email notification
          await supabase.functions.invoke('send-project-invitation', {
            body: {
              email: validationResult.data.inviteEmail.toLowerCase(),
              projectTitle: validationResult.data.title,
              projectId: project.id,
              inviterName: userProfile?.full_name || 'A ThriveIN user',
            }
          });

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

      // Reset form and close dialog FIRST
      setFormData({ title: "", description: "", inviteEmail: "" });
      setSelectedUser(null);
      setShowInviteDropdown(false);
      onSuccess();
      onOpenChange(false);
      
      // Navigate after a brief delay to ensure dialog closes
      setTimeout(() => {
        navigate(`/desk/${project.id}`);
      }, 100);
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
            
            {selectedUser ? (
              <div className="flex items-center gap-3 p-3 border-2 border-primary rounded-lg bg-primary/5">
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  <AvatarImage src={selectedUser.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                    {selectedUser.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{selectedUser.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.role}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(null);
                    setFormData({ ...formData, inviteEmail: "" });
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  id="inviteEmail"
                  placeholder="Search your circle or enter email..."
                  value={formData.inviteEmail}
                  onChange={(e) => {
                    setFormData({ ...formData, inviteEmail: e.target.value });
                    setShowInviteDropdown(true);
                  }}
                  onFocus={() => setShowInviteDropdown(true)}
                  className="h-12 text-base"
                />
                
                {showInviteDropdown && formData.inviteEmail && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg">
                    <ScrollArea className="max-h-[250px]">
                      {/* Show filtered circle connections */}
                      {filteredConnections.length > 0 && (
                        <div className="p-2 space-y-1">
                          <div className="px-2 py-1 flex items-center gap-2">
                            <Users className="h-3 w-3 text-primary" />
                            <span className="text-xs font-medium text-muted-foreground">
                              From Your Circle
                            </span>
                          </div>
                          {filteredConnections.map((user) => (
                            <button
                              key={user.user_id}
                              onClick={() => {
                                setSelectedUser(user);
                                setFormData({ ...formData, inviteEmail: "" }); // Clear email when selecting from circle
                                setShowInviteDropdown(false);
                              }}
                              className="w-full flex items-center gap-3 p-2 hover:bg-accent rounded-lg transition-colors text-left"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xs">
                                  {user.full_name?.[0] || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{user.full_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Show email invite option if email format detected */}
                      {isEmailFormat && filteredConnections.length === 0 && (
                        <div className="p-3 space-y-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span className="text-xs">Invite by email</span>
                          </div>
                          <button
                            onClick={() => setShowInviteDropdown(false)}
                            className="w-full flex items-center gap-3 p-2 border-2 border-dashed rounded-lg hover:bg-accent transition-colors text-left"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{formData.inviteEmail}</p>
                              <p className="text-xs text-muted-foreground">Send invitation email</p>
                            </div>
                          </button>
                        </div>
                      )}

                      {/* No matches */}
                      {formData.inviteEmail && filteredConnections.length === 0 && !isEmailFormat && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No matches found. Enter an email to invite them.
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              Search your connections or invite by email
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
