import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Linkedin, Instagram, Twitter, Music, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SocialLinks {
  website?: string;
  linkedin_url?: string;
  behance_url?: string;
  imdb_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  spotify_url?: string;
  soundcloud_url?: string;
}

interface SocialLinksSectionProps {
  links: SocialLinks;
  isOwnProfile: boolean;
  onRefresh: () => void;
}

export const SocialLinksSection = ({ links, isOwnProfile, onRefresh }: SocialLinksSectionProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLinks, setEditLinks] = useState(links);
  const { toast } = useToast();

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update(editLinks)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update links", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Social links updated" });
      setIsEditOpen(false);
      onRefresh();
    }
  };

  const socialPlatforms = [
    { key: 'website', label: 'Website', icon: Globe },
    { key: 'linkedin_url', label: 'LinkedIn', icon: Linkedin },
    { key: 'behance_url', label: 'Behance', icon: Globe },
    { key: 'imdb_url', label: 'IMDb', icon: Globe },
    { key: 'instagram_url', label: 'Instagram', icon: Instagram },
    { key: 'twitter_url', label: 'Twitter', icon: Twitter },
    { key: 'spotify_url', label: 'Spotify', icon: Music },
    { key: 'soundcloud_url', label: 'SoundCloud', icon: Music },
  ];

  const hasLinks = Object.values(links).some(v => v);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Connect</h3>
        {isOwnProfile && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Edit Links</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Social Links</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {socialPlatforms.map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      value={(editLinks as any)[key] || ""}
                      onChange={(e) => setEditLinks({ ...editLinks, [key]: e.target.value })}
                      placeholder={`https://...`}
                    />
                  </div>
                ))}
                <Button onClick={handleSave} className="w-full" variant="gradient">Save Links</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!hasLinks ? (
        <p className="text-sm text-muted-foreground text-center py-4">No social links added yet</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {socialPlatforms.map(({ key, label, icon: Icon }) => {
            const url = (links as any)[key];
            if (!url) return null;
            return (
              <Button key={key} variant="outline" size="sm" asChild className="justify-start">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
};
