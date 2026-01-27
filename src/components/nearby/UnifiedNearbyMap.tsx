import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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

type MapItemType = 'creator' | 'session';

interface UnifiedNearbyMapProps {
  creators: NearbyCreator[];
  sessions: NearbySession[];
  userLocation: { lat: number; lng: number };
  selectedItem: { type: MapItemType; id: string } | null;
  onSelectCreator: (creator: NearbyCreator | null) => void;
  onSelectSession: (session: NearbySession | null) => void;
  loading?: boolean;
}

export const UnifiedNearbyMap = ({
  creators,
  sessions,
  userLocation,
  selectedItem,
  onSelectCreator,
  onSelectSession,
  loading,
}: UnifiedNearbyMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const creatorMarkers = useRef<mapboxgl.Marker[]>([]);
  const sessionMarkers = useRef<mapboxgl.Marker[]>([]);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Mapbox public token
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
    
    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Add user location marker
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

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update user location marker
  useEffect(() => {
    if (userMarker.current && userLocation) {
      userMarker.current.setLngLat([userLocation.lng, userLocation.lat]);
      map.current?.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 11,
      });
    }
  }, [userLocation]);

  // Update creator markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing creator markers
    creatorMarkers.current.forEach((marker) => marker.remove());
    creatorMarkers.current = [];

    // Add creator markers with cyan/teal ring
    creators.forEach((creator) => {
      const el = document.createElement("div");
      el.className = "creator-marker cursor-pointer";
      
      const isSelected = selectedItem?.type === 'creator' && selectedItem?.id === creator.user_id;
      
      el.innerHTML = `
        <div class="relative transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'}">
          <div class="absolute -inset-1 rounded-full ${isSelected ? 'bg-cyan-400/40' : 'bg-cyan-500/20'} ${isSelected ? 'animate-pulse' : ''}"></div>
          <div class="relative h-10 w-10 rounded-full overflow-hidden border-2 ${isSelected ? 'border-cyan-400 shadow-lg shadow-cyan-400/30' : 'border-cyan-500'} bg-background">
            ${creator.avatar_url 
              ? `<img src="${creator.avatar_url}" alt="${creator.full_name}" class="h-full w-full object-cover" />`
              : `<div class="h-full w-full flex items-center justify-center bg-cyan-500/10 text-cyan-500 font-semibold">${creator.full_name?.charAt(0) || 'U'}</div>`
            }
          </div>
        </div>
      `;

      el.addEventListener("click", () => {
        onSelectCreator(creator);
        onSelectSession(null);
      });

      const popup = new mapboxgl.Popup({ 
        offset: 25,
        closeButton: false,
        className: 'creator-popup'
      }).setHTML(`
        <div class="p-2 min-w-[150px]">
          <div class="flex items-center gap-1 mb-1">
            <span class="w-2 h-2 rounded-full bg-cyan-500"></span>
            <span class="text-[10px] uppercase tracking-wide text-cyan-600 font-medium">Creator</span>
          </div>
          <p class="font-semibold text-sm">${creator.full_name}</p>
          <p class="text-xs text-gray-500">${creator.role}</p>
          <p class="text-xs text-cyan-600 mt-1">${creator.distance_km < 1 
            ? `${Math.round(creator.distance_km * 1000)}m away` 
            : `${creator.distance_km.toFixed(1)}km away`
          }</p>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([creator.longitude, creator.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      creatorMarkers.current.push(marker);
    });
  }, [creators, selectedItem, mapLoaded, onSelectCreator, onSelectSession]);

  // Update session markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing session markers
    sessionMarkers.current.forEach((marker) => marker.remove());
    sessionMarkers.current = [];

    // Add session markers with orange/amber ring
    sessions.forEach((session) => {
      const el = document.createElement("div");
      el.className = "session-marker cursor-pointer";
      
      const isSelected = selectedItem?.type === 'session' && selectedItem?.id === session.id;
      
      // Format time
      const startTime = new Date(session.start_time);
      const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = startTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      el.innerHTML = `
        <div class="relative transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'}">
          <div class="absolute -inset-1.5 rounded-full ${isSelected ? 'bg-amber-400/40' : 'bg-amber-500/20'} ${isSelected ? 'animate-pulse' : ''}"></div>
          <div class="relative h-10 w-10 rounded-full overflow-hidden border-[3px] border-dashed ${isSelected ? 'border-amber-400 shadow-lg shadow-amber-400/30' : 'border-amber-500'} bg-background flex items-center justify-center">
            ${session.creator_avatar 
              ? `<img src="${session.creator_avatar}" alt="${session.creator_name}" class="h-full w-full object-cover" />`
              : `<div class="h-full w-full flex items-center justify-center bg-amber-500/10 text-amber-600 font-semibold text-xs">🎯</div>`
            }
          </div>
          <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center shadow-sm">
            ${session.participant_count}
          </div>
        </div>
      `;

      el.addEventListener("click", () => {
        onSelectSession(session);
        onSelectCreator(null);
      });

      const popup = new mapboxgl.Popup({ 
        offset: 25,
        closeButton: false,
        className: 'session-popup'
      }).setHTML(`
        <div class="p-2 min-w-[180px]">
          <div class="flex items-center gap-1 mb-1">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <span class="text-[10px] uppercase tracking-wide text-amber-600 font-medium">Session</span>
          </div>
          <p class="font-semibold text-sm">${session.title}</p>
          <p class="text-xs text-gray-500">${session.category} • ${session.venue_name || 'TBD'}</p>
          <p class="text-xs text-amber-600 mt-1">${dateStr} at ${timeStr}</p>
          <p class="text-xs text-gray-400 mt-0.5">${session.participant_count}/${session.max_participants || '∞'} joined • ${session.distance_km < 1 
            ? `${Math.round(session.distance_km * 1000)}m` 
            : `${session.distance_km.toFixed(1)}km`
          }</p>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([session.longitude, session.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      sessionMarkers.current.push(marker);
    });
  }, [sessions, selectedItem, mapLoaded, onSelectCreator, onSelectSession]);

  // Fly to selected item
  useEffect(() => {
    if (!map.current || !selectedItem) return;
    
    if (selectedItem.type === 'creator') {
      const creator = creators.find(c => c.user_id === selectedItem.id);
      if (creator) {
        map.current.flyTo({
          center: [creator.longitude, creator.latitude],
          zoom: 14,
          duration: 1000,
        });
      }
    } else if (selectedItem.type === 'session') {
      const session = sessions.find(s => s.id === selectedItem.id);
      if (session) {
        map.current.flyTo({
          center: [session.longitude, session.latitude],
          zoom: 14,
          duration: 1000,
        });
      }
    }
  }, [selectedItem, creators, sessions]);

  return (
    <Card className="overflow-hidden relative">
      <div ref={mapContainer} className="w-full h-[500px] lg:h-[600px]" />
      
      {loading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary border border-white"></div>
          <span>Your location</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-muted border-2 border-cyan-500"></div>
          <span>Creators ({creators.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-muted border-2 border-dashed border-amber-500"></div>
          <span>Sessions ({sessions.length})</span>
        </div>
      </div>
      
      {/* Counts */}
      <div className="absolute top-4 left-4 flex gap-2">
        <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
          {creators.length} creators
        </div>
        <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          {sessions.length} sessions
        </div>
      </div>
    </Card>
  );
};
