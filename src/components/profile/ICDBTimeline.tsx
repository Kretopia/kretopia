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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ICDBCreditForm } from "./ICDBCreditForm";
import { CreditEndorsementDialog } from "./CreditEndorsementDialog";

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
  const navigate = useNavigate();

  useEffect(() => { fetchCredits(); }, [userId]);

  const fetchCredits = async () => {
    try {
      // Fetch manual credits + verified credits in parallel
      const [manualRes, verifiedRes] = await Promise.all([
        supabase.from('credits').select('*').eq('user_id', userId).order('year', { ascending: false }),
        supabase.from('verified_credits').select('*').eq('user_id', userId).order('year', { ascending: false, nullsFirst: false }),
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

      const all = [...verified, ...manual].sort((a, b) => (b.year || 0) - (a.year || 0));
      setCredits(all);

      // Fetch collaborator profiles
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

  // Filters
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

  // Group by year for timeline
  const groupedByYear = useMemo(() => {
    const groups: Record<number, ICDBCredit[]> = {};
    displayCredits.forEach(c => {
      const y = c.year || 0;
      if (!groups[y]) groups[y] = [];
      groups[y].push(c);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, items]) => ({ year: Number(year), items }));
  }, [displayCredits]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getVerificationColor = (status: string | null, aiConfidence: number | null) => {
    if (status === 'verified') return 'border-l-green-500';
    if ((aiConfidence || 0) >= 0.7) return 'border-l-blue-500';
    if (status === 'pending') return 'border-l-amber-500';
    return 'border-l-muted-foreground/30';
  };

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
    return (
      <Badge variant="outline" className="text-[10px] text-muted-foreground h-5">
        Unverified
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-semibold">Credits</h3>
          <Badge variant="secondary" className="text-xs gap-1">
            <Film className="h-3 w-3" />
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
            Add Credit
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
          <h3 className="mb-1 text-base font-semibold">No credits yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isOwnProfile
              ? "Add your creative work to build your professional timeline"
              : "No credits to display"}
          </p>
          {isOwnProfile && (
            <Button size="sm" onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Your First Credit
            </Button>
          )}
        </div>
      ) : (
        /* Timeline */
        <div className="space-y-6">
          {groupedByYear.map(({ year, items }) => (
            <div key={year}>
              {/* Year label */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-primary">{year || 'Undated'}</span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground">{items.length} credit{items.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Credit cards */}
              <div className="space-y-2 pl-2">
                {items.map(credit => {
                  const Icon = TYPE_ICONS[credit.project_type || credit.credit_category || ''] || Film;
                  const collabs = credit.collaborator_user_ids?.map(id => collaboratorProfiles.get(id)).filter(Boolean) as CollaboratorProfile[] | undefined;

                  return (
                    <div
                      key={credit.id}
                      className={cn(
                        "flex gap-3 p-3 rounded-lg border-l-[3px] transition-all",
                        getVerificationColor(credit.verification_status, credit.ai_confidence),
                        "bg-card hover:bg-muted/30"
                      )}
                    >
                      {/* Icon */}
                      <div className="shrink-0">
                        {credit.thumbnail_url ? (
                          <img src={credit.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-medium text-sm truncate">{credit.project_name}</h4>
                          {getVerificationBadge(credit)}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {credit.role}
                          {credit.platform && <span> · {credit.platform}</span>}
                        </p>

                        {credit.description && (
                          <p className="text-xs text-muted-foreground/80 line-clamp-2">{credit.description}</p>
                        )}

                        {/* Meta row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {credit.location && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" /> {credit.location}
                            </span>
                          )}
                          {credit.client_brand && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Building2 className="h-2.5 w-2.5" /> {credit.client_brand}
                            </span>
                          )}
                        </div>

                        {/* Collaborators */}
                        {collabs && collabs.length > 0 && (
                          <div className="flex items-center gap-1 pt-0.5">
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
                      </div>

                      {/* Actions */}
                      {isOwnProfile && (
                        <div className="flex flex-col gap-1 shrink-0">
                          {credit.url && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                              <a href={credit.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          )}
                          {credit.verification_status !== 'verified' && credit.source !== 'verified' && (
                            <Button
                              variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary"
                              onClick={() => setEndorsementCredit({
                                id: credit.id, project_name: credit.project_name,
                                role: credit.role, year: credit.year,
                              })}
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
                  );
                })}
              </div>
            </div>
          ))}

          {/* Show more */}
          {filteredCredits.length > 8 && !showAll && (
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setShowAll(true)}>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show {filteredCredits.length - 8} more credits
            </Button>
          )}
        </div>
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
