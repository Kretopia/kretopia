import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ImagePlus,
  Loader2,
  Send,
  Sparkles,
  Check,
  ListChecks,
  Image as ImageIcon,
  StickyNote,
  FileText,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface PulsePost {
  id: string;
  project_id: string;
  author_id: string;
  content: string | null;
  image_urls: string[];
  kind: string;
  routed_to: string | null;
  approval_status: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
}

interface Person {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface Props {
  projectId: string;
  currentUserId: string;
  collaborators: Person[];
}

const KIND_META: Record<
  string,
  { label: string; icon: any; tone: string }
> = {
  pending: { label: "Routing…", icon: Sparkles, tone: "text-muted-foreground" },
  task: { label: "Added to Tasks", icon: ListChecks, tone: "text-primary" },
  moodboard: {
    label: "Added to Moodboard",
    icon: ImageIcon,
    tone: "text-fuchsia-500",
  },
  note: { label: "Saved as Note", icon: StickyNote, tone: "text-amber-500" },
  brief: { label: "Added to Brief", icon: FileText, tone: "text-sky-500" },
  approval: {
    label: "Approval requested",
    icon: CheckCircle2,
    tone: "text-emerald-500",
  },
  text: { label: "Posted to feed", icon: Sparkles, tone: "text-muted-foreground" },
};

const initials = (n: string) =>
  n.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

export const StudioPulseFeed = ({
  projectId,
  currentUserId,
  collaborators,
}: Props) => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<PulsePost[]>([]);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const peopleById = new Map(collaborators.map((c) => [c.id, c]));

  // Initial load + realtime
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("studio_pulse_posts")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (active && data) setPosts(data as any);
    })().catch((e) => console.warn("[pulse] load failed:", e?.message));

    const channel = supabase
      .channel(`pulse:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "studio_pulse_posts",
          filter: `project_id=eq.${projectId}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setPosts((p) => [payload.new as PulsePost, ...p].slice(0, 20));
          } else if (payload.eventType === "UPDATE") {
            setPosts((p) =>
              p.map((x) => (x.id === payload.new.id ? (payload.new as PulsePost) : x)),
            );
          } else if (payload.eventType === "DELETE") {
            setPosts((p) => p.filter((x) => x.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const pickImages = () => fileRef.current?.click();

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []).slice(0, 4);
    setFiles((cur) => [...cur, ...picked].slice(0, 4));
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (idx: number) =>
    setFiles((cur) => cur.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!draft.trim() && files.length === 0) return;
    setPosting(true);
    try {
      // Upload images first
      const uploadedUrls: string[] = [];
      for (const f of files) {
        const ext = f.name.split(".").pop() || "jpg";
        const path = `${projectId}/pulse-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("project-files")
          .upload(path, f, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        uploadedUrls.push(path);
      }

      const { data: inserted, error } = await supabase
        .from("studio_pulse_posts")
        .insert({
          project_id: projectId,
          author_id: currentUserId,
          content: draft.trim() || null,
          image_urls: uploadedUrls,
          kind: "pending",
        })
        .select("id")
        .single();
      if (error) throw error;

      // Reset composer immediately
      setDraft("");
      setFiles([]);
      setOpen(false);

      // Fire-and-forget AI routing
      supabase.functions
        .invoke("route-studio-post", { body: { post_id: inserted.id } })
        .catch((e) => console.warn("[pulse] route failed:", e?.message));
    } catch (e: any) {
      toast({
        title: "Couldn't post",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  const respondApproval = async (post: PulsePost, status: "approved" | "changes") => {
    await supabase
      .from("studio_pulse_posts")
      .update({ approval_status: status })
      .eq("id", post.id);
  };

  // Resolve image URLs to signed when needed
  const renderImage = (path: string) => {
    const isFull = /^https?:\/\//.test(path);
    if (isFull) return path;
    const { data } = supabase.storage.from("project-files").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <section className="px-4 pt-4 pb-2 space-y-3 border-b border-border/60">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--energy))]">
            Pulse
          </p>
          <h2 className="text-lg font-black leading-none tracking-tight">
            What's happening
          </h2>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </span>
      </div>

      {/* Composer */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onPick}
      />

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-xl border border-dashed border-border p-3 text-left text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          Drop a thought, image, or update — we'll file it for you.
        </button>
      ) : (
        <div className="rounded-xl border border-primary/40 p-2.5 space-y-2 bg-card">
          <textarea
            autoFocus
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What's the update? (e.g. 'v2 ready for approval', 'love this color palette', 'edit final cut by Friday')"
            className="w-full resize-none bg-transparent text-sm border-0 focus-visible:outline-none px-1"
          />

          {files.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {files.map((f, i) => (
                <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden ring-1 ring-border">
                  <img
                    src={URL.createObjectURL(f)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-background/90 ring-1 ring-border flex items-center justify-center"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1.5"
              onClick={pickImages}
              disabled={files.length >= 4}
            >
              <ImagePlus className="h-4 w-4" />
              Add images
            </Button>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  setOpen(false);
                  setDraft("");
                  setFiles([]);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={submit}
                disabled={posting || (!draft.trim() && files.length === 0)}
              >
                {posting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                Post
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      {posts.length > 0 && (
        <div className="space-y-2 pt-1">
          {posts.slice(0, 5).map((p) => {
            const author = peopleById.get(p.author_id);
            const meta = KIND_META[p.kind] ?? KIND_META.text;
            const Icon = meta.icon;
            return (
              <article
                key={p.id}
                className="rounded-xl bg-card ring-1 ring-border p-3 space-y-2"
              >
                <header className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={author?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {initials(author?.full_name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {author?.full_name ?? "Someone"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted",
                      meta.tone,
                    )}
                  >
                    <Icon className="h-2.5 w-2.5" />
                    {meta.label}
                  </span>
                </header>

                {p.content && (
                  <p className="text-sm leading-snug whitespace-pre-wrap">
                    {p.content}
                  </p>
                )}

                {p.image_urls.length > 0 && (
                  <div
                    className={cn(
                      "grid gap-1.5 rounded-lg overflow-hidden",
                      p.image_urls.length === 1 ? "grid-cols-1" : "grid-cols-2",
                    )}
                  >
                    {p.image_urls.slice(0, 4).map((u, i) => (
                      <img
                        key={i}
                        src={renderImage(u)}
                        alt=""
                        className="w-full h-32 object-cover rounded-md"
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}

                {p.kind === "approval" && p.approval_status === "pending" && (
                  <div className="flex gap-1.5 pt-1">
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1 flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => respondApproval(p, "approved")}
                    >
                      <Check className="h-3 w-3" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs flex-1"
                      onClick={() => respondApproval(p, "changes")}
                    >
                      Request changes
                    </Button>
                  </div>
                )}
                {p.kind === "approval" && p.approval_status === "approved" && (
                  <p className="text-[10px] font-semibold text-emerald-500 inline-flex items-center gap-1">
                    <Check className="h-3 w-3" /> Approved
                  </p>
                )}
                {p.kind === "approval" && p.approval_status === "changes" && (
                  <p className="text-[10px] font-semibold text-amber-500">
                    Changes requested
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
