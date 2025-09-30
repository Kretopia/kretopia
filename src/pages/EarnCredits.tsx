import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  Circle, 
  Coins, 
  TrendingUp,
  Users,
  Briefcase,
  Star,
  Calendar,
  FileText
} from "lucide-react";
import { CREDIT_REWARDS } from "@/lib/creditSystem";

interface EarnTask {
  id: string;
  title: string;
  description: string;
  credits: number;
  icon: React.ReactNode;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

export default function EarnCredits() {
  const [tasks, setTasks] = useState<EarnTask[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile completion
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Fetch connections count
      const { count: connectionsCount } = await supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      // Fetch completed projects
      const { count: projectsCount } = await supabase
        .from('projects')
        .select('*, matches!inner(*)', { count: 'exact', head: true })
        .eq('status', 'completed')
        .or(`matches.user1_id.eq.${user.id},matches.user2_id.eq.${user.id}`);

      // Fetch reviews
      const { count: reviewsCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', user.id)
        .eq('status', 'approved');

      // Fetch total earned credits from xp_activities
      const { data: activities } = await supabase
        .from('xp_activities')
        .select('xp_earned')
        .eq('user_id', user.id);

      const earned = activities?.reduce((sum, activity) => sum + (activity.xp_earned / 10), 0) || 0;
      setTotalEarned(earned);

      // Check profile completion
      const profileComplete = !!(
        profile?.full_name &&
        profile?.bio &&
        profile?.location &&
        profile?.avatar_url
      );

      const tasksList: EarnTask[] = [
        {
          id: 'profile',
          title: 'Complete Your Profile',
          description: 'Add your name, bio, location, and profile picture',
          credits: CREDIT_REWARDS.PROFILE_COMPLETE,
          icon: <FileText className="h-5 w-5" />,
          completed: profileComplete,
          action: () => navigate('/profile'),
          actionLabel: 'Complete Profile'
        },
        {
          id: 'connections',
          title: 'Make 10 Connections',
          description: `Connect with other creators (${connectionsCount || 0}/10)`,
          credits: CREDIT_REWARDS.CONNECTION_MADE * 10,
          icon: <Users className="h-5 w-5" />,
          completed: (connectionsCount || 0) >= 10,
          action: () => navigate('/discover'),
          actionLabel: 'Find Creators'
        },
        {
          id: 'project',
          title: 'Complete a Project',
          description: 'Finish your first collaboration',
          credits: CREDIT_REWARDS.PROJECT_COMPLETED,
          icon: <Briefcase className="h-5 w-5" />,
          completed: (projectsCount || 0) > 0,
          action: () => navigate('/projects'),
          actionLabel: 'View Projects'
        },
        {
          id: 'review',
          title: 'Get a 5-Star Review',
          description: 'Receive positive feedback from a client',
          credits: CREDIT_REWARDS.REVIEW_RECEIVED,
          icon: <Star className="h-5 w-5" />,
          completed: (reviewsCount || 0) > 0,
        },
        {
          id: 'daily',
          title: 'Daily Login Streak',
          description: 'Log in every day this week',
          credits: CREDIT_REWARDS.DAILY_LOGIN * 7,
          icon: <Calendar className="h-5 w-5" />,
          completed: false,
        },
      ];

      setTasks(tasksList);
    } catch (error) {
      console.error('Error fetching progress:', error);
      toast({
        title: "Error",
        description: "Failed to load earning progress",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Earn Credits</h1>
        <p className="text-muted-foreground">
          Complete tasks to earn credits and level up your account
        </p>
      </div>

      {/* Progress Overview */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEarned} credits</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedTasks}/{totalTasks}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(progressPercent)}%</div>
            <Progress value={progressPercent} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Earning Tasks */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">Available Tasks</h2>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className={task.completed ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-lg p-3 ${
                      task.completed 
                        ? 'bg-green-500/10 text-green-500' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {task.completed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        task.icon
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {task.title}
                        {task.completed && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            Completed
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {task.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      +{task.credits}
                    </div>
                    <div className="text-xs text-muted-foreground">credits</div>
                  </div>
                </div>
              </CardHeader>
              {!task.completed && task.action && (
                <CardContent>
                  <Button onClick={task.action} variant="outline" size="sm">
                    {task.actionLabel}
                  </Button>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Recurring Earnings */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recurring Earnings</CardTitle>
          <CardDescription>
            Earn credits every time you complete these actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <span>New Connection</span>
              </div>
              <span className="font-semibold text-primary">+{CREDIT_REWARDS.CONNECTION_MADE} credits</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <span>Daily Login</span>
              </div>
              <span className="font-semibold text-primary">+{CREDIT_REWARDS.DAILY_LOGIN} credits</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <span>Post Opportunity</span>
              </div>
              <span className="font-semibold text-primary">+{CREDIT_REWARDS.OPPORTUNITY_POSTED} credits</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
