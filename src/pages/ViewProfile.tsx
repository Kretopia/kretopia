import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  MapPin, 
  ArrowLeft, 
  MessageCircle, 
  Briefcase,
  Sparkles,
  Star,
  Award,
  Rocket,
  UserPlus,
  Clock,
  Users,
  UserCheck,
  Share2
} from "lucide-react";
import { ClaimProfileDialog } from "@/components/profile/ClaimProfileDialog";
import { ShareUnclaimedProfileDialog } from "@/components/profile/ShareUnclaimedProfileDialog";
import { DirectMessageDialog } from "@/components/DirectMessageDialog";
import { StartProjectFromMatchDialog } from "@/components/project/StartProjectFromMatchDialog";
import { MediaPlayerModal } from "@/components/profile/MediaPlayerModal";
import { SEO } from "@/components/SEO";
import CreatorEPK from "./CreatorEPK";
import { DegreeBadge } from "@/components/circle/DegreeBadge";
import { useConnectionDegree } from "@/hooks/useNetworkStats";

// Import profile section components
import { PortfolioSection } from "@/components/profile/PortfolioSection";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { SocialStatsSection } from "@/components/profile/SocialStatsSection";
import { UnifiedWorkHistory } from "@/components/profile/UnifiedWorkHistory";
import { PressLinksSection } from "@/components/profile/PressLinksSection";
import { AwardsSection } from "@/components/profile/AwardsSection";
import { ReviewsSection } from "@/components/profile/ReviewsSection";
import { AchievementBadges } from "@/components/profile/AchievementBadges";

interface Profile {
  user_id: string;
  full_name: string;
  role: string;
  bio: string;
  location: string;
  avatar_url: string;
  verification_tier?: string;
  verification_status?: string;
  achievement_badges?: string[];
  professional_skills?: any;
  passion_skills?: any;
  collab_intent?: string;
  rate_range?: string;
  average_rating?: number;
  total_reviews?: number;
  youtube_subscribers?: number;
  instagram_followers?: number;
  tiktok_followers?: number;
  spotify_listeners?: number;
  twitter_followers?: number;
  linkedin_connections?: number;
  social_verified?: boolean;
  job_title?: string;
  industry?: string;
  is_claimed?: boolean;
  badge?: string;
}

const ViewProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [awards, setAwards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMatched, setIsMatched] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'connected'>('none');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isStartProjectOpen, setIsStartProjectOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
  const [showClaimDialog, setShowClaimDialog] = useState(searchParams.get('showClaim') === 'true');
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  const isFromMatch = searchParams.get('from') === 'match';
  
  // Get connection degree info
  const { degree, path: connectionPath } = useConnectionDegree(user?.id, userId);

  // If not authenticated, show public EPK
  if (!authLoading && !user) {
    return <CreatorEPK />;
  }

  // If viewing own profile, redirect to /profile
  useEffect(() => {
    if (user && userId === user.id) {
      navigate('/profile', { replace: true });
    }
  }, [user, userId, navigate]);

  const fetchData = async () => {
    if (!userId || !user) return;
    
    setIsLoading(true);
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch portfolio items
      const { data: portfolioData } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('user_id', userId)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });

      setPortfolioItems(portfolioData || []);

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*')
        .eq('profile_id', userId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (reviewsData) {
        // Fetch reviewer profiles
        const reviewerIds = reviewsData.map(r => r.reviewer_id);
        const { data: reviewerProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, role')
          .in('user_id', reviewerIds);

        const reviewsWithProfiles = reviewsData.map(review => ({
          ...review,
          reviewer: reviewerProfiles?.find(p => p.user_id === review.reviewer_id)
        }));
        setReviews(reviewsWithProfiles);
      }

      // Fetch credits and awards for Industry Verified badge
      const [creditsResult, awardsResult] = await Promise.all([
        supabase.from('credits').select('id').eq('user_id', userId),
        supabase.from('awards').select('id').eq('user_id', userId)
      ]);
      
      setCredits(creditsResult.data || []);
      setAwards(awardsResult.data || []);

      // Check if matched
      const { data: matchData } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
        .eq('status', 'active')
        .limit(1);

      setIsMatched(matchData && matchData.length > 0);
      if (matchData && matchData.length > 0) {
        setMatchId(matchData[0].id);
      }
      
      // Check connection status
      const { data: connectionData } = await supabase
        .from('connections')
        .select('status')
        .or(`and(user_id.eq.${user.id},connected_user_id.eq.${userId}),and(user_id.eq.${userId},connected_user_id.eq.${user.id})`)
        .limit(1);
      
      if (connectionData && connectionData.length > 0) {
        setConnectionStatus(connectionData[0].status === 'accepted' ? 'connected' : 'pending');
      } else {
        setConnectionStatus('none');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Track profile view
    if (userId && user && userId !== user.id) {
      import('@/lib/profileViewTracking').then(({ trackProfileView }) => {
        trackProfileView(userId, isFromMatch ? 'match' : 'public');
      });
    }
  }, [userId, user]);
  
  // Handle connection request
  const handleConnect = async () => {
    if (!user || !userId) return;
    
    setIsConnecting(true);
    try {
      // Insert connection request
      const { error } = await supabase
        .from('connections')
        .insert({
          user_id: user.id,
          connected_user_id: userId,
          status: 'pending'
        });
      
      if (error) {
        if (error.code === '23505') {
          toast.info('Connection request already sent');
        } else {
          throw error;
        }
      } else {
        setConnectionStatus('pending');
        toast.success(`Connection request sent to ${profile?.full_name}`);
        
        // Create notification for the other user
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'New Connection Request',
          message: `${profile?.full_name || 'Someone'} wants to connect with you`,
          type: 'connection',
          link: `/profile/${user.id}`,
          action_url: '/circle?tab=network',
          action_text: 'View Request'
        });
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast.error('Failed to send connection request');
    } finally {
      setIsConnecting(false);
    }
  };

  // Check if this is an unclaimed profile
  const isUnclaimedProfile = profile?.is_claimed === false;
  
  // Check if profile qualifies for Industry Verified badge (3+ credits OR 2+ awards)
  const isIndustryVerified = credits.length >= 3 || awards.length >= 2 || profile?.verification_tier === 'industry';
  
  const getVerificationBadge = () => {
    if (!profile?.verification_status || profile.verification_status !== 'verified') return null;
    
    return (
      <Badge className="gap-1.5 bg-gradient-to-r from-primary via-purple-600 to-primary bg-[length:200%_100%] animate-gradient text-white border-0 shadow-lg shadow-primary/25">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
        <span className="text-xs font-bold tracking-wide">VERIFIED</span>
      </Badge>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <Skeleton className="h-10 w-24 mb-6" />
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Profile not found</h2>
          <Button onClick={() => navigate('/circle')}>Go to Circle</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`${profile.full_name} | ThriveIN`}
        description={profile.bio || `Check out ${profile.full_name}'s profile on ThriveIN`}
      />
      
      <div className="min-h-screen bg-background pb-24 lg:pb-6">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => {
              // If we have history, go back; otherwise go to Circle
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate('/circle');
              }
            }}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Match Celebration Banner */}
          {(isMatched || isFromMatch) && (
            <Card className="mb-6 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border-primary/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/20">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">You're matched! 🎉</p>
                    <p className="text-sm text-muted-foreground">Start a conversation or collaborate on a project</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profile Header Card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              {/* Unclaimed Profile Banner */}
              {isUnclaimedProfile && (
                <div className="mb-6 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-amber-500">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-sm font-medium">Unclaimed Profile</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowShareDialog(true)}
                        className="gap-1.5 h-8 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => setShowClaimDialog(true)}
                        className="gap-1.5 h-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Claim
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Is this you? Verify your identity to claim this profile and unlock all features.
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Avatar */}
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                  <AvatarFallback className="text-2xl">
                    {profile.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                    <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                    {getVerificationBadge()}
                    
                    {/* Industry Verified Badge */}
                    {isIndustryVerified && (
                      <Badge className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                        <Sparkles className="h-3 w-3" />
                        <span className="text-xs font-semibold">Industry Verified</span>
                      </Badge>
                    )}
                    
                    {/* Unclaimed Badge - only show if NOT industry verified (avoid badge clutter) */}
                    {isUnclaimedProfile && !isIndustryVerified && (
                      <Badge 
                        variant="secondary"
                        className="text-xs bg-amber-500/20 text-amber-500 border-amber-500/30"
                      >
                        ✨ Unclaimed
                      </Badge>
                    )}
                    
                    {/* OG/Beta/ODOS Badge - only for claimed profiles */}
                    {profile.badge && (
                      <Badge 
                        variant="default"
                        className={profile.badge === 'odos' ? "bg-green-500 hover:bg-green-600" : ""}
                      >
                        {profile.badge === 'founder' ? '👑 Founder' : 
                         profile.badge === 'og' ? '⭐ OG' : 
                         profile.badge === 'odos' ? '🌿 ODOS' :
                         profile.badge === 'official' ? '✓ Official' : '🚀 Beta'}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground mb-2">{profile.role}</p>
                  
                  {profile.location && (
                    <div className="flex items-center justify-center sm:justify-start gap-1 text-sm text-muted-foreground mb-3">
                      <MapPin className="h-4 w-4" />
                      {profile.location}
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
                    {profile.collab_intent && (
                      <Badge variant="secondary" className="gap-1">
                        <Briefcase className="h-3 w-3" />
                        {profile.collab_intent}
                      </Badge>
                    )}
                    {profile.rate_range && (
                      <Badge variant="outline">{profile.rate_range}</Badge>
                    )}
                    {profile.average_rating && profile.average_rating > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {profile.average_rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>

                  {/* Achievement Badges */}
                  {profile.achievement_badges && profile.achievement_badges.length > 0 && (
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
                      {profile.achievement_badges.slice(0, 3).map((badge, i) => (
                        <Badge key={i} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
                          <Award className="h-3 w-3" />
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{profile.bio}</p>
                  )}
                </div>
              </div>

              {/* Connection Degree Badge */}
              {degree !== null && degree > 0 && degree <= 3 && (
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-4">
                  <DegreeBadge degree={degree as 1 | 2 | 3} showLabel />
                  {connectionPath.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      via {connectionPath.map(c => c.fullName).join(' → ')}
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-6 pt-6 border-t">
                {/* Unclaimed profile - only show Discover More since claim is in banner */}
                {isUnclaimedProfile ? (
                  <Button variant="outline" onClick={() => navigate('/circle')} className="gap-2">
                    <Users className="h-4 w-4" />
                    Discover More
                  </Button>
                ) : isMatched ? (
                  /* Already matched - show full actions */
                  <>
                    <Button onClick={() => setIsMessageDialogOpen(true)} className="gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Message
                    </Button>
                    <Button variant="outline" onClick={() => setIsStartProjectOpen(true)} className="gap-2">
                      <Rocket className="h-4 w-4" />
                      Start Project
                    </Button>
                  </>
                ) : connectionStatus === 'connected' ? (
                  /* Connected but not matched - allow messaging */
                  <>
                    <Button onClick={() => setIsMessageDialogOpen(true)} className="gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Message
                    </Button>
                    <Button variant="outline" onClick={() => setIsStartProjectOpen(true)} className="gap-2">
                      <Rocket className="h-4 w-4" />
                      Collaborate
                    </Button>
                  </>
                ) : connectionStatus === 'pending' ? (
                  /* Pending connection */
                  <Button variant="outline" disabled className="gap-2">
                    <Clock className="h-4 w-4" />
                    Request Pending
                  </Button>
                ) : (
                  /* No connection - show connect option */
                  <>
                    <Button 
                      onClick={handleConnect} 
                      disabled={isConnecting}
                      className="gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/circle')} className="gap-2">
                      <Users className="h-4 w-4" />
                      Discover More
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Claim Profile Dialog */}
          <ClaimProfileDialog
            open={showClaimDialog}
            onOpenChange={setShowClaimDialog}
            profile={profile}
            onSuccess={() => {
              setShowClaimDialog(false);
              fetchData();
            }}
          />

          {/* Share Unclaimed Profile Dialog */}
          {isUnclaimedProfile && (
            <ShareUnclaimedProfileDialog
              open={showShareDialog}
              onOpenChange={setShowShareDialog}
              profileName={profile.full_name}
              profileUrl={`https://www.thrivein.io/profile/${profile.user_id}`}
            />
          )}

          {/* Achievement Badges */}
          {profile.achievement_badges && profile.achievement_badges.length > 0 && (
            <div className="mb-6">
              <AchievementBadges 
                achievements={profile.achievement_badges}
                showAll={true}
              />
            </div>
          )}

          {/* Portfolio Section */}
          {portfolioItems.length > 0 && (
            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm mb-6">
              <h2 className="text-lg font-bold mb-4">Portfolio</h2>
              <PortfolioSection 
                items={portfolioItems} 
                isOwnProfile={false}
                onRefresh={fetchData}
              />
            </div>
          )}

          {/* Skills Section */}
          {(profile.professional_skills?.length > 0 || profile.passion_skills?.length > 0) && (
            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm mb-6">
              <SkillsSection
                professionalSkills={Array.isArray(profile.professional_skills) ? profile.professional_skills : []}
                passionSkills={Array.isArray(profile.passion_skills) ? profile.passion_skills : []}
                jobTitle={profile.job_title}
                industry={profile.industry}
                isOwnProfile={false}
                userId={profile.user_id}
                onRefresh={fetchData}
              />
            </div>
          )}

          {/* Social Stats */}
          {(profile.youtube_subscribers || profile.instagram_followers || profile.tiktok_followers || 
            profile.spotify_listeners || profile.twitter_followers || profile.linkedin_connections) && (
            <div className="mb-6">
              <SocialStatsSection 
                youtubeSubscribers={profile.youtube_subscribers}
                instagramFollowers={profile.instagram_followers}
                tiktokFollowers={profile.tiktok_followers}
                spotifyListeners={profile.spotify_listeners}
                twitterFollowers={profile.twitter_followers}
                linkedinConnections={profile.linkedin_connections}
                verifiedMetrics={profile.social_verified}
              />
            </div>
          )}

          {/* Experience & Credits */}
          <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm mb-6">
            <h2 className="text-lg font-bold mb-4">Experience & Credits</h2>
            <UnifiedWorkHistory 
              userId={profile.user_id}
              isOwnProfile={false}
              onRefresh={fetchData}
            />
          </div>

          {/* Press Links */}
          <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm mb-6">
            <h3 className="font-semibold mb-4">Press Coverage</h3>
            <PressLinksSection 
              userId={profile.user_id}
              isOwnProfile={false}
              onRefresh={fetchData}
            />
          </div>

          {/* Awards */}
          <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm mb-6">
            <h3 className="font-semibold mb-4">Awards</h3>
            <AwardsSection 
              userId={profile.user_id}
              isOwnProfile={false}
              onRefresh={fetchData}
            />
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
              <ReviewsSection 
                reviews={reviews}
                isOwnProfile={false}
                profileUserId={profile.user_id}
                onRefresh={fetchData}
              />
            </div>
          )}
        </div>
      </div>

      {/* Message Dialog */}
      <DirectMessageDialog
        open={isMessageDialogOpen}
        onOpenChange={setIsMessageDialogOpen}
        recipientId={profile.user_id}
        recipientName={profile.full_name}
        recipientAvatar={profile.avatar_url}
      />

      {/* Start Project Dialog - works for matched or connected users */}
      {(isMatched || connectionStatus === 'connected') && (
        <StartProjectFromMatchDialog
          open={isStartProjectOpen}
          onOpenChange={setIsStartProjectOpen}
          matchedUser={{
            id: profile.user_id,
            name: profile.full_name,
            role: profile.role,
            avatar: profile.avatar_url
          }}
          matchId={matchId || undefined}
        />
      )}

      {/* Media Player Modal */}
      {selectedMedia && (
        <MediaPlayerModal
          isOpen={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
          item={selectedMedia}
        />
      )}

      {/* Claim Profile Dialog */}
      {isUnclaimedProfile && (
        <ClaimProfileDialog
          open={showClaimDialog}
          onOpenChange={setShowClaimDialog}
          profile={profile}
          onSuccess={() => navigate('/onboarding')}
        />
      )}

      {/* Share Unclaimed Profile Dialog */}
      {isUnclaimedProfile && (
        <ShareUnclaimedProfileDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          profileName={profile.full_name}
          profileUrl={`https://www.thrivein.io/profile/${profile.user_id}`}
        />
      )}
    </>
  );
};

export default ViewProfile;
