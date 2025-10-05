import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AIMatchRecommendations } from "@/components/AIMatchRecommendations";
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  Briefcase, 
  Zap,
  ArrowRight,
  MessageCircle,
  Trophy,
  Coins,
  HardDrive,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WalletCard } from "@/components/WalletCard";
import { checkAndAwardDailyLogin } from "@/lib/creditSystem";
import { ProfileCompletionCard } from "@/components/ProfileCompletionCard";
import { checkProfileCompletion, PROFILE_COMPLETION_XP } from "@/lib/profileCompletion";
import { useOGPromotion } from "@/hooks/useOGPromotion";
import { OGPromotionBanner } from "@/components/OGPromotionBanner";
import { EngagementNudge } from "@/components/dashboard/EngagementNudge";
import { Database } from "@/integrations/supabase/types";
import { SkeletonStat } from "@/components/ui/skeleton-card";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { LevelBadge } from "@/components/dashboard/LevelBadge";
import { useStreakUpdate } from "@/hooks/useStreakUpdate";
import { LeaderboardWidget } from "@/components/dashboard/LeaderboardWidget";
import { DailyGoals } from "@/components/dashboard/DailyGoals";
import { FirstTimeUserGuide } from "@/components/FirstTimeUserGuide";
import { useFirstTimeUser } from "@/hooks/useFirstTimeUser";
import { SEO } from "@/components/SEO";

type Profile = Database['public']['Tables']['profiles']['Row'];

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    circle: 0,
    projects: 0,
    profileViews: 0
  });
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isFirstTime, loading: firstTimeLoading } = useFirstTimeUser();

  // Check and activate OG promotion automatically
  useOGPromotion();
  
  // Update streak on dashboard visit
  useStreakUpdate();

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check and award daily login credits
      const dailyResult = await checkAndAwardDailyLogin(user.id);
      if (dailyResult.awarded) {
        toast({
          title: "Daily Bonus! 🎉",
          description: "+3 credits for logging in today",
        });
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[Dashboard] Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
      } else if (!data) {
        console.warn('[Dashboard] Profile not found for user:', user.id);
        toast({
          title: "Profile Missing",
          description: "Please complete your profile setup",
          variant: "destructive",
        });
        navigate("/onboarding");
      } else {
        setProfile(data);
      }

      // Fetch connections count
      const { count: connectionsCount } = await supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      setStats(prev => ({
        ...prev,
        circle: connectionsCount || 0,
      }));

      // Fetch active projects through matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*, projects!inner(*)')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .limit(10);

      if (matchesData) {
        const activeProjects = matchesData
          .map(match => match.projects)
          .flat()
          .filter((project: any) => project && project.status === 'active')
          .slice(0, 5);

        setActiveProjects(activeProjects);
        setStats(prev => ({
          ...prev,
          projects: activeProjects.length,
        }));
      }
      
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    
    // Handle payment/subscription success from URL params
    const paymentStatus = searchParams.get("payment");
    const subscriptionSuccess = searchParams.get("subscription_success");
    const amount = searchParams.get("amount");
    const type = searchParams.get("type");
    
    if (paymentStatus === "success" && amount && type) {
      toast({
        title: "Payment successful!",
        description: `Added ${amount} ${type} to your wallet`,
      });
      
      // Update wallet after successful payment
      const updateWallet = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: currentWallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (currentWallet) {
          const updateData = type === "credits" 
            ? { credits: (currentWallet.credits || 0) + Number(amount) }
            : { balance: (currentWallet.balance || 0) + Number(amount) };
          
          await supabase
            .from('wallets')
            .update(updateData)
            .eq('user_id', user.id);
        }
          
        await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            amount: Number(amount),
            type: `${type}_purchased`,
            description: `Purchased ${amount} ${type}`,
          });
          
        fetchProfile();
      };
      
      updateWallet();
      navigate("/dashboard", { replace: true });
    }
    
    if (subscriptionSuccess === "true") {
      // Handle subscription activation
      const handleSubscriptionSuccess = async () => {
        toast({
          title: "Subscription activated! 🎉",
          description: "Your subscription is now active",
        });
        
        await supabase.functions.invoke("check-subscription");
        await fetchProfile();
        navigate("/dashboard", { replace: true });
      };
      
      handleSubscriptionSuccess();
    }
  }, [toast, searchParams, navigate]);

  return (
    <>
      <SEO
        title="Dashboard - ThriveIN"
        description="Your creative hub. Track your progress, connect with creators, and discover new opportunities on ThriveIN."
      />
      <div className="min-h-screen p-4 sm:p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col justify-between gap-3 sm:gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="mb-1 sm:mb-2 text-2xl sm:text-3xl md:text-4xl font-bold">
              Welcome back, {profile?.full_name || 'Creator'}! 👋
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">Here's what's happening with your network</p>
          </div>
          <Link to="/discover" className="w-full md:w-auto">
            <Button variant="gradient" size="lg" className="w-full md:w-auto">
              <Zap className="h-4 w-4" />
              Discover Now
            </Button>
          </Link>
        </div>

        {/* OG Promotion Banner */}
        <OGPromotionBanner />

        {/* Engagement Nudge */}
        <div className="mb-6 sm:mb-8">
          <EngagementNudge />
        </div>

        {/* First-Time User Guide */}
        {!firstTimeLoading && isFirstTime && (
          <div className="mb-6 sm:mb-8">
            <FirstTimeUserGuide
              title="Welcome to ThriveIN! 🎉"
              description="Here's how to get started and make the most of your account"
              tips={[
                "Complete your profile to unlock features and earn 50 XP",
                "Visit Discover to swipe on creators and opportunities",
                "Earn credits by logging in daily, completing challenges, and engaging",
                "Connect with other creators to start collaborating on projects",
                "Check your Daily Goals to track progress and earn rewards"
              ]}
            />
          </div>
        )}

        {/* Profile Completion Card */}
        {profile && checkProfileCompletion(profile).percentage < 100 && (
          <div className="mb-6 sm:mb-8">
            <ProfileCompletionCard completion={checkProfileCompletion(profile)} />
          </div>
        )}

        {/* Level, Streak & Gamification Section */}
        {profile && (
          <div className="mb-6 sm:mb-8 grid gap-4 sm:gap-6 lg:grid-cols-3">
            <Card className="p-6">
              <LevelBadge level={profile.level || 1} xp={profile.xp || 0} />
            </Card>
            <StreakCard 
              streakCount={profile.streak_count || 0}
              longestStreak={profile.longest_streak || 0}
              freezeCount={profile.streak_freeze_count || 0}
              onUpdate={fetchProfile}
            />
            <LeaderboardWidget />
          </div>
        )}

        {/* Daily Goals - Mobile optimized */}
        <DailyGoals />

        {/* Stats Cards - Mobile optimized grid */}
        <div className="grid gap-3 sm:gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              <div className="md:col-span-2 lg:col-span-2 grid gap-3 sm:gap-4 grid-cols-2">
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <SkeletonStat />
              </div>
            </>
          ) : (
            <>
              <div className="md:col-span-2 lg:col-span-2 grid gap-4 sm:gap-6 grid-cols-2">
                <StatCard
                  title="My Circle"
                  value={stats.circle.toString()}
                  change="+5 this week"
                  icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
                  gradient="from-secondary to-accent"
                />
                <StatCard
                  title="Active Projects"
                  value={stats.projects.toString()}
                  change="In progress"
                  icon={<Briefcase className="h-5 w-5 sm:h-6 sm:w-6" />}
                  gradient="from-accent to-primary"
                />
                <StatCard
                  title="Total Views"
                  value={stats.profileViews.toString()}
                  change="Last 30 days"
                  icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
                  gradient="from-primary to-secondary"
                />
                <StatCard
                  title="Total XP"
                  value={profile?.xp?.toString() || '0'}
                  change={`Level ${profile?.level || 1}`}
                  icon={<Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />}
                  gradient="from-secondary to-primary"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <WalletCard />
              </div>
            </>
          )}
        </div>

        {/* Active Projects - Mobile optimized */}
        {activeProjects.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg sm:text-xl font-semibold">Active Projects</h2>
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {activeProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className="cursor-pointer transition-smooth hover:shadow-glow"
                  onClick={() => navigate(`/desk/${project.id}`)}
                >
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                      <span className="truncate pr-2">{project.title}</span>
                      <MessageCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      {project.description || 'No description'}
                    </p>
                    <div className="mt-2 sm:mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 sm:py-1 rounded-full bg-primary/10 text-primary">
                        {project.status}
                      </span>
                      {project.budget && (
                        <span className="text-xs text-muted-foreground">{project.budget}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* AI Match Recommendations - Only for paid tiers */}
        {profile && (profile.subscription_tier === 'thriver' || profile.subscription_tier === 'creator_pro') && (
          <div className="mb-6 sm:mb-8">
            <AIMatchRecommendations />
          </div>
        )}

        {/* Features & Tools */}
        <div className="mb-6 sm:mb-8">
          <h2 className="mb-3 sm:mb-4 text-xl sm:text-2xl font-bold">Features & Tools</h2>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
            <QuickActionCard
              title="Subscription"
              description="Manage your plan and billing settings"
              icon={<Zap className="h-5 w-5" />}
              to="/subscription"
            />
            <QuickActionCard
              title="Analytics"
              description="Track your performance and engagement"
              icon={<BarChart3 className="h-5 w-5" />}
              to="/analytics"
            />
            <QuickActionCard
              title="Storage"
              description="Manage your files and media library"
              icon={<HardDrive className="h-5 w-5" />}
              to="/storage"
            />
            <QuickActionCard
              title="Manage Opportunities"
              description="View and edit your posted opportunities"
              icon={<Briefcase className="h-5 w-5" />}
              to="/manage-opportunities"
            />
            <QuickActionCard
              title="Earn Credits"
              description="Complete tasks and earn more credits"
              icon={<Coins className="h-5 w-5" />}
              to="/earn-credits"
            />
            <QuickActionCard
              title="Partner Directory"
              description="Exclusive deals from our partners"
              icon={<Sparkles className="h-5 w-5" />}
              to="/partner-directory"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 sm:mb-8">
          <h2 className="mb-3 sm:mb-4 text-xl sm:text-2xl font-bold">Quick Actions</h2>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
            <QuickActionCard
              title="Find Opportunities"
              description="Browse and swipe through new gigs and collabs"
              icon={<Briefcase className="h-5 w-5" />}
              to="/discover"
            />
            <QuickActionCard
              title="Edit Profile"
              description="Update your EPK and showcase your work"
              icon={<Users className="h-5 w-5" />}
              to="/profile"
            />
            <QuickActionCard
              title="Grow Your Circle"
              description="Connect with other creators on the platform"
              icon={<Sparkles className="h-5 w-5" />}
              to="/discover"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="mb-3 sm:mb-4 text-xl sm:text-2xl font-bold">Recent Activity</h2>
          <div className="space-y-3 sm:space-y-4">
            <ActivityItem
              title="Profile created"
              description="Your profile is now live and visible to other creators"
              time="Today"
            />
            <ActivityItem
              title="Credits earned"
              description="Welcome bonus credited to your account"
              time="Today"
            />
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

const StatCard = ({ 
  title, 
  value, 
  change, 
  icon, 
  gradient 
}: { 
  title: string; 
  value: string; 
  change: string; 
  icon: React.ReactNode; 
  gradient: string;
}) => {
  return (
    <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
      <div className="mb-3 sm:mb-4 flex items-center justify-between">
        <div className={`rounded-lg sm:rounded-xl bg-gradient-to-br ${gradient} p-2 sm:p-3 text-primary-foreground`}>
          {icon}
        </div>
      </div>
      <div className="mb-1 text-2xl sm:text-3xl font-bold">{value}</div>
      <div className="mb-0.5 sm:mb-1 text-xs sm:text-sm font-medium text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground">{change}</div>
    </div>
  );
};

const QuickActionCard = ({ 
  title, 
  description, 
  icon, 
  to 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  to: string;
}) => {
  return (
    <Link to={to}>
      <div className="group rounded-xl sm:rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card transition-smooth hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow">
        <div className="mb-3 sm:mb-4 inline-flex rounded-lg sm:rounded-xl bg-primary/10 p-2 sm:p-3 text-primary">
          {icon}
        </div>
        <h3 className="mb-1 sm:mb-2 text-base sm:text-lg font-semibold">{title}</h3>
        <p className="mb-3 sm:mb-4 text-xs sm:text-sm text-muted-foreground">{description}</p>
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-primary">
          Get started
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 transition-smooth group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
};

const ActivityItem = ({ 
  title, 
  description, 
  time 
}: { 
  title: string; 
  description: string; 
  time: string;
}) => {
  return (
    <div className="rounded-lg sm:rounded-xl border border-border bg-card p-3 sm:p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="mb-0.5 sm:mb-1 text-sm sm:text-base font-semibold">{title}</h4>
          <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">{time}</span>
      </div>
    </div>
  );
};

export default Dashboard;
