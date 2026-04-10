import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, Database, Briefcase, User, ArrowRight, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: "creator" | "credit" | "gig" | "web";
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string | null;
  bio?: string;
  credits?: { project: string; role: string }[];
  platform?: string;
  is_claimed?: boolean;
}

interface UnifiedSearchDropdownProps {
  /** Visual variant */
  variant?: "hero" | "navbar" | "inline";
  /** Placeholder text */
  placeholder?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Called when dropdown opens/closes */
  onOpenChange?: (open: boolean) => void;
  /** Extra class for the wrapper */
  className?: string;
  /** Called when user selects something — if not provided, navigates by default */
  onSelect?: (result: SearchResult) => void;
}

const TYPE_META = {
  creator: { label: "Creator", icon: User, color: "text-primary" },
  credit: { label: "Credit", icon: Database, color: "text-accent" },
  gig: { label: "Gig", icon: Briefcase, color: "text-emerald-500" },
  web: { label: "Discovered", icon: Sparkles, color: "text-amber-500" },
};

export function UnifiedSearchDropdown({
  variant = "navbar",
  placeholder = "Search creators, productions, gigs...",
  autoFocus = false,
  onOpenChange,
  className,
  onSelect,
}: UnifiedSearchDropdownProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightedCreator, setHighlightedCreator] = useState<SearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOpenChange]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setHighlightedCreator(null);
      return;
    }

    const timer = setTimeout(() => doSearch(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const doSearch = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setHighlightedCreator(null);

    try {
      const likeQ = `%${q}%`;

      // Phase 1: Fast DB search
      const [profiles, credits, opps] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, role, bio, location")
          .or(`full_name.ilike.${likeQ},role.ilike.${likeQ}`)
          .eq("onboarding_completed", true)
          .limit(5),
        supabase
          .from("credits")
          .select("id, project_name, role, year, project_type, thumbnail_url")
          .or(`project_name.ilike.${likeQ},role.ilike.${likeQ}`)
          .limit(5),
        supabase
          .from("opportunities")
          .select("id, title, type, compensation, location")
          .eq("status", "active")
          .ilike("title", likeQ)
          .limit(3),
      ]);

      if (controller.signal.aborted) return;

      const dbResults: SearchResult[] = [];

      // Creators with bio preview
      for (const p of profiles.data || []) {
        const creator: SearchResult = {
          type: "creator",
          id: p.user_id,
          title: p.full_name || "Creator",
          subtitle: [p.role, p.location].filter(Boolean).join(" · "),
          avatar: p.avatar_url,
          bio: p.bio || undefined,
        };
        dbResults.push(creator);
      }

      // Credits
      for (const c of credits.data || []) {
        dbResults.push({
          type: "credit",
          id: c.id,
          title: c.project_name,
          subtitle: [c.role, c.year].filter(Boolean).join(" · "),
          avatar: c.thumbnail_url,
        });
      }

      // Gigs
      for (const o of opps.data || []) {
        dbResults.push({
          type: "gig",
          id: o.id,
          title: o.title,
          subtitle: [o.type, o.compensation, o.location].filter(Boolean).join(" · "),
        });
      }

      // Highlight first creator for AI bio display
      const firstCreator = dbResults.find((r) => r.type === "creator");
      if (firstCreator) {
        // Load their credits for the card
        const { data: creatorCredits } = await supabase
          .from("credits")
          .select("project_name, role")
          .eq("user_id", firstCreator.id)
          .order("year", { ascending: false })
          .limit(4);

        if (!controller.signal.aborted) {
          firstCreator.credits = (creatorCredits || []).map((c) => ({
            project: c.project_name,
            role: c.role,
          }));
          setHighlightedCreator(firstCreator);
        }
      }

      setResults(dbResults);

      // Phase 2: Web search if limited DB results
      if (dbResults.length < 3 && q.length >= 3) {
        try {
          const { data: webData } = await supabase.functions.invoke("search-credits-web", {
            body: { query: q },
          });
          if (controller.signal.aborted) return;

          const webResults: SearchResult[] = (webData?.results || []).slice(0, 5).map((r: any, i: number) => ({
            type: "web" as const,
            id: `web-${i}`,
            title: r.title,
            subtitle: [r.type, r.year, r.platform].filter(Boolean).join(" · "),
            avatar: r.image_url || null,
            platform: r.platform,
          }));

          setResults((prev) => [...prev, ...webResults]);
        } catch {
          // Web search is supplementary
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error("Search error:", err);
        setResults([]);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const handleSelect = (r: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setHighlightedCreator(null);
    onOpenChange?.(false);

    if (onSelect) {
      onSelect(r);
      return;
    }

    if (r.type === "creator") navigate(`/profile/${r.id}`);
    else if (r.type === "gig") navigate(`/opportunity/${r.id}`);
    else if (r.type === "credit") navigate(`/production?name=${encodeURIComponent(r.title)}`);
    else navigate(`/search?q=${encodeURIComponent(r.title)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setOpen(false);
      setQuery("");
      onOpenChange?.(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setHighlightedCreator(null);
    inputRef.current?.focus();
  };

  const isHero = variant === "hero";
  const isNavbar = variant === "navbar";

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-muted-foreground",
              isHero ? "left-4 h-5 w-5" : "left-3 h-4 w-4"
            )}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              onOpenChange?.(true);
            }}
            onFocus={() => {
              if (query.trim().length >= 2) {
                setOpen(true);
                onOpenChange?.(true);
              }
            }}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              "w-full border text-foreground transition-all placeholder:text-muted-foreground/50 focus:outline-none",
              isHero
                ? "h-12 sm:h-14 rounded-2xl border-border/60 bg-card/80 backdrop-blur-sm pl-12 pr-20 text-sm shadow-lg focus:border-primary focus:shadow-[var(--shadow-glow)]"
                : isNavbar
                ? "h-9 rounded-xl border-border bg-muted/40 pl-9 pr-8 text-sm focus:border-primary/50 focus:bg-card"
                : "h-10 rounded-xl border-border bg-muted/40 pl-9 pr-8 text-sm focus:border-primary/50 focus:bg-card"
            )}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
                isHero ? "right-14" : "right-2.5"
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {isHero && (
            <button
              type="submit"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-md"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {/* ═══ DROPDOWN ═══ */}
      {open && query.trim().length >= 2 && (
        <div
          className={cn(
            "absolute left-0 right-0 mt-2 rounded-xl border border-border bg-popover shadow-xl z-[100] overflow-hidden backdrop-blur-lg",
            isNavbar ? "max-h-[70vh]" : "max-h-[60vh]"
          )}
        >
          <div className="overflow-y-auto max-h-[inherit]">
            {/* Loading state */}
            {loading && results.length === 0 && (
              <div className="px-4 py-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching across the creative universe...
              </div>
            )}

            {/* Highlighted creator card with AI bio */}
            {highlightedCreator && (
              <div className="border-b border-border">
                <button
                  onClick={() => handleSelect(highlightedCreator)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11 shrink-0 ring-2 ring-primary/20">
                      <AvatarImage src={highlightedCreator.avatar || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {(highlightedCreator.title || "?")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground truncate">
                          {highlightedCreator.title}
                        </p>
                        <Badge variant="outline" className="text-[9px] text-primary border-primary/30 shrink-0">
                          Creator
                        </Badge>
                      </div>
                      {highlightedCreator.subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">{highlightedCreator.subtitle}</p>
                      )}
                      {highlightedCreator.bio && (
                        <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2 italic">
                          "{highlightedCreator.bio}"
                        </p>
                      )}

                      {/* Credits preview */}
                      {highlightedCreator.credits && highlightedCreator.credits.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {highlightedCreator.credits.slice(0, 3).map((c, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-primary/8 text-primary/80 border border-primary/10"
                            >
                              {c.project} — {c.role}
                            </span>
                          ))}
                          {highlightedCreator.credits.length > 3 && (
                            <span className="text-[10px] text-muted-foreground px-1">
                              +{highlightedCreator.credits.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                {/* "Not you?" prompt */}
                <div className="px-4 pb-2">
                  <p className="text-[10px] text-muted-foreground/60">
                    Not who you're looking for?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setHighlightedCreator(null);
                        inputRef.current?.focus();
                      }}
                      className="text-primary/70 hover:text-primary underline underline-offset-2"
                    >
                      See all results
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* Rest of results */}
            {results
              .filter((r) => !highlightedCreator || r.id !== highlightedCreator.id)
              .map((r, i) => {
                const meta = TYPE_META[r.type];
                return (
                  <button
                    key={`${r.type}-${r.id}-${i}`}
                    onClick={() => handleSelect(r)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                  >
                    {r.avatar ? (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={r.avatar} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {(r.title || "?")[0]}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <meta.icon className={cn("h-3.5 w-3.5", meta.color)} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                      {r.subtitle && (
                        <p className="text-[11px] text-muted-foreground truncate">{r.subtitle}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[9px] shrink-0", meta.color)}
                    >
                      {meta.label}
                    </Badge>
                  </button>
                );
              })}

            {/* Empty state */}
            {!loading && results.length === 0 && query.trim().length >= 2 && (
              <div className="px-4 py-4 text-center">
                <Sparkles className="h-5 w-5 text-primary/50 mx-auto mb-1.5" />
                <p className="text-sm text-muted-foreground">No results yet</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Press Enter for an AI-powered deep search
                </p>
              </div>
            )}

            {/* Deep search footer */}
            {results.length > 0 && (
              <button
                onClick={handleSubmit as any}
                className="w-full px-4 py-2.5 text-sm text-primary font-medium hover:bg-muted/50 transition-colors border-t border-border flex items-center justify-center gap-2"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Deep search for "{query}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
