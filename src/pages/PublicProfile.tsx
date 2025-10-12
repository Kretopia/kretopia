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
import { ProfileHero } from "@/components/profile/ProfileHero";
import { AboutSection } from "@/components/profile/AboutSection";
import { PortfolioGrid } from "@/components/profile/PortfolioGrid";
import { TestimonialsSection } from "@/components/profile/TestimonialsSection";
import { ExperienceTimeline } from "@/components/profile/ExperienceTimeline";
import { CompanyProfileView } from "@/components/profile/CompanyProfileView";

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
  account_type?: 'individual' | 'company';
  company_name?: string;
  company_logo_url?: string;
  company_about?: string;
  company_address?: string;
  company_size?: string;
  company_industry?: string;
  average_rating?: number;
  total_reviews?: number;
  badge?: 'og' | 'beta' | 'official' | 'founder';
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
  const [isPendingReceived, setIsPendingReceived] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    if (!userId) return;

    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);
    
    // Fetch profile using only public fields from profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, role, bio, location, avatar_url, job_title, industry, badge, level, professional_skills, passion_skills, section_order, website, linkedin_url, behance_url, imdb_url, instagram_url, twitter_url, spotify_url, soundcloud_url, instagram_followers, youtube_subscribers, tiktok_followers, spotify_listeners, total_engagement_rate, verified_metrics, created_at, account_type, company_name, company_logo_url, company_about, company_address, company_size, company_industry, average_rating, total_reviews')
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
      // Check both directions for connection
      const { data: connections } = await supabase
        .from('connections')
        .select('status, user_id, connected_user_id')
        .or(`and(user_id.eq.${user.id},connected_user_id.eq.${userId}),and(user_id.eq.${userId},connected_user_id.eq.${user.id})`);

      // Also check for matches
      const { data: match } = await supabase
        .from('matches')
        .select('status')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
        .eq('status', 'active')
        .maybeSingle();

      if (match || (connections && connections.length > 0 && connections[0].status === 'accepted')) {
        setConnectionStatus('accepted');
        setIsConnected(true);
      } else if (connections && connections.length > 0) {
        const connection = connections[0];
        setConnectionStatus(connection.status as 'none' | 'pending' | 'accepted');
        setIsConnected(connection.status === 'accepted');
        
        // Check if this is a received request (they sent to you)
        if (connection.status === 'pending' && connection.user_id === userId) {
          setIsPendingReceived(true);
        }
      }
    }

    // Fetch connections count (both directions + matches)
    const [
      { count: outgoingCount },
      { count: incomingCount },
      { count: matchesCount }
    ] = await Promise.all([
      supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'accepted'),
      supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('connected_user_id', userId)
        .eq('status', 'accepted'),
      supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq('status', 'active')
    ]);

    const totalConnections = (outgoingCount || 0) + (incomingCount || 0) + (matchesCount || 0);

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
      circle: totalConnections,
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

    if (connectionStatus === 'pending' && !isPendingReceived) {
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

  const handleAcceptConnection = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('user_id', userId)
      .eq('connected_user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to accept connection",
        variant: "destructive",
      });
    } else {
      // Award 20 XP to both users for the new connection
      const { data: accepterProfile } = await supabase
        .from('profiles')
        .select('xp')
        .eq('user_id', user.id)
        .single();

      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('xp')
        .eq('user_id', userId)
        .single();

      // Award XP to both users
      await Promise.all([
        supabase
          .from('profiles')
          .update({ xp: (accepterProfile?.xp || 0) + 20 })
          .eq('user_id', user.id),
        supabase
          .from('profiles')
          .update({ xp: (requesterProfile?.xp || 0) + 20 })
          .eq('user_id', userId)
      ]);

      setConnectionStatus('accepted');
      setIsConnected(true);
      setIsPendingReceived(false);
      toast({
        title: "Connection Accepted! +20 XP",
        description: `You're now connected with ${profile?.full_name}`,
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => {
            const state = location.state as { from?: string; cardIndex?: number };
            if (state?.from === 'connect') {
              navigate('/connect');
            } else if (state?.from === 'circle') {
              navigate('/circle');
            } else {
              navigate('/discover', { state: { cardIndex: state?.cardIndex } });
            }
          }}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {location.state && (location.state as any).from === 'circle' 
            ? 'Back to My Circle' 
            : location.state && (location.state as any).from === 'connect' 
            ? 'Back to Connect' 
            : 'Back to Discover'}
        </Button>

        {/* Render company view for company accounts */}
        {profile.account_type === 'company' ? (
          <div className="space-y-6">
            <CompanyProfileView
              profile={profile}
              reviews={reviews}
              isOwnProfile={false}
              onRefresh={fetchData}
            />
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar */}
                <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                  <AvatarFallback className="text-2xl md:text-3xl">{profile.full_name.charAt(0)}</AvatarFallback>
                </Avatar>

                {/* Profile Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-start gap-3 mb-2">
                      <h1 className="text-2xl md:text-3xl font-bold">{profile.full_name}</h1>
                      {userBadge && (
                        <Badge variant={userBadge === 'og' ? 'default' : 'secondary'} className="mt-1">
                          {userBadge.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    {profile.job_title && (
                      <p className="text-lg text-muted-foreground">{profile.job_title}</p>
                    )}
                    {profile.location && (
                      <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{profile.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats Row */}
                  <div className="flex gap-6 text-sm">
                    <div>
                      <div className="font-bold text-lg">{stats.circle}</div>
                      <div className="text-muted-foreground">Connections</div>
                    </div>
                    <div>
                      <div className="font-bold text-lg">{stats.projects}</div>
                      <div className="text-muted-foreground">Projects</div>
                    </div>
                    {profile.average_rating && (
                      <div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold text-lg">{profile.average_rating.toFixed(1)}</span>
                        </div>
                        <div className="text-muted-foreground">{profile.total_reviews || 0} reviews</div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {isLoggedIn && (
                    <div className="flex flex-wrap gap-2">
                      {connectionStatus === 'accepted' ? (
                        <>
                          <Button onClick={handleMessage} className="gap-2">
                            <MessageCircle className="h-4 w-4" />
                            Message
                          </Button>
                          <Badge variant="secondary" className="gap-1 px-3 py-1">
                            <UserCheck className="h-3 w-3" />
                            Connected
                          </Badge>
                        </>
                      ) : isPendingReceived ? (
                        <Button onClick={handleAcceptConnection} className="gap-2">
                          <UserCheck className="h-4 w-4" />
                          Accept Connection
                        </Button>
                      ) : (
                        <Button
                          onClick={handleConnect}
                          variant={connectionStatus === 'pending' ? 'secondary' : 'default'}
                          disabled={connectionStatus === 'pending'}
                          className="gap-2"
                        >
                          <UserPlus className="h-4 w-4" />
                          {connectionStatus === 'pending' ? 'Request Sent' : 'Connect'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-6 w-full justify-start bg-card border border-border rounded-xl p-1 overflow-x-auto">
                <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
                {portfolioItems.length > 0 && (
                  <TabsTrigger value="portfolio" className="rounded-lg">Portfolio</TabsTrigger>
                )}
                {reviews.length > 0 && (
                  <TabsTrigger value="reviews" className="rounded-lg">Reviews</TabsTrigger>
                )}
                {pressLinks.length > 0 && (
                  <TabsTrigger value="press" className="rounded-lg">Press</TabsTrigger>
                )}
                {industryStats.length > 0 && (
                  <TabsTrigger value="stats" className="rounded-lg">Achievements</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="overview" className="grid gap-4 md:grid-cols-2">
                {/* Bio Widget */}
                {profile.bio && (
                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:col-span-2">
                    <h3 className="mb-3 text-lg font-semibold flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      About
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {profile.bio}
                    </p>
                  </div>
                )}

                {/* Skills Widget */}
                {((Array.isArray(profile.professional_skills) && profile.professional_skills.length > 0) || 
                  (Array.isArray(profile.passion_skills) && profile.passion_skills.length > 0)) && (
                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
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

                {/* Social Links Widget */}
                {(profile.instagram_url || profile.twitter_url || profile.linkedin_url || 
                  profile.spotify_url || profile.soundcloud_url || profile.behance_url || 
                  profile.imdb_url || profile.website ||
                  (profile.instagram_followers && profile.instagram_followers > 0) ||
                  (profile.youtube_subscribers && profile.youtube_subscribers > 0) ||
                  (profile.tiktok_followers && profile.tiktok_followers > 0) ||
                  (profile.spotify_listeners && profile.spotify_listeners > 0) ||
                  (profile.twitter_followers && profile.twitter_followers > 0) ||
                  (profile.linkedin_connections && profile.linkedin_connections > 0)) && (
                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <SocialLinksSection 
                      profile={profile}
                      isOwnProfile={false}
                      onRefresh={fetchData}
                    />
                  </div>
                )}

                {/* Credits Widget */}
                {credits.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:col-span-2">
                    <CreditsSection 
                      userId={userId}
                      isOwnProfile={false}
                      onRefresh={fetchData}
                    />
                  </div>
                )}

                {/* Awards Widget */}
                {awards.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:col-span-2">
                    <AwardsSection 
                      userId={userId}
                      isOwnProfile={false}
                      onRefresh={fetchData}
                    />
                  </div>
                )}
              </TabsContent>

              {portfolioItems.length > 0 && (
                <TabsContent value="portfolio">
                  <PortfolioSection 
                    items={portfolioItems} 
                    isOwnProfile={false}
                    onRefresh={fetchData}
                  />
                </TabsContent>
              )}

              {reviews.length > 0 && (
                <TabsContent value="reviews">
                  <ReviewsSection 
                    reviews={reviews} 
                    isOwnProfile={false}
                    profileUserId={profile.user_id}
                    onRefresh={fetchData}
                  />
                </TabsContent>
              )}

              {pressLinks.length > 0 && (
                <TabsContent value="press">
                  <PressLinksSection 
                    userId={userId}
                    isOwnProfile={false}
                    onRefresh={fetchData}
                  />
                </TabsContent>
              )}

              {industryStats.length > 0 && (
                <TabsContent value="stats">
                  <IndustryStatsSection 
                    stats={industryStats}
                    isOwnProfile={false}
                    onRefresh={fetchData}
                  />
                </TabsContent>
              )}
            </Tabs>
      </>
      )}
      </div>
    </div>
  );
};

export default PublicProfile;
