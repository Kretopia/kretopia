import { useEffect, useState } from "react";
import { Folder, FolderPlus, Pencil, Trash2, Check, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
}

export const StudioFoldersBar = ({
  userId,
  folders,
  counts,
  selected,
  onSelect,
  onChanged,
}: StudioFoldersBarProps) => {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busy, setBusy] = useState(false);

  const totalCount =
    (counts["unfiled"] ?? 0) +
    folders.reduce((sum, f) => sum + (counts[f.id] ?? 0), 0);

  const createFolder = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const { error } = await supabase.from("studio_folders").insert({
      user_id: userId,
      name,
      sort_order: folders.length,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't create folder", description: error.message, variant: "destructive" });
      return;
    }
    setNewName("");
    setCreating(false);
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

  const chipBase =
    "shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 border transition-colors";
  const chipOn =
    "bg-foreground text-background border-foreground";
  const chipOff =
    "bg-background text-muted-foreground border-border hover:text-foreground";

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5 scrollbar-none">
      <button
        onClick={() => onSelect("all")}
        className={cn(chipBase, selected === "all" ? chipOn : chipOff)}
      >
        All
        <span className="opacity-60">· {totalCount}</span>
      </button>

      <button
        onClick={() => onSelect("unfiled")}
        className={cn(chipBase, selected === "unfiled" ? chipOn : chipOff)}
      >
        Unfiled
        <span className="opacity-60">· {counts["unfiled"] ?? 0}</span>
      </button>

      <span className="shrink-0 h-4 w-px bg-border mx-1" />

      {folders.map((f) => {
        const active = selected === f.id;
        const isRenaming = renamingId === f.id;
        if (isRenaming) {
          return (
            <div
              key={f.id}
              className="shrink-0 inline-flex items-center gap-1 h-8 px-2 rounded-full border border-border bg-background"
            >
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") renameFolder(f.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                className="h-6 text-[12px] px-1.5 w-32 border-0 focus-visible:ring-0"
              />
              <button
                onClick={() => renameFolder(f.id)}
                disabled={busy}
                className="h-6 w-6 grid place-items-center rounded-full text-emerald-600 hover:bg-muted"
                aria-label="Save"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setRenamingId(null)}
                className="h-6 w-6 grid place-items-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        }
        return (
          <DropdownMenu key={f.id}>
            <div className={cn(chipBase, active ? chipOn : chipOff, "pr-1")}>
              <button
                onClick={() => onSelect(f.id)}
                className="inline-flex items-center gap-1.5"
              >
                <Folder className="h-3 w-3" />
                <span className="truncate max-w-[140px]">{f.name}</span>
                <span className="opacity-60">· {counts[f.id] ?? 0}</span>
              </button>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "ml-1 h-5 w-5 rounded-full grid place-items-center",
                    active ? "hover:bg-background/20" : "hover:bg-muted",
                  )}
                  aria-label="Folder options"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent align="start">
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
        );
      })}

      {creating ? (
        <div className="shrink-0 inline-flex items-center gap-1 h-8 px-2 rounded-full border border-border bg-background">
          <Input
            autoFocus
            placeholder="Folder name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createFolder();
              if (e.key === "Escape") {
                setCreating(false);
                setNewName("");
              }
            }}
            className="h-6 text-[12px] px-1.5 w-32 border-0 focus-visible:ring-0"
          />
          <button
            onClick={createFolder}
            disabled={busy || !newName.trim()}
            className="h-6 w-6 grid place-items-center rounded-full text-emerald-600 hover:bg-muted disabled:opacity-40"
            aria-label="Create folder"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setCreating(false);
              setNewName("");
            }}
            className="h-6 w-6 grid place-items-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setCreating(true)}
          className="shrink-0 h-8 px-2.5 rounded-full text-[12px] font-semibold text-muted-foreground hover:text-foreground gap-1"
        >
          <FolderPlus className="h-3.5 w-3.5" />
          New folder
        </Button>
      )}
    </div>
  );
};
