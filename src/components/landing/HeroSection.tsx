import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Database, Verified, Briefcase, MapPin, ArrowRight, TrendingUp, Users, Sparkles, CalendarDays, PlusCircle, Newspaper, Mic2, Handshake, DollarSign, FolderKanban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { QuickPostModal } from "@/components/QuickPostModal";

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
  const [quickPostType, setQuickPostType] = useState<"gig" | "event" | null>(null);

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

  const roles = ["Filmmaker", "Musician", "Photographer", "Designer", "Dancer", "Stylist", "Producer", "DJ", "Writer", "Model"];
  const [roleIdx, setRoleIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setRoleIdx(i => (i + 1) % roles.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative bg-[hsl(230,20%,7%)]">
      {/* Background glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_10%,hsl(235,65%,52%,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_90%_90%,hsl(45,90%,55%,0.04),transparent_50%)]" />

      <div className="container relative mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-16">
        
        {/* ═══════ HERO — Identity-first ═══════ */}
        <div className="text-center pt-6 sm:pt-10 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(235,70%,70%)] mb-4">
            The creative industry's home
          </p>

          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-2 leading-[1.15]">
            You're a{" "}
            <span className="text-[hsl(235,70%,65%)] inline-block min-w-[120px] sm:min-w-[180px] transition-all duration-500">
              {roles[roleIdx]}
            </span>
            <br />
            <span className="text-[hsl(220,10%,55%)]">Your work should speak for itself.</span>
          </h1>

          <p className="text-sm sm:text-base text-[hsl(220,10%,50%)] max-w-lg mx-auto mt-3 mb-6 leading-relaxed">
            Build your verified creative record. Get discovered by brands. 
            Land gigs. Get paid — all in one place.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Link to="/auth" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[hsl(235,65%,52%)] px-7 py-3.5 text-sm font-bold text-white hover:bg-[hsl(235,65%,58%)] transition-all shadow-[0_4px_20px_hsl(235,65%,52%,0.3)]">
              Claim Your Credits — Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/gigs" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-[hsl(230,15%,22%)] bg-[hsl(230,18%,11%)] px-7 py-3.5 text-sm font-semibold text-white hover:border-[hsl(235,65%,52%,0.4)] transition-all">
              <Briefcase className="h-4 w-4 text-success" /> Browse Gigs
            </Link>
          </div>

          {/* Social proof stats */}
          <div className="flex items-center justify-center gap-6 text-[11px] text-[hsl(220,10%,42%)]">
            <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {stats.creators.toLocaleString()} Creators</span>
            <span className="flex items-center gap-1.5"><Database className="h-3 w-3" /> {stats.credits.toLocaleString()} Credits</span>
            <span className="flex items-center gap-1.5"><Briefcase className="h-3 w-3" /> {stats.gigs} Live Gigs</span>
          </div>
        </div>

        {/* ═══════ HOW IT WORKS — 3-step value prop ═══════ */}
        <div className="grid grid-cols-3 gap-3 my-6">
          {[
            { step: "1", icon: Database, title: "Claim Credits", desc: "Add your work to the verified creative ledger — like IMDb, but for every industry" },
            { step: "2", icon: Users, title: "Get Discovered", desc: "Brands and collaborators find you by your verified track record, not just a portfolio" },
            { step: "3", icon: DollarSign, title: "Get Paid", desc: "Land gigs, send invoices, and manage projects — all from one creative HQ" },
          ].map((s) => (
            <div key={s.step} className="text-center p-3 sm:p-4 rounded-2xl border border-[hsl(230,15%,16%)] bg-[hsl(230,18%,9%)]">
              <div className="h-10 w-10 rounded-xl bg-[hsl(235,65%,52%,0.1)] flex items-center justify-center mx-auto mb-2.5">
                <s.icon className="h-4.5 w-4.5 text-[hsl(235,70%,65%)]" />
              </div>
              <p className="text-xs font-bold text-white mb-1">{s.title}</p>
              <p className="text-[9px] sm:text-[10px] text-[hsl(220,10%,45%)] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* ═══════ SEARCH BAR — below the fold ═══════ */}
        <div className="mb-6">
          <p className="text-center text-[10px] uppercase tracking-widest text-[hsl(220,10%,38%)] font-semibold mb-3">
            Search the creative economy
          </p>
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
                  className="w-full h-13 rounded-2xl border border-[hsl(230,15%,20%)] bg-[hsl(230,18%,11%)] pl-12 pr-14 text-sm text-white shadow-[0_4px_30px_hsl(235,65%,52%,0.08)] focus:outline-none focus:border-[hsl(235,65%,52%)] focus:shadow-[0_0_40px_hsl(235,65%,52%,0.15)] transition-all placeholder:text-[hsl(220,10%,38%)]"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl bg-[hsl(235,65%,52%)] text-white flex items-center justify-center hover:bg-[hsl(235,65%,58%)] transition-colors">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Suggestions dropdown */}
            {showSuggestions && (query.trim().length >= 2 || suggestions.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-[hsl(230,15%,20%)] bg-[hsl(230,18%,10%)] shadow-2xl z-50 overflow-hidden">
                {loading && <div className="px-4 py-3 text-sm text-[hsl(220,10%,50%)] animate-pulse">Searching...</div>}
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
        </div>

        {/* ═══════ SOCIAL PROOF GRID ═══════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

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

        {/* Quick Post CTAs */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => setQuickPostType("gig")}
            className="rounded-2xl border border-[hsl(230,15%,16%)] bg-[hsl(230,18%,9%)] p-4 hover:border-success/40 transition-all group text-left"
          >
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center mb-3 group-hover:bg-success/15 transition-colors">
              <PlusCircle className="h-5 w-5 text-success" />
            </div>
            <p className="text-xs font-semibold text-white mb-1">Post a Gig</p>
            <p className="text-[10px] text-[hsl(220,10%,45%)] leading-relaxed">Find verified talent — post in 30 seconds</p>
          </button>
          <button
            onClick={() => setQuickPostType("event")}
            className="rounded-2xl border border-[hsl(230,15%,16%)] bg-[hsl(230,18%,9%)] p-4 hover:border-[hsl(235,65%,52%,0.4)] transition-all group text-left"
          >
            <div className="h-10 w-10 rounded-xl bg-[hsl(235,65%,52%,0.1)] flex items-center justify-center mb-3 group-hover:bg-[hsl(235,65%,52%,0.15)] transition-colors">
              <CalendarDays className="h-5 w-5 text-[hsl(235,70%,65%)]" />
            </div>
            <p className="text-xs font-semibold text-white mb-1">Post an Event</p>
            <p className="text-[10px] text-[hsl(220,10%,45%)] leading-relaxed">Host creative meetups & workshops</p>
          </button>
        </div>

        <QuickPostModal
          open={quickPostType !== null}
          onOpenChange={(open) => !open && setQuickPostType(null)}
          type={quickPostType || "gig"}
        />

        {/* Talent Manager CTA */}
        <div className="mt-4 rounded-2xl border border-[hsl(45,90%,55%,0.15)] bg-gradient-to-r from-[hsl(45,90%,55%,0.05)] to-[hsl(230,18%,9%)] p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-[hsl(45,90%,55%,0.1)] flex items-center justify-center shrink-0">
              <Handshake className="h-5 w-5 text-[hsl(45,90%,60%)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white mb-1">Agencies & Talent Managers</p>
              <p className="text-[11px] text-[hsl(220,10%,50%)] leading-relaxed mb-3">
                Onboard your roster, post opportunities, and earn 10% commission on every booking through your network.
              </p>
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[hsl(45,90%,60%)] hover:underline">
                Start earning <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-[hsl(220,10%,38%)] mt-10 pb-4">
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
