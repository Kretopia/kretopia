import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, Mail, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface InviteCollaboratorDialogProps {
  projectId: string;
  onInvite: () => void;
}

export const InviteCollaboratorDialog = ({ projectId, onInvite }: InviteCollaboratorDialogProps) => {
  const [searchInput, setSearchInput] = useState("");
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Filter connected users based on search
  const filteredConnections = connectedUsers.filter((user) =>
    user.full_name.toLowerCase().includes(searchInput.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchInput.toLowerCase())
  );

  // Check if input looks like an email
  const isEmailFormat = searchInput.includes("@") && searchInput.includes(".");

  // Load connected users when dialog opens
  useEffect(() => {
    if (open) {
      loadConnectedUsers();
    }
  }, [open]);

  const loadConnectedUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No user found for loading connections");
        return;
      }

      console.log("Loading connections for user:", user.id);

      // Get all accepted connections where user is the initiator
      const { data: outgoing, error: outgoingError } = await supabase
        .from("connections")
        .select("connected_user_id")
        .eq("user_id", user.id)
        .eq("status", "accepted");

      console.log("Outgoing connections:", outgoing, outgoingError);

      // Get all accepted connections where user is the recipient
      const { data: incoming, error: incomingError } = await supabase
        .from("connections")
        .select("user_id")
        .eq("connected_user_id", user.id)
        .eq("status", "accepted");

      console.log("Incoming connections:", incoming, incomingError);

      // Get all matches
      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq("status", "matched");

      console.log("Matches:", matches, matchesError);

      const connectedIds = new Set<string>();
      outgoing?.forEach((c) => connectedIds.add(c.connected_user_id));
      incoming?.forEach((c) => connectedIds.add(c.user_id));
      matches?.forEach((m) => {
        connectedIds.add(m.user1_id === user.id ? m.user2_id : m.user1_id);
      });

      // Remove current user from the set (in case of self-references)
      connectedIds.delete(user.id);

      console.log("Connected user IDs:", Array.from(connectedIds));

      if (connectedIds.size > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, role, professional_skills")
          .in("user_id", Array.from(connectedIds));

        console.log("Loaded profiles:", profiles, profilesError);
        setConnectedUsers(profiles || []);
      } else {
        console.log("No connected IDs found");
        setConnectedUsers([]);
      }
    } catch (error) {
      console.error("Error loading connected users:", error);
    }
  };

  const handleInviteByEmail = async (emailToInvite: string) => {
    if (!emailToInvite) return;
    
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user profile for inviter name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      // Get project details
      const { data: project } = await supabase
        .from('projects')
        .select('title')
        .eq('id', projectId)
        .single();

      const { error } = await supabase
        .from('project_collaborators')
        .insert({
          project_id: projectId,
          email: emailToInvite.toLowerCase(),
          invited_by: user.id,
          role: 'member',
          status: 'pending'
        });

      if (error) throw error;

      // Send invitation email
      console.log('Invoking send-project-invitation function for:', emailToInvite);
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-project-invitation', {
        body: {
          email: emailToInvite.toLowerCase(),
          projectTitle: project?.title || 'Untitled Project',
          projectId,
          inviterName: profile?.full_name || 'A ThriveIN user',
        }
      });

      if (emailError) {
        console.error('Edge function error:', emailError);
        throw new Error(`Failed to send email: ${emailError.message}`);
      }

      console.log('Email sent successfully:', emailData);

      toast({
        title: "Invite sent!",
        description: `Invitation sent to ${emailToInvite}`,
      });
      setSearchInput("");
      setOpen(false);
      onInvite();
    } catch (error: any) {
      console.error('Error inviting collaborator:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleInviteUser = async (userId: string, userName: string) => {
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user profile for inviter name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      // Get project details
      const { data: project } = await supabase
        .from('projects')
        .select('title')
        .eq('id', projectId)
        .single();

      // For existing users, use a placeholder email since we have their user_id
      const { error } = await supabase
        .from('project_collaborators')
        .insert({
          project_id: projectId,
          user_id: userId,
          email: `user-${userId}@platform.invite`,
          invited_by: user.id,
          role: 'member',
          status: 'pending'
        });

      if (error) throw error;

      // Always send invitation notification for existing users
      console.log('Invoking send-project-invitation function for user:', userId);
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-project-invitation', {
        body: {
          email: `user-${userId}@platform.invite`,
          projectTitle: project?.title || 'Untitled Project',
          projectId,
          inviterName: profile?.full_name || 'A ThriveIN user',
          inviteeUserId: userId, // This triggers in-app notification
        }
      });

      if (emailError) {
        console.error('Edge function error:', emailError);
        // Don't throw for existing users - they got the in-app notification
        console.warn('Email notification failed but in-app notification was sent');
      } else {
        console.log('Notification sent successfully:', emailData);
      }

      toast({
        title: "Invite sent!",
        description: `${userName} has been invited to the project`,
      });
      setSearchInput("");
      setOpen(false);
      onInvite();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Collaborator</DialogTitle>
          <DialogDescription>
            Start typing to search your circle or enter an email address
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search or Enter Email</Label>
            <div className="relative">
              <Input
                id="search"
                placeholder="Type name, role, or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pr-10"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <ScrollArea className="h-[300px] rounded-md border">
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
                  <div
                    key={user.user_id}
                    className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors group"
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                        {user.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleInviteUser(user.user_id, user.full_name)}
                      disabled={sending}
                      variant="default"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Show email invite option if email format detected */}
            {isEmailFormat && filteredConnections.length === 0 && (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Invite by email</span>
                </div>
                <div className="flex items-center gap-3 p-3 border-2 border-dashed rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{searchInput}</p>
                    <p className="text-xs text-muted-foreground">Send invitation email</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleInviteByEmail(searchInput)}
                    disabled={sending}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                  </Button>
                </div>
              </div>
            )}

            {/* Empty states */}
            {!searchInput && connectedUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No connections yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter an email to invite someone
                </p>
              </div>
            )}

            {!searchInput && connectedUsers.length > 0 && (
              <div className="p-2 space-y-1">
                <div className="px-2 py-1 flex items-center gap-2">
                  <Users className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Your Circle ({connectedUsers.length})
                  </span>
                </div>
                {connectedUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors"
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                        {user.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleInviteUser(user.user_id, user.full_name)}
                      disabled={sending}
                      variant="default"
                    >
                      Invite
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchInput && filteredConnections.length === 0 && !isEmailFormat && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">No matches found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try entering an email address to invite them
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
