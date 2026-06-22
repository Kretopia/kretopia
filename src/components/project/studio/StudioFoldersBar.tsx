import { useEffect, useState } from "react";
import {
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Trash2,
  Check,
  X,
  Sparkles,
  LayoutGrid,
  Inbox,
  MoreHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SuggestFoldersDialog } from "./SuggestFoldersDialog";

export interface StudioFolder {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
}

interface StudioFoldersBarProps {
  userId: string;
  folders: StudioFolder[];
  counts: Record<string, number>; // folder_id or "unfiled" -> count
  selected: string; // "all" | "unfiled" | folder id
  onSelect: (id: string) => void;
  onChanged: () => void;
  onDropProject?: (projectId: string, folderId: string | null) => void | Promise<void>;
}

// Map color name → tailwind-ish HSL token tints
const COLOR_TINT: Record<string, { bg: string; ring: string; ink: string }> = {
  teal: {
    bg: "bg-[hsl(var(--signal-teal))]/10",
    ring: "ring-[hsl(var(--signal-teal))]/40",
    ink: "text-[hsl(var(--signal-teal))]",
  },
  magenta: {
    bg: "bg-[hsl(var(--signal-magenta))]/10",
    ring: "ring-[hsl(var(--signal-magenta))]/40",
    ink: "text-[hsl(var(--signal-magenta))]",
  },
  yellow: {
    bg: "bg-[hsl(var(--signal-yellow))]/10",
    ring: "ring-[hsl(var(--signal-yellow))]/40",
    ink: "text-[hsl(var(--signal-yellow))]",
  },
  green: {
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/40",
    ink: "text-emerald-500",
  },
  blue: {
    bg: "bg-sky-500/10",
    ring: "ring-sky-500/40",
    ink: "text-sky-500",
  },
  purple: {
    bg: "bg-violet-500/10",
    ring: "ring-violet-500/40",
    ink: "text-violet-500",
  },
};

const tintFor = (color: string | null | undefined) =>
  COLOR_TINT[(color || "teal").toLowerCase()] || COLOR_TINT.teal;

export const StudioFoldersBar = ({
  userId,
  folders,
  counts,
  selected,
  onSelect,
  onChanged,
  onDropProject,
}: StudioFoldersBarProps) => {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>("teal");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent, key: string) => {
    if (!onDropProject) return;
    if (e.dataTransfer.types.includes("application/x-thrive-project")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dropTarget !== key) setDropTarget(key);
    }
  };
  const handleDragLeave = (key: string) => {
    if (dropTarget === key) setDropTarget(null);
  };
  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    if (!onDropProject) return;
    const projectId = e.dataTransfer.getData("application/x-thrive-project");
    setDropTarget(null);
    if (projectId) {
      e.preventDefault();
      onDropProject(projectId, folderId);
    }
  };

  const totalCount =
    (counts["unfiled"] ?? 0) +
    folders.reduce((sum, f) => sum + (counts[f.id] ?? 0), 0);
  const showSuggest = totalCount >= 3;

  const hintKey = `studio-folders-hint-dismissed`;
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (folders.length === 0 && totalCount >= 2) {
      setShowHint(localStorage.getItem(hintKey) !== "1");
    } else {
      setShowHint(false);
    }
  }, [folders.length, totalCount]);

  const createFolder = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const { error } = await supabase.from("studio_folders").insert({
      user_id: userId,
      name,
      color: newColor,
      sort_order: folders.length,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't create folder", description: error.message, variant: "destructive" });
      return;
    }
    setNewName("");
    setNewColor("teal");
    setCreateOpen(false);
    onChanged();
  };

  const renameFolder = async (id: string) => {
    const name = renameValue.trim();
    if (!name) return;
    setBusy(true);
    const { error } = await supabase
      .from("studio_folders")
      .update({ name })
      .eq("id", id);
    setBusy(false);
    if (error) {
      toast({ title: "Rename failed", description: error.message, variant: "destructive" });
      return;
    }
    setRenamingId(null);
    onChanged();
  };

  const deleteFolder = async (id: string) => {
    if (!confirm("Delete this folder? Projects inside will move back to Unfiled.")) return;
    setBusy(true);
    const { error } = await supabase.from("studio_folders").delete().eq("id", id);
    setBusy(false);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    if (selected === id) onSelect("all");
    onChanged();
  };

  const COLOR_SWATCHES = ["teal", "magenta", "yellow", "green", "blue", "purple"];

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[13px] font-semibold tracking-wide uppercase text-muted-foreground">
            Folders
          </h3>
          <span className="text-[11px] text-muted-foreground/70">· {folders.length}</span>
        </div>
        <div className="flex items-center gap-1">
          {showSuggest && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSuggestOpen(true)}
              className="h-8 px-2.5 rounded-full text-[12px] font-semibold text-[hsl(var(--signal-teal))] hover:bg-[hsl(var(--signal-teal))]/10 gap-1"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Suggest</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCreateOpen(true)}
            className="h-8 px-2.5 rounded-full text-[12px] font-semibold text-muted-foreground hover:text-foreground gap-1"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">New</span>
          </Button>
        </div>
      </div>

      {showHint && (
        <div className="flex items-start gap-2 rounded-xl border border-[hsl(var(--signal-teal))]/30 bg-[hsl(var(--signal-teal))]/5 px-3 py-2 text-[12px]">
          <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[hsl(var(--signal-teal))]" />
          <div className="flex-1">
            <p className="font-semibold leading-tight">Tap a folder to open it</p>
            <p className="text-muted-foreground leading-snug mt-0.5">
              On a project card, tap <span className="font-semibold text-foreground">⋯</span> (or long-press) to move it. On desktop, drag a card onto any folder.
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.setItem(hintKey, "1");
              setShowHint(false);
            }}
            className="shrink-0 h-5 w-5 grid place-items-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Mobile-first folder grid */}
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
        {/* All */}
        <FolderTile
          active={selected === "all"}
          onClick={() => onSelect("all")}
          tint={{ bg: "bg-foreground/5", ring: "ring-foreground/30", ink: "text-foreground" }}
          icon={<LayoutGrid className="h-5 w-5" />}
          label="All"
          count={totalCount}
        />

        {/* Unfiled — drop target removes from folder */}
        <div
          onDragOver={(e) => handleDragOver(e, "unfiled")}
          onDragLeave={() => handleDragLeave("unfiled")}
          onDrop={(e) => handleDrop(e, null)}
          className={cn(
            "rounded-2xl transition-all",
            dropTarget === "unfiled" && "ring-2 ring-foreground/50 ring-offset-2 ring-offset-background scale-[1.03]",
          )}
        >
          <FolderTile
            active={selected === "unfiled"}
            onClick={() => onSelect("unfiled")}
            tint={{ bg: "bg-muted", ring: "ring-foreground/20", ink: "text-muted-foreground" }}
            icon={<Inbox className="h-5 w-5" />}
            label="Unfiled"
            count={counts["unfiled"] ?? 0}
          />
        </div>

        {/* User folders */}
        {folders.map((f) => {
          const tint = tintFor(f.color);
          const active = selected === f.id;
          const isRenaming = renamingId === f.id;
          const isOver = dropTarget === f.id;
          return (
            <div
              key={f.id}
              className={cn(
                "relative group rounded-2xl transition-all",
                isOver && cn("ring-2 ring-offset-2 ring-offset-background scale-[1.03]", tint.ring),
              )}
              onDragOver={(e) => handleDragOver(e, f.id)}
              onDragLeave={() => handleDragLeave(f.id)}
              onDrop={(e) => handleDrop(e, f.id)}
            >
              <button
                onClick={() => onSelect(f.id)}
                className={cn(
                  "w-full aspect-[5/4] rounded-2xl border border-border/60 p-2.5 flex flex-col items-start justify-between text-left transition-all",
                  tint.bg,
                  active
                    ? cn("ring-2", tint.ring, "border-transparent shadow-sm")
                    : "hover:border-foreground/30 hover:shadow-sm",
                )}
              >
                <Folder className={cn("h-5 w-5", tint.ink)} />
                {isRenaming ? (
                  <div className="w-full" onClick={(e) => e.stopPropagation()}>
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renameFolder(f.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={() => renameFolder(f.id)}
                      className="h-7 text-[12px] px-1.5 border-0 bg-background/80 focus-visible:ring-1"
                    />
                  </div>
                ) : (
                  <div className="w-full min-w-0">
                    <div className="text-[13px] font-semibold leading-tight truncate">
                      {f.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {counts[f.id] ?? 0} {(counts[f.id] ?? 0) === 1 ? "project" : "projects"}
                    </div>
                  </div>
                )}
              </button>

              {/* Per-folder actions */}
              {!isRenaming && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="absolute top-1.5 right-1.5 h-6 w-6 grid place-items-center rounded-full bg-background/80 backdrop-blur-none border border-border/60 opacity-0 group-hover:opacity-100 focus:opacity-100 active:opacity-100 transition-opacity"
                      aria-label="Folder options"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setRenameValue(f.name);
                        setRenamingId(f.id);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => deleteFolder(f.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}

        {/* New folder tile */}
        <button
          onClick={() => setCreateOpen(true)}
          className="aspect-[5/4] rounded-2xl border border-dashed border-border/80 p-2.5 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-foreground/40 hover:bg-muted/30 transition-colors"
        >
          <FolderPlus className="h-5 w-5" />
          <span className="text-[12px] font-semibold">New folder</span>
        </button>
      </div>

      {/* Create folder dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-[hsl(var(--signal-teal))]" />
              New folder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="e.g. Client Work, 2026 Campaigns"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createFolder();
              }}
            />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                Color
              </p>
              <div className="flex gap-2">
                {COLOR_SWATCHES.map((c) => {
                  const t = tintFor(c);
                  const on = newColor === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "h-8 w-8 rounded-full grid place-items-center transition-all",
                        t.bg,
                        on ? cn("ring-2", t.ring) : "ring-1 ring-border",
                      )}
                      aria-label={c}
                    >
                      <Folder className={cn("h-4 w-4", t.ink)} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={createFolder} disabled={busy || !newName.trim()}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SuggestFoldersDialog
        userId={userId}
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
        onApplied={onChanged}
      />
    </section>
  );
};

interface TileProps {
  active: boolean;
  onClick: () => void;
  tint: { bg: string; ring: string; ink: string };
  icon: React.ReactNode;
  label: string;
  count: number;
}

const FolderTile = ({ active, onClick, tint, icon, label, count }: TileProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full aspect-[5/4] rounded-2xl border border-border/60 p-2.5 flex flex-col items-start justify-between text-left transition-all",
      tint.bg,
      active
        ? cn("ring-2", tint.ring, "border-transparent shadow-sm")
        : "hover:border-foreground/30 hover:shadow-sm",
    )}
  >
    <span className={tint.ink}>{icon}</span>
    <div className="w-full min-w-0">
      <div className="text-[13px] font-semibold leading-tight truncate">{label}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">
        {count} {count === 1 ? "project" : "projects"}
      </div>
    </div>
  </button>
);
