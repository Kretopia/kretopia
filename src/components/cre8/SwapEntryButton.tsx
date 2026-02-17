import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Loader2, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFileUpload } from "@/hooks/useFileUpload";
import { toast } from "sonner";

interface SwapEntryButtonProps {
  challengeId: string;
  currentEntryId: string;
  maxSwaps: number;
  swapsUsed: number;
  onSwapped: () => void;
}

export const SwapEntryButton = ({
  challengeId,
  currentEntryId,
  maxSwaps,
  swapsUsed,
  onSwapped,
}: SwapEntryButtonProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");

  const { uploading, mediaUrl, mediaType, uploadFile, clearFile } = useFileUpload({
    bucket: "portfolio",
    folder: "challenge-entries",
    userId: user?.id || "",
  });

  const remaining = maxSwaps - swapsUsed;

  const handleSwap = async () => {
    if (!user || !mediaUrl || !title) return;

    setLoading(true);
    try {
      // Create new entry
      const { data: newEntry, error: insertErr } = await supabase
        .from("challenge_entries")
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          title,
          media_url: mediaUrl,
          media_type: mediaType,
          thumbnail_url: mediaType === "image" ? mediaUrl : null,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      // Mark old entry as swapped (soft delete by status)
      await supabase
        .from("challenge_entries")
        .update({ status: "swapped" })
        .eq("id", currentEntryId);

      // Record the swap
      await supabase.from("challenge_entry_swaps").insert({
        challenge_id: challengeId,
        user_id: user.id,
        old_entry_id: currentEntryId,
        new_entry_id: newEntry.id,
      });

      toast.success(`Entry swapped! ${remaining - 1} swaps remaining 🔄`);
      setOpen(false);
      setTitle("");
      clearFile();
      onSwapped();
    } catch (err: any) {
      console.error("Swap error:", err);
      toast.error(err.message || "Failed to swap entry");
    } finally {
      setLoading(false);
    }
  };

  if (remaining <= 0) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Swap ({remaining} left)
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Swap Your Entry
            </DialogTitle>
            <DialogDescription>
              Replace your current entry with a new one. You have{" "}
              <strong>{remaining} swap{remaining !== 1 ? "s" : ""}</strong> remaining.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Entry File *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {mediaUrl ? (
                  <div className="space-y-2">
                    {mediaType === "image" && (
                      <img src={mediaUrl} alt="Preview" className="max-h-32 mx-auto rounded" />
                    )}
                    <p className="text-sm text-muted-foreground">Uploaded!</p>
                    <Button type="button" variant="outline" size="sm" onClick={clearFile}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <label htmlFor="swap-file" className="cursor-pointer text-primary hover:underline text-sm">
                      Click to upload
                    </label>
                    <input
                      id="swap-file"
                      type="file"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
                      accept="image/*,video/*,audio/*"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="New entry title"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSwap} disabled={loading || uploading || !mediaUrl || !title}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Swapping...</>
                ) : (
                  "Swap Entry"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
