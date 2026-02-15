import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Winner {
  id: string;
  title: string;
  thumbnail_url: string | null;
  media_url: string;
  vote_count: number;
  user_id: string;
  challenge_title: string;
  profile?: { full_name: string; avatar_url: string | null };
}

export const PastWinners = () => {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWinners = async () => {
      try {
        // Get top entries from completed challenges
        const { data: challenges } = await supabase
          .from("challenges")
          .select("id, title")
          .eq("status", "completed")
          .order("deadline", { ascending: false })
          .limit(5);

        if (!challenges || challenges.length === 0) {
          setLoading(false);
          return;
        }

        const challengeIds = challenges.map((c) => c.id);
        const challengeMap = Object.fromEntries(challenges.map((c) => [c.id, c.title]));

        // Get top entry per challenge
        const { data: entries } = await supabase
          .from("challenge_entries")
          .select("id, title, thumbnail_url, media_url, vote_count, user_id, challenge_id")
          .in("challenge_id", challengeIds)
          .order("vote_count", { ascending: false })
          .limit(20);

        if (!entries || entries.length === 0) {
          setLoading(false);
          return;
        }

        // Deduplicate: one winner per challenge
        const seen = new Set<string>();
        const topEntries = entries.filter((e) => {
          if (seen.has(e.challenge_id)) return false;
          seen.add(e.challenge_id);
          return true;
        });

        const userIds = [...new Set(topEntries.map((e) => e.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);

        const mapped: Winner[] = topEntries.map((e) => ({
          ...e,
          challenge_title: challengeMap[e.challenge_id] || "Challenge",
          profile: profiles?.find((p) => p.user_id === e.user_id) || {
            full_name: "Creator",
            avatar_url: null,
          },
        }));

        setWinners(mapped);
      } catch (err) {
        console.error("[PastWinners] Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWinners();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (winners.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Star className="h-3.5 w-3.5 text-primary" />
        Past Winners
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {winners.map((w) => (
          <Card key={w.id} className="shrink-0 w-44 overflow-hidden">
            <div className="h-28 bg-muted overflow-hidden">
              <img
                src={w.thumbnail_url || w.media_url}
                alt={w.title}
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-2.5 space-y-1.5">
              <p className="text-xs font-semibold truncate">{w.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {w.challenge_title}
              </p>
              <div className="flex items-center gap-1.5">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={w.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {w.profile?.full_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] truncate">{w.profile?.full_name}</span>
                <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto">
                  {w.vote_count}♥
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
