import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Bookmark, CalendarDays, Flame, MapPin, BookOpen, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Events from "./Events";
import { CrossModeNudge } from "@/components/CrossModeNudge";
import { SparkWall } from "@/components/scene/SparkWall";
import { ClipsWall } from "@/components/scene/ClipsWall";
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
  const navigate = useNavigate();
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

          {/* Sub-tabs - scrollable for 6 tabs on mobile */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4 flex overflow-x-auto scrollbar-hide gap-0.5">
              <TabsTrigger value="spark" className="gap-1 text-xs flex-1 min-w-0">
                <Flame className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Spark</span>
              </TabsTrigger>
              <TabsTrigger value="magazine" className="gap-1 text-xs flex-1 min-w-0">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Magazine</span>
              </TabsTrigger>
              <TabsTrigger value="podcast" className="gap-1 text-xs flex-1 min-w-0">
                <Headphones className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Podcast</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-1 text-xs flex-1 min-w-0">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Events</span>
              </TabsTrigger>
              <TabsTrigger value="nearby" className="gap-1 text-xs flex-1 min-w-0">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Nearby</span>
              </TabsTrigger>
              <TabsTrigger value="clips" className="gap-1 text-xs flex-1 min-w-0">
                <Bookmark className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Clips</span>
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
              <EventsEmbed />
            </TabsContent>

            <TabsContent value="nearby" className="mt-0">
              <NearbyEmbed onOpenMap={() => navigate('/nearby')} />
            </TabsContent>

            <TabsContent value="clips" className="mt-0">
              <ClipsWall />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  );
};

const EventsEmbed = () => {
  return <Events embedded />;
};

const NearbyEmbed = ({ onOpenMap }: { onOpenMap: () => void }) => (
  <div className="text-center py-10">
    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
      <MapPin className="h-8 w-8 text-primary" />
    </div>
    <h3 className="font-semibold text-lg mb-2">Discover Nearby Creators</h3>
    <p className="text-sm text-muted-foreground mb-1">
      Find creators, sessions & events in your area
    </p>
    <p className="text-xs text-muted-foreground mb-6">
      Your location is protected — others only see an approximate area
    </p>
    <Button onClick={onOpenMap} size="lg" className="gap-2">
      <MapPin className="h-4 w-4" />
      Open Map View
    </Button>
  </div>
);

export default Scene;
