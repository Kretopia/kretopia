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
import { DigitalProductsSection } from "@/components/profile/DigitalProductsSection";
import { StartProjectDialog } from "@/components/project/StartProjectDialog";
import { AICollaborationIdeas } from "@/components/ai";
import { Download, FileText, Globe, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
  badge?: 'og' | 'beta' | 'official' | 'founder' | 'odos';
  achievement_badges?: string[];
  verification_tier?: string;
  verification_status?: string;
}

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [industryStats, setIndustryStats] = useState([]);
  const [credits, setCredits] = useState([]);
  const [awards, setAwards] = useState([]);
  const [pressLinks, setPressLinks] = useState([]);
  const [userBadge, setUserBadge] = useState<'og' | 'beta' | 'official' | 'founder' | 'odos' | null>(null);
  const [stats, setStats] = useState({
    circle: 0,
    projects: 0,
    responseRate: 98
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [isPendingReceived, setIsPendingReceived] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showStartProjectDialog, setShowStartProjectDialog] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<{full_name: string; role: string; professional_skills?: string[]; subscription_tier?: string} | null>(null);
  const { toast } = useToast();
  
  // Fetch current user's profile for project templates and AI features
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      if (currentUser) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role, professional_skills, subscription_tier')
          .eq('user_id', currentUser.id)
          .single();
        if (data) {
          setCurrentUserRole(data.role || '');
          setCurrentUserProfile({
            full_name: data.full_name || '',
            role: data.role || '',
            professional_skills: Array.isArray(data.professional_skills) ? (data.professional_skills as string[]) : [],
            subscription_tier: data.subscription_tier || 'free'
          });
        }
      }
    };
    fetchCurrentUserProfile();
  }, [currentUser]);

  const fetchData = async () => {
    if (!userId) return;

    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);
    
    setLoading(true);
    
    // Fetch profile using only public fields from profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, role, bio, location, avatar_url, job_title, industry, badge, level, professional_skills, passion_skills, section_order, website, linkedin_url, behance_url, imdb_url, instagram_url, twitter_url, spotify_url, soundcloud_url, verified_metrics, created_at, account_type, company_name, company_logo_url, company_about, company_address, company_size, company_industry, average_rating, total_reviews, achievement_badges, verification_tier, verification_status')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      // Check if user is not authenticated
      if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to view profiles",
          variant: "destructive",
        });
        navigate('/auth');
      } else {
        toast({
          title: "Error",
          description: "Failed to load profile. Please try again.",
          variant: "destructive",
        });
      }
      setLoading(false);
      return;
    }

    if (!data) {
      toast({
        title: "Profile Not Found",
        description: "This profile doesn't exist or may not be visible",
        variant: "destructive",
      });
      navigate(-1); // Go back instead of to home
      setLoading(false);
      return;
    }

    setProfile(data);
    setUserBadge(data.badge || 'beta');

    // Check connection status if logged in
    if (user) {
      // Batch connection and match queries in parallel
      const [connectionsResult, matchResult] = await Promise.all([
        supabase.from('connections').select('status, user_id, connected_user_id')
          .or(`and(user_id.eq.${user.id},connected_user_id.eq.${userId}),and(user_id.eq.${userId},connected_user_id.eq.${user.id})`),
        supabase.from('matches').select('status')
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
          .eq('status', 'active')
          .maybeSingle()
      ]);

      const connections = connectionsResult.data;
      const match = matchResult.data;

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

    // Batch ALL remaining queries in parallel
    const [
      portfolioResult,
      reviewsResult,
      statsResult,
      creditsResult,
      awardsResult,
      pressResult
    ] = await Promise.all([
      supabase.from('portfolio_items').select('id, user_id, title, description, media_url, media_type, thumbnail_url, tags, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('reviews').select('id, reviewer_name, reviewer_role, reviewer_company, reviewer_avatar_url, review_text, rating, created_at').eq('profile_id', userId).eq('status', 'approved').order('created_at', { ascending: false }).limit(20),
      supabase.from('industry_stats').select('id, stat_type, stat_value, verified, display_order').eq('user_id', userId).order('display_order', { ascending: true }).limit(10),
      supabase.from('credits').select('id, project_name, role, year, company, project_url, created_at').eq('user_id', userId).order('year', { ascending: false }).limit(30),
      supabase.from('awards').select('id, title, organization, year, category, image_url, created_at').eq('user_id', userId).order('year', { ascending: false }).limit(20),
      supabase.from('press_links').select('id, title, publication, url, published_date, image_url, excerpt, created_at').eq('user_id', userId).order('published_date', { ascending: false}).limit(20)
    ]);

    setStats(prev => ({
      ...prev,
      circle: totalConnections,
      projects: portfolioResult.data?.length || 0,
    }));
    setPortfolioItems(portfolioResult.data || []);
    setReviews(reviewsResult.data || []);
    setIndustryStats(statsResult.data || []);
    setCredits(creditsResult.data || []);
    setAwards(awardsResult.data || []);
    setPressLinks(pressResult.data || []);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await fetchData();
        
        // Track profile view
        const { analytics } = await import("@/lib/analytics");
        analytics.profileViewed(userId || '', 'public');
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
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
    navigate(`/messages?user=${userId}`);
  };

  const handleStartProject = () => {
    setShowStartProjectDialog(true);
  };

  // Check if user came from a match notification
  const isFromMatch = location.search?.includes('from=match') || 
                      (location.state as any)?.from === 'match';

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
      
      {/* Start Project Dialog */}
      <StartProjectDialog
        open={showStartProjectDialog}
        onOpenChange={setShowStartProjectDialog}
        collaborator={{
          id: userId || '',
          name: profile?.full_name || 'Creator',
          role: profile?.role || 'Creator',
          avatar: profile?.avatar_url,
        }}
        currentUserRole={currentUserRole}
      />
      <div className="container mx-auto max-w-7xl px-4 py-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => {
            const state = location.state as { from?: string; cardIndex?: number };
            if (state?.from === 'match' || location.search?.includes('from=match')) {
              navigate('/circle?tab=network');
            } else if (state?.from === 'connect') {
              navigate('/connect');
            } else if (state?.from === 'spark') {
              navigate('/spark');
            } else if (state?.from === 'circle') {
              navigate('/circle');
            } else {
              navigate(-1);
            }
          }}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {isFromMatch 
            ? 'Back to Network' 
            : location.state && (location.state as any).from === 'circle' 
            ? 'Back to Circle' 
            : location.state && (location.state as any).from === 'connect' 
            ? 'Back to Connect' 
            : 'Back'}
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
              creditsCount={credits?.length || 0}
              awardsCount={awards?.length || 0}
              onConnect={isPendingReceived ? handleAcceptConnection : handleConnect}
              onMessage={handleMessage}
              onStartProject={handleStartProject}
              isFromMatch={isFromMatch}
              onShare={() => {
                const profileUrl = `https://www.thrivein.io/profile/${userId}`;
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
                {/* AI Collaboration Ideas - Show only for matched users */}
                {isConnected && currentUserProfile && (
                  <div className="mb-6">
                    <AICollaborationIdeas
                      currentUser={{
                        full_name: currentUserProfile.full_name,
                        role: currentUserProfile.role,
                        professional_skills: currentUserProfile.professional_skills
                      }}
                      matchedUser={{
                        full_name: profile.full_name,
                        role: profile.role,
                        professional_skills: Array.isArray(profile.professional_skills) ? (profile.professional_skills as string[]) : []
                      }}
                      isPro={currentUserProfile.subscription_tier === 'pro'}
                    />
                  </div>
                )}

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

              {/* Digital Products Marketplace */}
              <div className="mt-6">
                <DigitalProductsSection 
                  userId={userId}
                  isOwner={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;
