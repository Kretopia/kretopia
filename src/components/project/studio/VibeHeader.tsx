import { useState, useRef } from "react";
import { Camera, Loader2, Pencil, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MoodPicker, moodEmoji, type MoodId } from "./MoodPicker";
import { moodGradient } from "./moodGradient";
import { format } from "date-fns";


interface VibeHeaderProps {
  project: {
    id: string;
    title: string;
    cover_url?: string | null;
    mood?: string | null;
    client_name?: string | null;
    deadline?: string | null;
    status?: string | null;
  };
  clientDisplayName?: string | null;
  isOwner: boolean;
  onUpdated: () => void;
}

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  active: { label: "In Progress", tone: "bg-primary/10 text-primary border-primary/20" },
  planning: { label: "Planning", tone: "bg-muted text-muted-foreground border-border" },
  wrapping: { label: "Wrapping Up", tone: "bg-accent/40 text-accent-foreground border-accent" },
  completed: { label: "Done ✓", tone: "bg-secondary text-secondary-foreground border-border" },
};

export const VibeHeader = ({ project, clientDisplayName, isOwner, onUpdated }: VibeHeaderProps) => {
  const { toast } = useToast();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(project.title);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const status = STATUS_LABELS[project.status ?? "active"] ?? STATUS_LABELS.active;
  const moodGlyph = moodEmoji(project.mood);
  const due = project.deadline ? new Date(project.deadline) : null;

  const updateProject = async (patch: Record<string, any>) => {
    const { error } = await supabase.from("projects").update(patch).eq("id", project.id);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return false;
    }
    onUpdated();
    return true;
  };

  const handleMood = (mood: MoodId) => {
    if (!isOwner) return;
    void updateProject({ mood });
  };

  const handleTitleSave = async () => {
    const next = titleDraft.trim();
    if (!next || next === project.title) {
      setEditingTitle(false);
      setTitleDraft(project.title);
      return;
    }
    const ok = await updateProject({ title: next });
    if (ok) setEditingTitle(false);
  };

  const handleCoverPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${project.id}/cover-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("project-files")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("project-files").getPublicUrl(path);
      await updateProject({ cover_url: data.publicUrl });
    } catch (err: any) {
      toast({ title: "Cover upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const hasCover = !!project.cover_url;

  return (
    <section className="relative">
      {/* Cover — uploaded photo gets a hero treatment.
          Without a cover we show a slim mood strip (no giant emoji) so the
          page doesn't feel dominated by a placeholder. */}
      <div
        className={cn(
          "relative w-full overflow-hidden border-b border-border",
          hasCover ? "aspect-[16/7] sm:aspect-[16/6]" : "h-20 sm:h-24",
        )}
        style={
          hasCover
            ? undefined
            : { background: moodGradient(project.mood) }
        }
      >
        {hasCover && (
          <img
            src={project.cover_url!}
            alt={`${project.title} cover`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Soft fade so text reads on top */}
        <div
          className={cn(
            "absolute inset-0",
            hasCover
              ? "bg-gradient-to-t from-background via-background/40 to-transparent"
              : "bg-gradient-to-t from-background via-background/30 to-transparent",
          )}
        />

        {/* Tiny mood glyph in the corner — never the centerpiece */}
        {!hasCover && moodGlyph && (
          <span className="absolute top-2 left-3 text-base opacity-70 select-none">
            {moodGlyph}
          </span>
        )}

        {isOwner && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverPick}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label={hasCover ? "Change cover" : "Add cover photo"}
              className="absolute top-2 right-2 h-7 gap-1 rounded-full bg-background/85 hover:bg-background text-xs"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              {!hasCover && <span>Add cover</span>}
            </Button>
          </>
        )}
      </div>

      {/* Body */}
      <div className="px-4 -mt-10 relative z-10 space-y-3">
        {/* Mood + Status */}
        <div className="flex items-center justify-between gap-2">
          <MoodPicker value={project.mood ?? null} onChange={handleMood} />
          <Badge variant="outline" className={cn("shrink-0", status.tone)}>
            {status.label}
          </Badge>
        </div>

        {/* Title */}
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave();
              if (e.key === "Escape") {
                setEditingTitle(false);
                setTitleDraft(project.title);
              }
            }}
            className="w-full bg-transparent text-2xl font-bold tracking-tight outline-none border-b-2 border-primary pb-1"
          />
        ) : (
          <button
            type="button"
            disabled={!isOwner}
            onClick={() => isOwner && setEditingTitle(true)}
            className="group flex items-start gap-2 text-left w-full"
          >
            <h1 className="text-2xl font-bold leading-tight break-words">
              {project.title}
            </h1>
            {isOwner && (
              <Pencil className="h-3.5 w-3.5 text-muted-foreground/60 mt-2 opacity-0 group-hover:opacity-100" />
            )}
          </button>
        )}

        {/* Client + due date row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {(clientDisplayName || project.client_name) && (
            <span className="truncate">For {clientDisplayName ?? project.client_name}</span>
          )}
          {due && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(due, "MMM d, yyyy")}
            </span>
          )}
        </div>

        {/* Invite lives in The People section + the workspace header — no dup here */}
      </div>
    </section>
  );
};
