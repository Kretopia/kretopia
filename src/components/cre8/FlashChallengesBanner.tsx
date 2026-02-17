import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Clock, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FlashChallenge {
  id: string;
  title: string;
  category: string;
  deadline: string;
  xp_reward: number;
  entries?: { count: number }[];
}

interface FlashChallengesBannerProps {
  onSelect: (id: string) => void;
}

export const FlashChallengesBanner = ({ onSelect }: FlashChallengesBannerProps) => {
  const [flashes, setFlashes] = useState<FlashChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from("challenges")
          .select("id, title, category, deadline, xp_reward, entries:challenge_entries(count)")
          .eq("status", "active")
          .eq("is_flash", true)
          .gt("deadline", new Date().toISOString())
          .order("deadline", { ascending: true })
          .limit(3);

        if (error) throw error;
        setFlashes(data || []);
      } catch (err) {
        console.error("[FlashBanner]", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading || flashes.length === 0) return null;

  const getTimeLeft = (deadline: string) => {
    const ms = new Date(deadline).getTime() - Date.now();
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-yellow-500" />
        <h3 className="font-bold text-sm uppercase tracking-wide text-yellow-600">
          Flash Challenges
        </h3>
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse">
          LIVE
        </Badge>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {flashes.map((f) => (
          <Card
            key={f.id}
            className="shrink-0 w-56 cursor-pointer border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 hover:shadow-md transition-shadow"
            onClick={() => onSelect(f.id)}
          >
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-[10px]">
                  {f.category}
                </Badge>
                <div className="flex items-center gap-1 text-destructive font-bold text-xs">
                  <Clock className="h-3 w-3" />
                  {getTimeLeft(f.deadline)}
                </div>
              </div>
              <p className="text-sm font-semibold line-clamp-2">{f.title}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {f.entries?.[0]?.count || 0} entries
                </div>
                <span className="font-semibold text-primary">+{f.xp_reward} XP</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
