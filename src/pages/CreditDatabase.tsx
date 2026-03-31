import { useState, useEffect, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Film, ShieldCheck, ExternalLink, Loader2, Users,
  Database, Filter, MapPin, Building2, CalendarDays, Sparkles,
  UserPlus, Globe, Music, Palette, Theater, Camera, Tv,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const CATEGORY_GROUPS = [
  { label: "All Industries", value: "all", icon: Globe },
  { label: "Film & TV", value: "film_tv", icon: Film },
  { label: "Music & Audio", value: "music", icon: Music },
  { label: "Performing Arts", value: "performing", icon: Theater },
  { label: "Events & Productions", value: "events", icon: Camera },
  { label: "Content & Digital", value: "digital", icon: Tv },
  { label: "Fashion & Beauty", value: "fashion", icon: Sparkles },
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

const CreditDatabase = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [tab, setTab] = useState<"projects" | "credits">("projects");
  const [icdbProjects, setIcdbProjects] = useState<ICDBProject[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [userCredits, setUserCredits] = useState<UserCredit[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [projectCount, setProjectCount] = useState(0);
  const [creditCount, setCreditCount] = useState(0);
  const [claimDialog, setClaimDialog] = useState<{ project: ICDBProject; role: ICDBProject['icdb_project_roles'] extends (infer T)[] | undefined ? T : never } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id || null);
    });
  }, []);

  // Fetch ICDB projects
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      if (debouncedSearch.length >= 2) {
        // Use edge function for AI-supplemented search
        const { data, error } = await supabase.functions.invoke('search-icdb', {
          body: { query: debouncedSearch, category: category !== 'all' ? category : undefined },
        });
        if (error) throw error;
        setIcdbProjects(data?.projects || []);
        setAiSuggestions(data?.suggestions || []);
        setProjectCount(data?.total || 0);
      } else {
        // Direct DB query for browsing
        let query = supabase
          .from('icdb_projects')
          .select('*, icdb_project_roles(id, role_title, person_name, is_claimed, claimed_by)', { count: 'exact' })
          .order('year', { ascending: false, nullsFirst: false })
          .limit(30);

        if (category !== 'all') {
          query = query.eq('category', category);
        }

        const { data, error, count } = await query;
        if (error) throw error;
        setIcdbProjects((data || []) as ICDBProject[]);
        setAiSuggestions([]);
        setProjectCount(count || 0);
      }
    } catch (err) {
      console.error('Error fetching ICDB projects:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category]);

  // Fetch user credits (legacy)
  const fetchCredits = useCallback(async () => {
    if (tab !== 'credits') return;
    setLoading(true);
    try {
      let query = supabase
        .from('credits')
        .select('id, project_name, role, year, verification_status, platform, location, client_brand, user_id, endorsement_count', { count: 'exact' })
        .order('year', { ascending: false, nullsFirst: false })
        .limit(30);

      if (debouncedSearch) {
        query = query.or(`project_name.ilike.%${debouncedSearch}%,role.ilike.%${debouncedSearch}%,client_brand.ilike.%${debouncedSearch}%`);
      }
      if (category !== 'all') {
        const types = Object.entries(TYPE_TO_CATEGORY).filter(([, cat]) => cat === category).map(([type]) => type);
        if (types.length > 0) {
          query = query.or(`project_type.in.(${types.join(',')}),credit_category.in.(${types.join(',')})`);
        }
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const userIds = [...new Set((data || []).map(c => c.user_id))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, role')
          .in('user_id', userIds);
        const map = new Map<string, ProfileInfo>();
        profileData?.forEach((p: any) => map.set(p.user_id, p));
        setProfiles(map);
      }

      setUserCredits((data || []) as UserCredit[]);
      setCreditCount(count || 0);
    } catch (err) {
      console.error('Error fetching credits:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, tab]);

  useEffect(() => {
    if (tab === 'projects') fetchProjects();
    else fetchCredits();
  }, [tab, fetchProjects, fetchCredits]);

  // Claim a role
  const handleClaim = async () => {
    if (!claimDialog || !currentUserId) return;
    setClaiming(true);
    try {
      const { error } = await supabase
        .from('icdb_project_roles')
        .update({ claimed_by: currentUserId, is_claimed: true })
        .eq('id', claimDialog.role.id);

      if (error) throw error;

      // Also create a credit entry for the user
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
      fetchProjects();
    } catch (err) {
      console.error('Claim error:', err);
      toast.error('Failed to claim credit');
    } finally {
      setClaiming(false);
    }
  };

  const formatType = (type: string) =>
    type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <>
      <Helmet>
        <title>ThriveRecord™ — The Global Creative Record | ThriveIN</title>
        <meta name="description" content="The definitive database of creative work. Search projects across film, music, events, fashion, art, and all creative industries." />
      </Helmet>

      <div className="min-h-screen bg-background pb-20">
        {/* Hero */}
        <div className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">ThriveRecord™</h1>
                <p className="text-xs text-muted-foreground">The Global Creative Record</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Film className="h-3.5 w-3.5" /> {projectCount.toLocaleString()} projects
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Cross-industry
              </span>
              <Badge variant="outline" className="text-[10px] h-4 gap-0.5 border-primary/30 text-primary">
                <Sparkles className="h-2.5 w-2.5" /> AI-Powered
              </Badge>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects, people, labels, studios..."
                className="pl-9 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Category chips */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {CATEGORY_GROUPS.map(g => {
                const Icon = g.icon;
                return (
                  <Button
                    key={g.value}
                    variant={category === g.value ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-[11px] gap-1 shrink-0 rounded-full"
                    onClick={() => setCategory(g.value)}
                  >
                    <Icon className="h-3 w-3" />
                    {g.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="container mx-auto px-4 pt-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="projects" className="flex-1 text-xs gap-1">
                <Database className="h-3 w-3" /> Projects
              </TabsTrigger>
              <TabsTrigger value="credits" className="flex-1 text-xs gap-1">
                <Users className="h-3 w-3" /> Creator Credits
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-[11px] h-7" onClick={() => navigate('/credits/hub')}>
              <Database className="h-3 w-3" /> My Record
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-[11px] h-7" onClick={() => navigate('/credits/discover')}>
              <Sparkles className="h-3 w-3" /> AI Discovery
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="container mx-auto px-4 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {debouncedSearch ? 'Searching ICDB...' : 'Loading projects...'}
              </p>
            </div>
          ) : tab === 'projects' ? (
            <>
              {/* ICDB Projects */}
              {icdbProjects.length === 0 && aiSuggestions.length === 0 ? (
                <div className="text-center py-16">
                  <Database className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {debouncedSearch ? 'No projects found' : 'Start searching'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {debouncedSearch
                      ? 'Try different keywords or browse by category'
                      : 'Search for any creative project across all industries'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* DB results */}
                  {icdbProjects.map(project => (
                    <Card key={project.id} className="overflow-hidden hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate(`/credits/project/${project.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm truncate">{project.title}</h3>
                              {project.is_verified && (
                                <Badge variant="outline" className="text-[9px] h-4 gap-0.5 border-blue-500/30 text-blue-600 shrink-0">
                                  <ShieldCheck className="h-2 w-2" /> Verified
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap mt-0.5">
                              <Badge variant="secondary" className="text-[10px] h-4">{formatType(project.type)}</Badge>
                              {project.year && (
                                <span className="flex items-center gap-0.5">
                                  <CalendarDays className="h-2.5 w-2.5" /> {project.year}
                                </span>
                              )}
                              {project.location && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-2.5 w-2.5" /> {project.location}
                                </span>
                              )}
                              {project.client_brand && (
                                <span className="flex items-center gap-0.5">
                                  <Building2 className="h-2.5 w-2.5" /> {project.client_brand}
                                </span>
                              )}
                            </div>
                          </div>
                          {project.external_url && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" asChild>
                              <a href={project.external_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          )}
                        </div>

                        {project.description && (
                          <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                        )}

                        {/* Contributors */}
                        {project.icdb_project_roles && project.icdb_project_roles.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Credits</p>
                            {project.icdb_project_roles.map(role => (
                              <div key={role.id} className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-muted/50">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar className="h-6 w-6 shrink-0">
                                    <AvatarFallback className="text-[9px] bg-muted">
                                      {role.person_name?.[0] || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium truncate">{role.person_name || 'Unknown'}</p>
                                    <p className="text-[10px] text-muted-foreground">{role.role_title}</p>
                                  </div>
                                </div>
                                {role.is_claimed ? (
                                  <Badge variant="outline" className="text-[9px] h-4 border-green-500/30 text-green-600 shrink-0">
                                    Claimed
                                  </Badge>
                                ) : currentUserId ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] gap-0.5 shrink-0"
                                    onClick={() => setClaimDialog({ project, role })}
                                  >
                                    <UserPlus className="h-2.5 w-2.5" /> Claim
                                  </Button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {/* AI Suggestions */}
                  {aiSuggestions.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mt-6 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <p className="text-xs font-medium text-muted-foreground">AI-Discovered Projects</p>
                      </div>
                      {aiSuggestions.map((suggestion, i) => (
                        <Card key={`ai-${i}`} className="overflow-hidden border-dashed border-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-sm truncate">{suggestion.title}</h3>
                                  <Badge variant="outline" className="text-[9px] h-4 gap-0.5 border-primary/30 text-primary shrink-0">
                                    <Sparkles className="h-2 w-2" /> AI
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap mt-0.5">
                                  <Badge variant="secondary" className="text-[10px] h-4">{formatType(suggestion.type)}</Badge>
                                  {suggestion.year && <span>{suggestion.year}</span>}
                                  {suggestion.location && (
                                    <span className="flex items-center gap-0.5">
                                      <MapPin className="h-2.5 w-2.5" /> {suggestion.location}
                                    </span>
                                  )}
                                  {suggestion.client_brand && (
                                    <span className="flex items-center gap-0.5">
                                      <Building2 className="h-2.5 w-2.5" /> {suggestion.client_brand}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{suggestion.description}</p>
                            {suggestion.contributors && suggestion.contributors.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {suggestion.contributors.slice(0, 5).map((c, j) => (
                                  <Badge key={j} variant="secondary" className="text-[9px] h-4">
                                    {c.name} — {c.role}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Creator Credits tab */
            <>
              {userCredits.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No credits found</h3>
                  <p className="text-sm text-muted-foreground">Try a different search</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userCredits.map(credit => {
                    const profile = profiles.get(credit.user_id);
                    return (
                      <Card
                        key={credit.id}
                        className="overflow-hidden cursor-pointer hover:shadow-sm transition-shadow"
                        onClick={() => navigate(`/profile/${credit.user_id}`)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={profile?.avatar_url || ''} />
                            <AvatarFallback className="text-[10px]">
                              {profile?.full_name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{credit.project_name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {profile?.full_name || 'Unknown'} — {credit.role}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                              {credit.year && <span>{credit.year}</span>}
                              {credit.platform && <span>· {credit.platform}</span>}
                            </div>
                          </div>
                          {credit.verification_status === 'verified' && (
                            <Badge variant="outline" className="text-[9px] h-4 gap-0.5 border-green-500/30 text-green-600 shrink-0">
                              <ShieldCheck className="h-2 w-2" /> Verified
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
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
              This will be added to your verified credits.
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
            {claimDialog?.project?.client_brand && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Label/Studio</span>
                <span>{claimDialog.project.client_brand}</span>
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

export default CreditDatabase;
