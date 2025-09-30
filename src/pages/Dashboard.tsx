import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  Briefcase, 
  Zap,
  ArrowRight
} from "lucide-react";

const Dashboard = () => {
  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="mb-2 text-4xl font-bold">Welcome back, Creator! 👋</h1>
            <p className="text-muted-foreground">Here's what's happening with your network</p>
          </div>
          <Link to="/discover">
            <Button variant="gradient" size="lg">
              <Zap className="h-4 w-4" />
              Discover Now
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Credits Balance"
            value="60"
            change="+10 today"
            icon={<Sparkles className="h-6 w-6" />}
            gradient="from-primary to-secondary"
          />
          <StatCard
            title="Connections"
            value="128"
            change="+5 this week"
            icon={<Users className="h-6 w-6" />}
            gradient="from-secondary to-accent"
          />
          <StatCard
            title="Active Projects"
            value="3"
            change="2 pending"
            icon={<Briefcase className="h-6 w-6" />}
            gradient="from-accent to-primary"
          />
          <StatCard
            title="Profile Views"
            value="342"
            change="+23% this month"
            icon={<TrendingUp className="h-6 w-6" />}
            gradient="from-primary to-secondary"
          />
        </div>

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
              title="AI Studio"
              description="Generate content with AI-powered tools"
              icon={<Sparkles className="h-5 w-5" />}
              to="/studio"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="mb-4 text-2xl font-bold">Recent Activity</h2>
          <div className="space-y-4">
            <ActivityItem
              title="New match found"
              description="Sarah Martinez wants to collaborate on a music video"
              time="2 hours ago"
            />
            <ActivityItem
              title="Proposal sent"
              description="You sent a proposal for 'Brand Identity Design'"
              time="5 hours ago"
            />
            <ActivityItem
              title="Credits earned"
              description="Received +10 credits from daily login bonus"
              time="Yesterday"
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
