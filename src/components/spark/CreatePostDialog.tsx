import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Image, Video, Music, Loader2 } from "lucide-react";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
}

export const CreatePostDialog = ({ open, onOpenChange, onPostCreated }: CreatePostDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | "audio" | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine media type
    if (file.type.startsWith("image/")) {
      setMediaType("image");
    } else if (file.type.startsWith("video/")) {
      setMediaType("video");
    } else if (file.type.startsWith("audio/")) {
      setMediaType("audio");
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload an image, video, or audio file",
        variant: "destructive"
      });
      return;
    }

    setMediaFile(file);
  };

  const handleSubmit = async () => {
    if (!description && !mediaFile) {
      toast({
        title: "Content required",
        description: "Please add text or media to your post",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let mediaUrl = "";
      let thumbnailUrl = "";

      // Upload media if provided
      if (mediaFile && mediaType) {
        const fileExt = mediaFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from("portfolio")
          .upload(fileName, mediaFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("portfolio")
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
        thumbnailUrl = publicUrl;
      }

      // Create portfolio item
      const { error: insertError } = await supabase
        .from("portfolio_items")
        .insert({
          user_id: user.id,
          title: title || "Spark Post",
          description: description,
          media_url: mediaUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
          media_type: mediaType || "image",
          thumbnail_url: thumbnailUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
          category: "spark"
        });

      if (insertError) throw insertError;

      toast({
        title: "Post created!",
        description: "Your spark has been shared with your circle"
      });

      // Reset form
      setTitle("");
      setDescription("");
      setMediaFile(null);
      setMediaType(null);
      onOpenChange(false);
      onPostCreated();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create a Spark</DialogTitle>
          <DialogDescription>Share your work with your circle</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title (Optional)</Label>
            <Input
              id="title"
              placeholder="Give your post a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What's on your mind?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div>
            <Label>Media</Label>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => document.getElementById("image-upload")?.click()}
              >
                <Image className="mr-2 h-4 w-4" />
                Image
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => document.getElementById("video-upload")?.click()}
              >
                <Video className="mr-2 h-4 w-4" />
                Video
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => document.getElementById("audio-upload")?.click()}
              >
                <Music className="mr-2 h-4 w-4" />
                Audio
              </Button>
            </div>

            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              id="audio-upload"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {mediaFile && (
              <p className="mt-2 text-sm text-muted-foreground">
                Selected: {mediaFile.name}
              </p>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full"
          >
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploading ? "Posting..." : "Post Spark"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
