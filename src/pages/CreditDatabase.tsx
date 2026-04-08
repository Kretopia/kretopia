import { useState, useEffect, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Film, ShieldCheck, ExternalLink, Loader2, Users,
  Database, MapPin, Building2, CalendarDays, Sparkles,
  UserPlus, Globe, Music, Palette, Theater, Camera, Tv,
  TrendingUp, X,
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

  // Fetch trending/recent on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('icdb_projects')
          .select('*, icdb_project_roles(id, role_title, person_name, is_claimed, claimed_by)')
          .order('created_at', { ascending: false })
          .limit(12);
        setTrendingProjects((data || []) as ICDBProject[]);
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
      // Fetch projects via edge function
      const { data, error } = await supabase.functions.invoke('search-icdb', {
        body: { query: debouncedSearch, category: category !== 'all' ? category : undefined },
      });
      if (error) throw error;
      setIcdbProjects(data?.projects || []);
      setAiSuggestions(data?.suggestions || []);
      setWebResults(data?.webResults || []);
      setProjectCount(data?.total || 0);

      // Also fetch creator credits matching search
      let creditQuery = supabase
        .from('credits')
        .select('id, project_name, role, year, verification_status, platform, location, client_brand, user_id, endorsement_count')
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

            {/* Search bar */}
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
                autoFocus={false}
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

            {/* Category chips */}
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
          {/* Search results */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Searching the creative record...</p>
            </div>
          ) : isSearching ? (
            hasResults ? (
              <div className="py-4 space-y-6">
                {/* Projects section */}
                {(icdbProjects.length > 0 || aiSuggestions.length > 0) && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">Projects</h2>
                      <span className="text-[11px] text-muted-foreground">({icdbProjects.length + aiSuggestions.length})</span>
                    </div>
                    <div className="space-y-2">
                      {icdbProjects.map(project => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          currentUserId={currentUserId}
                          onClaim={(role) => setClaimDialog({ project, role })}
                          onNavigate={() => navigate(`/credits/project/${project.id}`)}
                          formatType={formatType}
                        />
                      ))}
                      {aiSuggestions.map((s, i) => (
                        <AISuggestionCard key={`ai-${i}`} suggestion={s} formatType={formatType} />
                      ))}
                    </div>
                  </section>
                )}

                {/* People section */}
                {userCredits.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">Creators</h2>
                      <span className="text-[11px] text-muted-foreground">({userCredits.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {userCredits.map(credit => {
                        const profile = profiles.get(credit.user_id);
                        return (
                          <Card
                            key={credit.id}
                            className="overflow-hidden cursor-pointer hover:bg-muted/30 transition-colors border-border/50"
                            onClick={() => navigate(`/profile/${credit.user_id}`)}
                          >
                            <CardContent className="p-3 flex items-center gap-3">
                              <Avatar className="h-9 w-9 shrink-0">
                                <AvatarImage src={profile?.avatar_url || ''} />
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {profile?.full_name?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{profile?.full_name || 'Unknown'}</p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {credit.role} on <span className="font-medium text-foreground/80">{credit.project_name}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {credit.year && <span className="text-[10px] text-muted-foreground">{credit.year}</span>}
                                {credit.verification_status === 'verified' && (
                                  <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Web discovered results */}
                {webResults.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">Discovered on the Web</h2>
                      <span className="text-[11px] text-muted-foreground">({webResults.length})</span>
                    </div>
                    <div className="space-y-2">
                      {webResults.map((result, i) => (
                        <Card
                          key={`web-${i}`}
                          className="overflow-hidden hover:bg-muted/30 transition-colors border-border/50 cursor-pointer"
                          onClick={() => result.url && window.open(result.url, '_blank')}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            {result.image_url ? (
                              <img
                                src={result.image_url}
                                alt={result.title}
                                className="h-12 w-12 rounded object-cover shrink-0 bg-muted"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                <Globe className="h-5 w-5 text-primary/60" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{result.title}</p>
                              {result.description && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2">{result.description}</p>
                              )}
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {result.platform && (
                                  <Badge variant="secondary" className="text-[9px] h-3.5 font-normal">{result.platform}</Badge>
                                )}
                                {result.year && <span className="text-[10px] text-muted-foreground">{result.year}</span>}
                              </div>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          </CardContent>
                        </Card>
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
            /* Browse mode — show trending */
            <div className="py-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Recently Added</h2>
              </div>
              {initialLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : trendingProjects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {trendingProjects.map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      currentUserId={currentUserId}
                      onClaim={(role) => setClaimDialog({ project, role })}
                      onNavigate={() => navigate(`/credits/project/${project.id}`)}
                      formatType={formatType}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Database className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Start searching to discover creative projects</p>
                </div>
              )}
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

/* ─── Sub-components ─── */

function ProjectCard({ project, currentUserId, onClaim, onNavigate, formatType, compact }: {
  project: ICDBProject;
  currentUserId: string | null;
  onClaim: (role: any) => void;
  onNavigate: () => void;
  formatType: (t: string) => string;
  compact?: boolean;
}) {
  const roleCount = project.icdb_project_roles?.length || 0;
  const claimedCount = project.icdb_project_roles?.filter(r => r.is_claimed).length || 0;

  return (
    <Card
      className="overflow-hidden hover:bg-muted/30 transition-colors cursor-pointer border-border/50"
      onClick={onNavigate}
    >
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className={cn("font-semibold truncate", compact ? "text-xs" : "text-sm")}>{project.title}</h3>
              {project.is_verified && (
                <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
              <Badge variant="secondary" className="text-[10px] h-4 font-normal">{formatType(project.type)}</Badge>
              {project.year && <span>{project.year}</span>}
              {project.client_brand && (
                <span className="flex items-center gap-0.5">
                  <Building2 className="h-2.5 w-2.5" /> {project.client_brand}
                </span>
              )}
              {project.location && !compact && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5" /> {project.location}
                </span>
              )}
            </div>
          </div>
          {roleCount > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{claimedCount}/{roleCount}</span>
            </div>
          )}
        </div>

        {!compact && project.description && (
          <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">{project.description}</p>
        )}

        {/* Inline roles — show up to 3 */}
        {!compact && project.icdb_project_roles && project.icdb_project_roles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {project.icdb_project_roles.slice(0, 3).map(role => (
              <button
                key={role.id}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-colors",
                  role.is_claimed
                    ? "bg-green-500/10 text-green-600"
                    : "bg-muted hover:bg-primary/10 hover:text-primary"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!role.is_claimed && currentUserId) onClaim(role);
                }}
              >
                {role.person_name || 'Unknown'} — {role.role_title}
                {role.is_claimed && <ShieldCheck className="h-2.5 w-2.5" />}
                {!role.is_claimed && currentUserId && <UserPlus className="h-2.5 w-2.5" />}
              </button>
            ))}
            {project.icdb_project_roles.length > 3 && (
              <span className="text-[10px] text-muted-foreground px-2 py-0.5">
                +{project.icdb_project_roles.length - 3} more
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AISuggestionCard({ suggestion, formatType }: { suggestion: AISuggestion; formatType: (t: string) => string }) {
  return (
    <Card className="overflow-hidden border-dashed border-primary/20 bg-primary/[0.02]">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-sm truncate">{suggestion.title}</h3>
          <Badge variant="outline" className="text-[9px] h-4 gap-0.5 border-primary/30 text-primary shrink-0">
            <Sparkles className="h-2 w-2" /> AI
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
          <Badge variant="secondary" className="text-[10px] h-4 font-normal">{formatType(suggestion.type)}</Badge>
          {suggestion.year && <span>{suggestion.year}</span>}
          {suggestion.client_brand && (
            <span className="flex items-center gap-0.5">
              <Building2 className="h-2.5 w-2.5" /> {suggestion.client_brand}
            </span>
          )}
        </div>
        {suggestion.description && (
          <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">{suggestion.description}</p>
        )}
        {suggestion.contributors && suggestion.contributors.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {suggestion.contributors.slice(0, 4).map((c, j) => (
              <span key={j} className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[10px]">
                {c.name} — {c.role}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CreditDatabase;
