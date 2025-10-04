import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, TrendingUp, Medal, Award, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SkeletonLeaderboardItem } from "@/components/ui/skeleton-card";
import { getLevelData, getXPForLevel } from "@/lib/gamification";

interface LeaderboardUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  role: string;
}

const Leaderboard = () => {
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);
  const [userRank, setUserRank] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get top 51 users (extra to account for filtering owner)
    const { data: leaders, error } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, avatar_url, xp, level, role')
      .order('xp', { ascending: false })
      .limit(51);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      setLoading(false);
      return;
    }

    // Filter out owner (thriveuae@gmail.com) - get their user_id first
    const { data: ownerProfile } = await supabase.auth.getUser();
    
    // Hardcode: Filter out thriveuae@gmail.com by checking against known email
    // In a real scenario, you'd store this as an admin flag in the database
    const filteredLeaders = (leaders || []).filter(leader => {
      // Exclude owner by user_id if current user is owner
      if (user?.email === 'thriveuae@gmail.com') {
        return leader.user_id !== user.id;
      }
      return true;
    }).slice(0, 50);

    setTopUsers(filteredLeaders);

    // Get current user's rank (if not owner)
    if (user && user.email !== 'thriveuae@gmail.com') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, xp, level, role')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setCurrentUser(profile as LeaderboardUser);
        
        // Calculate rank
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('xp', profile.xp);
        
        setUserRank((count || 0) + 1);
      }
    }
    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
    return <Award className="h-5 w-5 text-muted-foreground" />;
  };

  const getXPForNextLevel = (level: number) => {
    return level * level * 100;
  };

  const getProgressToNextLevel = (xp: number, level: number) => {
    const currentLevelXP = (level - 1) * (level - 1) * 100;
    const nextLevelXP = getXPForNextLevel(level);
    const progressXP = xp - currentLevelXP;
    const requiredXP = nextLevelXP - currentLevelXP;
    return (progressXP / requiredXP) * 100;
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
            <Trophy className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">
            Compete with creators worldwide and level up your profile
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonLeaderboardItem key={i} />
            ))}
          </div>
        ) : topUsers.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Rankings Yet</h2>
            <p className="text-muted-foreground">
              Start earning XP to appear on the leaderboard!
            </p>
          </Card>
        ) : (
          <>
            {/* Current User Card */}
            {currentUser && (
              <Card className="mb-6 p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary">
                      <AvatarImage src={currentUser.avatar_url || undefined} />
                      <AvatarFallback>{currentUser.full_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-lg">{currentUser.full_name}</p>
                      <p className="text-sm text-muted-foreground">{currentUser.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-2xl font-bold">#{userRank}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Your Rank</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Level {currentUser.level}</span>
                    <span className="font-semibold">{currentUser.xp} XP</span>
                  </div>
                  <Progress 
                    value={getProgressToNextLevel(currentUser.xp, currentUser.level)} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {getXPForNextLevel(currentUser.level) - currentUser.xp} XP to Level {currentUser.level + 1}
                  </p>
                </div>
              </Card>
            )}

            {/* Top Users List */}
            <div className="space-y-3">
              {topUsers.map((user, index) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;
                
                return (
                  <Card 
                    key={user.id} 
                    className={`p-4 transition-smooth hover:shadow-glow ${
                      isTopThree ? 'border-primary/30 bg-gradient-to-r from-primary/5 to-transparent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center justify-center w-10">
                          {isTopThree ? (
                            getRankIcon(rank)
                          ) : (
                            <span className="text-lg font-semibold text-muted-foreground">
                              {rank}
                            </span>
                          )}
                        </div>
                        <Avatar className={`h-12 w-12 ${isTopThree ? 'border-2 border-primary' : ''}`}>
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>{user.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getLevelData(user.level).icon}</span>
                          <div className="text-left">
                            <p className={`font-bold text-sm bg-gradient-to-r ${getLevelData(user.level).color} bg-clip-text text-transparent`}>
                              {getLevelData(user.level).name}
                            </p>
                            <p className="text-xs text-muted-foreground">Level {user.level}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{user.xp.toLocaleString()} XP</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* XP Guide */}
            <Card className="mt-8 p-6">
              <h3 className="font-bold text-lg mb-4">How to Earn XP</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Complete your EPK</p>
                    <p className="text-sm text-muted-foreground">50-100 XP per section</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Post content</p>
                    <p className="text-sm text-muted-foreground">10 XP per post</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Make connections</p>
                    <p className="text-sm text-muted-foreground">20 XP per connection</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Medal className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Match with jobs</p>
                    <p className="text-sm text-muted-foreground">50 XP per match</p>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
