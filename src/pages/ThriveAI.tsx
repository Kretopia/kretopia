import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Search, Send, Bot } from "lucide-react";
import AIChatTab from "@/components/thrive-ai/AIChatTab";
import LeadsTab from "@/components/thrive-ai/LeadsTab";
import OutreachTab from "@/components/thrive-ai/OutreachTab";
import { ProGate } from "@/components/project/ProGate";

const ThriveAI = () => {
  const { user, loading, subscriptionInfo } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chat");
  const isPro = subscriptionInfo?.tier === 'pro' && subscriptionInfo?.subscribed;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading ThriveAI...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">ThriveAI</h1>
          <p className="text-xs text-muted-foreground">Your AI-powered creative assistant</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4" />
            <span>Chat</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5 text-xs sm:text-sm">
            <Search className="h-4 w-4" />
            <span>Leads</span>
          </TabsTrigger>
          <TabsTrigger value="outreach" className="gap-1.5 text-xs sm:text-sm">
            <Send className="h-4 w-4" />
            <span>Outreach</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <AIChatTab />
        </TabsContent>

        <TabsContent value="leads">
          <ProGate feature="AI Lead Scout" description="Find and manage potential clients and collaborators with AI-powered web scouting, CRM pipeline, and CSV import." isPro={isPro}>
            <LeadsTab />
          </ProGate>
        </TabsContent>

        <TabsContent value="outreach">
          <ProGate feature="AI Outreach" description="Create multi-step email sequences, draft personalized outreach with AI, and manage your outbound pipeline." isPro={isPro}>
            <OutreachTab />
          </ProGate>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ThriveAI;
