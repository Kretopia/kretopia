import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

const Analytics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<any>(null);
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
  });

  useEffect(() => {
    fetchAnalytics();
    fetchFunnelData();
  }, []);

  const fetchFunnelData = async () => {
    try {
      // Get counts for each funnel stage
      const [pageViews, signups, onboardingStarts, onboardingCompletes, swipes, matches, messages, paywallViews, subscriptions] = await Promise.all([
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'page_view'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'sign_up'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'onboarding_started'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'onboarding_completed'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'swipe'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'match_created'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'message_sent'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'paywall_viewed'),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_name', 'subscription_started'),
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
      });
    } catch (error) {
      console.error('Error fetching funnel data:', error);
    }
  };

  const fetchAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
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
        .from("portfolio_items")
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your performance and engagement on the platform
          </p>
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
                { label: 'Swipes', value: funnelData.swipes, color: 'bg-pink-500' },
                { label: 'Matches', value: funnelData.matches, color: 'bg-red-500' },
                { label: 'Messages Sent', value: funnelData.messages, color: 'bg-purple-500' },
                { label: 'Paywall Views', value: funnelData.paywallViews, color: 'bg-indigo-500' },
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
