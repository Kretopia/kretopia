import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENT_TIERS } from "@/lib/arenaRanks";
import { useNavigate } from "react-router-dom";

interface Achievement {
  id: string;
  challenge_id: string;
  user_id: string;
  achievement_tier: string;
  awarded_at: string;
  xp_awarded: number;
  challenge?: { title: string };
  profile?: { full_name: string; avatar_url: string | null };
}

export const RecentAchievements = () => {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from("challenge_achievements")
          .select("*, challenges(title)")
          .order("awarded_at", { ascending: false })
          .limit(6);

        if (error) throw error;
        if (!data || data.length === 0) {
          setLoading(false);
          return;
        }

        const userIds = [...new Set(data.map((a: any) => a.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);

        const enriched = data.map((a: any) => ({
          ...a,
          challenge: a.challenges,
          profile: profiles?.find((p) => p.user_id === a.user_id) || {
            full_name: "Creator",
            avatar_url: null,
          },
        }));

        setAchievements(enriched);
      } catch (err) {
        console.error("[RecentAchievements]", err);
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

  if (achievements.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Recent Achievements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {achievements.map((a) => {
          const tierInfo = ACHIEVEMENT_TIERS[a.achievement_tier as keyof typeof ACHIEVEMENT_TIERS];
          return (
            <div
              key={a.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/profile/${a.user_id}`)}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={a.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {a.profile?.full_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{a.profile?.full_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {a.challenge?.title}
                </p>
              </div>
              {tierInfo && (
                <Badge variant="outline" className={`text-[10px] border ${tierInfo.color}`}>
                  {tierInfo.label}
                </Badge>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
