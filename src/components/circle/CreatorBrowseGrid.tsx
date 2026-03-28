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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Search, MapPin, MessageSquare, UserPlus, Users, Award,
  ShieldCheck, ExternalLink, CalendarDays, Building2, Filter, LayoutGrid, List,
  Lock, Crown, Sparkles, Star, Briefcase,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { hasProAccess } from "@/lib/subscriptionConfig";

const FREE_BROWSE_LIMIT = 10;
const PAGE_SIZE = 20;

// --- Types ---

interface ProfileInfo {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  location: string | null;
  level: number | null;
  badge: string | null;
  bio?: string | null;
  verification_status?: string | null;
}

interface CreditResult {
  id: string; project_name: string; role: string; year: number | null;
  verification_status: string | null; url: string | null; platform: string | null;
  location: string | null; client_brand: string | null; endorsement_count: number;
  ai_confidence: number | null; project_type: string | null; user_id: string;
}

interface CreatorWithCredits extends ProfileInfo {
  credit_count?: number;
  top_credits?: { project_name: string; role: string }[];
  mutual_connections?: number;
}

// --- Constants ---

const SKILL_CATEGORIES = [
  'Photography', 'Videography', 'Music Production', 'Writing', 'Design',
  'Animation', 'Social Media', 'Marketing', 'Content Creation', 'DJing',
  'Singing', 'Acting', 'Dance', 'Makeup Artistry', 'Styling',
  'Video Editing', 'Motion Graphics', 'Graphic Design', 'Podcast Production',
];

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

// --- Upgrade Wall Component ---

function BrowseUpgradeWall({ total, shown }: { total: number; shown: number }) {
  const navigate = useNavigate();
  const remaining = total - shown;
  if (remaining <= 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
      <CardContent className="p-5 text-center space-y-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Crown className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Unlock {remaining}+ more creators</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Upgrade to Pro for unlimited browsing, advanced filters, and full profile details.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => navigate("/subscription")}>
          <Crown className="h-3.5 w-3.5" /> Upgrade to Pro
        </Button>
      </CardContent>
    </Card>
  );
}

// --- Pro Filter Lock ---

function ProFilterLabel({ label, isPro }: { label: string; isPro: boolean }) {
  return (
    <span className="flex items-center gap-1 text-xs">
      {label}
      {!isPro && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
    </span>
  );
}

// --- Rich Creator Card ---

function CreatorCard({ creator, onConnect, onMessage, onNavigate }: {
  creator: CreatorWithCredits;
  onConnect: (id: string) => void;
  onMessage: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-all cursor-pointer group" onClick={() => onNavigate(creator.user_id)}>
      {/* Gradient header bar */}
      <div className="h-12 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 relative">
        <Avatar className="h-14 w-14 absolute -bottom-7 left-3 border-2 border-background shadow-md">
          <AvatarImage src={creator.avatar_url || ''} />
          <AvatarFallback className="text-base font-semibold bg-primary/10">{creator.full_name?.[0] || '?'}</AvatarFallback>
        </Avatar>
        {/* Actions in top-right */}
        <div className="absolute top-1.5 right-1.5 flex gap-1">
          <Button variant="secondary" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); onMessage(creator.user_id); }}>
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
          <Button variant="secondary" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); onConnect(creator.user_id); }}>
            <UserPlus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <CardContent className="pt-9 pb-3 px-3 space-y-2">
        {/* Name & badges */}
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold truncate">{creator.full_name}</p>
              {(creator.badge === 'odos' || creator.badge === 'ODOS') && (
                <Badge variant="secondary" className="text-[8px] h-3.5 px-1 bg-primary/10 text-primary">ODOS</Badge>
              )}
              {creator.verification_status === 'verified' && (
                <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </div>
            {creator.role && <p className="text-[11px] text-muted-foreground truncate">{creator.role}</p>}
          </div>
          {creator.level && creator.level > 0 && (
            <Badge variant="outline" className="text-[9px] h-5 shrink-0 gap-0.5 font-semibold">
              <Star className="h-2.5 w-2.5 fill-primary text-primary" /> Lvl {creator.level}
            </Badge>
          )}
        </div>

        {/* Location */}
        {creator.location && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" /> {creator.location}
          </p>
        )}

        {/* Skills tags */}
        {creator.skills && creator.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {creator.skills.slice(0, 3).map(skill => (
              <Badge key={skill} variant="secondary" className="text-[9px] h-4 px-1.5 font-normal">{skill}</Badge>
            ))}
            {creator.skills.length > 3 && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-normal text-muted-foreground">+{creator.skills.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Top credits */}
        {creator.top_credits && creator.top_credits.length > 0 && (
          <div className="border-t pt-2 mt-1 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
              <Briefcase className="h-2.5 w-2.5" /> Recent Work
            </p>
            {creator.top_credits.slice(0, 2).map((credit, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="h-1 w-1 rounded-full bg-primary/50 shrink-0" />
                <span className="text-[10px] truncate">
                  <span className="font-medium">{credit.project_name}</span>
                  <span className="text-muted-foreground"> · {credit.role}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 pt-1">
          {(creator.credit_count ?? 0) > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Award className="h-2.5 w-2.5" /> {creator.credit_count} credits
            </span>
          )}
          {(creator.mutual_connections ?? 0) > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Users className="h-2.5 w-2.5" /> {creator.mutual_connections} mutual
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Component ---

export function CreatorBrowseGrid() {
  const { user, subscriptionInfo } = useAuth();
  const navigate = useNavigate();
  const isPro = hasProAccess(subscriptionInfo.tier as any);

  const [mode, setMode] = useState<"creators" | "credits">("creators");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Creator filters
  const [skillFilter, setSkillFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [verifiedCreatorsOnly, setVerifiedCreatorsOnly] = useState(false);
  const [minLevel, setMinLevel] = useState("all");

  // Creators state
  const [creators, setCreators] = useState<CreatorWithCredits[]>([]);
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

  const activeFilterCount = [
    skillFilter !== "all",
    locationFilter.trim() !== "",
    verifiedCreatorsOnly,
    minLevel !== "all",
  ].filter(Boolean).length;

  useEffect(() => {
    if (mode === "creators") fetchCreators();
  }, [search, creatorPage, mode, skillFilter, locationFilter, verifiedCreatorsOnly, minLevel]);

  useEffect(() => {
    if (mode === "credits") fetchCredits();
  }, [search, category, verifiedOnly, creditPage, mode]);

  const fetchCreators = async () => {
    setCreatorsLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, location, level, badge, bio, verification_status', { count: 'exact' })
        .eq('is_claimed', true)
        .not('full_name', 'is', null)
        .order('level', { ascending: false })
        .range(creatorPage * PAGE_SIZE, (creatorPage + 1) * PAGE_SIZE - 1);

      if (search.trim()) {
        query = query.or(`full_name.ilike.%${search}%,role.ilike.%${search}%,location.ilike.%${search}%`);
      }
      if (isPro && skillFilter !== "all") {
        query = query.ilike('role', `%${skillFilter}%`);
      }
      if (isPro && locationFilter.trim()) {
        query = query.ilike('location', `%${locationFilter.trim()}%`);
      }
      if (isPro && verifiedCreatorsOnly) {
        query = query.eq('badge', 'odos');
      }
      if (isPro && minLevel !== "all") {
        query = query.gte('level', parseInt(minLevel));
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const profiles = (data || []) as CreatorWithCredits[];

      // Enrich with credits data
      if (profiles.length > 0) {
        const userIds = profiles.map(p => p.user_id);

        // Get credit counts and top credits
        const { data: creditsData } = await supabase
          .from('credits')
          .select('user_id, project_name, role')
          .in('user_id', userIds)
          .order('year', { ascending: false })
          .limit(100);

        if (creditsData) {
          const creditMap = new Map<string, { count: number; top: { project_name: string; role: string }[] }>();
          creditsData.forEach(c => {
            const existing = creditMap.get(c.user_id) || { count: 0, top: [] };
            existing.count++;
            if (existing.top.length < 3) existing.top.push({ project_name: c.project_name, role: c.role });
            creditMap.set(c.user_id, existing);
          });
          profiles.forEach(p => {
            const cd = creditMap.get(p.user_id);
            if (cd) { p.credit_count = cd.count; p.top_credits = cd.top; }
          });
        }

        // Get mutual connections if logged in
        if (user?.id) {
          const [outgoing, incoming] = await Promise.all([
            supabase.from('connections').select('connected_user_id').eq('user_id', user.id).eq('status', 'accepted'),
            supabase.from('connections').select('user_id').eq('connected_user_id', user.id).eq('status', 'accepted'),
          ]);
          const myConnections = new Set<string>();
          outgoing.data?.forEach(c => myConnections.add(c.connected_user_id));
          incoming.data?.forEach(c => myConnections.add(c.user_id));

          if (myConnections.size > 0) {
            for (const profile of profiles) {
              // Check mutual: how many of this creator's connections overlap with mine
              const [pOut, pIn] = await Promise.all([
                supabase.from('connections').select('connected_user_id').eq('user_id', profile.user_id).eq('status', 'accepted'),
                supabase.from('connections').select('user_id').eq('connected_user_id', profile.user_id).eq('status', 'accepted'),
              ]);
              const theirConnections = new Set<string>();
              pOut.data?.forEach(c => theirConnections.add(c.connected_user_id));
              pIn.data?.forEach(c => theirConnections.add(c.user_id));
              let mutual = 0;
              myConnections.forEach(id => { if (theirConnections.has(id)) mutual++; });
              profile.mutual_connections = mutual;
            }
          }
        }
      }

      setCreators(profiles);
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

  const visibleCreators = isPro ? creators : creators.slice(0, FREE_BROWSE_LIMIT);

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

  const clearFilters = () => {
    setSkillFilter("all");
    setLocationFilter("");
    setVerifiedCreatorsOnly(false);
    setMinLevel("all");
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
          <>
            <div className="flex bg-muted rounded-lg p-0.5">
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 relative">
                  <Filter className="h-3.5 w-3.5" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Filter className="h-4 w-4" /> Filters
                    {!isPro && <Badge variant="secondary" className="text-[9px] gap-0.5"><Crown className="h-2.5 w-2.5" /> Pro unlocks all</Badge>}
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-4 py-4">
                  {/* Skill filter - free */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Skill / Role</label>
                    <Select value={skillFilter} onValueChange={v => { if (isPro) { setSkillFilter(v); setCreatorPage(0); } else { toast.info('Upgrade to Pro for skill filters'); }}}>
                      <SelectTrigger className={`h-9 text-xs ${!isPro ? 'opacity-60' : ''}`}>
                        <SelectValue placeholder="All skills" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Skills</SelectItem>
                        {SKILL_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {!isPro && <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Lock className="h-2.5 w-2.5" /> Pro feature</p>}
                  </div>

                  {/* Location filter */}
                  <div className="space-y-1.5">
                    <ProFilterLabel label="Location" isPro={isPro} />
                    <Input
                      placeholder="e.g. Lagos, London, NYC..."
                      value={locationFilter}
                      onChange={e => { if (isPro) { setLocationFilter(e.target.value); setCreatorPage(0); } else { toast.info('Upgrade to Pro for location filters'); }}}
                      className={`h-9 text-xs ${!isPro ? 'opacity-60' : ''}`}
                      disabled={!isPro}
                    />
                  </div>

                  {/* Verified toggle */}
                  <div className="space-y-1.5">
                    <ProFilterLabel label="Verified creators only" isPro={isPro} />
                    <Button
                      variant={verifiedCreatorsOnly ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => {
                        if (isPro) { setVerifiedCreatorsOnly(!verifiedCreatorsOnly); setCreatorPage(0); }
                        else toast.info('Upgrade to Pro for verified filter');
                      }}
                      disabled={!isPro}
                    >
                      <ShieldCheck className="h-3 w-3" /> {verifiedCreatorsOnly ? 'On' : 'Off'}
                    </Button>
                  </div>

                  {/* Level filter */}
                  <div className="space-y-1.5">
                    <ProFilterLabel label="Minimum Level" isPro={isPro} />
                    <Select value={minLevel} onValueChange={v => { if (isPro) { setMinLevel(v); setCreatorPage(0); } else { toast.info('Upgrade to Pro for level filters'); }}}>
                      <SelectTrigger className={`h-9 text-xs ${!isPro ? 'opacity-60' : ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Level</SelectItem>
                        <SelectItem value="5">Level 5+</SelectItem>
                        <SelectItem value="10">Level 10+</SelectItem>
                        <SelectItem value="20">Level 20+</SelectItem>
                        <SelectItem value="50">Level 50+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={clearFilters}>Clear All</Button>
                    <Button size="sm" className="flex-1" onClick={() => setFiltersOpen(false)}>Apply</Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </>
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

      {/* Active filter badges */}
      {mode === "creators" && activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skillFilter !== "all" && <Badge variant="secondary" className="text-[10px] gap-1">{skillFilter} <button onClick={() => setSkillFilter("all")} className="ml-0.5">×</button></Badge>}
          {locationFilter.trim() && <Badge variant="secondary" className="text-[10px] gap-1"><MapPin className="h-2.5 w-2.5" /> {locationFilter} <button onClick={() => setLocationFilter("")} className="ml-0.5">×</button></Badge>}
          {verifiedCreatorsOnly && <Badge variant="secondary" className="text-[10px] gap-1"><ShieldCheck className="h-2.5 w-2.5" /> Verified <button onClick={() => setVerifiedCreatorsOnly(false)} className="ml-0.5">×</button></Badge>}
          {minLevel !== "all" && <Badge variant="secondary" className="text-[10px] gap-1">Lvl {minLevel}+ <button onClick={() => setMinLevel("all")} className="ml-0.5">×</button></Badge>}
        </div>
      )}

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
          <p className="text-xs text-muted-foreground">
            {totalCreators} creators
            {!isPro && totalCreators > FREE_BROWSE_LIMIT && (
              <span className="text-primary"> · Showing {Math.min(FREE_BROWSE_LIMIT, totalCreators)} free</span>
            )}
          </p>

          {creatorsLoading ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i}><CardContent className="p-3 space-y-2">
                    <Skeleton className="h-12 w-full rounded" />
                    <div className="pt-5 space-y-1.5"><Skeleton className="h-4 w-20 mx-auto" /><Skeleton className="h-3 w-16 mx-auto" /></div>
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
              {activeFilterCount > 0 && (
                <Button variant="link" size="sm" className="mt-2" onClick={clearFilters}>Clear filters</Button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {visibleCreators.map(creator => (
                  <CreatorCard
                    key={creator.user_id}
                    creator={creator}
                    onConnect={handleConnect}
                    onMessage={(id) => navigate(`/messages?user=${id}`)}
                    onNavigate={(id) => navigate(`/profile/${id}`)}
                  />
                ))}
              </div>
              {!isPro && <BrowseUpgradeWall total={totalCreators} shown={visibleCreators.length} />}
            </>
          ) : (
            <>
              <div className="space-y-2">
                {visibleCreators.map(creator => (
                  <Card key={creator.user_id} className="overflow-hidden hover:shadow-sm transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Avatar className="h-12 w-12 shrink-0 cursor-pointer" onClick={() => navigate(`/profile/${creator.user_id}`)}>
                        <AvatarImage src={creator.avatar_url || ''} />
                        <AvatarFallback>{creator.full_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${creator.user_id}`)}>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate">{creator.full_name}</p>
                          {(creator.badge === 'odos' || creator.badge === 'ODOS') && <Badge variant="secondary" className="text-[9px] h-4">ODOS</Badge>}
                          {creator.verification_status === 'verified' && <ShieldCheck className="h-3 w-3 text-primary" />}
                        </div>
                        {creator.role && <p className="text-xs text-muted-foreground truncate">{creator.role}</p>}
                        <div className="flex items-center gap-2 mt-0.5">
                          {creator.location && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {creator.location}</span>}
                          {(creator.credit_count ?? 0) > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Award className="h-2.5 w-2.5" /> {creator.credit_count}</span>}
                        </div>
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
              {!isPro && <BrowseUpgradeWall total={totalCreators} shown={visibleCreators.length} />}
            </>
          )}
          {isPro && <Pagination page={creatorPage} setPage={setCreatorPage} total={totalCreators} />}
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
              {projectGroups.map((project, index) => {
                if (!isPro && index >= FREE_BROWSE_LIMIT) return null;
                return (
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
                );
              })}
              {!isPro && projectGroups.length > FREE_BROWSE_LIMIT && (
                <BrowseUpgradeWall total={projectGroups.length} shown={FREE_BROWSE_LIMIT} />
              )}
              {isPro && <Pagination page={creditPage} setPage={setCreditPage} total={totalCredits} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
