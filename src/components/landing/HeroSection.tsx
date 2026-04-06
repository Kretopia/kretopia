import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, ArrowRight, Database, Verified, ExternalLink } from "lucide-react";
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

interface SpotlightCredit {
  id: string;
  project_name: string;
  role: string;
  verification_status: string | null;
  credit_category: string | null;
  thumbnail_url: string | null;
  user_id: string;
}

export const HeroSection = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [spotlight, setSpotlight] = useState<SpotlightCredit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch spotlight productions
  useEffect(() => {
    const fetchSpotlight = async () => {
      const { data } = await supabase
        .from("credits")
        .select("id, project_name, role, verification_status, credit_category, thumbnail_url, user_id")
        .not("thumbnail_url", "is", null)
        .neq("thumbnail_url", "")
        .order("created_at", { ascending: false })
        .limit(4);
      if (data) setSpotlight(data);
    };
    fetchSpotlight();
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

  const typeLabel = { creator: "Creator", credit: "Credit", gig: "Production" };
  const typeColor = { creator: "text-primary", credit: "text-accent", gig: "text-success" };

  const verificationLabel = (status: string | null) => {
    const s = (status || "").toLowerCase();
    if (s === "enterprise") return { text: "Verified Production", color: "text-success" };
    if (s === "peer") return { text: "Peer Verified", color: "text-primary" };
    return { text: "Verified Production", color: "text-primary" };
  };

  return (
    <section className="relative min-h-[85vh] flex items-center bg-[hsl(230,20%,7%)] overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,hsl(235,65%,52%,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,hsl(45,90%,55%,0.04),transparent_50%)]" />

      <div className="container relative mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid lg:grid-cols-[1fr_340px] gap-8 lg:gap-12 items-start">
          {/* Left: Main content */}
          <div className="flex flex-col justify-center">
            {/* Badge */}
            <div className="mb-6 inline-flex self-start items-center gap-2 rounded-full border border-[hsl(235,65%,52%,0.3)] bg-[hsl(235,65%,52%,0.1)] px-4 py-2 text-xs font-medium text-[hsl(235,70%,75%)]">
              <Database className="h-3.5 w-3.5" />
              <span>ThriveCredits™ — Verified Provenance for the Creative Economy</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.08] mb-4 text-white">
              THE GLOBAL STANDARD
              <br />
              FOR{" "}
              <span className="bg-gradient-to-r from-[hsl(235,70%,65%)] to-[hsl(250,55%,72%)] bg-clip-text text-transparent">
                CREATIVE RECORDS.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-[hsl(220,10%,55%)] mb-8 max-w-lg">
              AI is finding your legacy… Zero typing, just your professional identity.
            </p>

            {/* Search bar */}
            <div ref={wrapperRef} className="relative max-w-xl mb-8">
              <form onSubmit={handleSubmit}>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(220,10%,45%)]" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search by Name, Project, Fete, or Grammy Win..."
                    className="w-full h-14 rounded-xl border border-[hsl(230,15%,20%)] bg-[hsl(230,18%,12%)] pl-12 pr-14 text-sm sm:text-base text-white shadow-lg focus:outline-none focus:border-[hsl(235,65%,52%)] focus:shadow-[0_0_30px_hsl(235,65%,52%,0.15)] transition-all placeholder:text-[hsl(220,10%,40%)]"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-lg bg-[hsl(235,65%,52%)] text-white flex items-center justify-center hover:bg-[hsl(235,65%,58%)] transition-colors"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </form>

              {/* Live suggestions dropdown */}
              {showSuggestions && (query.trim().length >= 2 || suggestions.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-[hsl(230,15%,20%)] bg-[hsl(230,18%,10%)] shadow-2xl z-50 overflow-hidden">
                  {loading && (
                    <div className="px-4 py-3 text-sm text-[hsl(220,10%,50%)] animate-pulse">Searching...</div>
                  )}
                  {!loading && suggestions.length === 0 && query.trim().length >= 2 && (
                    <div className="px-4 py-3 text-sm text-[hsl(220,10%,50%)]">No results — try a different keyword</div>
                  )}
                  {suggestions.map((s, i) => (
                    <button
                      key={`${s.type}-${s.id}-${i}`}
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[hsl(230,15%,15%)] transition-colors text-left"
                    >
                      {s.type === "creator" ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={s.avatar || ""} />
                          <AvatarFallback className="text-xs bg-[hsl(235,65%,52%,0.2)] text-[hsl(235,70%,75%)]">
                            {(s.title || "?")[0]}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-[hsl(235,65%,52%,0.15)] flex items-center justify-center">
                          <Database className="h-3.5 w-3.5 text-[hsl(235,70%,65%)]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{s.title}</p>
                        {s.subtitle && <p className="text-xs text-[hsl(220,10%,50%)] truncate">{s.subtitle}</p>}
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 border-[hsl(230,15%,25%)] ${typeColor[s.type]}`}>
                        {typeLabel[s.type]}
                      </Badge>
                    </button>
                  ))}
                  {query.trim().length >= 2 && suggestions.length > 0 && (
                    <button
                      onClick={handleSubmit as any}
                      className="w-full px-4 py-3 text-sm text-[hsl(235,70%,65%)] font-medium hover:bg-[hsl(230,15%,15%)] transition-colors border-t border-[hsl(230,15%,18%)] flex items-center gap-2"
                    >
                      <Search className="h-4 w-4" />
                      See all results for "{query}"
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer links */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[hsl(220,10%,45%)]">
              <Link to="/about" className="hover:text-white transition-colors">About ThriveCredits™</Link>
              <span className="text-[hsl(230,15%,20%)]">·</span>
              <Link to="/auth" className="hover:text-white transition-colors">Register as Brand</Link>
              <span className="text-[hsl(230,15%,20%)]">·</span>
              <Link to="/faq" className="hover:text-white transition-colors">FAQ</Link>
              <span className="text-[hsl(230,15%,20%)]">·</span>
              <Link to="/auth" className="px-3 py-1.5 rounded-md border border-[hsl(235,65%,52%,0.4)] bg-[hsl(235,65%,52%,0.1)] text-[hsl(235,70%,75%)] hover:bg-[hsl(235,65%,52%,0.2)] transition-colors font-medium">
                CLAIM YOUR CREDITS
              </Link>
            </div>
          </div>

          {/* Right: Spotlight sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[hsl(220,10%,45%)] mb-4">
                Spotlight
              </h3>
              {spotlight.length > 0 ? (
                spotlight.map((credit) => {
                  const v = verificationLabel(credit.verification_status);
                  return (
                    <button
                      key={credit.id}
                      onClick={() => navigate(`/profile/${credit.user_id}`)}
                      className="w-full group"
                    >
                      <div className="relative rounded-xl overflow-hidden border border-[hsl(230,15%,18%)] hover:border-[hsl(235,65%,52%,0.4)] transition-all">
                        {credit.thumbnail_url && (
                          <div className="aspect-[16/10] overflow-hidden">
                            <img
                              src={credit.thumbnail_url}
                              alt={credit.project_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(230,20%,7%)] via-transparent to-transparent" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <Badge className="mb-1.5 text-[9px] bg-[hsl(235,65%,52%,0.2)] border-[hsl(235,65%,52%,0.3)] text-[hsl(235,70%,75%)]">
                            <Verified className="h-2.5 w-2.5 mr-1" />
                            {v.text}
                          </Badge>
                          <p className="text-xs font-semibold text-white leading-tight line-clamp-2">
                            {credit.project_name}
                          </p>
                          <p className="text-[10px] text-[hsl(220,10%,50%)] mt-0.5 truncate">
                            {credit.role} {credit.credit_category ? `· ${credit.credit_category}` : ""}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                // Placeholder cards
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-[hsl(230,15%,18%)] bg-[hsl(230,18%,10%)] h-28 animate-pulse" />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
