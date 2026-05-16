import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Database, Verified, Briefcase, MapPin, ArrowRight, TrendingUp, Users, Sparkles, CalendarDays, PlusCircle, Newspaper, Mic2, Handshake, DollarSign, FolderKanban, Shield, Zap, Star, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { QuickPostModal } from "@/components/QuickPostModal";
import { CreditCoverPlaceholder } from "@/components/profile/CreditCoverPlaceholder";
import { OAuthQuickButtons } from "@/components/landing/OAuthQuickButtons";
import heroCreators from "@/assets/hero-creators.jpg";
import { useTrinidadVoice } from "@/hooks/useTrinidadVoice";

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
  const { pick: pickVoice, enabled: ttVoice } = useTrinidadVoice();

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

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || submitting) return;
    setSubmitting(true);
    setShowSuggestions(false);

    // Pre-fetch claim search results so Auth lands on "Which of these are yours?" directly.
    // Cache by query (24h) so repeat searches show the SAME results — no more flipping people.
    try {
      const cacheKey = `claim_search:${q.toLowerCase()}`;
      let cached: any = null;
      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.ts && Date.now() - parsed.ts < 24 * 60 * 60 * 1000) cached = parsed;
        }
      } catch {}

      let results: any[] = cached?.results || [];
      if (!cached) {
        const { data } = await supabase.functions.invoke("search-credits-web", { body: { query: q } });
        results = data?.results || [];
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), query: q, results }));
        } catch {}
      }

      // Stash for the claim flow on /auth to consume immediately
      try {
        sessionStorage.setItem(
          "claim_intent",
          JSON.stringify({ q, source: "landing", results, ts: Date.now() }),
        );
      } catch {}
    } catch (err) {
      console.warn("[hero-search] prefetch failed, falling back to in-auth search", err);
    } finally {
      setSubmitting(false);
      navigate(`/auth?tab=signup&claim=1&q=${encodeURIComponent(q)}`);
    }
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
    <section className="relative bg-card overflow-hidden">
      {/* Layered cinematic glows */}
      <div className="pointer-events-none absolute -top-40 -left-20 h-[600px] w-[600px] rounded-full bg-primary/25 blur-[160px]" />
      <div className="pointer-events-none absolute top-20 -right-20 h-[500px] w-[500px] rounded-full bg-[hsl(282_95%_60%/0.18)] blur-[140px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container relative mx-auto max-w-7xl px-4 sm:px-6 pt-6 sm:pt-10 pb-12 sm:pb-20">

        {/* ═══════ CINEMATIC HERO STAGE ═══════ */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center mb-16 sm:mb-24">

          {/* LEFT — Headline + CTA */}
          <div className="relative z-10 text-center lg:text-left order-2 lg:order-1">
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-energy mb-6 px-3 py-1 rounded-full border border-energy/30 bg-energy/[0.04]">
              <span className="h-1.5 w-1.5 rounded-full bg-energy animate-pulse" />
              {pickVoice("The Creative OS", "Built for T&T Creatives")}
            </p>

            <h1 className="text-[2.75rem] sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-[-0.04em] text-foreground leading-[0.92] mb-6">
              {ttVoice ? (
                <>
                  Make it.<br />
                  Own it.<br />
                  Get{" "}
                  <span className="text-energy-glow">paid.</span>
                </>
              ) : (
                <>
                  Make it.<br />
                  Own it.<br />
                  Get{" "}
                  <span className="text-energy-glow">paid.</span>
                </>
              )}
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto lg:mx-0 leading-relaxed mb-3">
              {ttVoice ? (
                <>
                  Whether yuh in Carnival, Soca, Film, Fashion or Design — find verified{" "}
                  <span className="text-primary font-semibold inline-block min-w-[90px] sm:min-w-[130px] transition-all duration-500">
                    {roles[roleIdx].toLowerCase()}s
                  </span>{" "}
                  right here in T&T. Build credits, link collabs, get paid.
                </>
              ) : (
                <>
                  Where{" "}
                  <span className="text-primary font-semibold inline-block min-w-[90px] sm:min-w-[130px] transition-all duration-500">
                    {roles[roleIdx]}s
                  </span>{" "}
                  build verified credits, connect with collaborators, and get paid.
                </>
              )}
            </p>

            <p className="text-xs text-muted-foreground/60 mb-7">
              {pickVoice(
                "Free to join · Early creators get priority access",
                "Free to start · No credit card · Made for we",
              )}
            </p>

            <div className="flex items-center justify-center lg:justify-start gap-3 mb-8 flex-wrap">
              <Link to="/auth" className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-energy text-energy-foreground px-8 py-4 text-sm font-black shadow-glow-lime hover:scale-[1.03] transition-all uppercase tracking-wider">
                {pickVoice("Get Started", "Link Up Now")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/scout" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/60 px-6 py-4 text-sm font-semibold text-foreground hover:border-primary/50 transition-all">
                <Briefcase className="h-4 w-4 text-primary" /> {pickVoice("Browse Gigs", "See Wha' Goin' On")}
              </Link>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-5 text-[11px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><Users className="h-3 w-3 text-primary" /> {stats.creators.toLocaleString()} Creators</span>
              <span className="flex items-center gap-1.5"><Database className="h-3 w-3 text-primary" /> {stats.credits.toLocaleString()} Credits</span>
              <span className="flex items-center gap-1.5"><Briefcase className="h-3 w-3 text-energy" /> {stats.gigs} Live</span>
            </div>
          </div>

          {/* RIGHT — Cinematic creator image with MATCH overlay */}
          <div className="relative order-1 lg:order-2">
            <div className="relative aspect-[4/5] lg:aspect-[3/4] rounded-3xl overflow-hidden border border-primary/25 shadow-glow">
              <img
                src={heroCreators}
                alt="Two creative collaborators captured in cinematic editorial light"
                className="absolute inset-0 w-full h-full object-cover"
                width={1280}
                height={1600}
              />
              {/* Subtle gradient for overlay legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/20" />

              {/* Signature Smart Match card — compact on mobile so it doesn't cover faces */}
              <div className="absolute top-2 right-2 sm:top-6 sm:right-6 animate-fade-in">
                <div className="rounded-xl sm:rounded-2xl border-2 border-energy/60 bg-background/85 px-2.5 py-2 sm:p-4 shadow-glow-lime sm:min-w-[150px]">
                  <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-0.5 sm:mb-1">Smart Match</p>
                  <p className="text-xl sm:text-4xl font-black text-energy-glow tracking-tighter leading-none">94%</p>
                  <p className="hidden sm:block text-[10px] text-foreground/80 mt-1.5 leading-tight">Photographer × Producer<br/>2.3km away</p>
                </div>
              </div>

              {/* Verified credit chip — top-left */}
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/85 px-3 py-1.5">
                  <Verified className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Verified</span>
                </div>
              </div>

              {/* Chat bubble — bottom-left */}
              <div className="absolute bottom-5 left-4 sm:bottom-6 sm:left-6 max-w-[230px] animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="rounded-2xl rounded-bl-sm border border-primary/40 bg-card/95 p-3 shadow-xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <MessageCircle className="h-3 w-3 text-primary" />
                    </div>
                    <p className="text-[10px] font-bold text-foreground">Maya · Photographer</p>
                  </div>
                  <p className="text-xs text-foreground/90 leading-snug">"Your sound is exactly what this series needs. Coffee tomorrow?"</p>
                </div>
              </div>
            </div>

            {/* Decorative glow under image */}
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-energy/10 blur-2xl" />
          </div>
        </div>

        {/* ═══════ HOW IT WORKS — 3-step value prop ═══════ */}
        <div className="grid grid-cols-3 gap-3 my-6">
        {[
            { step: "1", icon: Database, title: "Claim Credits", desc: "Add your work to the verified creative ledger — like IMDb, but for every industry" },
            { step: "2", icon: Users, title: "Get Discovered", desc: "Brands and collaborators find you by your verified track record, not just a portfolio" },
            { step: "3", icon: DollarSign, title: "Get Paid", desc: "Land gigs, send invoices, and manage projects — all from one creative HQ" },
          ].map((s) => (
            <div key={s.step} className="text-center p-3 sm:p-4 rounded-2xl border border-border bg-card">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2.5">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-bold text-foreground mb-1">{s.title}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* ═══════ ACTIVATION BLOCK — OAuth-first, search secondary ═══════ */}
        <div className="mb-6">
          {/* Headline */}
          <div className="text-center max-w-xl mx-auto mb-5">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground leading-tight">
              Make it. Own it. Get paid.<br className="hidden sm:block" />
              <span className="text-primary"> The creative operating system.</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Search your name, claim your credits, and build your creative identity.
            </p>
          </div>

          {/* PRIMARY: One-tap OAuth */}
          <div className="max-w-xl mx-auto mb-4">
            <p className="text-center text-[10px] uppercase tracking-widest text-energy/80 font-bold mb-3">
              👉 Join in 1 tap
            </p>
            <OAuthQuickButtons hideDivider />
          </div>

          {/* SECONDARY: Search yourself — highlighted */}
          <div className="flex items-center gap-3 max-w-xl mx-auto my-5">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div ref={wrapperRef} className="relative max-w-xl mx-auto">
            {/* Highlighted call-to-action above search */}
            <div className="text-center mb-3">
              <p className="inline-flex items-center gap-2 text-sm sm:text-base font-black text-energy-glow">
                Already have work? Search your name
                <ArrowRight className="h-4 w-4 text-energy" />
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                We'll find your verified credits across the web
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Lime-glow frame to make search pop */}
              <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-energy via-primary to-energy shadow-glow-lime">
                <div className="relative rounded-[14px] bg-card">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-energy" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search your name (e.g. 'Beyoncé', 'Squid Game')"
                    className="w-full h-14 rounded-[14px] bg-transparent pl-12 pr-28 text-sm font-medium text-foreground focus:outline-none placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 px-4 rounded-xl bg-energy text-energy-foreground flex items-center gap-1.5 font-black text-xs uppercase tracking-wider hover:scale-[1.03] transition-transform shadow-glow-lime"
                  >
                    Search <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </form>

            {/* Suggestions dropdown */}
            {showSuggestions && (query.trim().length >= 2 || suggestions.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-popover shadow-2xl z-50 overflow-hidden">
                {loading && <div className="px-4 py-3 text-sm text-muted-foreground animate-pulse">Searching...</div>}
                {!loading && suggestions.length === 0 && query.trim().length >= 2 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    <Search className="inline h-3.5 w-3.5 mr-1.5 text-primary" />
                    Press Enter for deep search
                  </div>
                )}
                {suggestions.map((s, i) => (
                  <button key={`${s.type}-${s.id}-${i}`} onClick={() => handleSuggestionClick(s)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                    {s.type === "creator" ? (
                      <Avatar className="h-8 w-8"><AvatarImage src={s.avatar || ""} /><AvatarFallback className="text-xs bg-primary/15 text-primary">{(s.title || "?")[0]}</AvatarFallback></Avatar>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><Database className="h-3.5 w-3.5 text-primary" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                      {s.subtitle && <p className="text-xs text-muted-foreground truncate">{s.subtitle}</p>}
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${typeColor[s.type]}`}>{typeLabel[s.type]}</Badge>
                  </button>
                ))}
                {query.trim().length >= 2 && suggestions.length > 0 && (
                  <button onClick={handleSubmit as any} className="w-full px-4 py-3 text-sm text-primary font-medium hover:bg-muted/50 transition-colors border-t border-border flex items-center gap-2">
                    <Search className="h-4 w-4" /> Deep search for "{query}"
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══════ SOCIAL PROOF GRID ═══════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Trending Productions */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Trending Productions
              </h2>
              <Link to="/search?q=verified" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {trendingCredits.slice(0, 6).map((c) => (
                <button key={c.id} onClick={() => navigate(`/production?name=${encodeURIComponent(c.project_name)}`)} className="group text-left">
                  <div className="relative rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all bg-muted/30">
                    {c.thumbnail_url ? (
                      <div className="aspect-[4/3] overflow-hidden">
                        <img src={c.thumbnail_url} alt={c.project_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                      </div>
                    ) : (
                      <CreditCoverPlaceholder
                        category={c.credit_category}
                        title={c.project_name}
                        role={c.role}
                        height="aspect-[4/3]"
                      />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Verified className="h-2.5 w-2.5 text-primary" />
                        <span className="text-[8px] font-medium text-primary uppercase tracking-wide">Verified</span>
                      </div>
                      <p className="text-[11px] font-semibold text-foreground leading-tight line-clamp-2">{c.project_name}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{c.role}{c.year ? ` · ${c.year}` : ''}</p>
                    </div>
                  </div>
                </button>
              ))}
              {trendingCredits.length === 0 && Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-muted aspect-[4/3] animate-pulse" />
              ))}
            </div>
          </div>

          {/* Open Gigs */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-success" />
                Open Gigs
              </h2>
              <Link to="/gigs" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                Browse <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2.5">
              {activeGigs.map((g) => (
                <button key={g.id} onClick={() => navigate(`/opportunity/${g.id}`)} className="w-full text-left rounded-xl border border-border bg-muted/30 p-3 hover:border-primary/40 transition-all">
                  <Badge className="text-[8px] mb-1.5 bg-success/15 text-success border-success/25">{g.type}</Badge>
                  <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{g.title}</p>
                  {g.location && (
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" /> {g.location}
                    </p>
                  )}
                </button>
              ))}
              {activeGigs.length === 0 && (
                <div className="text-center py-6 text-muted-foreground/50 text-xs">No active gigs yet</div>
              )}
            </div>
          </div>

          {/* Recently Verified Creators */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Verified className="h-3.5 w-3.5 text-primary" />
                Recently Verified Creators
              </h2>
              <Link to="/auth" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                Claim yours <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {featuredCreators.map((c) => (
                <button key={c.user_id} onClick={() => navigate(`/profile/${c.user_id}`)} className="shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-muted/30 hover:border-primary/40 transition-all w-[100px]">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={c.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{(c.full_name || "?")[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-center min-w-0 w-full">
                    <p className="text-[11px] font-semibold text-foreground truncate">{c.full_name}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{c.role}</p>
                  </div>
                </button>
              ))}
              {featuredCreators.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shrink-0 w-[100px] h-[120px] rounded-xl border border-border bg-muted animate-pulse" />
              ))}
            </div>
          </div>

          {/* Differentiator card */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-5 flex flex-col justify-between">
            <div>
              <Shield className="h-6 w-6 text-primary mb-3" />
              <h3 className="text-sm font-bold text-foreground mb-2">Not just another portfolio</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                Most platforms show what you <span className="italic">say</span> you've done. ThriveIN helps prove what you've <span className="font-semibold text-foreground">actually</span> done.
              </p>
              <div className="space-y-2 text-[10px] text-muted-foreground">
                <p className="flex items-center gap-1.5"><Search className="h-3 w-3 text-primary shrink-0" /> Search your name</p>
                <p className="flex items-center gap-1.5"><Database className="h-3 w-3 text-primary shrink-0" /> Claim your work</p>
                <p className="flex items-center gap-1.5"><Verified className="h-3 w-3 text-primary shrink-0" /> Build your verified profile</p>
              </div>
            </div>
            <Link to="/auth" className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              Claim Your Credits <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick Post CTAs */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => setQuickPostType("gig")}
            className="rounded-2xl border border-border bg-card p-4 hover:border-success/40 transition-all group text-left"
          >
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center mb-3 group-hover:bg-success/15 transition-colors">
              <PlusCircle className="h-5 w-5 text-success" />
            </div>
            <p className="text-xs font-semibold text-foreground mb-1">Post a Gig</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Find verified talent — post in 30 seconds</p>
          </button>
          <button
            onClick={() => setQuickPostType("event")}
            className="rounded-2xl border border-border bg-card p-4 hover:border-primary/40 transition-all group text-left"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs font-semibold text-foreground mb-1">Post an Event</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Host creative meetups & workshops</p>
          </button>
        </div>

        <QuickPostModal
          open={quickPostType !== null}
          onOpenChange={(open) => !open && setQuickPostType(null)}
          type={quickPostType || "gig"}
        />

        {/* Talent Manager CTA */}
        <div className="mt-4 rounded-2xl border border-accent/15 bg-gradient-to-r from-accent/5 to-card p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Handshake className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground mb-1">Agencies & Talent Managers</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                Onboard your roster, post opportunities, and earn 10% commission on every booking through your network.
              </p>
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:underline">
                Start earning <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* ═══════ EARLY ACCESS ADVANTAGE ═══════ */}
        <div className="mt-6 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-6 text-center">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-2">Be Early. Get the Advantage.</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed mb-4">
            We're building the future of creative work — and early users win.
          </p>
          <div className="grid grid-cols-2 gap-2.5 max-w-sm mx-auto mb-5">
            {[
              { icon: Star, text: "Priority visibility" },
              { icon: Briefcase, text: "First access to gigs" },
              { icon: Sparkles, text: "Early feature access" },
              { icon: TrendingUp, text: "Grow before the crowd" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-left">
                <item.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-[10px] font-medium text-foreground">{item.text}</span>
              </div>
            ))}
          </div>
          <Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg">
            Join Early — Build Your Profile <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground mt-10 pb-4">
          <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
          <span className="text-border">·</span>
          <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
          <span className="text-border">·</span>
          <Link to="/auth" className="hover:text-foreground transition-colors">Register as Brand</Link>
          <span className="text-border">·</span>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</Link>
          <span className="text-border">·</span>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </section>
  );
};
