import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Medal, Trophy, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface LeaderboardEntry {
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

const RANK_ICONS = [
  { icon: Crown, color: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: Medal, color: "text-slate-400", bg: "bg-slate-400/10" },
  { icon: Medal, color: "text-orange-600", bg: "bg-orange-600/10" },
];

export const LeaderboardPreview = () => {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const { data, error } = await supabase
          .from("challenge_leaderboard")
          .select("*")
          .order("total_challenge_xp", { ascending: false })
          .limit(3);

        if (error) throw error;
        if (!data || data.length === 0) {
          setLeaders([]);
          setLoading(false);
          return;
        }

        const userIds = data.map((d) => d.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, role, level")
          .in("user_id", userIds);

        const enriched = data.map((entry) => ({
          ...entry,
          profile: profiles?.find((p) => p.user_id === entry.user_id) || {
            full_name: "Creator",
            avatar_url: null,
            role: null,
            level: 1,
          },
        }));

        setLeaders(enriched);
      } catch (err) {
        console.error("[LeaderboardPreview] Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaders();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-5 w-5 text-primary" />
            Leaderboard
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs text-muted-foreground"
            onClick={() => navigate("/cre8/leaderboard")}
          >
            View All
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {leaders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No challengers yet — be the first! 🔥
          </p>
        ) : (
          leaders.map((entry, index) => {
            const rank = RANK_ICONS[index];
            const RankIcon = rank.icon;
            return (
              <div
                key={entry.user_id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/profile/${entry.user_id}`)}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${rank.bg}`}>
                  <RankIcon className={`h-4 w-4 ${rank.color}`} />
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={entry.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {entry.profile?.full_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {entry.profile?.full_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.total_wins} wins · {entry.total_votes_received} votes
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs font-bold tabular-nums">
                  {entry.total_challenge_xp.toLocaleString()} XP
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
