import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Search, Send, Loader2 } from "lucide-react";
import type { SharedContentType } from "./SharedContentCard";

interface ShareToMessageDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contentType: SharedContentType;
  contentId: string;
  contentMeta?: { title?: string; subtitle?: string; image_url?: string };
}

interface Connection {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export const ShareToMessageDialog = ({ open, onOpenChange, contentType, contentId, contentMeta }: ShareToMessageDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    setSelected(new Set());
    setNote("");
    setSearch("");
    (async () => {
      const [out, inc] = await Promise.all([
        supabase.from("connections").select("connected_user_id").eq("user_id", user.id).eq("status", "accepted"),
        supabase.from("connections").select("user_id").eq("connected_user_id", user.id).eq("status", "accepted"),
      ]);
      const ids = new Set<string>();
      out.data?.forEach(c => ids.add(c.connected_user_id));
      inc.data?.forEach(c => ids.add(c.user_id));
      if (ids.size === 0) { setConnections([]); setLoading(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", Array.from(ids));
      setConnections(data || []);
      setLoading(false);
    })();
  }, [open, user]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const send = async () => {
    if (!user || selected.size === 0) return;
    setSending(true);
    try {
      const rows = Array.from(selected).map(receiver_id => ({
        sender_id: user.id,
        receiver_id,
        content: note.trim() || `Shared a ${contentType}`,
        shared_content_type: contentType,
        shared_content_id: contentId,
        shared_content_meta: contentMeta || null,
        read: false,
      }));
      const { error } = await supabase.from("messages").insert(rows);
      if (error) throw error;
      toast({ title: "Shared!", description: `Sent to ${selected.size} ${selected.size === 1 ? "person" : "people"}` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Could not share", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const filtered = connections.filter(c => (c.full_name || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Share to chat</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search people..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-full" />
        </div>
        <ScrollArea className="flex-1 -mx-6 px-6 max-h-[300px]">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No connections found</div>
          ) : (
            <div className="space-y-1">
              {filtered.map(c => {
                const isSel = selected.has(c.user_id);
                return (
                  <button
                    key={c.user_id}
                    onClick={() => toggle(c.user_id)}
                    className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors ${isSel ? "bg-primary/10" : "hover:bg-muted"}`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={c.avatar_url || undefined} />
                      <AvatarFallback>{(c.full_name || "U")[0]}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-left text-sm font-medium truncate">{c.full_name || "Unknown"}</span>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${isSel ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                      {isSel && <span className="text-primary-foreground text-xs">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <Input placeholder="Write a message (optional)…" value={note} onChange={e => setNote(e.target.value)} />
        <Button onClick={send} disabled={selected.size === 0 || sending} className="gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send to {selected.size || ""} {selected.size === 1 ? "chat" : "chats"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
