import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Star, Briefcase, ArrowLeft, MessageCircle, UserPlus } from "lucide-react";
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

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [industryStats, setIndustryStats] = useState([]);
  const [stats, setStats] = useState({
    circle: 0,
    projects: 0,
    responseRate: 98
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const { toast } = useToast();

  const fetchData = async () => {
    if (!userId) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch profile using the secure public_profiles view
    // This view excludes sensitive data like payment info and subscription details
    const { data, error } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
      return;
    }

    setProfile(data);

    // Check connection status if logged in
    if (user) {
      const { data: connectionData } = await supabase
        .from('connections')
        .select('status')
        .or(`and(user_id.eq.${user.id},connected_user_id.eq.${userId}),and(user_id.eq.${userId},connected_user_id.eq.${user.id})`)
        .maybeSingle();

      if (connectionData) {
        setConnectionStatus(connectionData.status as 'none' | 'pending' | 'accepted');
        setIsConnected(connectionData.status === 'accepted');
      }
    }

    // Fetch connections count
    const { count: connectionsCount } = await supabase
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'accepted');

    // Fetch portfolio items
    const { data: portfolioData } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Fetch reviews (only approved)
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*')
      .eq('profile_id', userId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    // Fetch industry stats
    const { data: statsData } = await supabase
      .from('industry_stats')
      .select('*')
      .eq('user_id', userId)
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
  }, [userId]);

  const handleConnect = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please log in to connect with other creators",
        variant: "destructive",
      });
      return;
    }

    if (connectionStatus === 'pending') {
      toast({
        title: "Connection Pending",
        description: "Your connection request is already pending",
      });
      return;
    }

    const { error } = await supabase
      .from('connections')
      .insert({
        user_id: user.id,
        connected_user_id: userId,
        status: 'pending'
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send connection request",
        variant: "destructive",
      });
    } else {
      setConnectionStatus('pending');
      toast({
        title: "Connection Request Sent!",
        description: "They'll be notified of your request",
      });
    }
  };

  const handleMessage = () => {
    toast({
      title: "Coming Soon! 💬",
      description: "Direct messaging will be available soon",
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
    <div className="min-h-screen p-4 md:p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => {
            const state = location.state as { cardIndex?: number };
            navigate('/discover', { state: { cardIndex: state?.cardIndex } });
          }}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Discover
        </Button>

        {/* Profile Header */}
        <div className="mb-6 md:mb-8 overflow-hidden rounded-2xl md:rounded-3xl border border-border bg-card shadow-card">
          <div className="relative h-32 md:h-48 bg-gradient-to-br from-primary via-secondary to-accent" />
          
          <div className="relative px-4 md:px-8 pb-6 md:pb-8">
            <div className="mb-4 md:mb-6 -mt-12 md:-mt-16 flex flex-col items-start gap-3 md:gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 md:gap-4 w-full sm:w-auto">
                <Avatar className="h-24 w-24 md:h-32 md:w-32 rounded-xl md:rounded-2xl border-4 border-card">
                  <AvatarImage 
                    src={profile.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"}
                    alt={profile.full_name}
                  />
                  <AvatarFallback className="text-2xl md:text-4xl">
                    {profile.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h1 className="mb-1 text-xl md:text-3xl font-bold leading-tight">{profile.full_name}</h1>
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
              
              {/* Removed direct connect button - users must mutually match through Discover */}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 rounded-xl md:rounded-2xl border border-border bg-background p-4 md:p-6">
              <div className="text-center">
                <div className="mb-0.5 md:mb-1 text-lg md:text-2xl font-bold text-primary">{stats.circle}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Circle</div>
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

            {/* Only show social links if connected */}
            {isConnected && (
              <SocialLinksSection 
                profile={profile}
                isOwnProfile={false}
                onRefresh={fetchData}
              />
            )}
            
            {!isConnected && (
              <div className="rounded-xl md:rounded-2xl border border-border bg-card p-4 md:p-6 shadow-card">
                <h3 className="mb-2 md:mb-3 text-lg md:text-xl font-semibold">Social Links</h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Connect with {profile.full_name.split(' ')[0]} through Discover to see their social media profiles and contact information.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-3 md:space-y-4">
            <PortfolioSection 
              items={portfolioItems} 
              isOwnProfile={false}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="reviews" className="space-y-3 md:space-y-4">
            <ReviewsSection 
              reviews={reviews} 
              isOwnProfile={false}
              profileUserId={profile.user_id}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="stats" className="space-y-3 md:space-y-4">
            <IndustryStatsSection 
              stats={industryStats}
              isOwnProfile={false}
              onRefresh={fetchData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PublicProfile;
