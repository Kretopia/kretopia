import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search as SearchIcon, Database, Verified, MapPin, Loader2, Lock, ArrowRight, Briefcase, Sparkles, ExternalLink, Globe, ChevronDown, ChevronUp, UserPlus, CheckCircle2, Film, Music, Camera, Calendar, Palette, Video, Mic } from "lucide-react";

interface ProfileResult {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
  location: string | null;
  professional_skills: any;
}

interface RoleEntry {
  id: string;
  role: string;
  user_id: string;
  verification_status: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface CreditResult {
  project_name: string;
  year: number | null;
  verification_status: string | null;
  credit_category: string | null;
  thumbnail_url: string | null;
  client_brand: string | null;
  platform: string | null;
  description: string | null;
  roles: RoleEntry[];
}

interface OpportunityResult {
  id: string;
  title: string;
  description: string;
  type: string;
  compensation: string | null;
  location: string | null;
}

interface KnowledgeCard {
  type: string;
  name: string;
  description: string;
  known_for: string[];
  industry: string;
  key_credits: { project: string; role: string; year: number; platform?: string; image_suggestion?: string }[];
  collaborators: string[];
  fun_fact: string;
  claim_prompt: string;
  platforms?: string[];
  social_links?: Record<string, string>;
}

interface VisualResult {
  title: string;
  subtitle?: string;
  type: string;
  year?: number;
  platform?: string;
  description?: string;
  image_suggestion?: string;
  url?: string;
}

interface ExternalData {
  knowledge_card: KnowledgeCard | null;
  visual_results?: VisualResult[];
  related_searches: string[];
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<ProfileResult[]>([]);
  const [credits, setCredits] = useState<CreditResult[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityResult[]>([]);
  const [external, setExternal] = useState<ExternalData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setProfiles([]); setCredits([]); setOpportunities([]); setExternal(null);
      return;
    }
    setLoading(true);
    setAiLoading(true);

    try {
      // Call universal-search edge function for blended results
      const { data, error } = await supabase.functions.invoke('universal-search', {
        body: { query: searchQuery.trim() },
      });

      if (error) throw error;

      setProfiles(data?.platform?.profiles || []);
      setCredits(data?.platform?.credits || []);
      setOpportunities(data?.platform?.opportunities || []);
      setExternal(data?.external || null);
    } catch (err) {
      console.error("[Search] Error:", err);
      // Fallback to direct queries (group locally)
      const q = `%${searchQuery.trim()}%`;
      const [profilesRes, creditsRes, oppsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url, role, location, professional_skills").or(`full_name.ilike.${q},role.ilike.${q},location.ilike.${q}`).eq("onboarding_completed", true).limit(15),
        supabase.from("credits").select("id, project_name, role, year, verification_status, credit_category, thumbnail_url, user_id").or(`project_name.ilike.${q},role.ilike.${q}`).order("year", { ascending: false }).limit(20),
        supabase.from("opportunities").select("id, title, description, type, compensation, location").eq("status", "active").or(`title.ilike.${q},description.ilike.${q}`).limit(10),
      ]);
      setProfiles(profilesRes.data || []);
      // Group fallback credits by project_name
      const fallbackCredits = creditsRes.data || [];
      const grouped = new Map<string, CreditResult>();
      for (const c of fallbackCredits) {
        if (!grouped.has(c.project_name)) {
          grouped.set(c.project_name, { project_name: c.project_name, year: c.year, verification_status: c.verification_status, credit_category: c.credit_category, thumbnail_url: c.thumbnail_url, client_brand: null, platform: null, description: null, roles: [] });
        }
        grouped.get(c.project_name)!.roles.push({ id: c.id, role: c.role, user_id: c.user_id, verification_status: c.verification_status, full_name: null, avatar_url: null });
      }
      setCredits(Array.from(grouped.values()));
      setOpportunities(oppsRes.data || []);
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) { setQuery(q); performSearch(q); }
  }, [searchParams, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSearchParams({ q: query.trim() });
  };

  const hasResults = profiles.length > 0 || credits.length > 0 || opportunities.length > 0;
  const hasKnowledge = external?.knowledge_card && external.knowledge_card.type !== "none";
  const hasQuery = !!searchParams.get("q");

  const verBadge = (status: string | null) => {
    const s = (status || "").toLowerCase();
    if (s === "enterprise" || s === "verified") return { text: "Verified", cls: "bg-success/20 text-success border-success/30" };
    if (s === "peer") return { text: "Peer Verified", cls: "bg-primary/20 text-primary border-primary/30" };
    return { text: "Unverified", cls: "bg-muted text-muted-foreground border-border" };
  };

  // Build blended results list
  const blendedItems: { type: string; data: any; weight: number }[] = [];

  // Add knowledge card at top
  if (hasKnowledge) {
    blendedItems.push({ type: "knowledge", data: external!.knowledge_card, weight: 100 });
  }

  // Interleave profiles and credits
  const maxLen = Math.max(profiles.length, credits.length, opportunities.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < profiles.length) blendedItems.push({ type: "profile", data: profiles[i], weight: 80 - i });
    if (i < credits.length) blendedItems.push({ type: "credit", data: credits[i], weight: 75 - i });
    if (i < opportunities.length) blendedItems.push({ type: "opportunity", data: opportunities[i], weight: 70 - i });
  }

  // Add AI external credits that don't exist in platform
  if (hasKnowledge && external?.knowledge_card?.key_credits) {
    external.knowledge_card.key_credits.forEach((kc, i) => {
      const exists = credits.some((c) => c.project_name.toLowerCase().includes(kc.project.toLowerCase()));
      if (!exists) {
        blendedItems.push({ type: "external_credit", data: kc, weight: 60 - i });
      }
    });
  }

  // Add visual results grid from AI
  if (external?.visual_results && external.visual_results.length > 0) {
    blendedItems.push({ type: "visual_grid", data: external.visual_results, weight: 55 });
  }

  // Related searches
  if (external?.related_searches && external.related_searches.length > 0) {
    blendedItems.push({ type: "related", data: external.related_searches, weight: 0 });
  }

  return (
    <div className="min-h-screen bg-[hsl(230,20%,7%)] text-white pb-20">
      <SEO title={`Search${searchParams.get("q") ? ` "${searchParams.get("q")}"` : ""} — ThriveIN`} description="AI-powered search across the creative economy." />

      <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-6">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(220,10%,40%)]" />
            <input
              placeholder="Search people, productions, gigs, or anything creative..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-14 rounded-2xl border border-[hsl(230,15%,20%)] bg-[hsl(230,18%,11%)] pl-12 pr-14 text-sm text-white focus:outline-none focus:border-[hsl(235,65%,52%)] focus:shadow-[0_0_30px_hsl(235,65%,52%,0.15)] transition-all placeholder:text-[hsl(220,10%,38%)]"
              autoFocus
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-[hsl(235,65%,52%)] text-white flex items-center justify-center hover:bg-[hsl(235,65%,58%)] transition-colors">
              <SearchIcon className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(235,70%,65%)]" />
            <p className="text-xs text-[hsl(220,10%,45%)] animate-pulse">Searching platform + AI knowledge base...</p>
          </div>
        )}

        {/* Blended results */}
        {!loading && hasQuery && (
          <div className="space-y-4">
            {blendedItems.map((item, idx) => {
              if (item.type === "knowledge") {
                const kc = item.data as KnowledgeCard;
                return (
                  <div key="knowledge" className="rounded-2xl border border-[hsl(235,65%,52%,0.25)] bg-gradient-to-br from-[hsl(235,65%,52%,0.08)] to-[hsl(230,18%,9%)] p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-[hsl(235,65%,52%,0.2)] flex items-center justify-center shrink-0">
                        <Globe className="h-5 w-5 text-[hsl(235,70%,65%)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-base text-white">{kc.name}</h3>
                          <Badge className="text-[8px] bg-[hsl(235,65%,52%,0.15)] border-[hsl(235,65%,52%,0.3)] text-[hsl(235,70%,75%)]">
                            <Sparkles className="h-2 w-2 mr-0.5" /> AI Knowledge
                          </Badge>
                        </div>
                        <p className="text-xs text-[hsl(220,10%,55%)]">{kc.industry}</p>
                      </div>
                    </div>
                    <p className="text-sm text-[hsl(220,10%,65%)] mb-3 leading-relaxed">{kc.description}</p>

                    {kc.known_for && kc.known_for.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(220,10%,42%)] mb-1.5">Known For</p>
                        <div className="flex flex-wrap gap-1.5">
                          {kc.known_for.map((k) => (
                            <Badge key={k} className="text-[10px] bg-[hsl(230,15%,15%)] border-[hsl(230,15%,22%)] text-[hsl(220,10%,65%)]">{k}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {kc.fun_fact && (
                      <p className="text-[11px] text-[hsl(220,10%,48%)] italic mb-3">💡 {kc.fun_fact}</p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-[hsl(230,15%,18%)]">
                      <p className="text-[10px] text-[hsl(235,70%,65%)]">{kc.claim_prompt}</p>
                      <button onClick={() => navigate('/auth')} className="text-[10px] font-semibold text-[hsl(235,70%,65%)] hover:underline flex items-center gap-1">
                        Claim Profile <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              }

              if (item.type === "profile") {
                const p = item.data as ProfileResult;
                const skills = Array.isArray(p.professional_skills) ? p.professional_skills.slice(0, 3).map((s: any) => typeof s === "string" ? s : s?.skill || "").filter(Boolean) : [];
                return (
                  <button key={`p-${p.user_id}`} onClick={() => navigate(`/profile/${p.user_id}`)} className="w-full text-left rounded-xl border border-[hsl(230,15%,18%)] bg-[hsl(230,18%,10%)] p-4 hover:border-[hsl(235,65%,52%,0.4)] transition-all group">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-11 w-11 border-2 border-[hsl(230,15%,20%)]">
                        <AvatarImage src={p.avatar_url || ""} />
                        <AvatarFallback className="bg-[hsl(235,65%,52%,0.15)] text-[hsl(235,70%,75%)]">{(p.full_name || "?")[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-sm text-white truncate">{p.full_name}</p>
                          <Badge className="text-[8px] bg-[hsl(235,65%,52%,0.15)] border-[hsl(235,65%,52%,0.25)] text-[hsl(235,70%,75%)]">
                            <Verified className="h-2 w-2 mr-0.5" /> On Platform
                          </Badge>
                        </div>
                        <p className="text-xs text-[hsl(220,10%,50%)]">{p.role}</p>
                        {skills.length > 0 && (
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {skills.map((s: string) => (
                              <Badge key={s} className="text-[9px] px-2 py-0.5 bg-[hsl(230,15%,15%)] border-[hsl(230,15%,22%)] text-[hsl(220,10%,60%)]">{s}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {p.location && (
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[hsl(230,15%,15%)]">
                        <span className="text-[10px] text-[hsl(220,10%,40%)] flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.location}</span>
                        <span className="text-[10px] text-[hsl(235,70%,65%)] font-medium group-hover:underline flex items-center gap-1">View <ArrowRight className="h-3 w-3" /></span>
                      </div>
                    )}
                  </button>
                );
              }

              if (item.type === "credit") {
                const c = item.data as CreditResult;
                const v = verBadge(c.verification_status);
                const isExpanded = expandedProjects.has(c.project_name);
                const toggleExpand = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  setExpandedProjects(prev => {
                    const next = new Set(prev);
                    next.has(c.project_name) ? next.delete(c.project_name) : next.add(c.project_name);
                    return next;
                  });
                };
                return (
                  <div key={`c-${c.project_name}-${idx}`} onClick={() => navigate(`/production?name=${encodeURIComponent(c.project_name)}`)} className="cursor-pointer rounded-xl border border-[hsl(230,15%,18%)] bg-[hsl(230,18%,10%)] overflow-hidden hover:border-[hsl(235,65%,52%,0.4)] transition-all">
                    {c.thumbnail_url && (
                      <div className="aspect-[21/9] overflow-hidden relative">
                        <img src={c.thumbnail_url} alt={c.project_name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(230,20%,7%)] via-transparent to-transparent" />
                        <Badge className={`absolute top-2 left-2 text-[9px] border ${v.cls}`}><Verified className="h-2.5 w-2.5 mr-1" />{v.text}</Badge>
                      </div>
                    )}
                    <div className="p-3">
                      {!c.thumbnail_url && <Badge className={`text-[9px] border mb-2 ${v.cls}`}><Verified className="h-2.5 w-2.5 mr-1" />{v.text}</Badge>}
                      <p className="font-semibold text-sm text-white leading-tight line-clamp-2">{c.project_name}</p>
                      <p className="text-[11px] text-[hsl(220,10%,50%)] mt-1">
                        {c.roles.length} credit{c.roles.length !== 1 ? "s" : ""}
                        {c.year ? ` · ${c.year}` : ""}
                        {c.credit_category ? ` · ${c.credit_category}` : ""}
                        {c.client_brand ? ` · ${c.client_brand}` : ""}
                      </p>

                      {/* Roll Call toggle */}
                      <button onClick={toggleExpand} className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-[hsl(235,70%,65%)] hover:text-[hsl(235,70%,75%)] transition-colors">
                        <Database className="h-3 w-3" />
                        {isExpanded ? "Hide" : "Show"} Roll Call · {c.roles.length} role{c.roles.length !== 1 ? "s" : ""}
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      {/* Expanded Roll Call */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-[hsl(230,15%,16%)] space-y-1.5">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-[hsl(220,10%,38%)] mb-2">Production Credits</p>
                          {c.roles.map((r, ri) => {
                            const rv = verBadge(r.verification_status);
                            return (
                              <div key={r.id || ri} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[hsl(230,15%,13%)] transition-colors">
                                <Avatar className="h-7 w-7 border border-[hsl(230,15%,20%)]">
                                  <AvatarImage src={r.avatar_url || ""} />
                                  <AvatarFallback className="text-[10px] bg-[hsl(235,65%,52%,0.15)] text-[hsl(235,70%,75%)]">
                                    {(r.full_name || "?")[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-white truncate">{r.full_name || "Unclaimed"}</p>
                                  <p className="text-[10px] text-[hsl(220,10%,50%)] truncate">{r.role}</p>
                                </div>
                                {r.full_name ? (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <CheckCircle2 className={`h-3.5 w-3.5 ${rv.cls.includes("success") ? "text-success" : "text-[hsl(220,10%,35%)]"}`} />
                                    <button
                                      onClick={(e) => { e.stopPropagation(); navigate(`/profile/${r.user_id}`); }}
                                      className="text-[10px] font-medium text-[hsl(235,70%,65%)] hover:underline"
                                    >
                                      View
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); navigate('/auth'); }}
                                    className="flex items-center gap-1 text-[10px] font-semibold text-[hsl(235,70%,65%)] hover:text-[hsl(235,70%,75%)] shrink-0"
                                  >
                                    <UserPlus className="h-3 w-3" /> Claim
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          {/* Generic claim CTA */}
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(user ? '/credits' : '/auth'); }}
                            className="w-full mt-2 py-2 rounded-lg border border-dashed border-[hsl(235,65%,52%,0.3)] text-[10px] font-semibold text-[hsl(235,70%,65%)] hover:bg-[hsl(235,65%,52%,0.08)] transition-colors flex items-center justify-center gap-1.5"
                          >
                            <UserPlus className="h-3 w-3" /> Worked on this? Claim your credit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              if (item.type === "external_credit") {
                const ec = item.data as { project: string; role: string; year: number };
                return (
                  <button key={`ec-${ec.project}-${idx}`} onClick={() => navigate(`/production?name=${encodeURIComponent(ec.project)}`)} className="w-full text-left rounded-xl border border-dashed border-[hsl(230,15%,22%)] bg-[hsl(230,18%,9%)] p-3 hover:border-[hsl(235,65%,52%,0.3)] transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="text-[8px] bg-[hsl(235,65%,52%,0.1)] border-[hsl(235,65%,52%,0.2)] text-[hsl(235,70%,70%)]">
                        <ExternalLink className="h-2 w-2 mr-0.5" /> Web Source
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-white">{ec.project}</p>
                    <p className="text-[10px] text-[hsl(220,10%,48%)] mt-0.5">{ec.role}{ec.year ? ` · ${ec.year}` : ""}</p>
                    <p className="text-[9px] text-[hsl(235,70%,60%)] mt-1.5">Not yet on ThriveIN — Claim this credit →</p>
                  </button>
                );
              }

              if (item.type === "visual_grid") {
                const results = item.data as VisualResult[];
                const typeIcons: Record<string, any> = {
                  film: Film, music: Music, photo: Camera, event: Calendar,
                  podcast: Mic, video: Video, fashion: Palette, design: Palette,
                };
                return (
                  <div key="visual-grid" className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(220,10%,42%)]">Discovered Works</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {results.map((vr, vi) => {
                        const VrIcon = typeIcons[vr.type] || Globe;
                        return (
                          <button
                            key={`vr-${vi}`}
                            onClick={() => navigate(`/production?name=${encodeURIComponent(vr.title)}`)}
                            className="text-left rounded-xl border border-[hsl(230,15%,18%)] bg-[hsl(230,18%,10%)] overflow-hidden hover:border-[hsl(235,65%,52%,0.4)] transition-all group"
                          >
                            <div className="aspect-[4/3] bg-gradient-to-br from-[hsl(235,65%,52%,0.15)] to-[hsl(230,18%,8%)] flex items-center justify-center relative">
                              <VrIcon className="h-8 w-8 text-[hsl(235,65%,52%,0.3)]" />
                              {vr.platform && (
                                <Badge className="absolute top-1.5 right-1.5 text-[7px] bg-[hsl(230,18%,12%,0.9)] border-[hsl(230,15%,22%)] text-[hsl(220,10%,55%)]">
                                  {vr.platform}
                                </Badge>
                              )}
                            </div>
                            <div className="p-2.5">
                              <p className="text-[11px] font-semibold text-white line-clamp-2 leading-tight">{vr.title}</p>
                              {vr.subtitle && <p className="text-[9px] text-[hsl(220,10%,50%)] mt-0.5">{vr.subtitle}</p>}
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <Badge className="text-[7px] bg-[hsl(230,15%,15%)] border-[hsl(230,15%,22%)] text-[hsl(220,10%,55%)]">{vr.type}</Badge>
                                {vr.year && <span className="text-[8px] text-[hsl(220,10%,40%)]">{vr.year}</span>}
                              </div>
                              {vr.description && <p className="text-[9px] text-[hsl(220,10%,45%)] mt-1.5 line-clamp-2">{vr.description}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (item.type === "opportunity") {
                const o = item.data as OpportunityResult;
                return (
                  <button key={`o-${o.id}`} onClick={() => navigate(`/opportunity/${o.id}`)} className="w-full text-left rounded-xl border border-[hsl(230,15%,18%)] bg-[hsl(230,18%,10%)] p-3 hover:border-[hsl(235,65%,52%,0.4)] transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="text-[9px] bg-success/20 text-success border-success/30"><Briefcase className="h-2.5 w-2.5 mr-1" />{o.type}</Badge>
                      {o.compensation && !user && (
                        <Badge className="text-[9px] bg-[hsl(230,15%,15%)] text-[hsl(220,10%,40%)] border-[hsl(230,15%,22%)]"><Lock className="h-2.5 w-2.5 mr-1" />Sign in to see</Badge>
                      )}
                    </div>
                    <p className="font-semibold text-sm text-white truncate">{o.title}</p>
                    <p className="text-[11px] text-[hsl(220,10%,50%)] line-clamp-1 mt-0.5">{o.description}</p>
                  </button>
                );
              }

              if (item.type === "related") {
                const searches = item.data as string[];
                return (
                  <div key="related" className="rounded-xl border border-[hsl(230,15%,16%)] bg-[hsl(230,18%,9%)] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(220,10%,42%)] mb-2">Related Searches</p>
                    <div className="flex flex-wrap gap-2">
                      {searches.map((s) => (
                        <button key={s} onClick={() => setSearchParams({ q: s })} className="text-xs px-3 py-1.5 rounded-lg border border-[hsl(230,15%,20%)] bg-[hsl(230,18%,11%)] text-[hsl(220,10%,60%)] hover:border-[hsl(235,65%,52%,0.4)] hover:text-white transition-all">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {/* ═══ MANUAL CREDIT PROMPT ═══ */}
            {hasQuery && (
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <p className="text-sm font-semibold text-foreground mb-1">Not what you're looking for?</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Paste a link from IMDb, Spotify, YouTube, LinkedIn, or any platform to manually add your credit.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/credits')}
                    className="text-xs font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Add Credit Manually
                  </button>
                  <button
                    onClick={() => navigate('/profile')}
                    className="text-xs font-medium px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                  >
                    Claim Your Profile
                  </button>
                </div>
              </div>
            )}

            {!hasResults && !hasKnowledge && (
              <div className="text-center py-16">
                <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
                <p className="text-muted-foreground">No results found for "{searchParams.get("q")}"</p>
                <p className="text-muted-foreground/70 text-sm mt-1">Try different keywords or add your credit manually above</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasQuery && (
          <div className="text-center py-16">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-[hsl(235,65%,52%,0.3)]" />
            <p className="text-[hsl(220,10%,45%)] text-sm">AI-powered search across the creative economy</p>
            <p className="text-[hsl(220,10%,35%)] text-xs mt-1">Try searching for any creator, production, or brand</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
