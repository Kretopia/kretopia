import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  FolderKanban, Briefcase, DollarSign, Target, ArrowRight, Plus,
  Clock, TrendingUp, AlertCircle, CheckCircle2, Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface WidgetProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  action?: { label: string; path: string };
  className?: string;
}

const Widget = ({ title, icon: Icon, children, action, className }: WidgetProps) => {
  const navigate = useNavigate();
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[hsl(var(--mode-accent))]" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {action && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => navigate(action.path)}>
            {action.label} <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
      <CardContent className="px-4 pb-4 pt-1">{children}</CardContent>
    </Card>
  );
};

const WorkHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [gigs, setGigs] = useState<any[]>([]);
  const [pipelineCount, setPipelineCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [projRes, gigsRes] = await Promise.all([
        supabase.from("projects").select("*").order("updated_at", { ascending: false }).limit(5),
        supabase.from("opportunities").select("id, title, status, created_at, budget_range").eq("posted_by", user.id).order("created_at", { ascending: false }).limit(5) as any,
      ]);
      setProjects(projRes.data || []);
      setGigs(gigsRes.data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--mode-accent))]" />
      </div>
    );
  }

  const activeProjects = projects.filter(p => p.status === "active");
  const activeGigs = gigs.filter(g => g.status === "active" || g.status === "open");

  return (
    <>
      <Helmet>
        <title>Work Dashboard | ThriveIN</title>
        <meta name="description" content="Your creative business command center — projects, gigs, pipeline at a glance." />
      </Helmet>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24 space-y-4">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-[hsl(var(--mode-accent))]" />
            Work Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Your business at a glance</p>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center cursor-pointer hover:bg-accent/30 transition-all" onClick={() => navigate("/desk")}>
            <p className="text-2xl font-bold">{activeProjects.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Projects</p>
          </Card>
          <Card className="p-3 text-center cursor-pointer hover:bg-accent/30 transition-all" onClick={() => navigate("/manage-opportunities")}>
            <p className="text-2xl font-bold">{activeGigs.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Open Gigs</p>
          </Card>
          <Card className="p-3 text-center cursor-pointer hover:bg-accent/30 transition-all" onClick={() => navigate("/sales")}>
            <p className="text-2xl font-bold">{pipelineCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipeline</p>
          </Card>
        </div>

        {/* Active Projects Widget */}
        <Widget title="Active Projects" icon={FolderKanban} action={{ label: "All", path: "/desk" }}>
          {activeProjects.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">No active projects</p>
              <Button size="sm" variant="outline" onClick={() => navigate("/desk")} className="gap-1">
                <Plus className="h-3 w-3" /> Create Project
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {activeProjects.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 cursor-pointer transition-all"
                  onClick={() => navigate(`/desk/${p.id}`)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span className="text-sm font-medium truncate flex-1">{p.title}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Widget>

        {/* Gigs Widget */}
        <Widget title="Your Gigs" icon={Briefcase} action={{ label: "Manage", path: "/manage-opportunities" }}>
          {activeGigs.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">No open gig listings</p>
              <Button size="sm" variant="outline" onClick={() => navigate("/post-opportunity")} className="gap-1">
                <Plus className="h-3 w-3" /> Post a Gig
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {activeGigs.slice(0, 3).map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 cursor-pointer transition-all"
                  onClick={() => navigate(`/opportunity/${g.id}`)}
                >
                  <Briefcase className="h-3.5 w-3.5 text-[hsl(var(--mode-accent))] shrink-0" />
                  <span className="text-sm font-medium truncate flex-1">{g.title}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {g.budget_range || "Open"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Widget>

        {/* Pipeline Widget */}
        <Widget title="Pipeline" icon={Target} action={{ label: "View All", path: "/sales" }}>
          <div className="flex items-center gap-3 p-2">
            <TrendingUp className="h-5 w-5 text-[hsl(var(--mode-accent))]" />
            <div>
              <p className="text-sm font-medium">{pipelineCount} active lead{pipelineCount !== 1 ? "s" : ""}</p>
              <p className="text-xs text-muted-foreground">Track outreach, proposals & conversions</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </div>
        </Widget>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate("/post-opportunity")}>
            <Briefcase className="h-4 w-4" />
            <span className="text-xs">Post a Gig</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate("/thrivepay")}>
            <DollarSign className="h-4 w-4" />
            <span className="text-xs">ThrivePay</span>
          </Button>
        </div>
      </div>
    </>
  );
};

export default WorkHome;
