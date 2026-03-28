import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Trophy, Clock, Users, Flame, Plus, Vote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const Challenges = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("active");

  if (!user) return <Navigate to="/auth" replace />;

  const { data: challenges, isLoading } = useQuery({
    queryKey: ["challenges", activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("status", activeTab === "active" ? "active" : "completed")
        .order("created_at", { ascending: false })
        .limit(20);
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl pb-24 md:pb-6">
      <Helmet>
        <title>Challenges | ThriveIN</title>
        <meta name="description" content="Compete in creative challenges, earn XP and build your reputation." />
      </Helmet>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Challenges
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Compete, create, and climb the leaderboard</p>
        </div>
      </div>

      {/* Leaderboard preview */}
      {leaderboard && leaderboard.length > 0 && (
        <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              Top Challengers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {leaderboard.slice(0, 5).map((entry, i) => (
                <div key={entry.id} className="flex flex-col items-center gap-1 min-w-[60px]">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold",
                    i === 0 ? "bg-amber-500/20 text-amber-600" :
                    i === 1 ? "bg-gray-300/20 text-gray-500" :
                    i === 2 ? "bg-orange-400/20 text-orange-500" :
                    "bg-muted text-muted-foreground"
                  )}>
                    #{i + 1}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{entry.total_challenge_xp} XP</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1 gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Active
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 gap-1.5">
            <Star className="h-3.5 w-3.5" />
            Past
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : challenges && challenges.length > 0 ? (
            challenges.map((challenge) => (
              <Card key={challenge.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {challenge.cover_image_url && (
                      <img
                        src={challenge.cover_image_url}
                        alt={challenge.title}
                        className="h-20 w-20 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm line-clamp-1">{challenge.title}</h3>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {challenge.xp_reward} XP
                        </Badge>
                      </div>
                      {challenge.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{challenge.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {challenge.entry_count} entries
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(challenge.ends_at), { addSuffix: true })}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5">{challenge.category}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-16">
              <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {activeTab === "active" ? "No active challenges right now" : "No past challenges yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Check back soon for new creative challenges!</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Challenges;
