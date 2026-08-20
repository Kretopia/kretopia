import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UnifiedSearchDropdown } from "@/components/search/UnifiedSearchDropdown";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Film, ShieldCheck, Loader2, Sparkles,
  UserPlus, Globe, Music, Palette, Theater, Camera, Tv,
  Star, AlertCircle, RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveCreditThumbnail } from "@/lib/thumbnailExtractor";
import { EditorialPageHero } from "@/components/kretopia/EditorialPageHero";
import { CreditsBoard } from "@/components/kretopia/CreditsBoard";
import { EditorialChapter } from "@/components/kretopia/EditorialChapter";
import { Reveal } from "@/components/kretopia/Reveal";
import { Fingerprint, Handshake, FileCheck2 } from "lucide-react";

const ACCENT = "#FF2DA1";

const PROOF_POINTS = [
  { icon: FileCheck2, title: "Evidence first", body: "Links, files and receipts attached to the work — not a self-written bio." },
  { icon: Handshake, title: "Co-signed by humans", body: "The people who were there confirm it in one tap. No paperwork." },
  { icon: ShieldCheck, title: "Reviewed, then stamped", body: "Verified credits carry a stamp anyone can check, anywhere." },
  { icon: Fingerprint, title: "Yours forever", body: "Your record travels with you across cities, clients and industries." },
];


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

const SEARCH_RESULT_GROUPS = [
  { label: "All results", value: "all" as const, hint: "Everything that matched, newest first." },
  { label: "Projects", value: "project", hint: "Real productions and AI-suggested matches from across the web." },
  { label: "Creators", value: "creator", hint: "People on Kretopia with a credit matching your search." },
  { label: "Discovered on the web", value: "web", hint: "Found outside Kretopia — not yet part of the database." },
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
  verification_url?: string | null;
  verified_by_name?: string | null;
  verified_by_user_id?: string | null;
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
  // The DB-backed credit search resolves in well under a second; the edge
  // function's AI + web-scrape enrichment is the slow part (it calls
  // search-credits-web, the same multi-platform scraper behind the landing
  // hero search). Tracking them separately means real, on-Kretopia results
  // render the instant the fast query resolves instead of waiting on the
  // slowest of the two.
  const [webLoading, setWebLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [claimDialog, setClaimDialog] = useState<{ project: ICDBProject; role: ICDBProject['icdb_project_roles'] extends (infer T)[] | undefined ? T : never } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [trendingProjects, setTrendingProjects] = useState<ICDBProject[]>([]);
  const [recentCredits, setRecentCredits] = useState<UserCredit[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
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
            .select('id, project_name, role, year, verification_status, platform, location, client_brand, user_id, endorsement_count, thumbnail_url, primary_media_url, credit_category, url, verification_url, verified_by_name, verified_by_user_id')
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

  // Real per-category counts for the filter chips — one lightweight
  // COUNT-only query per category (no row payload), run once on mount, so
  // "Film & TV (128)" etc. reflects the actual database instead of sitting
  // as static decoration.
  useEffect(() => {
    (async () => {
      const nonAll = CATEGORY_GROUPS.filter((g) => g.value !== "all");
      const results = await Promise.all(
        nonAll.map(async (g) => {
          const types = Object.entries(TYPE_TO_CATEGORY).filter(([, cat]) => cat === g.value).map(([type]) => type);
          if (types.length === 0) return [g.value, 0] as const;
          const { count } = await supabase
            .from("credits")
            .select("id", { count: "exact", head: true })
            .in("credit_category", types);
          return [g.value, count ?? 0] as const;
        }),
      );
      const map: Record<string, number> = {};
      let total = 0;
      for (const [value, count] of results) {
        map[value] = count;
        total += count;
      }
      map.all = total;
      setCategoryCounts(map);
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
    setWebLoading(true);
    setSearchError(null);

    // The direct credits query and the search-icdb edge function (DB +
    // AI supplement) are independent — render the fast one the instant it
    // resolves rather than blocking on whichever is slower.
    let creditQuery = supabase
      .from('credits')
      .select('id, project_name, role, year, verification_status, platform, location, client_brand, user_id, endorsement_count, thumbnail_url, primary_media_url, credit_category, verification_url, verified_by_name, verified_by_user_id')
      .or(`project_name.ilike.%${debouncedSearch}%,role.ilike.%${debouncedSearch}%,client_brand.ilike.%${debouncedSearch}%`)
      .order('year', { ascending: false, nullsFirst: false })
      .limit(20);

    if (category !== 'all') {
      const types = Object.entries(TYPE_TO_CATEGORY).filter(([, cat]) => cat === category).map(([type]) => type);
      if (types.length > 0) {
        creditQuery = creditQuery.or(`project_type.in.(${types.join(',')}),credit_category.in.(${types.join(',')})`);
      }
    }

    const creditFetch = (async () => {
      try {
        const { data, error } = await creditQuery;
        if (error) throw error;
        const creditData = data || [];
        const userIds = [...new Set(creditData.map((c) => c.user_id))];
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
        console.error('Error searching credits:', err);
        setSearchError('Something went wrong searching the creative record.');
      } finally {
        setLoading(false);
      }
    })();

    const edgeFetch = supabase.functions.invoke('search-icdb', {
      body: { query: debouncedSearch, category: category !== 'all' ? category : undefined },
    }).then(({ data, error }) => {
      if (error) {
        console.warn('search-icdb edge function failed:', error);
        return;
      }
      setIcdbProjects(data?.projects || []);
      setAiSuggestions(data?.suggestions || []);
      setWebResults(data?.webResults || []);
      setProjectCount(data?.total || 0);
    }).catch((err) => {
      console.warn('search-icdb invocation error:', err);
    }).finally(() => {
      setWebLoading(false);
    });

    await Promise.all([creditFetch, edgeFetch]);
  }, [debouncedSearch, category, isResultsSearching]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleClaim = async () => {
    if (!claimDialog || !currentUserId) return;
    setClaiming(true);
    try {
      const { error } = await supabase.rpc('claim_icdb_role', { p_role_id: claimDialog.role.id });
      if (error) throw error;

      toast.success("Credit claimed! It's pending review before it shows as verified on your profile.");
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

  const searchControls = (
    <>
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
          const countsLoaded = Object.keys(categoryCounts).length > 0;
          const count = categoryCounts[g.value];
          // Hide empty categories once real counts are in — a chip nobody's
          // record matches isn't a useful filter. "All" always shows.
          if (countsLoaded && g.value !== "all" && !count) return null;
          return (
            <button
              key={g.value}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium shrink-0 transition-all border",
                isActive
                  ? "text-white border-[rgba(255,45,161,0.45)] bg-[rgba(255,45,161,0.14)]"
                  : "text-white/60 border-white/10 bg-white/[0.02] hover:text-white/90 hover:border-white/20"
              )}
              onClick={() => setCategory(g.value)}
            >
              <Icon className="h-3 w-3" />
              {g.label}
              {countsLoaded && <span className={isActive ? "text-white/70" : "text-white/35"}>{count ?? 0}</span>}
            </button>
          );
        })}
      </div>
    </>
  );


  return (
    <>
      <Helmet>
        <title>Verified Credits — Search Creative Work | Kretopia</title>
        <meta name="description" content="The IMDb of the creator economy. Search verified credits across film, TV, music, events, fashion, art, and more. Claim your work, get co-signed, build your Creative Passport." />
        <link rel="canonical" href="https://www.kretopia.com/credits" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.kretopia.com/credits" />
        <meta property="og:title" content="Verified Credits — Search Creative Work | Kretopia" />
        <meta property="og:description" content="The IMDb of the creator economy. Search verified credits, claim your work, get co-signed." />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Kretopia Verified Credits",
          url: "https://www.kretopia.com/credits",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://www.kretopia.com/credits?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        })}</script>
      </Helmet>

      <div className="dark min-h-screen bg-background pb-20" style={{ backgroundColor: "#05070D" }}>
        {currentUserId && (
          <div className="container mx-auto px-4 pt-3 flex justify-end">
            <button
              onClick={() => navigate("/credits/mine")}
              className="inline-flex items-center gap-1.5 px-4 h-8 rounded-full text-[12px] font-semibold bg-[hsl(var(--signal-teal))]/10 text-[hsl(var(--signal-teal))] border border-[hsl(var(--signal-teal))]/30 hover:bg-[hsl(var(--signal-teal))]/15 transition-colors"
            >
              <Star className="h-3.5 w-3.5" />
              My Stamps
            </button>
          </div>
        )}


        <>

        {!isSearchActive && (
          <EditorialPageHero
            kicker="Verified Credits"
            oneLine
            title="Verified Credits."
            accentTitle="Proof you can't fake."
            subtitle="Search any project, person, or production across the global creative industry — and see exactly what backs every claim."
          />
        )}

        {/* I — The search */}
        {isSearchActive ? (
          <div className="py-4" style={{ backgroundColor: "#05070D" }}>
            <div className="container mx-auto px-4">{searchControls}</div>
          </div>
        ) : (
          <EditorialChapter index="I" kicker="The search" title="Start with a name." accentWord="Any name." align="center" tightenTop>
            <Reveal>{searchControls}</Reveal>
          </EditorialChapter>
        )}



        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Searching the creative record...</p>
            </div>
          ) : searchError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <AlertCircle className="h-10 w-10 text-destructive/60" />
              <p className="text-sm font-medium">{searchError}</p>
              <button
                onClick={() => fetchResults()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <RefreshCw className="h-3 w-3" />
                Try again
              </button>
            </div>
          ) : isResultsSearching ? (
            hasResults ? (
              <div className="py-4">
                <CreditsBoard
                  title="Search results"
                  groups={SEARCH_RESULT_GROUPS}
                  rows={[
                    ...icdbProjects.map((project) => ({
                      id: project.id,
                      group: "project",
                      title: project.title,
                      subtitle: project.client_brand,
                      typeLabel: formatType(project.type),
                      year: project.year,
                      imageUrl: project.cover_image_url,
                      verified: project.is_verified,
                      onClick: () => navigate(`/credits/project/${project.id}`),
                    })),
                    ...aiSuggestions.map((s, i) => ({
                      id: `ai-${i}`,
                      group: "project",
                      title: s.title,
                      subtitle: s.client_brand,
                      typeLabel: formatType(s.type),
                      year: s.year,
                      isAI: true,
                      onClick: () => {},
                    })),
                    ...userCredits.map((credit) => ({
                      id: credit.id,
                      group: "creator",
                      title: credit.project_name,
                      subtitle: profiles.get(credit.user_id)?.full_name || credit.role,
                      typeLabel: formatType(credit.credit_category || ""),
                      year: credit.year,
                      imageUrl: resolveCreditThumbnail(credit.thumbnail_url, credit.primary_media_url, credit.url),
                      verified: credit.verification_status === "verified",
                      onClick: () => navigate(`/profile/${credit.user_id}`),
                    })),
                    ...webResults.map((result, i) => ({
                      id: `web-${i}`,
                      group: "web",
                      title: result.title,
                      subtitle: result.platform,
                      typeLabel: formatType(result.type || "project"),
                      year: result.year,
                      imageUrl: result.image_url,
                      isExternal: true,
                      onClick: () => result.url && window.open(result.url, "_blank"),
                    })),
                  ]}
                />
              </div>
            ) : (
              <div className="text-center py-16">
                <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <h3 className="text-base font-semibold mb-1">No results for "{debouncedSearch}"</h3>
                <p className="text-sm text-muted-foreground">Try different keywords or browse by category</p>
              </div>
            )
          ) : (
            /* Browse mode — one dashboard board inside an editorial chapter */
            <EditorialChapter index="II" kicker="The record" title="Everything already" accentWord="on file.">
              <Reveal>

              <CreditsBoard
                loading={initialLoading}
                rows={[
                  ...recentCredits.map((credit) => {
                    const img = resolveCreditThumbnail(credit.thumbnail_url, credit.primary_media_url, credit.url);
                    return {
                      id: credit.id,
                      group: (img ? "featured" : "other") as "featured" | "other",
                      title: credit.project_name,
                      subtitle: credit.role,
                      typeLabel: formatType(credit.credit_category || ""),
                      year: credit.year,
                      imageUrl: img,
                      verified: credit.verification_status === "verified",
                      onClick: () => navigate(`/profile/${credit.user_id}`),
                    };
                  }),
                  ...trendingProjects.map((project) => ({
                    id: project.id,
                    group: "recent" as const,
                    title: project.title,
                    subtitle: project.client_brand,
                    typeLabel: formatType(project.type),
                    year: project.year,
                    imageUrl: project.cover_image_url,
                    verified: project.is_verified,
                    onClick: () => navigate(`/credits/project/${project.id}`),
                  })),
                ]}
              />
              </Reveal>
            </EditorialChapter>
          )}

        </div>

        {!isSearchActive && (
          <>
            {/* III — Why verified */}
            <EditorialChapter index="III" kicker="Why it counts" title="Anyone can claim it." accentWord="You can prove it.">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {PROOF_POINTS.map((p, i) => (
                  <Reveal key={p.title} delayIndex={i}>
                    <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-[rgba(255,45,161,0.35)]">
                      <span
                        className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{ backgroundColor: "rgba(255,45,161,0.1)" }}
                      >
                        <p.icon className="h-4 w-4" style={{ color: ACCENT }} />
                      </span>
                      <p className="text-white font-semibold text-sm mb-1.5">{p.title}</p>
                      <p className="text-sm leading-relaxed text-white/55">{p.body}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
              <Reveal delayIndex={2}>
                <p className="mt-10 max-w-2xl font-serif italic text-lg leading-relaxed text-white/80">
                  "A credit is only worth what backs it. Here, every line has someone or something standing behind it."
                </p>
              </Reveal>
            </EditorialChapter>

          </>
        )}
        </>
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

export default CreditDatabase;
