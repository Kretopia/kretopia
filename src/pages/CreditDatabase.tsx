import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Search, Film, Tv, Music, Disc3, Video, Mic2, CalendarDays, Sparkles, Crown, Shirt, Megaphone, Briefcase, ShieldCheck, ExternalLink, Loader2, Users, Database, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CREDIT_TYPE_ICONS: Record<string, any> = {
  film: Film, movie: Film, short_film: Film, documentary: Film,
  tv: Tv, album: Disc3, single: Music, ep: Music, mixtape: Music,
  music_video: Video, web_series: Video, podcast: Mic2, audiobook: Mic2,
  theatre: Film, musical: Film, dance: Film, comedy: Film,
  spoken_word: Mic2, pantomime: Film, recital: Film, opera: Film,
  live_event: CalendarDays, concert: Music, festival: CalendarDays,
  carnival: Sparkles, pageant: Crown, fashion_show: Shirt,
  awards_show: Crown, exhibition: Sparkles, conference: Briefcase,
  launch_event: CalendarDays, youtube_series: Video, ugc_campaign: Video,
  livestream: Video, online_course: Briefcase, workshop: Briefcase,
  newsletter: Briefcase, commercial: Megaphone, brand_campaign: Megaphone,
  corporate: Briefcase, hosting: Mic2, voiceover: Mic2,
  influencer_campaign: Megaphone, ar_project: Briefcase,
  talent_management: Briefcase, booking: Briefcase, label_release: Disc3,
  publishing: Briefcase, curation: Sparkles,
};

const CATEGORY_GROUPS = [
  { label: "All", value: "all" },
  { label: "Film & TV", value: "film_tv", types: ["film", "movie", "tv", "short_film", "documentary", "music_video", "web_series"] },
  { label: "Music & Audio", value: "music", types: ["album", "single", "ep", "mixtape", "podcast", "audiobook"] },
  { label: "Performing Arts", value: "performing", types: ["theatre", "musical", "dance", "comedy", "spoken_word", "pantomime", "recital", "opera"] },
  { label: "Events & Productions", value: "events", types: ["live_event", "concert", "festival", "carnival", "pageant", "fashion_show", "awards_show", "exhibition", "conference", "launch_event"] },
  { label: "Content & Digital", value: "digital", types: ["youtube_series", "ugc_campaign", "livestream", "online_course", "workshop", "newsletter"] },
  { label: "Commercial", value: "commercial", types: ["commercial", "brand_campaign", "corporate", "hosting", "voiceover", "influencer_campaign"] },
  { label: "Business & Industry", value: "business", types: ["ar_project", "talent_management", "booking", "label_release", "publishing", "curation"] },
];

interface CreditResult {
  id: string;
  project_name: string;
  role: string;
  year: number | null;
  verification_status: string | null;
  url: string | null;
  platform: string | null;
  endorsement_count: number;
  user_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    primary_role: string | null;
    username: string | null;
  } | null;
}

const CreditDatabase = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [credits, setCredits] = useState<CreditResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchCredits();
  }, [search, category, page]);

  const fetchCredits = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('credits')
        .select('id, project_name, role, year, verification_status, url, platform, endorsement_count, user_id', { count: 'exact' })
        .order('year', { ascending: false, nullsFirst: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        query = query.or(`project_name.ilike.%${search}%,role.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      
      // Fetch profiles for each unique user_id
      const userIds = [...new Set((data || []).map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, primary_role, username')
        .in('user_id', userIds);
      
      const profileMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.user_id] = p;
        return acc;
      }, {});

      const enriched = (data || []).map(credit => ({
        ...credit,
        profiles: profileMap[credit.user_id] || null,
      }));

      setCredits(enriched as any[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group credits by project name for the "project page" view
  const projectGroups = credits.reduce((acc, credit) => {
    const key = credit.project_name.toLowerCase().trim();
    if (!acc[key]) {
      acc[key] = {
        name: credit.project_name,
        year: credit.year,
        url: credit.url,
        credits: [],
      };
    }
    acc[key].credits.push(credit);
    return acc;
  }, {} as Record<string, { name: string; year: number | null; url: string | null; credits: CreditResult[] }>);

  return (
    <>
      <Helmet>
        <title>Credit Database | ThriveIN - The Creative Industry Authority</title>
        <meta name="description" content="Search verified professional credits across film, music, events, and creative industries. The definitive database for creative work history." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 py-8 sm:py-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Credit Database</h1>
                <p className="text-sm text-muted-foreground">The definitive record of creative work</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-1">
                <Film className="h-4 w-4" /> {totalCount} credits
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> across all industries
              </span>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects, roles, or names..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                />
              </div>
              <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_GROUPS.map(g => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="container mx-auto px-4 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Searching credits...</p>
            </div>
          ) : credits.length === 0 ? (
            <div className="text-center py-16">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No credits found</h3>
              <p className="text-sm text-muted-foreground">Try a different search or category</p>
            </div>
          ) : (
            <>
              {/* Project-grouped view */}
              <div className="space-y-4">
                {Object.values(projectGroups).map((project) => (
                  <Card key={project.name} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{project.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {project.year && <span>{project.year}</span>}
                            <span>•</span>
                            <span>{project.credits.length} credit{project.credits.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        {project.url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={project.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {project.credits.map((credit) => {
                          const profile = credit.profiles;
                          return (
                            <div
                              key={credit.id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => navigate(`/profile/${credit.user_id}`)}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={profile?.avatar_url || ''} />
                                <AvatarFallback className="text-xs">
                                  {profile?.full_name?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {profile?.full_name || 'Unknown'}
                                </p>
                                <p className="text-xs text-muted-foreground">{credit.role}</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {credit.verification_status === 'verified' && (
                                  <Badge variant="outline" className="text-[10px] gap-0.5 border-primary/30 text-primary">
                                    <ShieldCheck className="h-2.5 w-2.5" />
                                    Verified
                                  </Badge>
                                )}
                                {(credit.endorsement_count || 0) > 0 && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {credit.endorsement_count} endorsed
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalCount > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page + 1} of {Math.ceil(totalCount / PAGE_SIZE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(page + 1) * PAGE_SIZE >= totalCount}
                    onClick={() => setPage(p => p + 1)}
                  >
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
