import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Trophy, Clock, Users, Flame, Zap, Crown, Timer, Star, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const CADENCE_CONFIG = {
  daily: { label: "Daily", icon: Timer, color: "text-orange-500", bg: "bg-orange-500/10", xp: 100 },
  "48hr": { label: "48hr", icon: Zap, color: "text-blue-500", bg: "bg-blue-500/10", xp: 200 },
  weekly: { label: "Weekly", icon: Trophy, color: "text-purple-500", bg: "bg-purple-500/10", xp: 500 },
  special: { label: "Special", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10", xp: 1000 },
} as const;

const Challenges = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cadenceFilter, setCadenceFilter] = useState("all");

  if (!user) return <Navigate to="/auth" replace />;

  const { data: challenges, isLoading } = useQuery({
    queryKey: ["challenges", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("status", "active")
        .order("ends_at", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: pastChallenges } = useQuery({
    queryKey: ["challenges", "completed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("status", "completed")
        .order("ends_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["challenge-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_leaderboard")
        .select("*")
        .order("total_challenge_xp", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const { data: myEntries } = useQuery({
    queryKey: ["my-challenge-entries", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_entries")
        .select("*, challenges(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredChallenges = challenges?.filter(
    (c) => cadenceFilter === "all" || c.cadence === cadenceFilter
  );

  const topThree = leaderboard?.slice(0, 3) || [];
  const restLeaderboard = leaderboard?.slice(3) || [];

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      <Helmet>
        <title>Cre8 Arena | ThriveIN</title>
        <meta name="description" content="Compete in creative challenges, earn XP and build your reputation on ThriveIN." />
      </Helmet>

      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-b border-border/50">
        <div className="container mx-auto px-4 py-6 max-w-4xl relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Trophy className="h-4.5 w-4.5 text-primary" />
                </div>
                Cre8 Arena
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Compete. Create. Get discovered.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your XP</p>
                <p className="text-lg font-bold text-primary">
                  {leaderboard?.find(e => e.user_id === user?.id)?.total_challenge_xp || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/4 w-20 h-20 bg-primary/3 rounded-full translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4 max-w-4xl space-y-5 mt-5">
        
        {/* Podium leaderboard */}
        {topThree.length > 0 && (
          <Card className="overflow-hidden border-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Top Creators
                </h2>
                {restLeaderboard.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground">
                    View all <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                )}
              </div>

              {/* Podium layout - 2nd, 1st, 3rd */}
              <div className="flex items-end justify-center gap-3 mb-2">
                {[1, 0, 2].map((idx) => {
                  const entry = topThree[idx];
                  if (!entry) return <div key={idx} className="flex-1" />;
                  const isFirst = idx === 0;
                  const heights = ["h-24", "h-20", "h-16"];
                  const podiumHeight = heights[idx] || "h-16";
                  const medals = ["🥇", "🥈", "🥉"];

                  return (
                    <div key={entry.id} className="flex flex-col items-center flex-1 max-w-[100px]">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-lg mb-1.5",
                        isFirst ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-background" : ""
                      )}>
                        {medals[idx]}
                      </div>
                      <span className="text-[11px] font-medium text-center line-clamp-1 mb-1">
                        Creator
                      </span>
                      <span className="text-[10px] text-muted-foreground mb-2">
                        {entry.total_challenge_xp} XP
                      </span>
                      <div className={cn(
                        "w-full rounded-t-lg flex items-center justify-center",
                        podiumHeight,
                        isFirst 
                          ? "bg-gradient-to-t from-amber-500/20 to-amber-400/10 border border-amber-500/20" 
                          : idx === 1 
                            ? "bg-gradient-to-t from-muted to-muted/50 border border-border" 
                            : "bg-gradient-to-t from-orange-500/10 to-orange-400/5 border border-orange-500/10"
                      )}>
                        <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Streak / stats row */}
              <div className="flex items-center justify-center gap-4 pt-3 border-t border-border/50 mt-2">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  <span>{topThree[0]?.current_streak || 0} day streak</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5 text-primary" />
                  <span>{topThree[0]?.total_wins || 0} wins</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cadence filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <button
            onClick={() => setCadenceFilter("all")}
            className={cn(
              "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
              cadenceFilter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            All
          </button>
          {Object.entries(CADENCE_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setCadenceFilter(key)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5",
                  cadenceFilter === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <Icon className="h-3 w-3" />
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Active Challenges */}
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-primary" />
            Active Challenges
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredChallenges && filteredChallenges.length > 0 ? (
            <div className="space-y-3">
              {filteredChallenges.map((challenge) => {
                const cadence = CADENCE_CONFIG[challenge.cadence as keyof typeof CADENCE_CONFIG] || CADENCE_CONFIG.weekly;
                const CadenceIcon = cadence.icon;
                const endsAt = new Date(challenge.ends_at);
                const isEndingSoon = endsAt.getTime() - Date.now() < 1000 * 60 * 60 * 6; // 6 hours

                return (
                  <Card key={challenge.id} className={cn(
                    "overflow-hidden transition-all hover:shadow-md group cursor-pointer",
                    isEndingSoon && "ring-1 ring-destructive/30"
                  )} onClick={() => navigate(`/challenges/${challenge.id}`)}>
                    {challenge.cover_image_url && (
                      <div className="relative h-28 overflow-hidden">
                        <img
                          src={challenge.cover_image_url}
                          alt={challenge.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                        <div className="absolute top-2 left-2 flex gap-1.5">
                          <Badge className={cn("text-[10px] gap-1", cadence.bg, cadence.color, "border-0")}>
                            <CadenceIcon className="h-3 w-3" />
                            {cadence.label}
                          </Badge>
                          {isEndingSoon && (
                            <Badge variant="destructive" className="text-[10px] gap-1 animate-pulse">
                              <Clock className="h-3 w-3" />
                              Ending soon
                            </Badge>
                          )}
                        </div>
                        <div className="absolute bottom-2 left-3 right-3">
                          <h3 className="font-bold text-sm text-foreground line-clamp-1">{challenge.title}</h3>
                        </div>
                      </div>
                    )}
                    <CardContent className={cn("p-3", !challenge.cover_image_url && "pt-4")}>
                      {!challenge.cover_image_url && (
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Badge className={cn("text-[10px] gap-1", cadence.bg, cadence.color, "border-0")}>
                                <CadenceIcon className="h-3 w-3" />
                                {cadence.label}
                              </Badge>
                              {isEndingSoon && (
                                <Badge variant="destructive" className="text-[10px] gap-1 animate-pulse">
                                  Ending soon
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-bold text-sm line-clamp-1">{challenge.title}</h3>
                          </div>
                        </div>
                      )}
                      {challenge.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5">{challenge.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {challenge.entry_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(endsAt, { addSuffix: true })}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{challenge.category}</Badge>
                        </div>
                        <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-semibold">
                          +{challenge.xp_reward} XP
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Trophy className="h-6 w-6 text-primary/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No active challenges</p>
                <p className="text-xs text-muted-foreground mt-1">New challenges drop daily — check back soon!</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Your entries */}
        {myEntries && myEntries.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-500" />
              Your Entries
            </h2>
            <div className="space-y-2">
              {myEntries.map((entry: any) => (
                <Card key={entry.id} className="overflow-hidden">
                  <CardContent className="p-3 flex items-center gap-3">
                    {entry.media_url && (
                      <img src={entry.media_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1">{entry.title || entry.challenges?.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Trophy className="h-3 w-3" />
                          {entry.vote_count} votes
                        </span>
                        {entry.rank && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            #{entry.rank}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Past winners */}
        {pastChallenges && pastChallenges.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Crown className="h-4 w-4 text-amber-500" />
              Past Winners
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {pastChallenges.slice(0, 4).map((challenge) => (
                <Card key={challenge.id} className="overflow-hidden group cursor-pointer hover:shadow-sm transition-shadow">
                  <div className="relative h-20 bg-muted">
                    {challenge.cover_image_url ? (
                      <img src={challenge.cover_image_url} alt={challenge.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <Trophy className="h-6 w-6 text-primary/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                  </div>
                  <CardContent className="p-2.5 pt-1">
                    <p className="text-[11px] font-medium line-clamp-1">{challenge.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{challenge.entry_count} entries</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Challenges;
