import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Newspaper, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PressLink {
  title: string;
  url: string;
  publication: string;
  date: string;
}

interface PressLinksSectionProps {
  pressLinks: PressLink[];
  isOwnProfile: boolean;
  onRefresh: () => void;
}

export const PressLinksSection = ({ pressLinks = [], isOwnProfile, onRefresh }: PressLinksSectionProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLinks, setEditLinks] = useState<PressLink[]>(pressLinks);
  const [newLink, setNewLink] = useState<PressLink>({ title: "", url: "", publication: "", date: "" });
  const { toast } = useToast();

  const addLink = () => {
    if (!newLink.title.trim() || !newLink.url.trim()) {
      toast({ title: "Please fill in title and URL", variant: "destructive" });
      return;
    }
    setEditLinks([...editLinks, newLink]);
    setNewLink({ title: "", url: "", publication: "", date: "" });
  };

  const removeLink = (index: number) => {
    setEditLinks(editLinks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ press_links: editLinks as any })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update press links", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Press links updated" });
      setIsEditOpen(false);
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          Press & Media
        </h3>
        {isOwnProfile && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Press
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Press & Media Coverage</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
                  <h4 className="font-semibold text-sm">Add New Press Link</h4>
                  <div className="grid gap-3">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={newLink.title}
                        onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                        placeholder="Article or feature title"
                      />
                    </div>
                    <div>
                      <Label>Publication</Label>
                      <Input
                        value={newLink.publication}
                        onChange={(e) => setNewLink({ ...newLink, publication: e.target.value })}
                        placeholder="e.g., Vogue, Rolling Stone, TechCrunch"
                      />
                    </div>
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={newLink.url}
                        onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                        placeholder="https://..."
                        type="url"
                      />
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input
                        value={newLink.date}
                        onChange={(e) => setNewLink({ ...newLink, date: e.target.value })}
                        placeholder="e.g., March 2025"
                      />
                    </div>
                    <Button onClick={addLink} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" /> Add Link
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Your Press Links</h4>
                  {editLinks.map((link, idx) => (
                    <div key={idx} className="flex items-start gap-2 rounded-lg border p-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{link.title}</p>
                        <p className="text-xs text-muted-foreground">{link.publication} • {link.date}</p>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                          {link.url}
                        </a>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLink(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {editLinks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No press links added yet</p>
                  )}
                </div>

                <Button onClick={handleSave} className="w-full" variant="gradient">
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {pressLinks.length > 0 ? (
        <div className="grid gap-3">
          {pressLinks.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-border bg-card p-4 hover:border-primary transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold group-hover:text-primary transition-colors">{link.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{link.publication}</p>
                  {link.date && <p className="text-xs text-muted-foreground mt-1">{link.date}</p>}
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </a>
          ))}
        </div>
      ) : !isOwnProfile ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Newspaper className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No press coverage yet</p>
        </div>
      ) : null}
    </div>
  );
};
