import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";

interface SubmitEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  onSuccess: () => void;
}

export const SubmitEntryDialog = ({ open, onOpenChange, challengeId, onSuccess }: SubmitEntryDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  
  const { uploading, mediaUrl, mediaType, uploadFile, clearFile } = useFileUpload({
    bucket: 'portfolio',
    folder: 'challenge-entries',
    userId: user?.id || '',
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    await uploadFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !mediaUrl) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('challenge_entries')
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          title,
          description,
          media_url: mediaUrl,
          media_type: mediaType,
          thumbnail_url: mediaType === 'image' ? mediaUrl : null,
        });

      if (error) throw error;

      // Award XP for challenge entry
      try {
        const { awardXP } = await import("@/lib/xpSystem");
        await awardXP(user.id, 'CHALLENGE_ENTRY', `Submitted entry to challenge`);
      } catch (xpError) {
        console.error('XP award error:', xpError);
      }

      toast.success("Entry submitted! +25 XP 🎉");
      onSuccess();
      onOpenChange(false);
      setTitle("");
      setDescription("");
      clearFile();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || "Failed to submit entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit Your Entry</DialogTitle>
          <DialogDescription>
            Upload your creative work and compete for prizes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Upload Your Work *</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              {mediaUrl ? (
                <div className="space-y-2">
                  {mediaType === 'image' && (
                    <img src={mediaUrl} alt="Preview" className="max-h-48 mx-auto rounded" />
                  )}
                  <p className="text-sm text-muted-foreground">File uploaded successfully!</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearFile}
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <div>
                    <label htmlFor="file" className="cursor-pointer text-primary hover:underline">
                      Click to upload
                    </label>
                    <input
                      id="file"
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Images, videos, audio files, or documents
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Entry Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your entry a catchy title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about your creative process..."
              rows={4}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading || !mediaUrl || !title}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Submit Entry"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
