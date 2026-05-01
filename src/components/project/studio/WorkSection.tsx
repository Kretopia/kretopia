import { useState, useMemo } from "react";
import {
  Plus,
  Image as ImageIcon,
  FileText,
  AudioLines,
  Loader2,
  Check,
  Flame,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
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
  priority?: string | null;
  attachment_url?: string | null;
  attachment_kind?: string | null;
}

interface WorkSectionProps {
  tasks: Task[];
  projectId: string;
  currentUserId: string;
  onUpdated: () => void;
}

const attachmentIcon = (url?: string | null, kind?: string | null) => {
  if (!url) return null;
  if (kind === "audio" || /\.(mp3|wav|m4a|ogg|webm)$/i.test(url))
    return <AudioLines className="h-3.5 w-3.5" />;
  if (/\.(jpe?g|png|gif|webp|avif)$/i.test(url))
    return <ImageIcon className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
};

const isBlocking = (t: Task) => {
  const p = (t.priority || "").toLowerCase();
  return p === "blocking" || p === "urgent" || p === "high";
};

/**
 * Scroll-native task feed (replaces Kanban).
 * - Blocking tasks pinned at top with flame badge
 * - Active tasks in a single vertical list with one-tap complete
 * - Completed work auto-collapses into a "Completed (X)" folder
 */
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
  const [folderOpen, setFolderOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { blocking, active, done } = useMemo(() => {
    const blocking: Task[] = [];
    const active: Task[] = [];
    const done: Task[] = [];
    for (const t of tasks) {
      if (t.status === "done") done.push(t);
      else if (isBlocking(t)) blocking.push(t);
      else active.push(t);
    }
    return { blocking, active, done };
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

  const markDone = async (task: Task) => {
    setBusyId(task.id);
    const { error } = await supabase
      .from("project_tasks")
      .update({ status: "done" })
      .eq("id", task.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    onUpdated();
  };

  const reopen = async (task: Task) => {
    setBusyId(task.id);
    const { error } = await supabase
      .from("project_tasks")
      .update({ status: "todo" })
      .eq("id", task.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Couldn't reopen", description: error.message, variant: "destructive" });
      return;
    }
    onUpdated();
  };

  const TaskRow = ({ task, isDone }: { task: Task; isDone: boolean }) => {
    const expanded = expandedId === task.id;
    const blocking = isBlocking(task);
    return (
      <button
        type="button"
        onClick={() => setExpandedId(expanded ? null : task.id)}
        className={cn(
          "w-full text-left rounded-xl bg-card ring-1 ring-border p-3 transition-all hover:ring-primary/40",
          blocking && !isDone && "ring-destructive/40 bg-destructive/5",
          isDone && "opacity-60"
        )}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            aria-label={isDone ? "Reopen task" : "Mark done"}
            disabled={busyId === task.id}
            onClick={(e) => {
              e.stopPropagation();
              isDone ? reopen(task) : markDone(task);
            }}
            className={cn(
              "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
              isDone
                ? "bg-primary border-primary"
                : blocking
                ? "border-destructive hover:bg-destructive/10"
                : "border-muted-foreground/40 hover:border-primary"
            )}
          >
            {busyId === task.id ? (
              <Loader2 className="h-3 w-3 animate-spin text-foreground" />
            ) : isDone ? (
              <Check className="h-3 w-3 text-primary-foreground" />
            ) : null}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {blocking && !isDone && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-destructive">
                  <Flame className="h-2.5 w-2.5" /> Blocking
                </span>
              )}
              <p
                className={cn(
                  "text-sm leading-snug break-words",
                  isDone && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </p>
            </div>
            {task.attachment_url && (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                {attachmentIcon(task.attachment_url, task.attachment_kind)}
                attachment
              </span>
            )}
            {expanded && task.description && (
              <p className="mt-1.5 text-xs text-muted-foreground whitespace-pre-wrap">
                {task.description}
              </p>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <section className="px-4 py-5 space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
          The Work
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {done.length}/{tasks.length} done
        </span>
      </header>

      {/* Blocking — pinned top */}
      {blocking.length > 0 && (
        <div className="space-y-2">
          {blocking.map((t) => (
            <TaskRow key={t.id} task={t} isDone={false} />
          ))}
        </div>
      )}

      {/* Active stream */}
      <div className="space-y-2">
        {active.map((t) => (
          <TaskRow key={t.id} task={t} isDone={false} />
        ))}

        {active.length === 0 && blocking.length === 0 && tasks.length === 0 && !adding && (
          <div className="rounded-2xl bg-card ring-1 ring-border p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">
                  Break the project into small wins
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  Tasks are the moves that get this project done — anything
                  with a clear "done" you can tick off. Small &amp; specific
                  beats vague every time.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Try one of these
              </p>
              {[
                "Send draft to client",
                "Edit final cut",
                "Confirm shoot date",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setDraft(suggestion);
                    setAdding(true);
                  }}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/40 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-3 w-3 text-primary shrink-0" />
                  {suggestion}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              className="w-full gap-1.5"
              onClick={() => setAdding(true)}
            >
              <Plus className="h-4 w-4" /> Add first task
            </Button>
          </div>
        )}
        {active.length === 0 && blocking.length === 0 && done.length > 0 && (
          <p className="text-xs text-muted-foreground py-2 text-center">
            All caught up. Nice work.
          </p>
        )}

        {/* Add task — always visible */}
        {adding ? (
          <div className="space-y-1.5 rounded-xl border border-primary/40 p-2.5">
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
              className="h-9 text-sm border-0 focus-visible:ring-0 px-1"
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  setAdding(false);
                  setDraft("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : tasks.length === 0 ? null : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add task
          </button>
        )}
      </div>

      {/* Completed folder */}
      {done.length > 0 && (
        <div className="rounded-xl bg-muted/40 ring-1 ring-border overflow-hidden">
          <button
            type="button"
            onClick={() => setFolderOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-primary" />
              Completed ({done.length})
            </span>
            {folderOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {folderOpen && (
            <div className="p-2 space-y-1.5 border-t border-border/60">
              {done.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg bg-card/60 px-2.5 py-2"
                >
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="flex-1 text-xs line-through text-muted-foreground truncate">
                    {t.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => reopen(t)}
                    disabled={busyId === t.id}
                    className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
                  >
                    <RotateCcw className="h-3 w-3" /> Reopen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
