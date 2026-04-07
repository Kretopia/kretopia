import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Database, Verified, Briefcase, MapPin, ArrowRight, TrendingUp, Users, Sparkles, PlusCircle, CalendarDays, ChevronRight, Zap, MessageSquare, Play, Star, Globe, Shield, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { QuickPostModal } from "@/components/QuickPostModal";
import { SEO } from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";

interface Suggestion {
  type: "creator" | "credit" | "gig";
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string | null;
}

const HERO_ROLES = ["Filmmaker", "Musician", "Photographer", "Designer", "Producer", "Artist", "Director"];

// Simulated live activity for social proof
const ACTIVITY_TEMPLATES = [
  (n: string) => `${n} just claimed a credit on a new production`,
  (n: string) => `${n} got verified as a professional creator`,
  (n: string) => `${n} landed a gig through ThriveIN`,
  (n: string) => `${n} joined the creative community`,
];

export const UnifiedHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [quickPostType, setQuickPostType] = useState<"gig" | "event" | null>(null);
  const [heroRoleIdx, setHeroRoleIdx] = useState(0);

  // Dashboard data
  const [trendingCredits, setTrendingCredits] = useState<any[]>([]);
  const [featuredCreators, setFeaturedCreators] = useState<any[]>([]);
  const [activeGigs, setActiveGigs] = useState<any[]>([]);
  const [stats, setStats] = useState({ creators: 0, credits: 0, gigs: 0 });

  // Auth-only data
  const [profile, setProfile] = useState<any>(null);
  const [myCredits, setMyCredits] = useState(0);
  const [myConnections, setMyConnections] = useState(0);
  const [greeting, setGreeting] = useState("");

  // Live activity pulse
  const [activityMsg, setActivityMsg] = useState("");
  const [activityNames, setActivityNames] = useState<string[]>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Rotate hero roles
  useEffect(() => {
    if (user) return;
    const interval = setInterval(() => setHeroRoleIdx(i => (i + 1) % HERO_ROLES.length), 2500);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch public dashboard data
  useEffect(() => {
    const fetchPublic = async () => {
      const [creditsRes, creatorsRes, gigsRes, statsCreators, statsCredits, statsGigs] = await Promise.all([
        supabase.from("credits").select("id, project_name, role, verification_status, credit_category, thumbnail_url, primary_media_url, url, project_type, user_id, year").not("thumbnail_url", "is", null).order("created_at", { ascending: false }).limit(8),
        supabase.from("profiles").select("user_id, full_name, avatar_url, role, verification_tier").eq("onboarding_completed", true).not("avatar_url", "is", null).order("created_at", { ascending: false }).limit(10),
        supabase.from("opportunities").select("id, title, type, location, created_at").eq("status", "active").order("created_at", { ascending: false }).limit(4),
        supabase.from("profiles").select("user_id", { count: "exact", head: true }).eq("onboarding_completed", true),
        supabase.from("credits").select("id", { count: "exact", head: true }),
        supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);
      const credits = creditsRes.data || [];
      setTrendingCredits(credits);
      const creators = creatorsRes.data || [];
      setFeaturedCreators(creators);
      setActiveGigs(gigsRes.data || []);
      setStats({ creators: statsCreators.count || 0, credits: statsCredits.count || 0, gigs: statsGigs.count || 0 });

      // Set activity names from real creators
      setActivityNames(creators.filter((c: any) => c.full_name).map((c: any) => c.full_name.split(" ")[0]));

      // Lazy-fetch thumbnails for credits that don't have one
      const missing = credits.filter((c: any) => !c.thumbnail_url);
      if (missing.length > 0) {
        for (const credit of missing.slice(0, 4)) {
          supabase.functions.invoke('scrape-thumbnail', {
            body: { credit_id: credit.id, project_name: credit.project_name, url: credit.url, project_type: credit.project_type },
          }).then(({ data }) => {
            if (data?.image_url) {
              setTrendingCredits(prev => prev.map(c => c.id === credit.id ? { ...c, thumbnail_url: data.image_url } : c));
            }
          }).catch(() => {});
        }
      }
    };
    fetchPublic();
  }, []);

  // Live activity ticker
  useEffect(() => {
    if (activityNames.length === 0) return;
    const tick = () => {
      const name = activityNames[Math.floor(Math.random() * activityNames.length)];
      const template = ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
      setActivityMsg(template(name));
    };
    tick();
    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, [activityNames]);

  // Fetch auth-specific data
  useEffect(() => {
    if (!user) return;
    const fetchAuth = async () => {
      const [profileRes, creditsCount, connectionsCount] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, role, verification_tier, thrive_id").eq("user_id", user.id).single(),
        supabase.from("credits").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("connections").select("id", { count: "exact", head: true }).or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`).eq("status", "accepted"),
      ]);
      setProfile(profileRes.data);
      setMyCredits(creditsCount.count || 0);
      setMyConnections(connectionsCount.count || 0);
    };
    fetchAuth();
  }, [user]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Live search
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
        const dbResults: Suggestion[] = [
          ...(profiles.data || []).map((p) => ({ type: "creator" as const, id: p.user_id, title: p.full_name || "Creator", subtitle: p.role || undefined, avatar: p.avatar_url })),
          ...(credits.data || []).map((c) => ({ type: "credit" as const, id: c.id, title: c.project_name, subtitle: c.role })),
          ...(opps.data || []).map((o) => ({ type: "gig" as const, id: o.id, title: o.title, subtitle: o.type })),
        ];

        if (dbResults.length > 0) {
          setSuggestions(dbResults);
        } else {
          try {
            const { data: aiData } = await supabase.functions.invoke('search-credits-web', {
              body: { query: query.trim() },
            });
            const aiResults: Suggestion[] = (aiData?.results || []).slice(0, 5).map((r: any, i: number) => ({
              type: "credit" as const,
              id: `ai-${i}`,
              title: r.title,
              subtitle: [r.type, r.year, r.platform].filter(Boolean).join(" · "),
              avatar: null,
            }));
            setSuggestions(aiResults.length > 0 ? aiResults : []);
          } catch {
            setSuggestions([]);
          }
        }
      } catch { setSuggestions([]); } finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSuggestionClick = (s: Suggestion) => {
    setShowSuggestions(false);
    setQuery("");
    setSuggestions([]);
    if (s.type === "creator") navigate(`/profile/${s.id}`);
    else if (s.type === "gig") navigate(`/opportunity/${s.id}`);
    else navigate(`/production?name=${encodeURIComponent(s.title)}`);
  };

  const typeLabel = { creator: "Creator", credit: "Credit", gig: "Gig" };
  const typeColor = { creator: "text-primary", credit: "text-accent", gig: "text-success" };
  const firstName = profile?.full_name?.split(" ")[0] || "Creator";

  return (
    <div className="bg-background min-h-screen">
      <SEO
        title="ThriveIN — The Creative OS"
        description="Find any creator, verify any credit, discover productions across film, music, events, fashion & more."
        url="https://thrivein.io"
      />

      {/* ═══════════ GUEST HERO ═══════════ */}
      {!user && (
        <div className="relative overflow-hidden">
          {/* Background gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl" />
          </div>

          <div className="relative container mx-auto max-w-5xl px-4 sm:px-6 pt-8 sm:pt-14 pb-6">
            {/* Rotating headline */}
            <div className="text-center mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80 mb-3">The Creative OS</p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-3">
                You're a{" "}
                <span className="relative inline-block min-w-[120px]">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={heroRoleIdx}
                      initial={{ y: 20, opacity: 0, filter: "blur(4px)" }}
                      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                      exit={{ y: -20, opacity: 0, filter: "blur(4px)" }}
                      transition={{ duration: 0.35 }}
                      className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                    >
                      {HERO_ROLES[heroRoleIdx]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                Claim your credits. Get verified. Get discovered.
              </p>
            </div>

            {/* Search bar */}
            <div ref={wrapperRef} className="relative max-w-xl mx-auto mb-5">
              <form onSubmit={handleSubmit}>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search creators, productions, gigs..."
                    className="w-full h-12 sm:h-14 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm pl-12 pr-14 text-sm text-foreground shadow-lg focus:outline-none focus:border-primary focus:shadow-[var(--shadow-glow)] transition-all placeholder:text-muted-foreground/50"
                  />
                  <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-md">
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>

              {/* Suggestions dropdown */}
              {showSuggestions && (query.trim().length >= 2 || suggestions.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-popover shadow-xl z-[100] overflow-y-auto max-h-[60vh] backdrop-blur-lg">
                  {loading && <div className="px-4 py-3 text-sm text-muted-foreground animate-pulse">Searching...</div>}
                  {!loading && suggestions.length === 0 && query.trim().length >= 2 && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      <Sparkles className="inline h-3.5 w-3.5 mr-1.5 text-primary" />
                      Press Enter for AI-powered deep search
                    </div>
                  )}
                  {suggestions.map((s, i) => (
                    <button key={`${s.type}-${s.id}-${i}`} onClick={() => handleSuggestionClick(s)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                      {s.type === "creator" ? (
                        <Avatar className="h-8 w-8"><AvatarImage src={s.avatar || ""} /><AvatarFallback className="text-xs bg-primary/10 text-primary">{(s.title || "?")[0]}</AvatarFallback></Avatar>
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
                      <Sparkles className="h-4 w-4" /> Deep search for "{query}"
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick chips */}
            <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
              {["Film", "Music", "Photography", "Design", "Theater", "Dance"].map(tag => (
                <button key={tag} onClick={() => navigate(`/search?q=${tag}`)} className="text-[11px] px-3.5 py-1.5 rounded-full bg-card/60 backdrop-blur-sm border border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-card transition-all font-medium">
                  {tag}
                </button>
              ))}
            </div>

            {/* Social proof stats */}
            <div className="flex items-center justify-center gap-6 sm:gap-8 mb-4">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-extrabold text-foreground">{stats.creators.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Creators</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-extrabold text-foreground">{stats.credits.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Credits</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-extrabold text-foreground">{stats.gigs}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Live Gigs</p>
              </div>
            </div>

            {/* Primary CTA */}
            <div className="flex justify-center mb-2">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-7 py-3 text-sm font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:shadow-primary/20 active:scale-[0.98]"
              >
                Join Free — Build Your Profile <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ LIVE ACTIVITY TICKER ═══════════ */}
      {activityMsg && !user && (
        <div className="border-y border-border/50 bg-muted/30">
          <div className="container mx-auto max-w-5xl px-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activityMsg}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center gap-2 py-2"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                <p className="text-[11px] text-muted-foreground">{activityMsg}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ═══════════ AUTH HEADER ═══════════ */}
      {user && profile && (
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border-2 border-primary/30 shadow-md">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{firstName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base font-bold text-foreground leading-tight">{greeting}, {firstName}</p>
                <p className="text-xs text-muted-foreground">{profile.role || "Creative Professional"}</p>
              </div>
            </div>
            <Link to="/messages" className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>

          {/* Auth search */}
          <div ref={!user ? undefined : wrapperRef} className="relative mb-4">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={user ? inputRef : undefined}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search creators, productions, gigs..."
                  className="w-full h-11 rounded-xl border border-border bg-card pl-11 pr-4 text-sm text-foreground focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            </form>
            {showSuggestions && (query.trim().length >= 2 || suggestions.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-popover shadow-xl z-50 overflow-hidden">
                {loading && <div className="px-4 py-3 text-sm text-muted-foreground animate-pulse">Searching...</div>}
                {!loading && suggestions.length === 0 && query.trim().length >= 2 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    <Sparkles className="inline h-3.5 w-3.5 mr-1.5 text-primary" /> Press Enter for deep search
                  </div>
                )}
                {suggestions.map((s, i) => (
                  <button key={`${s.type}-${s.id}-${i}`} onClick={() => handleSuggestionClick(s)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                    {s.type === "creator" ? (
                      <Avatar className="h-8 w-8"><AvatarImage src={s.avatar || ""} /><AvatarFallback className="text-xs bg-primary/10 text-primary">{(s.title || "?")[0]}</AvatarFallback></Avatar>
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
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {[
              { label: "Credits", value: myCredits, to: "/profile", icon: Database, color: "text-primary" },
              { label: "Connections", value: myConnections, to: "/circle", icon: Users, color: "text-accent" },
              { label: "Live Gigs", value: stats.gigs, to: "/opportunities", icon: Briefcase, color: "text-success" },
            ].map(s => (
              <Link key={s.label} to={s.to} className="group relative overflow-hidden rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all text-center">
                <s.icon className={`h-3.5 w-3.5 ${s.color} mx-auto mb-1 opacity-60`} />
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
              </Link>
            ))}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { icon: PlusCircle, label: "Post Gig", action: () => setQuickPostType("gig"), color: "text-success" },
              { icon: Database, label: "Credits", to: "/credits", color: "text-primary" },
              { icon: CalendarDays, label: "Events", action: () => setQuickPostType("event"), color: "text-warning" },
              { icon: Briefcase, label: "Desk", to: "/desk", color: "text-accent" },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => a.action ? a.action() : navigate(a.to!)}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center">
                  <a.icon className={`h-5 w-5 ${a.color}`} />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ CONTENT SECTIONS ═══════════ */}
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 pb-28">

        {/* ── TRENDING PRODUCTIONS ── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Trending Productions
            </h2>
            <Link to="/credits" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
            {trendingCredits.map((c, i) => (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/production?name=${encodeURIComponent(c.project_name)}`)}
                className="shrink-0 w-[140px] sm:w-[180px] group text-left snap-start"
              >
                <div className="relative rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-primary/40 transition-all shadow-sm hover:shadow-lg">
                  {(c.thumbnail_url || c.primary_media_url) ? (
                    <div className="aspect-[3/4] overflow-hidden">
                      <img src={c.thumbnail_url || c.primary_media_url} alt={c.project_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                    </div>
                  ) : (
                    <div className="aspect-[3/4] bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 flex items-center justify-center">
                      <Play className="h-8 w-8 text-primary/20" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Verified className="h-3 w-3 text-primary" />
                      <span className="text-[8px] font-bold text-primary uppercase tracking-widest">Verified</span>
                    </div>
                    <p className="text-xs font-bold text-foreground leading-tight line-clamp-2">{c.project_name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.role}{c.year ? ` · ${c.year}` : ''}</p>
                  </div>
                </div>
              </motion.button>
            ))}
            {trendingCredits.length === 0 && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[140px] sm:w-[180px] rounded-2xl border border-border bg-card aspect-[3/4] animate-pulse" />
            ))}
          </div>
        </section>

        {/* ── DISCOVER CREATORS ── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              Discover Creators
            </h2>
            <Link to="/circle" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
              Explore <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1 snap-x">
            {featuredCreators.map((c, i) => (
              <motion.button
                key={c.user_id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/profile/${c.user_id}`)}
                className="shrink-0 group snap-start"
              >
                <div className="flex flex-col items-center gap-2 w-[72px]">
                  <div className="relative">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                    <Avatar className="relative h-14 w-14 border-2 border-border group-hover:border-primary/50 transition-colors shadow-sm">
                      <AvatarImage src={c.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{(c.full_name || "?")[0]}</AvatarFallback>
                    </Avatar>
                    {c.verification_tier && c.verification_tier !== 'none' && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                        <Verified className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="text-[10px] font-semibold text-foreground truncate">{c.full_name}</p>
                    <p className="text-[8px] text-muted-foreground truncate">{c.role}</p>
                  </div>
                </div>
              </motion.button>
            ))}
            {featuredCreators.length === 0 && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shrink-0 flex flex-col items-center gap-2 w-[72px]">
                <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
                <div className="h-2 w-12 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </section>

        {/* ── OPEN GIGS ── */}
        {activeGigs.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-warning" />
                {user ? "Gigs For You" : "Open Gigs"}
              </h2>
              <Link to="/opportunities" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                Browse <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeGigs.map((g, i) => (
                <motion.button
                  key={g.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => navigate(`/opportunity/${g.id}`)}
                  className="w-full text-left group"
                >
                  <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Badge className="text-[8px] mb-2 bg-success/15 text-success border-success/25 font-semibold">{g.type}</Badge>
                        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">{g.title}</p>
                        {g.location && (
                          <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {g.location}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* ── TRUST SIGNALS (guest) ── */}
        {!user && (
          <section className="mb-8">
            <div className="grid grid-cols-1 gap-3 mb-6">
              {/* How it works */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Database, title: "Claim Credits", desc: "Build your verified work history", step: "1" },
                  { icon: Globe, title: "Get Discovered", desc: "Show up in industry searches", step: "2" },
                  { icon: Briefcase, title: "Get Hired", desc: "Land gigs from top productions", step: "3" },
                ].map((s, i) => (
                  <motion.div
                    key={s.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="rounded-2xl bg-card border border-border/60 p-3 text-center relative overflow-hidden"
                  >
                    <span className="absolute top-2 left-2 text-[10px] font-extrabold text-primary/20">{s.step}</span>
                    <s.icon className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-[11px] font-bold text-foreground mb-0.5">{s.title}</p>
                    <p className="text-[9px] text-muted-foreground leading-relaxed">{s.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 flex-wrap mb-6">
              {[
                { icon: Shield, label: "Verified Identity" },
                { icon: CheckCircle, label: "Escrow Protected" },
                { icon: Star, label: "Peer Endorsed" },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <b.icon className="h-3.5 w-3.5 text-primary/60" />
                  <span className="font-medium">{b.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── CTA CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/80" />
          <div className="relative p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                  {user ? "Upgrade to Pro" : "Your career deserves a verified record"}
                </h3>
                <p className="text-xs sm:text-sm text-white/75 leading-relaxed mb-4">
                  {user
                    ? "Unlock AI matching, unlimited discovery, and the embeddable credits widget."
                    : "Join ThriveIN to claim your credits, build your verified identity, and get discovered by the industry."}
                </p>
                <Link
                  to={user ? "/subscription" : "/auth"}
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-primary px-5 py-2.5 text-xs font-bold hover:bg-white/90 transition-colors shadow-md"
                >
                  {user ? "View Plans" : "Get Started — Free"} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Guest Post CTAs ── */}
        {!user && (
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button onClick={() => setQuickPostType("gig")} className="rounded-2xl border border-border bg-card p-4 hover:border-success/40 transition-all group text-left">
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center mb-3 group-hover:bg-success/15 transition-colors">
                <PlusCircle className="h-5 w-5 text-success" />
              </div>
              <p className="text-xs font-bold text-foreground mb-0.5">Post a Gig</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">Find verified talent fast</p>
            </button>
            <button onClick={() => setQuickPostType("event")} className="rounded-2xl border border-border bg-card p-4 hover:border-primary/40 transition-all group text-left">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs font-bold text-foreground mb-0.5">Post an Event</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">Host creative meetups</p>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-muted-foreground mt-10 pb-4">
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <span className="text-border">·</span>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <span className="text-border">·</span>
          <Link to="/community-guidelines" className="hover:text-foreground transition-colors">Guidelines</Link>
        </div>

        <QuickPostModal open={quickPostType !== null} onOpenChange={(open) => !open && setQuickPostType(null)} type={quickPostType || "gig"} />
      </div>
    </div>
  );
};

export default UnifiedHome;
