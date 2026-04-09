import { useState, useEffect, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Film, ShieldCheck, ExternalLink, Loader2, Users,
  Database, MapPin, Building2, CalendarDays, Sparkles,
  UserPlus, Globe, Music, Palette, Theater, Camera, Tv,
  TrendingUp, X, Play, Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_GROUPS = [
  { label: "All", value: "all", icon: Globe },
  { label: "Film & TV", value: "film_tv", icon: Film },
  { label: "Music & Audio", value: "music", icon: Music },
  { label: "Performing Arts", value: "performing", icon: Theater },
  { label: "Events", value: "events", icon: Camera },
  { label: "Digital", value: "digital", icon: Tv },
  { label: "Fashion", value: "fashion", icon: Sparkles },
  { label: "Art & Design", value: "art", icon: Palette },
];

const TYPE_TO_CATEGORY: Record<string, string> = {
  film: "film_tv", movie: "film_tv", tv: "film_tv", short_film: "film_tv", documentary: "film_tv", music_video: "film_tv", web_series: "film_tv",
  album: "music", single: "music", ep: "music", podcast: "music", audiobook: "music",
  theatre: "performing", musical: "performing", dance: "performing", comedy: "performing", spoken_word: "performing", opera: "performing",
  live_event: "events", concert: "events", festival: "events", carnival: "events", pageant: "events", fashion_show: "events", awards_show: "events", exhibition: "events", conference: "events",
  youtube_series: "digital", ugc_campaign: "digital", livestream: "digital", online_course: "digital", workshop: "digital",
  commercial: "commercial", brand_campaign: "commercial", corporate: "commercial", voiceover: "commercial",
  art_exhibition: "art", mural: "art", photography: "art", animation: "art",
  fashion_collection: "fashion", editorial_shoot: "fashion", runway: "fashion", beauty_campaign: "fashion",
};

// Cinematic placeholder gradients by category
const CATEGORY_GRADIENTS: Record<string, string> = {
  film_tv: "from-slate-900 via-blue-950 to-slate-800",
  music: "from-purple-950 via-violet-900 to-indigo-950",
  performing: "from-rose-950 via-red-900 to-pink-950",
  events: "from-amber-950 via-orange-900 to-yellow-950",
  digital: "from-cyan-950 via-teal-900 to-emerald-950",
  commercial: "from-zinc-900 via-neutral-800 to-stone-900",
  art: "from-fuchsia-950 via-pink-900 to-purple-950",
  fashion: "from-rose-900 via-pink-800 to-fuchsia-900",
};

const CATEGORY_ICONS: Record<string, typeof Film> = {
  film_tv: Film, music: Music, performing: Theater, events: Camera,
  digital: Tv, commercial: Building2, art: Palette, fashion: Sparkles,
};

interface ICDBProject {
  id: string;
  title: string;
  type: string;
  category: string | null;
  year: number | null;
  description: string | null;
  platform: string | null;
  location: string | null;
  client_brand: string | null;
  cover_image_url: string | null;
  external_url: string | null;
  metadata: any;
  contributor_count: number;
  is_verified: boolean;
  icdb_project_roles?: {
    id: string;
    role_title: string;
    person_name: string | null;
    is_claimed: boolean;
    claimed_by: string | null;
  }[];
}

interface AISuggestion {
  title: string;
  type: string;
  year?: number;
  description: string;
  platform?: string;
  location?: string;
  client_brand?: string;
  contributors?: { name: string; role: string }[];
  _source: 'ai_suggestion';
}

interface UserCredit {
  id: string;
  project_name: string;
  role: string;
  year: number | null;
  verification_status: string | null;
  platform: string | null;
  location: string | null;
  client_brand: string | null;
  user_id: string;
  endorsement_count: number;
  thumbnail_url: string | null;
  primary_media_url: string | null;
  credit_category: string | null;
}

interface ProfileInfo {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

interface WebResult {
  title: string;
  description?: string;
  url?: string;
  image_url?: string;
  platform?: string;
  year?: number;
  type?: string;
}

const CreditDatabase = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [icdbProjects, setIcdbProjects] = useState<ICDBProject[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [userCredits, setUserCredits] = useState<UserCredit[]>([]);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileInfo>>(new Map());
  const [loading, setLoading] = useState(false);
  const [projectCount, setProjectCount] = useState(0);
  const [claimDialog, setClaimDialog] = useState<{ project: ICDBProject; role: ICDBProject['icdb_project_roles'] extends (infer T)[] | undefined ? T : never } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [trendingProjects, setTrendingProjects] = useState<ICDBProject[]>([]);
  const [recentCredits, setRecentCredits] = useState<UserCredit[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();

  const isSearching = debouncedSearch.length >= 2;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id || null);
    });
  }, []);

  // Fetch trending on mount
  useEffect(() => {
    (async () => {
      try {
        const [projectsRes, creditsRes] = await Promise.all([
          supabase
            .from('icdb_projects')
            .select('*, icdb_project_roles(id, role_title, person_name, is_claimed, claimed_by)')
            .order('created_at', { ascending: false })
            .limit(12),
          supabase
            .from('credits')
            .select('id, project_name, role, year, verification_status, platform, location, client_brand, user_id, endorsement_count, thumbnail_url, primary_media_url, credit_category')
            .not('thumbnail_url', 'is', null)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);
        setTrendingProjects((projectsRes.data || []) as ICDBProject[]);
        setRecentCredits((creditsRes.data || []) as UserCredit[]);
      } catch (e) {
        console.error(e);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  // Search
  const fetchResults = useCallback(async () => {
    if (!isSearching) {
      setIcdbProjects([]);
      setAiSuggestions([]);
      setUserCredits([]);
      setWebResults([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-icdb', {
        body: { query: debouncedSearch, category: category !== 'all' ? category : undefined },
      });
      if (error) throw error;
      setIcdbProjects(data?.projects || []);
      setAiSuggestions(data?.suggestions || []);
      setWebResults(data?.webResults || []);
      setProjectCount(data?.total || 0);

      let creditQuery = supabase
        .from('credits')
        .select('id, project_name, role, year, verification_status, platform, location, client_brand, user_id, endorsement_count, thumbnail_url, primary_media_url, credit_category')
        .or(`project_name.ilike.%${debouncedSearch}%,role.ilike.%${debouncedSearch}%,client_brand.ilike.%${debouncedSearch}%`)
        .order('year', { ascending: false, nullsFirst: false })
        .limit(20);

      if (category !== 'all') {
        const types = Object.entries(TYPE_TO_CATEGORY).filter(([, cat]) => cat === category).map(([type]) => type);
        if (types.length > 0) {
          creditQuery = creditQuery.or(`project_type.in.(${types.join(',')}),credit_category.in.(${types.join(',')})`);
        }
      }

      const { data: creditData } = await creditQuery;
      const userIds = [...new Set((creditData || []).map(c => c.user_id))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, role')
          .in('user_id', userIds);
        const map = new Map<string, ProfileInfo>();
        profileData?.forEach((p: any) => map.set(p.user_id, p));
        setProfiles(map);
      }
      setUserCredits((creditData || []) as UserCredit[]);
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, isSearching]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleClaim = async () => {
    if (!claimDialog || !currentUserId) return;
    setClaiming(true);
    try {
      const { error } = await supabase
        .from('icdb_project_roles')
        .update({ claimed_by: currentUserId, is_claimed: true })
        .eq('id', claimDialog.role.id);
      if (error) throw error;

      await supabase.from('credits').insert({
        user_id: currentUserId,
        project_name: claimDialog.project.title,
        role: claimDialog.role.role_title,
        year: claimDialog.project.year,
        platform: claimDialog.project.platform,
        location: claimDialog.project.location,
        client_brand: claimDialog.project.client_brand,
        project_type: claimDialog.project.type,
        verification_status: 'verified',
        url: claimDialog.project.external_url,
      });

      toast.success('Credit claimed! It now appears on your profile.');
      setClaimDialog(null);
      fetchResults();
    } catch (err) {
      console.error('Claim error:', err);
      toast.error('Failed to claim credit');
    } finally {
      setClaiming(false);
    }
  };

  const formatType = (type: string) =>
    type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const getCategoryForType = (type: string) => TYPE_TO_CATEGORY[type] || 'digital';

  const hasResults = icdbProjects.length > 0 || aiSuggestions.length > 0 || userCredits.length > 0 || webResults.length > 0;

  return (
    <>
      <Helmet>
        <title>ThriveCredits™ — The Global Creative Record | ThriveIN</title>
        <meta name="description" content="The definitive database of creative work. Search projects across film, music, events, fashion, art, and all creative industries." />
      </Helmet>

      <div className="min-h-screen bg-background pb-20">
        {/* Search Hero */}
        <div className={cn(
          "transition-all duration-300",
          isSearching
            ? "border-b bg-background py-4"
            : "bg-gradient-to-b from-primary/8 to-background py-8 md:py-12"
        )}>
          <div className="container mx-auto px-4">
            {!isSearching && (
              <div className="text-center mb-5">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
                  ThriveCredits™
                </h1>
                <p className="text-sm text-muted-foreground">
                  The global creative record — search any project, person, or production
                </p>
              </div>
            )}

            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
              <Input
                placeholder="Search projects, creators, labels, studios..."
                className={cn(
                  "pl-10 pr-10 border-border/60 bg-card shadow-sm",
                  isSearching ? "h-10" : "h-12 text-base"
                )}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar mt-3 justify-center">
              {CATEGORY_GROUPS.map(g => {
                const Icon = g.icon;
                const isActive = category === g.value;
                return (
                  <button
                    key={g.value}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium shrink-0 transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    )}
                    onClick={() => setCategory(g.value)}
                  >
                    <Icon className="h-3 w-3" />
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Searching the creative record...</p>
            </div>
          ) : isSearching ? (
            hasResults ? (
              <div className="py-4 space-y-6">
                {/* Projects — poster grid */}
                {(icdbProjects.length > 0 || aiSuggestions.length > 0) && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">Projects</h2>
                      <span className="text-[11px] text-muted-foreground">({icdbProjects.length + aiSuggestions.length})</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {icdbProjects.map(project => (
                        <PosterCard
                          key={project.id}
                          title={project.title}
                          type={project.type}
                          year={project.year}
                          imageUrl={project.cover_image_url}
                          isVerified={project.is_verified}
                          roleCount={project.icdb_project_roles?.length || 0}
                          claimedCount={project.icdb_project_roles?.filter(r => r.is_claimed).length || 0}
                          clientBrand={project.client_brand}
                          onClick={() => navigate(`/credits/project/${project.id}`)}
                          formatType={formatType}
                          getCategoryForType={getCategoryForType}
                        />
                      ))}
                      {aiSuggestions.map((s, i) => (
                        <PosterCard
                          key={`ai-${i}`}
                          title={s.title}
                          type={s.type}
                          year={s.year}
                          isAI
                          clientBrand={s.client_brand}
                          formatType={formatType}
                          getCategoryForType={getCategoryForType}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Creators */}
                {userCredits.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">Creators</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {userCredits.map(credit => {
                        const profile = profiles.get(credit.user_id);
                        return (
                          <CreditPosterCard
                            key={credit.id}
                            credit={credit}
                            profile={profile}
                            onClick={() => navigate(`/profile/${credit.user_id}`)}
                            formatType={formatType}
                            getCategoryForType={getCategoryForType}
                          />
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Web discovered */}
                {webResults.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">Discovered on the Web</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {webResults.map((result, i) => (
                        <PosterCard
                          key={`web-${i}`}
                          title={result.title}
                          type={result.type || 'project'}
                          year={result.year}
                          imageUrl={result.image_url}
                          platform={result.platform}
                          onClick={() => result.url && window.open(result.url, '_blank')}
                          formatType={formatType}
                          getCategoryForType={getCategoryForType}
                          isExternal
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <h3 className="text-base font-semibold mb-1">No results for "{debouncedSearch}"</h3>
                <p className="text-sm text-muted-foreground">Try different keywords or browse by category</p>
              </div>
            )
          ) : (
            /* Browse mode */
            <div className="py-5 space-y-8">
              {/* Visual credits with art */}
              {recentCredits.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Featured Work</h2>
                  </div>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {recentCredits.slice(0, 12).map(credit => (
                      <FeaturedCreditCard
                        key={credit.id}
                        credit={credit}
                        onClick={() => navigate(`/profile/${credit.user_id}`)}
                        getCategoryForType={getCategoryForType}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Recently added projects */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">Recently Added</h2>
                </div>
                {initialLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : trendingProjects.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {trendingProjects.map(project => (
                      <PosterCard
                        key={project.id}
                        title={project.title}
                        type={project.type}
                        year={project.year}
                        imageUrl={project.cover_image_url}
                        isVerified={project.is_verified}
                        roleCount={project.icdb_project_roles?.length || 0}
                        claimedCount={project.icdb_project_roles?.filter(r => r.is_claimed).length || 0}
                        clientBrand={project.client_brand}
                        onClick={() => navigate(`/credits/project/${project.id}`)}
                        formatType={formatType}
                        getCategoryForType={getCategoryForType}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Database className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Start searching to discover creative projects</p>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Claim Dialog */}
      <Dialog open={!!claimDialog} onOpenChange={() => setClaimDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim This Credit</DialogTitle>
            <DialogDescription>
              Confirm that you are <strong>{claimDialog?.role?.person_name}</strong> and worked
              on <strong>{claimDialog?.project?.title}</strong> as <strong>{claimDialog?.role?.role_title}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Project</span>
              <span className="font-medium">{claimDialog?.project?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium">{claimDialog?.role?.role_title}</span>
            </div>
            {claimDialog?.project?.year && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Year</span>
                <span>{claimDialog.project.year}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimDialog(null)}>Cancel</Button>
            <Button onClick={handleClaim} disabled={claiming}>
              {claiming ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
              Claim Credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

/* ─── Poster Card (2:3 aspect ratio with cinematic placeholder) ─── */

function PosterCard({
  title, type, year, imageUrl, isVerified, roleCount, claimedCount,
  clientBrand, isAI, isExternal, platform, onClick, formatType, getCategoryForType,
}: {
  title: string;
  type: string;
  year?: number | null;
  imageUrl?: string | null;
  isVerified?: boolean;
  roleCount?: number;
  claimedCount?: number;
  clientBrand?: string | null;
  isAI?: boolean;
  isExternal?: boolean;
  platform?: string;
  onClick?: () => void;
  formatType: (t: string) => string;
  getCategoryForType: (t: string) => string;
}) {
  const cat = getCategoryForType(type);
  const gradient = CATEGORY_GRADIENTS[cat] || CATEGORY_GRADIENTS.digital;
  const CatIcon = CATEGORY_ICONS[cat] || Globe;

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl overflow-hidden transition-all hover:ring-2 hover:ring-primary/40 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      {/* Poster artwork */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)}>
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <CatIcon className="h-20 w-20" />
            </div>
            {/* Title overlay for placeholder */}
            <div className="absolute inset-0 flex items-end p-3">
              <p className="text-white/60 text-[10px] font-medium uppercase tracking-wider line-clamp-2">
                {formatType(type)}
              </p>
            </div>
          </div>
        )}

        {/* Gradient overlay on bottom */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {isVerified && (
            <span className="bg-blue-500/90 text-white rounded-full p-0.5">
              <ShieldCheck className="h-2.5 w-2.5" />
            </span>
          )}
          {isAI && (
            <span className="bg-primary/90 text-primary-foreground rounded-full px-1.5 py-0.5 text-[8px] font-semibold flex items-center gap-0.5">
              <Sparkles className="h-2 w-2" /> AI
            </span>
          )}
          {isExternal && (
            <span className="bg-white/20 backdrop-blur-sm text-white rounded-full p-0.5">
              <ExternalLink className="h-2.5 w-2.5" />
            </span>
          )}
        </div>

        {/* Role count */}
        {roleCount != null && roleCount > 0 && (
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white rounded-full px-1.5 py-0.5 text-[9px] flex items-center gap-0.5">
            <Users className="h-2.5 w-2.5" />
            {claimedCount}/{roleCount}
          </div>
        )}

        {/* Bottom text overlay */}
        <div className="absolute bottom-0 inset-x-0 p-2.5">
          <h3 className="text-white font-semibold text-xs leading-tight line-clamp-2 mb-0.5 drop-shadow-md">
            {title}
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-white/15 text-white/90 border-0 text-[9px] h-4 font-normal backdrop-blur-sm">
              {formatType(type)}
            </Badge>
            {year && <span className="text-white/70 text-[10px]">{year}</span>}
            {platform && <span className="text-white/60 text-[9px]">{platform}</span>}
          </div>
          {clientBrand && (
            <p className="text-white/50 text-[9px] mt-0.5 flex items-center gap-0.5 truncate">
              <Building2 className="h-2 w-2" /> {clientBrand}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── Credit Poster Card (creator work with thumbnail) ─── */

function CreditPosterCard({
  credit, profile, onClick, formatType, getCategoryForType,
}: {
  credit: UserCredit;
  profile?: ProfileInfo;
  onClick: () => void;
  formatType: (t: string) => string;
  getCategoryForType: (t: string) => string;
}) {
  const cat = getCategoryForType(credit.credit_category || 'digital');
  const gradient = CATEGORY_GRADIENTS[cat] || CATEGORY_GRADIENTS.digital;
  const CatIcon = CATEGORY_ICONS[cat] || Globe;

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl overflow-hidden transition-all hover:ring-2 hover:ring-primary/40 hover:scale-[1.02] focus:outline-none"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl">
        {credit.thumbnail_url ? (
          <img
            src={credit.thumbnail_url}
            alt={credit.project_name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)}>
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <CatIcon className="h-20 w-20" />
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Verified badge */}
        {credit.verification_status === 'verified' && (
          <div className="absolute top-2 left-2">
            <span className="bg-green-500/90 text-white rounded-full p-0.5">
              <ShieldCheck className="h-2.5 w-2.5" />
            </span>
          </div>
        )}

        {/* Has media indicator */}
        {credit.primary_media_url && (
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white rounded-full p-1">
            <Play className="h-2.5 w-2.5" />
          </div>
        )}

        {/* Bottom text */}
        <div className="absolute bottom-0 inset-x-0 p-2.5">
          <h3 className="text-white font-semibold text-xs leading-tight line-clamp-2 mb-0.5 drop-shadow-md">
            {credit.project_name}
          </h3>
          <p className="text-white/70 text-[10px] truncate">{credit.role}</p>
          {profile && (
            <div className="flex items-center gap-1 mt-1">
              <Avatar className="h-4 w-4 border border-white/30">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback className="text-[6px] bg-white/20 text-white">
                  {profile.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-white/60 text-[9px] truncate">{profile.full_name}</span>
            </div>
          )}
          {credit.year && <span className="text-white/50 text-[9px]">{credit.year}</span>}
        </div>
      </div>
    </button>
  );
}

/* ─── Featured Credit Card (horizontal scroll, Netflix-style) ─── */

function FeaturedCreditCard({
  credit, onClick, getCategoryForType,
}: {
  credit: UserCredit;
  onClick: () => void;
  getCategoryForType: (t: string) => string;
}) {
  const cat = getCategoryForType(credit.credit_category || 'digital');
  const gradient = CATEGORY_GRADIENTS[cat] || CATEGORY_GRADIENTS.digital;
  const CatIcon = CATEGORY_ICONS[cat] || Globe;

  return (
    <button
      onClick={onClick}
      className="shrink-0 w-[130px] text-left group"
    >
      <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden mb-1.5 transition-all group-hover:ring-2 group-hover:ring-primary/40 group-hover:scale-[1.02]">
        {credit.thumbnail_url ? (
          <img
            src={credit.thumbnail_url}
            alt={credit.project_name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)}>
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <CatIcon className="h-14 w-14" />
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
        {credit.primary_media_url && (
          <div className="absolute top-1.5 right-1.5 bg-black/50 backdrop-blur-sm text-white rounded-full p-0.5">
            <Play className="h-2 w-2" />
          </div>
        )}
        {credit.verification_status === 'verified' && (
          <div className="absolute top-1.5 left-1.5">
            <span className="bg-green-500/90 text-white rounded-full p-0.5">
              <ShieldCheck className="h-2 w-2" />
            </span>
          </div>
        )}
      </div>
      <h4 className="text-[11px] font-medium leading-tight line-clamp-2 text-foreground">
        {credit.project_name}
      </h4>
      <p className="text-[10px] text-muted-foreground truncate">{credit.role}</p>
    </button>
  );
}

export default CreditDatabase;
