import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2 } from "lucide-react";
import type { CreativeLocation } from "./LocationListItem";
import { fuzzyCoordinates } from "@/lib/fuzzyLocation";
import { getMaskedName } from "./NearbyCreatorCard";

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
  connectedIds?: Set<string>;
}

const LOCATION_TYPE_EMOJI: Record<string, string> = {
  studio: '🎙',
  creative_space: '🏛️',
  shoot_spot: '📸',
  venue: '🎭',
  music_store: '🎵',
  art_supply: '🛒',
  photo_lab: '📷',
  rental_house: '🏠',
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
  connectedIds = new Set(),
}: UnifiedNearbyMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const creatorMarkers = useRef<mapboxgl.Marker[]>([]);
  const sessionMarkers = useRef<mapboxgl.Marker[]>([]);
  const locationMarkers = useRef<mapboxgl.Marker[]>([]);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const cleanupMapListeners = useRef<(() => void) | null>(null);
  const resizeTimeouts = useRef<number[]>([]);
  const initFrame = useRef<number | null>(null);
  const hasRetriedInit = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const mapboxToken = "pk.eyJ1IjoiZXRoYW5hdWd1c3RlIiwiYSI6ImNtZzhvbDk0dzAwaHYycnB6eWp4Zjh2OHAifQ.4uCSa5SdtxZAnC2Xvx6V5w";

  const clearResizeTimeouts = useCallback(() => {
    resizeTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    resizeTimeouts.current = [];
  }, []);

  const cancelInitFrame = useCallback(() => {
    if (initFrame.current !== null) {
      window.cancelAnimationFrame(initFrame.current);
      initFrame.current = null;
    }
  }, []);

  const getContainerSize = useCallback(() => {
    const rect = mapContainer.current?.getBoundingClientRect();

    return {
      width: rect?.width ?? 0,
      height: rect?.height ?? 0,
    };
  }, []);

  const scheduleResizeBurst = useCallback(() => {
    clearResizeTimeouts();

    [0, 120, 350, 800].forEach((delay) => {
      const timeoutId = window.setTimeout(() => {
        if (!map.current) return;
        map.current.resize();
        map.current.triggerRepaint();
      }, delay);

      resizeTimeouts.current.push(timeoutId);
    });
  }, [clearResizeTimeouts]);

  const clearMarkers = useCallback(() => {
    creatorMarkers.current.forEach((marker) => marker.remove());
    sessionMarkers.current.forEach((marker) => marker.remove());
    locationMarkers.current.forEach((marker) => marker.remove());
    creatorMarkers.current = [];
    sessionMarkers.current = [];
    locationMarkers.current = [];
  }, []);

  const destroyMap = useCallback(() => {
    cancelInitFrame();
    clearResizeTimeouts();
    clearMarkers();
    cleanupMapListeners.current?.();
    cleanupMapListeners.current = null;
    userMarker.current?.remove();
    userMarker.current = null;

    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    setMapLoaded(false);
  }, [cancelInitFrame, clearMarkers, clearResizeTimeouts]);

  const initializeMap = useCallback(() => {
    if (!mapContainer.current || map.current || !userLocation) return;

    const { width, height } = getContainerSize();

    if (width < 40 || height < 40) {
      cancelInitFrame();
      initFrame.current = window.requestAnimationFrame(() => {
        initFrame.current = null;
        initializeMap();
      });
      return;
    }

    if (!mapboxgl.supported()) {
      console.error("[UnifiedNearbyMap] Mapbox GL is not supported on this device");
      return;
    }

    setMapLoaded(false);
    mapboxgl.accessToken = mapboxToken;

    let mapInstance: mapboxgl.Map;

    try {
      mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [userLocation.lng, userLocation.lat],
        zoom: 11,
        trackResize: true,
      });
    } catch (error) {
      console.error("[UnifiedNearbyMap] Failed to initialize map", error);
      return;
    }

    map.current = mapInstance;
    mapInstance.addControl(new mapboxgl.NavigationControl(), "top-right");

    const handleLoad = () => {
      setMapLoaded(true);
      hasRetriedInit.current = false;
      mapInstance.resize();
      scheduleResizeBurst();

      window.requestAnimationFrame(() => {
        mapInstance.resize();
        mapInstance.triggerRepaint();
      });
    };

    const handleStyleData = () => {
      scheduleResizeBurst();
    };

    const handleIdle = () => {
      scheduleResizeBurst();
    };

    const handleError = (event: any) => {
      console.error("[UnifiedNearbyMap] Mapbox error", event?.error ?? event);
    };

    const handleWebglContextLost = (event: Event) => {
      event.preventDefault?.();
      console.warn("[UnifiedNearbyMap] WebGL context lost, rebuilding map");
      destroyMap();
      window.setTimeout(() => initializeMap(), 150);
    };

    mapInstance.on("load", handleLoad);
    mapInstance.on("styledata", handleStyleData);
    mapInstance.on("idle", handleIdle);
    mapInstance.on("error", handleError);

    const canvas = mapInstance.getCanvas();
    canvas.addEventListener("webglcontextlost", handleWebglContextLost as EventListener, false);

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
      .addTo(mapInstance);

    scheduleResizeBurst();

    cleanupMapListeners.current = () => {
      canvas.removeEventListener("webglcontextlost", handleWebglContextLost as EventListener, false);
      mapInstance.off("load", handleLoad);
      mapInstance.off("styledata", handleStyleData);
      mapInstance.off("idle", handleIdle);
      mapInstance.off("error", handleError);
    };
  }, [cancelInitFrame, destroyMap, getContainerSize, mapboxToken, scheduleResizeBurst, userLocation]);

  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  useEffect(() => {
    return () => {
      destroyMap();
    };
  }, [destroyMap]);

  useEffect(() => {
    const handleViewportChange = () => scheduleResizeBurst();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleResizeBurst();
      }
    };

    const resizeObserver = typeof ResizeObserver !== "undefined" && mapContainer.current
      ? new ResizeObserver(handleViewportChange)
      : null;

    if (resizeObserver && mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    window.addEventListener("pageshow", handleViewportChange);
    window.addEventListener("focus", handleViewportChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      window.removeEventListener("pageshow", handleViewportChange);
      window.removeEventListener("focus", handleViewportChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
    };
  }, [scheduleResizeBurst]);

  useEffect(() => {
    if (!map.current || !userLocation) return;

    userMarker.current?.setLngLat([userLocation.lng, userLocation.lat]);
    map.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 11 });
    scheduleResizeBurst();
  }, [userLocation, scheduleResizeBurst]);

  useEffect(() => {
    if (!userLocation || loading || mapLoaded) return;

    const timeoutId = window.setTimeout(() => {
      if (mapLoaded) return;

      console.warn("[UnifiedNearbyMap] Map load stalled, retrying initialization");

      if (!hasRetriedInit.current) {
        hasRetriedInit.current = true;
        destroyMap();
        window.setTimeout(() => initializeMap(), 150);
      }
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [destroyMap, initializeMap, loading, mapLoaded, userLocation]);

  useEffect(() => {
    if (!map.current || loading) return;
    scheduleResizeBurst();
  }, [loading, creators.length, sessions.length, locations.length, scheduleResizeBurst]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    creatorMarkers.current.forEach((marker) => marker.remove());
    creatorMarkers.current = [];

    creators.forEach((creator) => {
      const fuzzy = fuzzyCoordinates(creator.latitude, creator.longitude, creator.user_id, creator.location_precision || 'approximate');
      const connected = connectedIds.has(creator.user_id);
      const displayName = getMaskedName(creator.full_name, connected);

      const el = document.createElement("div");
      el.className = "creator-marker cursor-pointer";
      const isSelected = selectedItem?.type === 'creator' && selectedItem?.id === creator.user_id;

      el.innerHTML = `
        <div class="relative transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'}">
          <div class="absolute -inset-1 rounded-full ${isSelected ? 'bg-cyan-400/40 animate-pulse' : 'bg-cyan-500/20'}"></div>
          <div class="relative h-10 w-10 rounded-full overflow-hidden border-2 ${isSelected ? 'border-cyan-400 shadow-lg shadow-cyan-400/30' : 'border-cyan-500'} bg-background">
            ${connected && creator.avatar_url
              ? `<img src="${creator.avatar_url}" alt="${displayName}" class="h-full w-full object-cover" />`
              : `<div class="h-full w-full flex items-center justify-center bg-cyan-500/10 text-cyan-500 font-semibold">${creator.full_name?.charAt(0) || 'U'}</div>`
            }
          </div>
        </div>
      `;

      el.addEventListener("click", () => {
        onSelectCreator(creator);
        onSelectSession(null);
        onSelectLocation(null);
      });

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-2 min-w-[150px]">
          <div class="flex items-center gap-1 mb-1">
            <span class="w-2 h-2 rounded-full bg-cyan-500"></span>
            <span class="text-[10px] uppercase tracking-wide text-cyan-600 font-medium">Creator</span>
          </div>
          <p class="font-semibold text-sm">${displayName}</p>
          <p class="text-xs text-gray-500">${creator.role}</p>
          <p class="text-xs text-cyan-600 mt-1">~${creator.distance_km < 1 ? `${Math.round(creator.distance_km * 1000)}m` : `${creator.distance_km.toFixed(1)}km`} away</p>
          <p class="text-[9px] text-gray-400 mt-0.5 italic">Approximate location</p>
          ${!connected ? '<p class="text-[9px] text-cyan-500 mt-1">Connect to see full profile</p>' : ''}
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([fuzzy.lng, fuzzy.lat])
        .setPopup(popup)
        .addTo(map.current!);

      creatorMarkers.current.push(marker);
    });
  }, [connectedIds, creators, mapLoaded, onSelectCreator, onSelectLocation, onSelectSession, selectedItem]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    sessionMarkers.current.forEach((marker) => marker.remove());
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

      el.addEventListener("click", () => {
        onSelectSession(session);
        onSelectCreator(null);
        onSelectLocation(null);
      });

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-2 min-w-[160px]">
          <div class="flex items-center gap-1 mb-1">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <span class="text-[10px] uppercase tracking-wide text-amber-600 font-medium">Event</span>
          </div>
          <p class="font-semibold text-sm">${session.title}</p>
          <p class="text-xs text-gray-500 mt-0.5">${dateStr} · ${timeStr}</p>
          <p class="text-xs text-gray-500">${session.venue_name || ''}</p>
          <p class="text-xs text-amber-600 mt-1">${session.participant_count}/${session.max_participants} joined</p>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([session.longitude, session.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      sessionMarkers.current.push(marker);
    });
  }, [mapLoaded, onSelectCreator, onSelectLocation, onSelectSession, selectedItem, sessions]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    locationMarkers.current.forEach((marker) => marker.remove());
    locationMarkers.current = [];

    locations.forEach((location) => {
      const el = document.createElement("div");
      el.className = "location-marker cursor-pointer";
      const isSelected = selectedItem?.type === 'location' && selectedItem?.id === location.id;
      const emoji = LOCATION_TYPE_EMOJI[location.location_type] || '📍';

      el.innerHTML = `
        <div class="relative transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'}">
          <div class="absolute -inset-1 rounded-lg ${isSelected ? 'bg-emerald-400/40 animate-pulse' : 'bg-emerald-500/15'}"></div>
          <div class="relative h-9 w-9 rounded-lg overflow-hidden border-2 ${isSelected ? 'border-emerald-400 shadow-lg shadow-emerald-400/30' : 'border-emerald-500/60'} bg-background flex items-center justify-center text-base">
            ${emoji}
          </div>
        </div>
      `;

      el.addEventListener("click", () => {
        onSelectLocation(location);
        onSelectCreator(null);
        onSelectSession(null);
      });

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-2 min-w-[150px]">
          <div class="flex items-center gap-1 mb-1">
            <span class="text-sm">${emoji}</span>
            <span class="text-[10px] uppercase tracking-wide text-emerald-600 font-medium">${location.location_type.replace('_', ' ')}</span>
          </div>
          <p class="font-semibold text-sm">${location.name}</p>
          ${location.address ? `<p class="text-xs text-gray-500 mt-0.5">${location.address}</p>` : ''}
          ${location.average_rating ? `<p class="text-xs text-amber-500 mt-1">⭐ ${location.average_rating.toFixed(1)}</p>` : ''}
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([location.longitude, location.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      locationMarkers.current.push(marker);
    });
  }, [locations, mapLoaded, onSelectCreator, onSelectLocation, onSelectSession, selectedItem]);

  return (
    <div className="relative h-full w-full min-h-[300px] bg-background/20">
      <div ref={mapContainer} className="absolute inset-0" />
      {(loading || !mapLoaded) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/70">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          {!loading && <p className="text-xs text-muted-foreground">Loading map…</p>}
        </div>
      )}
    </div>
  );
};