import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Bookmark, CalendarDays, Flame, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Events from "./Events";
import { SparkWall } from "@/components/scene/SparkWall";
import { ClipsWall } from "@/components/scene/ClipsWall";
import { GetStartedChecklist } from "@/components/onboarding/GetStartedChecklist";
import { SmartNudgeBanner } from "@/components/notifications/SmartNudgeBanner";
import { ProfileVisibilityBanner } from "@/components/ProfileVisibilityBanner";
import { getDiscoveryMissingFields } from "@/lib/profileCompletion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
    <>
      <Helmet>
        <title>Scene | ThriveIN</title>
        <meta name="description" content="Your creative community hub — browse events, discover work, and join conversations." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-24">
          {/* Profile Visibility Banner */}
          <ProfileVisibilityBanner isVisible={visibility.isVisible} missingFields={visibility.missingFields} />

          {/* Header */}
          <div className="mb-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              Scene
            </h1>
            <p className="text-sm text-muted-foreground">Events, inspiration & nearby creators</p>
          </div>

          {/* Sub-tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4 grid grid-cols-4">
              <TabsTrigger value="spark" className="gap-1 text-xs">
                <Flame className="h-3.5 w-3.5" />
                Spark
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-1 text-xs">
                <CalendarDays className="h-3.5 w-3.5" />
                Events
              </TabsTrigger>
              <TabsTrigger value="nearby" className="gap-1 text-xs">
                <MapPin className="h-3.5 w-3.5" />
                Nearby
              </TabsTrigger>
              <TabsTrigger value="clips" className="gap-1 text-xs">
                <Bookmark className="h-3.5 w-3.5" />
                Clips
              </TabsTrigger>
            </TabsList>

            <TabsContent value="spark" className="mt-0">
              <SmartNudgeBanner />
              <GetStartedChecklist />
              <SparkWall />
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
    </>
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
