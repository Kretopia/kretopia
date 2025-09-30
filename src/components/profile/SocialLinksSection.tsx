import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Linkedin, Instagram, Twitter, Music, ExternalLink, Users, Eye, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  website?: string;
  linkedin_url?: string;
  behance_url?: string;
  imdb_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  spotify_url?: string;
  soundcloud_url?: string;
  youtube_subscribers?: number;
  instagram_followers?: number;
  tiktok_followers?: number;
  spotify_listeners?: number;
  twitter_followers?: number;
  linkedin_connections?: number;
  total_engagement_rate?: number;
  avg_views?: number;
  verified_metrics?: boolean;
}

interface SocialLinksSectionProps {
  profile: Profile;
  isOwnProfile: boolean;
  onRefresh: () => void;
}

export const SocialLinksSection = ({ profile, isOwnProfile, onRefresh }: SocialLinksSectionProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState(profile);
  const { toast } = useToast();

  const formatNumber = (num?: number) => {
    if (!num) return null;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update(editData)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update social data", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Social data updated" });
      setIsEditOpen(false);
      onRefresh();
    }
  };

  const socialPlatforms = [
    { 
      key: 'youtube', 
      urlKey: 'website',
      label: 'YouTube', 
      icon: Music,
      statKey: 'youtube_subscribers',
      statLabel: 'subscribers'
    },
    { 
      key: 'instagram', 
      urlKey: 'instagram_url',
      label: 'Instagram', 
      icon: Instagram,
      statKey: 'instagram_followers',
      statLabel: 'followers'
    },
    { 
      key: 'tiktok', 
      urlKey: 'website',
      label: 'TikTok', 
      icon: Music,
      statKey: 'tiktok_followers',
      statLabel: 'followers'
    },
    { 
      key: 'spotify', 
      urlKey: 'spotify_url',
      label: 'Spotify', 
      icon: Music,
      statKey: 'spotify_listeners',
      statLabel: 'listeners'
    },
    { 
      key: 'twitter', 
      urlKey: 'twitter_url',
      label: 'Twitter', 
      icon: Twitter,
      statKey: 'twitter_followers',
      statLabel: 'followers'
    },
    { 
      key: 'linkedin', 
      urlKey: 'linkedin_url',
      label: 'LinkedIn', 
      icon: Linkedin,
      statKey: 'linkedin_connections',
      statLabel: 'connections'
    },
    { key: 'behance', urlKey: 'behance_url', label: 'Behance', icon: Globe },
    { key: 'imdb', urlKey: 'imdb_url', label: 'IMDb', icon: Globe },
    { key: 'soundcloud', urlKey: 'soundcloud_url', label: 'SoundCloud', icon: Music },
  ];

  const hasData = socialPlatforms.some(p => (profile as any)[p.urlKey] || (profile as any)[p.statKey as string]);

  return (
    <div className="rounded-xl md:rounded-2xl border border-border bg-card p-4 md:p-6">
      <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
        <h3 className="text-lg md:text-xl font-semibold">Connect</h3>
        {isOwnProfile && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs md:text-sm">Edit Social Data</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Social Data</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {socialPlatforms.map(({ urlKey, label, statKey, statLabel }) => (
                  <div key={urlKey} className="space-y-2 pb-3 border-b border-border last:border-0">
                    <Label className="font-semibold">{label}</Label>
                    <div className="space-y-2">
                      <Input
                        value={(editData as any)[urlKey] || ""}
                        onChange={(e) => setEditData({ ...editData, [urlKey]: e.target.value })}
                        placeholder={`${label} URL`}
                      />
                      {statKey && (
                        <Input
                          type="number"
                          value={(editData as any)[statKey] || ""}
                          onChange={(e) => setEditData({ ...editData, [statKey]: parseInt(e.target.value) || 0 })}
                          placeholder={`Number of ${statLabel}`}
                        />
                      )}
                    </div>
                  </div>
                ))}
                <div className="space-y-2 pt-2">
                  <Label className="font-semibold">Additional Metrics</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.total_engagement_rate || ""}
                    onChange={(e) => setEditData({ ...editData, total_engagement_rate: parseFloat(e.target.value) || 0 })}
                    placeholder="Engagement rate (%)"
                  />
                  <Input
                    type="number"
                    value={editData.avg_views || ""}
                    onChange={(e) => setEditData({ ...editData, avg_views: parseInt(e.target.value) || 0 })}
                    placeholder="Average views per post"
                  />
                </div>
                <Button onClick={handleSave} className="w-full" variant="gradient">Save Social Data</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!hasData ? (
        <p className="text-xs md:text-sm text-muted-foreground text-center py-3 md:py-4">No social data added yet</p>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {/* Engagement Overview */}
          {(profile.total_engagement_rate || profile.avg_views) && (
            <div className="p-3 md:p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-xs md:text-sm font-semibold">Engagement Metrics</span>
                {profile.verified_metrics && (
                  <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-accent ml-auto" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
                {profile.total_engagement_rate && (
                  <div>
                    <div className="text-muted-foreground">Engagement</div>
                    <div className="font-bold text-primary">{profile.total_engagement_rate}%</div>
                  </div>
                )}
                {profile.avg_views && (
                  <div>
                    <div className="text-muted-foreground">Avg Views</div>
                    <div className="font-bold text-primary">{formatNumber(profile.avg_views)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Social Platforms */}
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            {socialPlatforms.map(({ urlKey, label, icon: Icon, statKey, statLabel }) => {
              const url = (profile as any)[urlKey];
              const stat = statKey ? (profile as any)[statKey] : null;
              
              if (!url && !stat) return null;
              
              return (
                <div key={urlKey} className="p-3 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Icon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs md:text-sm font-medium truncate">{label}</span>
                    </div>
                    {url && (
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {stat && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <div>
                        <span className="text-sm md:text-base font-bold text-primary">{formatNumber(stat)}</span>
                        <span className="text-xs text-muted-foreground ml-1">{statLabel}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
