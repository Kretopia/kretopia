import { useState, useMemo } from "react";
import { Plus, Image as ImageIcon, FileText, AudioLines, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type TaskStatus = "todo" | "in_progress" | "done";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus | string;
  attachment_url?: string | null;
  attachment_kind?: string | null;
}

interface WorkSectionProps {
  tasks: Task[];
  projectId: string;
  currentUserId: string;
  onUpdated: () => void;
}

const LANES: Array<{ id: TaskStatus; label: string }> = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

const attachmentIcon = (url?: string | null, kind?: string | null) => {
  if (!url) return null;
  if (kind === "audio" || /\.(mp3|wav|m4a|ogg|webm)$/i.test(url))
    return <AudioLines className="h-3.5 w-3.5" />;
  if (/\.(jpe?g|png|gif|webp|avif)$/i.test(url))
    return <ImageIcon className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
};

export const WorkSection = ({
  tasks,
  projectId,
  currentUserId,
  onUpdated,
}: WorkSectionProps) => {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const lanes = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const t of tasks) {
      const s = (t.status as TaskStatus) in map ? (t.status as TaskStatus) : "todo";
      map[s].push(t);
    }
    return map;
  }, [tasks]);

  const handleAdd = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("project_tasks").insert({
      project_id: projectId,
      title: draft.trim(),
      status: "todo",
      created_by: currentUserId,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't add task", description: error.message, variant: "destructive" });
      return;
    }
    setDraft("");
    setAdding(false);
    onUpdated();
  };

  const cycleStatus = async (task: Task) => {
    const next: TaskStatus =
      task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    const { error } = await supabase
      .from("project_tasks")
      .update({ status: next })
      .eq("id", task.id);
    if (error) {
      toast({ title: "Couldn't update task", description: error.message, variant: "destructive" });
      return;
    }
    onUpdated();
  };

  return (
    <section className="px-4 py-5 space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
          The Work
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {lanes.done.length}/{tasks.length} done
        </span>
      </header>

      {/* Mobile = horizontal swim lanes */}
      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="grid grid-flow-col auto-cols-[80vw] gap-3 sm:auto-cols-[18rem]">
          {LANES.map((lane) => {
            const items = lanes[lane.id];
            return (
              <div
                key={lane.id}
                className="rounded-xl bg-muted/40 ring-1 ring-border p-2.5 flex flex-col gap-2 min-h-[180px]"
              >
                <div className="flex items-center justify-between px-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {lane.label}
                  </p>
                  <span className="text-[10px] text-muted-foreground">{items.length}</span>
                </div>

                {items.map((task) => {
                  const isExpanded = expandedId === task.id;
                  const isDone = task.status === "done";
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : task.id)}
                      className={cn(
                        "text-left rounded-lg bg-card ring-1 ring-border p-2.5 hover:ring-primary/40 transition-all",
                        isDone && "opacity-70"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          aria-label="Toggle status"
                          onClick={(e) => {
                            e.stopPropagation();
                            cycleStatus(task);
                          }}
                          className={cn(
                            "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                            isDone
                              ? "bg-primary border-primary"
                              : task.status === "in_progress"
                              ? "border-primary"
                              : "border-muted-foreground/40"
                          )}
                        >
                          {isDone && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm leading-snug break-words",
                              isDone && "line-through text-muted-foreground"
                            )}
                          >
                            {task.title}
                          </p>
                          {task.attachment_url && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              {attachmentIcon(task.attachment_url, task.attachment_kind)}
                              attachment
                            </span>
                          )}
                          {isExpanded && task.description && (
                            <p className="mt-1.5 text-xs text-muted-foreground whitespace-pre-wrap">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Add task at end of To Do */}
                {lane.id === "todo" && (
                  adding ? (
                    <div className="space-y-1.5">
                      <Input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAdd();
                          if (e.key === "Escape") {
                            setAdding(false);
                            setDraft("");
                          }
                        }}
                        placeholder="What's the next thing?"
                        className="h-8 text-sm"
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={saving}>
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            setAdding(false);
                            setDraft("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAdding(true)}
                      className="rounded-lg border border-dashed border-border p-2.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add task
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
