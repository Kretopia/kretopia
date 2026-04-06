import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Lock, Star, Users, Flame, MessageCircle, Briefcase, Camera, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  requirement: number;
  current: number;
  unlocked: boolean;
  xpReward: number;
  category: string;
}

export function AchievementBadges() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchAchievements();
  }, [user]);

  const fetchAchievements = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [
        { data: profile },
        { data: connections },
        { data: posts },
        { data: portfolio },
        { data: credits },
      ] = await Promise.all([
        supabase.from("profiles").select("streak_count, longest_streak, xp, level").eq("user_id", user.id).maybeSingle(),
        supabase.from("connections").select("id").eq("user_id", user.id).eq("status", "accepted"),
        supabase.from("feed_posts").select("id").eq("user_id", user.id),
        supabase.from("credits").select("id").eq("user_id", user.id),
        supabase.from("credits").select("id").eq("user_id", user.id),
      ]);

      const connectionCount = connections?.length || 0;
      const postCount = posts?.length || 0;
      const portfolioCount = portfolio?.length || 0;
      const creditCount = credits?.length || 0;
      const streakCount = profile?.longest_streak || 0;
      const xp = profile?.xp || 0;

      const achievementList: Achievement[] = [
        {
          id: "first_connection",
          name: "Networker",
          description: "Make your first connection",
          icon: <Users className="h-5 w-5" />,
          requirement: 1,
          current: connectionCount,
          unlocked: connectionCount >= 1,
          xpReward: 50,
          category: "Social",
        },
        {
          id: "ten_connections",
          name: "Social Butterfly",
          description: "Connect with 10 creators",
          icon: <Users className="h-5 w-5" />,
          requirement: 10,
          current: Math.min(connectionCount, 10),
          unlocked: connectionCount >= 10,
          xpReward: 200,
          category: "Social",
        },
        {
          id: "first_post",
          name: "Voice Found",
          description: "Create your first post",
          icon: <MessageCircle className="h-5 w-5" />,
          requirement: 1,
          current: Math.min(postCount, 1),
          unlocked: postCount >= 1,
          xpReward: 50,
          category: "Content",
        },
        {
          id: "portfolio_starter",
          name: "Portfolio Pro",
          description: "Add 3 portfolio items",
          icon: <Camera className="h-5 w-5" />,
          requirement: 3,
          current: Math.min(portfolioCount, 3),
          unlocked: portfolioCount >= 3,
          xpReward: 100,
          category: "Content",
        },
        {
          id: "credit_collector",
          name: "Credit Collector",
          description: "Add 5 work credits",
          icon: <Star className="h-5 w-5" />,
          requirement: 5,
          current: Math.min(creditCount, 5),
          unlocked: creditCount >= 5,
          xpReward: 150,
          category: "Content",
        },
        {
          id: "week_streak",
          name: "On Fire",
          description: "7-day login streak",
          icon: <Flame className="h-5 w-5" />,
          requirement: 7,
          current: Math.min(streakCount, 7),
          unlocked: streakCount >= 7,
          xpReward: 100,
          category: "Dedication",
        },
        {
          id: "month_streak",
          name: "Unstoppable",
          description: "30-day login streak",
          icon: <Flame className="h-5 w-5" />,
          requirement: 30,
          current: Math.min(streakCount, 30),
          unlocked: streakCount >= 30,
          xpReward: 500,
          category: "Dedication",
        },
        {
          id: "xp_500",
          name: "Rising Star",
          description: "Earn 500 XP",
          icon: <Zap className="h-5 w-5" />,
          requirement: 500,
          current: Math.min(xp, 500),
          unlocked: xp >= 500,
          xpReward: 50,
          category: "Progress",
        },
        {
          id: "xp_5000",
          name: "Legendary",
          description: "Earn 5,000 XP",
          icon: <Trophy className="h-5 w-5" />,
          requirement: 5000,
          current: Math.min(xp, 5000),
          unlocked: xp >= 5000,
          xpReward: 250,
          category: "Progress",
        },
      ];

      setAchievements(achievementList);
    } catch (error) {
      console.error("Error fetching achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-lg" />)}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-bold">Achievements</h3>
        </div>
        <Badge variant="secondary">
          {unlockedCount}/{achievements.length} Unlocked
        </Badge>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {achievements.map(achievement => (
          <div
            key={achievement.id}
            className={cn(
              "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
              achievement.unlocked
                ? "bg-gradient-to-b from-amber-500/10 to-orange-500/10 border-amber-500/30 shadow-sm"
                : "bg-muted/30 border-border opacity-60"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              achievement.unlocked
                ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white"
                : "bg-muted text-muted-foreground"
            )}>
              {achievement.unlocked ? achievement.icon : <Lock className="h-4 w-4" />}
            </div>
            <p className="text-[11px] font-semibold leading-tight">{achievement.name}</p>
            {!achievement.unlocked && (
              <div className="w-full">
                <Progress 
                  value={(achievement.current / achievement.requirement) * 100} 
                  className="h-1" 
                />
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {achievement.current}/{achievement.requirement}
                </p>
              </div>
            )}
            {achievement.unlocked && (
              <p className="text-[9px] text-amber-600 font-medium">+{achievement.xpReward} XP</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
