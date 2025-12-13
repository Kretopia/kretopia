import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MediaPlayerModal } from "@/components/profile/MediaPlayerModal";
import { getMediaThumbnail } from "@/lib/mediaUtils";
import {
  MapPin, 
  Globe, 
  Calendar, 
  Mail, 
  ExternalLink,
  Play,
  Music,
  Image as ImageIcon,
  Star,
  Award,
  CheckCircle2,
  Sparkles,
  Instagram,
  Twitter,
  Linkedin,
  Youtube
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { cn } from "@/lib/utils";

interface Profile {
  full_name: string;
  role: string;
  bio: string;
  location: string;
  avatar_url: string;
  user_id: string;
  website?: string;
  calendly_url?: string;
  linkedin_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  spotify_url?: string;
  behance_url?: string;
  imdb_url?: string;
  soundcloud_url?: string;
  average_rating?: number;
  total_reviews?: number;
  achievement_badges?: string[];
  verification_tier?: string;
  verification_status?: string;
  professional_skills?: any;
  passion_skills?: any;
  collab_intent?: string;
  rate_range?: string;
}

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  media_url: string;
  media_type: string;
  thumbnail_url?: string;
}

interface Credit {
  id: string;
  project_name: string;
  role: string;
  year?: number;
  platform?: string;
}

interface IndustryStat {
  id: string;
  title: string;
  value?: string;
  stat_type: string;
  issuer?: string;
}

const CreatorEPK = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [pressLinks, setPressLinks] = useState<any[]>([]);
  const [awards, setAwards] = useState<any[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [industryStats, setIndustryStats] = useState<IndustryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      if (!userId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        // Fetch from profiles table directly - RLS allows public read
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name, role, bio, location, avatar_url, website, calendly_url, linkedin_url, instagram_url, twitter_url, youtube_url, spotify_url, behance_url, imdb_url, soundcloud_url, average_rating, total_reviews, achievement_badges, verification_tier, verification_status, professional_skills, passion_skills, collab_intent, rate_range')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileError || !profileData) {
          console.error('Profile not found:', profileError);
          setNotFound(true);
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Fetch all data in parallel
        const [portfolioRes, pressRes, awardsRes, creditsRes, statsRes] = await Promise.all([
          // Portfolio items
          supabase
            .from('portfolio_items')
            .select('id, title, description, media_url, media_type, thumbnail_url')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(9),
          
          // Press links
          supabase
            .from('press_links')
            .select('id, title, publication, url, image_url')
            .eq('user_id', userId)
            .limit(4),
          
          // Awards
          supabase
            .from('awards')
            .select('id, title, organization, year')
            .eq('user_id', userId)
            .limit(4),
          
          // Credits (work history)
          supabase
            .from('credits')
            .select('id, project_name, role, year, platform')
            .eq('user_id', userId)
            .order('year', { ascending: false })
            .limit(6),
          
          // Industry stats
          supabase
            .from('industry_stats')
            .select('id, title, value, stat_type, issuer')
            .eq('user_id', userId)
            .limit(6)
        ]);

        setPortfolioItems(portfolioRes.data || []);
        setPressLinks(pressRes.data || []);
        setAwards(awardsRes.data || []);
        setCredits(creditsRes.data || []);
        setIndustryStats(statsRes.data || []);
        const { data: portfolio } = await supabase
          .from('portfolio_items')
          .select('id, title, description, media_url, media_type, thumbnail_url')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(6);

        setPortfolioItems(portfolio || []);

        // Fetch press links
        const { data: press } = await supabase
          .from('press_links')
          .select('id, title, publication, url, image_url')
          .eq('user_id', userId)
          .limit(4);

        setPressLinks(press || []);

        // Fetch awards
        const { data: awardsData } = await supabase
          .from('awards')
          .select('id, title, organization, year')
          .eq('user_id', userId)
          .limit(4);

        setAwards(awardsData || []);

      } catch (error) {
        console.error('Error fetching profile:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [userId]);

  const handleBookCall = () => {
    if (profile?.calendly_url) {
      window.open(profile.calendly_url, '_blank');
    }
  };

  const handleVisitWebsite = () => {
    if (profile?.website) {
      window.open(profile.website, '_blank');
    }
  };

  const socialLinks = [
    { url: profile?.instagram_url, icon: Instagram, label: 'Instagram' },
    { url: profile?.twitter_url, icon: Twitter, label: 'Twitter' },
    { url: profile?.linkedin_url, icon: Linkedin, label: 'LinkedIn' },
    { url: profile?.youtube_url, icon: Youtube, label: 'YouTube' },
    { url: profile?.spotify_url, icon: Music, label: 'Spotify' },
  ].filter(link => link.url);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Profile Not Found</h1>
          <p className="text-muted-foreground">This creator profile doesn't exist or is not public.</p>
          <Button onClick={() => navigate('/')} variant="default">
            Visit ThriveIN
          </Button>
        </div>
      </div>
    );
  }

  const getVerificationBadge = () => {
    if (profile.verification_tier === 'elite') {
      return { label: 'Elite Verified', color: 'bg-gradient-to-r from-amber-500 to-yellow-400' };
    }
    if (profile.verification_tier === 'industry') {
      return { label: 'Industry Verified', color: 'bg-gradient-to-r from-blue-500 to-cyan-400' };
    }
    if (profile.verification_status === 'verified') {
      return { label: 'Verified', color: 'bg-primary' };
    }
    return null;
  };

  const verificationBadge = getVerificationBadge();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <SEO 
        title={`${profile.full_name} | ${profile.role || 'Creator'}`}
        description={profile.bio || `Connect with ${profile.full_name} on ThriveIN`}
      />

      {/* Main Content - Mobile-first vertical layout */}
      <div className="max-w-lg mx-auto px-4 py-8 pb-32">
        
        {/* Profile Header */}
        <div className="text-center space-y-4 mb-8">
          {/* Avatar */}
          <div className="relative inline-block">
            <Avatar className="h-28 w-28 border-4 border-primary/20 shadow-xl">
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
              <AvatarFallback className="text-3xl font-bold bg-primary/10">
                {profile.full_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            {verificationBadge && (
              <div className={cn(
                "absolute -bottom-1 -right-1 p-1.5 rounded-full",
                verificationBadge.color
              )}>
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          {/* Name & Role */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{profile.full_name}</h1>
            <p className="text-primary font-medium">{profile.role || 'Creator'}</p>
            {profile.location && (
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" />
                {profile.location}
              </p>
            )}
          </div>

          {/* Verification Badge */}
          {verificationBadge && (
            <Badge className={cn("text-white border-0", verificationBadge.color)}>
              <Sparkles className="h-3 w-3 mr-1" />
              {verificationBadge.label}
            </Badge>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              {profile.bio}
            </p>
          )}

          {/* Social Links */}
          {socialLinks.length > 0 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors"
                  aria-label={link.label}
                >
                  <link.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3 mb-8">
          {profile.calendly_url && (
            <Button 
              onClick={handleBookCall}
              className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg"
              size="lg"
            >
              <Calendar className="h-5 w-5 mr-2" />
              Book a Call
            </Button>
          )}
          
          {profile.website && (
            <Button 
              onClick={handleVisitWebsite}
              variant="outline"
              className="w-full h-12 text-base border-2"
              size="lg"
            >
              <Globe className="h-5 w-5 mr-2" />
              Visit Website
            </Button>
          )}
        </div>

        {/* Professional Skills */}
        {profile.professional_skills && Array.isArray(profile.professional_skills) && profile.professional_skills.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Professional Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.professional_skills.slice(0, 10).map((skill: any, index: number) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">
                  {typeof skill === 'string' ? skill : skill?.skill || skill?.name || 'Skill'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Passion Skills / Other Expertise */}
        {profile.passion_skills && Array.isArray(profile.passion_skills) && profile.passion_skills.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Also Skilled In
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.passion_skills.slice(0, 8).map((skill: any, index: number) => (
                <Badge key={index} variant="outline" className="px-3 py-1">
                  {typeof skill === 'string' ? skill : skill?.skill || skill?.name || 'Skill'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Collaboration Info */}
        {(profile.collab_intent || profile.rate_range) && (
          <div className="mb-6 p-4 rounded-lg bg-muted/50">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Availability
            </h3>
            <div className="space-y-2 text-sm">
              {profile.collab_intent && (
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground">Looking for:</span>
                  <span className="font-medium capitalize">{profile.collab_intent.replace(/_/g, ' ')}</span>
                </p>
              )}
              {profile.rate_range && (
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground">Rate:</span>
                  <span className="font-medium">{profile.rate_range}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Work History / Credits */}
        {credits.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Work History
            </h3>
            <div className="space-y-2">
              {credits.map((credit) => (
                <div
                  key={credit.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{credit.project_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {credit.role}
                      {credit.platform && ` • ${credit.platform}`}
                    </p>
                  </div>
                  {credit.year && (
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{credit.year}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Industry Stats / Certifications */}
        {industryStats.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Credentials & Stats
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {industryStats.map((stat) => (
                <div
                  key={stat.id}
                  className="p-3 rounded-lg bg-muted/50 text-center"
                >
                  {stat.value && (
                    <p className="text-lg font-bold text-primary">{stat.value}</p>
                  )}
                  <p className="text-xs font-medium truncate">{stat.title}</p>
                  {stat.issuer && (
                    <p className="text-xs text-muted-foreground truncate">{stat.issuer}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievement Badges */}
        {profile.achievement_badges && profile.achievement_badges.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Achievements
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.achievement_badges.slice(0, 6).map((badge: string, index: number) => (
                <Badge key={index} variant="outline" className="px-3 py-1 border-amber-500/50 text-amber-600 dark:text-amber-400">
                  <Award className="h-3 w-3 mr-1" />
                  {badge}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio Preview */}
        {portfolioItems.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Portfolio
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {portfolioItems.map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="aspect-square rounded-lg overflow-hidden bg-muted relative group cursor-pointer hover:opacity-90 transition-opacity"
                >
                  {item.media_type === 'video' ? (
                    <>
                      <img 
                        src={getMediaThumbnail(item)}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </>
                  ) : item.media_type === 'audio' ? (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 group-hover:from-primary/30 transition-colors">
                      <Music className="h-8 w-8 text-primary/60" />
                    </div>
                  ) : (
                    <img 
                      src={getMediaThumbnail(item)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Media Player Modal */}
        <MediaPlayerModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          item={selectedItem ? {
            title: selectedItem.title,
            description: selectedItem.description,
            media_type: selectedItem.media_type,
            media_url: selectedItem.media_url,
            thumbnail_url: selectedItem.thumbnail_url
          } : null}
        />

        {/* Press & Awards Combined */}
        {(pressLinks.length > 0 || awards.length > 0) && (
          <div className="mb-8 space-y-4">
            {pressLinks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Featured In
                </h3>
                <div className="space-y-2">
                  {pressLinks.slice(0, 3).map((press) => (
                    <a
                      key={press.id}
                      href={press.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{press.title}</p>
                        <p className="text-xs text-muted-foreground">{press.publication}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {awards.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Awards
                </h3>
                <div className="space-y-2">
                  {awards.slice(0, 3).map((award) => (
                    <div
                      key={award.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10"
                    >
                      <Award className="h-4 w-4 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{award.title}</p>
                        <p className="text-xs text-muted-foreground">{award.organization} • {award.year}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rating */}
        {profile.average_rating && profile.average_rating > 0 && (
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              <span className="font-semibold">{profile.average_rating.toFixed(1)}</span>
              <span className="text-muted-foreground text-sm">
                ({profile.total_reviews || 0} reviews)
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-4">
        <div className="max-w-lg mx-auto space-y-3">
          {/* Connect CTA */}
          <Button 
            onClick={() => navigate('/auth')}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            <Mail className="h-5 w-5 mr-2" />
            Sign Up to Connect
          </Button>
          
          {/* Secondary Links */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <button 
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              About ThriveIN
            </button>
            <span className="text-muted-foreground">•</span>
            <button 
              onClick={() => navigate('/auth')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Log In
            </button>
          </div>

          {/* Branding */}
          <div className="text-center pt-1">
            <p className="text-xs text-muted-foreground">
              Powered by <span className="font-semibold text-primary">ThriveIN</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorEPK;
