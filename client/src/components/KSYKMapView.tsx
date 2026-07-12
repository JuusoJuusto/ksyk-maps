/**
 * KSYK Maps — Leaflet/OSM-only campus map.
 *
 * Renders the Leaflet basemap (OsmBasemap), portals an SVG overlay of rooms on
 * top of it, and provides floor selection, search-driven focus, room/building
 * bottom sheets, room-to-room navigation hints, geolocation, and fullscreen.
 *
 * There is intentionally no standalone SVG/fallback canvas — Leaflet is the
 * single source of truth for pan/zoom/rotate.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type L from "leaflet";
import OsmBasemap from "@/components/OsmBasemap";
import AccessLockoutScreen from "@/components/AccessLockoutScreen";
import MatterportTour from "@/components/MatterportTour";
import { useAccessDecision } from "@/hooks/useAccessDecision";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";
import { isFeatureAllowed } from "@/lib/accessControl";
import { safeLatLng, safeNum, safeZoom, KSYK_FALLBACK_LAT, KSYK_FALLBACK_LNG } from "@/lib/safeNum";
import { t as track } from "@/lib/telemetry";
import {
  getLabelAnchor,
  computeCampusViewBox,
  parseViewBox,
  type BuildingMapData,
} from "@/lib/mapGeometry";
import {
  KSYK_BUILDING_OUTLINES,
  outlinesAsMapBuildings,
} from "@/lib/ksykCampusOutlines";
import { getRoomFillColor, getRoomStatusColor, roomStatusLabel, ROOM_STATUS_COLORS } from "@/lib/campusSpace";
import { pathForRoomType } from "@/lib/roomIcons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useAppSettings, loadMapDefaultsFromServer } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  X,
  MapPin,
  Building2,
  Users,
  Clock,
  BookOpen,
  Crosshair,
  Navigation,
  Mountain,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Building extends BuildingMapData {
  openingHours?: unknown;
  facilities?: string[];
}

interface Room {
  id: string;
  roomNumber: string;
  name?: string;
  nameEn?: string;
  nameFi?: string;
  floor: number;
  buildingId?: string;
  capacity?: number;
  currentStatus?: string;
  type?: string;
  mapPositionX?: number;
  mapPositionY?: number;
  width?: number;
  height?: number;
  /** Optional per-room Matterport tour URL (set by admin via builder). */
  virtualTourUrl?: string;
}

interface KSYKMapViewProps {
  searchQuery?: string;
  highlightLetter?: string | null;
}

type SearchHit =
  | { type: "building"; id: string; label: string; sub: string; letter: string }
  | { type: "room"; id: string; label: string; sub: string; room: Room };

type RoomPt = { id: string; x: number; y: number; floor: number; label: string };

interface ScheduleEntry {
  id: string;
  startTime: string;
  endTime: string;
  subject?: string;
  teacher?: string;
  group?: string | null;
  isCurrent?: boolean;
  isNext?: boolean;
}

interface RoomSchedule {
  roomId: string;
  roomNumber: string;
  date: string;
  dayOfWeek: number | null;
  schedule: ScheduleEntry[];
  source: 'wilma' | 'manual' | 'none';
  lastUpdated: string | null;
}

export default function KSYKMapView({ searchQuery = "", highlightLetter = null }: KSYKMapViewProps) {
  const { i18n } = useTranslation();
  const { darkMode } = useDarkMode();
  const { settings, update } = useAppSettings();
  const { settings: securitySettings } = useSecuritySettings();
  const accessDecision = useAccessDecision();
  // Fire a single telemetry event each time the decision tier changes.
  useEffect(() => {
    track.accessDecision({
      tier: accessDecision.tier,
      reasonCode: accessDecision.reasonCode,
      reason: accessDecision.reason,
    });
  }, [accessDecision.tier, accessDecision.reasonCode]);
  const canUse3D = isFeatureAllowed("threeDView", accessDecision, securitySettings);
  const canUseRouting = isFeatureAllowed("routing", accessDecision, securitySettings);
  const canUseSearch = isFeatureAllowed("search", accessDecision, securitySettings);
  const canUseGeolocation = isFeatureAllowed("geolocation", accessDecision, securitySettings);
  const canUseSchedules = isFeatureAllowed("schedules", accessDecision, securitySettings);
  const isFi = i18n.language === "fi";

  // Load admin-set map defaults from server once on mount
  useEffect(() => {
    loadMapDefaultsFromServer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI state
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  /** Rotation popover open/close — toggled by the compass button. */
  const [rotateOpen, setRotateOpen] = useState(false);
  /** Matterport tour overlay — fullscreen 3D walkthrough. Visible when
   * the admin has configured matterportTourUrl AND the user has tapped
   * the Tour button. */
  const [tourOpen, setTourOpen] = useState(false);
  const tourUrl = (settings.matterportTourUrl || "").trim();

  // Leaflet plumbing
  const wrapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const [overlayEl, setOverlayEl] = useState<SVGSVGElement | null>(null);
  const [leafletMetersPerPx, setLeafletMetersPerPx] = useState<number | null>(null);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  // Rooms are always visible — the layers panel was removed for a cleaner
  // minimal UI (zoom + reset + floor only).
  const layers = { rooms: true, labels: true };

  // Room-to-room navigation
  const [navFrom, setNavFrom] = useState<RoomPt | null>(null);
  const [navTo, setNavTo] = useState<RoomPt | null>(null);

  // GPS geolocation
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Room schedule — fetched lazily when a room is selected (gated by security)
  const { data: roomSchedule, isFetching: scheduleLoading } = useQuery<RoomSchedule>({
    queryKey: ["room-schedule", selectedRoom?.id],
    queryFn: async () => {
      const r = await fetch(`/api/rooms/${selectedRoom!.id}/schedule`);
      if (!r.ok) throw new Error("schedule fetch failed");
      return r.json();
    },
    enabled: !!selectedRoom?.id && canUseSchedules,
    staleTime: 60_000,
  });

  // ─── Data ──────────────────────────────────────────────────────────────
  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const r = await fetch("/api/buildings");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 60_000,
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: async () => {
      const r = await fetch("/api/rooms");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
  });

  const campusBuildings = useMemo(() => {
    const apiByLetter = new Map<string, Building>();
    for (const b of buildings as Building[]) {
      if (b?.name) apiByLetter.set(b.name.toUpperCase(), b);
    }
    return (outlinesAsMapBuildings() as Building[]).map((stub) => {
      const real = apiByLetter.get(stub.name.toUpperCase());
      return real ? { ...stub, ...real, name: stub.name } : stub;
    });
  }, [buildings]);

  const maxFloor = useMemo(() => {
    const fromRooms = (rooms as Room[]).map((r) => r.floor ?? 1);
    const fromWings = campusBuildings.map((b) => b.floors ?? 1);
    return Math.max(1, ...fromRooms, ...fromWings, 3);
  }, [rooms, campusBuildings]);

  const floorRooms = useMemo(
    () =>
      (rooms as Room[]).filter(
        (r) => r.floor === selectedFloor && r.mapPositionX != null && r.mapPositionY != null
      ),
    [rooms, selectedFloor]
  );

  const baseViewBox = useMemo(
    () => parseViewBox(computeCampusViewBox(outlinesAsMapBuildings() as BuildingMapData[])),
    []
  );

  // ─── Coordinate conversion ─────────────────────────────────────────────
  const svgToLatLng = useCallback(
    (svgX: number, svgY: number): [number, number] => {
      const fx = (svgX - baseViewBox.x) / baseViewBox.w;
      const fy = (svgY - baseViewBox.y) / baseViewBox.h;
      const halfLatM = settings.osmCampusSpanMeters / 2;
      const halfLatDeg = halfLatM / 111_320;
      const halfLngDeg =
        (halfLatM * (baseViewBox.w / baseViewBox.h)) /
        (111_320 * Math.cos((settings.osmCenterLat * Math.PI) / 180));
      return [
        settings.osmCenterLat + halfLatDeg * (1 - 2 * fy),
        settings.osmCenterLng - halfLngDeg + fx * 2 * halfLngDeg,
      ];
    },
    [
      baseViewBox.x,
      baseViewBox.y,
      baseViewBox.w,
      baseViewBox.h,
      settings.osmCampusSpanMeters,
      settings.osmCenterLat,
      settings.osmCenterLng,
    ]
  );

  // ─── Search ────────────────────────────────────────────────────────────
  const searchHits = useMemo((): SearchHit[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const score = (s?: string | null): number => {
      if (!s) return 0;
      const v = s.toLowerCase();
      if (v === q) return 100;
      if (v.startsWith(q)) return 60;
      if (v.includes(q)) return 30;
      return 0;
    };
    type Scored = { hit: SearchHit; score: number };
    const scored: Scored[] = [];
    for (const b of campusBuildings) {
      const label = (isFi ? b.nameFi : b.nameEn) ?? b.name;
      const s = Math.max(score(b.name), score(label), score(b.nameEn), score(b.nameFi));
      if (s > 0) {
        scored.push({
          score: s + 5,
          hit: {
            type: "building",
            id: b.id,
            letter: b.name,
            label: label || b.name,
            sub: `${b.floors} ${isFi ? "kerrosta" : "floors"}`,
          },
        });
      }
    }
    const seen = new Set<string>();
    for (const r of rooms as Room[]) {
      if (!r.id || seen.has(r.id)) continue;
      const s = Math.max(score(r.roomNumber), score(r.name), score(r.nameEn), score(r.nameFi));
      if (s > 0) {
        seen.add(r.id);
        scored.push({
          score: s,
          hit: {
            type: "room",
            id: r.id,
            label: r.roomNumber,
            sub: [r.name || r.nameEn, `${isFi ? "Kerros" : "Floor"} ${r.floor ?? 1}`]
              .filter(Boolean)
              .join(" · "),
            room: r,
          },
        });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map((x) => x.hit);
  }, [searchQuery, campusBuildings, rooms, isFi]);

  // ─── Map interaction ───────────────────────────────────────────────────
  // Every flyTo passes through safeLatLng + safeZoom and is wrapped in
  // try/catch, so corrupted localStorage / server data can NEVER reach
  // Leaflet and crash the React tree with "Invalid LatLng (NaN, NaN)".
  const flyTo = useCallback(
    (lat: number, lng: number, zoom?: number) => {
      const map = leafletMapRef.current;
      if (!map) return;
      const [safeLat, safeLng] = safeLatLng(lat, lng);
      const defaultZ = safeZoom(settings.osmDefaultZoom);
      const targetZoom = safeZoom(Math.max(zoom ?? defaultZ, defaultZ));
      try {
        map.flyTo([safeLat, safeLng], targetZoom, { duration: 0.55 });
      } catch {
        // Expected fallback when Leaflet rejects an internal projection
        // (e.g. stale NaN survives the safe-num path). Silent — the
        // setView call below recovers the view without bothering the user.
        try { map.setView([safeLat, safeLng], targetZoom, { animate: false }); } catch { /* give up */ }
      }
    },
    [settings.osmDefaultZoom]
  );

  const focusRoom = useCallback(
    (room: Room) => {
      setSelectedRoom(room);
      setSelectedBuilding(null);
      setSelectedFloor(room.floor ?? 1);
      const cx = (room.mapPositionX ?? 0) + (room.width ?? 80) / 2;
      const cy = (room.mapPositionY ?? 0) + (room.height ?? 60) / 2;
      const [lat, lng] = svgToLatLng(cx, cy);
      flyTo(lat, lng, Math.max(settings.osmDefaultZoom, 19.5));
      track.focus("room", room.id, room.roomNumber);
    },
    [svgToLatLng, flyTo, settings.osmDefaultZoom]
  );

  const focusBuilding = useCallback(
    (letter: string) => {
      const preset = KSYK_BUILDING_OUTLINES[letter];
      const b = campusBuildings.find((x) => x.name === letter);
      if (preset) {
        const anchor = getLabelAnchor(preset.shape);
        const [lat, lng] = svgToLatLng(anchor.x, anchor.y);
        flyTo(lat, lng, Math.max(settings.osmDefaultZoom, 19));
      }
      if (b) setSelectedBuilding(b);
      setSelectedRoom(null);
      track.focus("building", letter, letter);
    },
    [campusBuildings, svgToLatLng, flyTo, settings.osmDefaultZoom]
  );

  // Reset = fly back to KSYK school. We use the admin-configured center
  // only if it's plausibly close to KSYK (within ~5km); otherwise we
  // snap to the hard-coded school coords. This is the user's "escape
  // hatch" — if anything else is broken (corrupt settings, wrong saved
  // center), hitting Home must ALWAYS recover the KSYK view.
  const resetView = useCallback(() => {
    const KM_THRESHOLD_DEG = 0.05; // ~5.5km in latitude
    let [lat, lng] = safeLatLng(settings.osmCenterLat, settings.osmCenterLng);
    const drift =
      Math.abs(lat - KSYK_FALLBACK_LAT) + Math.abs(lng - KSYK_FALLBACK_LNG);
    if (drift > KM_THRESHOLD_DEG) {
      lat = KSYK_FALLBACK_LAT;
      lng = KSYK_FALLBACK_LNG;
    }
    const zoom = safeZoom(settings.osmDefaultZoom);
    flyTo(lat, lng, zoom);
    // Also clear rotation if it's drifted, so "Home" feels like a true reset.
    if (Math.abs(safeNum(settings.osmRotationDeg, 0)) > 0.5) {
      update("osmRotationDeg", 0);
    }
    setSelectedBuilding(null);
    setSelectedRoom(null);
    setNavFrom(null);
    setNavTo(null);
    setRotateOpen(false);
    track.reset();
  }, [flyTo, settings.osmCenterLat, settings.osmCenterLng, settings.osmDefaultZoom, settings.osmRotationDeg, update]);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        flyTo(latitude, longitude, Math.max(settings.osmDefaultZoom, 18));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [flyTo, settings.osmDefaultZoom]);

  // ─── Keyboard shortcuts (minimal — only zoom + reset + floor) ─────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const map = leafletMapRef.current;
      if (!map) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        map.zoomIn(0.5);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        map.zoomOut(0.5);
      } else if (e.key === "0") {
        e.preventDefault();
        resetView();
      } else if (e.key === "Escape") {
        setSelectedBuilding(null);
        setSelectedRoom(null);
      } else if (/^[1-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10);
        if (n <= maxFloor) setSelectedFloor(n);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maxFloor, resetView]);

  // ─── Auto-focus single search hit ──────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim() || searchHits.length !== 1) return;
    const hit = searchHits[0];
    const t = setTimeout(() => {
      if (hit.type === "building") focusBuilding(hit.letter);
      else focusRoom(hit.room);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchHits.length]);

  // ─── Highlight from props ──────────────────────────────────────────────
  useEffect(() => {
    if (highlightLetter) focusBuilding(highlightLetter);
  }, [highlightLetter, focusBuilding]);

  // ─── Panel style ───────────────────────────────────────────────────────
  const panel = cn(
    "rounded-2xl shadow-xl border backdrop-blur-md",
    darkMode ? "bg-gray-900/92 border-gray-700/80" : "bg-white/92 border-gray-200/90"
  );

  // Convert GPS lat/lng back to SVG coords for the location dot
  const lngLatToSvg = useCallback(
    (lat: number, lng: number): [number, number] => {
      const halfLatM = settings.osmCampusSpanMeters / 2;
      const halfLatDeg = halfLatM / 111_320;
      const halfLngDeg =
        (halfLatM * (baseViewBox.w / baseViewBox.h)) /
        (111_320 * Math.cos((settings.osmCenterLat * Math.PI) / 180));
      const fy = (settings.osmCenterLat + halfLatDeg - lat) / (2 * halfLatDeg);
      const fx = (lng - (settings.osmCenterLng - halfLngDeg)) / (2 * halfLngDeg);
      return [
        baseViewBox.x + fx * baseViewBox.w,
        baseViewBox.y + fy * baseViewBox.h,
      ];
    },
    [baseViewBox, settings.osmCenterLat, settings.osmCenterLng, settings.osmCampusSpanMeters]
  );

  // Restricted users are forced to 2D regardless of the saved pitch setting.
  const is3DMode = (settings.osmPitchDeg ?? 0) > 0 && canUse3D;

  // ─── Campus body (rooms only — OSM tiles show buildings) ───────────────
  // 3D feel comes from layered SVG: ground-plane drop shadow per room,
  // right-side parallelogram (sun from upper-left at ≈ 30°), front wall
  // face with a baked vertical gradient + thin highlight strip. The
  // pitch CSS transform on the container does the perspective foreshorten.
  const campusBody = (
    <>
      <defs>
        <filter id="roomGlow">
          <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodOpacity="0.5" />
        </filter>
        <filter id="roomGlow3d">
          <feDropShadow dx="1" dy="3" stdDeviation="3" floodOpacity="0.35" />
        </filter>
        <filter id="wallShadow">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#1e293b" floodOpacity="0.45" />
        </filter>
        {/* Soft ground shadow under buildings — gives them weight. */}
        <filter id="groundShadow3d" x="-30%" y="-20%" width="160%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" />
          <feOffset dx="3" dy="6" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.32" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
        </linearGradient>
      </defs>

      {/* User location dot */}
      {userLocation && (() => {
        const [sx, sy] = lngLatToSvg(userLocation[0], userLocation[1]);
        return (
          <g className="pointer-events-none">
            <circle cx={sx} cy={sy} r={14} fill="rgba(59,130,246,0.12)" />
            <circle cx={sx} cy={sy} r={7} fill="rgba(59,130,246,0.25)" />
            <circle cx={sx} cy={sy} r={5} fill="#3b82f6" stroke="white" strokeWidth={2} />
            <circle cx={sx} cy={sy} r={2} fill="white" />
          </g>
        );
      })()}

      {layers.rooms &&
        floorRooms.map((room) => {
          const x = room.mapPositionX ?? 0;
          const y = room.mapPositionY ?? 0;
          const w = room.width ?? 56;
          const h = room.height ?? 40;
          const fill = getRoomFillColor(room.type, room.currentStatus);
          const isSel = selectedRoom?.id === room.id;
          const isHover = hoveredRoomId === room.id;
          const status = room.currentStatus || "unknown";
          const statusColor =
            ROOM_STATUS_COLORS[status as keyof typeof ROOM_STATUS_COLORS] ?? ROOM_STATUS_COLORS.unknown;

          const isHallway = room.type === "hallway" || room.type === "corridor";

          const metersPerSvgUnit = settings.osmCampusSpanMeters / baseViewBox.w;
          const roomMinPx =
            leafletMetersPerPx && leafletMetersPerPx > 0
              ? (Math.min(w, h) * metersPerSvgUnit) / leafletMetersPerPx
              : 0;
          const showLabel = isSel || isHover || roomMinPx >= 26;
          const iconD = pathForRoomType(room.type);
          const showIcon = !!iconD && roomMinPx >= 60;
          const showStatus = roomMinPx >= 28 && status !== "unknown";
          const iconSize = Math.max(12, Math.min(26, Math.min(w, h) * 0.4));

          if (isHallway) {
            return (
              <g
                key={room.id}
                data-map-feature="room"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredRoomId(room.id)}
                onMouseLeave={() => setHoveredRoomId(null)}
                onClick={(e) => { e.stopPropagation(); focusRoom(room); }}
              >
                <rect
                  x={x} y={y} width={w} height={h} rx={2}
                  fill={isSel ? "rgba(99,102,241,0.25)" : darkMode ? "rgba(100,116,139,0.18)" : "rgba(148,163,184,0.22)"}
                  stroke={isSel ? "#6366f1" : "rgba(148,163,184,0.55)"}
                  strokeWidth={isSel ? 1.5 : 0.7}
                  strokeDasharray={isSel ? undefined : "3,2"}
                />
                {showLabel && (
                  <text
                    x={x + w / 2} y={y + h / 2}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={darkMode ? "rgba(148,163,184,0.85)" : "rgba(100,116,139,0.9)"}
                    fontSize={Math.min(10, Math.max(7, w / 7))} fontWeight="500"
                    className="pointer-events-none"
                    style={{ paintOrder: "stroke", stroke: darkMode ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.6)", strokeWidth: 0.5 }}
                  >
                    {room.roomNumber}
                  </text>
                )}
              </g>
            );
          }

          const floorN = room.floor ?? 1;
          // Pitch-driven extrusion height: more pitch → taller walls so
          // the doll-house effect intensifies as the user tilts the map.
          const pitchScale = is3DMode
            ? 0.7 + (safeNum(settings.osmPitchDeg, 32) / 45) * 0.7
            : 0;
          const wallH = is3DMode ? Math.max(12, (floorN * 9 + 6) * pitchScale) : 0;
          const sideW = is3DMode ? Math.max(5, Math.min(w * 0.14, 11)) : 0;
          // Lighting offsets — sun from upper-left at ~30° elevation.
          const sunDx = 0.5;
          const sunDy = -0.8;

          return (
            <g
              key={room.id}
              data-map-feature="room"
              className="cursor-pointer"
              filter={isSel ? "url(#roomGlow)" : is3DMode ? "url(#groundShadow3d)" : isHover ? "url(#roomGlow3d)" : undefined}
              onMouseEnter={() => setHoveredRoomId(room.id)}
              onMouseLeave={() => setHoveredRoomId(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (e.shiftKey) {
                  setNavTo({ id: room.id, x: x + w / 2, y: y + h / 2, floor: room.floor ?? 1, label: room.roomNumber });
                } else if (e.altKey) {
                  setNavFrom({ id: room.id, x: x + w / 2, y: y + h / 2, floor: room.floor ?? 1, label: room.roomNumber });
                } else {
                  focusRoom(room);
                }
              }}
            >
              {/* ── 3D ground shadow (cast on the campus floor) ─── */}
              {is3DMode && (
                <ellipse
                  cx={x + w / 2 + sunDx * 4}
                  cy={y + h + wallH + 1.5}
                  rx={w * 0.55}
                  ry={Math.max(2, sideW * 0.35)}
                  fill="rgba(15,23,42,0.32)"
                  className="pointer-events-none"
                />
              )}

              {/* ── 3D building extrusion (right side wall) ─── */}
              {is3DMode && sideW > 0 && (
                <polygon
                  points={`${x+w},${y} ${x+w+sideW},${y-sideW*0.55} ${x+w+sideW},${y+h+wallH-sideW*0.55} ${x+w},${y+h+wallH}`}
                  fill={fill}
                  fillOpacity={0.6}
                  style={{ filter: "brightness(0.5) saturate(1.1)" }}
                  className="pointer-events-none"
                />
              )}

              {/* ── 3D back wall (left side, lit by the sun) ─── */}
              {is3DMode && sideW > 0 && (
                <polygon
                  points={`${x},${y} ${x-sideW*0.5},${y-sideW*0.4} ${x-sideW*0.5},${y+h+wallH-sideW*0.4} ${x},${y+h+wallH}`}
                  fill={fill}
                  fillOpacity={0.5}
                  style={{ filter: "brightness(0.78) saturate(1.05)" }}
                  className="pointer-events-none"
                />
              )}

              {/* ── 3D front wall face ─── */}
              {is3DMode && wallH > 0 && (
                <>
                  <rect
                    x={x} y={y + h - 2} width={w} height={wallH + 2}
                    fill={fill} fillOpacity={0.72}
                    className="pointer-events-none"
                  />
                  <rect
                    x={x} y={y + h - 2} width={w} height={wallH + 2}
                    fill="rgba(0,0,0,0.38)"
                    className="pointer-events-none"
                  />
                  {/* wall highlight strip at top edge */}
                  <rect
                    x={x + 1} y={y + h - 2} width={w - 2} height={2}
                    fill="rgba(255,255,255,0.22)"
                    className="pointer-events-none"
                  />
                </>
              )}

              {/* ── Roof (room background) ─── */}
              <rect
                x={x} y={y} width={w} height={h} rx={4}
                fill={fill}
                fillOpacity={isHover || isSel ? 1 : 0.92}
                stroke={isSel ? "#fbbf24" : isHover ? "#fde68a" : darkMode ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.9)"}
                strokeWidth={isSel ? 2.5 : isHover ? 2 : 0.9}
              />

              {/* Inner highlight — gives depth / "floor" feel */}
              {w > 18 && h > 14 && (
                <rect
                  x={x + 2.5} y={y + 2.5} width={w - 5} height={h - 5} rx={2.5}
                  fill={is3DMode ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.14)"}
                  className="pointer-events-none"
                />
              )}

              {/* Icon */}
              {showIcon && iconD && (
                <g
                  transform={`translate(${x + w / 2 - iconSize / 2} ${y + (showLabel ? h / 2 - iconSize - 1 : h / 2 - iconSize / 2)}) scale(${iconSize / 24})`}
                  className="pointer-events-none"
                >
                  <path d={iconD} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              )}

              {/* Label */}
              {showLabel && (
                <text
                  x={x + w / 2}
                  y={y + (showIcon ? h - 7 : h / 2)}
                  textAnchor="middle"
                  dominantBaseline={showIcon ? "auto" : "middle"}
                  fill="#fff"
                  fontSize={Math.min(12, Math.max(8, w / 6))}
                  fontWeight="700"
                  className="pointer-events-none"
                  style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.45)", strokeWidth: 0.8 }}
                >
                  {room.roomNumber}
                </text>
              )}

              {/* Status dot with pulse animation for occupied */}
              {showStatus && (
                <g className="pointer-events-none">
                  {status === "occupied" && (
                    <circle cx={x + w - 5} cy={y + 5} r={5.5} fill={statusColor} fillOpacity={0.3}>
                      <animate attributeName="r" values="4;6.5;4" dur="2.2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;0;0.3" dur="2.2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={x + w - 5} cy={y + 5} r={3.5}
                    fill={statusColor} stroke="rgba(255,255,255,0.95)" strokeWidth={1.2}
                  />
                </g>
              )}
            </g>
          );
        })}
    </>
  );

  const onPickSearchHit = (hit: SearchHit) => {
    // Dismiss mobile keyboard when a result is selected
    (document.activeElement as HTMLElement)?.blur?.();
    if (hit.type === "building") focusBuilding(hit.letter);
    else focusRoom(hit.room);
  };

  // Highlight the matched substring in a label so users see WHY a result
  // came back. Plain string match, case-insensitive — no regex risk.
  const highlight = (label: string, query: string): React.ReactNode => {
    const q = query.trim();
    if (!q) return label;
    const lower = label.toLowerCase();
    const lq = q.toLowerCase();
    const i = lower.indexOf(lq);
    if (i < 0) return label;
    return (
      <>
        {label.slice(0, i)}
        <mark className="bg-yellow-200/80 dark:bg-yellow-500/30 text-current rounded-sm px-0.5">
          {label.slice(i, i + q.length)}
        </mark>
        {label.slice(i + q.length)}
      </>
    );
  };

  // Hard block — render the lockout screen instead of the map.
  if (accessDecision.tier === "blocked") {
    return <AccessLockoutScreen decision={accessDecision} />;
  }

  // Room-level Matterport walkthrough — only opens when the user
  // explicitly taps the 3D-walkthrough link inside a room detail sheet.
  // The map-edge control stack no longer has a tour button.
  if (tourOpen && tourUrl) {
    return <MatterportTour rawUrl={tourUrl} isFi={isFi} onClose={() => setTourOpen(false)} />;
  }

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden bg-[#dde6ef] dark:bg-gray-950 overscroll-contain"
    >
      {/* Restricted-tier banner — explains why the user can't see everything. */}
      {accessDecision.tier === "restricted" && (
        <div
          className="absolute top-0 left-0 right-0 z-50 pointer-events-none flex justify-center"
          style={{ paddingTop: 'max(0.375rem, env(safe-area-inset-top))' }}
        >
          <div className="px-3 py-1 rounded-full bg-amber-500/95 text-white text-[10px] font-semibold shadow-lg pointer-events-auto flex items-center gap-1.5">
            🔒 {accessDecision.reason}
          </div>
        </div>
      )}
      {/* ── Map (the one and only) ─────────────────────────────────── */}
      <OsmBasemap
        svgViewBox={{ x: baseViewBox.x, y: baseViewBox.y, w: baseViewBox.w, h: baseViewBox.h }}
        // Only mount the campus SVG overlay once we actually have rooms to
        // draw — otherwise Leaflet renders an empty positioned SVG box at
        // the campus bounds, which can show through as a "ghost square".
        enableOverlay={(rooms as Room[]).length > 0}
        onOverlayReady={setOverlayEl}
        onReady={(m) => {
          leafletMapRef.current = m;
        }}
        onView={(m) => {
          const z = m.getZoom();
          const lat = m.getCenter().lat;
          const mpp = (156_543.034 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, z);
          setLeafletMetersPerPx(mpp);
        }}
        onTilesLoaded={() => setTilesLoaded(true)}
        className="absolute inset-0"
      />
      {overlayEl && (rooms as Room[]).length > 0 && createPortal(campusBody, overlayEl)}

      {/* Loading skeleton — sits above the tile layer but below all UI
         (z-10 < navbar z-50, dialogs z-50). Fades out on first tile-load. */}
      {!tilesLoaded && (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 z-10 flex items-center justify-center",
            "bg-gradient-to-br",
            darkMode
              ? "from-gray-900/95 to-slate-900/95"
              : "from-slate-100/95 to-blue-50/95",
            "animate-in fade-in duration-300"
          )}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-12 w-12">
              <span className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-900" />
              <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 dark:border-t-blue-400 animate-spin" />
            </div>
            <p className="text-xs font-medium text-muted-foreground tabular-nums">
              {isFi ? "Ladataan karttaa…" : "Loading map…"}
            </p>
          </div>
        </div>
      )}

      {/* ── Search results dropdown — gated by access tier ───────── */}
      {canUseSearch && searchQuery.trim() && (
        <div
          className="absolute left-3 right-16 sm:right-20 z-30 max-w-lg sm:max-w-md mx-auto sm:mx-0"
          style={{
            top: 'max(0.75rem, calc(0.75rem + env(safe-area-inset-top)))',
            maxWidth: 'min(28rem, calc(100vw - 5rem))',
          }}
        >
          <div
            id="search-results-listbox"
            className={cn(panel, "max-h-[60vh] overflow-y-auto overscroll-contain shadow-2xl")}
            role="listbox"
            aria-label={isFi ? "Hakutulokset" : "Search results"}
          >
            {searchHits.length === 0 ? (
              <div className="px-4 py-5 text-center text-sm text-muted-foreground">
                {isFi ? "Ei tuloksia haulla " : "No results for "}
                <span className="font-medium">"{searchQuery}"</span>
              </div>
            ) : (
              searchHits.map((hit) => (
                <button
                  key={`${hit.type}-${hit.id}`}
                  type="button"
                  role="option"
                  aria-selected={false}
                  aria-label={`${hit.type === "building"
                    ? isFi ? "Rakennus" : "Building"
                    : isFi ? "Huone" : "Room"}: ${hit.label}${hit.sub ? ` — ${hit.sub}` : ""}`}
                  className={cn(
                    "w-full px-4 py-3 text-left border-b last:border-0 flex items-center gap-3 transition-colors",
                    darkMode ? "border-gray-700/80 hover:bg-blue-950/40" : "border-gray-100 hover:bg-blue-50/80"
                  )}
                  onClick={() => onPickSearchHit(hit)}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      darkMode ? "bg-blue-500/15" : "bg-blue-50",
                    )}
                    aria-hidden="true"
                  >
                    {hit.type === "building" ? (
                      <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{highlight(hit.label, searchQuery)}</p>
                    <p className="text-xs text-muted-foreground truncate">{hit.sub}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Floor selector (top-right) — segmented pill matching the
       *   hamburger sheet aesthetic: rounded-2xl container, ring-1 for
       *   depth (no heavy shadow), flat KSYK blue for the active floor,
       *   40px tap targets. */}
      <div
        className={cn(
          "absolute right-3 z-30 flex flex-col gap-0.5 p-1.5 rounded-2xl ring-1 backdrop-blur-md",
          darkMode
            ? "bg-gray-900/90 ring-white/10"
            : "bg-white/92 ring-black/5 shadow-sm",
        )}
        style={{ top: 'max(0.75rem, calc(0.75rem + env(safe-area-inset-top)))' }}
        aria-label="Floor selector"
      >
        <p
          className="text-[8px] font-bold uppercase tracking-[0.2em] text-center text-muted-foreground leading-none py-0.5"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {isFi ? "KRS" : "FL"}
        </p>
        {Array.from({ length: maxFloor }, (_, i) => maxFloor - i).map((floor) => (
          <button
            key={floor}
            type="button"
            aria-label={`${isFi ? "Kerros" : "Floor"} ${floor}`}
            aria-pressed={selectedFloor === floor}
            onClick={() => setSelectedFloor(floor)}
            className={cn(
              "min-w-[40px] h-10 px-1 rounded-xl text-sm font-bold transition-colors duration-150 leading-none tabular-nums flex items-center justify-center",
              selectedFloor === floor
                ? "bg-blue-600 text-white"
                : darkMode
                  ? "text-gray-300 hover:bg-blue-500/10 hover:text-white active:bg-blue-500/15"
                  : "text-gray-600 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100",
            )}
          >
            {floor}
          </button>
        ))}
      </div>

      {/* ── Map controls — 3D + Center only. Matches the hamburger
       *   sheet aesthetic: rounded-2xl, ring-1 depth, single blue
       *   accent. 44x44px tap targets clear Apple/Google guidance. */}
      <div
        className="absolute right-3 z-40 flex flex-col gap-2"
        style={{ bottom: 'max(6rem, calc(5rem + env(safe-area-inset-bottom)))' }}
      >
        {/* 3D toggle — flips osmPitchDeg. Toggles inline extrusion on
         *  the live Leaflet map (perspective + walled rooms). */}
        {canUse3D && (
          <button
            type="button"
            aria-label={is3DMode ? (isFi ? "Vaihda 2D-näkymään" : "Switch to flat 2D") : (isFi ? "Vaihda 3D-näkymään" : "Switch to 3D view")}
            aria-pressed={is3DMode}
            onClick={() => update("osmPitchDeg", is3DMode ? 0 : 32)}
            title={is3DMode ? (isFi ? "2D-tasanäkymä" : "Flat 2D view") : (isFi ? "3D-näkymä" : "3D view")}
            className={cn(
              "w-11 h-11 rounded-2xl ring-1 backdrop-blur-md flex items-center justify-center transition-colors active:scale-[0.97]",
              is3DMode
                ? "bg-blue-600 text-white ring-blue-700/40"
                : darkMode
                  ? "bg-gray-900/90 ring-white/10 text-gray-200 hover:bg-blue-500/10 hover:text-blue-300"
                  : "bg-white/95 ring-black/5 text-gray-700 hover:bg-blue-50 hover:text-blue-700 shadow-sm",
            )}
          >
            <span className="text-[11px] font-bold tabular-nums">
              {is3DMode ? "3D" : "2D"}
            </span>
          </button>
        )}

        {/* Center / reset view */}
        <button
          type="button"
          aria-label={isFi ? "Keskitä" : "Center"}
          onClick={resetView}
          title={isFi ? "Palauta näkymä" : "Center map"}
          className={cn(
            "w-11 h-11 rounded-2xl ring-1 backdrop-blur-md flex items-center justify-center transition-colors active:scale-[0.97]",
            darkMode
              ? "bg-gray-900/90 ring-white/10 text-gray-200 hover:bg-blue-500/10 hover:text-blue-300"
              : "bg-white/95 ring-black/5 text-gray-700 hover:bg-blue-50 hover:text-blue-700 shadow-sm",
          )}
        >
          <Crosshair className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* 3D mode info chip + desktop nav hint removed — the user asked
       *  for a clean canvas: 4 controls + floor selector only. The 3D
       *  button colour already reflects the toggle state. */}

      {/* ── Nav bar — hidden if routing is disabled ──────────────── */}
      {canUseRouting && (navFrom || navTo) && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-30 max-w-md w-[min(95%,28rem)] pointer-events-auto"
          style={{ top: 'max(0.75rem, calc(0.75rem + env(safe-area-inset-top)))' }}
        >
          <div className={cn(panel, "p-3 flex items-center gap-2 shadow-2xl")}>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-200 dark:ring-blue-900 shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0">{isFi ? "Lähtö" : "From"}</span>
                <span className="text-sm font-semibold truncate flex-1">
                  {navFrom ? `${navFrom.label} · ${isFi ? "K." : "Fl."}${navFrom.floor}` : isFi ? "— valitse —" : "— pick —"}
                </span>
                {navFrom && (
                  <button onClick={() => setNavFrom(null)} className="text-muted-foreground hover:text-foreground" aria-label="Clear start">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-200 dark:ring-red-900 shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0">{isFi ? "Määränpää" : "To"}</span>
                <span className="text-sm font-semibold truncate flex-1">
                  {navTo ? `${navTo.label} · ${isFi ? "K." : "Fl."}${navTo.floor}` : isFi ? "— valitse —" : "— pick —"}
                </span>
                {navTo && (
                  <button onClick={() => setNavTo(null)} className="text-muted-foreground hover:text-foreground" aria-label="Clear destination">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            {navFrom && navTo && (
              <div className="text-right text-xs font-mono shrink-0">
                <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                  {Math.round(Math.hypot(navTo.x - navFrom.x, navTo.y - navFrom.y) * 0.1)} m
                </div>
                {navFrom.floor !== navTo.floor && (
                  <div className="text-muted-foreground">{isFi ? "+ portaat" : "+ stairs"}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Building bottom sheet ──────────────────────────────────── */}
      {selectedBuilding && (
        <div className="absolute bottom-0 left-0 right-0 z-30 sm:bottom-auto sm:top-3 sm:left-3 sm:right-auto sm:max-w-sm pointer-events-none map-room-sheet"
             style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4rem)' }}>
          <Card className={cn(panel, "pointer-events-auto rounded-t-3xl sm:rounded-2xl border-t-4 border-blue-500 shadow-2xl overflow-y-auto overscroll-contain sm:max-h-none")}
                style={{ maxHeight: 'min(60dvh, calc(100vh - 7rem))' }}>
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mt-3 sm:hidden" />
            <CardContent className="p-5 pt-3 sm:pt-5">
              <div className="flex justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-xl font-bold">
                    {(isFi ? selectedBuilding.nameFi : selectedBuilding.nameEn) ?? selectedBuilding.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedBuilding.floors} {isFi ? "kerrosta" : "floors"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedBuilding(null)} aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button className="w-full" onClick={() => focusBuilding(selectedBuilding.name)}>
                <MapPin className="h-4 w-4 mr-2" />
                {isFi ? "Keskitä kartta" : "Center on map"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Room bottom sheet ──────────────────────────────────────── */}
      {selectedRoom && (
        <div className="absolute bottom-0 left-0 right-0 z-30 sm:bottom-auto sm:top-3 sm:left-3 sm:right-auto sm:max-w-sm pointer-events-none map-room-sheet"
             style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4rem)' }}>
          <Card
            className={cn(
              panel,
              "pointer-events-auto rounded-t-3xl sm:rounded-2xl border-t-4 shadow-2xl sm:max-h-none overflow-y-auto overscroll-contain",
              selectedRoom.currentStatus === "free"
                ? "border-emerald-500"
                : selectedRoom.currentStatus === "occupied"
                ? "border-red-500"
                : selectedRoom.currentStatus === "maintenance"
                ? "border-purple-500"
                : "border-amber-500"
            )}
            style={{ maxHeight: 'min(78dvh, calc(100vh - 7rem))' }}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mt-3 sm:hidden" />
            <CardContent className="p-5 pt-3 sm:pt-5">
              {/* Header */}
              <div className="flex justify-between gap-2 mb-4">
                <div className="flex gap-3 min-w-0">
                  <span
                    className="shrink-0 flex h-13 w-13 items-center justify-center rounded-2xl text-white font-bold text-sm shadow-lg ring-2 ring-white/20"
                    style={{ backgroundColor: getRoomStatusColor(selectedRoom.currentStatus), minWidth: "3.25rem", height: "3.25rem" }}
                  >
                    <span className="text-xs font-extrabold leading-none">{selectedRoom.roomNumber}</span>
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold truncate leading-tight">
                      {selectedRoom.name || selectedRoom.nameEn || selectedRoom.roomNumber}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: getRoomStatusColor(selectedRoom.currentStatus) }}
                      />
                      {roomStatusLabel(selectedRoom.currentStatus, isFi)}
                      {selectedRoom.type && (
                        <>
                          <span className="opacity-40">·</span>
                          <span className="capitalize">{selectedRoom.type}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedRoom(null)} aria-label="Close" className="shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Info chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                  darkMode ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-700"
                )}>
                  <Building2 className="h-3 w-3 opacity-60" />
                  {isFi ? "Kerros" : "Floor"} {selectedRoom.floor}
                </span>
                {selectedRoom.capacity != null && (
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                    darkMode ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-700"
                  )}>
                    <Users className="h-3 w-3 opacity-60" />
                    {selectedRoom.capacity}
                  </span>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="grid grid-cols-2 gap-2 mb-1">
                <Button
                  variant="outline"
                  className="text-xs h-9 gap-1.5"
                  onClick={() =>
                    setNavFrom({
                      id: selectedRoom.id,
                      x: (selectedRoom.mapPositionX ?? 0) + (selectedRoom.width ?? 60) / 2,
                      y: (selectedRoom.mapPositionY ?? 0) + (selectedRoom.height ?? 40) / 2,
                      floor: selectedRoom.floor ?? 1,
                      label: selectedRoom.roomNumber,
                    })
                  }
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {isFi ? "Lähtöpiste" : "Start here"}
                </Button>
                <Button
                  className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                  onClick={() =>
                    setNavTo({
                      id: selectedRoom.id,
                      x: (selectedRoom.mapPositionX ?? 0) + (selectedRoom.width ?? 60) / 2,
                      y: (selectedRoom.mapPositionY ?? 0) + (selectedRoom.height ?? 40) / 2,
                      floor: selectedRoom.floor ?? 1,
                      label: selectedRoom.roomNumber,
                    })
                  }
                >
                  <Navigation className="h-3.5 w-3.5" />
                  {isFi ? "Reititä tänne" : "Route here"}
                </Button>
              </div>

              {/* ── Per-room Matterport 3D walkthrough — only when admin
                   set a URL on this specific room in the builder. */}
              {(selectedRoom.virtualTourUrl ?? "").trim() && (
                <button
                  type="button"
                  onClick={() => {
                    // Reuse the existing tour overlay state — temporarily
                    // override the URL with this room's URL.
                    const url = (selectedRoom.virtualTourUrl ?? "").trim();
                    if (!url) return;
                    update("matterportTourUrl", url);
                    setTourOpen(true);
                  }}
                  className="mt-2 w-full h-9 rounded-lg gap-2 text-xs font-semibold inline-flex items-center justify-center transition-colors bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20"
                >
                  <Mountain className="h-3.5 w-3.5" />
                  {isFi ? "3D-virtuaalikierros" : "3D walkthrough"}
                </button>
              )}

              {/* ── Schedule section ─────────────────────────────────── */}
              <div className={cn("border-t pt-3 -mx-5 px-5", darkMode ? "border-gray-700/60" : "border-gray-100")}>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {isFi ? "Tänään" : "Today"}
                  </span>
                  {scheduleLoading && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </div>

                {!scheduleLoading && roomSchedule?.dayOfWeek === null && (
                  <p className="text-xs text-muted-foreground">
                    {isFi ? "Viikonloppu — ei lukujärjestystä." : "Weekend — no schedule."}
                  </p>
                )}

                {!scheduleLoading && roomSchedule?.dayOfWeek !== null && roomSchedule?.schedule.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    <span>{isFi ? "Ei tunteja tänään." : "No classes scheduled today."}</span>
                  </div>
                )}

                {roomSchedule?.schedule && roomSchedule.schedule.length > 0 && (
                  <div className="space-y-1.5">
                    {roomSchedule.schedule.slice(0, 5).map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(
                          "flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-xs",
                          entry.isCurrent
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50"
                            : entry.isNext
                            ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50"
                            : darkMode
                            ? "bg-gray-800/50"
                            : "bg-gray-50"
                        )}
                      >
                        <div className={cn(
                          "shrink-0 font-mono text-[10px] font-bold leading-tight mt-0.5 min-w-[3.5rem]",
                          entry.isCurrent ? "text-emerald-700 dark:text-emerald-400" : entry.isNext ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground"
                        )}>
                          {entry.startTime}<br />{entry.endTime}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate leading-tight">{entry.subject ?? (isFi ? "Tunti" : "Class")}</p>
                          {entry.teacher && <p className="text-muted-foreground truncate mt-0.5">{entry.teacher}</p>}
                        </div>
                        {entry.isCurrent && (
                          <span className="shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500 text-white leading-none mt-0.5">
                            {isFi ? "NYT" : "NOW"}
                          </span>
                        )}
                        {entry.isNext && !entry.isCurrent && (
                          <span className="shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-blue-500 text-white leading-none mt-0.5">
                            {isFi ? "SEU" : "NEXT"}
                          </span>
                        )}
                      </div>
                    ))}
                    {roomSchedule.schedule.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center pt-0.5">
                        +{roomSchedule.schedule.length - 5} {isFi ? "lisää" : "more"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
