import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Navigation, Users, Eye, EyeOff, RefreshCw, MessageCircle, User, Plus, Calendar, Sparkles, SlidersHorizontal, ChevronDown, ChevronUp, Camera } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UnifiedNearbyMap } from "@/components/nearby/UnifiedNearbyMap";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { SessionCard } from "@/components/sessions/SessionCard";
import { SessionDetailDialog } from "@/components/sessions/SessionDetailDialog";
import { LocationPrivacySelect, LocationPrecision } from "@/components/nearby/LocationPrivacySelect";
import { ProfileVisibilityBanner } from "@/components/ProfileVisibilityBanner";
import { AddCreativeLocationDialog } from "@/components/nearby/AddCreativeLocationDialog";
import { LocationListItem, type CreativeLocation } from "@/components/nearby/LocationListItem";
import { LocationDetailDialog } from "@/components/nearby/LocationDetailDialog";
import { AtlasFilterTabs, type AtlasFilter } from "@/components/nearby/AtlasFilterTabs";
import { useLocationBookmarks } from "@/hooks/useLocationBookmarks";
import { AtlasSearchBar, defaultAtlasFilters, type AtlasSearchFilters, type SortOption } from "@/components/nearby/AtlasSearchBar";
import { SeedLocationsDialog } from "@/components/nearby/SeedLocationsDialog";
import { getDiscoveryMissingFields } from "@/lib/profileCompletion";
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
  location_precision?: 'exact' | 'approximate' | 'area_only';
}

interface NearbySession {
  id: string;
  title: string;
  description?: string;
  category: string;
  venue_name?: string;
  venue_address?: string;
  start_time: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  participant_count: number;
  max_participants: number;
  creator_name: string;
  creator_avatar?: string;
  created_by: string;
}

type MapItemType = 'creator' | 'session' | 'location';

const NearbyCreators = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [creators, setCreators] = useState<NearbyCreator[]>([]);
  const [sessions, setSessions] = useState<NearbySession[]>([]);
  const [locations, setLocations] = useState<CreativeLocation[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(25); // km
  const [locationVisible, setLocationVisible] = useState(true);
  const [locationPrecision, setLocationPrecision] = useState<LocationPrecision>('approximate');
  const [selectedItem, setSelectedItem] = useState<{ type: MapItemType; id: string } | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [selectedSession, setSelectedSession] = useState<NearbySession | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<CreativeLocation | null>(null);
  const [profileVisibility, setProfileVisibility] = useState<{
    isVisible: boolean;
    missingFields: string[];
  }>({ isVisible: true, missingFields: [] });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [atlasFilter, setAtlasFilter] = useState<AtlasFilter>('all');
  const [searchFilters, setSearchFilters] = useState<AtlasSearchFilters>(defaultAtlasFilters);
  const { bookmarkedIds, toggleBookmark } = useLocationBookmarks();

  // Check current user's profile visibility requirements
  useEffect(() => {
    const checkProfileVisibility = async () => {
      if (!user?.id) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, bio')
          .eq('user_id', user.id)
          .single();
        
        // Check for portfolio items OR credits (matching the database function)
        const [portfolioResult, creditsResult] = await Promise.all([
          supabase
            .from('portfolio_items')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('credits')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
        ]);
        
        const portfolioCount = portfolioResult.count || 0;
        const creditsCount = creditsResult.count || 0;
        const hasWork = portfolioCount > 0 || creditsCount > 0;
        
        if (profile) {
          // Use discovery fields but adjust for credits as alternative to portfolio
          const missingFields: string[] = [];
          
          if (!profile.avatar_url) {
            missingFields.push('Profile Picture');
          }
          if (!profile.bio || profile.bio.length < 20) {
            missingFields.push('Bio (20+ characters)');
          }
          if (!hasWork) {
            missingFields.push('At least 1 Portfolio Item');
          }
          
          setProfileVisibility({
            isVisible: missingFields.length === 0,
            missingFields
          });
        }
      } catch (error) {
        console.error('[NearbyCreators] Error checking profile visibility:', error);
      }
    };
    
    checkProfileVisibility();
  }, [user?.id]);

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
        .select('location_visible, location_precision, latitude, longitude')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setLocationVisible(data.location_visible ?? true);
        setLocationPrecision((data.location_precision as LocationPrecision) ?? 'approximate');
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

  // Fetch nearby creators and sessions
  const fetchNearbyData = useCallback(async () => {
    if (!userLocation) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      const [creatorsResult, sessionsResult, locationsResult] = await Promise.all([
        supabase.rpc('get_nearby_creators', {
          user_lat: userLocation.lat,
          user_lon: userLocation.lng,
          radius_km: radius,
          limit_count: 50,
        }),
        supabase.rpc('get_nearby_jams', {
          user_lat: userLocation.lat,
          user_lon: userLocation.lng,
          radius_km: radius,
          limit_count: 20,
        }),
        supabase.rpc('get_nearby_locations', {
          user_lat: userLocation.lat,
          user_lon: userLocation.lng,
          radius_km: radius,
          limit_count: 50,
        })
      ]);

      if (creatorsResult.error) throw creatorsResult.error;
      if (sessionsResult.error) throw sessionsResult.error;
      
      setCreators(creatorsResult.data || []);
      setSessions((sessionsResult.data || []) as NearbySession[]);
      setLocations((locationsResult.data || []) as CreativeLocation[]);
      
      analytics.featureUsed("nearby_data_loaded", { 
        creators: creatorsResult.data?.length || 0, 
        sessions: sessionsResult.data?.length || 0,
        locations: locationsResult.data?.length || 0,
        radius 
      });
      
    } catch (error: any) {
      console.error('Error fetching nearby data:', error);
      toast({
        title: "Error loading nearby data",
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
      fetchNearbyData();
    }
  }, [userLocation, radius, fetchNearbyData]);

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

  // Update location precision
  const handlePrecisionChange = async (newPrecision: LocationPrecision) => {
    if (!user) return;
    
    setLocationPrecision(newPrecision);
    
    await supabase
      .from('profiles')
      .update({ location_precision: newPrecision })
      .eq('user_id', user.id);
    
    const precisionLabels = {
      exact: 'Exact location',
      approximate: 'Approximate area (~1.5km)',
      area_only: 'General area (~5km)',
    };
    
    toast({
      title: "Privacy updated",
      description: `Others will see: ${precisionLabels[newPrecision]}`,
    });
    
    analytics.featureUsed("location_precision_changed", { precision: newPrecision });
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

  // Filtered data based on atlas filter + search
  const filteredCreators = useMemo(() => {
    if (atlasFilter !== 'all' && atlasFilter !== 'creators') return [];
    let result = creators;
    if (searchFilters.query) {
      const q = searchFilters.query.toLowerCase();
      result = result.filter(c => c.full_name?.toLowerCase().includes(q) || c.role?.toLowerCase().includes(q));
    }
    return result;
  }, [atlasFilter, creators, searchFilters.query]);

  const filteredSessions = useMemo(() => {
    if (atlasFilter !== 'all' && atlasFilter !== 'sessions') return [];
    let result = sessions;
    if (searchFilters.query) {
      const q = searchFilters.query.toLowerCase();
      result = result.filter(s => s.title?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q));
    }
    return result;
  }, [atlasFilter, sessions, searchFilters.query]);

  const locationTypes = ['studio', 'creative_space', 'shoot_spot', 'venue', 'music_store', 'art_supply', 'rental_house', 'photo_lab'];
  const filteredLocations = useMemo(() => {
    let result = locations;
    
    // Tab filter
    if (atlasFilter === 'bookmarked') result = result.filter(l => bookmarkedIds.has(l.id));
    else if (locationTypes.includes(atlasFilter)) result = result.filter(l => l.location_type === atlasFilter);
    else if (atlasFilter !== 'all' && atlasFilter !== 'creators' && atlasFilter !== 'sessions') return [];

    // Search query
    if (searchFilters.query) {
      const q = searchFilters.query.toLowerCase();
      result = result.filter(l => 
        l.name?.toLowerCase().includes(q) || 
        l.address?.toLowerCase().includes(q) || 
        l.city?.toLowerCase().includes(q) ||
        l.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    // Advanced filters
    if (searchFilters.minRating > 0) result = result.filter(l => (l.average_rating ?? 0) >= searchFilters.minRating);
    if (searchFilters.maxPrice !== null) result = result.filter(l => !l.price_per_hour || Number(l.price_per_hour) <= searchFilters.maxPrice!);
    if (searchFilters.rentableOnly) result = result.filter(l => l.is_rentable);
    if (searchFilters.verifiedOnly) result = result.filter(l => l.is_verified);

    // Sort
    switch (searchFilters.sortBy) {
      case 'rating': result = [...result].sort((a, b) => (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0)); break;
      case 'price_low': result = [...result].sort((a, b) => (Number(a.price_per_hour) || 999) - (Number(b.price_per_hour) || 999)); break;
      case 'price_high': result = [...result].sort((a, b) => (Number(b.price_per_hour) || 0) - (Number(a.price_per_hour) || 0)); break;
      case 'newest': result = [...result].sort((a, b) => b.distance_km - a.distance_km); break;
      default: result = [...result].sort((a, b) => a.distance_km - b.distance_km); break;
    }

    return result;
  }, [atlasFilter, locations, bookmarkedIds, searchFilters]);

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6 pb-24 md:pb-6">
      {/* Profile Visibility Banner - Show if user doesn't meet requirements */}
      <ProfileVisibilityBanner 
        isVisible={profileVisibility.isVisible} 
        missingFields={profileVisibility.missingFields} 
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Creative Atlas</h1>
          <p className="text-muted-foreground">
            Discover creators, studios, shoot spots &amp; sessions near you
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

      {/* Atlas Filter Tabs + Search */}
      {userLocation && (
        <>
          <AtlasFilterTabs
            active={atlasFilter}
            onChange={setAtlasFilter}
            counts={{
              creators: creators.length,
              sessions: sessions.length,
              studios: locations.filter(l => l.location_type === 'studio').length,
              spaces: locations.filter(l => l.location_type === 'creative_space').length,
              spots: locations.filter(l => l.location_type === 'shoot_spot').length,
              venues: locations.filter(l => l.location_type === 'venue').length,
              music_stores: locations.filter(l => l.location_type === 'music_store').length,
              art_supplies: locations.filter(l => l.location_type === 'art_supply').length,
              rental_houses: locations.filter(l => l.location_type === 'rental_house').length,
              photo_labs: locations.filter(l => l.location_type === 'photo_lab').length,
              bookmarked: locations.filter(l => bookmarkedIds.has(l.id)).length,
            }}
          />
          <AtlasSearchBar filters={searchFilters} onChange={setSearchFilters} />
        </>
      )}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="lg:hidden">
        <Card className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Filters</span>
                <Badge variant="secondary" className="text-xs">
                  {radius}km • {locationVisible ? 'Visible' : 'Hidden'}
                </Badge>
              </div>
              {filtersOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 space-y-4">
              {/* Radius Slider */}
              <div className="w-full">
                <Label className="text-sm font-medium mb-2 block">
                  Search Radius: {radius}km
                </Label>
                <Slider
                  value={[radius]}
                  onValueChange={(value) => setRadius(value[0])}
                  min={5}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center gap-3">
                <Switch
                  id="location-visible-mobile"
                  checked={locationVisible}
                  onCheckedChange={toggleVisibility}
                />
                <Label htmlFor="location-visible-mobile" className="flex items-center gap-2 cursor-pointer">
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

              {/* Location Privacy Selector */}
              {locationVisible && (
                <LocationPrivacySelect
                  value={locationPrecision}
                  onChange={handlePrecisionChange}
                />
              )}

              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchNearbyData}
                disabled={!userLocation || loading}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Results
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Controls - Always visible on desktop */}
      <Card className="hidden lg:block">
        <CardContent className="py-4">
          <div className="flex flex-row items-center gap-6">
            {/* Radius Slider */}
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block">
                Search Radius: {radius}km
              </Label>
              <Slider
                value={[radius]}
                onValueChange={(value) => setRadius(value[0])}
                min={5}
                max={100}
                step={5}
                className="w-64"
              />
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center gap-3">
              <Switch
                id="location-visible-desktop"
                checked={locationVisible}
                onCheckedChange={toggleVisibility}
              />
              <Label htmlFor="location-visible-desktop" className="flex items-center gap-2 cursor-pointer">
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

            {/* Location Privacy Selector */}
            {locationVisible && (
              <LocationPrivacySelect
                value={locationPrecision}
                onChange={handlePrecisionChange}
              />
            )}

            {/* Refresh */}
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchNearbyData}
              disabled={!userLocation || loading}
              className="shrink-0"
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
              To discover creators and sessions near you, please enable location services. 
              Your location is protected by default—others only see an approximate area, not your exact position.
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
              <UnifiedNearbyMap
                creators={filteredCreators}
                sessions={filteredSessions}
                locations={filteredLocations}
                userLocation={userLocation}
                selectedItem={selectedItem}
                onSelectCreator={(creator) => {
                  if (creator) {
                    setSelectedItem({ type: 'creator', id: creator.user_id });
                  } else {
                    setSelectedItem(null);
                  }
                }}
                onSelectSession={(session) => {
                  if (session) {
                    setSelectedItem({ type: 'session', id: session.id });
                    setSelectedSession(session);
                  } else {
                    setSelectedItem(null);
                  }
                }}
                onSelectLocation={(location) => {
                  if (location) {
                    setSelectedItem({ type: 'location', id: location.id });
                  } else {
                    setSelectedItem(null);
                  }
                }}
                loading={loading}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  <div className="col-span-full flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredCreators.length === 0 && filteredSessions.length === 0 && filteredLocations.length === 0 ? (
                  <Card className="col-span-full py-12">
                    <CardContent className="text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nothing nearby</h3>
                      <p className="text-muted-foreground mb-4">
                        Try increasing your search radius or create a session!
                      </p>
                      <Button variant="gradient" onClick={() => setShowCreateSession(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Session
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {filteredCreators.map((creator) => (
                      <CreatorCard
                        key={creator.user_id}
                        creator={creator}
                        onViewProfile={handleViewProfile}
                        onMessage={handleMessage}
                        formatDistance={formatDistance}
                        getSkills={getSkills}
                      />
                    ))}
                    {filteredSessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onJoin={fetchNearbyData}
                        onClick={() => setSelectedSession(session)}
                      />
                    ))}
                    {filteredLocations.map((loc) => (
                      <LocationListItem
                        key={loc.id}
                        location={loc}
                        isSelected={false}
                        onClick={() => setSelectedLocation(loc)}
                        formatDistance={formatDistance}
                        isBookmarked={bookmarkedIds.has(loc.id)}
                        onToggleBookmark={() => toggleBookmark(loc.id)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sidebar (Map View) */}
          {viewMode === 'map' && (
            <div className="space-y-4">
              {/* Host Session Button */}
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  variant="gradient"
                  onClick={() => setShowCreateSession(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Host Session
                </Button>
                <Button 
                  className="flex-1" 
                  variant="outline"
                  onClick={() => setShowAddLocation(true)}
                >
                  <Camera className="h-4 w-4 mr-1" />
                  Pin a Spot
                </Button>
              </div>

              {/* Creators Section */}
              {filteredCreators.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-primary/60" />
                  <h3 className="font-semibold text-sm">{filteredCreators.length} Creators</h3>
                </div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : (
                    filteredCreators.slice(0, 10).map((creator) => (
                      <CreatorListItem
                        key={creator.user_id}
                        creator={creator}
                        isSelected={selectedItem?.type === 'creator' && selectedItem?.id === creator.user_id}
                        onClick={() => setSelectedItem({ type: 'creator', id: creator.user_id })}
                        onViewProfile={handleViewProfile}
                        formatDistance={formatDistance}
                        getSkills={getSkills}
                      />
                    ))
                  )}
                </div>
              </div>
              )}

              {/* Sessions Section */}
              {(atlasFilter === 'all' || atlasFilter === 'sessions') && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  <h3 className="font-semibold text-sm">{filteredSessions.length} Sessions</h3>
                </div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : filteredSessions.length === 0 ? (
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground text-center mb-2">
                        No sessions nearby
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full text-xs"
                        onClick={() => setShowCreateSession(true)}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Be the first to host
                      </Button>
                    </Card>
                  ) : (
                    filteredSessions.map((session) => (
                      <SessionListItem
                        key={session.id}
                        session={session}
                        isSelected={selectedItem?.type === 'session' && selectedItem?.id === session.id}
                        onClick={() => {
                          setSelectedItem({ type: 'session', id: session.id });
                          setSelectedSession(session);
                        }}
                        formatDistance={formatDistance}
                      />
                    ))
                  )}
                </div>
              </div>
              )}

              {/* Locations Section */}
              {filteredLocations.length > 0 || atlasFilter !== 'creators' && atlasFilter !== 'sessions' ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">📍</span>
                  <h3 className="font-semibold text-sm">{filteredLocations.length} Spots</h3>
                </div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {filteredLocations.length === 0 ? (
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground text-center mb-2">
                        No creative spots pinned nearby
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full text-xs"
                        onClick={() => setShowAddLocation(true)}
                      >
                        <Camera className="h-3 w-3 mr-1" />
                        Pin the first spot
                      </Button>
                    </Card>
                  ) : (
                    filteredLocations.slice(0, 10).map((loc) => (
                      <LocationListItem
                        key={loc.id}
                        location={loc}
                        isSelected={selectedItem?.type === 'location' && selectedItem?.id === loc.id}
                        onClick={() => { setSelectedItem({ type: 'location', id: loc.id }); setSelectedLocation(loc); }}
                        formatDistance={formatDistance}
                        isBookmarked={bookmarkedIds.has(loc.id)}
                        onToggleBookmark={() => toggleBookmark(loc.id)}
                      />
                    ))
                  )}
                </div>
              </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Create Session Dialog */}
      <CreateSessionDialog
        open={showCreateSession}
        onOpenChange={setShowCreateSession}
        onCreated={fetchNearbyData}
        defaultLocation={userLocation || undefined}
      />

      {/* Add Creative Location Dialog */}
      <AddCreativeLocationDialog
        open={showAddLocation}
        onOpenChange={setShowAddLocation}
        onCreated={fetchNearbyData}
        defaultLocation={userLocation || undefined}
      />

      {/* Session Detail Dialog */}
      <SessionDetailDialog
        session={selectedSession}
        open={!!selectedSession}
        onOpenChange={(open) => {
          if (!open) setSelectedSession(null);
        }}
        onRefresh={fetchNearbyData}
      />

      {/* Location Detail Dialog */}
      <LocationDetailDialog
        location={selectedLocation}
        open={!!selectedLocation}
        onOpenChange={(open) => {
          if (!open) setSelectedLocation(null);
        }}
        isBookmarked={selectedLocation ? bookmarkedIds.has(selectedLocation.id) : false}
        onToggleBookmark={selectedLocation ? () => toggleBookmark(selectedLocation.id) : undefined}
      />
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

// Session List Item (Map View Sidebar)
interface SessionListItemProps {
  session: NearbySession;
  isSelected: boolean;
  onClick: () => void;
  formatDistance: (km: number) => string;
}

const SessionListItem = ({ session, isSelected, onClick, formatDistance }: SessionListItemProps) => {
  const startTime = new Date(session.start_time);
  const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = startTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
  
  return (
    <Card 
      className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-amber-500 shadow-md' : 'hover:shadow-md'}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-dashed border-amber-500">
              <AvatarImage src={session.creator_avatar || undefined} />
              <AvatarFallback className="bg-amber-500/10 text-amber-600 text-sm">
                🎯
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center">
              {session.participant_count}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{session.title}</h4>
            <p className="text-xs text-muted-foreground truncate">{session.category}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {dateStr} {timeStr}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NearbyCreators;
