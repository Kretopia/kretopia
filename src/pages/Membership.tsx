import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, MapPin, Award, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { MembershipMap } from "@/components/membership/MembershipMap";
import { LocationCard } from "@/components/membership/LocationCard";
import { QRScanner } from "@/components/membership/QRScanner";

export default function Membership() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      setProfile(profileData);

      // Fetch locations based on subscription tier
      const userTier = profileData?.subscription_tier || "free";
      const { data: locationsData } = await supabase
        .from("partner_locations")
        .select("*")
        .in("tier_required", getTierAccess(userTier))
        .eq("is_active", true)
        .order("name");

      setLocations(locationsData || []);

      // Fetch user's check-ins
      const { data: checkInsData } = await supabase
        .from("user_check_ins")
        .select(`
          *,
          partner_locations (*)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setCheckIns(checkInsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load membership data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTierAccess = (tier: string) => {
    switch (tier) {
      case "premium":
        return ["free", "standard", "premium"];
      case "standard":
        return ["free", "standard"];
      default:
        return ["free"];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      {/* Membership Card */}
      <Card className="mb-6 overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">{profile?.full_name}</h1>
              <Badge variant="outline" className="capitalize">
                {profile?.subscription_tier || "Free"} Member
              </Badge>
            </div>
            <Badge className="text-lg px-3 py-1">
              {profile?.badge || "Beta"}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {profile?.xp || 0}
              </div>
              <div className="text-xs text-muted-foreground">Credits</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {profile?.level || 1}
              </div>
              <div className="text-xs text-muted-foreground">Level</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {checkIns.length}
              </div>
              <div className="text-xs text-muted-foreground">Check-ins</div>
            </div>
          </div>

          <Button 
            onClick={() => setShowScanner(true)} 
            className="w-full"
            size="lg"
          >
            <QrCode className="mr-2 h-5 w-5" />
            Scan QR to Check In
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="locations" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="locations">
            <MapPin className="mr-2 h-4 w-4" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="map">
            <MapPin className="mr-2 h-4 w-4" />
            Map
          </TabsTrigger>
          <TabsTrigger value="activity">
            <TrendingUp className="mr-2 h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="space-y-4 mt-4">
          {locations.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No partner locations available</p>
            </Card>
          ) : (
            locations.map((location) => (
              <LocationCard 
                key={location.id} 
                location={location}
                onCheckIn={() => setShowScanner(true)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <MembershipMap locations={locations} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 mt-4">
          {checkIns.length === 0 ? (
            <Card className="p-6 text-center">
              <Award className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No check-ins yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Visit partner locations to start earning points
              </p>
            </Card>
          ) : (
            checkIns.map((checkIn) => (
              <Card key={checkIn.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {checkIn.partner_locations?.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(checkIn.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-primary/5">
                    +{checkIn.points_awarded} pts
                  </Badge>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {showScanner && (
        <QRScanner 
          onClose={() => setShowScanner(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
