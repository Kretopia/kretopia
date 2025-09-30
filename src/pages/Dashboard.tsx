import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  Briefcase, 
  Zap,
  ArrowRight,
  MessageCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WalletCard } from "@/components/WalletCard";
import { checkAndAwardDailyLogin } from "@/lib/creditSystem";

interface Profile {
  credits: number;
  full_name: string;
}

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({
    circle: 0,
    projects: 0,
    profileViews: 0
  });
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchProfile = async () => {
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
        .select('credits, full_name')
        .eq('user_id', user.id)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
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

      // Fetch active projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*, matches!inner(*)')
        .eq('status', 'active')
        .or(`matches.user1_id.eq.${user.id},matches.user2_id.eq.${user.id}`)
        .limit(5);

      if (projectsData) {
        setActiveProjects(projectsData);
        setStats(prev => ({
          ...prev,
          projects: projectsData.length,
        }));
      }
    };

    fetchProfile();
    
    // Handle payment/subscription success from URL params
    const paymentStatus = searchParams.get("payment");
    const subscriptionStatus = searchParams.get("subscription");
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
          .single();
          
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
    
    if (subscriptionStatus === "success") {
      toast({
        title: "Subscription activated!",
        description: "Your subscription is now active",
      });
      
      // Trigger subscription check
      supabase.functions.invoke("check-subscription");
      navigate("/dashboard", { replace: true });
    }
  }, [toast, searchParams, navigate]);

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="mb-2 text-4xl font-bold">
              Welcome back, {profile?.full_name || 'Creator'}! 👋
            </h1>
            <p className="text-muted-foreground">Here's what's happening with your network</p>
          </div>
          <Link to="/discover">
            <Button variant="gradient" size="lg">
              <Zap className="h-4 w-4" />
              Discover Now
            </Button>
          </Link>
        </div>

        {/* Stats Cards & Wallet */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-6 md:grid-cols-2">
            <StatCard
              title="My Circle"
              value={stats.circle.toString()}
              change="+5 this week"
              icon={<Users className="h-6 w-6" />}
              gradient="from-secondary to-accent"
            />
            <StatCard
              title="Active Projects"
              value={stats.projects.toString()}
              change="In progress"
              icon={<Briefcase className="h-6 w-6" />}
              gradient="from-accent to-primary"
            />
          </div>
          <WalletCard />
        </div>

        {/* Active Projects */}
        {activeProjects.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold">Active Projects</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {activeProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className="cursor-pointer transition-smooth hover:shadow-glow"
                  onClick={() => navigate(`/desk/${project.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{project.title}</span>
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description || 'No description'}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
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

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-bold">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
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
          <h2 className="mb-4 text-2xl font-bold">Recent Activity</h2>
          <div className="space-y-4">
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
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div className={`rounded-xl bg-gradient-to-br ${gradient} p-3 text-primary-foreground`}>
          {icon}
        </div>
      </div>
      <div className="mb-1 text-3xl font-bold">{value}</div>
      <div className="mb-1 text-sm font-medium text-foreground">{title}</div>
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
      <div className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-smooth hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow">
        <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
          {icon}
        </div>
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{description}</p>
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          Get started
          <ArrowRight className="h-4 w-4 transition-smooth group-hover:translate-x-1" />
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
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="mb-1 font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>
    </div>
  );
};

export default Dashboard;
