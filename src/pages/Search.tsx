import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search as SearchIcon, Users, Briefcase, Database, MapPin, Clock, Loader2, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ProfileResult {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
  location: string | null;
  professional_skills: any;
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

interface CreditResult {
  id: string;
  project_name: string;
  role: string;
  year: number | null;
  verification_status: string | null;
  user_id: string;
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<ProfileResult[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityResult[]>([]);
  const [credits, setCredits] = useState<CreditResult[]>([]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setProfiles([]);
      setOpportunities([]);
      setCredits([]);
      return;
    }

    setLoading(true);
    const q = `%${searchQuery.trim()}%`;

    try {
      const [profilesRes, oppsRes, creditsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, role, location, professional_skills")
          .or(`full_name.ilike.${q},role.ilike.${q},location.ilike.${q}`)
          .eq("onboarding_completed", true)
          .limit(20),
        supabase
          .from("opportunities")
          .select("id, title, description, type, compensation, location, created_at")
          .eq("status", "active")
          .or(`title.ilike.${q},description.ilike.${q}`)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("credits")
          .select("id, project_name, role, year, verification_status, user_id")
          .or(`project_name.ilike.${q},role.ilike.${q}`)
          .order("year", { ascending: false })
          .limit(20),
      ]);

      setProfiles(profilesRes.data || []);
      setOpportunities(oppsRes.data || []);
      setCredits(creditsRes.data || []);
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
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    }
  };

  const totalResults = profiles.length + opportunities.length + credits.length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title={`Search${searchParams.get("q") ? ` "${searchParams.get("q")}"` : ""} — ThriveIN`} description="Search creators, credits, and productions across every creative industry." />
      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Search</h1>
            <p className="text-xs text-muted-foreground">Creators, credits & productions</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search creators, credits, gigs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={!query.trim()}>Search</Button>
        </form>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && searchParams.get("q") && (
          <>
            <p className="text-sm text-muted-foreground">
              {totalResults} result{totalResults !== 1 ? "s" : ""} for "{searchParams.get("q")}"
            </p>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="all">All ({totalResults})</TabsTrigger>
                <TabsTrigger value="people" className="gap-1.5">
                  <Users className="h-3.5 w-3.5" /> People ({profiles.length})
                </TabsTrigger>
                <TabsTrigger value="credits" className="gap-1.5">
                  <Database className="h-3.5 w-3.5" /> Credits ({credits.length})
                </TabsTrigger>
                <TabsTrigger value="gigs" className="gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> Gigs ({opportunities.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4 mt-4">
                {profiles.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" /> People
                    </h3>
                    {profiles.slice(0, 5).map((p) => (
                      <ProfileCard key={p.user_id} profile={p} onClick={() => navigate(`/profile/${p.user_id}`)} />
                    ))}
                    {profiles.length > 5 && (
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("people")}>
                        View all {profiles.length} people →
                      </Button>
                    )}
                  </div>
                )}
                {credits.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Database className="h-4 w-4" /> Credits
                    </h3>
                    {credits.slice(0, 5).map((c) => (
                      <CreditCard key={c.id} credit={c} onClick={() => navigate(`/profile/${c.user_id}`)} />
                    ))}
                    {credits.length > 5 && (
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("credits")}>
                        View all {credits.length} credits →
                      </Button>
                    )}
                  </div>
                )}
                {opportunities.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Gigs
                    </h3>
                    {opportunities.slice(0, 5).map((o) => (
                      <OppCard key={o.id} opp={o} onClick={() => navigate(`/opportunity/${o.id}`)} />
                    ))}
                  </div>
                )}
                {totalResults === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <SearchIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No results found for "{searchParams.get("q")}"</p>
                    <p className="text-sm mt-1">Try different keywords</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="people" className="space-y-2 mt-4">
                {profiles.map((p) => (
                  <ProfileCard key={p.user_id} profile={p} onClick={() => navigate(`/profile/${p.user_id}`)} />
                ))}
                {profiles.length === 0 && <EmptyState label="people" />}
              </TabsContent>

              <TabsContent value="credits" className="space-y-2 mt-4">
                {credits.map((c) => (
                  <CreditCard key={c.id} credit={c} onClick={() => navigate(`/profile/${c.user_id}`)} />
                ))}
                {credits.length === 0 && <EmptyState label="credits" />}
              </TabsContent>

              <TabsContent value="gigs" className="space-y-2 mt-4">
                {opportunities.map((o) => (
                  <OppCard key={o.id} opp={o} onClick={() => navigate(`/opportunity/${o.id}`)} />
                ))}
                {opportunities.length === 0 && <EmptyState label="gigs" />}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

const ProfileCard = ({ profile, onClick }: { profile: ProfileResult; onClick: () => void }) => {
  const skills = Array.isArray(profile.professional_skills)
    ? profile.professional_skills.slice(0, 3).map((s: any) => (typeof s === "string" ? s : s?.skill || "")).filter(Boolean)
    : [];

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-3 flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile.avatar_url || ""} />
          <AvatarFallback>{(profile.full_name || "?")[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{profile.full_name}</p>
          <p className="text-xs text-muted-foreground truncate">{profile.role}</p>
          {skills.length > 0 && (
            <div className="flex gap-1 mt-1">
              {skills.map((s: string) => (
                <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
              ))}
            </div>
          )}
        </div>
        {profile.location && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0">
            <MapPin className="h-3 w-3" /> {profile.location}
          </span>
        )}
      </CardContent>
    </Card>
  );
};

const CreditCard = ({ credit, onClick }: { credit: CreditResult; onClick: () => void }) => {
  const statusColors: Record<string, string> = {
    enterprise: "bg-success/10 text-success",
    peer: "bg-primary/10 text-primary",
    identity: "bg-blue-500/10 text-blue-500",
    ai: "bg-blue-500/10 text-blue-500",
    manual: "bg-muted text-muted-foreground",
  };
  const vs = (credit.verification_status || "manual").toLowerCase();

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Database className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{credit.project_name}</p>
          <p className="text-xs text-muted-foreground truncate">{credit.role}{credit.year ? ` • ${credit.year}` : ""}</p>
        </div>
        <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[vs] || ""}`}>
          {vs === "enterprise" ? "Verified" : vs === "peer" ? "Peer" : vs === "ai" || vs === "identity" ? "AI" : "Manual"}
        </Badge>
      </CardContent>
    </Card>
  );
};

const OppCard = ({ opp, onClick }: { opp: OpportunityResult; onClick: () => void }) => (
  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
    <CardContent className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{opp.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{opp.description}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Badge variant="outline" className="text-[10px]">{opp.type}</Badge>
          {opp.compensation && <Badge variant="secondary" className="text-[10px]">${opp.compensation}</Badge>}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
        {opp.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{opp.location}</span>}
        {opp.created_at && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(opp.created_at), { addSuffix: true })}</span>}
      </div>
    </CardContent>
  </Card>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="text-center py-8 text-muted-foreground">
    <p>No {label} found</p>
  </div>
);

export default Search;
