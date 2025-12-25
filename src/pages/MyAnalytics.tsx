import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PortfolioAnalytics } from "@/components/profile/PortfolioAnalytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart3, ArrowLeft, Users, Heart, Eye, Briefcase, 
  Flame, Trophy, Sparkles, TrendingUp, MessageCircle, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { InviteCard } from "@/components/dashboard/InviteCard";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { LevelBadge } from "@/components/dashboard/LevelBadge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEO } from "@/components/SEO";

const MyAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalMatches: 0,
    totalConnections: 0,
    totalSwipes: 0,
    portfolioItems: 0,
    profileViews: 0,
    totalProjects: 0,
    messagesReceived: 0,
    invitesSent: 0,
    invitesAccepted: 0
  });

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    if (!user) return;
    
    try {
      // Import profile view tracking
      const { getProfileViewStats } = await import('@/lib/profileViewTracking');
      
      // Fetch all data in parallel
      const [
        profileRes,
        matchesRes,
        connectionsRes,
        swipesRes,
        portfolioRes,
        projectsRes,
        messagesRes,
        invitesRes,
        viewStats
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('matches').select('*', { count: 'exact', head: true })
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
        supabase.from('connections').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('status', 'accepted'),
        supabase.from('swipes').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase.from('portfolio_items').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase.from('projects').select('*', { count: 'exact', head: true })
          .or(`creator_id.eq.${user.id}`),
        supabase.from('messages').select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id),
        supabase.from('invites').select('*, accepted:status')
          .eq('inviter_id', user.id),
        getProfileViewStats(user.id)
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
      }

      const acceptedInvites = invitesRes.data?.filter(i => i.status === 'accepted').length || 0;

      setStats({
        totalMatches: matchesRes.count || 0,
        totalConnections: connectionsRes.count || 0,
        totalSwipes: swipesRes.count || 0,
        portfolioItems: portfolioRes.count || 0,
        profileViews: viewStats.thisMonth,
        totalProjects: projectsRes.count || 0,
        messagesReceived: messagesRes.count || 0,
        invitesSent: invitesRes.data?.length || 0,
        invitesAccepted: acceptedInvites
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view analytics</p>
      </div>
    );
  }

  const matchRate = stats.totalSwipes > 0 
    ? Math.round((stats.totalMatches / stats.totalSwipes) * 100) 
    : 0;

  const inviteConversion = stats.invitesSent > 0 
    ? Math.round((stats.invitesAccepted / stats.invitesSent) * 100) 
    : 0;

  return (
    <>
      <SEO
        title="My Dashboard - ThriveIN"
        description="Track your creator journey, invites, matches, and engagement on ThriveIN."
      />
      <div className="min-h-screen bg-background pb-20 lg:pb-6">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                My Dashboard
              </h1>
              <p className="text-muted-foreground text-sm">
                Track your progress and grow your network
              </p>
            </div>
          </div>

          {/* Tabs for different sections */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="invites">Invites</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Level & Streak Row */}
              {profile && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="p-6">
                    <LevelBadge level={profile.level || 1} xp={profile.xp || 0} />
                  </Card>
                  <StreakCard 
                    streakCount={profile.streak_count || 0}
                    longestStreak={profile.longest_streak || 0}
                    freezeCount={profile.streak_freeze_count || 0}
                    onUpdate={fetchAllData}
                  />
                </div>
              )}

              {/* Key Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<Heart className="h-4 w-4" />}
                  label="Total Matches"
                  value={stats.totalMatches}
                  subtext={`${matchRate}% match rate`}
                  color="text-rose-500"
                />
                <StatCard
                  icon={<Users className="h-4 w-4" />}
                  label="Connections"
                  value={stats.totalConnections}
                  subtext="In your circle"
                  color="text-blue-500"
                />
                <StatCard
                  icon={<Eye className="h-4 w-4" />}
                  label="Profile Views"
                  value={stats.profileViews}
                  subtext="Last 30 days"
                  color="text-green-500"
                />
                <StatCard
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Projects"
                  value={stats.totalProjects}
                  subtext="Active collabs"
                  color="text-purple-500"
                />
              </div>

              {/* Activity Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Activity Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">Total Swipes</span>
                    </div>
                    <span className="font-bold">{stats.totalSwipes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Messages Received</span>
                    </div>
                    <span className="font-bold">{stats.messagesReceived}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Portfolio Items</span>
                    </div>
                    <span className="font-bold">{stats.portfolioItems}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Total XP Earned</span>
                    </div>
                    <span className="font-bold">{profile?.xp || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Growth Tips */}
              <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Growth Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.totalMatches < 5 && (
                    <div className="flex items-start gap-2 text-sm">
                      <Heart className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                      <span>Swipe more profiles to increase your matches! Active users get 3x more opportunities.</span>
                    </div>
                  )}
                  {stats.portfolioItems < 3 && (
                    <div className="flex items-start gap-2 text-sm">
                      <Target className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Add more portfolio items. Creators with 5+ items get 40% more profile views.</span>
                    </div>
                  )}
                  {stats.invitesSent === 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <Users className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Invite fellow creators to earn XP rewards and grow your network!</span>
                    </div>
                  )}
                  {stats.totalMatches >= 5 && stats.portfolioItems >= 3 && stats.invitesSent > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>You're doing great! Keep engaging to maintain your streak and climb the leaderboard.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invites Tab */}
            <TabsContent value="invites" className="space-y-6">
              {/* Invite Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Invites Sent</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.invitesSent}</div>
                  <Progress 
                    value={Math.min(stats.invitesSent * 20, 100)} 
                    className="h-1 mt-2" 
                  />
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Accepted</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.invitesAccepted}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {inviteConversion}% conversion
                  </div>
                </Card>
              </div>

              {/* Invite Card Component */}
              <InviteCard />

              {/* Referral Rewards Info */}
              <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent/20">
                <CardHeader>
                  <CardTitle className="text-lg">Referral Rewards</CardTitle>
                  <CardDescription>Earn XP for every friend who joins</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                    <span className="text-sm">Per accepted invite</span>
                    <span className="font-bold text-primary">+50 XP</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                    <span className="text-sm">5 accepted invites bonus</span>
                    <span className="font-bold text-primary">+100 XP</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                    <span className="text-sm">10 accepted invites bonus</span>
                    <span className="font-bold text-primary">+250 XP</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Portfolio Tab */}
            <TabsContent value="portfolio" className="space-y-6">
              <PortfolioAnalytics userId={user.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

// Stat Card Component
const StatCard = ({ 
  icon, 
  label, 
  value, 
  subtext, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  subtext: string;
  color: string;
}) => (
  <Card className="p-4">
    <div className={`flex items-center gap-2 mb-2 ${color}`}>
      {icon}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{subtext}</div>
  </Card>
);

export default MyAnalytics;
