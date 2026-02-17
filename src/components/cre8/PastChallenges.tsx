import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Clock, Users, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface PastChallenge {
  id: string;
  title: string;
  category: string;
  cadence: string;
  deadline: string;
  xp_reward: number;
  thumbnail_url: string | null;
  entry_count: number;
  winner?: {
    name: string;
    avatar: string | null;
    entry_title: string;
    votes: number;
  };
}

export const PastChallenges = ({ onChallengeClick }: { onChallengeClick?: (id: string) => void }) => {
  const [challenges, setChallenges] = useState<PastChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from("challenges")
          .select("id, title, category, cadence, deadline, xp_reward, thumbnail_url")
          .eq("status", "completed")
          .eq("type", "platform")
          .order("deadline", { ascending: false })
          .limit(20);

        if (error || !data || data.length === 0) {
          setLoading(false);
          return;
        }

        const ids = data.map((c) => c.id);

        // Get entry counts
        const { data: entries } = await supabase
          .from("challenge_entries")
          .select("challenge_id, id, user_id, title, vote_count")
          .in("challenge_id", ids)
          .order("vote_count", { ascending: false });

        // Group top entry per challenge
        const winnerMap = new Map<string, { user_id: string; title: string; vote_count: number }>();
        const countMap = new Map<string, number>();
        for (const e of entries || []) {
          countMap.set(e.challenge_id, (countMap.get(e.challenge_id) || 0) + 1);
          if (!winnerMap.has(e.challenge_id)) {
            winnerMap.set(e.challenge_id, { user_id: e.user_id, title: e.title, vote_count: e.vote_count || 0 });
          }
        }

        // Fetch winner profiles
        const winnerUserIds = [...new Set([...winnerMap.values()].map((w) => w.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", winnerUserIds);

        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

        const mapped: PastChallenge[] = data.map((c) => {
          const winner = winnerMap.get(c.id);
          const profile = winner ? profileMap.get(winner.user_id) : null;
          return {
            ...c,
            entry_count: countMap.get(c.id) || 0,
            winner: winner
              ? {
                  name: profile?.full_name || "Creator",
                  avatar: profile?.avatar_url || null,
                  entry_title: winner.title,
                  votes: winner.vote_count,
                }
              : undefined,
          };
        });

        setChallenges(mapped);
      } catch (err) {
        console.error("Past challenges error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (challenges.length === 0) return null;

  const visible = showAll ? challenges : challenges.slice(0, 6);

  const cadenceLabel: Record<string, string> = {
    daily: "Daily",
    "48hr": "48hr",
    weekly: "Weekly",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Past Challenges
        </h3>
        {challenges.length > 6 && (
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="text-xs gap-1">
            {showAll ? "Show Less" : `View All (${challenges.length})`}
            <ChevronRight className={`h-3 w-3 transition-transform ${showAll ? "rotate-90" : ""}`} />
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((ch) => (
          <Card
            key={ch.id}
            className="overflow-hidden cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => onChallengeClick?.(ch.id)}
          >
            {ch.thumbnail_url && (
              <div className="h-24 bg-muted overflow-hidden">
                <img src={ch.thumbnail_url} alt={ch.title} className="w-full h-full object-cover opacity-60" />
              </div>
            )}
            <CardContent className={`${ch.thumbnail_url ? "p-3" : "p-4"} space-y-2`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold line-clamp-1">{ch.title}</p>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {cadenceLabel[ch.cadence] || ch.cadence}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {ch.entry_count} entries
                </span>
                <span>{formatDistanceToNow(new Date(ch.deadline), { addSuffix: true })}</span>
              </div>

              {ch.winner && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={ch.winner.avatar || undefined} />
                    <AvatarFallback className="text-[8px]">{ch.winner.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate">{ch.winner.name}</span>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto">
                    {ch.winner.votes}♥
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
