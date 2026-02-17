import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Link, Upload, Video, Image as ImageIcon, Music, ExternalLink, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  media_url: string;
  media_type: string;
  thumbnail_url?: string;
  category?: string;
}

interface AddPortfolioStepProps {
  userId: string;
  onComplete: (items: PortfolioItem[]) => void;
  onSkip?: () => void;
}

const EXAMPLE_URLS = [
  { platform: "YouTube", url: "https://youtube.com/watch?v=...", icon: Video },
  { platform: "Vimeo", url: "https://vimeo.com/...", icon: Video },
  { platform: "SoundCloud", url: "https://soundcloud.com/...", icon: Music },
  { platform: "Behance", url: "https://behance.net/gallery/...", icon: ImageIcon },
];

const CATEGORIES = [
  "Music Video",
  "Short Film",
  "Commercial",
  "Animation",
  "Photography",
  "Design",
  "Audio Production",
  "Dance & Choreography",
  "Singing & Vocals",
  "Rap & Hip-Hop",
  "Instrument Performance",
  "DJing & Live Set",
  "Acting & Theatre",
  "Fashion & Styling",
  "Podcast",
  "Other"
];

export const AddPortfolioStep = ({ userId, onComplete, onSkip }: AddPortfolioStepProps) => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualData, setManualData] = useState({
    title: "",
    description: "",
    category: "",
    media_url: "",
    media_type: "video"
  });

  const MAX_FREE_PORTFOLIO = 5;

  const fetchFromUrl = async (url: string) => {
    if (items.length >= MAX_FREE_PORTFOLIO) {
      toast.error(`Free accounts can add up to ${MAX_FREE_PORTFOLIO} portfolio items. Upgrade to Pro for unlimited.`);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-portfolio-data', {
        body: { url }
      });

      if (error) throw error;

      const newItem: PortfolioItem = {
        id: crypto.randomUUID(),
        title: data.title || "Untitled Work",
        description: data.description || "",
        media_url: url,
        media_type: data.type || "video",
        thumbnail_url: data.thumbnail,
        category: data.category || "Other"
      };

      setItems([...items, newItem]);
      setUrlInput("");
      toast.success("Portfolio item added!");
    } catch (error: any) {
      console.error('Error fetching portfolio data:', error);
      toast.error("Couldn't fetch data. Try adding manually.");
      setManualMode(true);
    } finally {
      setIsLoading(false);
    }
  };

  const addManualItem = () => {
    if (items.length >= MAX_FREE_PORTFOLIO) {
      toast.error(`Free accounts can add up to ${MAX_FREE_PORTFOLIO} portfolio items.`);
      return;
    }
    if (!manualData.title || !manualData.media_url) {
      toast.error("Title and URL are required");
      return;
    }

    const newItem: PortfolioItem = {
      id: crypto.randomUUID(),
      title: manualData.title,
      description: manualData.description,
      media_url: manualData.media_url,
      media_type: manualData.media_type,
      category: manualData.category || "Other"
    };

    setItems([...items, newItem]);
    setManualData({ title: "", description: "", category: "", media_url: "", media_type: "video" });
    setManualMode(false);
    toast.success("Portfolio item added!");
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const saveAndContinue = async () => {
    // Portfolio is now optional - can continue with 0 items
    if (items.length === 0) {
      await onComplete([]);
      return;
    }

    setIsLoading(true);
    try {
      const insertPromises = items.map(item => 
        supabase.from('portfolio_items').insert({
          user_id: userId,
          title: item.title,
          description: item.description,
          media_url: item.media_url,
          media_type: item.media_type,
          thumbnail_url: item.thumbnail_url,
          category: item.category,
          tags: []
        })
      );

      const results = await Promise.all(insertPromises);
      
      // Check if any inserts failed
      const hasErrors = results.some(result => result.error);
      if (hasErrors) {
        throw new Error("Failed to save some portfolio items");
      }
      
      toast.success("Portfolio saved!");
      await onComplete(items);
    } catch (error: any) {
      console.error('Error saving portfolio:', error);
      toast.error("Failed to save portfolio. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Showcase Your Work</h2>
        <p className="text-muted-foreground">
          Add portfolio items to help others discover your talent (optional if you imported credits)
        </p>
      </div>

      {items.length === 0 && !manualMode && (
        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="portfolio-url">Quick Add from URL</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Paste a link from YouTube, Vimeo, SoundCloud, Behance, or direct media file
            </p>
            <div className="flex gap-2">
              <Input
                id="portfolio-url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                disabled={isLoading}
              />
              <Button 
                onClick={() => fetchFromUrl(urlInput)} 
                disabled={isLoading || !urlInput}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Supported platforms:</p>
            <div className="grid grid-cols-2 gap-2">
              {EXAMPLE_URLS.map(({ platform, icon: Icon }) => (
                <div key={platform} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="w-4 h-4" />
                  {platform}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setManualMode(true)}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Add Manually
            </Button>
          </div>
        </Card>
      )}

      {manualMode && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Add Portfolio Item</h3>
            <Button variant="ghost" size="sm" onClick={() => setManualMode(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div>
            <Label htmlFor="manual-title">Title *</Label>
            <Input
              id="manual-title"
              value={manualData.title}
              onChange={(e) => setManualData({ ...manualData, title: e.target.value })}
              placeholder="My Awesome Project"
            />
          </div>

          <div>
            <Label htmlFor="manual-url">Media URL *</Label>
            <Input
              id="manual-url"
              value={manualData.media_url}
              onChange={(e) => setManualData({ ...manualData, media_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label htmlFor="manual-description">Description</Label>
            <Textarea
              id="manual-description"
              value={manualData.description}
              onChange={(e) => setManualData({ ...manualData, description: e.target.value })}
              placeholder="Describe your work..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manual-type">Type</Label>
              <Select value={manualData.media_type} onValueChange={(value) => setManualData({ ...manualData, media_type: value })}>
                <SelectTrigger id="manual-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="manual-category">Category</Label>
              <Select value={manualData.category} onValueChange={(value) => setManualData({ ...manualData, category: value })}>
                <SelectTrigger id="manual-category">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={addManualItem} className="w-full">
            Add Item
          </Button>
        </Card>
      )}

      {items.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Your Portfolio ({items.length})</h3>
          <div className="grid gap-4">
            {items.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{item.title}</h4>
                      {item.category && (
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {item.category}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <a 
                      href={item.media_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View original
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {!manualMode && (
            <Button 
              variant="outline" 
              onClick={() => setManualMode(true)}
              className="w-full"
            >
              Add Another Item
            </Button>
          )}
        </div>
      )}

      <div className="flex justify-between pt-6 border-t">
        <div className="text-sm text-muted-foreground">
          {items.length === 0 ? "Portfolio is optional if you imported credits" : `${items.length} item${items.length > 1 ? 's' : ''} added`}
        </div>
        <div className="flex gap-2">
          {items.length === 0 && onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
          )}
          <Button 
            onClick={saveAndContinue} 
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {items.length === 0 ? "Continue" : "Save & Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
};
