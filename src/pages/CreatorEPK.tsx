import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MediaPlayerModal } from "@/components/profile/MediaPlayerModal";
import { ClaimProfileDialog } from "@/components/profile/ClaimProfileDialog";
import { EPKShareToolbar } from "@/components/epk/EPKShareToolbar";
import { EPKReviews } from "@/components/epk/EPKReviews";
import { EPKFooterCTA } from "@/components/epk/EPKFooterCTA";
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
  Youtube,
  UserCheck,
  ArrowRight,
  Package,
  Download,
  Database
} from "lucide-react";
import { Fingerprint } from "lucide-react";
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
  is_claimed?: boolean;
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
  project_name?: string;
  title?: string;
  role: string;
  year?: number;
  platform?: string;
  source?: string;
  thumbnail_url?: string;
  primary_media_url?: string;
  credit_category?: string;
  isVerified?: boolean;
  verificationTier?: 'icdb' | 'ai' | 'peer' | 'payment' | 'manual';
}

interface IndustryStat {
  id: string;
  title: string;
  value?: string;
  stat_type: string;
  issuer?: string;
}

// Decode HTML entities from scraped data
const decodeHtmlEntities = (text: string): string => {
  if (!text) return text;
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
};

const CreatorEPK = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [pressLinks, setPressLinks] = useState<any[]>([]);
  const [awards, setAwards] = useState<any[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [industryStats, setIndustryStats] = useState<IndustryStat[]>([]);
  const [digitalProducts, setDigitalProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Check if current user is the profile owner
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

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
          .select('user_id, full_name, role, bio, location, avatar_url, website, calendly_url, linkedin_url, instagram_url, twitter_url, youtube_url, spotify_url, behance_url, imdb_url, soundcloud_url, average_rating, total_reviews, achievement_badges, verification_tier, verification_status, professional_skills, passion_skills, collab_intent, rate_range, is_claimed, icdb_creator_id')
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
        const [portfolioRes, pressRes, awardsRes, creditsRes, statsRes, productsRes, icdbRes, reviewsRes] = await Promise.all([
          // Portfolio items (from credits with source=portfolio)
          supabase
            .from('credits')
            .select('id, project_name, description, primary_media_url, media_type, thumbnail_url')
            .eq('user_id', userId)
            .eq('source', 'portfolio')
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
          
          // All Credits (work history) — include thumbnail + media
          supabase
            .from('credits')
            .select('id, project_name, role, year, platform, verification_status, ai_confidence, endorsement_count, source, thumbnail_url, primary_media_url, credit_category')
            .eq('user_id', userId)
            .order('year', { ascending: false })
            .limit(12),
          
          // Industry stats
          supabase
            .from('industry_stats')
            .select('id, title, value, stat_type, issuer')
            .eq('user_id', userId)
            .limit(6),
          
          // Digital products
          supabase
            .from('digital_products')
            .select('id, title, description, price, currency, product_type, preview_urls, download_count, tags')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(6),

          // ICDB claimed roles
          supabase
            .from('icdb_project_roles')
            .select('id, role_title, person_name, is_claimed, project_id')
            .eq('claimed_by', userId)
            .eq('is_claimed', true),

          // Reviews
          supabase
            .from('company_reviews')
            .select('id, rating, review_text, created_at, reviewer_id')
            .eq('company_id', userId)
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        setPortfolioItems((portfolioRes.data || []).map((c: any) => ({ id: c.id, title: c.project_name, description: c.description, media_url: c.primary_media_url, media_type: c.media_type, thumbnail_url: c.thumbnail_url })));
        setPressLinks(pressRes.data || []);
        setAwards(awardsRes.data || []);
        setIndustryStats(statsRes.data || []);
        setDigitalProducts(productsRes.data || []);
        setReviews((reviewsRes.data || []).map((r: any) => ({
          ...r,
          reviewer_name: 'Verified Client',
        })));
        
        // Process credits with verification tiers
        const manualCredits = (creditsRes.data || []).map((c: any) => {
          let tier: Credit['verificationTier'] = 'manual';
          if (c.verification_status === 'verified' && c.endorsement_count >= 2) tier = 'peer';
          else if (c.ai_confidence && c.ai_confidence >= 0.7) tier = 'ai';
          else if (c.source && c.source !== 'manual' && c.source !== 'portfolio') tier = 'ai';
          return {
            ...c,
            isVerified: tier !== 'manual',
            verificationTier: tier,
          };
        });

        // ThriveCredits claimed credits
        const icdbClaimed = (icdbRes.data || []).map((c: any) => ({
          id: c.id,
          project_name: c.person_name || 'Claimed Credit',
          role: c.role_title,
          isVerified: true,
          verificationTier: 'icdb' as const,
        }));
        
        // Combine and sort by year
        const allCredits = [...icdbClaimed, ...manualCredits]
          .sort((a, b) => (b.year || 0) - (a.year || 0))
          .slice(0, 12);
        
        setCredits(allCredits);

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
      return { label: 'Industry Verified', color: 'bg-primary' };
    }
    if (profile.verification_status === 'verified') {
      return { label: 'Verified', color: 'bg-primary' };
    }
    return null;
  };

  const verificationBadge = getVerificationBadge();
  const isOwner = currentUserId === userId;
  const allSkills = [
    ...(Array.isArray(profile.professional_skills) 
      ? profile.professional_skills.map((s: any) => typeof s === 'string' ? s : s?.skill || s?.name).filter(Boolean)
      : []),
    ...(Array.isArray(profile.passion_skills)
      ? profile.passion_skills.map((s: any) => typeof s === 'string' ? s : s?.skill || s?.name).filter(Boolean)
      : [])
  ];

  const canonicalUrl = `https://thrivein.io/epk/${userId}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <SEO 
        title={`${profile.full_name} - ${profile.role || 'Creator'} | ThriveIN`}
        description={profile.bio || `${profile.full_name} is a ${profile.role || 'creative professional'}${profile.location ? ` based in ${profile.location}` : ''}. View portfolio, work history, and connect on ThriveIN.`}
        type="profile"
        image={profile.avatar_url || undefined}
        url={canonicalUrl}
        profile={{
          name: profile.full_name,
          role: profile.role,
          location: profile.location,
          avatar: profile.avatar_url,
          bio: profile.bio,
          skills: allSkills.slice(0, 20),
          socialLinks: {
            instagram: profile.instagram_url,
            twitter: profile.twitter_url,
            linkedin: profile.linkedin_url,
            youtube: profile.youtube_url,
            website: profile.website
          }
        }}
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

          {/* ICDB Creator ID */}
          {(profile as any).icdb_creator_id && (
            <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-muted/50 border">
              <Fingerprint className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-mono font-semibold text-primary">{(profile as any).icdb_creator_id}</span>
              <Badge variant="outline" className="text-[9px] h-4 border-primary/20">ThriveCredits™</Badge>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              {profile.bio}
            </p>
          )}

          {/* Social Links — only for authenticated users */}
          {currentUserId && socialLinks.length > 0 && (
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

        {/* Owner Share Toolbar */}
        {isOwner && (
          <div ref={shareRef}>
            <EPKShareToolbar
              profileName={profile.full_name}
              profileRole={profile.role || 'Creator'}
              userId={userId || ''}
            />
          </div>
        )}

        {/* Unclaimed Profile Banner */}
        {profile.is_claimed === false && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <Sparkles className="h-4 w-4" />
              <span className="font-semibold">Is this you?</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Claim this profile to unlock all features, connect with other creators, and manage your presence on ThriveIN.
            </p>
            <Button 
              onClick={() => setShowClaimDialog(true)}
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
            >
              <UserCheck className="h-4 w-4" />
              Claim This Profile
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Claim Profile Dialog */}
        {profile.is_claimed === false && (
          <ClaimProfileDialog
            open={showClaimDialog}
            onOpenChange={setShowClaimDialog}
            profile={profile}
            onSuccess={() => navigate('/onboarding')}
          />
        )}

        {/* CTA Buttons */}
        <div className="space-y-3 mb-8">
          {currentUserId && profile.calendly_url && (
            <Button 
              onClick={handleBookCall}
              className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg"
              size="lg"
            >
              <Calendar className="h-5 w-5 mr-2" />
              Book a Call
            </Button>
          )}
          
          {currentUserId && profile.website && (
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

        {/* ThriveCredits™ — Verified Work History */}
        {credits.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                ThriveCredits™
              </h3>
              <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                <Database className="h-3 w-3" />
                {credits.filter(c => c.isVerified).length} verified
              </Badge>
            </div>

            {/* Featured credits — horizontal Netflix-style scroll */}
            {credits.filter(c => c.isVerified).length > 0 && (
              <div className="mb-4">
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {credits.filter(c => c.isVerified).slice(0, 8).map((credit) => {
                    const tierConfig = {
                      icdb: { label: 'Verified', className: 'bg-primary/10 text-primary border-primary/30' },
                      peer: { label: 'Peer', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
                      ai: { label: 'AI', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
                      payment: { label: 'Paid', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
                      manual: { label: '', className: '' },
                    }[credit.verificationTier || 'manual'];

                    return (
                      <div key={credit.id} className="flex-shrink-0 w-[140px]">
                        <div className="rounded-lg overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 hover:border-primary/30 transition-all h-[180px] flex flex-col items-center justify-center gap-2 p-3 text-center">
                          <CheckCircle2 className="h-8 w-8 text-primary/40" />
                          <p className="text-xs font-semibold leading-tight line-clamp-2">{credit.project_name || credit.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate w-full">{credit.role}</p>
                          {tierConfig.label && (
                            <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1", tierConfig.className)}>
                              {tierConfig.label}
                            </Badge>
                          )}
                          {credit.year && (
                            <span className="text-[10px] text-muted-foreground">{credit.year}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Full credit list */}
            <div className="space-y-1.5">
              {credits.map((credit) => {
                const tierConfig = {
                  icdb: { label: 'Verified', className: 'bg-primary/10 text-primary border-primary/30' },
                  peer: { label: 'Peer', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
                  ai: { label: 'AI', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
                  payment: { label: 'Paid', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
                  manual: { label: '', className: '' },
                }[credit.verificationTier || 'manual'];

                return (
                  <div
                    key={credit.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg",
                      credit.isVerified
                        ? "bg-primary/5 border border-primary/10"
                        : "bg-muted/50"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{credit.project_name || credit.title}</p>
                        {credit.isVerified && tierConfig.label && (
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 gap-0.5", tierConfig.className)}>
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {tierConfig.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {credit.role}
                        {credit.platform && ` • ${credit.platform}`}
                      </p>
                    </div>
                    {credit.year && (
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{credit.year}</span>
                    )}
                  </div>
                );
              })}
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

        {/* Reviews */}
        <EPKReviews
          reviews={reviews}
          averageRating={profile.average_rating}
          totalReviews={profile.total_reviews}
        />

        {/* Digital Products & Services */}
        {digitalProducts.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Products & Services
            </h3>
            <div className="grid gap-3">
              {digitalProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 p-3">
                    {product.preview_urls?.[0] && (
                      <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                        <img 
                          src={product.preview_urls[0]} 
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {!product.preview_urls?.[0] && (
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm truncate">{product.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                        </div>
                        <span className="font-bold text-primary shrink-0">${product.price}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px]">{product.product_type}</Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Download className="h-2.5 w-2.5" />
                          {product.download_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground mt-3">
              Sign up to purchase products from this creator
            </p>
          </div>
        )}

      </div>

      {/* Fixed Footer */}
      <EPKFooterCTA
        isOwner={isOwner}
        isUnclaimed={profile.is_claimed === false}
        profileName={profile.full_name}
        onClaimClick={() => setShowClaimDialog(true)}
        onShareClick={() => shareRef.current?.scrollIntoView({ behavior: 'smooth' })}
      />
    </div>
  );
};

export default CreatorEPK;
