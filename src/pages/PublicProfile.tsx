import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { PortfolioGrid } from "@/components/profile/PortfolioGrid";
import { TestimonialsSection } from "@/components/profile/TestimonialsSection";
import { ExperienceTimeline } from "@/components/profile/ExperienceTimeline";
import { CompanyProfileView } from "@/components/profile/CompanyProfileView";
import { AboutSection } from "@/components/profile/AboutSection";
import { SocialStatsSection } from "@/components/profile/SocialStatsSection";
import { ProfileQuickNav } from "@/components/profile/ProfileQuickNav";
import { SEO } from "@/components/SEO";
import { Download, FileText, Globe, Award } from "lucide-react";

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
      // Track connection request
      const { analytics } = await import("@/lib/analytics");
      analytics.connectionRequest(userId);
      
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
    <div className="min-h-screen bg-background pb-20">
      <SEO 
        title={`${profile?.full_name || 'User'}'s Profile`}
        description={profile?.bio || `View ${profile?.full_name || 'User'}'s professional profile`}
      />
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
          <div className="space-y-6">
            {/* Profile Hero Section */}
            <ProfileHero
              profile={profile}
              stats={stats}
              isOwnProfile={false}
              connectionStatus={connectionStatus}
              onConnect={isPendingReceived ? handleAcceptConnection : handleConnect}
              onMessage={handleMessage}
              onShare={() => {
                const profileUrl = `${window.location.origin}/profile/${userId}`;
                navigator.clipboard.writeText(profileUrl);
                toast({
                  title: "Profile link copied!",
                  description: "Share this profile with others",
                });
              }}
              skills={[
                ...(Array.isArray(profile.professional_skills) ? profile.professional_skills : []),
                ...(Array.isArray(profile.passion_skills) ? profile.passion_skills : [])
              ]}
            />

            {/* Sticky Navigation */}
            <ProfileQuickNav />

            {/* Scrolling Content Sections */}
            <div className="space-y-8">
              {/* Overview Section */}
              <section id="overview">
                {/* About Section */}
                <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm mb-6">
                  <AboutSection
                    bio={profile.bio}
                    jobTitle={profile.role}
                    industry={profile.industry}
                    skills={[
                      ...(Array.isArray(profile.professional_skills) ? profile.professional_skills : []),
                      ...(Array.isArray(profile.passion_skills) ? profile.passion_skills : [])
                    ]}
                    responseTime={stats.responseRate}
                    isOwnProfile={false}
                  />
                </div>

                {/* Skills Section */}
                <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm mb-6">
                  <SkillsSection 
                    professionalSkills={Array.isArray(profile.professional_skills) ? profile.professional_skills as any : []}
                    passionSkills={Array.isArray(profile.passion_skills) ? profile.passion_skills as any : []}
                    jobTitle={profile.job_title}
                    industry={profile.industry}
                    userId={userId}
                    isOwnProfile={false}
                    onRefresh={fetchData}
                  />
                </div>

                {/* Contact & Links */}
                <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
                  <h2 className="text-2xl font-bold mb-6">Contact & Links</h2>
                  <SocialLinksSection 
                    profile={profile}
                    isOwnProfile={false}
                    onRefresh={fetchData}
                  />
                </div>
              </section>

              {/* Portfolio Section */}
              <section id="portfolio">
                <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
                  <h2 className="text-2xl font-bold mb-6">Portfolio</h2>
                  <PortfolioSection 
                    items={portfolioItems} 
                    isOwnProfile={false}
                    onRefresh={fetchData}
                  />
                </div>
              </section>

              {/* Experience Section */}
              <section id="experience">
                {/* Industry Stats */}
                {industryStats.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
                    <h2 className="text-2xl font-bold mb-6">Industry Stats</h2>
                    <IndustryStatsSection 
                      stats={industryStats}
                      isOwnProfile={false}
                      onRefresh={fetchData}
                    />
                  </div>
                )}

                {/* Experience & Credits */}
                {credits.length > 0 ? (
                  <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
                    <h2 className="text-2xl font-bold mb-6">Experience & Credits</h2>
                    <CreditsSection 
                      userId={userId}
                      isOwnProfile={false}
                      onRefresh={fetchData}
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm text-center">
                    <p className="text-muted-foreground">No experience or credits listed.</p>
                  </div>
                )}
              </section>

              {/* Reviews & Social Section */}
              <section id="reviews-stats">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Reviews */}
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <ReviewsSection 
                      reviews={reviews} 
                      isOwnProfile={false}
                      profileUserId={profile.user_id}
                      onRefresh={fetchData}
                    />
                  </div>

                  {/* Social Stats */}
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <h2 className="text-2xl font-bold mb-6">Stats & Metrics</h2>
                    {(profile.youtube_subscribers || profile.instagram_followers || 
                      profile.tiktok_followers || profile.spotify_listeners || 
                      profile.twitter_followers || profile.linkedin_connections) ? (
                      <SocialStatsSection
                        youtubeSubscribers={profile.youtube_subscribers}
                        instagramFollowers={profile.instagram_followers}
                        tiktokFollowers={profile.tiktok_followers}
                        spotifyListeners={profile.spotify_listeners}
                        twitterFollowers={profile.twitter_followers}
                        linkedinConnections={profile.linkedin_connections}
                        verifiedMetrics={profile.verified_metrics}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No social stats added yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Press & Awards Section */}
              {(pressLinks.length > 0 || awards.length > 0) && (
                <section id="press-awards">
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Press */}
                    {pressLinks.length > 0 && (
                      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <PressLinksSection 
                          userId={userId}
                          isOwnProfile={false}
                          onRefresh={fetchData}
                        />
                      </div>
                    )}

                    {/* Awards */}
                    {awards.length > 0 && (
                      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <AwardsSection 
                          userId={userId}
                          isOwnProfile={false}
                          onRefresh={fetchData}
                        />
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;
