import { useState, useRef } from "react";
import { Camera, Loader2, Pencil, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MoodPicker, moodEmoji, type MoodId } from "./MoodPicker";
import { moodGradient } from "./moodGradient";
import { LivePresencePile } from "./LivePresencePile";
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
  collaborators?: Array<{ id: string; full_name: string; avatar_url?: string | null }>;
  onlineUserIds?: Set<string>;
  currentUserId?: string;
}

const STATUS_LABELS: Record<string, { label: string; tone: string; dot: string }> = {
  active: {
    label: "In Progress",
    tone: "bg-[hsl(var(--energy)/0.15)] text-[hsl(var(--energy))] border-[hsl(var(--energy)/0.35)]",
    dot: "bg-[hsl(var(--energy))] shadow-[0_0_8px_hsl(var(--energy)/0.8)]",
  },
  planning: {
    label: "Planning",
    tone: "bg-muted/60 text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
  wrapping: {
    label: "Wrapping Up",
    tone: "bg-primary/15 text-primary border-primary/30",
    dot: "bg-primary",
  },
  completed: {
    label: "Delivered",
    tone: "bg-secondary text-secondary-foreground border-border",
    dot: "bg-success",
  },
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
      {/* Cinematic cover — taller, with violet→magenta veil so titles read like
          a film poster. No-cover state still uses a mood gradient strip. */}
      <div
        className={cn(
          "relative w-full overflow-hidden",
          hasCover ? "aspect-[16/9] sm:aspect-[21/9]" : "h-24 sm:h-28",
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
            className="absolute inset-0 w-full h-full object-cover scale-[1.02]"
          />
        )}

        {/* Brand veil — violet tint + dark fade. Pulls cover into the brand
            world without killing the photo. */}
        {hasCover && (
          <>
            <div
              className="absolute inset-0 mix-blend-multiply opacity-60"
              style={{ background: "var(--gradient-primary)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
          </>
        )}
        {!hasCover && (
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        )}

        {/* Tiny mood glyph for empty state */}
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
              className="absolute top-3 right-3 h-7 gap-1 rounded-full bg-background/85 hover:bg-background text-xs"
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

      {/* Body — sits over the bottom of the cover for a magazine feel */}
      <div
        className={cn(
          "px-4 relative z-10 space-y-3",
          hasCover ? "-mt-20 sm:-mt-24" : "pt-3",
        )}
      >
        {/* Eyebrow + Status row */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold tracking-[0.22em] text-[hsl(var(--energy))] uppercase">
            ThriveDesk · Studio Room
          </p>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border backdrop-blur-sm",
              status.tone,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
        </div>

        {/* Title — sculptural, magazine-grade */}
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
            className="w-full bg-transparent text-3xl sm:text-4xl font-black tracking-[-0.03em] outline-none border-b-2 border-primary pb-1"
          />
        ) : (
          <button
            type="button"
            disabled={!isOwner}
            onClick={() => isOwner && setEditingTitle(true)}
            className="group flex items-start gap-2 text-left w-full"
          >
            <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.03em] leading-[1.05] break-words">
              {project.title}
            </h1>
            {isOwner && (
              <Pencil className="h-3.5 w-3.5 text-muted-foreground/60 mt-2.5 opacity-0 group-hover:opacity-100" />
            )}
          </button>
        )}

        {/* Mood vibe chip + meta row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-card/80 border border-border px-2 py-1 backdrop-blur-sm">
            <MoodPicker value={project.mood ?? null} onChange={handleMood} size="sm" />
          </div>
          {(clientDisplayName || project.client_name) && (
            <span className="text-sm text-muted-foreground truncate">
              For{" "}
              <span className="text-foreground font-semibold">
                {clientDisplayName ?? project.client_name}
              </span>
            </span>
          )}
          {due && (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {format(due, "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>

      {/* Bottom hairline — subtle violet glow to anchor the hero */}
      <div className="mt-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </section>
  );
};
