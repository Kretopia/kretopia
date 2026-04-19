import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users } from "lucide-react";

interface Connection {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onCreated: (roomId: string) => void;
}

export const CreateGroupDialog = ({ open, onOpenChange, currentUserId, onCreated }: CreateGroupDialogProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !currentUserId) return;
    const load = async () => {
      setLoading(true);
      const [out, inc] = await Promise.all([
        supabase.from("connections").select("connected_user_id").eq("user_id", currentUserId).eq("status", "accepted"),
        supabase.from("connections").select("user_id").eq("connected_user_id", currentUserId).eq("status", "accepted"),
      ]);
      const ids = new Set<string>();
      out.data?.forEach((c) => ids.add(c.connected_user_id));
      inc.data?.forEach((c) => ids.add(c.user_id));
      if (ids.size === 0) {
        setConnections([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, role")
        .in("user_id", Array.from(ids));
      setConnections(
        (data || []).map((p) => ({
          id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          role: p.role,
        }))
      );
      setLoading(false);
    };
    load();
  }, [open, currentUserId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!title.trim() || selected.size === 0) {
      toast({ title: "Add a name and pick at least 1 person", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: room, error: roomErr } = await supabase
        .from("spark_rooms")
        .insert({
          title: title.trim(),
          created_by: currentUserId,
          is_private: true,
          circle_type: "group",
          category: "private",
          icon_emoji: "💬",
        })
        .select()
        .single();
      if (roomErr) throw roomErr;

      const memberRows = [
        { room_id: room.id, user_id: currentUserId, role: "owner" },
        ...Array.from(selected).map((uid) => ({ room_id: room.id, user_id: uid, role: "member" })),
      ];
      const { error: memErr } = await supabase.from("spark_room_members").insert(memberRows);
      if (memErr) throw memErr;

      toast({ title: "Group created", description: `${selected.size + 1} members added.` });
      setTitle("");
      setSelected(new Set());
      onCreated(room.id);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Couldn't create group", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> New Group Chat
          </DialogTitle>
          <DialogDescription>
            Bring a few connections into a private chat. You can promote it to a Project later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-title">Group name</Label>
            <Input
              id="group-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Spring Campaign Crew"
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label>Add members ({selected.size})</Label>
            <ScrollArea className="h-[260px] rounded-md border border-border">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading connections…</div>
              ) : connections.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No connections yet. Match with creators in Circle first.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {connections.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/40"
                    >
                      <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={c.avatar_url || undefined} />
                        <AvatarFallback>{(c.full_name || "U").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.full_name || "Unknown"}</p>
                        {c.role && <p className="text-xs text-muted-foreground truncate">{c.role}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={submitting || !title.trim() || selected.size === 0}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
