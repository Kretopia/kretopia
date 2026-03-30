import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, ImagePlus, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  onPublished: () => void;
}

const CATEGORIES = ["inspiration", "business", "culture", "how-to", "spotlight"];

export const MagazineEditor = ({ onClose, onPublished }: Props) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("inspiration");
  const [coverUrl, setCoverUrl] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop();
    const path = `magazine/${user.id}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("media").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }

    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
    setCoverUrl(publicUrl);
    toast.success("Cover uploaded!");
  };

  const handleAIGenerate = async () => {
    if (!title.trim()) { toast.error("Add a title first"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-magazine-article", {
        body: { title, category },
      });
      if (error) throw error;
      if (data?.content) setContent(data.content);
      if (data?.subtitle) setSubtitle(data.subtitle);
      toast.success("Article generated! Review and edit before publishing.");
    } catch {
      toast.error("Generation failed, try again");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim() || !user) {
      toast.error("Title and content are required");
      return;
    }
    setPublishing(true);
    const wordCount = content.split(/\s+/).length;
    const readTime = Math.max(1, Math.round(wordCount / 200));

    const { error } = await supabase.from("magazine_articles").insert({
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      content: content.trim(),
      cover_image_url: coverUrl || null,
      category,
      is_featured: isFeatured,
      author_user_id: user.id,
      author_name: "ThriveIN Magazine",
      read_time_minutes: readTime,
    });

    if (error) {
      toast.error("Failed to publish");
      setPublishing(false);
      return;
    }
    toast.success("Article published! 🎉");
    onPublished();
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={handlePublish} disabled={publishing || !title.trim() || !content.trim()} size="sm" className="gap-1.5">
          {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Publish
        </Button>
      </div>

      {/* Cover Image */}
      <div>
        <Label className="text-xs">Cover Image</Label>
        {coverUrl ? (
          <div className="relative mt-1 rounded-lg overflow-hidden aspect-[16/9]">
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            <Button
              variant="secondary"
              size="sm"
              className="absolute bottom-2 right-2"
              onClick={() => setCoverUrl("")}
            >
              Change
            </Button>
          </div>
        ) : (
          <label className="mt-1 flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/50 transition-colors">
            <ImagePlus className="h-8 w-8 text-muted-foreground/40" />
            <span className="text-xs text-muted-foreground">Upload cover image</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          </label>
        )}
      </div>

      <div>
        <Label className="text-xs">Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Your article title..." className="mt-1" />
      </div>

      <div>
        <Label className="text-xs">Subtitle</Label>
        <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Optional subtitle..." className="mt-1" />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <Label className="text-xs">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c} className="capitalize">{c === "how-to" ? "How-To" : c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <Switch checked={isFeatured} onCheckedChange={setIsFeatured} id="featured" />
          <Label htmlFor="featured" className="text-xs">Featured</Label>
        </div>
      </div>

      {/* AI Generate + Content */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">Content (Markdown)</Label>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-7"
            onClick={handleAIGenerate}
            disabled={generating || !title.trim()}
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            AI Generate
          </Button>
        </div>
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write your article in markdown..."
          className="min-h-[200px] font-mono text-xs"
        />
      </div>
    </div>
  );
};
