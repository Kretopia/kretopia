import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FramedAvatar } from "@/components/ui/framed-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Verified, Sparkles, Users, Crown } from "lucide-react";
import { SwipeFiltersState } from "./SwipeFilters";
import { locationMatchesFilter } from "@/lib/locationGroups";
import { hasProAccess } from "@/lib/subscriptionConfig";

const FREE_BROWSE_LIMIT = 6;

interface BrowseProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
  bio: string | null;
  location: string | null;
  professional_skills: any;
  badge: string | null;
  verification_score: number | null;
  level: number | null;
  xp: number | null;
}

export function CircleBrowseGrid({ filters }: { filters: SwipeFiltersState }) {
  const navigate = useNavigate();
  const { user, subscriptionInfo } = useAuth();
  const hasPointsUnlock = user ? (() => { try { const s = localStorage.getItem(`thrivein_discovery_unlocked_${user.id}`); return s ? JSON.parse(s).unlocked : false; } catch { return false; } })() : false;
  const isPro = hasProAccess(subscriptionInfo.tier as any) || hasPointsUnlock;
  const [profiles, setProfiles] = useState<BrowseProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchProfiles = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from("public_profiles_discovery")
        .select("user_id, full_name, avatar_url, role, bio, location, professional_skills, badge, verification_score, level, xp, boost_expires_at")
        .eq("onboarding_completed", true)
        .neq("user_id", user.id);

      if (search.trim()) {
        query = query.or(`full_name.ilike.%${search}%,role.ilike.%${search}%,location.ilike.%${search}%`);
      }

      // Multi-role DB filter (use first role for DB, rest client-side)
      const roles = filters.roles || [];
      if (roles.length === 1) {
        query = query.ilike("role", `%${roles[0]}%`);
      }

      if (filters.verifiedOnly) {
        query = query.gte("verification_score", 50);
      }

      query = query.order("level", { ascending: false }).limit(100);

      const { data, error } = await query;
      if (error) throw error;

      let results = (data as any[]) || [];

      // Sort boosted profiles to the top
      results.sort((a, b) => {
        const aBoosted = a.boost_expires_at && new Date(a.boost_expires_at) > new Date() ? 1 : 0;
        const bBoosted = b.boost_expires_at && new Date(b.boost_expires_at) > new Date() ? 1 : 0;
        return bBoosted - aBoosted;
      });

      // Multi-role client-side filter
      if (roles.length > 1) {
        results = results.filter(p =>
          roles.some(r => p.role?.toLowerCase() === r.toLowerCase())
        );
      }

      // Location filter — cascading country/city
      if (filters.locationCountry && filters.locationCountry !== 'all') {
        results = results.filter(p =>
          locationMatchesFilter(p.location, filters.locationCountry, filters.locationCity)
        );
      } else if (filters.location && filters.location !== 'all') {
        results = results.filter(p => locationMatchesFilter(p.location, filters.location));
      }

      // Skills filter
      if (filters.skills && filters.skills.length > 0) {
        results = results.filter(p => {
          const profileSkills = Array.isArray(p.professional_skills)
            ? p.professional_skills.map((s: any) => (typeof s === 'string' ? s : s?.skill || '').toLowerCase())
            : [];
          return filters.skills.some(skill => profileSkills.includes(skill.toLowerCase()));
        });
      }

      setProfiles(results);
    } catch (err) {
      console.error("[CircleBrowseGrid] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, search, filters]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search creators..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <Skeleton className="h-14 w-14 rounded-full mx-auto mb-3" />
                <Skeleton className="h-4 w-3/4 mx-auto mb-2" />
                <Skeleton className="h-3 w-1/2 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold mb-1">No creators found</h3>
          <p className="text-sm text-muted-foreground">Try different search terms or filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {profiles.slice(0, isPro ? profiles.length : FREE_BROWSE_LIMIT).map((profile) => {
              const skills = Array.isArray(profile.professional_skills)
                ? profile.professional_skills.slice(0, 2).map((s: any) => typeof s === 'string' ? s : s?.skill || '').filter(Boolean)
                : [];
              const isVerified = (profile.verification_score || 0) >= 50;

              return (
                <Card
                  key={profile.user_id}
                  className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 group overflow-hidden"
                  onClick={() => navigate(`/profile/${profile.user_id}`)}
                >
                  <CardContent className="p-3 sm:p-4 text-center">
                    <div className="relative mx-auto w-14 h-14 mb-2">
                      <FramedAvatar src={profile.avatar_url} fallback={(profile.full_name || "?")[0]} className="h-14 w-14" />
                      {isVerified && (
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <Verified className="h-2.5 w-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold text-xs sm:text-sm truncate group-hover:text-primary transition-colors">
                      {profile.full_name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {profile.role || "Creator"}
                    </p>

                    {profile.location && (
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground truncate">{profile.location}</span>
                      </div>
                    )}

                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center mt-1.5">
                        {skills.map((skill: string) => (
                          <Badge key={skill} variant="secondary" className="text-[9px] px-1 py-0">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Blurred upgrade gate for free users */}
          {!isPro && profiles.length > FREE_BROWSE_LIMIT && (
            <div className="relative mt-1">
              <div className="pointer-events-none select-none filter blur-[6px] opacity-40 saturate-50">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {profiles.slice(FREE_BROWSE_LIMIT, FREE_BROWSE_LIMIT + 6).map((profile) => (
                    <Card key={profile.user_id} className="overflow-hidden">
                      <CardContent className="p-3 sm:p-4 text-center">
                        <div className="mx-auto w-14 h-14 mb-2">
                          <FramedAvatar src={profile.avatar_url} fallback={(profile.full_name || "?")[0]} className="h-14 w-14" />
                        </div>
                        <h3 className="font-semibold text-xs sm:text-sm truncate">{profile.full_name}</h3>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{profile.role || "Creator"}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="bg-card/95 backdrop-blur-md border border-primary/20 rounded-2xl p-6 max-w-xs mx-4 text-center shadow-2xl shadow-primary/10">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-3">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-base font-bold mb-1">See More Creators</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Upgrade to Pro to browse unlimited creator profiles and find your perfect collaborator.
                  </p>
                  <Button
                    onClick={() => navigate("/subscription")}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Unlock All Profiles
                  </Button>
                  <p className="text-[11px] text-muted-foreground mt-2">$12/month · Cancel anytime</p>
                </div>
              </div>
            </div>
          )}

          {isPro && profiles.length > 0 && (
            <p className="text-center text-xs text-muted-foreground pt-3">
              Showing {profiles.length} creators · Swipe left for more discovery
            </p>
          )}
        </>
      )}
    </div>
  );
}
