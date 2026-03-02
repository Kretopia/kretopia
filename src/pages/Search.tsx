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
import { Search as SearchIcon, Users, Briefcase, FolderKanban, MapPin, Clock, Loader2 } from "lucide-react";
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

interface ProjectResult {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string | null;
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
  const [projects, setProjects] = useState<ProjectResult[]>([]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setProfiles([]);
      setOpportunities([]);
      setProjects([]);
      return;
    }

    setLoading(true);
    const q = `%${searchQuery.trim()}%`;

    try {
      const [profilesRes, oppsRes, projectsRes] = await Promise.all([
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
        user
          ? supabase
              .from("projects")
              .select("id, title, description, status, created_at")
              .ilike("title", q)
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [], error: null }),
      ]);

      setProfiles(profilesRes.data || []);
      setOpportunities(oppsRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error("[Search] Error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

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

  const totalResults = profiles.length + opportunities.length + projects.length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="Search - ThriveIN" description="Search for creators, opportunities, and projects" />
      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <SearchIcon className="h-7 w-7" />
            Search
          </h1>
          <p className="text-sm text-muted-foreground">Find creators, opportunities, and projects</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search creators, opportunities, projects..."
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
              <TabsList>
                <TabsTrigger value="all">All ({totalResults})</TabsTrigger>
                <TabsTrigger value="people" className="gap-1.5">
                  <Users className="h-3.5 w-3.5" /> People ({profiles.length})
                </TabsTrigger>
                <TabsTrigger value="opportunities" className="gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> Opps ({opportunities.length})
                </TabsTrigger>
                <TabsTrigger value="projects" className="gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5" /> Projects ({projects.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3 mt-4">
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
                {opportunities.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Opportunities
                    </h3>
                    {opportunities.slice(0, 5).map((o) => (
                      <OppCard key={o.id} opp={o} onClick={() => navigate(`/opportunity/${o.id}`)} />
                    ))}
                  </div>
                )}
                {projects.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <FolderKanban className="h-4 w-4" /> Projects
                    </h3>
                    {projects.slice(0, 5).map((p) => (
                      <ProjectCard key={p.id} project={p} onClick={() => navigate(`/desk/${p.id}`)} />
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

              <TabsContent value="opportunities" className="space-y-2 mt-4">
                {opportunities.map((o) => (
                  <OppCard key={o.id} opp={o} onClick={() => navigate(`/opportunity/${o.id}`)} />
                ))}
                {opportunities.length === 0 && <EmptyState label="opportunities" />}
              </TabsContent>

              <TabsContent value="projects" className="space-y-2 mt-4">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} onClick={() => navigate(`/desk/${p.id}`)} />
                ))}
                {projects.length === 0 && <EmptyState label="projects" />}
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

const ProjectCard = ({ project, onClick }: { project: ProjectResult; onClick: () => void }) => (
  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
    <CardContent className="p-3 flex items-center justify-between">
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{project.title}</p>
        {project.description && <p className="text-xs text-muted-foreground line-clamp-1">{project.description}</p>}
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0">{project.status || "planning"}</Badge>
    </CardContent>
  </Card>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="text-center py-8 text-muted-foreground">
    <p>No {label} found</p>
  </div>
);

export default Search;
