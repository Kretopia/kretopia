import { useState, useEffect, useMemo } from "react";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Search, Film, ShieldCheck, ExternalLink, Loader2, Users, UserPlus,
  Database, Filter, MapPin, Building2, CalendarDays, MessageSquare, Award,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
  { label: "Business & Industry", value: "business" },
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

interface CreditResult {
  id: string;
  project_name: string;
  role: string;
  year: number | null;
  verification_status: string | null;
  url: string | null;
  platform: string | null;
  location: string | null;
  client_brand: string | null;
  endorsement_count: number;
  ai_confidence: number | null;
  project_type: string | null;
  credit_category: string | null;
  user_id: string;
}

interface ProfileInfo {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  location: string | null;
  level: number | null;
  badge: string | null;
}

const DirectoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("creators");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");

  // Credits state
  const [credits, setCredits] = useState<CreditResult[]>([]);
  const [creditProfiles, setCreditProfiles] = useState<Map<string, ProfileInfo>>(new Map());
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [totalCredits, setTotalCredits] = useState(0);
  const [creditPage, setCreditPage] = useState(0);

  // Creators state
  const [creators, setCreators] = useState<ProfileInfo[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(true);
  const [totalCreators, setTotalCreators] = useState(0);
  const [creatorPage, setCreatorPage] = useState(0);

  const PAGE_SIZE = 20;

  // Fetch creators
  useEffect(() => {
    fetchCreators();
  }, [search, roleFilter, creatorPage]);

  // Fetch credits
  useEffect(() => {
    if (activeTab === "credits") {
      fetchCredits();
    }
  }, [search, category, verifiedOnly, creditPage, activeTab]);

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

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,role.ilike.%${search}%,location.ilike.%${search}%`);
      }

      if (roleFilter) {
        query = query.ilike('role', `%${roleFilter}%`);
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
        .select('id, project_name, role, year, verification_status, url, platform, location, client_brand, endorsement_count, ai_confidence, project_type, credit_category, user_id', { count: 'exact' })
        .order('year', { ascending: false, nullsFirst: false })
        .range(creditPage * PAGE_SIZE, (creditPage + 1) * PAGE_SIZE - 1);

      if (search) {
        query = query.or(`project_name.ilike.%${search}%,role.ilike.%${search}%,client_brand.ilike.%${search}%`);
      }
      if (verifiedOnly) {
        query = query.eq('verification_status', 'verified');
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
          .select('user_id, full_name, avatar_url, role, location, level, badge')
          .in('user_id', userIds);
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
    const groups: Record<string, {
      name: string; year: number | null; url: string | null;
      location: string | null; client: string | null;
      credits: (CreditResult & { profile: ProfileInfo | undefined })[];
      verifiedCount: number;
    }> = {};

    credits.forEach(credit => {
      const key = credit.project_name.toLowerCase().trim();
      if (!groups[key]) {
        groups[key] = { name: credit.project_name, year: credit.year, url: credit.url, location: credit.location, client: credit.client_brand, credits: [], verifiedCount: 0 };
      }
      groups[key].credits.push({ ...credit, profile: creditProfiles.get(credit.user_id) });
      if (credit.verification_status === 'verified') groups[key].verifiedCount++;
    });

    return Object.values(groups).sort((a, b) => b.verifiedCount !== a.verifiedCount ? b.verifiedCount - a.verifiedCount : b.credits.length - a.credits.length);
  }, [credits, creditProfiles]);

  const handleConnect = async (targetId: string) => {
    if (!user?.id) { toast.error('Sign in to connect'); return; }
    if (targetId === user.id) return;

    try {
      const { data: existing } = await supabase
        .from('connections')
        .select('id')
        .or(`and(user_id.eq.${user.id},connected_user_id.eq.${targetId}),and(user_id.eq.${targetId},connected_user_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) { toast.info('Already connected or pending'); return; }

      await supabase.from('connections').insert({ user_id: user.id, connected_user_id: targetId, status: 'pending' });
      toast.success('Connection request sent!');
    } catch { toast.error('Failed to send request'); }
  };

  return (
    <>
      <SEO
        title="Directory — Discover Creatives & Credits | ThriveIN"
        description="Search verified professional credits and discover creatives across film, music, events, fashion, and all creative industries."
      />

      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b">
          <div className="container mx-auto px-3 sm:px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Directory</h1>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === "creators" ? "Search creators by name, role, location..." : "Search projects, roles, brands..."}
                className="pl-9 h-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCreditPage(0); setCreatorPage(0); }}
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="creators" className="text-xs gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Creators
                </TabsTrigger>
                <TabsTrigger value="credits" className="text-xs gap-1.5">
                  <Award className="h-3.5 w-3.5" />
                  Credits
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="container mx-auto px-3 sm:px-4 py-3">
          {/* CREATORS TAB */}
          {activeTab === "creators" && (
            <>
              <p className="text-xs text-muted-foreground mb-3">{totalCreators} creators</p>

              {creatorsLoading ? (
                <div className="flex items-center justify-center py-16 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : creators.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No creators found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {creators.map(creator => (
                    <Card key={creator.user_id} className="overflow-hidden">
                      <CardContent className="p-3 flex items-center gap-3">
                        <Avatar
                          className="h-12 w-12 shrink-0 cursor-pointer"
                          onClick={() => navigate(`/profile/${creator.user_id}`)}
                        >
                          <AvatarImage src={creator.avatar_url || ''} />
                          <AvatarFallback>{creator.full_name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/profile/${creator.user_id}`)}
                        >
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold truncate">{creator.full_name}</p>
                            {creator.badge === 'ODOS' && (
                              <Badge variant="secondary" className="text-[9px] h-4">ODOS</Badge>
                            )}
                          </div>
                          {creator.role && <p className="text-xs text-muted-foreground truncate">{creator.role}</p>}
                          {creator.location && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                              <MapPin className="h-2.5 w-2.5" /> {creator.location}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => navigate(`/messages?user=${creator.user_id}`)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleConnect(creator.user_id)}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {totalCreators > PAGE_SIZE && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <Button variant="outline" size="sm" disabled={creatorPage === 0} onClick={() => setCreatorPage(p => p - 1)}>
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Page {creatorPage + 1} of {Math.ceil(totalCreators / PAGE_SIZE)}
                      </span>
                      <Button variant="outline" size="sm" disabled={(creatorPage + 1) * PAGE_SIZE >= totalCreators} onClick={() => setCreatorPage(p => p + 1)}>
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* CREDITS TAB */}
          {activeTab === "credits" && (
            <>
              <div className="flex gap-2 flex-wrap mb-3">
                <Select value={category} onValueChange={(v) => { setCategory(v); setCreditPage(0); }}>
                  <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_GROUPS.map(g => (
                      <SelectItem key={g.value} value={g.value} className="text-xs">{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={verifiedOnly ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => { setVerifiedOnly(!verifiedOnly); setCreditPage(0); }}
                >
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </Button>
                <span className="text-xs text-muted-foreground self-center ml-auto">{totalCredits} credits</span>
              </div>

              {creditsLoading ? (
                <div className="flex items-center justify-center py-16 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : credits.length === 0 ? (
                <div className="text-center py-16">
                  <Database className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No credits found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectGroups.map((project) => (
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
                                <Badge variant="outline" className="text-[9px] gap-0.5 h-4 border-green-500/30 text-green-600">
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
                            <div
                              key={credit.id}
                              className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => navigate(`/profile/${credit.user_id}`)}
                            >
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage src={credit.profile?.avatar_url || ''} />
                                <AvatarFallback className="text-[9px]">{credit.profile?.full_name?.[0] || '?'}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{credit.profile?.full_name || 'Unknown'}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{credit.role}</p>
                              </div>
                              {credit.verification_status === 'verified' && (
                                <ShieldCheck className="h-3 w-3 text-green-600 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {totalCredits > PAGE_SIZE && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <Button variant="outline" size="sm" disabled={creditPage === 0} onClick={() => setCreditPage(p => p - 1)}>
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Page {creditPage + 1} of {Math.ceil(totalCredits / PAGE_SIZE)}
                      </span>
                      <Button variant="outline" size="sm" disabled={(creditPage + 1) * PAGE_SIZE >= totalCredits} onClick={() => setCreditPage(p => p + 1)}>
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default DirectoryPage;
