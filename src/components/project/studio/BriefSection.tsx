import { useState } from "react";
import { Pencil, Loader2, Plus, ImageIcon, Mic, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { MoodboardThumb } from "./MoodboardThumb";
import { BriefVoiceRecorder } from "./BriefVoiceRecorder";

interface BriefSectionProps {
  project: {
    id: string;
    description: string | null;
  };
  files: any[];
  isOwner: boolean;
  onUpdated: () => void;
  onAddReference: () => void;
}

export const BriefSection = ({
  project,
  files,
  isOwner,
  onUpdated,
  onAddReference,
}: BriefSectionProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.description ?? "");
  const [saving, setSaving] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [breakingDown, setBreakingDown] = useState(false);

  const breakIntoTasks = async () => {
    if (!project.description?.trim() || !user) return;
    setBreakingDown(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-brief", {
        body: { source: "text", text: project.description, project_title: undefined },
      });
      if (error) throw error;
      const list: Array<{ title: string; description?: string | null }> = Array.isArray(
        (data as any)?.deliverables,
      )
        ? (data as any).deliverables.slice(0, 8)
        : [];
      if (!list.length) {
        toast({
          title: "Nothing to break down yet",
          description: "Add more detail to the brief and try again.",
        });
        return;
      }
      const rows = list.map((d) => ({
        project_id: project.id,
        title: d.title.slice(0, 200),
        description: d.description ?? null,
        status: "todo",
        created_by: user.id,
      }));
      const { error: insErr } = await supabase.from("project_tasks").insert(rows);
      if (insErr) throw insErr;
      toast({
        title: `${rows.length} task${rows.length === 1 ? "" : "s"} added`,
        description: "Find them in the Studio feed.",
      });
      onUpdated();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Couldn't break it down",
        description: err.message ?? "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setBreakingDown(false);
    }
  };

  // Image files attached to the project become moodboard references
  const moodboard = files.filter((f) => {
    const url: string = f.file_url || f.url || "";
    const type: string = f.file_type || "";
    return /^image\//i.test(type) || /\.(jpe?g|png|gif|webp|avif)$/i.test(url);
  });

  const persist = async (text: string) => {
    const { error } = await supabase
      .from("projects")
      .update({ description: text.trim() || null })
      .eq("id", project.id);
    if (error) {
      toast({ title: "Couldn't save brief", description: error.message, variant: "destructive" });
      return false;
    }
    onUpdated();
    return true;
  };

  const save = async () => {
    setSaving(true);
    const ok = await persist(draft);
    setSaving(false);
    if (ok) setEditing(false);
  };

  return (
    <section className="px-4 py-5 space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
          The Brief
        </h2>
        <div className="flex items-center gap-1">
          {isOwner && !editing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setVoiceOpen(true)}
              aria-label="Record brief"
            >
              <Mic className="h-3.5 w-3.5" /> Voice
            </Button>
          )}
          {isOwner && !editing && project.description && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => {
                setDraft(project.description ?? "");
                setEditing(true);
              }}
            >
              <Pencil className="h-3 w-3" /> Edit
            </Button>
          )}
        </div>
      </header>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What's the vision? Tone, references, who it's for…"
            className="min-h-[120px] text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setDraft(project.description ?? "");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : project.description ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {project.description}
          </p>
          {isOwner && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={breakIntoTasks}
              disabled={breakingDown}
            >
              {breakingDown ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ListChecks className="h-3.5 w-3.5" />
              )}
              {breakingDown ? "Breaking it down…" : "Break into tasks"}
            </Button>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "w-full rounded-2xl bg-card ring-1 ring-border p-4 flex items-start gap-3",
          )}
        >
          <button
            type="button"
            disabled={!isOwner}
            onClick={() => isOwner && setVoiceOpen(true)}
            className="h-10 w-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors"
            aria-label="Record brief"
          >
            <Mic className="h-5 w-5 text-primary" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">
              {isOwner ? "Speak the vision" : "No brief yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isOwner
                ? "Tap the mic to record, or "
                : "The owner hasn't dropped the brief yet."}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  type it
                </button>
              )}
              {isOwner && "."}
            </p>
          </div>
        </div>
      )}

      {/* Moodboard */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Moodboard
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={onAddReference}
          >
            <Plus className="h-3 w-3" /> Add reference
          </Button>
        </div>

        {moodboard.length === 0 ? (
          <button
            type="button"
            onClick={onAddReference}
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-border h-20 text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
          >
            <ImageIcon className="h-4 w-4" /> Drop images here to set the mood
          </button>
        ) : (
          <div className="-mx-4 px-4 overflow-x-auto">
            <div className="flex gap-2 pb-1 snap-x">
              {moodboard.map((f) => (
                <div
                  key={f.id ?? f.file_url}
                  className="shrink-0 snap-start w-28 h-28 rounded-lg overflow-hidden bg-muted ring-1 ring-border"
                >
                  <MoodboardThumb
                    storedUrl={f.file_url}
                    alt={f.file_name || "Reference"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BriefVoiceRecorder
        open={voiceOpen}
        onOpenChange={setVoiceOpen}
        projectId={project.id}
        userId={user?.id}
        onSave={async (text) => {
          await persist(text);
        }}
        onTasksCreated={onUpdated}
      />
    </section>
  );
};
