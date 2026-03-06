import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Send, Target, Users, TrendingUp, Mail, Crown, Lock, Kanban, BarChart3 } from "lucide-react";
import LeadsTab from "@/components/thrive-ai/LeadsTab";
import OutreachTab from "@/components/thrive-ai/OutreachTab";
import { FreeTierGate } from "@/components/FreeTierGate";
import { LeadPipelineKanban } from "@/components/sales/LeadPipelineKanban";
import { ConversionFunnel } from "@/components/sales/ConversionFunnel";

const SalesDashboard = () => {
  const { user, loading, subscriptionInfo } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("leads");
  const isPro = subscriptionInfo.subscribed;

  // Fetch lead stats
  const { data: leads = [] } = useQuery({
    queryKey: ["leads-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, stage, source, created_at")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch outreach stats
  const { data: sequences = [] } = useQuery({
    queryKey: ["outreach-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_sequences")
        .select("id, status, completed_steps, total_steps")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: emailsSent = [] } = useQuery({
    queryKey: ["emails-sent-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sequence_emails")
        .select("id, status")
        .eq("user_id", user!.id)
        .eq("status", "sent");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: campaignsSentCount = 0 } = useQuery({
    queryKey: ["campaigns-sent-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("sent_count")
        .eq("user_id", user!.id)
        .eq("status", "sent");
      if (error) throw error;
      return (data || []).reduce((sum, c) => sum + (c.sent_count || 0), 0);
    },
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const totalLeads = leads.length;
  const hotLeads = leads.filter((l) => l.stage === "hot").length;
  const convertedLeads = leads.filter((l) => l.stage === "converted").length;
  const aiScoutedLeads = leads.filter((l) => l.source === "AI Scout").length;
  const activeSequences = sequences.filter((s) => s.status === "active").length;
  const totalEmailsSent = emailsSent.length + campaignsSentCount;

  const stats = [
    { label: "Total Leads", value: totalLeads, icon: Users, color: "text-primary" },
    { label: "Hot Leads", value: hotLeads, icon: TrendingUp, color: "text-orange-500" },
    { label: "Converted", value: convertedLeads, icon: Target, color: "text-green-500" },
    { label: "AI Scouted", value: aiScoutedLeads, icon: Search, color: "text-violet-500" },
    { label: "Active Sequences", value: activeSequences, icon: Send, color: "text-blue-500" },
    { label: "Emails Sent", value: totalEmailsSent, icon: Mail, color: "text-amber-500" },
  ];

  // Free users see first 4 stats, last 2 are pro-gated
  const freeStatCount = 4;

  return (
    <div className="container mx-auto px-4 py-4 max-w-5xl pb-24 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Target className="h-6 w-6 text-primary" />
          </div>
           <div>
            <h1 className="text-xl font-bold">ThriveFunnel</h1>
            <p className="text-xs text-muted-foreground">Find leads, automate outreach, close deals</p>
          </div>
        </div>
        {!isPro && (
          <Badge variant="outline" className="gap-1 text-muted-foreground border-border">
            Spark Plan
          </Badge>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {stats.map((stat, i) => {
          const isLocked = !isPro && i >= freeStatCount;
          return (
            <Card
              key={stat.label}
              className={`p-3 relative overflow-hidden transition-all ${
                isLocked ? "opacity-60" : "hover:shadow-md"
              }`}
            >
              {isLocked && (
                <div className="absolute inset-0 backdrop-blur-[2px] bg-background/40 flex items-center justify-center z-10">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex items-center gap-2 mb-1.5">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{isLocked ? "—" : stat.value}</p>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="leads" className="gap-1.5 text-xs sm:text-sm">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Lead Scout</span>
            <span className="sm:hidden">Leads</span>
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5 text-xs sm:text-sm">
            <Kanban className="h-4 w-4" />
            <span>Pipeline</span>
          </TabsTrigger>
          <TabsTrigger value="outreach" className="gap-1.5 text-xs sm:text-sm">
            <Send className="h-4 w-4" />
            <span>Outreach</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span>Funnel</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <FreeTierGate feature="aiLeadSearches" featureLabel="AI Lead Scout" description="Upgrade to Pro for unlimited lead searches, CRM pipeline, and CSV export.">
            <LeadsTab />
          </FreeTierGate>
        </TabsContent>

        <TabsContent value="pipeline">
          <FreeTierGate feature="aiLeadSearches" featureLabel="Pipeline View" description="Upgrade to Pro for the visual pipeline kanban and lead management.">
            <LeadPipelineKanban />
          </FreeTierGate>
        </TabsContent>

        <TabsContent value="outreach">
          <FreeTierGate feature="aiOutreachDrafts" featureLabel="AI Outreach" description="Upgrade to Pro for unlimited outreach sequences and AI-powered email drafts.">
            <OutreachTab />
          </FreeTierGate>
        </TabsContent>

        <TabsContent value="analytics">
          <FreeTierGate feature="aiLeadSearches" featureLabel="Conversion Analytics" description="Upgrade to Pro for conversion funnel analytics and lead scoring.">
            <ConversionFunnel leads={leads} />
          </FreeTierGate>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesDashboard;
