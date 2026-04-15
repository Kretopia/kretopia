import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const getHslToken = (token: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;

  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value ? `hsl(${value})` : fallback;
};

const sanitizeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDistanceLabel = (distanceKm: number) =>
  distanceKm < 1 ? `~${Math.round(distanceKm * 1000)}m away` : `~${distanceKm.toFixed(1)}km away`;

interface MarkerPalette {
  primary: string;
  primarySoft: string;
  background: string;
  foreground: string;
  border: string;
  muted: string;
}

const buildUserIcon = (palette: MarkerPalette) =>
  L.divIcon({
    className: "",
    html: `
      <div style="position: relative; width: 20px; height: 20px; display: grid; place-items: center;">
        <div style="position: absolute; inset: -6px; border-radius: 9999px; background: ${palette.primarySoft}; opacity: 0.9;"></div>
        <div style="position: relative; width: 14px; height: 14px; border-radius: 9999px; background: ${palette.primary}; border: 2px solid ${palette.background}; box-shadow: 0 0 0 2px ${palette.primarySoft};"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

const buildCreatorIcon = ({
  label,
  avatarUrl,
  selected,
  palette,
}: {
  label: string;
  avatarUrl: string | null;
  selected: boolean;
  palette: MarkerPalette;
}) =>
  L.divIcon({
    className: "",
    html: `
      <div style="position: relative; width: 44px; height: 44px; transform: scale(${selected ? 1.1 : 1}); transition: transform 160ms ease;">
        <div style="position: absolute; inset: -4px; border-radius: 9999px; background: ${palette.primarySoft}; opacity: ${selected ? 1 : 0.7};"></div>
        <div style="position: relative; width: 44px; height: 44px; border-radius: 9999px; overflow: hidden; border: 2px solid ${selected ? palette.primary : palette.border}; background: ${palette.background}; display: flex; align-items: center; justify-content: center; color: ${palette.primary}; font-size: 14px; font-weight: 700; box-shadow: 0 10px 24px rgba(0,0,0,0.18);">
          ${avatarUrl ? `<img src="${sanitizeHtml(avatarUrl)}" alt="${sanitizeHtml(label)}" style="width: 100%; height: 100%; object-fit: cover;" />` : sanitizeHtml(label.charAt(0) || "U")}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });

const buildSessionIcon = ({
  count,
  avatarUrl,
  label,
  selected,
  palette,
}: {
  count: number;
  avatarUrl?: string;
  label: string;
  selected: boolean;
  palette: MarkerPalette;
}) =>
  L.divIcon({
    className: "",
    html: `
      <div style="position: relative; width: 46px; height: 46px; transform: scale(${selected ? 1.12 : 1}); transition: transform 160ms ease;">
        <div style="position: absolute; inset: -5px; border-radius: 9999px; background: ${palette.primarySoft}; opacity: ${selected ? 1 : 0.72};"></div>
        <div style="position: relative; width: 46px; height: 46px; border-radius: 9999px; overflow: hidden; border: 3px dashed ${palette.primary}; background: ${palette.background}; display: flex; align-items: center; justify-content: center; color: ${palette.primary}; font-size: 12px; font-weight: 700; box-shadow: 0 10px 24px rgba(0,0,0,0.18);">
          ${avatarUrl ? `<img src="${sanitizeHtml(avatarUrl)}" alt="${sanitizeHtml(label)}" style="width: 100%; height: 100%; object-fit: cover;" />` : "EV"}
        </div>
        <div style="position: absolute; right: -2px; bottom: -2px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9999px; background: ${palette.primary}; color: ${palette.background}; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; border: 2px solid ${palette.background};">
          ${count}
        </div>
      </div>
    `,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -23],
  });

const buildLocationIcon = ({
  emoji,
  selected,
  palette,
}: {
  emoji: string;
  selected: boolean;
  palette: MarkerPalette;
}) =>
  L.divIcon({
    className: "",
    html: `
      <div style="position: relative; width: 42px; height: 42px; transform: scale(${selected ? 1.08 : 1}); transition: transform 160ms ease;">
        <div style="position: absolute; inset: -4px; border-radius: 14px; background: ${palette.primarySoft}; opacity: ${selected ? 1 : 0.68};"></div>
        <div style="position: relative; width: 42px; height: 42px; border-radius: 14px; border: 2px solid ${palette.primary}; background: ${palette.background}; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 10px 24px rgba(0,0,0,0.18);">
          ${emoji}
        </div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -20],
  });

const MapViewportController = ({
  userLocation,
  selectedTarget,
  points,
}: {
  userLocation: { lat: number; lng: number };
  selectedTarget: { lat: number; lng: number; zoom: number } | null;
  points: Array<[number, number]>;
}) => {
  const map = useMap();

  useEffect(() => {
    const timers = [0, 120, 320].map((delay) =>
      window.setTimeout(() => {
        map.invalidateSize();
      }, delay),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [map]);

  useEffect(() => {
    if (selectedTarget) {
      map.flyTo([selectedTarget.lat, selectedTarget.lng], selectedTarget.zoom, {
        animate: true,
        duration: 0.8,
      });
      return;
    }

    if (points.length > 1) {
      map.fitBounds(points, {
        padding: [32, 32],
        maxZoom: 13,
      });
      return;
    }

    map.setView([userLocation.lat, userLocation.lng], 11);
  }, [map, points, selectedTarget, userLocation]);

  return null;
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
  const palette = useMemo<MarkerPalette>(
    () => ({
      primary: getHslToken("--primary", "hsl(221 83% 53%)"),
      primarySoft: getHslToken("--accent", "hsl(221 83% 53% / 0.24)"),
      background: getHslToken("--background", "hsl(222 47% 11%)"),
      foreground: getHslToken("--foreground", "hsl(210 40% 98%)"),
      border: getHslToken("--border", "hsl(217 33% 24%)"),
      muted: getHslToken("--muted-foreground", "hsl(215 20% 65%)"),
    }),
    [],
  );

  const creatorPoints = useMemo(
    () =>
      creators.map((creator) => {
        const fuzzy = fuzzyCoordinates(
          creator.latitude,
          creator.longitude,
          creator.user_id,
          creator.location_precision || "approximate",
        );

        return {
          creator,
          lat: fuzzy.lat,
          lng: fuzzy.lng,
          connected: connectedIds.has(creator.user_id),
        };
      }),
    [connectedIds, creators],
  );

  const selectedTarget = useMemo(() => {
    if (!selectedItem) return null;

    if (selectedItem.type === "creator") {
      const match = creatorPoints.find(({ creator }) => creator.user_id === selectedItem.id);
      return match ? { lat: match.lat, lng: match.lng, zoom: 13 } : null;
    }

    if (selectedItem.type === "session") {
      const match = sessions.find((session) => session.id === selectedItem.id);
      return match ? { lat: match.latitude, lng: match.longitude, zoom: 13 } : null;
    }

    const location = locations.find((item) => item.id === selectedItem.id);
    return location ? { lat: location.latitude, lng: location.longitude, zoom: 14 } : null;
  }, [creatorPoints, locations, selectedItem, sessions]);

  const allPoints = useMemo<Array<[number, number]>>(
    () => [
      [userLocation.lat, userLocation.lng],
      ...creatorPoints.map(({ lat, lng }) => [lat, lng] as [number, number]),
      ...sessions.map((session) => [session.latitude, session.longitude] as [number, number]),
      ...locations.map((location) => [location.latitude, location.longitude] as [number, number]),
    ],
    [creatorPoints, locations, sessions, userLocation.lat, userLocation.lng],
  );

  const userIcon = useMemo(() => buildUserIcon(palette), [palette]);

  return (
    <div className="relative h-full w-full min-h-[300px] overflow-hidden bg-muted/20">
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={11}
        scrollWheelZoom
        zoomControl={false}
        preferCanvas
        className="h-full w-full z-0"
      >
        <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
        <ZoomControl position="topright" />
        <MapViewportController
          userLocation={userLocation}
          selectedTarget={selectedTarget}
          points={allPoints}
        />

        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Your location</p>
              <p className="text-xs text-muted-foreground">Used to discover nearby creators, events, and spots.</p>
            </div>
          </Popup>
        </Marker>

        {creatorPoints.map(({ creator, lat, lng, connected }) => {
          const displayName = getMaskedName(creator.full_name, connected);
          const isSelected = selectedItem?.type === "creator" && selectedItem.id === creator.user_id;

          return (
            <Marker
              key={creator.user_id}
              position={[lat, lng]}
              icon={buildCreatorIcon({
                label: displayName,
                avatarUrl: connected ? creator.avatar_url : null,
                selected: isSelected,
                palette,
              })}
              eventHandlers={{
                click: () => {
                  onSelectCreator(creator);
                  onSelectSession(null);
                  onSelectLocation(null);
                },
              }}
            >
              <Popup>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary">Creator</div>
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{creator.role}</p>
                  <p className="text-xs text-primary">{formatDistanceLabel(creator.distance_km)}</p>
                  <p className="text-[10px] text-muted-foreground italic">Approximate location</p>
                  {!connected && <p className="text-[10px] text-primary">Connect to see full profile</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {sessions.map((session) => {
          const isSelected = selectedItem?.type === "session" && selectedItem.id === session.id;
          const startTime = new Date(session.start_time);

          return (
            <Marker
              key={session.id}
              position={[session.latitude, session.longitude]}
              icon={buildSessionIcon({
                count: session.participant_count,
                avatarUrl: session.creator_avatar,
                label: session.title,
                selected: isSelected,
                palette,
              })}
              eventHandlers={{
                click: () => {
                  onSelectSession(session);
                  onSelectCreator(null);
                  onSelectLocation(null);
                },
              }}
            >
              <Popup>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary">Event</div>
                  <p className="text-sm font-semibold">{session.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {startTime.toLocaleDateString([], { month: "short", day: "numeric" })} · {" "}
                    {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {!!session.venue_name && <p className="text-xs text-muted-foreground">{session.venue_name}</p>}
                  <p className="text-xs text-primary">{session.participant_count}/{session.max_participants} joined</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {locations.map((location) => {
          const isSelected = selectedItem?.type === "location" && selectedItem.id === location.id;
          const emoji = LOCATION_TYPE_EMOJI[location.location_type] || "📍";

          return (
            <Marker
              key={location.id}
              position={[location.latitude, location.longitude]}
              icon={buildLocationIcon({ emoji, selected: isSelected, palette })}
              eventHandlers={{
                click: () => {
                  onSelectLocation(location);
                  onSelectCreator(null);
                  onSelectSession(null);
                },
              }}
            >
              <Popup>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
                    {location.location_type.replace("_", " ")}
                  </div>
                  <p className="text-sm font-semibold">{location.name}</p>
                  {!!location.address && <p className="text-xs text-muted-foreground">{location.address}</p>}
                  {!!location.average_rating && <p className="text-xs text-primary">⭐ {location.average_rating.toFixed(1)}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {(loading || !userLocation) && (
        <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center gap-2 bg-background/75">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          {!loading && <p className="text-xs text-muted-foreground">Loading map…</p>}
        </div>
      )}
    </div>
  );
};