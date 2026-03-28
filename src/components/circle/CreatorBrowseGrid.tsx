import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, MapPin, MessageSquare, UserPlus, Users, Award,
  ShieldCheck, ExternalLink, CalendarDays, Building2, Filter, LayoutGrid, List,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ProfileInfo {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  location: string | null;
  level: number | null;
  badge: string | null;
}

interface CreditResult {
  id: string; project_name: string; role: string; year: number | null;
  verification_status: string | null; url: string | null; platform: string | null;
  location: string | null; client_brand: string | null; endorsement_count: number;
  ai_confidence: number | null; project_type: string | null; user_id: string;
}

const PAGE_SIZE = 20;

const CATEGORY_GROUPS = [
  { label: "All Industries", value: "all" },
  { label: "Film & TV", value: "film_tv" },
  { label: "Music & Audio", value: "music" },
  { label: "Performing Arts", value: "performing" },
  { label: "Events & Productions", value: "events" },
  { label: "Content & Digital", value: "digital" },
  { label: "Commercial", value: "commercial" },
  { label: "Fashion & Beauty", value: "fashion" },
  { label: "Art & Design", value: "art" },
];

const TYPE_TO_CATEGORY: Record<string, string> = {
  film: "film_tv", movie: "film_tv", tv: "film_tv", short_film: "film_tv", documentary: "film_tv", music_video: "film_tv",
  album: "music", single: "music", ep: "music", podcast: "music",
  theatre: "performing", musical: "performing", dance: "performing",
  live_event: "events", concert: "events", festival: "events", carnival: "events", fashion_show: "events",
  youtube_series: "digital", ugc_campaign: "digital",
  commercial: "commercial", brand_campaign: "commercial",
  art_exhibition: "art", photography: "art", animation: "art",
  fashion_collection: "fashion", editorial_shoot: "fashion", runway: "fashion",
};

export function CreatorBrowseGrid() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"creators" | "credits">("creators");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  // Creators state
  const [creators, setCreators] = useState<ProfileInfo[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(true);
  const [totalCreators, setTotalCreators] = useState(0);
  const [creatorPage, setCreatorPage] = useState(0);

  // Credits state
  const [credits, setCredits] = useState<CreditResult[]>([]);
  const [creditProfiles, setCreditProfiles] = useState<Map<string, ProfileInfo>>(new Map());
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [totalCredits, setTotalCredits] = useState(0);
  const [creditPage, setCreditPage] = useState(0);
  const [category, setCategory] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    if (mode === "creators") fetchCreators();
  }, [search, creatorPage, mode]);

  useEffect(() => {
    if (mode === "credits") fetchCredits();
  }, [search, category, verifiedOnly, creditPage, mode]);

  const fetchCreators = async () => {
    setCreatorsLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, location, level, badge', { count: 'exact' })
        .eq('is_claimed', true)
        .not('full_name', 'is', null)
        .order('level', { ascending: false })
        .range(creatorPage * PAGE_SIZE, (creatorPage + 1) * PAGE_SIZE - 1);

      if (search.trim()) {
        query = query.or(`full_name.ilike.%${search}%,role.ilike.%${search}%,location.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setCreators((data || []) as ProfileInfo[]);
      setTotalCreators(count || 0);
    } catch (err) {
      console.error('Error fetching creators:', err);
    } finally {
      setCreatorsLoading(false);
    }
  };

  const fetchCredits = async () => {
    setCreditsLoading(true);
    try {
      let query = supabase
        .from('credits')
        .select('id, project_name, role, year, verification_status, url, platform, location, client_brand, endorsement_count, ai_confidence, project_type, user_id', { count: 'exact' })
        .order('year', { ascending: false, nullsFirst: false })
        .range(creditPage * PAGE_SIZE, (creditPage + 1) * PAGE_SIZE - 1);

      if (search.trim()) query = query.or(`project_name.ilike.%${search}%,role.ilike.%${search}%,client_brand.ilike.%${search}%`);
      if (verifiedOnly) query = query.eq('verification_status', 'verified');
      if (category !== 'all') {
        const types = Object.entries(TYPE_TO_CATEGORY).filter(([, cat]) => cat === category).map(([type]) => type);
        if (types.length > 0) query = query.or(`project_type.in.(${types.join(',')})`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const userIds = [...new Set((data || []).map(c => c.user_id))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase.from('profiles').select('user_id, full_name, avatar_url, role, location, level, badge').in('user_id', userIds);
        const map = new Map<string, ProfileInfo>();
        profileData?.forEach((p: any) => map.set(p.user_id, p));
        setCreditProfiles(map);
      }

      setCredits((data || []) as CreditResult[]);
      setTotalCredits(count || 0);
    } catch (err) {
      console.error('Error fetching credits:', err);
    } finally {
      setCreditsLoading(false);
    }
  };

  const projectGroups = useMemo(() => {
    const groups: Record<string, { name: string; year: number | null; url: string | null; location: string | null; client: string | null; credits: (CreditResult & { profile: ProfileInfo | undefined })[]; verifiedCount: number }> = {};
    credits.forEach(credit => {
      const key = credit.project_name.toLowerCase().trim();
      if (!groups[key]) groups[key] = { name: credit.project_name, year: credit.year, url: credit.url, location: credit.location, client: credit.client_brand, credits: [], verifiedCount: 0 };
      groups[key].credits.push({ ...credit, profile: creditProfiles.get(credit.user_id) });
      if (credit.verification_status === 'verified') groups[key].verifiedCount++;
    });
    return Object.values(groups).sort((a, b) => b.verifiedCount !== a.verifiedCount ? b.verifiedCount - a.verifiedCount : b.credits.length - a.credits.length);
  }, [credits, creditProfiles]);

  const handleConnect = async (targetId: string) => {
    if (!user?.id) { toast.error('Sign in to connect'); return; }
    if (targetId === user.id) return;
    try {
      const { data: existing } = await supabase.from('connections').select('id')
        .or(`and(user_id.eq.${user.id},connected_user_id.eq.${targetId}),and(user_id.eq.${targetId},connected_user_id.eq.${user.id})`)
        .maybeSingle();
      if (existing) { toast.info('Already connected or pending'); return; }
      await supabase.from('connections').insert({ user_id: user.id, connected_user_id: targetId, status: 'pending' });
      toast.success('Connection request sent!');
    } catch { toast.error('Failed to send request'); }
  };

  const Pagination = ({ page, setPage, total }: { page: number; setPage: (fn: (p: number) => number) => void; total: number }) => {
    if (total <= PAGE_SIZE) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
        <span className="text-xs text-muted-foreground">Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
        <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle: Creators / Credits */}
      <div className="flex items-center gap-2">
        <div className="flex bg-muted rounded-lg p-0.5 flex-1">
          <button
            onClick={() => { setMode("creators"); setSearch(""); setCreatorPage(0); }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === "creators" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Creators
          </button>
          <button
            onClick={() => { setMode("credits"); setSearch(""); setCreditPage(0); }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === "credits" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Award className="h-3.5 w-3.5" /> Credits (ICDB)
          </button>
        </div>
        {mode === "creators" && (
          <div className="flex bg-muted rounded-lg p-0.5">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={mode === "creators" ? "Search by name, role, or location..." : "Search projects, roles, or brands..."}
          className="pl-9 h-10"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCreatorPage(0); setCreditPage(0); }}
        />
      </div>

      {/* Credits filters */}
      {mode === "credits" && (
        <div className="flex gap-2 flex-wrap">
          <Select value={category} onValueChange={(v) => { setCategory(v); setCreditPage(0); }}>
            <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs">
              <Filter className="h-3 w-3 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_GROUPS.map(g => <SelectItem key={g.value} value={g.value} className="text-xs">{g.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={verifiedOnly ? "default" : "outline"} size="sm" className="h-8 text-xs gap-1" onClick={() => { setVerifiedOnly(!verifiedOnly); setCreditPage(0); }}>
            <ShieldCheck className="h-3 w-3" /> Verified
          </Button>
          <span className="text-xs text-muted-foreground self-center ml-auto">{totalCredits} credits</span>
        </div>
      )}

      {/* CREATORS VIEW */}
      {mode === "creators" && (
        <>
          <p className="text-xs text-muted-foreground">{totalCreators} creators</p>

          {creatorsLoading ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i}><CardContent className="p-3 flex flex-col items-center gap-2">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </CardContent></Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Card key={i}><CardContent className="p-3 flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
                  </CardContent></Card>
                ))}
              </div>
            )
          ) : creators.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No creators found</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-2">
              {creators.map(creator => (
                <Card key={creator.user_id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/profile/${creator.user_id}`)}>
                  <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={creator.avatar_url || ''} />
                      <AvatarFallback className="text-lg">{creator.full_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 w-full">
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-sm font-semibold truncate">{creator.full_name}</p>
                        {creator.badge === 'ODOS' && <Badge variant="secondary" className="text-[8px] h-3.5 px-1">ODOS</Badge>}
                      </div>
                      {creator.role && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{creator.role}</p>}
                      {creator.location && <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5"><MapPin className="h-2.5 w-2.5" /> {creator.location}</p>}
                      {creator.level && creator.level > 0 && (
                        <Badge variant="outline" className="text-[9px] h-4 mt-1">Lvl {creator.level}</Badge>
                      )}
                    </div>
                    <div className="flex gap-1.5 mt-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); navigate(`/messages?user=${creator.user_id}`); }}>
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleConnect(creator.user_id); }}>
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {creators.map(creator => (
                <Card key={creator.user_id} className="overflow-hidden">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-12 w-12 shrink-0 cursor-pointer" onClick={() => navigate(`/profile/${creator.user_id}`)}>
                      <AvatarImage src={creator.avatar_url || ''} />
                      <AvatarFallback>{creator.full_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${creator.user_id}`)}>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate">{creator.full_name}</p>
                        {creator.badge === 'ODOS' && <Badge variant="secondary" className="text-[9px] h-4">ODOS</Badge>}
                      </div>
                      {creator.role && <p className="text-xs text-muted-foreground truncate">{creator.role}</p>}
                      {creator.location && <p className="text-[11px] text-muted-foreground flex items-center gap-0.5 mt-0.5"><MapPin className="h-2.5 w-2.5" /> {creator.location}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/messages?user=${creator.user_id}`)}>
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleConnect(creator.user_id)}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Pagination page={creatorPage} setPage={setCreatorPage} total={totalCreators} />
        </>
      )}

      {/* CREDITS VIEW */}
      {mode === "credits" && (
        <>
          {creditsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : credits.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No credits found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projectGroups.map(project => (
                <Card key={project.name} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap mt-0.5">
                          {project.year && <span className="flex items-center gap-0.5"><CalendarDays className="h-2.5 w-2.5" /> {project.year}</span>}
                          {project.location && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {project.location}</span>}
                          {project.client && <span className="flex items-center gap-0.5"><Building2 className="h-2.5 w-2.5" /> {project.client}</span>}
                          {project.verifiedCount > 0 && (
                            <Badge variant="outline" className="text-[9px] gap-0.5 h-4 border-primary/30 text-primary">
                              <ShieldCheck className="h-2 w-2" /> {project.verifiedCount} verified
                            </Badge>
                          )}
                        </div>
                      </div>
                      {project.url && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" asChild>
                          <a href={project.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {project.credits.map(credit => (
                        <div key={credit.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/profile/${credit.user_id}`)}>
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={credit.profile?.avatar_url || ''} />
                            <AvatarFallback className="text-[9px]">{credit.profile?.full_name?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{credit.profile?.full_name || 'Unknown'}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{credit.role}</p>
                          </div>
                          {credit.verification_status === 'verified' && <ShieldCheck className="h-3 w-3 text-primary shrink-0" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Pagination page={creditPage} setPage={setCreditPage} total={totalCredits} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
