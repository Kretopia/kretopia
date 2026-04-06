import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Database, Verified, Briefcase, MapPin, ArrowRight, TrendingUp, Users, Sparkles, CalendarDays, PlusCircle, Newspaper, Mic2, Handshake, DollarSign, FolderKanban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Suggestion {
  type: "creator" | "credit" | "gig";
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string | null;
}

interface TrendingCredit {
  id: string;
  project_name: string;
  role: string;
  verification_status: string | null;
  credit_category: string | null;
  thumbnail_url: string | null;
  user_id: string;
  year: number | null;
}

interface FeaturedCreator {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
  verification_tier: string | null;
}

interface ActiveGig {
  id: string;
  title: string;
  type: string;
  location: string | null;
  created_at: string | null;
}

export const HeroSection = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trendingCredits, setTrendingCredits] = useState<TrendingCredit[]>([]);
  const [featuredCreators, setFeaturedCreators] = useState<FeaturedCreator[]>([]);
  const [activeGigs, setActiveGigs] = useState<ActiveGig[]>([]);
  const [stats, setStats] = useState({ creators: 0, credits: 0, gigs: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboard = async () => {
      const [creditsRes, creatorsRes, gigsRes, statsCreators, statsCredits, statsGigs] = await Promise.all([
        supabase
          .from("credits")
          .select("id, project_name, role, verification_status, credit_category, thumbnail_url, user_id, year")
          .in("verification_status", ["enterprise", "peer", "verified"])
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, role, verification_tier")
          .eq("onboarding_completed", true)
          .not("avatar_url", "is", null)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("opportunities")
          .select("id, title, type, location, created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase.from("profiles").select("user_id", { count: "exact", head: true }).eq("onboarding_completed", true),
        supabase.from("credits").select("id", { count: "exact", head: true }),
        supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);
      setTrendingCredits(creditsRes.data || []);
      setFeaturedCreators(creatorsRes.data || []);
      setActiveGigs(gigsRes.data || []);
      setStats({
        creators: statsCreators.count || 0,
        credits: statsCredits.count || 0,
        gigs: statsGigs.count || 0,
      });
    };
    fetchDashboard();
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Live search suggestions
  useEffect(() => {
    if (query.trim().length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const q = `%${query.trim()}%`;
      try {
        const [profiles, credits, opps] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name, avatar_url, role").or(`full_name.ilike.${q},role.ilike.${q}`).eq("onboarding_completed", true).limit(4),
          supabase.from("credits").select("id, project_name, role").or(`project_name.ilike.${q},role.ilike.${q}`).limit(4),
          supabase.from("opportunities").select("id, title, type").eq("status", "active").ilike("title", q).limit(3),
        ]);
        setSuggestions([
          ...(profiles.data || []).map((p) => ({ type: "creator" as const, id: p.user_id, title: p.full_name || "Creator", subtitle: p.role || undefined, avatar: p.avatar_url })),
          ...(credits.data || []).map((c) => ({ type: "credit" as const, id: c.id, title: c.project_name, subtitle: c.role })),
          ...(opps.data || []).map((o) => ({ type: "gig" as const, id: o.id, title: o.title, subtitle: o.type })),
        ]);
      } catch { setSuggestions([]); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSuggestionClick = (s: Suggestion) => {
    setShowSuggestions(false);
    if (s.type === "creator") navigate(`/profile/${s.id}`);
    else if (s.type === "gig") navigate(`/opportunity/${s.id}`);
    else navigate(`/search?q=${encodeURIComponent(s.title)}`);
  };

  const typeLabel = { creator: "Creator", credit: "Credit", gig: "Production" };
  const typeColor = { creator: "text-primary", credit: "text-accent", gig: "text-success" };

  return (
    <section className="relative min-h-screen bg-[hsl(230,20%,7%)] overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_10%,hsl(235,65%,52%,0.06),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_90%_90%,hsl(45,90%,55%,0.03),transparent_50%)]" />

      <div className="container relative mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-16">
        {/* Search hero */}
        <div className="text-center pt-8 sm:pt-12 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(235,65%,52%,0.25)] bg-[hsl(235,65%,52%,0.08)] px-4 py-1.5 text-[11px] font-medium text-[hsl(235,70%,75%)] mb-5">
            <Database className="h-3 w-3" />
            ThriveCredits™ — The Creative Industry's Verified Ledger
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-3 leading-tight">
            Search any creator. Verify any credit.
          </h1>
          <p className="text-sm text-[hsl(220,10%,50%)] mb-6 max-w-md mx-auto">
            AI-powered search across the creative economy — people, productions, and opportunities.
          </p>

          {/* Search bar */}
          <div ref={wrapperRef} className="relative max-w-xl mx-auto">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(220,10%,40%)]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Try 'Beyoncé', 'Squid Game', 'Photographer in Lagos'..."
                  className="w-full h-14 rounded-2xl border border-[hsl(230,15%,20%)] bg-[hsl(230,18%,11%)] pl-12 pr-14 text-sm text-white shadow-[0_4px_30px_hsl(235,65%,52%,0.08)] focus:outline-none focus:border-[hsl(235,65%,52%)] focus:shadow-[0_0_40px_hsl(235,65%,52%,0.15)] transition-all placeholder:text-[hsl(220,10%,38%)]"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-[hsl(235,65%,52%)] text-white flex items-center justify-center hover:bg-[hsl(235,65%,58%)] transition-colors">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Suggestions dropdown */}
            {showSuggestions && (query.trim().length >= 2 || suggestions.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-[hsl(230,15%,20%)] bg-[hsl(230,18%,10%)] shadow-2xl z-50 overflow-hidden">
                {loading && <div className="px-4 py-3 text-sm text-[hsl(220,10%,50%)] animate-pulse">Searching platform + AI knowledge...</div>}
                {!loading && suggestions.length === 0 && query.trim().length >= 2 && (
                  <div className="px-4 py-3 text-sm text-[hsl(220,10%,50%)]">
                    <Sparkles className="inline h-3.5 w-3.5 mr-1.5 text-[hsl(235,70%,65%)]" />
                    Press Enter for AI-powered deep search
                  </div>
                )}
                {suggestions.map((s, i) => (
                  <button key={`${s.type}-${s.id}-${i}`} onClick={() => handleSuggestionClick(s)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[hsl(230,15%,15%)] transition-colors text-left">
                    {s.type === "creator" ? (
                      <Avatar className="h-8 w-8"><AvatarImage src={s.avatar || ""} /><AvatarFallback className="text-xs bg-[hsl(235,65%,52%,0.2)] text-[hsl(235,70%,75%)]">{(s.title || "?")[0]}</AvatarFallback></Avatar>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-[hsl(235,65%,52%,0.15)] flex items-center justify-center"><Database className="h-3.5 w-3.5 text-[hsl(235,70%,65%)]" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{s.title}</p>
                      {s.subtitle && <p className="text-xs text-[hsl(220,10%,50%)] truncate">{s.subtitle}</p>}
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 border-[hsl(230,15%,25%)] ${typeColor[s.type]}`}>{typeLabel[s.type]}</Badge>
                  </button>
                ))}
                {query.trim().length >= 2 && suggestions.length > 0 && (
                  <button onClick={handleSubmit as any} className="w-full px-4 py-3 text-sm text-[hsl(235,70%,65%)] font-medium hover:bg-[hsl(230,15%,15%)] transition-colors border-t border-[hsl(230,15%,18%)] flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Deep search for "{query}"
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex items-center justify-center gap-6 mt-5 text-[11px] text-[hsl(220,10%,42%)]">
            <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {stats.creators} Creators</span>
            <span className="flex items-center gap-1.5"><Database className="h-3 w-3" /> {stats.credits} Credits</span>
            <span className="flex items-center gap-1.5"><Briefcase className="h-3 w-3" /> {stats.gigs} Active Gigs</span>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">

          {/* Trending Productions */}
          <div className="lg:col-span-2 rounded-2xl border border-[hsl(230,15%,16%)] bg-[hsl(230,18%,9%)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[hsl(220,10%,50%)] flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-[hsl(235,70%,65%)]" />
                Trending Productions
              </h2>
              <Link to="/search?q=verified" className="text-[10px] text-[hsl(235,70%,65%)] hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {trendingCredits.slice(0, 6).map((c) => (
                <button key={c.id} onClick={() => navigate(`/production?name=${encodeURIComponent(c.project_name)}`)} className="group text-left">
                  <div className="relative rounded-xl overflow-hidden border border-[hsl(230,15%,18%)] hover:border-[hsl(235,65%,52%,0.4)] transition-all bg-[hsl(230,18%,11%)]">
                    {c.thumbnail_url ? (
                      <div className="aspect-[4/3] overflow-hidden">
                        <img src={c.thumbnail_url} alt={c.project_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(230,20%,7%)] via-transparent to-transparent" />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-[hsl(230,15%,13%)] flex items-center justify-center">
                        <Database className="h-6 w-6 text-[hsl(230,15%,22%)]" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Verified className="h-2.5 w-2.5 text-[hsl(235,70%,65%)]" />
                        <span className="text-[8px] font-medium text-[hsl(235,70%,70%)] uppercase tracking-wide">Verified</span>
                      </div>
                      <p className="text-[11px] font-semibold text-white leading-tight line-clamp-2">{c.project_name}</p>
                      <p className="text-[9px] text-[hsl(220,10%,48%)] mt-0.5">{c.role}{c.year ? ` · ${c.year}` : ''}</p>
                    </div>
                  </div>
                </button>
              ))}
              {trendingCredits.length === 0 && Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[hsl(230,15%,18%)] bg-[hsl(230,18%,11%)] aspect-[4/3] animate-pulse" />
              ))}
            </div>
          </div>

          {/* Open Gigs */}
          <div className="rounded-2xl border border-[hsl(230,15%,16%)] bg-[hsl(230,18%,9%)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[hsl(220,10%,50%)] flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-success" />
                Open Gigs
              </h2>
              <Link to="/gigs" className="text-[10px] text-[hsl(235,70%,65%)] hover:underline flex items-center gap-1">
                Browse <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2.5">
              {activeGigs.map((g) => (
                <button key={g.id} onClick={() => navigate(`/opportunity/${g.id}`)} className="w-full text-left rounded-xl border border-[hsl(230,15%,18%)] bg-[hsl(230,18%,11%)] p-3 hover:border-[hsl(235,65%,52%,0.4)] transition-all">
                  <Badge className="text-[8px] mb-1.5 bg-success/15 text-success border-success/25">{g.type}</Badge>
                  <p className="text-xs font-semibold text-white line-clamp-2 leading-tight">{g.title}</p>
                  {g.location && (
                    <p className="text-[10px] text-[hsl(220,10%,42%)] mt-1 flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" /> {g.location}
                    </p>
                  )}
                </button>
              ))}
              {activeGigs.length === 0 && (
                <div className="text-center py-6 text-[hsl(220,10%,35%)] text-xs">No active gigs yet</div>
              )}
            </div>
          </div>

          {/* Recently Verified Creators */}
          <div className="lg:col-span-2 rounded-2xl border border-[hsl(230,15%,16%)] bg-[hsl(230,18%,9%)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[hsl(220,10%,50%)] flex items-center gap-2">
                <Verified className="h-3.5 w-3.5 text-[hsl(235,70%,65%)]" />
                Recently Verified Creators
              </h2>
              <Link to="/auth" className="text-[10px] text-[hsl(235,70%,65%)] hover:underline flex items-center gap-1">
                Claim yours <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {featuredCreators.map((c) => (
                <button key={c.user_id} onClick={() => navigate(`/profile/${c.user_id}`)} className="shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl border border-[hsl(230,15%,18%)] bg-[hsl(230,18%,11%)] hover:border-[hsl(235,65%,52%,0.4)] transition-all w-[100px]">
                  <Avatar className="h-12 w-12 border-2 border-[hsl(235,65%,52%,0.3)]">
                    <AvatarImage src={c.avatar_url || ""} />
                    <AvatarFallback className="bg-[hsl(235,65%,52%,0.15)] text-[hsl(235,70%,75%)] text-xs">{(c.full_name || "?")[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-center min-w-0 w-full">
                    <p className="text-[11px] font-semibold text-white truncate">{c.full_name}</p>
                    <p className="text-[9px] text-[hsl(220,10%,45%)] truncate">{c.role}</p>
                  </div>
                </button>
              ))}
              {featuredCreators.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shrink-0 w-[100px] h-[120px] rounded-xl border border-[hsl(230,15%,18%)] bg-[hsl(230,18%,11%)] animate-pulse" />
              ))}
            </div>
          </div>

          {/* CTA card */}
          <div className="rounded-2xl border border-[hsl(235,65%,52%,0.25)] bg-gradient-to-br from-[hsl(235,65%,52%,0.1)] to-[hsl(230,18%,9%)] p-5 flex flex-col justify-between">
            <div>
              <Sparkles className="h-6 w-6 text-[hsl(235,70%,65%)] mb-3" />
              <h3 className="text-sm font-bold text-white mb-2">Your career deserves a verified record</h3>
              <p className="text-[11px] text-[hsl(220,10%,50%)] leading-relaxed">
                Join ThriveIN to claim your credits, build your verified professional identity, and get discovered by brands and collaborators.
              </p>
            </div>
            <Link to="/auth" className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(235,65%,52%)] px-4 py-3 text-xs font-semibold text-white hover:bg-[hsl(235,65%,58%)] transition-colors">
              Claim Your Credits <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-[hsl(220,10%,38%)] mt-10">
          <Link to="/about" className="hover:text-white transition-colors">About</Link>
          <span className="text-[hsl(230,15%,20%)]">·</span>
          <Link to="/faq" className="hover:text-white transition-colors">FAQ</Link>
          <span className="text-[hsl(230,15%,20%)]">·</span>
          <Link to="/auth" className="hover:text-white transition-colors">Register as Brand</Link>
        </div>
      </div>
    </section>
  );
};
