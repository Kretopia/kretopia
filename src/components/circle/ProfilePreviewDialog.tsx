import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Briefcase, Award, Users, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface ProfilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export const ProfilePreviewDialog = ({
  open,
  onOpenChange,
  userId,
  userName
}: ProfilePreviewDialogProps) => {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-preview', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!userId
  });

  const { data: portfolioItems = [] } = useQuery({
    queryKey: ['portfolio-preview', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!userId
  });

  const skills = [
    ...(Array.isArray(profile?.professional_skills) ? profile.professional_skills : []),
    ...(Array.isArray(profile?.passion_skills) ? profile.passion_skills : [])
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Profile Preview</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">Loading profile...</div>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {profile.full_name?.[0] || userName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold">{profile.full_name}</h3>
                  <p className="text-muted-foreground font-medium">{profile.role}</p>
                  {profile.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      {profile.location}
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div>
                  <h4 className="font-semibold mb-2">About</h4>
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </div>
              )}

              {/* Skills */}
              {skills.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {skills.slice(0, 12).map((skill: any, index: number) => {
                      const skillText = typeof skill === 'string' 
                        ? skill 
                        : skill.skill || skill.name || '';
                      
                      return skillText ? (
                        <Badge key={index} variant="secondary">
                          {skillText}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Portfolio */}
              {portfolioItems.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Recent Work
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {portfolioItems.map((item: any) => (
                      <div
                        key={item.id}
                        className="aspect-square rounded-lg overflow-hidden bg-muted group relative"
                      >
                        {item.thumbnail_url || item.media_url ? (
                          <>
                            <img
                              src={item.thumbnail_url || item.media_url}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <p className="text-white text-xs text-center px-2">{item.title}</p>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">
                            🎨
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Stats */}
              {(profile.instagram_followers || profile.youtube_subscribers || profile.tiktok_followers || profile.spotify_listeners) && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Social Reach
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {profile.instagram_followers && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Instagram</p>
                        <p className="text-lg font-bold">{(profile.instagram_followers / 1000).toFixed(1)}K</p>
                      </div>
                    )}
                    {profile.youtube_subscribers && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">YouTube</p>
                        <p className="text-lg font-bold">{(profile.youtube_subscribers / 1000).toFixed(1)}K</p>
                      </div>
                    )}
                    {profile.tiktok_followers && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">TikTok</p>
                        <p className="text-lg font-bold">{(profile.tiktok_followers / 1000).toFixed(1)}K</p>
                      </div>
                    )}
                    {profile.spotify_listeners && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Spotify</p>
                        <p className="text-lg font-bold">{(profile.spotify_listeners / 1000).toFixed(1)}K</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action to close and return to matching */}
              <div className="text-center text-sm text-muted-foreground">
                Close to swipe on this profile
              </div>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
