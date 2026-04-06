import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Database, Verified, Briefcase, MapPin, ArrowRight, TrendingUp, Users, Sparkles, PlusCircle, CalendarDays, ChevronRight, Zap, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { QuickPostModal } from "@/components/QuickPostModal";
import { SEO } from "@/components/SEO";

interface Suggestion {
  type: "creator" | "credit" | "gig";
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string | null;
}

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

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Fetch public dashboard data
  useEffect(() => {
    const fetchPublic = async () => {
      const [creditsRes, creatorsRes, gigsRes, statsCreators, statsCredits, statsGigs] = await Promise.all([
        supabase.from("credits").select("id, project_name, role, verification_status, credit_category, thumbnail_url, user_id, year").in("verification_status", ["enterprise", "peer", "verified"]).order("created_at", { ascending: false }).limit(6),
        supabase.from("profiles").select("user_id, full_name, avatar_url, role, verification_tier").eq("onboarding_completed", true).not("avatar_url", "is", null).order("created_at", { ascending: false }).limit(8),
        supabase.from("opportunities").select("id, title, type, location, created_at").eq("status", "active").order("created_at", { ascending: false }).limit(4),
        supabase.from("profiles").select("user_id", { count: "exact", head: true }).eq("onboarding_completed", true),
        supabase.from("credits").select("id", { count: "exact", head: true }),
        supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);
      setTrendingCredits(creditsRes.data || []);
      setFeaturedCreators(creatorsRes.data || []);
      setActiveGigs(gigsRes.data || []);
      setStats({ creators: statsCreators.count || 0, credits: statsCredits.count || 0, gigs: statsGigs.count || 0 });
    };
    fetchPublic();
  }, []);

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

  // Live search — DB first, AI fallback if empty
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
          // AI fallback — call search-credits-web for instant results
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
    if (s.type === "creator") navigate(`/profile/${s.id}`);
    else if (s.type === "gig") navigate(`/opportunity/${s.id}`);
    else navigate(`/search?q=${encodeURIComponent(s.title)}`);
  };

  const typeLabel = { creator: "Creator", credit: "Credit", gig: "Gig" };
  const typeColor = { creator: "text-primary", credit: "text-accent", gig: "text-success" };
  const firstName = profile?.full_name?.split(" ")[0] || "Creator";

  return (
    <div className="bg-background min-h-screen">
      <SEO
        title="ThriveIN — Search the Creative Economy"
        description="Find any creator, verify any credit, discover productions across film, music, events, fashion & more. The verified ledger for the creative industry."
        url="https://thrivein.io"
      />
      <div className="container relative mx-auto max-w-5xl px-4 sm:px-6 pt-4 pb-24">

        {/* ═══ PERSONALIZED HEADER (auth only) ═══ */}
        {user && profile && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/30">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{firstName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-bold text-foreground leading-tight">{greeting}, {firstName}</p>
                <p className="text-[10px] text-muted-foreground">{profile.role || "Creative Professional"}</p>
              </div>
            </div>
            <Link to="/messages" className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        )}

        {/* ═══ SEARCH — Hero element ═══ */}
        <div className={user ? "mb-5" : "pt-8 sm:pt-14 mb-6"}>
          {!user && (
            <div className="text-center mb-5">
              <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold tracking-tight text-foreground mb-1.5 leading-tight">
                Search the creative economy
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                Find any creator, verify any credit, discover productions across every creative industry.
              </p>
            </div>
          )}

          <div ref={wrapperRef} className="relative max-w-xl mx-auto">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search creators, credits, gigs..."
                  className="w-full h-12 sm:h-13 rounded-2xl border border-border bg-card pl-12 pr-14 text-sm text-foreground shadow-card focus:outline-none focus:border-primary focus:shadow-glow transition-all placeholder:text-muted-foreground/60"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors">
                  <Search className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>

            {/* Suggestions dropdown */}
            {showSuggestions && (query.trim().length >= 2 || suggestions.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-popover shadow-xl z-50 overflow-hidden">
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

          {/* Quick category chips — below search */}
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            {["Filmmakers", "Musicians", "Photographers", "Designers", "Models"].map(tag => (
              <button key={tag} onClick={() => navigate(`/search?q=${tag}`)} className="text-[10px] px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all">
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ AUTH QUICK STATS (injected) ═══ */}
        {user && (
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            <Link to="/profile" className="rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors text-center">
              <p className="text-lg font-bold text-foreground">{myCredits}</p>
              <p className="text-[10px] text-muted-foreground font-medium">My Credits</p>
            </Link>
            <Link to="/circle" className="rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors text-center">
              <p className="text-lg font-bold text-foreground">{myConnections}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Connections</p>
            </Link>
            <Link to="/opportunities" className="rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors text-center">
              <p className="text-lg font-bold text-foreground">{stats.gigs}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Live Gigs</p>
            </Link>
          </div>
        )}

        {/* ═══ AUTH QUICK ACTIONS ═══ */}
        {user && (
          <div className="grid grid-cols-4 gap-2 mb-6">
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
                <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center">
                  <a.icon className={`h-4 w-4 ${a.color}`} />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{a.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ═══ PLATFORM STATS (guest only) ═══ */}
        {!user && (
          <div className="flex items-center justify-center gap-6 text-[10px] text-muted-foreground mb-6">
            <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {stats.creators.toLocaleString()} Creators</span>
            <span className="flex items-center gap-1.5"><Database className="h-3 w-3" /> {stats.credits.toLocaleString()} Credits</span>
            <span className="flex items-center gap-1.5"><Briefcase className="h-3 w-3" /> {stats.gigs} Live Gigs</span>
          </div>
        )}

        {/* ═══ CONTENT GRID ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Trending Productions */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Trending Productions
              </h2>
              <Link to="/credits" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {trendingCredits.slice(0, 6).map((c) => (
                <button key={c.id} onClick={() => navigate(`/production?name=${encodeURIComponent(c.project_name)}`)} className="group text-left">
                  <div className="relative rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all bg-muted/20">
                    {c.thumbnail_url ? (
                      <div className="aspect-[4/3] overflow-hidden">
                        <img src={c.thumbnail_url} alt={c.project_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-muted/30 flex items-center justify-center">
                        <Database className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Verified className="h-2.5 w-2.5 text-primary" />
                        <span className="text-[7px] font-medium text-primary uppercase tracking-wide">Verified</span>
                      </div>
                      <p className="text-[10px] font-semibold text-foreground leading-tight line-clamp-2">{c.project_name}</p>
                      <p className="text-[8px] text-muted-foreground mt-0.5">{c.role}{c.year ? ` · ${c.year}` : ''}</p>
                    </div>
                  </div>
                </button>
              ))}
              {trendingCredits.length === 0 && (
                <>
                  {/* Seed content — shows the platform works even with no data */}
                  {[
                    { name: "Search any production", desc: "Films, music, events & more", icon: "🎬" },
                    { name: "Verify your credits", desc: "Build your professional record", icon: "✓" },
                    { name: "Discover creators", desc: "Find talent across industries", icon: "🔍" },
                  ].map((seed, i) => (
                    <button key={i} onClick={() => navigate("/search")} className="group text-left">
                      <div className="relative rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all bg-muted/20 aspect-[4/3] flex flex-col items-center justify-center p-3">
                        <span className="text-2xl mb-2">{seed.icon}</span>
                        <p className="text-[10px] font-semibold text-foreground text-center leading-tight">{seed.name}</p>
                        <p className="text-[8px] text-muted-foreground text-center mt-0.5">{seed.desc}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Open Gigs */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-success" />
                {user ? "Gigs For You" : "Open Gigs"}
              </h2>
              <Link to="/opportunities" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                Browse <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {activeGigs.map((g) => (
                <button key={g.id} onClick={() => navigate(`/opportunity/${g.id}`)} className="w-full text-left rounded-xl border border-border bg-muted/10 p-3 hover:border-primary/30 transition-all">
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
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground mb-2">Be the first to post a gig</p>
                  <button onClick={() => setQuickPostType("gig")} className="text-[10px] font-medium text-primary hover:underline">
                    Post a Gig — 30 seconds
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Verified Creators */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-primary" />
                {user ? "Discover Creators" : "Verified Creators"}
              </h2>
              <Link to="/circle" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                Explore <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
              {featuredCreators.map((c) => (
                <button key={c.user_id} onClick={() => navigate(`/profile/${c.user_id}`)} className="shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-muted/10 hover:border-primary/30 transition-all w-[88px]">
                  <Avatar className="h-11 w-11 border-2 border-primary/20">
                    <AvatarImage src={c.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{(c.full_name || "?")[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-center min-w-0 w-full">
                    <p className="text-[10px] font-semibold text-foreground truncate">{c.full_name}</p>
                    <p className="text-[8px] text-muted-foreground truncate">{c.role}</p>
                  </div>
                </button>
              ))}
              {featuredCreators.length === 0 && (
                <div className="w-full text-center py-4">
                  <p className="text-xs text-muted-foreground mb-2">Join a growing network of verified creatives</p>
                  <button onClick={() => navigate("/auth")} className="text-[10px] font-medium text-primary hover:underline">
                    Create Your Profile
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CTA Card */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-5 flex flex-col justify-between">
            <div>
              <Sparkles className="h-5 w-5 text-primary mb-2.5" />
              <h3 className="text-sm font-bold text-foreground mb-1.5">
                {user ? "Upgrade to Pro" : "Your career deserves a verified record"}
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {user
                  ? "Unlock AI matching, unlimited discovery, and the embeddable credits widget."
                  : "Join ThriveIN to claim your credits, build your verified identity, and get discovered."}
              </p>
            </div>
            <Link
              to={user ? "/subscription" : "/auth"}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {user ? "View Plans" : "Claim Your Credits — Free"} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick Post CTAs */}
        {!user && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button onClick={() => setQuickPostType("gig")} className="rounded-2xl border border-border bg-card p-4 hover:border-success/40 transition-all group text-left">
              <div className="h-9 w-9 rounded-xl bg-success/10 flex items-center justify-center mb-2.5 group-hover:bg-success/15 transition-colors">
                <PlusCircle className="h-4.5 w-4.5 text-success" />
              </div>
              <p className="text-xs font-semibold text-foreground mb-0.5">Post a Gig</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">Find verified talent — post in 30 seconds</p>
            </button>
            <button onClick={() => setQuickPostType("event")} className="rounded-2xl border border-border bg-card p-4 hover:border-primary/40 transition-all group text-left">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2.5 group-hover:bg-primary/15 transition-colors">
                <CalendarDays className="h-4.5 w-4.5 text-primary" />
              </div>
              <p className="text-xs font-semibold text-foreground mb-0.5">Post an Event</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">Host creative meetups & workshops</p>
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
