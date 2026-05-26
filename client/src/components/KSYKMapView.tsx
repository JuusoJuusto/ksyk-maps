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
import {
  parseBuildingShape,
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
import { useAppSettings } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Minus,
  X,
  Layers,
  MapPin,
  Building2,
  Users,
  Compass,
  LocateFixed,
  Maximize,
  Minimize,
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
}

interface KSYKMapViewProps {
  searchQuery?: string;
  highlightLetter?: string | null;
}

type SearchHit =
  | { type: "building"; id: string; label: string; sub: string; letter: string }
  | { type: "room"; id: string; label: string; sub: string; room: Room };

type RoomPt = { id: string; x: number; y: number; floor: number; label: string };

export default function KSYKMapView({ searchQuery = "", highlightLetter = null }: KSYKMapViewProps) {
  const { i18n } = useTranslation();
  const { darkMode } = useDarkMode();
  const { settings } = useAppSettings();
  const isFi = i18n.language === "fi";

  // UI state
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const [layers, setLayers] = useState({ rooms: true, labels: true });
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);

  // Leaflet plumbing
  const wrapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const [overlayEl, setOverlayEl] = useState<SVGSVGElement | null>(null);
  const [leafletMetersPerPx, setLeafletMetersPerPx] = useState<number | null>(null);

  // Geolocation / fullscreen
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Room-to-room navigation
  const [navFrom, setNavFrom] = useState<RoomPt | null>(null);
  const [navTo, setNavTo] = useState<RoomPt | null>(null);

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
  const flyTo = useCallback(
    (lat: number, lng: number, zoom?: number) => {
      const map = leafletMapRef.current;
      if (!map) return;
      const targetZoom = Math.max(zoom ?? settings.osmDefaultZoom, settings.osmDefaultZoom);
      map.flyTo([lat, lng], targetZoom, { duration: 0.55 });
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
    },
    [campusBuildings, svgToLatLng, flyTo, settings.osmDefaultZoom]
  );

  const resetView = useCallback(() => {
    flyTo(settings.osmCenterLat, settings.osmCenterLng, settings.osmDefaultZoom);
    setSelectedBuilding(null);
    setSelectedRoom(null);
  }, [flyTo, settings.osmCenterLat, settings.osmCenterLng, settings.osmDefaultZoom]);

  // ─── Geolocation ───────────────────────────────────────────────────────
  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocateError(isFi ? "Selain ei tue paikannusta" : "Geolocation not supported");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLocating(false);
        flyTo(pos.coords.latitude, pos.coords.longitude, Math.max(settings.osmDefaultZoom, 19));
      },
      (err) => {
        setLocating(false);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? isFi
              ? "Paikannuslupa evätty"
              : "Location permission denied"
            : err.code === err.POSITION_UNAVAILABLE
            ? isFi
              ? "Sijaintia ei saatavilla"
              : "Position unavailable"
            : isFi
            ? "Aikakatkaisu"
            : "Timed out";
        setLocateError(msg);
        setTimeout(() => setLocateError(null), 3500);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
    );
  }, [isFi, flyTo, settings.osmDefaultZoom]);

  // Live user-location dot on the Leaflet map (lazy-imports Leaflet so the
  // initial bundle doesn't change).
  const userPinRef = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;
    if (!userLocation) {
      userPinRef.current?.remove();
      userPinRef.current = null;
      return;
    }
    let cancelled = false;
    void import("leaflet").then((Lmod) => {
      if (cancelled) return;
      const Lreal = (Lmod as unknown as { default: typeof L }).default ?? (Lmod as unknown as typeof L);
      userPinRef.current?.remove();
      const grp = Lreal.layerGroup();
      Lreal.circle([userLocation.lat, userLocation.lng], {
        radius: Math.max(8, Math.min(40, userLocation.accuracy)),
        color: "#2563eb",
        weight: 1,
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
      }).addTo(grp);
      Lreal.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 7,
        color: "#fff",
        weight: 2.5,
        fillColor: "#2563eb",
        fillOpacity: 1,
      }).addTo(grp);
      grp.addTo(map);
      userPinRef.current = grp;
    });
    return () => {
      cancelled = true;
      userPinRef.current?.remove();
      userPinRef.current = null;
    };
  }, [userLocation]);

  // ─── Fullscreen ────────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  }, []);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────
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
      } else if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maxFloor, resetView, toggleFullscreen]);

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

  // ─── Campus body (rooms only — OSM tiles show buildings) ───────────────
  const campusBody = (
    <>
      <defs>
        <filter id="roomGlow">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.4" />
        </filter>
      </defs>

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

          // Compute on-screen pixel size at the current Leaflet zoom so we can
          // density-gate labels and icons.
          const metersPerSvgUnit = settings.osmCampusSpanMeters / baseViewBox.w;
          const roomMinPx =
            leafletMetersPerPx && leafletMetersPerPx > 0
              ? (Math.min(w, h) * metersPerSvgUnit) / leafletMetersPerPx
              : 0;
          const showLabel = isSel || isHover || roomMinPx >= 26;
          const iconD = pathForRoomType(room.type);
          const showIcon = !!iconD && roomMinPx >= 60;
          const showStatus = roomMinPx >= 32 && status !== "unknown";
          const iconSize = Math.max(12, Math.min(26, Math.min(w, h) * 0.4));

          return (
            <g
              key={room.id}
              data-map-feature="room"
              className="cursor-pointer"
              filter={isSel || isHover ? "url(#roomGlow)" : undefined}
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
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={4}
                fill={fill}
                fillOpacity={isHover || isSel ? 1 : 0.88}
                stroke={isSel ? "#fbbf24" : isHover ? "#fde68a" : darkMode ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.95)"}
                strokeWidth={isSel ? 2.5 : isHover ? 1.8 : 1}
              />
              {showIcon && iconD && (
                <g
                  transform={`translate(${x + w / 2 - iconSize / 2} ${y + (showLabel ? h / 2 - iconSize - 1 : h / 2 - iconSize / 2)}) scale(${iconSize / 24})`}
                  className="pointer-events-none"
                >
                  <path d={iconD} fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              )}
              {showLabel && (
                <text
                  x={x + w / 2}
                  y={y + (showIcon ? h - 7 : h / 2)}
                  textAnchor="middle"
                  dominantBaseline={showIcon ? "auto" : "middle"}
                  fill="#fff"
                  fontSize={Math.min(12, Math.max(9, w / 6))}
                  fontWeight="700"
                  className="pointer-events-none"
                  style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.4)", strokeWidth: 0.7 }}
                >
                  {room.roomNumber}
                </text>
              )}
              {showStatus && (
                <circle
                  cx={x + w - 5}
                  cy={y + 5}
                  r={3.5}
                  fill={statusColor}
                  stroke="rgba(255,255,255,0.92)"
                  strokeWidth={1}
                  className="pointer-events-none"
                />
              )}
            </g>
          );
        })}
    </>
  );

  const onPickSearchHit = (hit: SearchHit) => {
    if (hit.type === "building") focusBuilding(hit.letter);
    else focusRoom(hit.room);
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden bg-[#dde6ef] dark:bg-gray-950"
    >
      {/* ── Map (the one and only) ─────────────────────────────────── */}
      <OsmBasemap
        svgViewBox={{ x: baseViewBox.x, y: baseViewBox.y, w: baseViewBox.w, h: baseViewBox.h }}
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
        className="absolute inset-0"
      />
      {overlayEl && createPortal(campusBody, overlayEl)}

      {/* ── Search results dropdown ────────────────────────────────── */}
      {searchQuery.trim() && (
        <div className="absolute top-3 left-3 right-16 sm:right-20 z-30 max-w-lg sm:max-w-md mx-auto sm:mx-0">
          <div className={cn(panel, "max-h-[60vh] overflow-y-auto shadow-2xl")}>
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
                  className={cn(
                    "w-full px-4 py-3 text-left border-b last:border-0 flex items-center gap-3 transition-colors",
                    darkMode ? "border-gray-700/80 hover:bg-blue-950/40" : "border-gray-100 hover:bg-blue-50/80"
                  )}
                  onClick={() => onPickSearchHit(hit)}
                >
                  {hit.type === "building" ? (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
                      <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </span>
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                      <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{hit.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{hit.sub}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Floor selector (top-right) ─────────────────────────────── */}
      <div className="absolute top-3 right-3 z-20 flex flex-col rounded-2xl overflow-hidden shadow-lg border border-gray-200/80 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95">
        <Button
          variant="ghost"
          size="sm"
          className="w-11 h-9 rounded-none"
          onClick={() => setSelectedFloor((f) => Math.min(f + 1, maxFloor))}
          disabled={selectedFloor >= maxFloor}
          aria-label="Floor up"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <div className="w-11 h-10 flex items-center justify-center font-bold text-sm bg-blue-600 text-white border-y border-blue-700" aria-live="polite">
          {selectedFloor}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-11 h-9 rounded-none"
          onClick={() => setSelectedFloor((f) => Math.max(f - 1, 0))}
          disabled={selectedFloor <= 0}
          aria-label="Floor down"
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Layers panel (bottom-left, above Leaflet scale) ────────── */}
      <div className="absolute left-3 bottom-[max(7rem,calc(2.5rem+env(safe-area-inset-bottom)))] sm:bottom-12 z-20">
        <Button
          variant="outline"
          className={cn(panel, "h-10 px-3 gap-2")}
          onClick={() => setShowLayers((s) => !s)}
          aria-expanded={showLayers}
        >
          <Layers className="h-4 w-4" />
          <span className="text-sm font-medium">{isFi ? "Tasot" : "Layers"}</span>
        </Button>
        {showLayers && (
          <div className={cn(panel, "absolute bottom-12 left-0 p-3 space-y-2 min-w-[10rem]")}>
            {([["rooms", isFi ? "Tilat" : "Rooms"], ["labels", isFi ? "Nimiöt" : "Labels"]] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
                  className="rounded"
                />
                {label}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ── Floating controls (right column, above Leaflet's zoom) ── */}
      <div className="absolute right-3 bottom-[max(8.5rem,calc(4rem+env(safe-area-inset-bottom)))] sm:bottom-28 z-20 flex flex-col items-end gap-2">
        <div className={cn(panel, "w-11 h-11 flex items-center justify-center")} title={isFi ? "Pohjoinen ylös" : "North up"}>
          <Compass className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label={isFi ? "Paikanna minut" : "Locate me"}
          className={cn(panel, "w-11 h-11 p-0", locating && "animate-pulse")}
          onClick={locateMe}
          disabled={locating}
          title={isFi ? "Paikanna minut" : "My location"}
        >
          <LocateFixed className={cn("h-4 w-4", userLocation && "text-blue-600 dark:text-blue-400")} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={isFullscreen ? (isFi ? "Sulje koko näyttö" : "Exit fullscreen") : (isFi ? "Koko näyttö" : "Fullscreen")}
          className={cn(panel, "w-11 h-11 p-0")}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={isFi ? "Palauta näkymä" : "Reset view"}
          className={cn(panel, "w-11 h-11 p-0")}
          onClick={resetView}
          title="Reset (0)"
        >
          <MapPin className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Locate error toast ─────────────────────────────────────── */}
      {locateError && (
        <div
          role="alert"
          className="absolute top-[4.5rem] right-3 z-40 max-w-xs px-3 py-2 rounded-xl bg-red-500/95 text-white text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-2"
        >
          {locateError}
        </div>
      )}

      {/* ── Nav bar ────────────────────────────────────────────────── */}
      {(navFrom || navTo) && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-md w-[min(95%,28rem)] pointer-events-auto">
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
        <div className="absolute bottom-0 left-0 right-0 z-30 sm:bottom-auto sm:top-20 sm:left-3 sm:right-auto sm:max-w-sm pointer-events-none">
          <Card className={cn(panel, "pointer-events-auto rounded-t-3xl sm:rounded-2xl border-t-4 border-blue-500 shadow-2xl")}>
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mt-3 sm:hidden" />
            <CardContent className="p-5 pt-3 sm:pt-5">
              <div className="flex justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-xl font-bold">{isFi ? selectedBuilding.nameFi : selectedBuilding.nameEn}</h3>
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
        <div className="absolute bottom-0 left-0 right-0 z-30 sm:bottom-auto sm:top-20 sm:left-3 sm:right-auto sm:max-w-sm pointer-events-none">
          <Card
            className={cn(
              panel,
              "pointer-events-auto rounded-t-3xl sm:rounded-2xl border-t-4 shadow-2xl",
              selectedRoom.currentStatus === "free"
                ? "border-emerald-500"
                : selectedRoom.currentStatus === "occupied"
                ? "border-red-500"
                : "border-amber-500"
            )}
          >
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mt-3 sm:hidden" />
            <CardContent className="p-5 pt-3 sm:pt-5">
              <div className="flex justify-between gap-2 mb-3">
                <div className="flex gap-3 min-w-0">
                  <span
                    className="shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl text-white font-bold text-sm shadow-md"
                    style={{ backgroundColor: getRoomStatusColor(selectedRoom.currentStatus) }}
                  >
                    {selectedRoom.roomNumber}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold truncate">
                      {selectedRoom.name || selectedRoom.nameEn || selectedRoom.roomNumber}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isFi ? "Kerros" : "Floor"} {selectedRoom.floor}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedRoom(null)} aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isFi ? "Tila" : "Status"}</span>
                  <span className="font-medium px-2 py-0.5 rounded-full bg-muted">
                    {roomStatusLabel(selectedRoom.currentStatus, isFi)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {isFi ? "Kapasiteetti" : "Capacity"}
                  </span>
                  <span className="font-medium">{selectedRoom.capacity ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isFi ? "Kerros" : "Floor"}</span>
                  <span className="font-medium">{selectedRoom.floor}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="text-xs"
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
                  {isFi ? "Lähtöpiste" : "Set start"}
                </Button>
                <Button
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
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
                  {isFi ? "Reititä tänne" : "Route here"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
