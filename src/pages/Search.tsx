import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search as SearchIcon, Database, Verified, MapPin, Loader2, Lock, ArrowRight, Briefcase } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

interface ProfileResult {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
  location: string | null;
  professional_skills: any;
  thrive_id?: string | null;
}

interface CreditResult {
  id: string;
  project_name: string;
  role: string;
  year: number | null;
  verification_status: string | null;
  credit_category: string | null;
  thumbnail_url: string | null;
  user_id: string;
  collaborator_user_ids: string[] | null;
}

interface OpportunityResult {
  id: string;
  title: string;
  description: string;
  type: string;
  compensation: string | null;
  location: string | null;
  created_at: string | null;
}

interface SpotlightCredit {
  id: string;
  project_name: string;
  role: string;
  verification_status: string | null;
  thumbnail_url: string | null;
  user_id: string;
  credit_category: string | null;
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<ProfileResult[]>([]);
  const [credits, setCredits] = useState<CreditResult[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityResult[]>([]);
  const [spotlight, setSpotlight] = useState<SpotlightCredit[]>([]);

  // Fetch spotlight
  useEffect(() => {
    const fetchSpotlight = async () => {
      const { data } = await supabase
        .from("credits")
        .select("id, project_name, role, verification_status, thumbnail_url, user_id, credit_category")
        .not("thumbnail_url", "is", null)
        .neq("thumbnail_url", "")
        .order("created_at", { ascending: false })
        .limit(4);
      if (data) setSpotlight(data);
    };
    fetchSpotlight();
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setProfiles([]);
      setCredits([]);
      setOpportunities([]);
      return;
    }
    setLoading(true);
    const q = `%${searchQuery.trim()}%`;
    try {
      const [profilesRes, creditsRes, oppsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, role, location, professional_skills")
          .or(`full_name.ilike.${q},role.ilike.${q},location.ilike.${q}`)
          .eq("onboarding_completed", true)
          .limit(20),
        supabase
          .from("credits")
          .select("id, project_name, role, year, verification_status, credit_category, thumbnail_url, user_id, collaborator_user_ids")
          .or(`project_name.ilike.${q},role.ilike.${q}`)
          .order("year", { ascending: false })
          .limit(20),
        supabase
          .from("opportunities")
          .select("id, title, description, type, compensation, location, created_at")
          .eq("status", "active")
          .or(`title.ilike.${q},description.ilike.${q}`)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      setProfiles(profilesRes.data || []);
      setCredits(creditsRes.data || []);
      setOpportunities(oppsRes.data || []);
    } catch (error) {
      console.error("[Search] Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSearchParams({ q: query.trim() });
  };

  const hasResults = profiles.length > 0 || credits.length > 0 || opportunities.length > 0;
  const hasQuery = !!searchParams.get("q");

  const verBadge = (status: string | null) => {
    const s = (status || "").toLowerCase();
    if (s === "enterprise") return { text: "Verified", cls: "bg-success/20 text-success border-success/30" };
    if (s === "peer") return { text: "Peer Verified", cls: "bg-primary/20 text-primary border-primary/30" };
    if (s === "ai" || s === "identity") return { text: "AI Verified", cls: "bg-[hsl(200,70%,50%)]/20 text-[hsl(200,70%,60%)] border-[hsl(200,70%,50%)]/30" };
    return { text: "Unverified", cls: "bg-[hsl(220,10%,20%)] text-[hsl(220,10%,50%)] border-[hsl(230,15%,25%)]" };
  };

  return (
    <div className="min-h-screen bg-[hsl(230,20%,7%)] text-white pb-20">
      <SEO title={`Search${searchParams.get("q") ? ` "${searchParams.get("q")}"` : ""} — ThriveIN`} description="Search creators, credits, and productions across every creative industry." />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {/* Search bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(220,10%,40%)]" />
              <input
                placeholder="Find Me or a Project (AI is searching)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-14 rounded-xl border border-[hsl(230,15%,20%)] bg-[hsl(230,18%,12%)] pl-12 pr-14 text-sm text-white focus:outline-none focus:border-[hsl(235,65%,52%)] focus:shadow-[0_0_30px_hsl(235,65%,52%,0.15)] transition-all placeholder:text-[hsl(220,10%,40%)]"
                autoFocus
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-lg bg-[hsl(235,65%,52%)] text-white flex items-center justify-center hover:bg-[hsl(235,65%,58%)] transition-colors">
                <SearchIcon className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(235,70%,65%)]" />
          </div>
        )}

        {!loading && hasQuery && (
          <div className="grid lg:grid-cols-[1fr_1fr_300px] gap-6 lg:gap-8">
            {/* Column 1: Profiles (Talent) */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[hsl(220,10%,45%)] mb-4 flex items-center gap-2">
                Profiles <span className="text-[hsl(220,10%,35%)]">(Talent)</span>
              </h2>
              <div className="space-y-3">
                {profiles.map((p) => {
                  const skills = Array.isArray(p.professional_skills)
                    ? p.professional_skills.slice(0, 3).map((s: any) => (typeof s === "string" ? s : s?.skill || "")).filter(Boolean)
                    : [];
                  return (
                    <button
                      key={p.user_id}
                      onClick={() => navigate(`/profile/${p.user_id}`)}
                      className="w-full text-left rounded-xl border border-[hsl(230,15%,18%)] bg-[hsl(230,18%,10%)] p-4 hover:border-[hsl(235,65%,52%,0.4)] transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 border-2 border-[hsl(230,15%,20%)]">
                          <AvatarImage src={p.avatar_url || ""} />
                          <AvatarFallback className="bg-[hsl(235,65%,52%,0.15)] text-[hsl(235,70%,75%)]">
                            {(p.full_name || "?")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm text-white truncate">{p.full_name}</p>
                            <Verified className="h-3.5 w-3.5 text-[hsl(235,70%,65%)] shrink-0" />
                          </div>
                          <p className="text-xs text-[hsl(220,10%,50%)]">{p.role}</p>
                          {/* Top credits would go here - placeholder */}
                          {skills.length > 0 && (
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              {skills.map((s: string) => (
                                <Badge key={s} className="text-[9px] px-2 py-0.5 bg-[hsl(230,15%,15%)] border-[hsl(230,15%,22%)] text-[hsl(220,10%,60%)]">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* View profile link */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[hsl(230,15%,15%)]">
                        {p.location && (
                          <span className="text-[10px] text-[hsl(220,10%,40%)] flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {p.location}
                          </span>
                        )}
                        <span className="text-[10px] text-[hsl(235,70%,65%)] font-medium group-hover:underline ml-auto flex items-center gap-1">
                          View Full Profile <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </button>
                  );
                })}
                {profiles.length === 0 && (
                  <div className="text-center py-8 text-[hsl(220,10%,40%)] text-sm">No profiles found</div>
                )}
              </div>
            </div>

            {/* Column 2: Verified Productions (Projects) */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[hsl(220,10%,45%)] mb-4 flex items-center gap-2">
                Verified Productions <span className="text-[hsl(220,10%,35%)]">(Projects)</span>
              </h2>
              <div className="space-y-3">
                {credits.map((c) => {
                  const v = verBadge(c.verification_status);
                  return (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/profile/${c.user_id}`)}
                      className="w-full text-left rounded-xl border border-[hsl(230,15%,18%)] bg-[hsl(230,18%,10%)] overflow-hidden hover:border-[hsl(235,65%,52%,0.4)] transition-all group"
                    >
                      {c.thumbnail_url && (
                        <div className="aspect-video overflow-hidden relative">
                          <img src={c.thumbnail_url} alt={c.project_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(230,20%,7%)] via-transparent to-transparent" />
                          <Badge className={`absolute top-2 left-2 text-[9px] border ${v.cls}`}>
                            <Verified className="h-2.5 w-2.5 mr-1" />
                            {v.text}
                          </Badge>
                        </div>
                      )}
                      <div className="p-3">
                        {!c.thumbnail_url && (
                          <Badge className={`text-[9px] border mb-2 ${v.cls}`}>
                            <Verified className="h-2.5 w-2.5 mr-1" />
                            {v.text}
                          </Badge>
                        )}
                        <p className="font-semibold text-sm text-white leading-tight line-clamp-2">{c.project_name}</p>
                        <p className="text-[11px] text-[hsl(220,10%,50%)] mt-1">
                          {c.role} {c.year ? `· ${c.year}` : ""} {c.credit_category ? `· ${c.credit_category}` : ""}
                        </p>
                        {/* Verified Roll Call hint */}
                        {c.collaborator_user_ids && c.collaborator_user_ids.length > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-[10px] text-[hsl(220,10%,40%)]">
                            <Database className="h-3 w-3" />
                            <span>Verified Roll Call · {c.collaborator_user_ids.length} collaborators</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
                {/* Gigs in productions column */}
                {opportunities.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => navigate(`/opportunity/${o.id}`)}
                    className="w-full text-left rounded-xl border border-[hsl(230,15%,18%)] bg-[hsl(230,18%,10%)] p-3 hover:border-[hsl(235,65%,52%,0.4)] transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="text-[9px] bg-success/20 text-success border-success/30">
                        <Briefcase className="h-2.5 w-2.5 mr-1" />
                        {o.type}
                      </Badge>
                      {o.compensation && !user && (
                        <Badge className="text-[9px] bg-[hsl(230,15%,15%)] text-[hsl(220,10%,40%)] border-[hsl(230,15%,22%)]">
                          <Lock className="h-2.5 w-2.5 mr-1" />
                          Gated
                        </Badge>
                      )}
                    </div>
                    <p className="font-semibold text-sm text-white truncate">{o.title}</p>
                    <p className="text-[11px] text-[hsl(220,10%,50%)] line-clamp-1 mt-0.5">{o.description}</p>
                  </button>
                ))}
                {credits.length === 0 && opportunities.length === 0 && (
                  <div className="text-center py-8 text-[hsl(220,10%,40%)] text-sm">No productions found</div>
                )}
              </div>
            </div>

            {/* Column 3: Spotlight sidebar */}
            <div className="hidden lg:block">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[hsl(220,10%,45%)] mb-4">
                Spotlight
              </h3>
              <div className="space-y-3">
                {spotlight.map((credit) => {
                  const v = verBadge(credit.verification_status);
                  return (
                    <button
                      key={credit.id}
                      onClick={() => navigate(`/profile/${credit.user_id}`)}
                      className="w-full group"
                    >
                      <div className="relative rounded-xl overflow-hidden border border-[hsl(230,15%,18%)] hover:border-[hsl(235,65%,52%,0.4)] transition-all">
                        {credit.thumbnail_url && (
                          <div className="aspect-[16/10] overflow-hidden">
                            <img src={credit.thumbnail_url} alt={credit.project_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(230,20%,7%)] via-transparent to-transparent" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-2.5">
                          <Badge className={`mb-1 text-[8px] border ${v.cls}`}>
                            <Verified className="h-2 w-2 mr-0.5" />
                            {v.text}
                          </Badge>
                          <p className="text-[11px] font-semibold text-white leading-tight line-clamp-2">
                            {credit.project_name}
                          </p>
                          <p className="text-[9px] text-[hsl(220,10%,50%)] mt-0.5 truncate">{credit.role}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Empty state before search */}
        {!loading && !hasQuery && (
          <div className="text-center py-16">
            <Database className="h-12 w-12 mx-auto mb-4 text-[hsl(230,15%,20%)]" />
            <p className="text-[hsl(220,10%,45%)] text-sm">Search for creators, productions, or credits</p>
          </div>
        )}

        {!loading && hasQuery && !hasResults && (
          <div className="text-center py-16">
            <SearchIcon className="h-12 w-12 mx-auto mb-4 text-[hsl(230,15%,20%)]" />
            <p className="text-[hsl(220,10%,45%)]">No results found for "{searchParams.get("q")}"</p>
            <p className="text-[hsl(220,10%,35%)] text-sm mt-1">Try different keywords</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
