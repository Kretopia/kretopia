import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pin, Loader2, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Props {
  circleId: string;
  isMember: boolean;
  isAdmin: boolean;
  onOpenChat: () => void;
}

interface FeedPost {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
  media_url: string | null;
  media_type: string | null;
  message_type: string | null;
  author?: { full_name: string | null; avatar_url: string | null };
}

export const CircleFeedTab = ({ circleId, isMember, isAdmin, onOpenChat }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("spark_room_messages")
        .select("id, user_id, content, created_at, is_pinned, media_url, media_type, message_type")
        .eq("room_id", circleId)
        .or("is_pinned.eq.true,message_type.eq.announcement")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      const rows = (data || []) as FeedPost[];
      const ids = Array.from(new Set(rows.map(r => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", ids);
        const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
        rows.forEach(r => { r.author = map.get(r.user_id) as any; });
      }
      setPosts(rows);
    } catch (e) {
      console.error("feed load", e);
    } finally {
      setLoading(false);
    }
  }, [circleId]);

  useEffect(() => { load().catch(() => null); }, [load]);

  const post = async () => {
    if (!user || !draft.trim()) return;
    setPosting(true);
    try {
      const { error } = await supabase.from("spark_room_messages").insert({
        room_id: circleId,
        user_id: user.id,
        content: draft.trim(),
        message_type: "announcement",
        is_pinned: false,
      });
      if (error) throw error;
      setDraft("");
      toast({ title: "Posted to the Crew feed" });
      load().catch(() => null);
    } catch (e: any) {
      toast({ title: "Couldn't post", description: e.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="px-4 space-y-4">
      {isMember && isAdmin && (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share an update with the Crew…"
            rows={3}
            className="resize-none border-0 bg-transparent focus-visible:ring-0 px-0"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Posts as an announcement</span>
            <Button size="sm" onClick={post} disabled={!draft.trim() || posting}>
              {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              Post
            </Button>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p>No announcements yet.</p>
          <Button variant="link" onClick={onOpenChat} className="mt-2">Open the Room chat</Button>
        </div>
      ) : (
        posts.map(p => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-3">
            {p.is_pinned && (
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary mb-2">
                <Pin className="h-3 w-3" /> Pinned
              </div>
            )}
            <div className="flex items-start gap-2.5">
              <Avatar className="h-8 w-8">
                <AvatarImage src={p.author?.avatar_url || undefined} />
                <AvatarFallback>{p.author?.full_name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold truncate">{p.author?.full_name || "Member"}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap break-words">{p.content}</p>
                {p.media_url && p.media_type?.startsWith("image") && (
                  <img src={p.media_url} alt="" className="mt-2 rounded-lg max-h-80 object-cover" loading="lazy" />
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
