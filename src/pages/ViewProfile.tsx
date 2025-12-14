import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  ArrowLeft, 
  MessageCircle, 
  Briefcase,
  CheckCircle2,
  Sparkles,
  Star,
  Award,
  ExternalLink,
  Play,
  Image as ImageIcon,
  Music,
  Calendar,
  Rocket
} from "lucide-react";
import { DirectMessageDialog } from "@/components/DirectMessageDialog";
import { StartProjectFromMatchDialog } from "@/components/project/StartProjectFromMatchDialog";
import { MediaPlayerModal } from "@/components/profile/MediaPlayerModal";
import { getMediaThumbnail } from "@/lib/mediaUtils";
import { SEO } from "@/components/SEO";
import CreatorEPK from "./CreatorEPK";

interface Profile {
  user_id: string;
  full_name: string;
  role: string;
  bio: string;
  location: string;
  avatar_url: string;
  verification_tier?: string;
  achievement_badges?: string[];
  professional_skills?: any;
  passion_skills?: any;
  collab_intent?: string;
  rate_range?: string;
  average_rating?: number;
  total_reviews?: number;
}

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  media_url: string;
  media_type: string;
  thumbnail_url?: string;
}

const ViewProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMatched, setIsMatched] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isStartProjectOpen, setIsStartProjectOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<PortfolioItem | null>(null);
  
  const isFromMatch = searchParams.get('from') === 'match';

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

  useEffect(() => {
    if (!userId || !user) return;
    
    const fetchProfileData = async () => {
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
          .order('display_order', { ascending: true })
          .limit(12);

        setPortfolioItems(portfolioData || []);

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
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [userId, user]);

  const getMediaIcon = (type: string) => {
    if (type?.includes('video')) return <Play className="h-4 w-4" />;
    if (type?.includes('audio')) return <Music className="h-4 w-4" />;
    return <ImageIcon className="h-4 w-4" />;
  };

  const getVerificationBadge = () => {
    if (!profile?.verification_tier || profile.verification_tier === 'unverified') return null;
    
    const tierConfig = {
      'profile': { color: 'bg-blue-500', label: 'Verified' },
      'industry': { color: 'bg-purple-500', label: 'Industry Verified' },
      'elite': { color: 'bg-amber-500', label: 'Elite Verified' }
    };
    
    const config = tierConfig[profile.verification_tier as keyof typeof tierConfig];
    if (!config) return null;
    
    return (
      <Badge className={`${config.color} text-white gap-1`}>
        <CheckCircle2 className="h-3 w-3" />
        {config.label}
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
            onClick={() => navigate(-1)}
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

              {/* Action Buttons */}
              {isMatched && (
                <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-6 pt-6 border-t">
                  <Button onClick={() => setIsMessageDialogOpen(true)} className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </Button>
                  <Button variant="outline" onClick={() => setIsStartProjectOpen(true)} className="gap-2">
                    <Rocket className="h-4 w-4" />
                    Start Project
                  </Button>
                </div>
              )}

              {!isMatched && (
                <div className="mt-6 pt-6 border-t text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Match with {profile.full_name} to connect and collaborate
                  </p>
                  <Button onClick={() => navigate('/circle')} variant="outline">
                    Go to Circle
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          {(profile.professional_skills?.length > 0 || profile.passion_skills?.length > 0) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile.professional_skills?.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Professional</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.professional_skills.map((skill: any, i: number) => (
                          <Badge key={i} variant="secondary">
                            {typeof skill === 'string' ? skill : skill.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.passion_skills?.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Interests</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.passion_skills.map((skill: any, i: number) => (
                          <Badge key={i} variant="outline">
                            {typeof skill === 'string' ? skill : skill.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Portfolio */}
          {portfolioItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {portfolioItems.map((item) => (
                    <div
                      key={item.id}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => setSelectedMedia(item)}
                    >
                      <img
                        src={getMediaThumbnail(item)}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-white text-center p-2">
                          <div className="mb-1">{getMediaIcon(item.media_type)}</div>
                          <p className="text-xs font-medium line-clamp-2">{item.title}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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

      {/* Start Project Dialog */}
      {matchId && (
        <StartProjectFromMatchDialog
          open={isStartProjectOpen}
          onOpenChange={setIsStartProjectOpen}
          matchedUser={{
            id: profile.user_id,
            name: profile.full_name,
            role: profile.role,
            avatar: profile.avatar_url
          }}
          matchId={matchId}
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
    </>
  );
};

export default ViewProfile;
