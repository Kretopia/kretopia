import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Briefcase,
  Award,
  ArrowUp,
  ArrowDown,
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  BarChart3,
  Zap,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { format, subDays } from "date-fns";

const CHART_COLORS = ['hsl(var(--primary))', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface DailyActivity {
  date: string;
  events: number;
  users: number;
}

interface EventBreakdown {
  category: string;
  count: number;
}

const Analytics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<any>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [eventBreakdown, setEventBreakdown] = useState<EventBreakdown[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    profileViews: 0,
    profileViewsChange: 0,
    connections: 0,
    connectionsChange: 0,
    matches: 0,
    matchesChange: 0,
    applications: 0,
    applicationsChange: 0,
    portfolioViews: 0,
    portfolioViewsChange: 0,
    avgEngagement: 0,
    totalUsers: 0,
    activeToday: 0,
  });
  const [funnelData, setFunnelData] = useState({
    pageViews: 0,
    signups: 0,
    onboardingStarts: 0,
    onboardingCompletes: 0,
    swipes: 0,
    matches: 0,
    messages: 0,
    paywallViews: 0,
    subscriptions: 0,
    milestoneCreated: 0,
    escrowAttempts: 0,
    paymentAttempts: 0,
    checkoutAttempts: 0,
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchAnalytics(),
      fetchFunnelData(),
      fetchDailyActivity(),
      fetchEventBreakdown()
    ]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast({ title: "Analytics refreshed" });
  };

  const fetchDailyActivity = async () => {
    try {
      const days = 7;
      const startDate = subDays(new Date(), days);
      
      const { data } = await supabase
        .from('analytics_events')
        .select('created_at, user_id')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (data) {
        const dailyMap = new Map<string, { events: number; users: Set<string> }>();
        
        for (let i = 0; i <= days; i++) {
          const date = format(subDays(new Date(), days - i), 'yyyy-MM-dd');
          dailyMap.set(date, { events: 0, users: new Set() });
        }

        data.forEach(event => {
          const date = format(new Date(event.created_at!), 'yyyy-MM-dd');
          const day = dailyMap.get(date);
          if (day) {
            day.events++;
            if (event.user_id) day.users.add(event.user_id);
          }
        });

        const activity = Array.from(dailyMap.entries()).map(([date, { events, users }]) => ({
          date: format(new Date(date), 'MMM dd'),
          events,
          users: users.size
        }));

        setDailyActivity(activity);
      }
    } catch (error) {
      console.error('Error fetching daily activity:', error);
    }
  };

  const fetchEventBreakdown = async () => {
    try {
      const { data } = await supabase
        .from('analytics_events')
        .select('event_category');

      if (data) {
        const categoryCount = new Map<string, number>();
        data.forEach(event => {
          const cat = event.event_category || 'other';
          categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
        });

        const breakdown = Array.from(categoryCount.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        setEventBreakdown(breakdown);
      }
    } catch (error) {
      console.error('Error fetching event breakdown:', error);
    }
  };

  const fetchFunnelData = async () => {
    try {
      // Get counts for each funnel stage
      const [pageViews, signups, onboardingStarts, onboardingCompletes, swipes, matches, messages, paywallViews, subscriptions, milestoneCreated, escrowAttempts, paymentAttempts, checkoutAttempts] = await Promise.all([
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'page_view'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'sign_up'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'onboarding_started'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'onboarding_completed'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'swipe'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'match_created'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'message_sent'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'paywall_viewed'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'subscription_started'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'milestone_created'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'milestone_escrow_attempt'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'milestone_payment_attempt'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'checkout_attempt'),
      ]);
      
      setFunnelData({
        pageViews: pageViews.count || 0,
        signups: signups.count || 0,
        onboardingStarts: onboardingStarts.count || 0,
        onboardingCompletes: onboardingCompletes.count || 0,
        swipes: swipes.count || 0,
        matches: matches.count || 0,
        messages: messages.count || 0,
        paywallViews: paywallViews.count || 0,
        subscriptions: subscriptions.count || 0,
        milestoneCreated: milestoneCreated.count || 0,
        escrowAttempts: escrowAttempts.count || 0,
        paymentAttempts: paymentAttempts.count || 0,
        checkoutAttempts: checkoutAttempts.count || 0,
      });
    } catch (error) {
      console.error('Error fetching funnel data:', error);
    }
  };

  const fetchAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Fetch total users count
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch active users today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: activeToday } = await supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Fetch profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Fetch connections count
      const { count: connectionsCount } = await supabase
        .from("connections")
        .select("*", { count: "exact", head: true })
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
        .eq("status", "accepted");

      // Fetch matches count
      const { count: matchesCount } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq("status", "active");

      // Fetch applications count
      const { count: applicationsCount } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("applicant_id", user.id);

      // Fetch portfolio items and sum view counts
      const { data: portfolioItems } = await supabase
        .from("credits")
        .select("view_count")
        .eq("user_id", user.id);

      const totalPortfolioViews = portfolioItems?.reduce(
        (sum, item) => sum + (item.view_count || 0),
        0
      ) || 0;

      setAnalytics({
        profileViews: profile?.xp || 0,
        profileViewsChange: 12,
        connections: connectionsCount || 0,
        connectionsChange: 8,
        matches: matchesCount || 0,
        matchesChange: 15,
        applications: applicationsCount || 0,
        applicationsChange: 5,
        portfolioViews: totalPortfolioViews,
        portfolioViewsChange: 20,
        avgEngagement: ((connectionsCount || 0) / Math.max(profile?.xp || 1, 1) * 100).toFixed(1),
        totalUsers: totalUsers || 0,
        activeToday: activeToday || 0,
      });
    } catch (error: any) {
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const testEmailSystem = async () => {
    setEmailTesting(true);
    setEmailTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-email-system', {
        body: { sendTestEmail: true }
      });
      
      if (error) throw error;
      
      setEmailTestResult(data);
      toast({
        title: data.success ? "Email System Working!" : "Email Test Failed",
        description: data.message || (data.success ? "Test email sent successfully" : "Check the results below"),
        variant: data.success ? "default" : "destructive",
      });
    } catch (error: any) {
      setEmailTestResult({ success: false, message: error.message });
      toast({
        title: "Error testing email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEmailTesting(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, change, trend }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 text-xs mt-1">
          {trend === "up" ? (
            <>
              <ArrowUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+{change}%</span>
            </>
          ) : (
            <>
              <ArrowDown className="h-3 w-3 text-red-500" />
              <span className="text-red-500">-{change}%</span>
            </>
          )}
          <span className="text-muted-foreground ml-1">vs last month</span>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-16 lg:pb-0">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Track your performance and engagement on the platform
            </p>
          </div>
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Key Platform Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Eye className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.activeToday}</p>
                  <p className="text-xs text-muted-foreground">Active Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{funnelData.swipes}</p>
                  <p className="text-xs text-muted-foreground">Total Swipes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Heart className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{funnelData.matches}</p>
                  <p className="text-xs text-muted-foreground">Total Matches</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email System Test */}
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email System Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Test the email automation system to ensure welcome emails, digests, and notifications are working.
            </p>
            <Button 
              onClick={testEmailSystem} 
              disabled={emailTesting}
              className="w-full sm:w-auto"
            >
              {emailTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Test Email System
                </>
              )}
            </Button>
            
            {emailTestResult && (
              <div className={`p-4 rounded-lg ${emailTestResult.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {emailTestResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`font-medium ${emailTestResult.success ? 'text-green-500' : 'text-red-500'}`}>
                    {emailTestResult.success ? 'All Tests Passed!' : 'Test Failed'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{emailTestResult.message}</p>
                {emailTestResult.checks && (
                  <div className="space-y-1 text-sm">
                    {Object.entries(emailTestResult.checks).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex items-center gap-2">
                        {value ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Page Views', value: funnelData.pageViews, color: 'bg-blue-500' },
                { label: 'Sign Ups', value: funnelData.signups, color: 'bg-green-500' },
                { label: 'Onboarding Started', value: funnelData.onboardingStarts, color: 'bg-yellow-500' },
                { label: 'Onboarding Completed', value: funnelData.onboardingCompletes, color: 'bg-orange-500' },
                { label: 'Swipes', value: funnelData.swipes, color: 'bg-primary' },
                { label: 'Matches', value: funnelData.matches, color: 'bg-red-500' },
                { label: 'Messages Sent', value: funnelData.messages, color: 'bg-primary' },
                { label: 'Paywall Views', value: funnelData.paywallViews, color: 'bg-primary' },
                { label: 'Subscriptions', value: funnelData.subscriptions, color: 'bg-emerald-500' },
              ].map((step, index) => {
                const maxValue = Math.max(funnelData.pageViews, 1);
                const percentage = Math.round((step.value / maxValue) * 100);
                return (
                  <div key={step.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{step.label}</span>
                      <span className="font-medium">{step.value}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className={`${step.color} h-2 rounded-full transition-all`} 
                        style={{ width: `${Math.max(percentage, 2)}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Daily Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Daily Activity (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="events" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Events" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Event Breakdown Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Event Categories</CardTitle>
              <CardDescription>Distribution of tracked events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={eventBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                    >
                      {eventBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {eventBreakdown.map((item, index) => (
                    <div key={item.category} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="capitalize">{item.category}</span>
                      <span className="text-muted-foreground ml-auto">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Users Line Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Active Users Trend</CardTitle>
            <CardDescription>Unique users per day over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={Eye}
            title="Profile Views"
            value={analytics.profileViews}
            change={analytics.profileViewsChange}
            trend="up"
          />
          <StatCard
            icon={Users}
            title="Connections"
            value={analytics.connections}
            change={analytics.connectionsChange}
            trend="up"
          />
          <StatCard
            icon={Heart}
            title="Matches"
            value={analytics.matches}
            change={analytics.matchesChange}
            trend="up"
          />
          <StatCard
            icon={Briefcase}
            title="Applications Sent"
            value={analytics.applications}
            change={analytics.applicationsChange}
            trend="up"
          />
          <StatCard
            icon={Award}
            title="Portfolio Views"
            value={analytics.portfolioViews}
            change={analytics.portfolioViewsChange}
            trend="up"
          />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Engagement Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.avgEngagement}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Connections per profile view
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Profile Completion</span>
                      <span className="text-sm text-muted-foreground">85%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: "85%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Response Rate</span>
                      <span className="text-sm text-muted-foreground">92%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: "92%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Match Success Rate</span>
                      <span className="text-sm text-muted-foreground">67%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: "67%" }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">Video Editing</Badge>
                    <Badge variant="secondary">Photography</Badge>
                    <Badge variant="secondary">Social Media</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Activity Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Messages Sent</span>
                    <span className="font-medium">42</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Projects Created</span>
                    <span className="font-medium">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reviews Received</span>
                    <span className="font-medium">8</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Messages</p>
                        <p className="text-sm text-muted-foreground">Total conversations</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">28</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Heart className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium">Matches</p>
                        <p className="text-sm text-muted-foreground">Successful connections</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">{analytics.matches}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Network Growth</p>
                        <p className="text-sm text-muted-foreground">This month</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">+{analytics.connectionsChange}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Opportunity Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-secondary/50 rounded-lg">
                    <p className="text-3xl font-bold text-primary">{analytics.applications}</p>
                    <p className="text-sm text-muted-foreground mt-1">Total Applications</p>
                  </div>
                  <div className="text-center p-4 bg-secondary/50 rounded-lg">
                    <p className="text-3xl font-bold text-green-500">12</p>
                    <p className="text-sm text-muted-foreground mt-1">Active Responses</p>
                  </div>
                  <div className="text-center p-4 bg-secondary/50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-500">3</p>
                    <p className="text-sm text-muted-foreground mt-1">Opportunities Won</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;
