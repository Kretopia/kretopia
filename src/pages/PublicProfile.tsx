import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Star, Briefcase, ArrowLeft, MessageCircle, UserPlus, UserCheck } from "lucide-react";
import { PostOpportunityDialog } from "@/components/PostOpportunityDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PortfolioSection } from "@/components/profile/PortfolioSection";
import { ReviewsSection } from "@/components/profile/ReviewsSection";
import { IndustryStatsSection } from "@/components/profile/IndustryStatsSection";
import { SocialLinksSection } from "@/components/profile/SocialLinksSection";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { PressLinksSection } from "@/components/profile/PressLinksSection";
import { CreditsSection } from "@/components/profile/CreditsSection";
import { AwardsSection } from "@/components/profile/AwardsSection";

interface Profile {
  full_name: string;
  role: string;
  bio: string;
  location: string;
  avatar_url: string;
  user_id: string;
  job_title?: string;
  industry?: string;
  professional_skills?: any;
  passion_skills?: any;
  press_links?: any;
  project_credits?: any;
  awards?: any;
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

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [industryStats, setIndustryStats] = useState([]);
  const [credits, setCredits] = useState([]);
  const [awards, setAwards] = useState([]);
  const [pressLinks, setPressLinks] = useState([]);
  const [userBadge, setUserBadge] = useState<'og' | 'beta' | 'official' | 'founder' | null>(null);
  const [stats, setStats] = useState({
    circle: 0,
    projects: 0,
    responseRate: 98
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    if (!userId) return;

    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);
    
    // Fetch profile using the secure public_profiles view
    // This view excludes sensitive data like payment info and subscription details
    const { data, error } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
      return;
    }

    if (!data) {
      toast({
        title: "Profile Not Found",
        description: "This profile doesn't exist or has been removed",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    setProfile(data);
    setUserBadge(data.badge || 'beta');

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

    // Fetch credits
    const { data: creditsData } = await supabase
      .from('credits')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false });

    // Fetch awards
    const { data: awardsData } = await supabase
      .from('awards')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false });

    // Fetch press links
    const { data: pressData } = await supabase
      .from('press_links')
      .select('*')
      .eq('user_id', userId)
      .order('published_date', { ascending: false });

    setStats(prev => ({
      ...prev,
      circle: connectionsCount || 0,
      projects: portfolioData?.length || 0,
    }));
    setPortfolioItems(portfolioData || []);
    setReviews(reviewsData || []);
    setIndustryStats(statsData || []);
    setCredits(creditsData || []);
    setAwards(awardsData || []);
    setPressLinks(pressData || []);
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

  const handleMessage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please log in to send messages",
        variant: "destructive",
      });
      return;
    }

    // Navigate to messages page with the receiver ID
    navigate('/messages', { state: { receiverId: userId, receiverName: profile.full_name } });
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
            const state = location.state as { from?: string; cardIndex?: number };
            if (state?.from === 'connect') {
              navigate('/connect');
            } else {
              navigate('/discover', { state: { cardIndex: state?.cardIndex } });
            }
          }}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {location.state && (location.state as any).from === 'connect' ? 'Back to Connect' : 'Back to Discover'}
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
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-xl md:text-3xl font-bold leading-tight">{profile.full_name}</h1>
                    {userBadge && (
                      <Badge 
                        variant={userBadge === 'og' || userBadge === 'founder' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {userBadge === 'founder' ? '👑 Founder' : userBadge === 'og' ? '⭐ OG Thriver' : '🚀 Beta'}
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
              
              {/* Action buttons */}
              {isLoggedIn ? (
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {connectionStatus === 'accepted' ? (
                    <Button variant="outline" disabled className="gap-2">
                      <UserCheck className="h-4 w-4" />
                      Connected
                    </Button>
                  ) : connectionStatus === 'pending' ? (
                    <Button variant="outline" disabled className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Pending
                    </Button>
                  ) : (
                    <Button onClick={handleConnect} variant="gradient" className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Connect
                    </Button>
                  )}
                  <Button onClick={handleMessage} variant="outline" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <Button onClick={() => navigate('/auth')} variant="gradient" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Sign Up to Connect
                  </Button>
                </div>
              )}
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
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4 md:mb-6 w-full justify-start rounded-xl md:rounded-2xl bg-card p-1 overflow-x-auto">
            <TabsTrigger value="overview" className="rounded-lg md:rounded-xl text-xs md:text-sm">Overview</TabsTrigger>
            {portfolioItems.length > 0 && (
              <TabsTrigger value="portfolio" className="rounded-lg md:rounded-xl text-xs md:text-sm">Portfolio</TabsTrigger>
            )}
            {reviews.length > 0 && (
              <TabsTrigger value="reviews" className="rounded-lg md:rounded-xl text-xs md:text-sm">Reviews</TabsTrigger>
            )}
            {pressLinks.length > 0 && (
              <TabsTrigger value="press" className="rounded-lg md:rounded-xl text-xs md:text-sm">Press</TabsTrigger>
            )}
            {industryStats.length > 0 && (
              <TabsTrigger value="stats" className="rounded-lg md:rounded-xl text-xs md:text-sm whitespace-nowrap">Achievements</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-4 md:space-y-6">
            {((Array.isArray(profile.professional_skills) && profile.professional_skills.length > 0) || 
              (Array.isArray(profile.passion_skills) && profile.passion_skills.length > 0) ||
              profile.job_title || profile.industry) && (
              <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-card">
                <SkillsSection
                  professionalSkills={Array.isArray(profile.professional_skills) ? profile.professional_skills : []}
                  passionSkills={Array.isArray(profile.passion_skills) ? profile.passion_skills : []}
                  jobTitle={profile.job_title}
                  industry={profile.industry}
                  isOwnProfile={false}
                  onRefresh={fetchData}
                />
              </div>
            )}

            {profile.bio && (
              <div className="rounded-xl md:rounded-2xl border border-border bg-card p-4 md:p-6 shadow-card">
                <h3 className="mb-2 md:mb-3 text-lg md:text-xl font-semibold">About</h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {profile.bio}
                </p>
              </div>
            )}

            {credits.length > 0 && (
              <CreditsSection 
                userId={userId}
                isOwnProfile={false}
                onRefresh={fetchData}
              />
            )}

            {awards.length > 0 && (
              <AwardsSection 
                userId={userId}
                isOwnProfile={false}
                onRefresh={fetchData}
              />
            )}

            {(profile.instagram_url || profile.twitter_url || profile.linkedin_url || 
              profile.spotify_url || profile.soundcloud_url || profile.behance_url || 
              profile.imdb_url || profile.website ||
              (profile.instagram_followers && profile.instagram_followers > 0) ||
              (profile.youtube_subscribers && profile.youtube_subscribers > 0) ||
              (profile.tiktok_followers && profile.tiktok_followers > 0) ||
              (profile.spotify_listeners && profile.spotify_listeners > 0) ||
              (profile.twitter_followers && profile.twitter_followers > 0) ||
              (profile.linkedin_connections && profile.linkedin_connections > 0)) && (
              <SocialLinksSection 
                profile={profile}
                isOwnProfile={false}
                onRefresh={fetchData}
              />
            )}
          </TabsContent>

          {portfolioItems.length > 0 && (
            <TabsContent value="portfolio" className="space-y-3 md:space-y-4">
              <PortfolioSection 
                items={portfolioItems} 
                isOwnProfile={false}
                onRefresh={fetchData}
              />
            </TabsContent>
          )}

          {reviews.length > 0 && (
            <TabsContent value="reviews" className="space-y-3 md:space-y-4">
              <ReviewsSection 
                reviews={reviews} 
                isOwnProfile={false}
                profileUserId={profile.user_id}
                onRefresh={fetchData}
              />
            </TabsContent>
          )}

          {pressLinks.length > 0 && (
            <TabsContent value="press" className="space-y-3 md:space-y-4">
              <PressLinksSection 
                userId={userId}
                isOwnProfile={false}
                onRefresh={fetchData}
              />
            </TabsContent>
          )}

          {industryStats.length > 0 && (
            <TabsContent value="stats" className="space-y-3 md:space-y-4">
              <IndustryStatsSection 
                stats={industryStats}
                isOwnProfile={false}
                onRefresh={fetchData}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default PublicProfile;
