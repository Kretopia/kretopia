import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, MapPin, Award, TrendingUp, Crown, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { MembershipMap } from "@/components/membership/MembershipMap";
import { LocationCard } from "@/components/membership/LocationCard";
import { QRScanner } from "@/components/membership/QRScanner";
import { TierComparison } from "@/components/membership/TierComparison";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Membership() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile error:", profileError);
        setError("Failed to load profile");
      } else {
        setProfile(profileData);
      }

      // Fetch locations based on subscription tier
      const userTier = profileData?.subscription_tier || "free";
      
      const { data: locationsData, error: locationsError } = await supabase
        .from("partner_locations")
        .select("*")
        .in("tier_required", getTierAccess(userTier))
        .eq("is_active", true)
        .order("name");

      if (locationsError) {
        console.error("Locations error:", locationsError);
      } else {
        setLocations(locationsData || []);
      }

      // Fetch user's check-ins
      const { data: checkInsData, error: checkInsError } = await supabase
        .from("user_check_ins")
        .select(`
          *,
          partner_locations (*)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (checkInsError) {
        console.error("Check-ins error:", checkInsError);
      } else {
        setCheckIns(checkInsData || []);
      }
    } catch (error: any) {
      console.error("Membership: Unexpected error:", error);
      setError(error.message || "An unexpected error occurred");
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading membership...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="container mx-auto px-4 py-6 pb-24">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-bold mb-2">Unable to Load Membership</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </Card>
      </div>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "creator_pro":
        return "from-yellow-500/20 via-yellow-400/10 to-amber-500/20";
      case "thriver":
        return "from-blue-500/20 via-blue-400/10 to-indigo-500/20";
      default:
        return "from-gray-500/20 via-gray-400/10 to-slate-500/20";
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case "creator_pro":
        return "Creator Pro";
      case "thriver":
        return "Thriver";
      default:
        return "Free";
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      {/* Premium Membership Card - Emirates Skywards Style */}
      <Card className={`mb-6 overflow-hidden bg-gradient-to-br ${getTierColor(profile?.subscription_tier || "free")} border-2`}>
        <div className="p-6 relative">
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 opacity-5">
            <Star className="h-40 w-40" />
          </div>
          
          {/* Header with Avatar and Badge */}
          <div className="flex items-start justify-between mb-6 relative z-10">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                <AvatarFallback className="text-2xl font-bold bg-primary/10">
                  {profile?.full_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold mb-1">{profile?.full_name}</h1>
                <Badge variant="outline" className="capitalize bg-background/80 backdrop-blur-sm">
                  <Crown className="h-3 w-3 mr-1" />
                  {getTierLabel(profile?.subscription_tier || "free")}
                </Badge>
              </div>
            </div>
            <Badge className="text-sm px-3 py-2 uppercase tracking-wider font-bold bg-background/80 backdrop-blur-sm">
              {profile?.badge === "founder" ? "👑 Founder" : profile?.badge || "Beta"}
            </Badge>
          </div>

          {/* Membership Number */}
          {profile?.membership_number && (
            <div className="mb-6 p-3 bg-background/40 backdrop-blur-sm rounded-lg border border-background/20">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Member Number</p>
              <p className="text-xl font-mono font-bold tracking-wider">{profile.membership_number}</p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-background/40 backdrop-blur-sm rounded-lg border border-background/20">
              <div className="text-2xl font-bold text-primary mb-1">
                {profile?.xp || 0}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Points</div>
            </div>
            <div className="text-center p-3 bg-background/40 backdrop-blur-sm rounded-lg border border-background/20">
              <div className="text-2xl font-bold text-primary mb-1">
                Level {profile?.level || 1}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Status</div>
            </div>
            <div className="text-center p-3 bg-background/40 backdrop-blur-sm rounded-lg border border-background/20">
              <div className="text-2xl font-bold text-primary mb-1">
                {checkIns.length}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Check-ins</div>
            </div>
          </div>

          {/* QR Scan Button */}
          <Button 
            onClick={() => setShowScanner(true)} 
            className="w-full shadow-lg"
            size="lg"
          >
            <QrCode className="mr-2 h-5 w-5" />
            Scan QR to Check In
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="benefits" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="benefits">
            <Crown className="mr-2 h-4 w-4" />
            Benefits
          </TabsTrigger>
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

        <TabsContent value="benefits" className="mt-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Membership Tiers</h2>
              <p className="text-muted-foreground">
                Compare features and upgrade to unlock more capabilities
              </p>
            </div>
            <Button onClick={() => navigate('/partner-discounts')} variant="outline">
              View Partner Discounts
            </Button>
          </div>
          <TierComparison currentTier={profile?.subscription_tier || "free"} />
        </TabsContent>

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
