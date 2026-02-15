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
  BarChart3,
  Flame
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WalletCard } from "@/components/WalletCard";
import { checkAndAwardDailyLogin } from "@/lib/creditSystem";
import { ProfileCompletionCard } from "@/components/ProfileCompletionCard";
import { ProfileOptimizationHub } from "@/components/profile/ProfileOptimizationHub";
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
import { AchievementBadges } from "@/components/dashboard/AchievementBadges";
import { StreakCalendar } from "@/components/dashboard/StreakCalendar";
import { LevelUpCelebration } from "@/components/dashboard/LevelUpCelebration";
import { ShoppingBag } from "lucide-react";
import { FirstTimeUserGuide } from "@/components/FirstTimeUserGuide";
import { useFirstTimeUser } from "@/hooks/useFirstTimeUser";
import { SEO } from "@/components/SEO";
import { SuccessMetrics } from "@/components/dashboard/SuccessMetrics";
import { DiscoverReadyBanner } from "@/components/DiscoverReadyBanner";
import { FirstActionPrompt } from "@/components/dashboard/FirstActionPrompt";
import { ProfileVisibilityBanner } from "@/components/ProfileVisibilityBanner";
import { InviteCard } from "@/components/dashboard/InviteCard";
import { QuickMatchBanner } from "@/components/discover/QuickMatchBanner";
import { UnclaimedProfileSuggestion } from "@/components/profile/UnclaimedProfileSuggestion";

type Profile = Database['public']['Tables']['profiles']['Row'];

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    circle: 0,
    projects: 0,
    profileViews: 0
  });
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [hasAppliedToOpportunity, setHasAppliedToOpportunity] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [previousLevel, setPreviousLevel] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isFirstTime, loading: firstTimeLoading } = useFirstTimeUser();

  // Check and activate OG promotion automatically
  useOGPromotion();
  
  // Update streak on dashboard visit
  useStreakUpdate();

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      // Get profile immediately - this is the only blocking query
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
         .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('[Dashboard] Error fetching profile:', profileError);
        setLoading(false);
        return;
      }

      if (!profileData) {
        console.warn('[Dashboard] Profile not found for user:', user.id);
        navigate("/onboarding");
        return;
      }

      // Detect level-up
      if (profile && profileData.level && profile.level && profileData.level > profile.level) {
        setPreviousLevel(profile.level);
        setShowLevelUp(true);
      }

      setProfile(profileData);
      setLoading(false);

      // Load everything else in background (non-blocking)
      import('@/lib/profileViewTracking').then(({ getProfileViewStats }) => {
        Promise.all([
          supabase.from('portfolio_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('connections').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'accepted'),
          supabase.from('projects').select('*').eq('status', 'active').or(`creator_id.eq.${user.id}`).limit(3),
          checkAndAwardDailyLogin(user.id),
          getProfileViewStats(user.id)
        ]).then(([
          { count: portfolioCount },
          { count: connectionsCount },
          { data: projectsData },
          dailyResult,
          viewStats
        ]) => {
          setPortfolioCount(portfolioCount || 0);
          setStats(prev => ({ 
            ...prev, 
            circle: connectionsCount || 0,
            projects: projectsData?.length || 0,
            profileViews: viewStats.thisMonth
          }));
          setHasAppliedToOpportunity((connectionsCount || 0) > 0);
          if (projectsData) setActiveProjects(projectsData);
          
          if (dailyResult.awarded) {
            toast({
              title: "Daily Bonus! 🎉",
              description: "+5 credits for logging in today",
            });
          }
        }).catch(err => console.error('Background loading error:', err));
      });
    } catch (error) {
      console.error('[Dashboard] Error in fetchProfile:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      if (isMounted) {
        await fetchProfile();
      }
    };

    loadDashboard();
    
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
      navigate("/spark", { replace: true });
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
        navigate("/spark", { replace: true });
      };
      
      handleSubscriptionSuccess();
    }

    return () => {
      isMounted = false;
    };
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

        {/* Profile Visibility Warning - CRITICAL for user awareness */}
        {profile && (
          <ProfileVisibilityBanner
            isVisible={checkProfileCompletion(profile, portfolioCount).isComplete}
            missingFields={checkProfileCompletion(profile, portfolioCount).missingFields}
          />
        )}

        {/* Discover Ready Banner */}
        <DiscoverReadyBanner portfolioCount={portfolioCount} />

        {/* Unclaimed Profile Suggestion - "Is this you?" */}
        <div className="mb-6 sm:mb-8">
          <UnclaimedProfileSuggestion />
        </div>

        {/* Quick Match Banner - Prominent for new users to get first match */}
        {!firstTimeLoading && isFirstTime && profile && (
          <div className="mb-6 sm:mb-8">
            <QuickMatchBanner userId={profile.user_id} />
          </div>
        )}

        {/* First Action Prompt - Only show for new users */}
        {!firstTimeLoading && !loading && (
          <div className="mb-6 sm:mb-8">
            <FirstActionPrompt 
              hasConnections={stats.circle > 0}
              hasProjects={stats.projects > 0}
              hasAppliedToOpportunity={hasAppliedToOpportunity}
            />
          </div>
        )}

        {/* Engagement Nudge */}
        <div className="mb-6 sm:mb-8">
          <EngagementNudge />
        </div>

        {/* First-Time User Guide */}
        {!firstTimeLoading && isFirstTime && (
          <div className="mb-6 sm:mb-8">
            <FirstTimeUserGuide
              title="🚀 Quick Start Guide"
              description="Get the most out of ThriveIN in 5 simple steps"
              tips={[
                "Complete your profile (adds photo, bio, skills) to unlock Discovery and earn 50 XP",
                "Visit Spark to see creative content from the community",
                "Connect with creators in Discover to start building your network",
                "Post an opportunity or apply to one to get your first collaboration started",
                "Check Daily Goals to earn XP, credits, and climb the leaderboard"
              ]}
            />
          </div>
        )}

        {/* Quick Access Cards */}
        <div className="mb-6 sm:mb-8 grid gap-4 md:grid-cols-3">
          <Card className="p-6 cursor-pointer transition-smooth hover:shadow-glow" onClick={() => navigate('/spark')}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Flame className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Spark Feed</h3>
                <p className="text-sm text-muted-foreground">Discover creators</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 cursor-pointer transition-smooth hover:shadow-glow" onClick={() => navigate('/messages')}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-accent/10">
                <MessageCircle className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">Messages</h3>
                <p className="text-sm text-muted-foreground">Stay connected</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 cursor-pointer transition-smooth hover:shadow-glow" onClick={() => navigate('/discover')}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-secondary/10">
                <Users className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold">Match</h3>
                <p className="text-sm text-muted-foreground">Find creators</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Invite Card - Prominent position for referral growth */}
        <div className="mb-6 sm:mb-8">
          <InviteCard />
        </div>

        {/* Profile Optimization Hub */}
        {profile && checkProfileCompletion(profile, portfolioCount).percentage < 100 && (
          <div className="mb-6 sm:mb-8">
            <ProfileOptimizationHub 
              completion={checkProfileCompletion(profile, portfolioCount)}
              profileViews={stats.profileViews}
              matchRate={0}
            />
          </div>
        )}

        {/* Level, Streak & Gamification Section */}
        {profile && (
          <div className="mb-6 sm:mb-8 grid gap-4 sm:gap-6 lg:grid-cols-3">
            <Card className="p-6 space-y-4">
              <LevelBadge level={profile.level || 1} xp={profile.xp || 0} />
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2"
                onClick={() => navigate('/rewards')}
              >
                <ShoppingBag className="h-4 w-4" />
                XP Rewards Shop
              </Button>
            </Card>
            <div className="space-y-4">
              <StreakCard 
                streakCount={profile.streak_count || 0}
                longestStreak={profile.longest_streak || 0}
                freezeCount={profile.streak_freeze_count || 0}
                onUpdate={fetchProfile}
              />
              <Card className="p-4">
                <StreakCalendar 
                  streakCount={profile.streak_count || 0}
                  lastActiveDate={profile.last_active_date}
                />
              </Card>
            </div>
            <LeaderboardWidget />
          </div>
        )}

        {/* Daily Goals - Mobile optimized */}
        <div className="mb-6 sm:mb-8">
          <DailyGoals />
        </div>

        {/* Achievement Badges */}
        <div className="mb-6 sm:mb-8">
          <AchievementBadges />
        </div>

        {/* Level Up Celebration */}
        {profile && (
          <LevelUpCelebration
            newLevel={profile.level || 1}
            xp={profile.xp || 0}
            previousLevel={previousLevel}
            open={showLevelUp}
            onClose={() => setShowLevelUp(false)}
          />
        )}

        {/* Success Metrics - Admin view */}
        {profile && profile.badge === 'og' && (
          <div className="mb-6 sm:mb-8">
            <SuccessMetrics />
          </div>
        )}

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
