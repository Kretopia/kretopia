import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Film, ShieldCheck, ExternalLink, Loader2, Users,
  Database, Filter, MapPin, Building2, CalendarDays, ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  collaborator_user_ids: string[] | null;
  user_id: string;
}

interface ProfileInfo {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  username: string | null;
}

const CreditDatabase = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [location, setLocation] = useState("");
  const [credits, setCredits] = useState<CreditResult[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const PAGE_SIZE = 30;

  useEffect(() => {
    fetchCredits();
  }, [search, category, verifiedOnly, page]);

  const fetchCredits = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('credits')
        .select('id, project_name, role, year, verification_status, url, platform, location, client_brand, endorsement_count, ai_confidence, project_type, credit_category, collaborator_user_ids, user_id', { count: 'exact' })
        .order('year', { ascending: false, nullsFirst: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        query = query.or(`project_name.ilike.%${search}%,role.ilike.%${search}%,client_brand.ilike.%${search}%,location.ilike.%${search}%`);
      }

      if (verifiedOnly) {
        query = query.eq('verification_status', 'verified');
      }

      // Category filter
      if (category !== 'all') {
        const types = Object.entries(TYPE_TO_CATEGORY)
          .filter(([, cat]) => cat === category)
          .map(([type]) => type);
        if (types.length > 0) {
          query = query.or(`project_type.in.(${types.join(',')}),credit_category.in.(${types.join(',')})`);
        }
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set((data || []).map(c => c.user_id))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, role, username')
          .in('user_id', userIds);
        const map = new Map<string, ProfileInfo>();
        profileData?.forEach(p => map.set(p.user_id, p));
        setProfiles(map);
      }

      setCredits((data || []) as CreditResult[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group by project for ICDB-style view
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
        groups[key] = {
          name: credit.project_name,
          year: credit.year,
          url: credit.url,
          location: credit.location,
          client: credit.client_brand,
          credits: [],
          verifiedCount: 0,
        };
      }
      const profile = profiles.get(credit.user_id);
      groups[key].credits.push({ ...credit, profile });
      if (credit.verification_status === 'verified') groups[key].verifiedCount++;
    });

    // Sort by verified count, then by number of credits
    return Object.values(groups).sort((a, b) => {
      if (b.verifiedCount !== a.verifiedCount) return b.verifiedCount - a.verifiedCount;
      return b.credits.length - a.credits.length;
    });
  }, [credits, profiles]);

  return (
    <>
      <Helmet>
        <title>ICDB - Internet Creative Database | ThriveIN</title>
        <meta name="description" content="Search verified professional credits across film, music, events, fashion, art, and all creative industries. The definitive database for creative work history." />
      </Helmet>

      <div className="min-h-screen bg-background pb-20">
        {/* Hero */}
        <div className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 py-6 sm:py-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">ICDB</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Internet Creative Database — the definitive record of creative work</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-5">
              <span className="flex items-center gap-1">
                <Film className="h-3.5 w-3.5" /> {totalCount.toLocaleString()} credits
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> All creative industries
              </span>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects, roles, brands, or locations..."
                  className="pl-9 h-10"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
                  <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs">
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
                  onClick={() => { setVerifiedOnly(!verifiedOnly); setPage(0); }}
                >
                  <ShieldCheck className="h-3 w-3" />
                  Verified Only
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="container mx-auto px-4 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Searching credits...</p>
            </div>
          ) : credits.length === 0 ? (
            <div className="text-center py-16">
              <Database className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No credits found</h3>
              <p className="text-sm text-muted-foreground">Try a different search or category</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {projectGroups.map((project) => (
                  <Card key={project.name} className="overflow-hidden hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      {/* Project header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base truncate">{project.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-0.5">
                            {project.year && (
                              <span className="flex items-center gap-0.5">
                                <CalendarDays className="h-3 w-3" /> {project.year}
                              </span>
                            )}
                            {project.location && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" /> {project.location}
                              </span>
                            )}
                            {project.client && (
                              <span className="flex items-center gap-0.5">
                                <Building2 className="h-3 w-3" /> {project.client}
                              </span>
                            )}
                            <span>{project.credits.length} credit{project.credits.length !== 1 ? 's' : ''}</span>
                            {project.verifiedCount > 0 && (
                              <Badge variant="outline" className="text-[10px] gap-0.5 h-4 border-green-500/30 text-green-600">
                                <ShieldCheck className="h-2.5 w-2.5" />
                                {project.verifiedCount} verified
                              </Badge>
                            )}
                          </div>
                        </div>
                        {project.url && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" asChild>
                            <a href={project.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>

                      {/* Credits list */}
                      <div className="space-y-1.5">
                        {project.credits.map((credit) => (
                          <div
                            key={credit.id}
                            className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/profile/${credit.user_id}`)}
                          >
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={credit.profile?.avatar_url || ''} />
                              <AvatarFallback className="text-[10px]">
                                {credit.profile?.full_name?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {credit.profile?.full_name || 'Unknown'}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">{credit.role}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {credit.verification_status === 'verified' && (
                                <Badge variant="outline" className="text-[9px] gap-0.5 h-4 border-green-500/30 text-green-600">
                                  <ShieldCheck className="h-2 w-2" />
                                  Verified
                                </Badge>
                              )}
                              {(credit.endorsement_count || 0) > 0 && credit.verification_status !== 'verified' && (
                                <Badge variant="secondary" className="text-[9px] h-4">
                                  {credit.endorsement_count} endorsed
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalCount > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {page + 1} of {Math.ceil(totalCount / PAGE_SIZE)}
                  </span>
                  <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= totalCount} onClick={() => setPage(p => p + 1)}>
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CreditDatabase;
