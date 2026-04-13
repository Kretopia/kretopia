import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Plus, Trash2, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface Note {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectNotesProps {
  projectId: string;
}

export function ProjectNotes({ projectId }: ProjectNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
  }, [projectId]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("project_notes")
        .select("*")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      const typedData = data as Note[];
      setNotes(typedData || []);
      
      if (typedData && typedData.length > 0 && !selectedNote) {
        setSelectedNote(typedData[0]);
        setTitle(typedData[0].title);
        setContent(typedData[0].content || "");
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Note title is required");
      return;
    }

    setSaving(true);
    try {
      if (selectedNote) {
        const { error } = await supabase
          .from("project_notes")
          .update({ title, content, updated_at: new Date().toISOString() })
          .eq("id", selectedNote.id);

        if (error) throw error;
        toast.success("Note updated");
      } else {
        const { data, error } = await supabase
          .from("project_notes")
          .insert({ project_id: projectId, title, content })
          .select()
          .single();

        if (error) throw error;
        setSelectedNote(data as Note);
        toast.success("Note created");
      }
      fetchNotes();
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleNew = () => {
    setSelectedNote(null);
    setTitle("");
    setContent("");
  };

  const handleDelete = async () => {
    if (!selectedNote) return;

    try {
      const { error } = await supabase
        .from("project_notes")
        .delete()
        .eq("id", selectedNote.id);

      if (error) throw error;
      toast.success("Note deleted");
      handleNew();
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  if (loading) {
    return <div className="p-4">Loading notes...</div>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 h-full">
      {/* Notes List - horizontal scroll on mobile, sidebar on desktop */}
      {!selectedNote || !isMobileView ? (
        <Card className={cn(
          "p-4 flex flex-col gap-2 shrink-0",
          "w-full md:w-64",
          selectedNote && "hidden md:flex"
        )}>
          <Button onClick={handleNew} className="w-full mb-2">
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
          
          <div className="flex-1 overflow-y-auto space-y-2">
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => {
                  setSelectedNote(note);
                  setTitle(note.title);
                  setContent(note.content || "");
                }}
                className={`w-full p-3 text-left rounded-lg border transition-colors ${
                  selectedNote?.id === note.id
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{note.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            
            {notes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No notes yet. Create one to get started!
              </p>
            )}
          </div>
        </Card>
      ) : null}

      {/* Note Editor */}
      {(selectedNote || title || !isMobileView) && (
        <Card className="flex-1 p-4 md:p-6 flex flex-col gap-4 min-h-0">
          {/* Back button on mobile */}
          {isMobileView && selectedNote && (
            <Button
              variant="ghost"
              size="sm"
              className="self-start -ml-2 mb-1"
              onClick={() => {
                setSelectedNote(null);
                setTitle("");
                setContent("");
              }}
            >
              ← All Notes
            </Button>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <Input
              placeholder="Note title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold w-full sm:flex-1"
            />
            <div className="flex gap-2 shrink-0">
              {selectedNote && (
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          <Textarea
            placeholder="Start writing your note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 min-h-[300px] md:min-h-[400px] resize-none"
          />
        </Card>
      )}
    </div>
  );
}
