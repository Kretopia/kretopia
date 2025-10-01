import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, ExternalLink, Trash2, Eye, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MediaPlayerModal } from "./MediaPlayerModal";
import { getMediaThumbnail, parseMediaUrl } from "@/lib/mediaUtils";

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
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
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
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg md:text-xl font-semibold">Portfolio</h3>
        {isOwnProfile && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="sm" className="text-xs md:text-sm">
                <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Add Item</span>
                <span className="sm:hidden">Add</span>
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

      {/* Filter out Spark posts - they should only appear in Spark feed */}
      {items.filter(item => item.category !== 'spark').length === 0 ? (
        <div className="rounded-xl md:rounded-2xl border border-border bg-card p-8 md:p-12 text-center">
          <Upload className="mx-auto mb-3 md:mb-4 h-12 w-12 md:h-16 md:w-16 text-muted-foreground" />
          <h3 className="mb-1 md:mb-2 text-lg md:text-xl font-semibold">No portfolio items yet</h3>
          <p className="text-sm md:text-base text-muted-foreground">Showcase your best work to stand out</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {items.filter(item => item.category !== 'spark').map((item) => {
            const thumbnail = getMediaThumbnail(item);
            const mediaInfo = parseMediaUrl(item.media_url);
            const isPlayable = mediaInfo || ['video', 'audio'].includes(item.media_type);

            return (
              <div key={item.id} className="group relative rounded-xl md:rounded-2xl border border-border bg-card overflow-hidden hover:shadow-card transition-all">
                <div 
                  className="aspect-video bg-muted relative cursor-pointer"
                  onClick={() => isPlayable && setSelectedItem(item)}
                >
                  <img 
                    src={thumbnail} 
                    alt={item.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=300&fit=crop';
                    }}
                  />
                  
                  {/* Play button overlay for playable media */}
                  {isPlayable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                        <Play className="h-8 w-8 text-primary-foreground ml-1" fill="currentColor" />
                      </div>
                    </div>
                  )}

                  {/* Platform badge */}
                  {mediaInfo && (
                    <div className="absolute top-2 left-2">
                      <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full capitalize">
                        {mediaInfo.platform}
                      </span>
                    </div>
                  )}

                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="outline" className="h-8 w-8 bg-background/90" asChild>
                      <a href={item.media_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    {isOwnProfile && (
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-8 w-8 bg-background/90" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-3 md:p-4">
                  <h4 className="font-semibold mb-0.5 md:mb-1 text-sm md:text-base">{item.title}</h4>
                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-1.5 md:mb-2">{item.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="bg-primary/10 text-primary px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs">{item.category}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {item.view_count}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Media Player Modal */}
      {selectedItem && (
        <MediaPlayerModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
        />
      )}
    </div>
  );
};
