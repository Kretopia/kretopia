import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation, Users, Plus, Sparkles, List, Map } from "lucide-react";
import { UnifiedNearbyMap } from "@/components/nearby/UnifiedNearbyMap";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { SessionCard } from "@/components/sessions/SessionCard";
import { SessionDetailDialog } from "@/components/sessions/SessionDetailDialog";
import { type LocationPrecision } from "@/components/nearby/LocationPrivacySelect";
import { ProfileVisibilityBanner } from "@/components/ProfileVisibilityBanner";
import { AddCreativeLocationDialog } from "@/components/nearby/AddCreativeLocationDialog";
import { LocationListItem, type CreativeLocation } from "@/components/nearby/LocationListItem";
import { LocationDetailDialog } from "@/components/nearby/LocationDetailDialog";
import { AtlasFilterTabs, type AtlasFilter } from "@/components/nearby/AtlasFilterTabs";
import { useLocationBookmarks } from "@/hooks/useLocationBookmarks";
import { AtlasSearchBar, defaultAtlasFilters, type AtlasSearchFilters } from "@/components/nearby/AtlasSearchBar";
import { SeedLocationsDialog } from "@/components/nearby/SeedLocationsDialog";
import { analytics } from "@/lib/analytics";
import Events from "@/pages/Events";

import { NearbyCreator, CreatorCard, formatDistance, getSkills } from "@/components/nearby/NearbyCreatorCard";
import { NearbySession, SessionListItem } from "@/components/nearby/NearbySessionListItem";
import { NearbyControls } from "@/components/nearby/NearbyControls";
import { NearbySidebar } from "@/components/nearby/NearbySidebar";

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
  const [radius, setRadius] = useState(25);
  const [locationVisible, setLocationVisible] = useState(true);
  const [locationPrecision, setLocationPrecision] = useState<LocationPrecision>('approximate');
  const [selectedItem, setSelectedItem] = useState<{ type: MapItemType; id: string } | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [selectedSession, setSelectedSession] = useState<NearbySession | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<CreativeLocation | null>(null);
  const [showSeedDialog, setShowSeedDialog] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [atlasFilter, setAtlasFilter] = useState<AtlasFilter>('all');
  const [searchFilters, setSearchFilters] = useState<AtlasSearchFilters>(defaultAtlasFilters);
  const { bookmarkedIds, toggleBookmark } = useLocationBookmarks();

  useEffect(() => {
    analytics.pageView("nearby-creators");
    analytics.featureUsed("nearby_creators_opened");
  }, []);

  // Load preferences
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from('profiles').select('location_visible, location_precision, latitude, longitude').eq('user_id', user.id).single();
      if (data) {
        setLocationVisible(data.location_visible ?? true);
        setLocationPrecision((data.location_precision as LocationPrecision) ?? 'approximate');
        if (data.latitude && data.longitude) setUserLocation({ lat: data.latitude, lng: data.longitude });
      }
    };
    load();
  }, [user]);

  const detectLocation = useCallback(async () => {
    setLocating(true);
    try {
      if (!navigator.geolocation) throw new Error("Geolocation not supported");
      const getPos = (highAcc: boolean, timeout: number): Promise<GeolocationPosition> =>
        new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: highAcc, timeout, maximumAge: 300000 }));
      
      let position: GeolocationPosition;
      try { position = await getPos(true, 30000); } catch { position = await getPos(false, 20000); }
      
      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      
      if (user) {
        const { error } = await supabase.rpc('update_my_location', { lat: latitude, lon: longitude });
        if (error) { toast({ title: "Failed to save location", description: error.message, variant: "destructive" }); return; }
      }
      toast({ title: "Location updated", description: "Your location has been updated successfully" });
      analytics.featureUsed("location_detected", { latitude, longitude });
    } catch (error: any) {
      let msg = "Please enable location services to find nearby creators";
      if (error.code === 1) msg = "Location permission denied. Please allow location access in your browser settings.";
      else if (error.code === 2) msg = "Location unavailable. Please check your device's location settings.";
      else if (error.code === 3) msg = "Location request timed out. Please try again.";
      toast({ title: "Location access denied", description: msg, variant: "destructive" });
    } finally { setLocating(false); }
  }, [user, toast]);

  const fetchNearbyData = useCallback(async () => {
    if (!userLocation) { setLoading(false); return; }
    setLoading(true);
    try {
      const [cr, sr, lr] = await Promise.all([
        supabase.rpc('get_nearby_creators', { user_lat: userLocation.lat, user_lon: userLocation.lng, radius_km: radius, limit_count: 50 }),
        supabase.rpc('get_nearby_jams', { user_lat: userLocation.lat, user_lon: userLocation.lng, radius_km: radius, limit_count: 20 }),
        supabase.rpc('get_nearby_locations', { user_lat: userLocation.lat, user_lon: userLocation.lng, radius_km: radius, limit_count: 50 }),
      ]);
      if (cr.error) throw cr.error;
      if (sr.error) throw sr.error;
      setCreators(cr.data || []);
      setSessions((sr.data || []) as NearbySession[]);
      setLocations((lr.data || []) as CreativeLocation[]);
      analytics.featureUsed("nearby_data_loaded", { creators: cr.data?.length || 0, sessions: sr.data?.length || 0, locations: lr.data?.length || 0, radius });
    } catch (error: any) {
      toast({ title: "Error loading nearby data", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [userLocation, radius, toast]);

  useEffect(() => { if (userLocation) fetchNearbyData(); }, [userLocation, radius, fetchNearbyData]);

  const toggleVisibility = async () => {
    if (!user) return;
    const newVal = !locationVisible;
    setLocationVisible(newVal);
    await supabase.from('profiles').update({ location_visible: newVal }).eq('user_id', user.id);
    toast({ title: newVal ? "Location visible" : "Location hidden", description: newVal ? "Other creators can now see you on the map" : "You're now hidden from the map" });
  };

  const handlePrecisionChange = async (p: LocationPrecision) => {
    if (!user) return;
    setLocationPrecision(p);
    await supabase.from('profiles').update({ location_precision: p }).eq('user_id', user.id);
    const labels = { exact: 'Exact location', approximate: 'Approximate area (~1.5km)', area_only: 'General area (~5km)' };
    toast({ title: "Privacy updated", description: `Others will see: ${labels[p]}` });
  };

  const handleViewProfile = (userId: string) => navigate(`/profile/${userId}`);
  const handleMessage = async (userId: string) => {
    const { data } = await supabase.from('matches').select('id')
      .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`).single();
    navigate(data ? `/messages?match=${data.id}` : `/profile/${userId}`);
  };

  const locationTypes = ['studio', 'creative_space', 'shoot_spot', 'venue', 'music_store', 'art_supply', 'rental_house', 'photo_lab'];
  
  const filteredCreators = useMemo(() => {
    if (atlasFilter !== 'all' && atlasFilter !== 'creators') return [];
    let r = creators;
    if (searchFilters.query) { const q = searchFilters.query.toLowerCase(); r = r.filter(c => c.full_name?.toLowerCase().includes(q) || c.role?.toLowerCase().includes(q)); }
    return r;
  }, [atlasFilter, creators, searchFilters.query]);

  const filteredSessions = useMemo(() => {
    if (atlasFilter !== 'all' && atlasFilter !== 'sessions') return [];
    let r = sessions;
    if (searchFilters.query) { const q = searchFilters.query.toLowerCase(); r = r.filter(s => s.title?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q)); }
    return r;
  }, [atlasFilter, sessions, searchFilters.query]);

  const filteredLocations = useMemo(() => {
    let r = locations;
    if (atlasFilter === 'bookmarked') r = r.filter(l => bookmarkedIds.has(l.id));
    else if (locationTypes.includes(atlasFilter)) r = r.filter(l => l.location_type === atlasFilter);
    else if (atlasFilter !== 'all' && atlasFilter !== 'creators' && atlasFilter !== 'sessions') return [];
    if (searchFilters.query) { const q = searchFilters.query.toLowerCase(); r = r.filter(l => l.name?.toLowerCase().includes(q) || l.address?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q) || l.tags?.some(t => t.toLowerCase().includes(q))); }
    if (searchFilters.minRating > 0) r = r.filter(l => (l.average_rating ?? 0) >= searchFilters.minRating);
    if (searchFilters.maxPrice !== null) r = r.filter(l => !l.price_per_hour || Number(l.price_per_hour) <= searchFilters.maxPrice!);
    if (searchFilters.rentableOnly) r = r.filter(l => l.is_rentable);
    if (searchFilters.verifiedOnly) r = r.filter(l => l.is_verified);
    switch (searchFilters.sortBy) {
      case 'rating': r = [...r].sort((a, b) => (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0)); break;
      case 'price_low': r = [...r].sort((a, b) => (Number(a.price_per_hour) || 999) - (Number(b.price_per_hour) || 999)); break;
      case 'price_high': r = [...r].sort((a, b) => (Number(b.price_per_hour) || 0) - (Number(a.price_per_hour) || 0)); break;
      case 'newest': r = [...r].sort((a, b) => b.distance_km - a.distance_km); break;
      default: r = [...r].sort((a, b) => a.distance_km - b.distance_km); break;
    }
    return r;
  }, [atlasFilter, locations, bookmarkedIds, searchFilters]);

  const totalResults = filteredCreators.length + filteredSessions.length + filteredLocations.length;

  return (
    <div className="min-h-screen pb-24 md:pb-6">
      {/* Sticky header bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b">
        <div className="px-3 py-2.5 sm:px-4">
          {/* Row 1: Title + actions */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">Nearby</h1>
              {userLocation && (
                <p className="text-[11px] text-muted-foreground">
                  {totalResults} result{totalResults !== 1 ? 's' : ''} within {radius}km
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {userLocation && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
                >
                  {viewMode === 'map' ? <List className="h-4 w-4" /> : <Map className="h-4 w-4" />}
                </Button>
              )}
              <Button
                onClick={detectLocation}
                disabled={locating}
                variant="gradient"
                size="sm"
                className="h-8 text-xs px-3"
              >
                {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                <span className="ml-1.5 hidden xs:inline">{userLocation ? 'Update' : 'Enable'}</span>
              </Button>
            </div>
          </div>

          {/* Row 2: Scrollable filter tabs */}
          {userLocation && (
            <div className="overflow-x-auto -mx-3 px-3 scrollbar-hide">
              <AtlasFilterTabs active={atlasFilter} onChange={setAtlasFilter} counts={{
                creators: creators.length, sessions: sessions.length,
                studios: locations.filter(l => l.location_type === 'studio').length,
                spaces: locations.filter(l => l.location_type === 'creative_space').length,
                spots: locations.filter(l => l.location_type === 'shoot_spot').length,
                venues: locations.filter(l => l.location_type === 'venue').length,
                music_stores: locations.filter(l => l.location_type === 'music_store').length,
                art_supplies: locations.filter(l => l.location_type === 'art_supply').length,
                rental_houses: locations.filter(l => l.location_type === 'rental_house').length,
                photo_labs: locations.filter(l => l.location_type === 'photo_lab').length,
                bookmarked: locations.filter(l => bookmarkedIds.has(l.id)).length,
              }} />
            </div>
          )}
        </div>

        {/* Row 3: Search + filters (compact) */}
        {userLocation && (
          <div className="px-3 pb-2.5 sm:px-4">
            <AtlasSearchBar filters={searchFilters} onChange={setSearchFilters} />
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="px-3 sm:px-4 py-3 space-y-3 max-w-7xl mx-auto">
        <ProfileVisibilityBanner isVisible={true} missingFields={[]} />

        {/* Controls (radius, visibility) */}
        {userLocation && (
          <NearbyControls
            radius={radius} onRadiusChange={setRadius}
            locationVisible={locationVisible} onToggleVisibility={toggleVisibility}
            locationPrecision={locationPrecision} onPrecisionChange={handlePrecisionChange}
            onRefresh={fetchNearbyData} loading={loading} hasLocation={!!userLocation}
            filtersOpen={filtersOpen} onFiltersOpenChange={setFiltersOpen}
          />
        )}

        {/* No Location State */}
        {!userLocation && !loading && (
          <Card className="mt-8">
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Enable Location</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                Allow location access to discover creators, studios, and sessions near you.
              </p>
              <Button onClick={detectLocation} disabled={locating} variant="gradient" size="lg">
                {locating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Navigation className="h-4 w-4 mr-2" />}
                Enable Location
              </Button>
            </CardContent>
          </Card>
        )}

        {/* AI Discovery CTA — compact inline */}
        {userLocation && (
          <button
            onClick={() => setShowSeedDialog(true)}
            className="w-full flex items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-3 hover:from-primary/10 hover:to-accent/10 transition-colors text-left"
          >
            <div className="shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">AI Spot Discovery</p>
              <p className="text-[10px] text-muted-foreground truncate">Find studios & creative spaces near you</p>
            </div>
            <span className="text-xs text-primary font-medium shrink-0">Search →</span>
          </button>
        )}

        {/* Main Content */}
        {userLocation && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className={viewMode === 'map' ? 'lg:col-span-2' : 'lg:col-span-3'}>
              {viewMode === 'map' ? (
                <div className="rounded-xl overflow-hidden border h-[50vh] sm:h-[60vh]">
                  <UnifiedNearbyMap
                    creators={filteredCreators} sessions={filteredSessions} locations={filteredLocations}
                    userLocation={userLocation} selectedItem={selectedItem}
                    onSelectCreator={(c) => setSelectedItem(c ? { type: 'creator', id: c.user_id } : null)}
                    onSelectSession={(s) => { if (s) { setSelectedItem({ type: 'session', id: s.id }); setSelectedSession(s); } else setSelectedItem(null); }}
                    onSelectLocation={(l) => setSelectedItem(l ? { type: 'location', id: l.id } : null)}
                    loading={loading}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : totalResults === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nothing nearby</h3>
                        <p className="text-sm text-muted-foreground mb-4">Try increasing your search radius or create a session!</p>
                        <Button variant="gradient" onClick={() => setShowCreateSession(true)}><Plus className="h-4 w-4 mr-2" />Create Session</Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {filteredCreators.map((c) => <CreatorCard key={c.user_id} creator={c} onViewProfile={handleViewProfile} onMessage={handleMessage} />)}
                      {filteredSessions.map((s) => <SessionCard key={s.id} session={s} onJoin={fetchNearbyData} onClick={() => setSelectedSession(s)} />)}
                      {filteredLocations.map((loc) => (
                        <LocationListItem key={loc.id} location={loc} isSelected={false} onClick={() => setSelectedLocation(loc)}
                          formatDistance={formatDistance} isBookmarked={bookmarkedIds.has(loc.id)} onToggleBookmark={() => toggleBookmark(loc.id)} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {viewMode === 'map' && (
              <NearbySidebar
                creators={filteredCreators} sessions={filteredSessions} locations={filteredLocations}
                atlasFilter={atlasFilter} loading={loading} selectedItem={selectedItem}
                onSelectCreator={(id) => setSelectedItem({ type: 'creator', id })}
                onSelectSession={(s) => { setSelectedItem({ type: 'session', id: s.id }); setSelectedSession(s); }}
                onSelectLocation={(loc) => { setSelectedItem({ type: 'location', id: loc.id }); setSelectedLocation(loc); }}
                onViewProfile={handleViewProfile}
                onCreateSession={() => setShowCreateSession(true)}
                onAddLocation={() => setShowAddLocation(true)}
                onSeedLocations={() => setShowSeedDialog(true)}
                onRefresh={fetchNearbyData}
                bookmarkedIds={bookmarkedIds} onToggleBookmark={toggleBookmark}
              />
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateSessionDialog open={showCreateSession} onOpenChange={setShowCreateSession} onCreated={fetchNearbyData} defaultLocation={userLocation || undefined} />
      <AddCreativeLocationDialog open={showAddLocation} onOpenChange={setShowAddLocation} onCreated={fetchNearbyData} defaultLocation={userLocation || undefined} />
      {userLocation && <SeedLocationsDialog open={showSeedDialog} onOpenChange={setShowSeedDialog} userLocation={userLocation} onSeeded={fetchNearbyData} />}
      <SessionDetailDialog session={selectedSession} open={!!selectedSession} onOpenChange={(open) => { if (!open) setSelectedSession(null); }} onRefresh={fetchNearbyData} />
      <LocationDetailDialog location={selectedLocation} open={!!selectedLocation} onOpenChange={(open) => { if (!open) setSelectedLocation(null); }}
        isBookmarked={selectedLocation ? bookmarkedIds.has(selectedLocation.id) : false} onToggleBookmark={selectedLocation ? () => toggleBookmark(selectedLocation.id) : undefined} />
    </div>
  );
};

export default NearbyCreators;
