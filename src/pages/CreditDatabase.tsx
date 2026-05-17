import { useState, useEffect, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UnifiedSearchDropdown } from "@/components/search/UnifiedSearchDropdown";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Film, ShieldCheck, ExternalLink, Loader2, Users,
  Database, MapPin, Building2, CalendarDays, Sparkles,
  UserPlus, Globe, Music, Palette, Theater, Camera, Tv,
  TrendingUp, Play, Star, List, Fingerprint,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveCreditThumbnail } from "@/lib/thumbnailExtractor";
import { CreditCoverPlaceholder } from "@/components/profile/CreditCoverPlaceholder";
import { PassportAnchorStrip } from "@/components/passport/PassportAnchorStrip";
import { UnifiedWorkHistory } from "@/components/profile/UnifiedWorkHistory";

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
  url?: string | null;
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
  const [view, setView] = useState<"mine" | "explore">("mine");

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const isSearchActive = search.trim().length >= 2;
  const isResultsSearching = debouncedSearch.length >= 3;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const handleSearchSubmit = useCallback((q: string) => {
    setSearch(q);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id || null;
      setCurrentUserId(uid);
      // Logged-out visitors land on Explore (no "My Work" to show)
      if (!uid) setView("explore");
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
            .select('id, project_name, role, year, verification_status, platform, location, client_brand, user_id, endorsement_count, thumbnail_url, primary_media_url, credit_category, url')
            .order('created_at', { ascending: false })
            .limit(40),
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
    if (!isResultsSearching) {
      setIcdbProjects([]);
      setAiSuggestions([]);
      setUserCredits([]);
      setWebResults([]);
      setProjectCount(0);
      return;
    }
    setLoading(true);
    try {
      // Run edge function search and direct DB credit search in parallel
      const edgeFnPromise = supabase.functions.invoke('search-icdb', {
        body: { query: debouncedSearch, category: category !== 'all' ? category : undefined },
      }).then(({ data, error }) => {
        if (error) {
          console.warn('search-icdb edge function failed, using DB fallback:', error);
          return null;
        }
        return data;
      }).catch((err) => {
        console.warn('search-icdb invocation error:', err);
        return null;
      });

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

      const [edgeData, creditResult] = await Promise.all([edgeFnPromise, creditQuery]);

      // Set edge function results (projects, AI suggestions, web results)
      setIcdbProjects(edgeData?.projects || []);
      setAiSuggestions(edgeData?.suggestions || []);
      setWebResults(edgeData?.webResults || []);
      setProjectCount(edgeData?.total || 0);

      // Set direct DB credit results
      const creditData = creditResult.data || [];
      const userIds = [...new Set(creditData.map(c => c.user_id))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, role')
          .in('user_id', userIds);
        const map = new Map<string, ProfileInfo>();
        profileData?.forEach((p: any) => map.set(p.user_id, p));
        setProfiles(map);
      }
      setUserCredits(creditData as UserCredit[]);
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, isResultsSearching]);

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
        <title>ThriveCredits — Your Creative Passport | ThriveIN</title>
        <meta name="description" content="Your creative passport. Search and claim your work across film, music, events, fashion, art, and all creative industries." />
      </Helmet>

      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto px-4 pt-3">
          <PassportAnchorStrip />

          {/* My Work / Explore toggle */}
          <div className="flex items-center gap-1.5 mt-3 p-1 rounded-full bg-muted/50 w-fit mx-auto">
            <button
              onClick={() => setView("mine")}
              disabled={!currentUserId}
              className={cn(
                "px-4 h-8 rounded-full text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                view === "mine"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              My Work
            </button>
            <button
              onClick={() => setView("explore")}
              className={cn(
                "px-4 h-8 rounded-full text-[12px] font-semibold transition-colors",
                view === "explore"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Explore
            </button>
          </div>
        </div>

        {view === "mine" && currentUserId ? (
          <div className="container mx-auto px-4 py-6 max-w-3xl">
            <UnifiedWorkHistory
              userId={currentUserId}
              isOwnProfile={true}
              onRefresh={() => { /* local refresh handled inside */ }}
            />
          </div>
        ) : (
        <>
        {/* Search Hero */}
        <div className={cn(
          "transition-all duration-300",
          isSearchActive
            ? "border-b bg-background py-4"
            : "bg-gradient-to-b from-primary/8 to-background py-8 md:py-12"
        )}>
          <div className="container mx-auto px-4">
            {!isSearchActive && (
              <div className="mb-5 max-w-xl mx-auto">
                <p className="brand-eyebrow mb-2 flex items-center gap-2">
                  <Fingerprint className="h-3 w-3 text-energy" />
                  Creative Passport
                </p>
                <h1 className="text-3xl md:text-4xl font-black tracking-[-0.03em] leading-[1.05] mb-2">
                  ThriveCredits
                </h1>
                <p className="text-sm text-muted-foreground">
                  Search any project, person, or production across the global creative industry.
                </p>
              </div>
            )}

            <UnifiedSearchDropdown
              variant={isSearchActive ? "inline" : "hero"}
              value={search}
              onValueChange={setSearch}
              onQuerySubmit={handleSearchSubmit}
              placeholder="Search projects, creators, labels, studios..."
              className="max-w-xl mx-auto"
            />

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
          ) : isResultsSearching ? (
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
              {/* Visual credits with art — hero spotlight */}
              {recentCredits.length > 0 && (() => {
                const withArt = recentCredits.filter(c => resolveCreditThumbnail(c.thumbnail_url, c.primary_media_url, c.url));
                const withoutArt = recentCredits.filter(c => !resolveCreditThumbnail(c.thumbnail_url, c.primary_media_url, c.url));
                return (
                  <>
                    {withArt.length > 0 && (
                      <section>
                        <div className="flex items-center gap-2 mb-3">
                          <Star className="h-4 w-4 text-primary" />
                          <h2 className="text-sm font-semibold">Featured Work</h2>
                          <span className="text-[11px] text-muted-foreground">Visual credits</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {withArt.slice(0, 20).map(credit => (
                            <CreditPosterCard
                              key={credit.id}
                              credit={credit}
                              onClick={() => navigate(`/profile/${credit.user_id}`)}
                              formatType={formatType}
                              getCategoryForType={getCategoryForType}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {withoutArt.length > 0 && (
                      <section>
                        <div className="flex items-center gap-2 mb-3">
                          <List className="h-4 w-4 text-muted-foreground" />
                          <h2 className="text-xs font-medium text-muted-foreground">Other Credits ({withoutArt.length})</h2>
                        </div>
                        <div className="space-y-0.5 max-h-[200px] overflow-y-auto rounded-lg border border-border/40 bg-muted/20 p-1">
                          {withoutArt.slice(0, 10).map(credit => (
                            <CompactCreditRow
                              key={credit.id}
                              credit={credit}
                              onClick={() => navigate(`/profile/${credit.user_id}`)}
                              formatType={formatType}
                              getCategoryForType={getCategoryForType}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                );
              })()}

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
        </>
        )}
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
          <CreditCoverPlaceholder
            category={type}
            title={title}
            role={formatType(type)}
            height="absolute inset-0"
          />
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
  const resolvedThumb = resolveCreditThumbnail(credit.thumbnail_url, credit.primary_media_url, credit.url);

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl overflow-hidden transition-all hover:ring-2 hover:ring-primary/40 hover:scale-[1.02] focus:outline-none"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl">
        {resolvedThumb ? (
          <img
            src={resolvedThumb}
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
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <h3 className="text-white/80 font-black text-base leading-tight tracking-tight line-clamp-3 uppercase">
                {credit.project_name}
              </h3>
              <p className="text-white/40 text-[9px] font-semibold uppercase tracking-[0.2em] mt-2">
                {credit.role}
              </p>
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {credit.verification_status === 'verified' && (
          <div className="absolute top-2 left-2">
            <span className="bg-green-500/90 text-white rounded-full p-0.5">
              <ShieldCheck className="h-2.5 w-2.5" />
            </span>
          </div>
        )}

        {credit.primary_media_url && (
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white rounded-full p-1">
            <Play className="h-2.5 w-2.5" />
          </div>
        )}

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

/* ─── Compact Credit Row (for credits without art) ─── */

function CompactCreditRow({
  credit, onClick, formatType, getCategoryForType,
}: {
  credit: UserCredit;
  onClick: () => void;
  formatType: (t: string) => string;
  getCategoryForType: (t: string) => string;
}) {
  const cat = getCategoryForType(credit.credit_category || 'digital');
  const CatIcon = CATEGORY_ICONS[cat] || Globe;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left group"
    >
      <div className={cn(
        "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br",
        CATEGORY_GRADIENTS[cat] || CATEGORY_GRADIENTS.digital
      )}>
        <CatIcon className="h-4 w-4 text-white/70" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {credit.project_name}
        </h4>
        <p className="text-[11px] text-muted-foreground truncate">
          {credit.role}
          {credit.year ? ` · ${credit.year}` : ''}
          {credit.platform ? ` · ${credit.platform}` : ''}
        </p>
      </div>
      {credit.verification_status === 'verified' && (
        <ShieldCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
      )}
    </button>
  );
}

export default CreditDatabase;
