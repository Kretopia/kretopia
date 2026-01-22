import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Bot, Settings, Target, ListTodo, Mail, FileText, 
  Sparkles, Play, Pause, Check, X, Clock, Zap,
  Plus, Trash2, CheckCircle2, Circle, AlertCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface AgentSettings {
  id: string;
  user_id: string;
  is_active: boolean;
  mode: 'suggestion' | 'semi_autonomous' | 'autonomous';
  focus_areas: string[];
  email_automation: boolean;
  task_automation: boolean;
  document_generation: boolean;
  daily_action_limit: number;
  auto_approve_low_risk: boolean;
  working_hours_start: number;
  working_hours_end: number;
  timezone: string;
}

interface AgentGoal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  goal_type: string;
  target_value: number;
  current_value: number;
  deadline: string | null;
  status: string;
  priority: string;
  created_at: string;
}

interface AgentAction {
  id: string;
  user_id: string;
  goal_id: string | null;
  action_type: string;
  title: string;
  description: string | null;
  payload: Record<string, unknown>;
  status: string;
  risk_level: string;
  scheduled_for: string | null;
  executed_at: string | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

const AIAgent = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [goals, setGoals] = useState<AgentGoal[]>([]);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showNewGoalDialog, setShowNewGoalDialog] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    goal_type: "connections",
    target_value: 5,
    priority: "medium",
    deadline: ""
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchAgentData();
      subscribeToActions();
    }
  }, [user, authLoading]);

  const fetchAgentData = async () => {
    try {
      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("agent_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      
      if (settingsError && settingsError.code !== "PGRST116") throw settingsError;
      
      if (settingsData) {
        setSettings(settingsData as AgentSettings);
      } else {
        // Create default settings
        const { data: newSettings, error: createError } = await supabase
          .from("agent_settings")
          .insert({ user_id: user!.id })
          .select()
          .single();
        
        if (createError) throw createError;
        setSettings(newSettings as AgentSettings);
      }

      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from("agent_goals")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      
      if (goalsError) throw goalsError;
      setGoals((goalsData || []) as AgentGoal[]);

      // Fetch actions
      const { data: actionsData, error: actionsError } = await supabase
        .from("agent_actions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (actionsError) throw actionsError;
      setActions((actionsData || []) as AgentAction[]);

    } catch (error) {
      console.error("Error fetching agent data:", error);
      toast({
        title: "Error",
        description: "Failed to load AI Agent settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToActions = () => {
    const channel = supabase
      .channel("agent-actions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_actions",
          filter: `user_id=eq.${user!.id}`
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setActions((prev) => [payload.new as AgentAction, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setActions((prev) =>
              prev.map((a) => (a.id === payload.new.id ? payload.new as AgentAction : a))
            );
          } else if (payload.eventType === "DELETE") {
            setActions((prev) => prev.filter((a) => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateSettings = async (updates: Partial<AgentSettings>) => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("agent_settings")
        .update(updates)
        .eq("id", settings.id);
      
      if (error) throw error;
      setSettings({ ...settings, ...updates });
      toast({
        title: "Settings updated",
        description: "Your AI Agent preferences have been saved"
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleAgent = async () => {
    await updateSettings({ is_active: !settings?.is_active });
  };

  const createGoal = async () => {
    if (!newGoal.title.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from("agent_goals")
        .insert({
          user_id: user!.id,
          title: newGoal.title,
          description: newGoal.description || null,
          goal_type: newGoal.goal_type,
          target_value: newGoal.target_value,
          priority: newGoal.priority,
          deadline: newGoal.deadline || null
        })
        .select()
        .single();
      
      if (error) throw error;
      setGoals([data as AgentGoal, ...goals]);
      setShowNewGoalDialog(false);
      setNewGoal({
        title: "",
        description: "",
        goal_type: "connections",
        target_value: 5,
        priority: "medium",
        deadline: ""
      });
      toast({
        title: "Goal created",
        description: "Your AI Agent will work towards this goal"
      });
    } catch (error) {
      console.error("Error creating goal:", error);
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive"
      });
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from("agent_goals")
        .delete()
        .eq("id", goalId);
      
      if (error) throw error;
      setGoals(goals.filter((g) => g.id !== goalId));
      toast({
        title: "Goal deleted"
      });
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const [generatingGoalId, setGeneratingGoalId] = useState<string | null>(null);

  const generateActionsForGoal = async (goalId: string) => {
    setGeneratingGoalId(goalId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-agent-actions", {
        body: { goalId }
      });
      
      if (error) throw error;
      
      toast({
        title: "Actions generated",
        description: `${data?.actionsCreated || 0} new actions added to queue`
      });
      
      // Refresh actions list
      const { data: actionsData } = await supabase
        .from("agent_actions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (actionsData) {
        setActions(actionsData as AgentAction[]);
      }
    } catch (error) {
      console.error("Error generating actions:", error);
      toast({
        title: "Error",
        description: "Failed to generate actions",
        variant: "destructive"
      });
    } finally {
      setGeneratingGoalId(null);
    }
  };

  const handleAction = async (actionId: string, approved: boolean) => {
    try {
      const status = approved ? "approved" : "rejected";
      const { error } = await supabase
        .from("agent_actions")
        .update({ status })
        .eq("id", actionId);
      
      if (error) throw error;
      
      if (approved) {
        // Execute the action
        await supabase.functions.invoke("execute-agent-action", {
          body: { actionId }
        });
      }
      
      toast({
        title: approved ? "Action approved" : "Action rejected",
        description: approved ? "The agent will execute this action" : "Action has been cancelled"
      });
    } catch (error) {
      console.error("Error handling action:", error);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="h-4 w-4" />;
      case "task": return <ListTodo className="h-4 w-4" />;
      case "document": return <FileText className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
      approved: { variant: "secondary", icon: <Check className="h-3 w-3" /> },
      executing: { variant: "default", icon: <Sparkles className="h-3 w-3 animate-pulse" /> },
      completed: { variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
      failed: { variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
      rejected: { variant: "destructive", icon: <X className="h-3 w-3" /> }
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading AI Agent...</div>
      </div>
    );
  }

  const pendingActions = actions.filter((a) => a.status === "pending");
  const completedActions = actions.filter((a) => a.status === "completed");
  const activeGoals = goals.filter((g) => g.status === "active");

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Agent</h1>
              <p className="text-sm text-muted-foreground">Your personal automation assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={settings?.is_active ? "default" : "secondary"} className="gap-1">
              {settings?.is_active ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {settings?.is_active ? "Active" : "Paused"}
            </Badge>
            <Button
              variant={settings?.is_active ? "outline" : "default"}
              onClick={toggleAgent}
              disabled={saving}
            >
              {settings?.is_active ? "Pause Agent" : "Activate Agent"}
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{pendingActions.length}</div>
              <p className="text-sm text-muted-foreground">Pending Actions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{completedActions.length}</div>
              <p className="text-sm text-muted-foreground">Completed Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{activeGoals.length}</div>
              <p className="text-sm text-muted-foreground">Active Goals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{settings?.daily_action_limit || 10}</div>
              <p className="text-sm text-muted-foreground">Daily Limit</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="queue" className="gap-2">
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Queue</span>
              {pendingActions.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                  {pendingActions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Goals</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Capabilities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Capabilities
                  </CardTitle>
                  <CardDescription>What your AI Agent can do</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>Email Automation</span>
                    </div>
                    <Switch
                      checked={settings?.email_automation}
                      onCheckedChange={(checked) => updateSettings({ email_automation: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListTodo className="h-4 w-4 text-muted-foreground" />
                      <span>Task Management</span>
                    </div>
                    <Switch
                      checked={settings?.task_automation}
                      onCheckedChange={(checked) => updateSettings({ task_automation: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>Document Generation</span>
                    </div>
                    <Switch
                      checked={settings?.document_generation}
                      onCheckedChange={(checked) => updateSettings({ document_generation: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest agent actions</CardDescription>
                </CardHeader>
                <CardContent>
                  {actions.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No actions yet</p>
                      <p className="text-sm">Create goals to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {actions.slice(0, 5).map((action) => (
                        <div key={action.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          {getActionIcon(action.action_type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{action.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(action.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {getStatusBadge(action.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Active Goals Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Active Goals</span>
                  <Button size="sm" onClick={() => setShowNewGoalDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    New Goal
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeGoals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No active goals</p>
                    <p className="text-sm">Set goals for your AI Agent to work towards</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeGoals.slice(0, 3).map((goal) => (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{goal.title}</span>
                          <span className="text-sm text-muted-foreground">
                            {goal.current_value}/{goal.target_value}
                          </span>
                        </div>
                        <Progress value={(goal.current_value / goal.target_value) * 100} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Queue Tab */}
          <TabsContent value="queue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Action Queue</CardTitle>
                <CardDescription>Review and approve pending actions</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingActions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">All caught up!</p>
                    <p className="text-sm">No pending actions to review</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingActions.map((action) => (
                      <Card key={action.id} className="border-dashed">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                {getActionIcon(action.action_type)}
                              </div>
                              <div>
                                <h4 className="font-medium">{action.title}</h4>
                                {action.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {action.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline">{action.action_type}</Badge>
                                  <Badge variant={action.risk_level === "low" ? "secondary" : action.risk_level === "medium" ? "default" : "destructive"}>
                                    {action.risk_level} risk
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction(action.id, false)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAction(action.id, true)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completed Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Completed Actions</CardTitle>
              </CardHeader>
              <CardContent>
                {completedActions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No completed actions yet</p>
                ) : (
                  <div className="space-y-2">
                    {completedActions.slice(0, 10).map((action) => (
                      <div key={action.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        {getActionIcon(action.action_type)}
                        <span className="flex-1 text-sm">{action.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {action.executed_at && new Date(action.executed_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowNewGoalDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </div>

            {goals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-semibold text-lg mb-2">No goals yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Set goals for your AI Agent to work towards automatically
                  </p>
                  <Button onClick={() => setShowNewGoalDialog(true)}>Create Your First Goal</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {goals.map((goal) => (
                  <Card key={goal.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {goal.status === "completed" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                          )}
                          <div>
                            <h4 className="font-medium">{goal.title}</h4>
                            {goal.description && (
                              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{goal.goal_type}</Badge>
                              <Badge variant={goal.priority === "high" ? "destructive" : goal.priority === "medium" ? "default" : "secondary"}>
                                {goal.priority}
                              </Badge>
                              {goal.deadline && (
                                <span className="text-xs text-muted-foreground">
                                  Due: {new Date(goal.deadline).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateActionsForGoal(goal.id)}
                            disabled={generatingGoalId === goal.id}
                            className="gap-1"
                          >
                            {generatingGoalId === goal.id ? (
                              <>
                                <Sparkles className="h-4 w-4 animate-pulse" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                Generate Actions
                              </>
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteGoal(goal.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{goal.current_value}/{goal.target_value}</span>
                        </div>
                        <Progress value={(goal.current_value / goal.target_value) * 100} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Agent Mode</CardTitle>
                <CardDescription>How autonomous should your agent be?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={settings?.mode}
                  onValueChange={(value: 'suggestion' | 'semi_autonomous' | 'autonomous') => 
                    updateSettings({ mode: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggestion">
                      <div>
                        <div className="font-medium">Suggestion Mode</div>
                        <div className="text-xs text-muted-foreground">Agent suggests, you approve everything</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="semi_autonomous">
                      <div>
                        <div className="font-medium">Semi-Autonomous</div>
                        <div className="text-xs text-muted-foreground">Auto-approve low-risk actions</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="autonomous">
                      <div>
                        <div className="font-medium">Autonomous</div>
                        <div className="text-xs text-muted-foreground">Agent acts independently within limits</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-approve low-risk actions</Label>
                    <p className="text-sm text-muted-foreground">Skip approval for safe actions</p>
                  </div>
                  <Switch
                    checked={settings?.auto_approve_low_risk}
                    onCheckedChange={(checked) => updateSettings({ auto_approve_low_risk: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Limits</CardTitle>
                <CardDescription>Control how many actions your agent can take per day</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <Label>Maximum actions per day</Label>
                    <span className="text-sm font-medium">{settings?.daily_action_limit}</span>
                  </div>
                  <Slider
                    value={[settings?.daily_action_limit || 10]}
                    min={1}
                    max={50}
                    step={1}
                    onValueChange={([value]) => updateSettings({ daily_action_limit: value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Working Hours</CardTitle>
                <CardDescription>When should your agent be active?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Hour</Label>
                    <Select
                      value={String(settings?.working_hours_start || 9)}
                      onValueChange={(v) => updateSettings({ working_hours_start: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {i.toString().padStart(2, "0")}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>End Hour</Label>
                    <Select
                      value={String(settings?.working_hours_end || 18)}
                      onValueChange={(v) => updateSettings({ working_hours_end: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {i.toString().padStart(2, "0")}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* New Goal Dialog */}
        <Dialog open={showNewGoalDialog} onOpenChange={setShowNewGoalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Set a goal for your AI Agent to work towards
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Goal Title</Label>
                <Input
                  placeholder="e.g., Get 10 new connections this week"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="More details about what you want to achieve..."
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Goal Type</Label>
                  <Select
                    value={newGoal.goal_type}
                    onValueChange={(v) => setNewGoal({ ...newGoal, goal_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="connections">Connections</SelectItem>
                      <SelectItem value="applications">Applications</SelectItem>
                      <SelectItem value="profile">Profile</SelectItem>
                      <SelectItem value="projects">Projects</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newGoal.target_value}
                    onChange={(e) => setNewGoal({ ...newGoal, target_value: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={newGoal.priority}
                    onValueChange={(v) => setNewGoal({ ...newGoal, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Deadline (optional)</Label>
                  <Input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewGoalDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createGoal} disabled={!newGoal.title.trim()}>
                Create Goal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <BottomNav />
    </div>
  );
};

export default AIAgent;
