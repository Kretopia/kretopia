import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Search, SlidersHorizontal, Sparkles, Loader2, Star, Verified, MapPin,
  Bell, BellOff, Bookmark, X, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileActivationGate } from "@/components/ProfileActivationGate";
import { getDiscoveryMissingFields } from "@/lib/profileCompletion";

interface CreatorRow {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
  location: string | null;
  verification_tier: string | null;
  average_rating: number | null;
  professional_skills: any;
  match_score?: number;
  match_reason?: string;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string | null;
  filters: any;
  alerts_enabled: boolean;
}

interface Filters {
  role: string;
  location: string;
  skill: string;
  verifiedOnly: boolean;
  minRating: number;
}

const EMPTY_FILTERS: Filters = { role: "", location: "", skill: "", verifiedOnly: false, minRating: 0 };

export function BrowseCreators() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [results, setResults] = useState<CreatorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveAlerts, setSaveAlerts] = useState(false);
  const [visibility, setVisibility] = useState<{ isVisible: boolean; missingFields: string[] }>({ isVisible: true, missingFields: [] });
  const [visibilityChecked, setVisibilityChecked] = useState(false);

  // Gate: enforce same discovery requirements as Circle/Nearby
  useEffect(() => {
    const check = async () => {
      if (!user?.id) { setVisibilityChecked(true); return; }
      try {
        const { data: profile } = await supabase
          .from("profiles").select("avatar_url, bio").eq("user_id", user.id).single();
        const { count } = await supabase
          .from("credits").select("id", { count: "exact", head: true }).eq("user_id", user.id);
        if (profile) {
          const missing = getDiscoveryMissingFields(profile as any, count || 0);
          setVisibility({ isVisible: missing.length === 0, missingFields: missing });
        }
      } finally { setVisibilityChecked(true); }
    };
    check();
  }, [user?.id]);
  const loadSaved = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_creator_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSavedSearches((data || []) as SavedSearch[]);
  }, [user]);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  const runFilterSearch = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, role, location, verification_tier, average_rating, professional_skills, bio, is_claimed, badge")
        .eq("onboarding_completed", true)
        .not("full_name", "is", null)
        .not("avatar_url", "is", null)
        .neq("avatar_url", "")
        .limit(120);

      if (filters.role) q = q.ilike("role", `%${filters.role}%`);
      if (filters.location) q = q.ilike("location", `%${filters.location}%`);
      if (filters.verifiedOnly) q = q.neq("verification_tier", "none").not("verification_tier", "is", null);
      if (filters.minRating > 0) q = q.gte("average_rating", filters.minRating);
      if (query.trim()) q = q.or(`full_name.ilike.%${query}%,role.ilike.%${query}%,bio.ilike.%${query}%`);

      const { data, error } = await q;
      if (error) throw error;
      let rows = (data || []) as (CreatorRow & { bio?: string | null; is_claimed?: boolean; badge?: string | null })[];

      // Completeness gate — same standard as Circle/Nearby discovery
      rows = rows.filter(r => {
        if (!r.full_name || r.full_name === "New User" || r.full_name.trim() === "") return false;
        if (!r.role || r.role === "Creator" || r.role.trim() === "") return false;
        if (!r.avatar_url) return false;
        if (!r.bio || r.bio.length < 20) return false;
        if (r.is_claimed === false && r.badge !== "odos") return false;
        return true;
      });

      // Require at least one work item (credit, portfolio, or award)
      if (rows.length > 0) {
        const userIds = rows.map(r => r.user_id);
        const [creditsRes, awardsRes] = await Promise.all([
          supabase.from("credits").select("user_id").in("user_id", userIds),
          supabase.from("awards").select("user_id").in("user_id", userIds),
        ]);
        const hasWork = new Set<string>();
        creditsRes.data?.forEach(c => hasWork.add(c.user_id));
        awardsRes.data?.forEach(a => hasWork.add(a.user_id));
        rows = rows.filter(r => hasWork.has(r.user_id));
      }

      if (filters.skill) {
        const s = filters.skill.toLowerCase();
        rows = rows.filter(r => {
          const skills = Array.isArray(r.professional_skills) ? r.professional_skills : [];
          return skills.some((sk: any) => String(sk).toLowerCase().includes(s));
        });
      }
      setResults(rows.slice(0, 60));
    } catch (e: any) {
      toast({ title: "Search failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [filters, query, toast]);

  const runAiSearch = useCallback(async () => {
    if (!query.trim() || query.trim().length < 3) {
      toast({ title: "Type a longer query", description: "Describe who you're looking for in 3+ characters" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("discover-creators", {
        body: { query: query.trim() },
      });
      if (error) throw error;
      setResults((data?.results || []) as CreatorRow[]);
    } catch (e: any) {
      toast({ title: "AI search failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [query, toast]);

  const handleSearch = () => { aiMode ? runAiSearch() : runFilterSearch(); };

  // Initial load
  useEffect(() => { runFilterSearch(); /* eslint-disable-next-line */ }, []);

  const saveCurrentSearch = async () => {
    if (!user || !saveName.trim()) return;
    const { error } = await supabase.from("saved_creator_searches").insert({
      user_id: user.id,
      name: saveName.trim(),
      query: query || null,
      filters: filters as any,
      alerts_enabled: saveAlerts,
    });
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Search saved", description: saveAlerts ? "We'll notify you of new matches" : undefined });
    setShowSaveDialog(false); setSaveName(""); setSaveAlerts(false);
    loadSaved();
  };

  const applySaved = (s: SavedSearch) => {
    setQuery(s.query || "");
    setFilters({ ...EMPTY_FILTERS, ...(s.filters || {}) });
    setAiMode(false);
    setTimeout(runFilterSearch, 0);
  };

  const deleteSaved = async (id: string) => {
    await supabase.from("saved_creator_searches").delete().eq("id", id);
    loadSaved();
  };

  const toggleAlerts = async (s: SavedSearch) => {
    await supabase.from("saved_creator_searches").update({ alerts_enabled: !s.alerts_enabled }).eq("id", s.id);
    loadSaved();
  };

  const activeFilterCount =
    (filters.role ? 1 : 0) + (filters.location ? 1 : 0) + (filters.skill ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) + (filters.minRating > 0 ? 1 : 0);

  return (
    <div className="space-y-3">
      <ProfileActivationGate
        isVisible={!visibilityChecked || visibility.isVisible}
        missingFields={visibility.missingFields}
        surfaceLabel="Browse"
      >
      <>
      {/* Search bar */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            {aiMode ? (
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={aiMode ? "e.g. cinematographer in Lagos who's done music videos" : "Search by name, role, bio…"}
              className="pl-9 h-9"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 relative">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-3" align="end">
              <div>
                <Label className="text-xs">Role</Label>
                <Input value={filters.role} onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Photographer" className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Location</Label>
                <Input value={filters.location} onChange={(e) => setFilters(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Trinidad" className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Skill</Label>
                <Input value={filters.skill} onChange={(e) => setFilters(f => ({ ...f, skill: e.target.value }))} placeholder="e.g. color grading" className="h-8 text-sm mt-1" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Verified only</Label>
                <Switch checked={filters.verifiedOnly} onCheckedChange={(v) => setFilters(f => ({ ...f, verifiedOnly: v }))} />
              </div>
              <div>
                <Label className="text-xs">Min rating: {filters.minRating || "Any"}</Label>
                <div className="flex gap-1 mt-1">
                  {[0, 3, 4, 4.5].map(r => (
                    <Button key={r} size="sm" variant={filters.minRating === r ? "default" : "outline"} className="h-7 text-xs flex-1"
                      onClick={() => setFilters(f => ({ ...f, minRating: r }))}>
                      {r === 0 ? "Any" : `${r}+`}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" variant="ghost" className="flex-1 text-xs" onClick={() => { setFilters(EMPTY_FILTERS); }}>
                  Clear
                </Button>
                <Button size="sm" className="flex-1 text-xs" onClick={runFilterSearch}>Apply</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={handleSearch} disabled={loading} size="sm" variant="gradient" className="h-9 px-3">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
          </Button>
        </div>

        {/* Mode toggle + save */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setAiMode(v => !v)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
              aiMode ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <Sparkles className="h-3 w-3" />
            {aiMode ? "AI search on" : "Try AI search"}
          </button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowSaveDialog(true)}>
            <Bookmark className="h-3 w-3 mr-1" /> Save search
          </Button>
        </div>
      </div>

      {/* Saved searches chips */}
      {savedSearches.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {savedSearches.map(s => (
            <div key={s.id} className="shrink-0 flex items-center gap-1 bg-muted/60 rounded-full pl-2.5 pr-1 py-0.5">
              <button onClick={() => applySaved(s)} className="text-xs font-medium">{s.name}</button>
              <button onClick={() => toggleAlerts(s)} className="p-1 hover:bg-background rounded-full" title={s.alerts_enabled ? "Alerts on" : "Alerts off"}>
                {s.alerts_enabled ? <Bell className="h-3 w-3 text-primary" /> : <BellOff className="h-3 w-3 text-muted-foreground" />}
              </button>
              <button onClick={() => deleteSaved(s.id)} className="p-1 hover:bg-background rounded-full">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Results grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : results.length === 0 ? (
        <Card className="py-12 text-center text-sm text-muted-foreground">
          No creators match. Try widening your filters.
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {results.map(c => (
            <button
              key={c.user_id}
              onClick={() => navigate(`/profile/${c.user_id}`)}
              className="text-left rounded-xl border bg-card p-3 hover:shadow-md hover:border-primary/30 transition-all group"
            >
              <div className="relative mb-2">
                <Avatar className="h-14 w-14 mx-auto border">
                  <AvatarImage src={c.avatar_url || ""} alt={c.full_name} />
                  <AvatarFallback>{c.full_name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                {c.verification_tier && c.verification_tier !== "none" && (
                  <div className="absolute top-0 right-1/3 h-4 w-4 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                    <Verified className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs font-semibold text-center truncate">{c.full_name}</p>
              <p className="text-[10px] text-muted-foreground text-center truncate">{c.role || "Creator"}</p>
              {c.location && (
                <p className="text-[10px] text-muted-foreground text-center truncate flex items-center justify-center gap-0.5 mt-0.5">
                  <MapPin className="h-2.5 w-2.5" />{c.location}
                </p>
              )}
              <div className="flex items-center justify-center gap-1 mt-1.5">
                {c.average_rating ? (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-0.5">
                    <Star className="h-2.5 w-2.5 fill-current" />{Number(c.average_rating).toFixed(1)}
                  </Badge>
                ) : null}
                {typeof c.match_score === "number" && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">
                    {c.match_score}% match
                  </Badge>
                )}
              </div>
              {c.match_reason && (
                <p className="text-[9px] text-muted-foreground line-clamp-2 mt-1 text-center italic">{c.match_reason}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Save dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Save this search</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="e.g. Cinematographers Lagos" className="mt-1" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Notify me of new matches</Label>
              <Switch checked={saveAlerts} onCheckedChange={setSaveAlerts} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={saveCurrentSearch} disabled={!saveName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      </ProfileActivationGate>
    </div>
  );
}
