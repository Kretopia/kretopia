import { useState } from "react";
import { Pencil, Loader2, Plus, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.description ?? "");
  const [saving, setSaving] = useState(false);

  // Simple heuristic: image files attached to the project become moodboard references
  const moodboard = files.filter((f) => {
    const url: string = f.file_url || f.url || "";
    return /\.(jpe?g|png|gif|webp|avif)$/i.test(url);
  });

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("projects")
      .update({ description: draft.trim() || null })
      .eq("id", project.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save brief", description: error.message, variant: "destructive" });
      return;
    }
    setEditing(false);
    onUpdated();
  };

  return (
    <section className="px-4 py-5 space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
          The Brief
        </h2>
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
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {project.description}
        </p>
      ) : (
        <button
          type="button"
          disabled={!isOwner}
          onClick={() => setEditing(true)}
          className={cn(
            "w-full text-left rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground",
            isOwner && "hover:border-primary hover:text-foreground transition-colors"
          )}
        >
          {isOwner
            ? "Drop the vision here. Tone, references, who it's for…"
            : "No brief yet."}
        </button>
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
              {moodboard.map((f) => {
                const url = f.file_url || f.url;
                return (
                  <a
                    key={f.id ?? url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 snap-start block w-28 h-28 rounded-lg overflow-hidden bg-muted ring-1 ring-border"
                  >
                    <img
                      src={url}
                      alt={f.name || "Reference"}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
