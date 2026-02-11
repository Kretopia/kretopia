import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Search, Send, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AIChatTab from "@/components/thrive-ai/AIChatTab";

const ThriveAI = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chat");

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
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-4 max-w-4xl">
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
            <TabsTrigger value="leads" className="gap-1.5 text-xs sm:text-sm" disabled>
              <Search className="h-4 w-4" />
              <span>Leads</span>
              <Badge variant="secondary" className="text-[9px] px-1 py-0">Soon</Badge>
            </TabsTrigger>
            <TabsTrigger value="outreach" className="gap-1.5 text-xs sm:text-sm" disabled>
              <Send className="h-4 w-4" />
              <span>Outreach</span>
              <Badge variant="secondary" className="text-[9px] px-1 py-0">Soon</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
            <AIChatTab />
          </TabsContent>

          <TabsContent value="leads">
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Web Scout — Coming Soon</p>
              <p className="text-sm">AI-powered lead generation from the web</p>
            </div>
          </TabsContent>

          <TabsContent value="outreach">
            <div className="text-center py-12 text-muted-foreground">
              <Send className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Smart Outreach — Coming Soon</p>
              <p className="text-sm">AI-generated personalized outreach messages</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
};

export default ThriveAI;
