import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Star, Briefcase, Share2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  full_name: string;
  role: string;
  bio: string;
  location: string;
  avatar_url: string;
  credits: number;
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({
    connections: 0,
    projects: 0,
    responseRate: 98
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
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
      }

      // Fetch connections count
      const { count: connectionsCount } = await supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      setStats(prev => ({
        ...prev,
        connections: connectionsCount || 0,
      }));
    };

    fetchProfile();
  }, [toast]);

  const handleShare = () => {
    toast({
      title: "Profile link copied!",
      description: "Share your profile with others",
    });
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
                <Button variant="gradient">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
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
          </TabsList>

          <TabsContent value="about" className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-3 text-xl font-semibold">About</h3>
              <p className="text-muted-foreground">
                {profile.bio || 'Creative professional passionate about collaboration and innovation.'}
              </p>
            </div>

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
            <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
              <Briefcase className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold">No portfolio items yet</h3>
              <p className="text-muted-foreground">Add your work to showcase your talents</p>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
              <Star className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold">No reviews yet</h3>
              <p className="text-muted-foreground">Complete projects to receive reviews</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
