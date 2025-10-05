import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, Mail, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InviteCollaboratorDialogProps {
  projectId: string;
  onInvite: () => void;
}

export const InviteCollaboratorDialog = ({ projectId, onInvite }: InviteCollaboratorDialogProps) => {
  const [email, setEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Load connected users when dialog opens
  useEffect(() => {
    if (open) {
      loadConnectedUsers();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery]);

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
          .select("user_id, full_name, avatar_url, role, professional_skills")
          .in("user_id", Array.from(connectedIds));

        setConnectedUsers(profiles || []);
      }
    } catch (error) {
      console.error("Error loading connected users:", error);
    }
  };

  const searchUsers = async () => {
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .or(`full_name.ilike.%${searchQuery}%,role.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleInviteByEmail = async () => {
    if (!email) return;
    
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('project_collaborators')
        .insert({
          project_id: projectId,
          email: email.toLowerCase(),
          invited_by: user.id,
          role: 'member',
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Invite sent! 📧",
        description: `Invitation sent to ${email}`,
      });
      setEmail("");
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

      // For existing users, use a placeholder email since we have their user_id
      const { error } = await supabase
        .from('project_collaborators')
        .insert({
          project_id: projectId,
          user_id: userId,
          email: `user-${userId}@platform.invite`, // Placeholder for direct user invites
          invited_by: user.id,
          role: 'member',
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Invite sent! 🎉",
        description: `${userName} has been invited to the project`,
      });
      setSearchQuery("");
      setUsers([]);
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
          <DialogDescription>Search for users on the platform or invite by email</DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              Search Users
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              By Email
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-4">
            {/* Connected Users Section */}
            {connectedUsers.length > 0 && searchQuery.length === 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-2">
                  <UserPlus className="h-3 w-3" />
                  From Your Circle
                </Label>
                <ScrollArea className="h-[200px] rounded-md border p-2 bg-primary/5">
                  {connectedUsers.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors mb-1"
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
                </ScrollArea>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="search">Search by name or role</Label>
              <Input
                id="search"
                placeholder="Type to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <ScrollArea className="h-[200px] rounded-md border p-2">
              {searching && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {!searching && users.length === 0 && searchQuery.length > 2 && (
                <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
              )}
              
              {!searching && users.length === 0 && searchQuery.length <= 2 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Type at least 3 characters to search
                </p>
              )}
              
              {!searching && users.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.full_name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleInviteUser(user.user_id, user.full_name)}
                    disabled={sending}
                  >
                    Invite
                  </Button>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="collaborator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleInviteByEmail} 
              disabled={sending || !email} 
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              {sending ? "Sending..." : "Send Invite"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
