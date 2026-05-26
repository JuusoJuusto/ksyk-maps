/**
 * KSYK Maps — MazeMap-style campus map
 * Wing outlines + floor-based rooms + floating controls + bottom sheets
 * - Single search source (from top bar); rooms deduped by id, ranked by relevance
 * - Scale bar, compass, keyboard shortcuts (+/-/0/Esc/1-9 floor jump)
 */

import { useState, useEffect, useMemo, useRef } from "react";
import {
  parseBuildingShape,
  getShapeBounds,
  computeCampusViewBox,
  parseViewBox,
  formatViewBox,
  type BuildingMapData,
} from "@/lib/mapGeometry";
import {
  KSYK_BUILDING_OUTLINES,
  getBuildingLetter,
  outlineToPath,
  outlinesAsMapBuildings,
  viewBoxForOutline,
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
  ChevronRight,
  Users,
  Compass,
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

export default function KSYKMapView({ searchQuery = "", highlightLetter = null }: KSYKMapViewProps) {
  const { i18n } = useTranslation();
  const { darkMode } = useDarkMode();
  const { settings } = useAppSettings();
  const isFi = i18n.language === "fi";

  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const [layers, setLayers] = useState({ rooms: true, wings: true, labels: true });
  const [hoveredWing, setHoveredWing] = useState<string | null>(null);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);

  const [viewState, setViewState] = useState({ x: 0, y: 0, w: 1600, h: 900 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ clientX: 0, clientY: 0, view: { x: 0, y: 0, w: 1600, h: 900 } });
  const pinchStart = useRef<{ distance: number; view: typeof viewState } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<number | null>(null);

  // Nav state (room-to-room routing)
  type RoomPt = { id: string; x: number; y: number; floor: number; label: string };
  const [navFrom, setNavFrom] = useState<RoomPt | null>(null);
  const [navTo, setNavTo] = useState<RoomPt | null>(null);

  // Smoothly tween viewBox towards a target — easeOutCubic over ~260ms
  const tweenView = (target: { x: number; y: number; w: number; h: number }, ms = 260) => {
    if (tweenRef.current) cancelAnimationFrame(tweenRef.current);
    const start = { ...viewState };
    const t0 = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      const k = ease(t);
      setViewState({
        x: start.x + (target.x - start.x) * k,
        y: start.y + (target.y - start.y) * k,
        w: start.w + (target.w - start.w) * k,
        h: start.h + (target.h - start.h) * k,
      });
      if (t < 1) tweenRef.current = requestAnimationFrame(step);
      else tweenRef.current = null;
    };
    tweenRef.current = requestAnimationFrame(step);
  };

  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const r = await fetch("/api/buildings");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 60000,
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: async () => {
      const r = await fetch("/api/rooms");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60000,
  });

  const campusBuildings = useMemo(() => {
    const apiByLetter = new Map<string, Building>();
    for (const b of buildings as Building[]) {
      const letter = getBuildingLetter(b.name);
      if (letter) apiByLetter.set(letter, b);
    }
    return outlinesAsMapBuildings().map((preset) => {
      const letter = preset.name;
      const api = apiByLetter.get(letter);
      const outline = KSYK_BUILDING_OUTLINES[letter];
      return {
        ...api,
        id: api?.id ?? preset.id,
        name: letter,
        nameEn: outline.nameEn,
        nameFi: outline.nameFi,
        floors: api?.floors ?? outline.floors,
        colorCode: outline.stroke,
        description: JSON.stringify({ customShape: outline.shape }),
      } as Building;
    });
  }, [buildings]);

  const maxFloor = useMemo(() => {
    const fromRooms = rooms.map((r) => r.floor ?? 0);
    const fromWings = campusBuildings.map((b) => b.floors ?? 1);
    return Math.max(1, ...fromRooms, ...fromWings, 3);
  }, [rooms, campusBuildings]);

  const floorRooms = useMemo(
    () =>
      rooms.filter(
        (r) =>
          r.floor === selectedFloor &&
          r.mapPositionX != null &&
          r.mapPositionY != null
      ),
    [rooms, selectedFloor]
  );

  const searchHits = useMemo((): SearchHit[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    // Score a candidate: exact match > startsWith > includes (higher is better).
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
      const label = isFi ? b.nameFi : b.nameEn;
      const s = Math.max(
        score(b.name),
        score(label),
        score(b.nameEn),
        score(b.nameFi)
      );
      if (s > 0) {
        scored.push({
          score: s + 5, // tiny bias so buildings appear above same-score rooms
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

    // Dedupe rooms by id (defends against API double-inserts)
    const seenRoomIds = new Set<string>();
    for (const r of rooms) {
      if (!r.id || seenRoomIds.has(r.id)) continue;
      const s = Math.max(
        score(r.roomNumber),
        score(r.name),
        score(r.nameEn),
        score(r.nameFi)
      );
      if (s > 0) {
        seenRoomIds.add(r.id);
        const floorLabel = `${isFi ? "Kerros" : "Floor"} ${r.floor ?? 1}`;
        scored.push({
          score: s,
          hit: {
            type: "room",
            id: r.id,
            label: r.roomNumber,
            sub: [r.name || r.nameEn, floorLabel].filter(Boolean).join(" · "),
            room: r,
          },
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map((x) => x.hit);
  }, [searchQuery, campusBuildings, rooms, isFi]);

  const baseViewBox = useMemo(
    () => parseViewBox(computeCampusViewBox(outlinesAsMapBuildings() as BuildingMapData[])),
    []
  );

  const campusPlate = useMemo(
    () => ({
      x: baseViewBox.x - 48,
      y: baseViewBox.y - 48,
      w: baseViewBox.width + 96,
      h: baseViewBox.height + 96,
    }),
    [baseViewBox]
  );

  useEffect(() => {
    setViewState(baseViewBox);
  }, [baseViewBox]);

  const focusRoom = (room: Room) => {
    setSelectedRoom(room);
    setSelectedBuilding(null);
    setSelectedFloor(room.floor ?? 1);
    const x = room.mapPositionX ?? 0;
    const y = room.mapPositionY ?? 0;
    const w = room.width ?? 80;
    const h = room.height ?? 60;
    const pad = 120;
    tweenView({ x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2 });
  };

  const zoomFactor = settings.mapZoomSpeed === 2 ? 0.88 : settings.mapZoomSpeed === 0.5 ? 0.96 : 0.92;

  const zoomView = (factor: number) => {
    setViewState((v) => {
      const cx = v.x + v.w / 2;
      const cy = v.y + v.h / 2;
      const nw = Math.min(Math.max(v.w * factor, 280), 5000);
      const nh = Math.min(Math.max(v.h * factor, 200), 3500);
      return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
    });
  };

  const focusBuilding = (letter: string) => {
    const preset = KSYK_BUILDING_OUTLINES[letter];
    const b = campusBuildings.find((x) => x.name === letter);
    if (preset) tweenView(viewBoxForOutline(preset.shape, 160));
    if (b) setSelectedBuilding(b);
    setSelectedRoom(null);
  };

  const touchDistance = (touches: React.TouchList | TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomView(e.deltaY > 0 ? 2 - zoomFactor : zoomFactor);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomFactor]);

  const handlePanStart = (clientX: number, clientY: number) => {
    setIsPanning(true);
    panStart.current = { clientX, clientY, view: { ...viewState } };
  };

  const applyPan = (clientX: number, clientY: number) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = panStart.current.view.w / rect.width;
    const scaleY = panStart.current.view.h / rect.height;
    setViewState({
      ...panStart.current.view,
      x: panStart.current.view.x - (clientX - panStart.current.clientX) * scaleX,
      y: panStart.current.view.y - (clientY - panStart.current.clientY) * scaleY,
    });
  };

  useEffect(() => {
    if (!isPanning) return;
    const onMove = (e: MouseEvent) => applyPan(e.clientX, e.clientY);
    const onUp = () => setIsPanning(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPanning]);

  const panel = cn(
    "rounded-2xl shadow-xl border backdrop-blur-md",
    darkMode ? "bg-gray-900/92 border-gray-700/80" : "bg-white/92 border-gray-200/90"
  );

  const onPickSearchHit = (hit: SearchHit) => {
    if (hit.type === "building") {
      focusBuilding(hit.letter);
    } else {
      focusRoom(hit.room);
    }
  };

  // Keyboard shortcuts (MazeMap-style)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomView(zoomFactor);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomView(2 - zoomFactor);
      } else if (e.key === "0") {
        e.preventDefault();
        tweenView(baseViewBox);
      } else if (e.key === "Escape") {
        setSelectedBuilding(null);
        setSelectedRoom(null);
      } else if (/^[0-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10);
        if (n >= 0 && n <= maxFloor) setSelectedFloor(n);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [baseViewBox, zoomFactor, maxFloor]);

  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Scale bar: compute the world-units length corresponding to ~120 screen px
  const scaleBarMeters = useMemo(() => {
    if (!containerWidth) return { px: 100, label: "—" };
    const unitsPerPx = viewState.w / containerWidth;
    // 1 world-unit ≈ 0.1 m (calibrated to KSYK outline scale)
    const targetPx = 120;
    const worldUnits = targetPx * unitsPerPx;
    const meters = worldUnits * 0.1;
    const buckets = [1, 2, 5, 10, 20, 50, 100, 200, 500];
    const nice = buckets.reduce((p, c) => (Math.abs(c - meters) < Math.abs(p - meters) ? c : p), buckets[0]);
    const px = (nice / 0.1) / unitsPerPx;
    return { px: Math.max(40, Math.min(220, px)), label: `${nice} m` };
  }, [viewState, containerWidth]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Search results — MazeMap-style dropdown anchored to top bar */}
      {searchQuery.trim() && (
        <div className="absolute top-2 left-2 right-14 sm:right-16 z-30 max-w-lg mx-auto sm:mx-0">
          <div className={cn(panel, "max-h-72 overflow-y-auto shadow-2xl")}>
            {searchHits.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                {isFi ? "Ei tuloksia haulla " : "No results for "}<span className="font-medium">“{searchQuery}”</span>
              </div>
            ) : (
              searchHits.map((hit) => (
                <button
                  key={`${hit.type}-${hit.id}`}
                  type="button"
                  className={cn(
                    "w-full px-4 py-3 text-left border-b last:border-0 flex items-center justify-between gap-2 transition-colors",
                    darkMode ? "border-gray-700/80 hover:bg-blue-950/40" : "border-gray-100 hover:bg-blue-50/80"
                  )}
                  onClick={() => onPickSearchHit(hit)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {hit.type === "building" ? (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
                        <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </span>
                    ) : (
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold"
                        style={{ backgroundColor: getRoomFillColor(hit.room.type, hit.room.currentStatus) }}
                      >
                        {hit.room.roomNumber.slice(0, 3)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{hit.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{hit.sub}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Floor + room count */}
      <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-2">
        <div className={cn(panel, "px-3 py-1.5 text-xs font-medium text-muted-foreground hidden sm:block")}>
          {isFi ? "Kerros" : "Floor"} · {floorRooms.length} {isFi ? "tilaa" : "rooms"}
        </div>
        <div className={panel}>
          <Button
            variant="ghost"
            size="sm"
            className="w-11 h-9 rounded-none"
            onClick={() => setSelectedFloor((f) => Math.min(f + 1, maxFloor))}
            disabled={selectedFloor >= maxFloor}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <div
            className={cn(
              "w-11 h-10 flex items-center justify-center font-bold text-sm border-y",
              darkMode ? "border-gray-700 bg-blue-600 text-white" : "border-gray-200 bg-blue-600 text-white"
            )}
          >
            {selectedFloor}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-11 h-9 rounded-none"
            onClick={() => setSelectedFloor((f) => Math.max(f - 1, 0))}
            disabled={selectedFloor <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status legend */}
      {layers.rooms && floorRooms.length > 0 && (
        <div
          className={cn(
            "absolute left-3 z-20 hidden sm:flex flex-wrap gap-1.5 max-w-[14rem]",
            "bottom-[max(6.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] sm:bottom-16"
          )}
        >
          {(["free", "occupied", "reserved"] as const).map((s) => (
            <span
              key={s}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold shadow-sm border",
                darkMode ? "bg-gray-900/90 border-gray-700" : "bg-white/90 border-gray-200"
              )}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ROOM_STATUS_COLORS[s] }} />
              {roomStatusLabel(s, isFi)}
            </span>
          ))}
        </div>
      )}

      {/* Layers */}
      <div className="absolute bottom-[max(5.5rem,calc(1rem+env(safe-area-inset-bottom)))] left-3 z-30 sm:bottom-4">
        <Button variant="outline" className={cn(panel, "h-10 px-3 gap-2")} onClick={() => setShowLayers(!showLayers)}>
          <Layers className="h-4 w-4" />
          <span className="text-sm font-medium">{isFi ? "Tasot" : "Layers"}</span>
        </Button>
        {showLayers && (
          <div className={cn(panel, "absolute bottom-12 left-0 p-3 space-y-2 min-w-[10rem]")}>
            {(
              [
                ["wings", isFi ? "Siipipiirteet" : "Wing outlines"],
                ["rooms", isFi ? "Tilat (0–" + maxFloor + ")" : `Rooms (floor ${selectedFloor})`],
                ["labels", isFi ? "Nimiöt" : "Labels"],
              ] as const
            ).map(([key, label]) => (
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

      {/* Map canvas */}
      <div
        ref={mapRef}
        className={cn(
          "h-full w-full select-none",
          darkMode
            ? "bg-[radial-gradient(ellipse_at_50%_30%,#1e3a5f_0%,#0f172a_45%,#030712_100%)]"
            : "bg-[radial-gradient(ellipse_at_50%_25%,#dbeafe_0%,#f1f5f9_40%,#e2e8f0_100%)]"
        )}
        style={{ cursor: isPanning ? "grabbing" : "grab", touchAction: "none" }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest("[data-map-feature]")) return;
          handlePanStart(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            setIsPanning(false);
            pinchStart.current = { distance: touchDistance(e.touches), view: { ...viewState } };
            return;
          }
          if (e.touches.length !== 1) return;
          if ((e.target as HTMLElement).closest("[data-map-feature]")) return;
          handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2 && pinchStart.current) {
            e.preventDefault();
            const scale = touchDistance(e.touches) / pinchStart.current.distance;
            const v = pinchStart.current.view;
            const nw = Math.min(Math.max(v.w / scale, 280), 5000);
            const nh = Math.min(Math.max(v.h / scale, 200), 3500);
            const cx = v.x + v.w / 2;
            const cy = v.y + v.h / 2;
            setViewState({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh });
            return;
          }
          if (!isPanning || e.touches.length !== 1) return;
          e.preventDefault();
          applyPan(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchEnd={(e) => {
          if (e.touches.length < 2) pinchStart.current = null;
          if (e.touches.length === 0) setIsPanning(false);
        }}
      >
        <svg className="h-full w-full" viewBox={formatViewBox(viewState)} preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="wingShadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#0f172a" floodOpacity={darkMode ? 0.55 : 0.22} />
            </filter>
            <filter id="roomGlow">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.4" />
            </filter>
            <filter id="roomShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#0f172a" floodOpacity={darkMode ? 0.5 : 0.18} />
            </filter>
            {/* Per-wing gradients */}
            {Object.values(KSYK_BUILDING_OUTLINES).map((p) => (
              <linearGradient
                key={`grad-${p.letter}`}
                id={`wingGrad-${p.letter}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={p.stroke} stopOpacity={darkMode ? 0.32 : 0.36} />
                <stop offset="100%" stopColor={p.stroke} stopOpacity={darkMode ? 0.14 : 0.18} />
              </linearGradient>
            ))}
            {/* Hatched pattern for floors above ground */}
            <pattern id="floorHatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="14" stroke={darkMode ? "#cbd5e1" : "#0f172a"} strokeOpacity="0.07" strokeWidth="1.4" />
            </pattern>
            {settings.showGrid && (
              <pattern id="spaceGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke={darkMode ? "#334155" : "#e2e8f0"} strokeWidth="0.6" />
              </pattern>
            )}
            {/* Route arrow head */}
            <marker id="routeArrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0 0 L8 4 L0 8 z" fill="#2563eb" />
            </marker>
            {/* You-are-here ripple */}
            <radialGradient id="herePulse">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>
          {settings.showGrid && (
            <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#spaceGrid)" />
          )}

          {/* Campus plate */}
          <rect
            x={campusPlate.x}
            y={campusPlate.y}
            width={campusPlate.w}
            height={campusPlate.h}
            rx={28}
            fill={darkMode ? "#1e293b" : "#ffffff"}
            stroke={darkMode ? "#475569" : "#cbd5e1"}
            strokeWidth={2}
            opacity={darkMode ? 0.92 : 0.97}
          />

          {layers.wings &&
            campusBuildings.map((building) => {
              const letter = building.name;
              const preset = KSYK_BUILDING_OUTLINES[letter];
              const shape = preset?.shape ?? parseBuildingShape(building);
              const pathD = outlineToPath(shape);
              const isSel = selectedBuilding?.name === letter || highlightLetter === letter;
              const isHover = hoveredWing === letter;
              const stroke = preset?.stroke ?? building.colorCode ?? "#2563eb";
              const bounds = getShapeBounds(shape);
              const floorIsAbove = selectedFloor > 1;

              return (
                <g
                  key={building.id}
                  data-map-feature="building"
                  className="cursor-pointer"
                  filter="url(#wingShadow)"
                  onMouseEnter={() => setHoveredWing(letter)}
                  onMouseLeave={() => setHoveredWing(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBuilding(building);
                    setSelectedRoom(null);
                    focusBuilding(letter);
                  }}
                >
                  {/* Soft fill base */}
                  <path
                    d={pathD}
                    fill={`url(#wingGrad-${letter})`}
                    stroke="none"
                  />
                  {/* Hatch overlay for above-ground floors so users feel they're "above" */}
                  {floorIsAbove && (
                    <path d={pathD} fill="url(#floorHatch)" stroke="none" />
                  )}
                  {/* Outer crisp building edge — double stroke for that architectural feel */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isSel ? "#fbbf24" : isHover ? "#93c5fd" : stroke}
                    strokeWidth={isSel ? 5 : isHover ? 4 : 3}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <path
                    d={pathD}
                    fill="none"
                    stroke={darkMode ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.6)"}
                    strokeWidth={1}
                    strokeLinejoin="round"
                  />
                  {layers.labels && preset && (
                    <>
                      <rect
                        x={bounds.centerX - 76}
                        y={bounds.centerY - 16}
                        width={152}
                        height={32}
                        rx={16}
                        fill={darkMode ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.94)"}
                        stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)"}
                        strokeWidth={1}
                        className="pointer-events-none"
                      />
                      <circle
                        cx={bounds.centerX - 58}
                        cy={bounds.centerY}
                        r={6}
                        fill={stroke}
                        className="pointer-events-none"
                      />
                      <text
                        x={bounds.centerX + 8}
                        y={bounds.centerY + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={darkMode ? "#f8fafc" : "#0f172a"}
                        fontSize="13"
                        fontWeight="700"
                        className="pointer-events-none"
                      >
                        {isFi ? preset.nameFi : preset.nameEn}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

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
              const statusColor = ROOM_STATUS_COLORS[status as keyof typeof ROOM_STATUS_COLORS] ?? ROOM_STATUS_COLORS.unknown;
              const iconD = pathForRoomType(room.type);
              const iconSize = Math.max(12, Math.min(28, Math.min(w, h) * 0.45));
              const showIcon = !!iconD && Math.min(w, h) >= 36;
              const showLabel = Math.min(w, h) >= 28;

              return (
                <g
                  key={room.id}
                  data-map-feature="room"
                  className="cursor-pointer"
                  filter={isSel || isHover ? "url(#roomGlow)" : "url(#roomShadow)"}
                  onMouseEnter={() => setHoveredRoomId(room.id)}
                  onMouseLeave={() => setHoveredRoomId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.shiftKey) {
                      // shift-click sets "to" for navigation
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
                    rx={6}
                    fill={fill}
                    stroke={isSel ? "#fbbf24" : isHover ? "#fde68a" : darkMode ? "#0f172a" : "#fff"}
                    strokeWidth={isSel ? 3 : isHover ? 2 : 1.5}
                    opacity={isHover || isSel ? 1 : 0.95}
                  />
                  {/* Inner highlight for that subtle "lit" feel */}
                  <rect
                    x={x + 1.5}
                    y={y + 1.5}
                    width={Math.max(0, w - 3)}
                    height={Math.max(0, Math.min(8, h / 3))}
                    rx={4}
                    fill="rgba(255,255,255,0.18)"
                    className="pointer-events-none"
                  />
                  {showIcon && (
                    <g
                      transform={`translate(${x + w / 2 - iconSize / 2} ${y + (showLabel ? h / 2 - iconSize - 2 : h / 2 - iconSize / 2)}) scale(${iconSize / 24})`}
                      className="pointer-events-none"
                    >
                      <path d={iconD!} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  )}
                  {showLabel && (
                    <text
                      x={x + w / 2}
                      y={y + (showIcon ? h - 8 : h / 2)}
                      textAnchor="middle"
                      dominantBaseline={showIcon ? "auto" : "middle"}
                      fill="#fff"
                      fontSize={Math.min(13, Math.max(9, w / 5))}
                      fontWeight="700"
                      className="pointer-events-none"
                      style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.45)", strokeWidth: 0.8 }}
                    >
                      {room.roomNumber}
                    </text>
                  )}
                  {/* Status dot top-right */}
                  <circle
                    cx={x + w - 6}
                    cy={y + 6}
                    r={3.2}
                    fill={statusColor}
                    stroke="#fff"
                    strokeWidth={1}
                    className="pointer-events-none"
                  />
                </g>
              );
            })}

          {/* Navigation route */}
          {navFrom && navTo && (
            <g className="pointer-events-none">
              {/* Glow */}
              <line
                x1={navFrom.x}
                y1={navFrom.y}
                x2={navTo.x}
                y2={navTo.y}
                stroke="#3b82f6"
                strokeOpacity="0.25"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Dashed route */}
              <line
                x1={navFrom.x}
                y1={navFrom.y}
                x2={navTo.x}
                y2={navTo.y}
                stroke="#2563eb"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray="10 8"
                markerEnd="url(#routeArrow)"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="1.2s" repeatCount="indefinite" />
              </line>
              {/* From marker */}
              <circle cx={navFrom.x} cy={navFrom.y} r={9} fill="url(#herePulse)">
                <animate attributeName="r" values="9;18;9" dur="2.2s" repeatCount="indefinite" />
              </circle>
              <circle cx={navFrom.x} cy={navFrom.y} r={6} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
              {/* To marker */}
              <circle cx={navTo.x} cy={navTo.y} r={8} fill="#ef4444" stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>
      </div>

      {/* Zoom + compass */}
      <div className="absolute bottom-[max(5.5rem,calc(1rem+env(safe-area-inset-bottom)))] right-3 sm:bottom-4 z-20 flex flex-col items-end gap-2">
        <div
          className={cn(panel, "w-11 h-11 flex items-center justify-center")}
          title={isFi ? "Pohjoinen ylös" : "North up"}
        >
          <Compass className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className={cn(panel, "flex flex-col")}>
          <Button variant="ghost" size="sm" className="w-11 h-10 rounded-none" onClick={() => zoomView(zoomFactor)} title="Zoom in (+)">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="w-11 h-10 rounded-none border-y" onClick={() => tweenView(baseViewBox)} title="Reset view (0)">
            <MapPin className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="w-11 h-10 rounded-none" onClick={() => zoomView(2 - zoomFactor)} title="Zoom out (-)">
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scale bar */}
      <div className="absolute bottom-[max(5.5rem,calc(1rem+env(safe-area-inset-bottom)))] left-1/2 -translate-x-1/2 sm:bottom-4 z-20 pointer-events-none hidden sm:flex flex-col items-center">
        <div
          className={cn(
            "h-2.5 border-2 border-b-0",
            darkMode ? "border-gray-200 bg-gray-900/70" : "border-gray-900 bg-white/85"
          )}
          style={{ width: `${scaleBarMeters.px}px` }}
        />
        <span
          className={cn(
            "mt-1 px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded",
            darkMode ? "bg-gray-900/85 text-gray-100" : "bg-white/90 text-gray-900"
          )}
        >
          {scaleBarMeters.label}
        </span>
      </div>

      {/* Keyboard shortcut hint */}
      <div
        className={cn(
          "absolute top-3 left-3 z-20 hidden lg:block",
          panel,
          "px-2.5 py-1.5 text-[10px] font-mono text-muted-foreground"
        )}
        title={isFi ? "Pikanäppäimet" : "Shortcuts"}
      >
        + / − · 0 · 0–9 · Esc
      </div>

      {/* Building bottom sheet */}
      {selectedBuilding && (
        <div className="absolute bottom-0 left-0 right-0 z-40 sm:bottom-auto sm:top-20 sm:left-3 sm:right-auto sm:max-w-sm pointer-events-none">
          <Card className={cn(panel, "pointer-events-auto rounded-t-3xl sm:rounded-2xl border-t-4 border-blue-500 shadow-2xl")}>
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mt-3 sm:hidden" />
            <CardContent className="p-5 pt-3 sm:pt-5">
              <div className="flex justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-xl font-bold">
                    {isFi ? selectedBuilding.nameFi : selectedBuilding.nameEn}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedBuilding.floors} {isFi ? "kerrosta" : "floors"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedBuilding(null)}>
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

      {/* Room bottom sheet */}
      {selectedRoom && (
        <div className="absolute bottom-0 left-0 right-0 z-40 sm:bottom-auto sm:top-20 sm:left-3 sm:right-auto sm:max-w-sm pointer-events-none">
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
                    <h3 className="text-lg font-bold truncate">{selectedRoom.name || selectedRoom.nameEn || selectedRoom.roomNumber}</h3>
                    <p className="text-sm text-muted-foreground">
                      {isFi ? "Kerros" : "Floor"} {selectedRoom.floor}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedRoom(null)}>
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
              {/* Wayfinding actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    setNavFrom({
                      id: selectedRoom.id,
                      x: (selectedRoom.mapPositionX ?? 0) + (selectedRoom.width ?? 60) / 2,
                      y: (selectedRoom.mapPositionY ?? 0) + (selectedRoom.height ?? 40) / 2,
                      floor: selectedRoom.floor ?? 1,
                      label: selectedRoom.roomNumber,
                    });
                  }}
                >
                  {isFi ? "Lähtöpiste" : "Set start"}
                </Button>
                <Button
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    setNavTo({
                      id: selectedRoom.id,
                      x: (selectedRoom.mapPositionX ?? 0) + (selectedRoom.width ?? 60) / 2,
                      y: (selectedRoom.mapPositionY ?? 0) + (selectedRoom.height ?? 40) / 2,
                      floor: selectedRoom.floor ?? 1,
                      label: selectedRoom.roomNumber,
                    });
                  }}
                >
                  {isFi ? "Reititä tänne" : "Route here"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation bar — appears when From or To is set */}
      {(navFrom || navTo) && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 max-w-md w-[min(95%,28rem)] pointer-events-auto">
          <div className={cn(panel, "p-3 flex items-center gap-2 shadow-2xl")}>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-200 dark:ring-blue-900 shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0">{isFi ? "Lähtö" : "From"}</span>
                <span className="text-sm font-semibold truncate flex-1">
                  {navFrom ? `${navFrom.label} · ${isFi ? "K." : "Fl."}${navFrom.floor}` : (isFi ? "— valitse —" : "— pick —")}
                </span>
                {navFrom && (
                  <button onClick={() => setNavFrom(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-200 dark:ring-red-900 shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0">{isFi ? "Määränpää" : "To"}</span>
                <span className="text-sm font-semibold truncate flex-1">
                  {navTo ? `${navTo.label} · ${isFi ? "K." : "Fl."}${navTo.floor}` : (isFi ? "— valitse —" : "— pick —")}
                </span>
                {navTo && (
                  <button onClick={() => setNavTo(null)} className="text-muted-foreground hover:text-foreground">
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

      {/* Mini-map */}
      <div
        className={cn(
          panel,
          "absolute z-20 hidden md:block overflow-hidden pointer-events-auto",
          "top-3 right-[5.5rem]"
        )}
        style={{ width: 168, height: 100 }}
        title={isFi ? "Pienoiskartta" : "Mini-map"}
      >
        <svg
          viewBox={`${campusPlate.x} ${campusPlate.y} ${campusPlate.w} ${campusPlate.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full cursor-pointer"
          onClick={(e) => {
            const svg = e.currentTarget;
            const rect = svg.getBoundingClientRect();
            const px = (e.clientX - rect.left) / rect.width;
            const py = (e.clientY - rect.top) / rect.height;
            const cx = campusPlate.x + campusPlate.w * px;
            const cy = campusPlate.y + campusPlate.h * py;
            tweenView({ x: cx - viewState.w / 2, y: cy - viewState.h / 2, w: viewState.w, h: viewState.h });
          }}
        >
          <rect
            x={campusPlate.x}
            y={campusPlate.y}
            width={campusPlate.w}
            height={campusPlate.h}
            fill={darkMode ? "#0f172a" : "#f8fafc"}
          />
          {campusBuildings.map((b) => {
            const preset = KSYK_BUILDING_OUTLINES[b.name];
            if (!preset) return null;
            return (
              <path
                key={b.id}
                d={outlineToPath(preset.shape)}
                fill={preset.stroke}
                fillOpacity={0.45}
                stroke={preset.stroke}
                strokeWidth={4}
              />
            );
          })}
          {/* Viewport rect */}
          <rect
            x={viewState.x}
            y={viewState.y}
            width={viewState.w}
            height={viewState.h}
            fill="rgba(59,130,246,0.18)"
            stroke="#2563eb"
            strokeWidth={6}
            strokeDasharray="14 8"
          />
        </svg>
      </div>
    </div>
  );
}
