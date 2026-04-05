import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Database, TrendingUp, ArrowRight } from "lucide-react";
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

const TRENDING_SEARCHES = [
  "Videographer",
  "Music Producer", 
  "Brand Photographer",
  "Event Planner",
  "Graphic Designer",
];

export const HeroSection = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  // Debounced live search
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const q = `%${query.trim()}%`;
      try {
        const [profiles, credits, opps] = await Promise.all([
          supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url, role")
            .or(`full_name.ilike.${q},role.ilike.${q}`)
            .eq("onboarding_completed", true)
            .limit(4),
          supabase
            .from("credits")
            .select("id, project_name, role")
            .or(`project_name.ilike.${q},role.ilike.${q}`)
            .limit(4),
          supabase
            .from("opportunities")
            .select("id, title, type")
            .eq("status", "active")
            .ilike("title", q)
            .limit(3),
        ]);

        const results: Suggestion[] = [
          ...(profiles.data || []).map((p) => ({
            type: "creator" as const,
            id: p.user_id,
            title: p.full_name || "Creator",
            subtitle: p.role || undefined,
            avatar: p.avatar_url,
          })),
          ...(credits.data || []).map((c) => ({
            type: "credit" as const,
            id: c.id,
            title: c.project_name,
            subtitle: c.role,
          })),
          ...(opps.data || []).map((o) => ({
            type: "gig" as const,
            id: o.id,
            title: o.title,
            subtitle: o.type,
          })),
        ];
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSuggestionClick = (s: Suggestion) => {
    setShowSuggestions(false);
    if (s.type === "creator") navigate(`/profile/${s.id}`);
    else if (s.type === "gig") navigate(`/opportunity/${s.id}`);
    else navigate(`/search?q=${encodeURIComponent(s.title)}`);
  };

  const typeLabel = { creator: "Creator", credit: "Credit", gig: "Gig" };
  const typeColor = { creator: "text-primary", credit: "text-accent", gig: "text-success" };

  return (
    <section className="relative overflow-hidden px-4 sm:px-6">
      {/* Background */}
      <div className="absolute inset-0 gradient-accent opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,hsl(var(--primary)/0.08),transparent_60%)]" />

      <div className="container relative mx-auto max-w-3xl pt-20 pb-16 sm:pt-28 sm:pb-20 md:pt-36 md:pb-28">
        <div className="animate-slide-up text-center">
          {/* Logo mark */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs sm:text-sm backdrop-blur-sm">
            <Database className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">ThriveCredits™</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-3">
            Search any creative.
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Verify any credit.
            </span>
          </h1>

          <p className="mx-auto max-w-lg text-sm sm:text-base text-muted-foreground mb-8">
            Find creators, productions, and gigs across every industry — film, music, events, fashion & more.
          </p>

          {/* Google-style search bar */}
          <div ref={wrapperRef} className="relative mx-auto max-w-xl">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search creators, credits, productions..."
                  className="w-full h-14 sm:h-16 rounded-full border-2 border-border bg-card pl-12 pr-14 text-base sm:text-lg shadow-lg focus:outline-none focus:border-primary focus:shadow-glow transition-all placeholder:text-muted-foreground/60"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </form>

            {/* Live suggestions dropdown */}
            {showSuggestions && (query.trim().length >= 2 || suggestions.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border bg-card shadow-xl z-50 overflow-hidden">
                {loading && (
                  <div className="px-4 py-3 text-sm text-muted-foreground animate-pulse">Searching...</div>
                )}
                {!loading && suggestions.length === 0 && query.trim().length >= 2 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">No results — try a different keyword</div>
                )}
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.type}-${s.id}-${i}`}
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    {s.type === "creator" ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={s.avatar || ""} />
                        <AvatarFallback className="text-xs">{(s.title || "?")[0]}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      {s.subtitle && <p className="text-xs text-muted-foreground truncate">{s.subtitle}</p>}
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${typeColor[s.type]}`}>
                      {typeLabel[s.type]}
                    </Badge>
                  </button>
                ))}
                {query.trim().length >= 2 && suggestions.length > 0 && (
                  <button
                    onClick={handleSubmit as any}
                    className="w-full px-4 py-3 text-sm text-primary font-medium hover:bg-muted/50 transition-colors border-t flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    See all results for "{query}"
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Trending searches */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-xs text-muted-foreground/60 mr-1">Trending:</span>
            {TRENDING_SEARCHES.map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term);
                  navigate(`/search?q=${encodeURIComponent(term)}`);
                }}
                className="rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors backdrop-blur-sm"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
