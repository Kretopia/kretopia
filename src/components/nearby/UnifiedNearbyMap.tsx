import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { CreativeLocation } from "./LocationListItem";
import { fuzzyCoordinates } from "@/lib/fuzzyLocation";

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

export type MapItemType = 'creator' | 'session' | 'location';

interface UnifiedNearbyMapProps {
  creators: NearbyCreator[];
  sessions: NearbySession[];
  locations: CreativeLocation[];
  userLocation: { lat: number; lng: number };
  selectedItem: { type: MapItemType; id: string } | null;
  onSelectCreator: (creator: NearbyCreator | null) => void;
  onSelectSession: (session: NearbySession | null) => void;
  onSelectLocation: (location: CreativeLocation | null) => void;
  loading?: boolean;
}

const LOCATION_TYPE_EMOJI: Record<string, string> = {
  studio: '🎙',
  creative_space: '',
  shoot_spot: '',
  venue: '',
  music_store: '',
  art_supply: '🛒',
  rental_house: '',
  photo_lab: '📷',
};

const LOCATION_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  studio: { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-600' },
  creative_space: { bg: 'bg-emerald-500/10', border: 'border-emerald-500', text: 'text-emerald-600' },
  shoot_spot: { bg: 'bg-rose-500/10', border: 'border-rose-500', text: 'text-rose-600' },
  venue: { bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'text-blue-600' },
  music_store: { bg: 'bg-violet-500/10', border: 'border-violet-500', text: 'text-violet-600' },
  art_supply: { bg: 'bg-orange-500/10', border: 'border-orange-500', text: 'text-orange-600' },
  rental_house: { bg: 'bg-teal-500/10', border: 'border-teal-500', text: 'text-teal-600' },
  photo_lab: { bg: 'bg-pink-500/10', border: 'border-pink-500', text: 'text-pink-600' },
};

export const UnifiedNearbyMap = ({
  creators,
  sessions,
  locations,
  userLocation,
  selectedItem,
  onSelectCreator,
  onSelectSession,
  onSelectLocation,
  loading,
}: UnifiedNearbyMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const creatorMarkers = useRef<mapboxgl.Marker[]>([]);
  const sessionMarkers = useRef<mapboxgl.Marker[]>([]);
  const locationMarkers = useRef<mapboxgl.Marker[]>([]);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const mapboxToken = "pk.eyJ1IjoiZXRoYW5hdWd1c3RlIiwiYSI6ImNtZzhvbDk0dzAwaHYycnB6eWp4Zjh2OHAifQ.4uCSa5SdtxZAnC2Xvx6V5w";

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    mapboxgl.accessToken = mapboxToken;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [userLocation.lng, userLocation.lat],
      zoom: 11,
    });
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.on('load', () => setMapLoaded(true));

    const userEl = document.createElement("div");
    userEl.className = "user-location-marker";
    userEl.innerHTML = `
      <div class="relative">
        <div class="absolute -inset-2 rounded-full bg-primary/30 animate-ping"></div>
        <div class="relative h-4 w-4 rounded-full bg-primary border-2 border-white shadow-lg"></div>
      </div>
    `;
    userMarker.current = new mapboxgl.Marker(userEl)
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map.current);

    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (userMarker.current && userLocation) {
      userMarker.current.setLngLat([userLocation.lng, userLocation.lat]);
      map.current?.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 11 });
    }
  }, [userLocation]);

  // Creator markers with fuzzy location
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    creatorMarkers.current.forEach((m) => m.remove());
    creatorMarkers.current = [];

    creators.forEach((creator) => {
      const fuzzy = fuzzyCoordinates(creator.latitude, creator.longitude, creator.user_id, creator.location_precision || 'approximate');
      
      const el = document.createElement("div");
      el.className = "creator-marker cursor-pointer";
      const isSelected = selectedItem?.type === 'creator' && selectedItem?.id === creator.user_id;
      el.innerHTML = `
        <div class="relative transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'}">
          <div class="absolute -inset-1 rounded-full ${isSelected ? 'bg-cyan-400/40 animate-pulse' : 'bg-cyan-500/20'}"></div>
          <div class="relative h-10 w-10 rounded-full overflow-hidden border-2 ${isSelected ? 'border-cyan-400 shadow-lg shadow-cyan-400/30' : 'border-cyan-500'} bg-background">
            ${creator.avatar_url 
              ? `<img src="${creator.avatar_url}" alt="${creator.full_name}" class="h-full w-full object-cover" />`
              : `<div class="h-full w-full flex items-center justify-center bg-cyan-500/10 text-cyan-500 font-semibold">${creator.full_name?.charAt(0) || 'U'}</div>`
            }
          </div>
        </div>
      `;
      el.addEventListener("click", () => { onSelectCreator(creator); onSelectSession(null); onSelectLocation(null); });

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-2 min-w-[150px]">
          <div class="flex items-center gap-1 mb-1">
            <span class="w-2 h-2 rounded-full bg-cyan-500"></span>
            <span class="text-[10px] uppercase tracking-wide text-cyan-600 font-medium">Creator</span>
          </div>
          <p class="font-semibold text-sm">${creator.full_name}</p>
          <p class="text-xs text-gray-500">${creator.role}</p>
          <p class="text-xs text-cyan-600 mt-1">~${creator.distance_km < 1 ? `${Math.round(creator.distance_km * 1000)}m` : `${creator.distance_km.toFixed(1)}km`} away</p>
          <p class="text-[9px] text-gray-400 mt-0.5 italic">Approximate location</p>
        </div>
      `);

      const marker = new mapboxgl.Marker(el).setLngLat([fuzzy.lng, fuzzy.lat]).setPopup(popup).addTo(map.current!);
      creatorMarkers.current.push(marker);
    });
  }, [creators, selectedItem, mapLoaded, onSelectCreator, onSelectSession, onSelectLocation]);

  // Session markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    sessionMarkers.current.forEach((m) => m.remove());
    sessionMarkers.current = [];

    sessions.forEach((session) => {
      const el = document.createElement("div");
      el.className = "session-marker cursor-pointer";
      const isSelected = selectedItem?.type === 'session' && selectedItem?.id === session.id;
      const startTime = new Date(session.start_time);
      const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = startTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      el.innerHTML = `
        <div class="relative transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'}">
          <div class="absolute -inset-1.5 rounded-full ${isSelected ? 'bg-amber-400/40 animate-pulse' : 'bg-amber-500/20'}"></div>
          <div class="relative h-10 w-10 rounded-full overflow-hidden border-[3px] border-dashed ${isSelected ? 'border-amber-400 shadow-lg shadow-amber-400/30' : 'border-amber-500'} bg-background flex items-center justify-center">
            ${session.creator_avatar 
              ? `<img src="${session.creator_avatar}" alt="${session.creator_name}" class="h-full w-full object-cover" />`
              : `<div class="h-full w-full flex items-center justify-center bg-amber-500/10 text-amber-600 font-semibold text-xs"></div>`
            }
          </div>
          <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center shadow-sm">${session.participant_count}</div>
        </div>
      `;
      el.addEventListener("click", () => { onSelectSession(session); onSelectCreator(null); onSelectLocation(null); });

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-2 min-w-[180px]">
          <div class="flex items-center gap-1 mb-1">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <span class="text-[10px] uppercase tracking-wide text-amber-600 font-medium">Session</span>
          </div>
          <p class="font-semibold text-sm">${session.title}</p>
          <p class="text-xs text-gray-500">${session.category} • ${session.venue_name || 'TBD'}</p>
          <p class="text-xs text-amber-600 mt-1">${dateStr} at ${timeStr}</p>
        </div>
      `);

      const marker = new mapboxgl.Marker(el).setLngLat([session.longitude, session.latitude]).setPopup(popup).addTo(map.current!);
      sessionMarkers.current.push(marker);
    });
  }, [sessions, selectedItem, mapLoaded, onSelectCreator, onSelectSession, onSelectLocation]);

  // Location markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    locationMarkers.current.forEach((m) => m.remove());
    locationMarkers.current = [];

    locations.forEach((loc) => {
      const el = document.createElement("div");
      el.className = "location-marker cursor-pointer";
      const isSelected = selectedItem?.type === 'location' && selectedItem?.id === loc.id;
      const emoji = LOCATION_TYPE_EMOJI[loc.location_type] || '';
      const colors = LOCATION_TYPE_COLORS[loc.location_type] || LOCATION_TYPE_COLORS.shoot_spot;
      
      el.innerHTML = `
        <div class="relative transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'}">
          <div class="absolute -inset-1 rounded-lg ${isSelected ? 'bg-primary/30 animate-pulse' : 'bg-primary/10'}"></div>
          <div class="relative h-10 w-10 rounded-lg overflow-hidden border-2 ${isSelected ? 'border-primary shadow-lg' : `${colors.border}`} bg-background flex items-center justify-center">
            ${loc.cover_image_url 
              ? `<img src="${loc.cover_image_url}" alt="${loc.name}" class="h-full w-full object-cover" />`
              : `<span class="text-lg">${emoji}</span>`
            }
          </div>
          ${(loc.average_rating ?? 0) > 0 ? `<div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center shadow-sm">★</div>` : ''}
        </div>
      `;
      el.addEventListener("click", () => { onSelectLocation(loc); onSelectCreator(null); onSelectSession(null); });

      const ratingHtml = (loc.average_rating ?? 0) > 0 
        ? `<span class="text-xs text-amber-500">★ ${Number(loc.average_rating).toFixed(1)} (${loc.review_count})</span>` 
        : '';
      const priceHtml = loc.is_rentable && loc.price_per_hour 
        ? `<p class="text-xs text-emerald-600 mt-0.5">$${loc.price_per_hour}/${loc.price_currency || 'USD'}/hr</p>` 
        : '';

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-2 min-w-[180px]">
          <div class="flex items-center gap-1 mb-1">
            <span class="text-xs">${emoji}</span>
            <span class="text-[10px] uppercase tracking-wide font-medium ${colors.text}">${loc.location_type.replace('_', ' ')}</span>
          </div>
          <p class="font-semibold text-sm">${loc.name}</p>
          <p class="text-xs text-gray-500">${loc.address || loc.city || ''}</p>
          <div class="flex items-center gap-2 mt-1">${ratingHtml}</div>
          ${priceHtml}
          <p class="text-xs text-gray-400 mt-0.5">${loc.distance_km < 1 ? `${Math.round(loc.distance_km * 1000)}m` : `${loc.distance_km.toFixed(1)}km`} away</p>
        </div>
      `);

      const marker = new mapboxgl.Marker(el).setLngLat([loc.longitude, loc.latitude]).setPopup(popup).addTo(map.current!);
      locationMarkers.current.push(marker);
    });
  }, [locations, selectedItem, mapLoaded, onSelectCreator, onSelectSession, onSelectLocation]);

  // Fly to selected item
  useEffect(() => {
    if (!map.current || !selectedItem) return;
    let center: [number, number] | null = null;
    if (selectedItem.type === 'creator') {
      const c = creators.find(c => c.user_id === selectedItem.id);
      if (c) {
        const fuzzy = fuzzyCoordinates(c.latitude, c.longitude, c.user_id, c.location_precision || 'approximate');
        center = [fuzzy.lng, fuzzy.lat];
      }
    } else if (selectedItem.type === 'session') {
      const s = sessions.find(s => s.id === selectedItem.id);
      if (s) center = [s.longitude, s.latitude];
    } else if (selectedItem.type === 'location') {
      const l = locations.find(l => l.id === selectedItem.id);
      if (l) center = [l.longitude, l.latitude];
    }
    if (center) map.current.flyTo({ center, zoom: 14, duration: 1000 });
  }, [selectedItem, creators, sessions, locations]);

  return (
    <Card className="overflow-hidden relative">
      <div ref={mapContainer} className="w-full h-full" />
      
      {loading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1.5 shadow-md border border-border">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary border border-primary-foreground"></div>
          <span className="text-foreground">You</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-muted border-2 border-cyan-500/60"></div>
          <span className="text-foreground">Creators ({creators.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-muted border-2 border-dashed border-amber-500"></div>
          <span className="text-foreground">Events ({sessions.length})</span>
        </div>
        {locations.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-lg bg-muted border-2 border-primary/40 text-[8px] flex items-center justify-center"></div>
            <span className="text-foreground">Spots ({locations.length})</span>
          </div>
        )}
        <div className="pt-1 border-t border-border mt-1">
          <span className="text-muted-foreground">📍 Approximate locations</span>
        </div>
      </div>
      
      {/* Counts */}
      <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
        <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 border border-border shadow-sm">
          <span className="w-2 h-2 rounded-full bg-cyan-500/60"></span>
          <span className="text-foreground">{creators.length} creators</span>
        </div>
        <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 border border-border shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span className="text-foreground">{sessions.length} events</span>
        </div>
        {locations.length > 0 && (
          <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 border border-border shadow-sm">
            <span className="text-foreground">{locations.length} spots</span>
          </div>
        )}
      </div>
    </Card>
  );
};
