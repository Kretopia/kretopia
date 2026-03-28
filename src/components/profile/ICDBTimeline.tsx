import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Film, Tv, Music, Disc3, Video, Mic2, CalendarDays, Sparkles, Crown,
  Shirt, Megaphone, Briefcase, ShieldCheck, ExternalLink, Loader2,
  Plus, Trash2, Play, UserPlus, Filter, MapPin, Building2, ChevronDown,
  Youtube, Headphones, Eye, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ICDBCreditForm } from "./ICDBCreditForm";
import { CreditEndorsementDialog } from "./CreditEndorsementDialog";
import { parseMediaUrl } from "@/lib/mediaUtils";
import { MediaPlayerModal } from "./MediaPlayerModal";

interface ICDBCredit {
  id: string;
  project_name: string;
  role: string;
  year: number | null;
  project_type: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  platform: string | null;
  url: string | null;
  client_brand: string | null;
  thumbnail_url: string | null;
  verification_status: string | null;
  endorsement_count: number;
  collaborator_user_ids: string[] | null;
  ai_confidence: number | null;
  credit_category: string | null;
  is_featured: boolean | null;
  source: 'manual' | 'project' | 'verified';
}

interface CollaboratorProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

const TYPE_ICONS: Record<string, any> = {
  film: Film, movie: Film, short_film: Film, documentary: Film, tv: Tv,
  album: Disc3, single: Music, ep: Music, music_video: Video, podcast: Mic2,
  theatre: Film, musical: Film, dance: Film, comedy: Film, opera: Film,
  live_event: CalendarDays, concert: Music, festival: CalendarDays,
  carnival: Sparkles, pageant: Crown, fashion_show: Shirt, awards_show: Crown,
  exhibition: Sparkles, conference: Briefcase,
  youtube_series: Video, ugc_campaign: Video, livestream: Video,
  commercial: Megaphone, brand_campaign: Megaphone, corporate: Briefcase,
  voiceover: Mic2, talent_management: Briefcase, booking: Briefcase,
  label_release: Disc3, publishing: Briefcase, curation: Sparkles,
  art_exhibition: Sparkles, photography: Film, animation: Video,
  fashion_collection: Shirt, editorial_shoot: Film, runway: Shirt,
  styling: Shirt, beauty_campaign: Megaphone, mural: Sparkles,
  graphic_design: Sparkles, online_course: Briefcase, workshop: Briefcase,
};

const FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "film_tv", label: "Film & TV" },
  { value: "music", label: "Music" },
  { value: "events", label: "Events" },
  { value: "performing", label: "Performing Arts" },
  { value: "digital", label: "Content & Digital" },
  { value: "commercial", label: "Commercial" },
  { value: "fashion", label: "Fashion & Beauty" },
  { value: "art", label: "Art & Design" },
  { value: "business", label: "Business" },
];

const TYPE_TO_CATEGORY: Record<string, string> = {
  film: "film_tv", movie: "film_tv", tv: "film_tv", short_film: "film_tv", documentary: "film_tv", music_video: "film_tv", web_series: "film_tv",
  album: "music", single: "music", ep: "music", podcast: "music", audiobook: "music",
  theatre: "performing", musical: "performing", dance: "performing", comedy: "performing", spoken_word: "performing", opera: "performing",
  live_event: "events", concert: "events", festival: "events", carnival: "events", pageant: "events", fashion_show: "events", awards_show: "events", exhibition: "events", conference: "events",
  youtube_series: "digital", ugc_campaign: "digital", livestream: "digital", online_course: "digital", workshop: "digital",
  commercial: "commercial", brand_campaign: "commercial", corporate: "commercial", voiceover: "commercial", influencer_campaign: "commercial",
  art_exhibition: "art", mural: "art", graphic_design: "art", photography: "art", animation: "art",
  fashion_collection: "fashion", editorial_shoot: "fashion", runway: "fashion", beauty_campaign: "fashion", styling: "fashion",
  talent_management: "business", booking: "business", label_release: "business", publishing: "business", curation: "business",
};

// Detect if a credit has playable/viewable media
const getMediaType = (credit: ICDBCredit): 'video' | 'audio' | 'image' | 'link' | null => {
  if (!credit.url) return null;
  const mediaInfo = parseMediaUrl(credit.url);
  if (mediaInfo) {
    if (['youtube', 'vimeo', 'tiktok', 'instagram'].includes(mediaInfo.platform)) return 'video';
    if (['spotify', 'soundcloud'].includes(mediaInfo.platform)) return 'audio';
  }
  if (credit.url.includes('behance.net')) return 'image';
  const type = credit.project_type || credit.credit_category || '';
  if (['album', 'single', 'ep', 'podcast'].includes(type)) return 'audio';
  if (['film', 'tv', 'short_film', 'documentary', 'music_video', 'youtube_series'].includes(type)) return 'video';
  if (['photography', 'art_exhibition', 'graphic_design', 'editorial_shoot'].includes(type)) return 'image';
  return credit.url ? 'link' : null;
};

const getPlatformIcon = (platform: string | null) => {
  if (!platform) return null;
  const p = platform.toLowerCase();
  if (p.includes('youtube')) return <Youtube className="h-3 w-3 text-red-500" />;
  if (p.includes('spotify')) return <Headphones className="h-3 w-3 text-green-500" />;
  if (p.includes('vimeo')) return <Video className="h-3 w-3 text-blue-400" />;
  if (p.includes('soundcloud')) return <Music className="h-3 w-3 text-orange-500" />;
  if (p.includes('behance')) return <ImageIcon className="h-3 w-3 text-blue-500" />;
  if (p.includes('imdb')) return <Film className="h-3 w-3 text-amber-500" />;
  if (p.includes('tiktok')) return <Video className="h-3 w-3 text-foreground" />;
  if (p.includes('netflix')) return <Tv className="h-3 w-3 text-red-600" />;
  return null;
};

// Helper to map portfolio media_type to a credit project_type
const mapMediaTypeToProjectType = (mediaType: string): string => {
  const map: Record<string, string> = {
    video: 'youtube_series', image: 'photography', audio: 'single',
    document: 'publishing', link: 'ugc_campaign',
  };
  return map[mediaType?.toLowerCase()] || 'ugc_campaign';
};

// Helper to detect platform from URL
const detectPlatformFromUrl = (url: string | null): string | null => {
  if (!url) return null;
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('vimeo.com')) return 'Vimeo';
  if (url.includes('spotify.com')) return 'Spotify';
  if (url.includes('soundcloud.com')) return 'SoundCloud';
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('behance.net')) return 'Behance';
  return null;
};

interface ICDBTimelineProps {
  userId: string;
  isOwnProfile: boolean;
  onRefresh?: () => void;
}

export function ICDBTimeline({ userId, isOwnProfile, onRefresh }: ICDBTimelineProps) {
  const [credits, setCredits] = useState<ICDBCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [endorsementCredit, setEndorsementCredit] = useState<any>(null);
  const [collaboratorProfiles, setCollaboratorProfiles] = useState<Map<string, CollaboratorProfile>>(new Map());
  const [activeMedia, setActiveMedia] = useState<ICDBCredit | null>(null);
  const navigate = useNavigate();

  useEffect(() => { fetchCredits(); }, [userId]);

  const fetchCredits = async () => {
    try {
      const [manualRes, verifiedRes, portfolioRes] = await Promise.all([
        supabase.from('credits').select('*').eq('user_id', userId).order('year', { ascending: false }),
        supabase.from('verified_credits').select('*').eq('user_id', userId).order('year', { ascending: false, nullsFirst: false }),
        supabase.from('portfolio_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);

      const manual: ICDBCredit[] = (manualRes.data || []).map((c: any) => ({
        ...c,
        endorsement_count: c.endorsement_count || 0,
        source: c.verification_status === 'verified' ? 'project' as const : 'manual' as const,
      }));

      const verified: ICDBCredit[] = (verifiedRes.data || []).map((c: any) => ({
        id: c.id,
        project_name: c.title,
        role: c.role,
        year: c.year,
        project_type: c.credit_type,
        description: null,
        start_date: null,
        end_date: null,
        location: null,
        platform: c.source,
        url: c.verification_url,
        client_brand: null,
        thumbnail_url: c.metadata?.posterUrl || c.metadata?.imageUrl || null,
        verification_status: 'verified',
        endorsement_count: 0,
        collaborator_user_ids: null,
        ai_confidence: 1,
        credit_category: c.credit_type,
        is_featured: false,
        source: 'verified' as const,
      }));

      // Convert portfolio items into ICDBCredit format so they appear in the unified Work view
      const portfolio: ICDBCredit[] = (portfolioRes.data || []).map((p: any) => ({
        id: `portfolio-${p.id}`,
        project_name: p.title,
        role: p.category || 'Portfolio',
        year: p.created_at ? new Date(p.created_at).getFullYear() : null,
        project_type: mapMediaTypeToProjectType(p.media_type),
        description: p.description,
        start_date: null,
        end_date: null,
        location: null,
        platform: detectPlatformFromUrl(p.media_url),
        url: p.media_url,
        client_brand: null,
        thumbnail_url: p.thumbnail_url,
        verification_status: null,
        endorsement_count: 0,
        collaborator_user_ids: null,
        ai_confidence: null,
        credit_category: p.category,
        is_featured: p.featured || false,
        source: 'manual' as const,
      }));

      const all = [...verified, ...manual, ...portfolio].sort((a, b) => {
        // Featured items first, then by year
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return (b.year || 0) - (a.year || 0);
      });
      setCredits(all);

      const allCollabIds = new Set<string>();
      all.forEach(c => c.collaborator_user_ids?.forEach(id => allCollabIds.add(id)));
      if (allCollabIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', [...allCollabIds]);
        const map = new Map<string, CollaboratorProfile>();
        profiles?.forEach(p => map.set(p.user_id, p));
        setCollaboratorProfiles(map);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, source: string) => {
    setDeletingId(id);
    try {
      const table = source === 'verified' ? 'verified_credits' : 'credits';
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      setCredits(prev => prev.filter(c => c.id !== id));
      toast.success("Credit removed");
      onRefresh?.();
    } catch { toast.error("Failed to remove"); }
    finally { setDeletingId(null); }
  };

  const filteredCredits = useMemo(() => {
    let result = credits;
    if (filterType !== "all") {
      result = result.filter(c => {
        const cat = TYPE_TO_CATEGORY[c.project_type || c.credit_category || ''] || '';
        return cat === filterType;
      });
    }
    if (filterYear !== "all") {
      result = result.filter(c => c.year?.toString() === filterYear);
    }
    return result;
  }, [credits, filterType, filterYear]);

  const displayCredits = showAll ? filteredCredits : filteredCredits.slice(0, 8);
  const verifiedCount = credits.filter(c => c.verification_status === 'verified').length;

  const years = useMemo(() => {
    const y = new Set(credits.map(c => c.year).filter(Boolean) as number[]);
    return [...y].sort((a, b) => b - a);
  }, [credits]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getVerificationBadge = (credit: ICDBCredit) => {
    if (credit.verification_status === 'verified') {
      return (
        <Badge variant="outline" className="text-[10px] gap-0.5 border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/5 h-5">
          <ShieldCheck className="h-2.5 w-2.5" />
          Verified
        </Badge>
      );
    }
    if ((credit.ai_confidence || 0) >= 0.7) {
      return (
        <Badge variant="outline" className="text-[10px] gap-0.5 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 h-5">
          <ShieldCheck className="h-2.5 w-2.5" />
          AI Verified
        </Badge>
      );
    }
    if (credit.endorsement_count > 0) {
      return (
        <Badge variant="outline" className="text-[10px] gap-0.5 border-primary/30 text-primary bg-primary/5 h-5">
          {credit.endorsement_count} endorsed
        </Badge>
      );
    }
    return null;
  };

  // Get thumbnail for a credit
  const getCreditThumbnail = (credit: ICDBCredit): string | null => {
    if (credit.thumbnail_url) return credit.thumbnail_url;
    if (credit.url) {
      const mediaInfo = parseMediaUrl(credit.url);
      if (mediaInfo?.thumbnailUrl) return mediaInfo.thumbnailUrl;
    }
    return null;
  };

  // Render inline embed for playable content
  const renderInlineEmbed = (credit: ICDBCredit) => {
    if (!credit.url) return null;
    const mediaInfo = parseMediaUrl(credit.url);
    if (!mediaInfo) return null;

    // Spotify — compact inline player
    if (mediaInfo.platform === 'spotify') {
      return (
        <div className="mt-2 rounded-lg overflow-hidden">
          <iframe
            src={`${mediaInfo.embedUrl}?theme=0`}
            width="100%"
            height="80"
            frameBorder="0"
            allow="encrypted-media"
            loading="lazy"
            className="rounded-lg"
          />
        </div>
      );
    }

    // SoundCloud — compact inline player
    if (mediaInfo.platform === 'soundcloud') {
      return (
        <div className="mt-2 rounded-lg overflow-hidden">
          <iframe
            src={mediaInfo.embedUrl}
            width="100%"
            height="80"
            frameBorder="0"
            loading="lazy"
            className="rounded-lg"
          />
        </div>
      );
    }

    // YouTube/Vimeo — thumbnail with play button (click to expand)
    if (['youtube', 'vimeo'].includes(mediaInfo.platform)) {
      const thumb = mediaInfo.thumbnailUrl;
      return (
        <div
          className="mt-2 relative rounded-lg overflow-hidden cursor-pointer group aspect-video bg-muted"
          onClick={() => setActiveMedia(credit)}
        >
          {thumb && (
            <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
          )}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-5 w-5 text-foreground ml-0.5" />
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-semibold">Work</h3>
          <Badge variant="secondary" className="text-xs gap-1">
            {credits.length}
          </Badge>
          {verifiedCount > 0 && (
            <Badge variant="secondary" className="text-xs gap-1 bg-green-500/10 text-green-600 dark:text-green-400">
              <ShieldCheck className="h-3 w-3" />
              {verifiedCount} verified
            </Badge>
          )}
        </div>
        {isOwnProfile && (
          <Button variant="outline" size="sm" onClick={() => setIsFormOpen(true)} className="h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Work
          </Button>
        )}
      </div>

      {/* Filters */}
      {credits.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {years.length > 1 && (
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="h-8 w-auto min-w-[90px] text-xs">
                <CalendarDays className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Years</SelectItem>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Empty state */}
      {credits.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
          <Film className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <h3 className="mb-1 text-base font-semibold">No work added yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isOwnProfile
              ? "Paste a link or search to claim your work — we'll fill in the details"
              : "No credits to display"}
          </p>
          {isOwnProfile && (
            <Button size="sm" onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Claim Your Work
            </Button>
          )}
        </div>
      ) : (
        /* Visual Card Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayCredits.map(credit => {
            const Icon = TYPE_ICONS[credit.project_type || credit.credit_category || ''] || Film;
            const collabs = credit.collaborator_user_ids?.map(id => collaboratorProfiles.get(id)).filter(Boolean) as CollaboratorProfile[] | undefined;
            const mediaType = getMediaType(credit);
            const thumbnail = getCreditThumbnail(credit);
            const hasEmbed = credit.url && parseMediaUrl(credit.url) && ['spotify', 'soundcloud', 'youtube', 'vimeo'].includes(parseMediaUrl(credit.url)?.platform || '');
            const platformIcon = getPlatformIcon(credit.platform);

            return (
              <div
                key={credit.id}
                className="rounded-xl border bg-card overflow-hidden hover:border-primary/30 transition-all group"
              >
                {/* Visual thumbnail header — only for video/image credits with thumbnails */}
                {thumbnail && mediaType !== 'audio' && (
                  <div
                    className="relative aspect-video bg-muted cursor-pointer"
                    onClick={() => credit.url && setActiveMedia(credit)}
                  >
                    <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                    {mediaType === 'video' && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="h-5 w-5 text-foreground ml-0.5" />
                        </div>
                      </div>
                    )}
                    {/* Verification badge overlay */}
                    <div className="absolute top-2 right-2">
                      {getVerificationBadge(credit)}
                    </div>
                    {/* Platform badge */}
                    {credit.platform && (
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-black/60 text-white border-0 backdrop-blur-sm">
                          {platformIcon}
                          {credit.platform}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      {!thumbnail && (
                        <div className="shrink-0 w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                          <Icon className="h-4.5 w-4.5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate">{credit.project_name}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                          <span className="font-medium text-foreground/80">{credit.role}</span>
                          {credit.year && <span>· {credit.year}</span>}
                        </p>
                      </div>
                    </div>
                    {/* Show verification badge inline when no thumbnail */}
                    {!thumbnail && getVerificationBadge(credit)}
                  </div>

                  {/* Platform + location row for non-thumbnail cards */}
                  {!thumbnail && credit.platform && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] gap-1 h-5">
                        {platformIcon}
                        {credit.platform}
                      </Badge>
                      {credit.location && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" /> {credit.location}
                        </span>
                      )}
                    </div>
                  )}

                  {credit.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{credit.description}</p>
                  )}

                  {/* Inline audio embed (Spotify/SoundCloud) */}
                  {hasEmbed && mediaType === 'audio' && renderInlineEmbed(credit)}

                  {/* Collaborators */}
                  {collabs && collabs.length > 0 && (
                    <div className="flex items-center gap-1 pt-1">
                      <div className="flex -space-x-1.5">
                        {collabs.slice(0, 4).map(c => (
                          <Avatar
                            key={c.user_id}
                            className="h-5 w-5 border border-background cursor-pointer"
                            onClick={() => navigate(`/profile/${c.user_id}`)}
                          >
                            <AvatarImage src={c.avatar_url || ''} />
                            <AvatarFallback className="text-[8px]">{c.full_name?.[0]}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {collabs.length} collaborator{collabs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Actions row */}
                  {isOwnProfile && (
                    <div className="flex items-center gap-1 pt-1 border-t border-border/50 mt-2">
                      {credit.url && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" asChild>
                          <a href={credit.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                            {mediaType === 'video' ? 'Watch' : mediaType === 'audio' ? 'Listen' : 'View'}
                          </a>
                        </Button>
                      )}
                      {credit.verification_status !== 'verified' && credit.source !== 'verified' && (
                        <Button
                          variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary"
                          onClick={() => setEndorsementCredit({
                            id: credit.id, project_name: credit.project_name,
                            role: credit.role, year: credit.year,
                          })}
                        >
                          <UserPlus className="h-3 w-3" /> Endorse
                        </Button>
                      )}
                      <div className="flex-1" />
                      {credit.source !== 'verified' && (
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                          disabled={deletingId === credit.id}
                          onClick={() => handleDelete(credit.id, credit.source)}
                        >
                          {deletingId === credit.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Show more */}
      {filteredCredits.length > 8 && !showAll && (
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setShowAll(true)}>
          <ChevronDown className="h-4 w-4 mr-1" />
          Show {filteredCredits.length - 8} more
        </Button>
      )}

      {/* Media Player Modal */}
      {activeMedia && (
        <MediaPlayerModal
          isOpen={!!activeMedia}
          onClose={() => setActiveMedia(null)}
          item={activeMedia.url ? {
            title: activeMedia.project_name,
            description: activeMedia.description,
            media_type: getMediaType(activeMedia) || 'video',
            media_url: activeMedia.url,
            thumbnail_url: activeMedia.thumbnail_url,
          } : null}
        />
      )}

      {/* Form Dialog */}
      <ICDBCreditForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => { fetchCredits(); onRefresh?.(); }}
        userId={userId}
      />

      {/* Endorsement Dialog */}
      {endorsementCredit && (
        <CreditEndorsementDialog
          open={!!endorsementCredit}
          onOpenChange={(open) => !open && setEndorsementCredit(null)}
          credit={endorsementCredit}
          userId={userId}
        />
      )}
    </div>
  );
}
