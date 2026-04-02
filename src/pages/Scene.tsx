import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Flame, BookOpen, Headphones } from "lucide-react";
import Events from "./Events";
import { CrossModeNudge } from "@/components/CrossModeNudge";
import { SparkWall } from "@/components/scene/SparkWall";
import { MagazineWall } from "@/components/scene/MagazineWall";
import { PodcastPlayer } from "@/components/scene/PodcastPlayer";
import { SceneHero } from "@/components/scene/SceneHero";
import { SceneContentPreviews } from "@/components/scene/SceneContentPreviews";
import { GetStartedChecklist } from "@/components/onboarding/GetStartedChecklist";
import { SmartNudgeBanner } from "@/components/notifications/SmartNudgeBanner";
import { ProfileVisibilityBanner } from "@/components/ProfileVisibilityBanner";
import { getDiscoveryMissingFields } from "@/lib/profileCompletion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageTransition } from "@/components/PageTransition";
import { LiveActivityTicker } from "@/components/scene/LiveActivityTicker";

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

  const handleNavigate = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  return (
    <PageTransition>
      <Helmet>
        <title>Scene | ThriveIN</title>
        <meta name="description" content="Your creative community hub — browse events, discover work, and join conversations." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-24">
          {user && <ProfileVisibilityBanner isVisible={visibility.isVisible} missingFields={visibility.missingFields} />}

          {/* Header */}
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                Scene
              </h1>
              <p className="text-xs text-muted-foreground">Events, inspiration & creative culture</p>
            </div>
            {user && <CrossModeNudge targetMode="work" label="Switch to Work →" targetPath="/desk" />}
          </div>

          {/* Live Activity */}
          <LiveActivityTicker />

          {/* Hero Carousel */}
          <SceneHero onNavigate={handleNavigate} />

          {/* Content Previews */}
          {activeTab === "spark" && (
            <SceneContentPreviews onNavigate={handleNavigate} />
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4 grid grid-cols-4 h-10 rounded-xl bg-muted/60 p-1">
              <TabsTrigger value="spark" className="gap-1.5 text-[11px] rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Flame className="h-3.5 w-3.5" />
                Spark
              </TabsTrigger>
              <TabsTrigger value="magazine" className="gap-1.5 text-[11px] rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <BookOpen className="h-3.5 w-3.5" />
                Magazine
              </TabsTrigger>
              <TabsTrigger value="podcast" className="gap-1.5 text-[11px] rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Headphones className="h-3.5 w-3.5" />
                Podcast
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-1.5 text-[11px] rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
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
