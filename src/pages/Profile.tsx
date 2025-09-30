import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Star, Briefcase, Share2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PortfolioSection } from "@/components/profile/PortfolioSection";
import { ReviewsSection } from "@/components/profile/ReviewsSection";
import { IndustryStatsSection } from "@/components/profile/IndustryStatsSection";
import { SocialLinksSection } from "@/components/profile/SocialLinksSection";

interface Profile {
  full_name: string;
  role: string;
  bio: string;
  location: string;
  avatar_url: string;
  credits: number;
  user_id: string;
  website?: string;
  linkedin_url?: string;
  behance_url?: string;
  imdb_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  spotify_url?: string;
  soundcloud_url?: string;
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [industryStats, setIndustryStats] = useState([]);
  const [stats, setStats] = useState({
    connections: 0,
    projects: 0,
    responseRate: 98
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "",
    bio: "",
    location: "",
    avatar_url: ""
  });
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
      connections: connectionsCount || 0,
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
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Profile Header */}
        <div className="mb-8 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="relative h-48 bg-gradient-to-br from-primary via-secondary to-accent" />
          
          <div className="relative px-8 pb-8">
            <div className="mb-6 -mt-16 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <img
                  src={profile.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"}
                  alt="Profile"
                  className="h-32 w-32 rounded-2xl border-4 border-card object-cover"
                />
                <div>
                  <h1 className="mb-1 text-3xl font-bold">{profile.full_name}</h1>
                  <p className="mb-2 text-lg text-muted-foreground">
                    {profile.role}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.location || 'Remote'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-accent text-accent" />
                      4.9 (New member)
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <DialogTrigger asChild>
                    <Button variant="gradient">
                      <Edit className="h-4 w-4" />
                      Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
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
            <div className="grid grid-cols-3 gap-4 rounded-2xl border border-border bg-background p-6">
              <div className="text-center">
                <div className="mb-1 text-2xl font-bold text-primary">{stats.connections}</div>
                <div className="text-sm text-muted-foreground">Connections</div>
              </div>
              <div className="text-center">
                <div className="mb-1 text-2xl font-bold text-secondary">{stats.projects}</div>
                <div className="text-sm text-muted-foreground">Projects</div>
              </div>
              <div className="text-center">
                <div className="mb-1 text-2xl font-bold text-accent">{stats.responseRate}%</div>
                <div className="text-sm text-muted-foreground">Response Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="mb-6 w-full justify-start rounded-2xl bg-card p-1">
            <TabsTrigger value="about" className="rounded-xl">About</TabsTrigger>
            <TabsTrigger value="portfolio" className="rounded-xl">Portfolio</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-xl">Reviews</TabsTrigger>
            <TabsTrigger value="stats" className="rounded-xl">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-3 text-xl font-semibold">About</h3>
              <p className="text-muted-foreground">
                {profile.bio || 'Creative professional passionate about collaboration and innovation.'}
              </p>
            </div>

            <SocialLinksSection 
              links={{
                website: profile.website,
                linkedin_url: profile.linkedin_url,
                behance_url: profile.behance_url,
                imdb_url: profile.imdb_url,
                instagram_url: profile.instagram_url,
                twitter_url: profile.twitter_url,
                spotify_url: profile.spotify_url,
                soundcloud_url: profile.soundcloud_url,
              }}
              isOwnProfile={true}
              onRefresh={fetchData}
            />

            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-4 text-xl font-semibold">Credits</h3>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Briefcase className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="text-3xl font-bold">{profile.credits}</div>
                  <div className="text-sm text-muted-foreground">Available Credits</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4">
            <PortfolioSection 
              items={portfolioItems} 
              isOwnProfile={true}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <ReviewsSection 
              reviews={reviews} 
              isOwnProfile={true}
              profileUserId={profile.user_id}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
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
