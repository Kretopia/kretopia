import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddPortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddPortfolioDialog = ({ open, onOpenChange, onSuccess }: AddPortfolioDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [uploadMode, setUploadMode] = useState<"link" | "upload">("link");
  const [linkUrl, setLinkUrl] = useState("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    media_type: "image",
    media_url: "",
    thumbnail_url: "",
    embed_code: "",
    category: "",
    tags: ""
  });
  const { toast } = useToast();

  const fetchPlatformData = async (url: string) => {
    if (!url.trim()) {
      setPreviewData(null);
      return;
    }

    setFetchingData(true);
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'fetch-portfolio-data',
        { body: { url } }
      );

      if (functionError) throw functionError;

      if (functionData?.success && functionData?.data) {
        const data = functionData.data;
        setPreviewData(data);
        setNewItem({
          ...newItem,
          media_url: data.mediaUrl || url,
          media_type: data.mediaType || "link",
          thumbnail_url: data.thumbnailUrl || "",
          embed_code: data.embedCode || "",
          title: data.title || "",
        });
      }
    } catch (error) {
      console.error("Error fetching platform data:", error);
      toast({
        title: "Could not analyze link",
        description: "Please try again or upload directly",
        variant: "destructive",
      });
    } finally {
      setFetchingData(false);
    }
  };

  const handleLinkChange = (value: string) => {
    setLinkUrl(value);
    if (value.trim() && value.startsWith("http")) {
      const debounce = setTimeout(() => {
        fetchPlatformData(value);
      }, 500);
      return () => clearTimeout(debounce);
    } else {
      setPreviewData(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('portfolio')
      .upload(fileName, file);

    if (uploadError) {
      toast({
        title: "Upload failed",
        description: uploadError.message,
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('portfolio').getPublicUrl(fileName);
    
    let mediaType = "image";
    if (file.type.startsWith("video/")) mediaType = "video";
    else if (file.type.startsWith("audio/")) mediaType = "audio";
    
    setNewItem({ 
      ...newItem, 
      media_url: data.publicUrl,
      thumbnail_url: data.publicUrl,
      media_type: mediaType
    });
    setUploading(false);
  };

  const handleAdd = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!newItem.title || !newItem.media_url) {
      toast({
        title: "Missing information",
        description: "Please add a title and media",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from('portfolio_items').insert({
      user_id: user.id,
      title: newItem.title,
      description: newItem.description,
      media_type: newItem.media_type,
      media_url: newItem.media_url,
      thumbnail_url: newItem.thumbnail_url,
      embed_code: newItem.embed_code,
      category: newItem.category,
      tags: newItem.tags.split(',').map(t => t.trim()).filter(Boolean)
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add portfolio item",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Portfolio item added" });
      onOpenChange(false);
      resetForm();
      onSuccess();
    }
  };

  const resetForm = () => {
    setLinkUrl("");
    setPreviewData(null);
    setUploadMode("link");
    setNewItem({ 
      title: "", 
      description: "", 
      media_type: "image", 
      media_url: "", 
      thumbnail_url: "",
      embed_code: "",
      category: "", 
      tags: "" 
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add to Portfolio</DialogTitle>
          <DialogDescription>Paste a link or upload directly</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button
              variant={uploadMode === "link" ? "default" : "outline"}
              onClick={() => setUploadMode("link")}
              className="flex-1"
            >
              Paste Link
            </Button>
            <Button
              variant={uploadMode === "upload" ? "default" : "outline"}
              onClick={() => setUploadMode("upload")}
              className="flex-1"
            >
              Upload File
            </Button>
          </div>

          {uploadMode === "link" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Paste Link</Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => handleLinkChange(e.target.value)}
                  placeholder="YouTube, Instagram, Vimeo, Spotify..."
                  disabled={fetchingData}
                />
                {fetchingData && (
                  <p className="text-xs text-muted-foreground animate-fade-in">Analyzing link...</p>
                )}
              </div>

              <div className="min-h-[140px]">
                {previewData && (
                  <div className="rounded-lg border bg-card p-4 animate-fade-in">
                    <div className="flex items-start gap-3">
                      {previewData.thumbnailUrl && (
                        <img
                          src={previewData.thumbnailUrl}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground capitalize mb-1">
                          {previewData.platform} • {previewData.mediaType}
                        </p>
                        {previewData.title && (
                          <p className="font-medium text-sm line-clamp-2">{previewData.title}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {previewData && (
                <div className="space-y-3 animate-fade-in">
                  <Input
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    placeholder="Title (optional - auto-detected)"
                    className="text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      placeholder="Category"
                      className="text-sm"
                    />
                    <Input
                      value={newItem.tags}
                      onChange={(e) => setNewItem({ ...newItem, tags: e.target.value })}
                      placeholder="Tags"
                      className="text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleAdd}
                    className="w-full"
                    variant="gradient"
                    disabled={!newItem.media_url}
                  >
                    Add to Portfolio
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Upload File</Label>
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  accept="image/*,video/*,audio/*"
                />
                {uploading && (
                  <p className="text-xs text-muted-foreground">Uploading...</p>
                )}
              </div>

              {newItem.media_url && (
                <div className="space-y-3 animate-fade-in">
                  <Input
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    placeholder="Title*"
                    className="text-sm"
                  />
                  <Textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    rows={2}
                    placeholder="Description (optional)"
                    className="text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      placeholder="Category"
                      className="text-sm"
                    />
                    <Input
                      value={newItem.tags}
                      onChange={(e) => setNewItem({ ...newItem, tags: e.target.value })}
                      placeholder="Tags"
                      className="text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleAdd}
                    className="w-full"
                    variant="gradient"
                    disabled={!newItem.title}
                  >
                    Add to Portfolio
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
