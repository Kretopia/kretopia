import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Flame, BookOpen, Headphones } from "lucide-react";
import Events from "./Events";
import { CrossModeNudge } from "@/components/CrossModeNudge";
import { SparkWall } from "@/components/scene/SparkWall";
import { MagazineWall } from "@/components/scene/MagazineWall";
import { PodcastPlayer } from "@/components/scene/PodcastPlayer";
import { GetStartedChecklist } from "@/components/onboarding/GetStartedChecklist";
import { SmartNudgeBanner } from "@/components/notifications/SmartNudgeBanner";
import { ProfileVisibilityBanner } from "@/components/ProfileVisibilityBanner";
import { getDiscoveryMissingFields } from "@/lib/profileCompletion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageTransition } from "@/components/PageTransition";

const Scene = () => {
  const [activeTab, setActiveTab] = useState("spark");
  const { user } = useAuth();
  const [visibility, setVisibility] = useState<{ isVisible: boolean; missingFields: string[] }>({ isVisible: true, missingFields: [] });

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const [profileRes, creditsRes, portfolioRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("credits").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("portfolio_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      if (profileRes.data) {
        const workCount = (creditsRes.count || 0) + (portfolioRes.count || 0);
        const missing = getDiscoveryMissingFields(profileRes.data as any, workCount);
        setVisibility({ isVisible: missing.length === 0, missingFields: missing });
      }
    };
    check();
  }, [user]);

  return (
    <PageTransition>
      <Helmet>
        <title>Scene | ThriveIN</title>
        <meta name="description" content="Your creative community hub — browse events, discover work, and join conversations." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-24">
          <ProfileVisibilityBanner isVisible={visibility.isVisible} missingFields={visibility.missingFields} />

          {/* Header */}
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                Scene
              </h1>
              <p className="text-sm text-muted-foreground">Events, inspiration & nearby creators</p>
            </div>
            <CrossModeNudge targetMode="work" label="Switch to Work →" targetPath="/desk" />
          </div>

          {/* 4 clean tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4 grid grid-cols-4">
              <TabsTrigger value="spark" className="gap-1.5 text-xs">
                <Flame className="h-3.5 w-3.5" />
                Spark
              </TabsTrigger>
              <TabsTrigger value="magazine" className="gap-1.5 text-xs">
                <BookOpen className="h-3.5 w-3.5" />
                Magazine
              </TabsTrigger>
              <TabsTrigger value="podcast" className="gap-1.5 text-xs">
                <Headphones className="h-3.5 w-3.5" />
                Podcast
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-1.5 text-xs">
                <CalendarDays className="h-3.5 w-3.5" />
                Events
              </TabsTrigger>
            </TabsList>

            <TabsContent value="spark" className="mt-0">
              <SmartNudgeBanner />
              <GetStartedChecklist />
              <SparkWall />
            </TabsContent>

            <TabsContent value="magazine" className="mt-0">
              <MagazineWall />
            </TabsContent>

            <TabsContent value="podcast" className="mt-0">
              <PodcastPlayer />
            </TabsContent>

            <TabsContent value="events" className="mt-0">
              <Events embedded />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  );
};

export default Scene;
