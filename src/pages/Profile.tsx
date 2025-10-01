import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Star, Briefcase, Share2, Edit, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PortfolioSection } from "@/components/profile/PortfolioSection";
import { ReviewsSection } from "@/components/profile/ReviewsSection";
import { IndustryStatsSection } from "@/components/profile/IndustryStatsSection";
import { SocialLinksSection } from "@/components/profile/SocialLinksSection";
import { InviteCodesCard } from "@/components/profile/InviteCodesCard";
import { SkillsSection } from "@/components/profile/SkillsSection";

interface Profile {
  full_name: string;
  role: string;
  bio: string;
  location: string;
  avatar_url: string;
  credits: number;
  user_id: string;
  job_title?: string;
  industry?: string;
  professional_skills?: any;
  passion_skills?: any;
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

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [industryStats, setIndustryStats] = useState([]);
  const [userBadge, setUserBadge] = useState<'og' | 'beta' | 'official' | null>(null);
  const [stats, setStats] = useState({
    circle: 0,
    projects: 0,
    responseRate: 98
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "",
    bio: "",
    location: "",
    avatar_url: ""
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } else {
      setProfile(data);
      setUserBadge(data.badge || 'beta');
      setEditForm({
        full_name: data.full_name || "",
        role: data.role || "",
        bio: data.bio || "",
        location: data.location || "",
        avatar_url: data.avatar_url || ""
      });
    }

    // Fetch connections count
    const { count: connectionsCount } = await supabase
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    // Fetch portfolio items
    const { data: portfolioData } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch reviews
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch industry stats
    const { data: statsData } = await supabase
      .from('industry_stats')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true });

    setStats(prev => ({
      ...prev,
      circle: connectionsCount || 0,
      projects: portfolioData?.length || 0,
    }));
    setPortfolioItems(portfolioData || []);
    setReviews(reviewsData || []);
    setIndustryStats(statsData || []);
  };

  useEffect(() => {
    fetchData();
  }, [toast]);

  const handleShare = () => {
    toast({
      title: "Profile link copied!",
      description: "Share your profile with others",
    });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile!, avatar_url: publicUrl });
      setEditForm({ ...editForm, avatar_url: publicUrl });
      
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleEditSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name,
        role: editForm.role,
        bio: editForm.bio,
        location: editForm.location,
        avatar_url: editForm.avatar_url,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } else {
      setProfile({ ...profile!, ...editForm });
      setIsEditOpen(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    }
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Profile Header */}
        <div className="mb-6 md:mb-8 overflow-hidden rounded-2xl md:rounded-3xl border border-border bg-card shadow-card">
          <div className="relative h-32 md:h-48 bg-gradient-to-br from-primary via-secondary to-accent" />
          
          <div className="relative px-4 md:px-8 pb-6 md:pb-8">
            <div className="mb-4 md:mb-6 -mt-12 md:-mt-16 flex flex-col items-start gap-3 md:gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 md:gap-4 w-full sm:w-auto">
                <div className="relative group">
                  <Avatar className="h-24 w-24 md:h-32 md:w-32 rounded-xl md:rounded-2xl border-4 border-card">
                    <AvatarImage 
                      src={profile.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"}
                      alt={profile.full_name}
                    />
                    <AvatarFallback className="text-2xl md:text-4xl">
                      {profile.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center rounded-xl md:rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-6 w-6 md:h-8 md:w-8 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-xl md:text-3xl font-bold leading-tight">{profile.full_name}</h1>
                    {userBadge && (
                      <Badge 
                        variant={userBadge === 'og' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {userBadge === 'og' ? '⭐ OG Thriver' : '🚀 Beta'}
                      </Badge>
                    )}
                  </div>
                  <p className="mb-2 text-base md:text-lg text-muted-foreground">
                    {profile.role}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="truncate">{profile.location || 'Remote'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 md:h-4 md:w-4 fill-accent text-accent" />
                      <span>4.9 (New member)</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="icon" onClick={handleShare} className="flex-1 sm:flex-none">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <DialogTrigger asChild>
                    <Button variant="gradient" className="flex-1 sm:flex-none">
                      <Edit className="h-4 w-4" />
                      <span className="ml-2">Edit Profile</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>
                        Update your profile information and settings
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Input
                          id="role"
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={editForm.location}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          value={editForm.bio}
                          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="avatar_url">Avatar URL</Label>
                        <Input
                          id="avatar_url"
                          value={editForm.avatar_url}
                          onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                          placeholder="https://example.com/avatar.jpg"
                        />
                      </div>
                      <Button onClick={handleEditSave} className="w-full" variant="gradient">
                        Save Changes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 rounded-xl md:rounded-2xl border border-border bg-background p-4 md:p-6">
              <div className="text-center">
                <div className="mb-0.5 md:mb-1 text-lg md:text-2xl font-bold text-primary">{stats.circle}</div>
                <div className="text-xs md:text-sm text-muted-foreground">My Circle</div>
              </div>
              <div className="text-center">
                <div className="mb-0.5 md:mb-1 text-lg md:text-2xl font-bold text-secondary">{stats.projects}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Projects</div>
              </div>
              <div className="text-center">
                <div className="mb-0.5 md:mb-1 text-lg md:text-2xl font-bold text-accent">{stats.responseRate}%</div>
                <div className="text-xs md:text-sm text-muted-foreground">Response Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="mb-4 md:mb-6 w-full justify-start rounded-xl md:rounded-2xl bg-card p-1 overflow-x-auto">
            <TabsTrigger value="about" className="rounded-lg md:rounded-xl text-xs md:text-sm">About</TabsTrigger>
            <TabsTrigger value="skills" className="rounded-lg md:rounded-xl text-xs md:text-sm">Skills</TabsTrigger>
            <TabsTrigger value="portfolio" className="rounded-lg md:rounded-xl text-xs md:text-sm">Portfolio</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-lg md:rounded-xl text-xs md:text-sm">Reviews</TabsTrigger>
            <TabsTrigger value="stats" className="rounded-lg md:rounded-xl text-xs md:text-sm whitespace-nowrap">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-4 md:space-y-6">
            <div className="rounded-xl md:rounded-2xl border border-border bg-card p-4 md:p-6 shadow-card">
              <h3 className="mb-2 md:mb-3 text-lg md:text-xl font-semibold">About</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                {profile.bio || 'Creative professional passionate about collaboration and innovation.'}
              </p>
            </div>

            <SocialLinksSection 
              profile={profile}
              isOwnProfile={true}
              onRefresh={fetchData}
            />

            <InviteCodesCard />

            <div className="rounded-xl md:rounded-2xl border border-border bg-card p-4 md:p-6 shadow-card">
              <h3 className="mb-3 md:mb-4 text-lg md:text-xl font-semibold">Credits</h3>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-xl md:rounded-2xl bg-primary/10">
                  <Briefcase className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold">{profile.credits}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Available Credits</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="skills" className="space-y-3 md:space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-card">
              <SkillsSection
                professionalSkills={Array.isArray(profile.professional_skills) ? profile.professional_skills : []}
                passionSkills={Array.isArray(profile.passion_skills) ? profile.passion_skills : []}
                jobTitle={profile.job_title}
                industry={profile.industry}
                isOwnProfile={true}
                onRefresh={fetchData}
              />
            </div>
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-3 md:space-y-4">
            <PortfolioSection 
              items={portfolioItems} 
              isOwnProfile={true}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="reviews" className="space-y-3 md:space-y-4">
            <ReviewsSection 
              reviews={reviews} 
              isOwnProfile={true}
              profileUserId={profile.user_id}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="stats" className="space-y-3 md:space-y-4">
            <IndustryStatsSection 
              stats={industryStats}
              isOwnProfile={true}
              onRefresh={fetchData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
