import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Medal, Trophy, ArrowLeft, Flame, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";

interface LeaderEntry {
  user_id: string;
  total_wins: number;
  total_votes_received: number;
  total_challenge_xp: number;
  current_streak: number;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    role: string | null;
    level: number | null;
  };
}

const RANK_STYLES = [
  { icon: Crown, color: "text-amber-500", bg: "bg-amber-500/10", ring: "ring-amber-500/30" },
  { icon: Medal, color: "text-slate-400", bg: "bg-slate-400/10", ring: "ring-slate-400/30" },
  { icon: Medal, color: "text-orange-600", bg: "bg-orange-600/10", ring: "ring-orange-600/30" },
];

const Cre8Leaderboard = () => {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from("challenge_leaderboard")
          .select("*")
          .order("total_challenge_xp", { ascending: false })
          .limit(50);

        if (error) throw error;
        if (!data || data.length === 0) {
          setLoading(false);
          return;
        }

        const userIds = data.map((d) => d.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, role, level")
          .in("user_id", userIds);

        setLeaders(
          data.map((entry) => ({
            ...entry,
            profile: profiles?.find((p) => p.user_id === entry.user_id) || {
              full_name: "Creator",
              avatar_url: null,
              role: null,
              level: 1,
            },
          }))
        );
      } catch (err) {
        console.error("[Leaderboard] Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div className="min-h-screen pb-28 sm:pb-24 md:pb-8">
      <SEO title="Cre8 Leaderboard" description="Top creators ranked by challenge performance" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/cre8")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Leaderboard
              </h1>
              <p className="text-xs text-muted-foreground">Top challengers ranked by XP</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 max-w-2xl space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : leaders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-bold text-lg mb-1">No Rankings Yet</h3>
              <p className="text-sm text-muted-foreground">Enter challenges to appear on the leaderboard!</p>
            </CardContent>
          </Card>
        ) : (
          leaders.map((entry, index) => {
            const rankStyle = RANK_STYLES[index] || null;
            const RankIcon = rankStyle?.icon;

            return (
              <Card
                key={entry.user_id}
                className={`overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${
                  index < 3 ? `ring-1 ${rankStyle?.ring}` : ""
                }`}
                onClick={() => navigate(`/profile/${entry.user_id}`)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  {/* Rank */}
                  <div className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${
                    rankStyle ? rankStyle.bg : "bg-muted"
                  }`}>
                    {RankIcon ? (
                      <RankIcon className={`h-4 w-4 ${rankStyle!.color}`} />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={entry.profile?.avatar_url || undefined} />
                    <AvatarFallback>{entry.profile?.full_name?.[0] || "?"}</AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{entry.profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.total_wins} wins · {entry.total_votes_received} votes
                      {entry.current_streak > 0 && (
                        <span className="inline-flex items-center gap-0.5 ml-1.5">
                          <Flame className="h-3 w-3 text-primary" />
                          {entry.current_streak}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* XP Badge */}
                  <Badge variant="secondary" className="font-bold tabular-nums shrink-0">
                    {entry.total_challenge_xp.toLocaleString()} XP
                  </Badge>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Cre8Leaderboard;
