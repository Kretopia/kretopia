import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MyEntry {
  id: string;
  title: string;
  thumbnail_url: string | null;
  media_url: string;
  vote_count: number;
  challenge_id: string;
  challenge: {
    title: string;
    deadline: string;
    cadence: string;
  };
}

export const MyActiveEntries = ({ onChallengeClick }: { onChallengeClick: (id: string) => void; }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<MyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchEntries = async () => {
      try {
        const { data, error } = await supabase
          .from("challenge_entries")
          .select(`
            id, title, thumbnail_url, media_url, vote_count,
            challenge_id,
            challenges!inner(title, deadline, cadence)
          `)
          .eq("user_id", user.id)
          .eq("challenges.status", "active")
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;

        const mapped = (data || []).map((e: any) => ({
          ...e,
          challenge: e.challenges,
        }));
        setEntries(mapped);
      } catch (err) {
        console.error("[MyActiveEntries] Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Your Active Entries
      </h3>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {entries.map((entry) => {
          const daysLeft = Math.ceil(
            (new Date(entry.challenge.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          return (
            <Card
              key={entry.id}
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onChallengeClick(entry.challenge_id as any)}
            >
              <CardContent className="p-3 flex gap-3">
                <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={entry.thumbnail_url || entry.media_url}
                    alt={entry.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{entry.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {entry.challenge.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                      <Heart className="h-2.5 w-2.5" />
                      {entry.vote_count}
                    </Badge>
                    <span className={`text-[10px] font-medium ${daysLeft <= 1 ? "text-destructive" : "text-muted-foreground"}`}>
                      {daysLeft > 0 ? `${daysLeft}d left` : "Ended"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
