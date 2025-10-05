import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Crown, Star, ArrowLeft, Gift, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { MembershipMap } from "@/components/membership/MembershipMap";
import { LocationCard } from "@/components/membership/LocationCard";
import { TierProgressCard } from "@/components/membership/TierProgressCard";
import { TierBenefitsComparison } from "@/components/membership/TierBenefitsComparison";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOGPromotion } from "@/hooks/useOGPromotion";
import { getTierByPoints } from "@/lib/tierSystem";
import { PartnerCard } from "@/components/membership/PartnerCard";

export default function Membership() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Activate OG/Founder promotion automatically
  useOGPromotion();

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

      // Fetch partner discounts
      const { data: discountsData, error: discountsError } = await supabase
        .from("partner_discounts")
        .select("*")
        .eq("is_active", true)
        .order("partner_name");

      if (discountsError) {
        console.error("Discounts error:", discountsError);
      } else {
        setPartners(discountsData || []);
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
      case "creator_pro":
        return ["free", "thriver", "creator_pro"];
      case "thriver":
        return ["free", "thriver"];
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
        return "Creator";
      case "thriver":
        return "Rising Star";
      default:
        return "Spark";
    }
  };

  const currentTierData = getTierByPoints(profile?.xp || 0);

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate("/dashboard")}
        className="gap-2 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {/* Tier Progress Card */}
      <div className="mb-6">
        <TierProgressCard currentPoints={profile?.xp || 0} />
      </div>

      {/* Premium Membership Card - Emirates Skywards Style */}
      <Card className={`mb-6 overflow-hidden bg-gradient-to-br ${currentTierData.gradient} border-2`}>
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
                <Badge variant="outline" className="capitalize bg-background/80 backdrop-blur-sm text-foreground">
                  <span className="mr-1">{currentTierData.icon}</span>
                  {currentTierData.displayName}
                </Badge>
              </div>
            </div>
            <Badge className="text-sm px-3 py-2 uppercase tracking-wider font-bold bg-background/80 backdrop-blur-sm text-foreground">
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
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-background/40 backdrop-blur-sm rounded-lg border border-background/20">
              <div className="text-3xl font-bold text-primary mb-1">
                {profile?.xp || 0}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Points</div>
            </div>
            <div className="text-center p-4 bg-background/40 backdrop-blur-sm rounded-lg border border-background/20">
              <div className="text-3xl font-bold text-primary mb-1">
                Level {profile?.level || 1}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Current Level</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="benefits" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="benefits">
            <Crown className="mr-2 h-4 w-4" />
            Benefits
          </TabsTrigger>
          <TabsTrigger value="partners">
            <Gift className="mr-2 h-4 w-4" />
            Partners
          </TabsTrigger>
          <TabsTrigger value="locations">
            <MapPin className="mr-2 h-4 w-4" />
            Locations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="benefits" className="mt-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Membership Tiers</h2>
            <p className="text-muted-foreground">
              Earn points to unlock exclusive features and premium partner benefits
            </p>
          </div>
          <TierBenefitsComparison currentPoints={profile?.xp || 0} />
        </TabsContent>

        <TabsContent value="partners" className="mt-6">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Partner Discounts</h2>
              <p className="text-muted-foreground">
                Exclusive offers and discounts from our partners
              </p>
            </div>
          </div>
          
          {partners.length === 0 ? (
            <Card className="p-12 text-center">
              <Percent className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Partner Discounts Yet</h3>
              <p className="text-muted-foreground">
                Check back soon for exclusive member discounts
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {partners.map((partner) => (
                <PartnerCard
                  key={partner.id}
                  id={partner.id}
                  name={partner.partner_name}
                  type={partner.category}
                  description={partner.description}
                  discountValue={partner.discount_value}
                  discountType={partner.discount_type}
                  redemptionCode={partner.redemption_code}
                  redemptionUrl={partner.redemption_url}
                  logoUrl={partner.partner_logo_url}
                  tierRequired={partner.tier_required}
                  userTier={profile?.subscription_tier || "free"}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="locations" className="mt-6">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Partner Locations</h2>
              <p className="text-muted-foreground">
                Find partner locations near you
              </p>
            </div>
          </div>

          {locations.length === 0 ? (
            <Card className="p-12 text-center">
              <MapPin className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Locations Yet</h3>
              <p className="text-muted-foreground">
                Partner locations will appear here soon
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <MembershipMap locations={locations} />
              <div className="grid gap-4 md:grid-cols-2 mt-6">
                {locations.map((location) => (
                  <LocationCard 
                    key={location.id} 
                    location={location}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
