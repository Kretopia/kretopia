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
  Youtube, Headphones, Eye, Image as ImageIcon, Grid3X3, LayoutGrid,
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

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  media_url: string;
  thumbnail_url: string | null;
  category: string | null;
  featured: boolean;
  created_at: string;
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

// Poster placeholder gradients for credits without thumbnails
const POSTER_GRADIENTS = [
  "from-rose-900/80 via-rose-800/60 to-black",
  "from-blue-900/80 via-indigo-800/60 to-black",
  "from-amber-900/80 via-orange-800/60 to-black",
  "from-emerald-900/80 via-teal-800/60 to-black",
  "from-purple-900/80 via-violet-800/60 to-black",
  "from-cyan-900/80 via-sky-800/60 to-black",
  "from-pink-900/80 via-fuchsia-800/60 to-black",
  "from-slate-800/80 via-zinc-700/60 to-black",
];

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
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [showAllCredits, setShowAllCredits] = useState(false);
  const [showAllPortfolio, setShowAllPortfolio] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [endorsementCredit, setEndorsementCredit] = useState<any>(null);
  const [collaboratorProfiles, setCollaboratorProfiles] = useState<Map<string, CollaboratorProfile>>(new Map());
  const [activeMedia, setActiveMedia] = useState<ICDBCredit | null>(null);
  const [activePortfolioMedia, setActivePortfolioMedia] = useState<PortfolioItem | null>(null);
  const navigate = useNavigate();

  useEffect(() => { fetchData(); }, [userId]);

  const fetchData = async () => {
    try {
      const [manualRes, verifiedRes, portfolioRes] = await Promise.all([
        supabase.from('credits').select('*').eq('user_id', userId).order('year', { ascending: false }),
        supabase.from('verified_credits').select('*').eq('user_id', userId).order('year', { ascending: false, nullsFirst: false }),
        supabase.from('portfolio_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);

      // Credits — keep as credits (NOT merged with portfolio)
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

      const allCredits = [...verified, ...manual].sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return (b.year || 0) - (a.year || 0);
      });
      setCredits(allCredits);

      // Portfolio items — separate
      setPortfolioItems(portfolioRes.data || []);

      // Fetch collaborator profiles
      const allCollabIds = new Set<string>();
      allCredits.forEach(c => c.collaborator_user_ids?.forEach(id => allCollabIds.add(id)));
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

  const displayCredits = showAllCredits ? filteredCredits : filteredCredits.slice(0, 6);
  const displayPortfolio = showAllPortfolio ? portfolioItems : portfolioItems.slice(0, 9);
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
        <Badge variant="outline" className="text-[10px] gap-0.5 border-accent/40 text-accent-foreground bg-accent/10 h-5">
          <ShieldCheck className="h-2.5 w-2.5" />
          {credit.endorsement_count} vouched
        </Badge>
      );
    }
    return null;
  };

  const getCreditThumbnail = (credit: ICDBCredit): string | null => {
    if (credit.thumbnail_url) return credit.thumbnail_url;
    if (credit.url) {
      const mediaInfo = parseMediaUrl(credit.url);
      if (mediaInfo?.thumbnailUrl) return mediaInfo.thumbnailUrl;
    }
    return null;
  };

  const totalItems = credits.length + portfolioItems.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-semibold">Work</h3>
          <Badge variant="secondary" className="text-xs gap-1">
            {totalItems}
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
            Add Credit
          </Button>
        )}
      </div>

      {/* ── CREDITS SECTION — Poster-style cards ── */}
      {credits.length > 0 && (
        <div className="space-y-3">
          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {FILTER_OPTIONS.slice(0, 6).map(o => (
              <button
                key={o.value}
                onClick={() => setFilterType(o.value)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  filterType === o.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {o.label}
              </button>
            ))}
            {years.length > 1 && (
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-7 w-auto min-w-[80px] text-xs rounded-full border-0 bg-muted/60">
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

          {/* Poster Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {displayCredits.map((credit, idx) => {
              const Icon = TYPE_ICONS[credit.project_type || credit.credit_category || ''] || Film;
              const collabs = credit.collaborator_user_ids?.map(id => collaboratorProfiles.get(id)).filter(Boolean) as CollaboratorProfile[] | undefined;
              const thumbnail = getCreditThumbnail(credit);
              const gradientIdx = idx % POSTER_GRADIENTS.length;
              const platformIcon = getPlatformIcon(credit.platform);
              const mediaType = getMediaType(credit);

              return (
                <div
                  key={credit.id}
                  className="group relative rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
                  style={{ aspectRatio: "2/3" }}
                  onClick={() => {
                    if (credit.url) setActiveMedia(credit);
                  }}
                >
                  {/* Poster background */}
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={credit.project_name}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className={cn("absolute inset-0 bg-gradient-to-b", POSTER_GRADIENTS[gradientIdx])} />
                  )}

                  {/* Dark overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                  {/* Top badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
                    {getVerificationBadge(credit)}
                    {credit.platform && (
                      <Badge variant="secondary" className="text-[9px] gap-0.5 bg-black/50 text-white border-0 backdrop-blur-sm h-5 shrink-0">
                        {platformIcon}
                        {credit.platform}
                      </Badge>
                    )}
                  </div>

                  {/* Play button overlay for video/audio */}
                  {mediaType === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <Play className="h-6 w-6 text-foreground ml-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Type icon for no-thumbnail posters */}
                  {!thumbnail && (
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <Icon className="h-10 w-10 text-white/30" />
                    </div>
                  )}

                  {/* Bottom content */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 space-y-1">
                    <h4 className="font-bold text-white text-sm leading-tight line-clamp-2 drop-shadow-md">
                      {credit.project_name}
                    </h4>
                    <p className="text-white/80 text-[11px] font-medium truncate">
                      {credit.role}
                    </p>
                    <div className="flex items-center gap-1.5 text-white/60 text-[10px]">
                      {credit.year && <span>{credit.year}</span>}
                      {credit.client_brand && (
                        <>
                          <span>·</span>
                          <span className="truncate">{credit.client_brand}</span>
                        </>
                      )}
                    </div>

                    {/* Collaborator avatars */}
                    {collabs && collabs.length > 0 && (
                      <div className="flex items-center gap-1 pt-1">
                        <div className="flex -space-x-1.5">
                          {collabs.slice(0, 3).map(c => (
                            <Avatar
                              key={c.user_id}
                              className="h-5 w-5 border border-black/50"
                              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${c.user_id}`); }}
                            >
                              <AvatarImage src={c.avatar_url || ''} />
                              <AvatarFallback className="text-[7px] bg-muted">{c.full_name?.[0]}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <span className="text-white/50 text-[9px]">
                          +{collabs.length}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Owner actions (on hover) */}
                  {isOwnProfile && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      {credit.verification_status !== 'verified' && credit.source !== 'verified' && (
                        <Button
                          variant="secondary" size="icon"
                          className="h-7 w-7 bg-black/50 text-white border-0 backdrop-blur-sm hover:bg-black/70"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEndorsementCredit({
                              id: credit.id, project_name: credit.project_name,
                              role: credit.role, year: credit.year,
                            });
                          }}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {credit.source !== 'verified' && (
                        <Button
                          variant="secondary" size="icon"
                          className="h-7 w-7 bg-black/50 text-white border-0 backdrop-blur-sm hover:bg-destructive/80"
                          disabled={deletingId === credit.id}
                          onClick={(e) => { e.stopPropagation(); handleDelete(credit.id, credit.source); }}
                        >
                          {deletingId === credit.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredCredits.length > 6 && !showAllCredits && (
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setShowAllCredits(true)}>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show {filteredCredits.length - 6} more credits
            </Button>
          )}
        </div>
      )}

      {/* ── PORTFOLIO SECTION — Instagram-style grid ── */}
      {portfolioItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Portfolio</h3>
            <Badge variant="secondary" className="text-xs">{portfolioItems.length}</Badge>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
            {displayPortfolio.map((item) => {
              const thumbSrc = item.thumbnail_url || (item.media_type === 'image' ? item.media_url : null);
              const mediaInfo = item.media_url ? parseMediaUrl(item.media_url) : null;
              const finalThumb = thumbSrc || mediaInfo?.thumbnailUrl;
              const isVideo = item.media_type === 'video' || (mediaInfo && ['youtube', 'vimeo', 'tiktok'].includes(mediaInfo.platform));
              const isAudio = item.media_type === 'audio' || (mediaInfo && ['spotify', 'soundcloud'].includes(mediaInfo.platform));

              return (
                <div
                  key={item.id}
                  className="relative aspect-square bg-muted cursor-pointer group overflow-hidden"
                  onClick={() => setActivePortfolioMedia(item)}
                >
                  {finalThumb ? (
                    <img
                      src={finalThumb}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      {isVideo ? <Video className="h-8 w-8 text-muted-foreground/40" /> :
                       isAudio ? <Music className="h-8 w-8 text-muted-foreground/40" /> :
                       <ImageIcon className="h-8 w-8 text-muted-foreground/40" />}
                    </div>
                  )}

                  {/* Media type indicator */}
                  {isVideo && (
                    <div className="absolute top-1.5 right-1.5">
                      <Play className="h-4 w-4 text-white drop-shadow-md" />
                    </div>
                  )}
                  {isAudio && (
                    <div className="absolute top-1.5 right-1.5">
                      <Music className="h-4 w-4 text-white drop-shadow-md" />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <p className="text-white text-xs font-medium text-center px-2 opacity-0 group-hover:opacity-100 transition-opacity line-clamp-2">
                      {item.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {portfolioItems.length > 9 && !showAllPortfolio && (
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setShowAllPortfolio(true)}>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show {portfolioItems.length - 9} more
            </Button>
          )}
        </div>
      )}

      {/* Empty state — no credits AND no portfolio */}
      {credits.length === 0 && portfolioItems.length === 0 && (
        <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
          <Film className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <h3 className="mb-1 text-base font-semibold">No work added yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isOwnProfile
              ? "Add your credits and portfolio to showcase your creative work"
              : "No work to display"}
          </p>
          {isOwnProfile && (
            <Button size="sm" onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Your First Credit
            </Button>
          )}
        </div>
      )}

      {/* Media Player Modal — Credits */}
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

      {/* Media Player Modal — Portfolio */}
      {activePortfolioMedia && (
        <MediaPlayerModal
          isOpen={!!activePortfolioMedia}
          onClose={() => setActivePortfolioMedia(null)}
          item={{
            title: activePortfolioMedia.title,
            description: activePortfolioMedia.description,
            media_type: activePortfolioMedia.media_type,
            media_url: activePortfolioMedia.media_url,
            thumbnail_url: activePortfolioMedia.thumbnail_url,
          }}
        />
      )}

      {/* Form Dialog */}
      <ICDBCreditForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => { fetchData(); onRefresh?.(); }}
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
