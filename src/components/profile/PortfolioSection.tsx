import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, ExternalLink, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  media_type: string;
  media_url: string;
  thumbnail_url: string;
  tags: string[];
  category: string;
  view_count: number;
}

interface PortfolioSectionProps {
  items: PortfolioItem[];
  isOwnProfile: boolean;
  onRefresh: () => void;
}

export const PortfolioSection = ({ items, isOwnProfile, onRefresh }: PortfolioSectionProps) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    media_type: "image",
    media_url: "",
    category: "",
    tags: ""
  });
  const { toast } = useToast();

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
    setNewItem({ ...newItem, media_url: data.publicUrl });
    setUploading(false);
  };

  const handleAdd = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('portfolio_items').insert({
      user_id: user.id,
      title: newItem.title,
      description: newItem.description,
      media_type: newItem.media_type,
      media_url: newItem.media_url,
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
      setIsAddOpen(false);
      setNewItem({ title: "", description: "", media_type: "image", media_url: "", category: "", tags: "" });
      onRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('portfolio_items').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Portfolio item deleted" });
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Portfolio</h3>
        {isOwnProfile && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add Portfolio Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Media Type</Label>
                  <Select value={newItem.media_type} onValueChange={(v) => setNewItem({ ...newItem, media_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="embed">Embed Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Upload File</Label>
                  <div className="flex gap-2">
                    <Input type="file" onChange={handleFileUpload} disabled={uploading} />
                    {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">Or enter URL below</span>
                </div>
                <div className="space-y-2">
                  <Label>Media URL</Label>
                  <Input value={newItem.media_url} onChange={(e) => setNewItem({ ...newItem, media_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} placeholder="e.g., Music, Design, Film" />
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input value={newItem.tags} onChange={(e) => setNewItem({ ...newItem, tags: e.target.value })} placeholder="creative, collaboration, award-winning" />
                </div>
                <Button onClick={handleAdd} className="w-full" variant="gradient">Add to Portfolio</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Upload className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-semibold">No portfolio items yet</h3>
          <p className="text-muted-foreground">Showcase your best work to stand out</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:shadow-card transition-all">
              <div className="aspect-video bg-muted relative">
                {item.media_type === 'image' && (
                  <img src={item.media_url} alt={item.title} className="w-full h-full object-cover" />
                )}
                {item.media_type === 'video' && (
                  <video src={item.media_url} className="w-full h-full object-cover" />
                )}
                {item.media_type === 'audio' && (
                  <div className="flex items-center justify-center h-full">
                    <audio controls src={item.media_url} className="w-full px-4" />
                  </div>
                )}
                {item.media_type === 'document' && (
                  <div className="flex items-center justify-center h-full">
                    <ExternalLink className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="outline" className="h-8 w-8" asChild>
                    <a href={item.media_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  {isOwnProfile && (
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-semibold mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded">{item.category}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {item.view_count}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
