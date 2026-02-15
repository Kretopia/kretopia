import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ROOM_CATEGORIES = [
  { value: "general", label: "General", emoji: "💬" },
  { value: "music", label: "Music", emoji: "🎵" },
  { value: "visual-art", label: "Visual Art", emoji: "🎨" },
  { value: "film", label: "Film & Video", emoji: "🎬" },
  { value: "photography", label: "Photography", emoji: "📸" },
  { value: "design", label: "Design", emoji: "✏️" },
  { value: "writing", label: "Writing", emoji: "✍️" },
  { value: "feedback", label: "Feedback", emoji: "💡" },
  { value: "collab", label: "Collaboration", emoji: "🤝" },
];

interface CreateRoomDialogProps {
  userId: string;
  onRoomCreated: () => void;
}

export const CreateRoomDialog = ({ userId, onRoomCreated }: CreateRoomDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Room needs a title");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("spark_rooms").insert({
        created_by: userId,
        title: title.trim(),
        description: description.trim() || null,
        category,
      });

      if (error) throw error;

      toast.success("Room created! 🎉");
      setTitle("");
      setDescription("");
      setCategory("general");
      setOpen(false);
      onRoomCreated();
    } catch (error: any) {
      console.error("Error creating room:", error);
      toast.error(error.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Room
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a Room</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="room-title">Title</Label>
            <Input
              id="room-title"
              placeholder="e.g. Music Production Tips"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-desc">Description (optional)</Label>
            <Textarea
              id="room-desc"
              placeholder="What's this room about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
              maxLength={300}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROOM_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.emoji} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleCreate} disabled={loading || !title.trim()} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Room
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
