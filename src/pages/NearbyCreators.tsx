import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Navigation, Users, Eye, EyeOff, RefreshCw, MessageCircle, User, Sparkles } from "lucide-react";
import { NearbyCreatorsMap } from "@/components/nearby/NearbyCreatorsMap";
import { SessionsSection } from "@/components/sessions";
import { analytics } from "@/lib/analytics";

interface NearbyCreator {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  bio: string | null;
  location: string | null;
  professional_skills: any;
  latitude: number;
  longitude: number;
  distance_km: number;
}

const NearbyCreators = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [creators, setCreators] = useState<NearbyCreator[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(25); // km
  const [locationVisible, setLocationVisible] = useState(true);
  const [selectedCreator, setSelectedCreator] = useState<NearbyCreator | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Track page view
  useEffect(() => {
    analytics.pageView("nearby-creators");
    analytics.featureUsed("nearby_creators_opened");
  }, []);

  // Load user's location visibility preference
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('location_visible, latitude, longitude')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setLocationVisible(data.location_visible ?? true);
        if (data.latitude && data.longitude) {
          setUserLocation({ lat: data.latitude, lng: data.longitude });
        }
      }
    };
    
    loadPreferences();
  }, [user]);

  // Get user's current location
  const detectLocation = useCallback(async () => {
    setLocating(true);
    
    try {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser");
      }

      // Try with high accuracy first, fallback to low accuracy if it times out
      const getPosition = (highAccuracy: boolean, timeout: number): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: highAccuracy,
            timeout: timeout,
            maximumAge: 300000, // 5 minutes cache
          });
        });
      };

      let position: GeolocationPosition;
      try {
        // First attempt: high accuracy with 30 second timeout (mobile GPS can be slow)
        console.log('[NearbyCreators] Attempting high accuracy location...');
        position = await getPosition(true, 30000);
      } catch (firstError: any) {
        console.log('[NearbyCreators] High accuracy failed, trying low accuracy...', firstError);
        // Fallback: low accuracy with 20 second timeout
        position = await getPosition(false, 20000);
      }

      const { latitude, longitude } = position.coords;
      console.log('[NearbyCreators] Location detected:', { latitude, longitude });
      setUserLocation({ lat: latitude, lng: longitude });

      // Save to profile
      if (user) {
        console.log('[NearbyCreators] Saving location for user:', user.id);
        const { data, error: rpcError } = await supabase.rpc('update_my_location', {
          lat: latitude,
          lon: longitude,
        });
        
        if (rpcError) {
          console.error('[NearbyCreators] RPC error:', rpcError);
          toast({
            title: "Failed to save location",
            description: rpcError.message || "Could not save your location to your profile",
            variant: "destructive",
          });
          return;
        }
        
        console.log('[NearbyCreators] Location saved successfully:', data);
      } else {
        console.warn('[NearbyCreators] No user logged in, location not saved to profile');
      }

      toast({
        title: "Location updated",
        description: "Your location has been updated successfully",
      });

      analytics.featureUsed("location_detected", { latitude, longitude });
      
    } catch (error: any) {
      console.error('[NearbyCreators] Geolocation error:', error);
      
      // Provide more specific error messages
      let errorMessage = "Please enable location services to find nearby creators";
      
      if (error.code === 1) {
        errorMessage = "Location permission denied. Please allow location access in your browser settings.";
      } else if (error.code === 2) {
        errorMessage = "Location unavailable. Please check your device's location settings.";
      } else if (error.code === 3) {
        errorMessage = "Location request timed out. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Location access denied",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLocating(false);
    }
  }, [user, toast]);

  // Fetch nearby creators
  const fetchNearbyCreators = useCallback(async () => {
    if (!userLocation) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('get_nearby_creators', {
        user_lat: userLocation.lat,
        user_lon: userLocation.lng,
        radius_km: radius,
        limit_count: 50,
      });

      if (error) throw error;
      
      setCreators(data || []);
      analytics.featureUsed("nearby_creators_loaded", { count: data?.length || 0, radius });
      
    } catch (error: any) {
      console.error('Error fetching nearby creators:', error);
      toast({
        title: "Error loading creators",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userLocation, radius, toast]);

  // Fetch when location or radius changes
  useEffect(() => {
    if (userLocation) {
      fetchNearbyCreators();
    }
  }, [userLocation, radius, fetchNearbyCreators]);

  // Toggle location visibility
  const toggleVisibility = async () => {
    if (!user) return;
    
    const newValue = !locationVisible;
    setLocationVisible(newValue);
    
    await supabase
      .from('profiles')
      .update({ location_visible: newValue })
      .eq('user_id', user.id);
    
    toast({
      title: newValue ? "Location visible" : "Location hidden",
      description: newValue 
        ? "Other creators can now see you on the map" 
        : "You're now hidden from the map",
    });
    
    analytics.featureUsed("location_visibility_toggled", { visible: newValue });
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const handleMessage = async (userId: string) => {
    // Check if match exists, if not create one for messaging
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id')
      .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .single();

    if (existingMatch) {
      navigate(`/messages?match=${existingMatch.id}`);
    } else {
      // Navigate to profile to connect first
      navigate(`/profile/${userId}`);
    }
  };

  const getSkills = (skills: any): string[] => {
    if (!skills) return [];
    if (Array.isArray(skills)) {
      return skills.slice(0, 3).map((s: any) => typeof s === 'string' ? s : s.skill || s.name || '');
    }
    return [];
  };

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m away`;
    }
    return `${km.toFixed(1)}km away`;
  };

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Nearby Creators</h1>
          <p className="text-muted-foreground">
            Discover and connect with creators in your area
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
          >
            {viewMode === 'map' ? <Users className="h-4 w-4 mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
            {viewMode === 'map' ? 'List View' : 'Map View'}
          </Button>
          
          <Button
            onClick={detectLocation}
            disabled={locating}
            variant="gradient"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4 mr-2" />
            )}
            {userLocation ? 'Update Location' : 'Enable Location'}
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Radius Slider */}
            <div className="flex-1 w-full sm:w-auto">
              <Label className="text-sm font-medium mb-2 block">
                Search Radius: {radius}km
              </Label>
              <Slider
                value={[radius]}
                onValueChange={(value) => setRadius(value[0])}
                min={5}
                max={100}
                step={5}
                className="w-full sm:w-64"
              />
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center gap-3">
              <Switch
                id="location-visible"
                checked={locationVisible}
                onCheckedChange={toggleVisibility}
              />
              <Label htmlFor="location-visible" className="flex items-center gap-2 cursor-pointer">
                {locationVisible ? (
                  <>
                    <Eye className="h-4 w-4 text-primary" />
                    <span>Visible on map</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                    <span>Hidden from map</span>
                  </>
                )}
              </Label>
            </div>

            {/* Refresh */}
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchNearbyCreators}
              disabled={!userLocation || loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* No Location State */}
      {!userLocation && !loading && (
        <Card className="py-12">
          <CardContent className="text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Enable Location</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              To discover creators near you, please enable location services. 
              Your exact location is never shared—only your approximate area.
            </p>
            <Button onClick={detectLocation} disabled={locating} variant="gradient">
              {locating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              Enable Location
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {userLocation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map or List View */}
          <div className={viewMode === 'map' ? 'lg:col-span-2' : 'lg:col-span-3'}>
            {viewMode === 'map' ? (
              <NearbyCreatorsMap
                creators={creators}
                userLocation={userLocation}
                selectedCreator={selectedCreator}
                onSelectCreator={setSelectedCreator}
                loading={loading}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  <div className="col-span-full flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : creators.length === 0 ? (
                  <Card className="col-span-full py-12">
                    <CardContent className="text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No creators nearby</h3>
                      <p className="text-muted-foreground">
                        Try increasing your search radius or check back later
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  creators.map((creator) => (
                    <CreatorCard
                      key={creator.user_id}
                      creator={creator}
                      onViewProfile={handleViewProfile}
                      onMessage={handleMessage}
                      formatDistance={formatDistance}
                      getSkills={getSkills}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Creator List (Map View Sidebar) */}
          {viewMode === 'map' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{creators.length} Creators Found</h3>
              </div>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : creators.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No creators found in this area
                  </p>
                ) : (
                  creators.map((creator) => (
                    <CreatorListItem
                      key={creator.user_id}
                      creator={creator}
                      isSelected={selectedCreator?.user_id === creator.user_id}
                      onClick={() => setSelectedCreator(creator)}
                      onViewProfile={handleViewProfile}
                      formatDistance={formatDistance}
                      getSkills={getSkills}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Creative Sessions Section */}
      {userLocation && (
        <div className="mt-8">
          <SessionsSection userLocation={userLocation} />
        </div>
      )}
    </div>
  );
};

// Creator Card Component (List View)
interface CreatorCardProps {
  creator: NearbyCreator;
  onViewProfile: (userId: string) => void;
  onMessage: (userId: string) => void;
  formatDistance: (km: number) => string;
  getSkills: (skills: any) => string[];
}

const CreatorCard = ({ creator, onViewProfile, onMessage, formatDistance, getSkills }: CreatorCardProps) => {
  const skills = getSkills(creator.professional_skills);
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={creator.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {creator.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{creator.full_name}</h4>
            <p className="text-sm text-muted-foreground truncate">{creator.role}</p>
            <p className="text-xs text-primary flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {formatDistance(creator.distance_km)}
            </p>
          </div>
        </div>
        
        {creator.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {creator.bio}
          </p>
        )}
        
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {skills.map((skill, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => onViewProfile(creator.user_id)}
          >
            <User className="h-3 w-3 mr-1" />
            Profile
          </Button>
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => onMessage(creator.user_id)}
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Connect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Creator List Item (Map View Sidebar)
interface CreatorListItemProps {
  creator: NearbyCreator;
  isSelected: boolean;
  onClick: () => void;
  onViewProfile: (userId: string) => void;
  formatDistance: (km: number) => string;
  getSkills: (skills: any) => string[];
}

const CreatorListItem = ({ creator, isSelected, onClick, onViewProfile, formatDistance, getSkills }: CreatorListItemProps) => {
  const skills = getSkills(creator.professional_skills);
  
  return (
    <Card 
      className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-md'}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={creator.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {creator.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{creator.full_name}</h4>
            <p className="text-xs text-muted-foreground truncate">{creator.role}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-primary flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {formatDistance(creator.distance_km)}
              </span>
              {skills.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4">
                  {skills[0]}
                </Badge>
              )}
            </div>
          </div>
          <Button 
            size="sm" 
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(creator.user_id);
            }}
          >
            <User className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NearbyCreators;
