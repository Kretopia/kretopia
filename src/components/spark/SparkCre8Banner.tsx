import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Clock, ChevronRight, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface ActiveChallenge {
  id: string;
  title: string;
  category: string;
  cadence: string;
  deadline: string;
  xp_reward: number;
  is_flash: boolean;
  entry_count: number;
}

export const SparkCre8Banner = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<ActiveChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await supabase
          .from("challenges")
          .select("id, title, category, cadence, deadline, xp_reward, is_flash, entries:challenge_entries(count)")
          .eq("status", "active")
          .eq("type", "platform")
          .order("deadline", { ascending: true })
          .limit(3);

        if (data) {
          setChallenges(
            data.map((c: any) => ({
              ...c,
              entry_count: c.entries?.[0]?.count || 0,
            }))
          );
        }
      } catch (err) {
        console.error("Cre8 banner error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading || challenges.length === 0) return null;

  const cadenceEmoji: Record<string, string> = {
    daily: "📅",
    "48hr": "⏰",
    weekly: "📆",
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-accent/5 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Flame className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">Cre8 Arena</p>
              <p className="text-[10px] text-muted-foreground">Active challenges — compete & win XP</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/cre8")}
            className="text-xs gap-1 text-primary hover:text-primary"
          >
            Enter Arena
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {challenges.map((ch) => (
            <button
              key={ch.id}
              onClick={() => navigate("/cre8")}
              className="shrink-0 flex items-center gap-2 rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-left hover:border-primary/30 transition-colors min-w-[200px]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {ch.is_flash && <Zap className="h-3 w-3 text-amber-500" />}
                  <span className="text-xs font-semibold truncate">{ch.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{ch.is_flash ? "⚡ Flash" : cadenceEmoji[ch.cadence]} {ch.cadence}</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDistanceToNow(new Date(ch.deadline))}
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className="text-[9px] shrink-0">
                +{ch.xp_reward} XP
              </Badge>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
