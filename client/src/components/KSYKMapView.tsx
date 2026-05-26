/**
 * KSYK Maps — MazeMap-style campus map
 * Wing outlines + floor-based rooms + floating controls + bottom sheets
 * - Single search source (from top bar); rooms deduped by id, ranked by relevance
 * - Scale bar, compass, keyboard shortcuts (+/-/0/Esc/1-9 floor jump)
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type L from "leaflet";
import OsmBasemap from "@/components/OsmBasemap";
import {
  parseBuildingShape,
  getShapeBounds,
  getLabelAnchor,
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
  const viewStateRef = useRef(viewState);
  useEffect(() => {
    viewStateRef.current = viewState;
  }, [viewState]);
  const [isPanning, setIsPanning] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tweenRef = useRef<number | null>(null);

  // OSM mode state — the leaflet map instance and the overlay SVG element
  const leafletMapRef = useRef<L.Map | null>(null);
  const [overlayEl, setOverlayEl] = useState<SVGSVGElement | null>(null);
  // Meters-per-pixel at the current Leaflet viewport, updated on every move/zoom.
  const [leafletMetersPerPx, setLeafletMetersPerPx] = useState<number | null>(null);

  // Clear stale overlay ref when OSM mode is disabled so the portal doesn't briefly
  // render into the old detached SVG element when the user re-enables OSM mode.
  useEffect(() => {
    if (!settings.useOsmBasemap) {
      setOverlayEl(null);
      leafletMapRef.current = null;
    }
  }, [settings.useOsmBasemap]);

  // Pointer tracking for unified mouse+touch+pen handling
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const panStartRef = useRef<{ pointerId: number; clientX: number; clientY: number; view: typeof viewState } | null>(null);
  const pinchStartRef = useRef<{ distance: number; midClient: { x: number; y: number }; midWorld: { x: number; y: number }; view: typeof viewState } | null>(null);
  // Momentum/inertia
  const velocityRef = useRef<{ vx: number; vy: number; lastT: number; lastX: number; lastY: number }>({ vx: 0, vy: 0, lastT: 0, lastX: 0, lastY: 0 });
  const inertiaRef = useRef<number | null>(null);

  // Nav state (room-to-room routing)
  type RoomPt = { id: string; x: number; y: number; floor: number; label: string };
  const [navFrom, setNavFrom] = useState<RoomPt | null>(null);
  const [navTo, setNavTo] = useState<RoomPt | null>(null);

  // Geolocation + fullscreen state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenWrapRef = useRef<HTMLDivElement>(null);

  // Listen for browser fullscreen exit (Esc key, etc.)
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = fullscreenWrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  }, []);

  // Draw / update the user's location dot on the Leaflet map
  const userPinRef = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    if (!settings.useOsmBasemap) return;
    const map = leafletMapRef.current;
    if (!map) return;
    if (!userLocation) {
      userPinRef.current?.remove();
      userPinRef.current = null;
      return;
    }
    // Lazy-require Leaflet to keep the bundle out of the SVG-only path
    import("leaflet").then((Lmod) => {
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
      userPinRef.current?.remove();
      userPinRef.current = null;
    };
  }, [userLocation, settings.useOsmBasemap]);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocateError(isFi ? "Selain ei tue paikannusta" : "Geolocation not supported");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude, accuracy });
        setLocating(false);
        if (settings.useOsmBasemap && leafletMapRef.current) {
          leafletMapRef.current.flyTo([latitude, longitude], 18, { duration: 0.6 });
        }
      },
      (err) => {
        setLocating(false);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? isFi ? "Paikannuslupa evätty" : "Location permission denied"
            : err.code === err.POSITION_UNAVAILABLE
            ? isFi ? "Sijaintia ei saatavilla" : "Position unavailable"
            : isFi ? "Aikakatkaisu" : "Timed out";
        setLocateError(msg);
        // Auto-clear after a moment
        setTimeout(() => setLocateError(null), 3500);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
    );
  }, [isFi, settings.useOsmBasemap]);

  // Smoothly tween viewBox towards a target — easeOutCubic over ~260ms
  const tweenView = (target: { x: number; y: number; w: number; h: number }, ms = 260) => {
    if (tweenRef.current) cancelAnimationFrame(tweenRef.current);
    if (inertiaRef.current) {
      cancelAnimationFrame(inertiaRef.current);
      inertiaRef.current = null;
    }
    const start = { ...viewStateRef.current };
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
      w: baseViewBox.w + 96,
      h: baseViewBox.h + 96,
    }),
    [baseViewBox]
  );

  useEffect(() => {
    setViewState(baseViewBox);
  }, [baseViewBox]);

  // Convert SVG world coords to geographic lat/lng using the same bounds math as OsmBasemap.
  // Bounds are guaranteed to match the SVG aspect ratio, so the mapping is perfectly linear.
  const svgToLatLng = useCallback((svgX: number, svgY: number): [number, number] => {
    const fx = (svgX - baseViewBox.x) / baseViewBox.w;
    const fy = (svgY - baseViewBox.y) / baseViewBox.h;
    const halfLatM = settings.osmCampusSpanMeters / 2;
    const halfLatDeg = halfLatM / 111_320;
    const halfLngDeg =
      (halfLatM * (baseViewBox.w / baseViewBox.h)) /
      (111_320 * Math.cos((settings.osmCenterLat * Math.PI) / 180));
    // SVG y increases downward; latitude increases northward — hence the inversion.
    return [
      settings.osmCenterLat + halfLatDeg * (1 - 2 * fy),
      settings.osmCenterLng - halfLngDeg + fx * 2 * halfLngDeg,
    ];
  }, [baseViewBox.x, baseViewBox.y, baseViewBox.w, baseViewBox.h, settings.osmCampusSpanMeters, settings.osmCenterLat, settings.osmCenterLng]);

  const focusRoom = (room: Room) => {
    setSelectedRoom(room);
    setSelectedBuilding(null);
    setSelectedFloor(room.floor ?? 1);
    const x = room.mapPositionX ?? 0;
    const y = room.mapPositionY ?? 0;
    const w = room.width ?? 80;
    const h = room.height ?? 60;
    if (settings.useOsmBasemap && leafletMapRef.current) {
      const [lat, lng] = svgToLatLng(x + w / 2, y + h / 2);
      leafletMapRef.current.flyTo([lat, lng], Math.max(settings.osmDefaultZoom, 19), { duration: 0.5 });
    } else {
      const pad = 120;
      tweenView({ x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2 });
    }
  };

  const zoomFactor = settings.mapZoomSpeed === 2 ? 0.85 : settings.mapZoomSpeed === 0.5 ? 0.96 : 0.9;

  // Zoom bounds: world units. Smallest = ~tight on a single room. Largest = whole campus + slack.
  const ZOOM_MIN_W = 240;
  const ZOOM_MAX_W = 3600;
  const ZOOM_MIN_H = ZOOM_MIN_W * (9 / 16);
  const ZOOM_MAX_H = ZOOM_MAX_W * (9 / 16);

  // Pan bounds: never let the user pan all wings off-screen. We allow ~30% slack outside the campus plate.
  const clampView = (v: typeof viewState): typeof viewState => {
    const nw = Math.min(Math.max(v.w, ZOOM_MIN_W), ZOOM_MAX_W);
    const nh = Math.min(Math.max(v.h, ZOOM_MIN_H), ZOOM_MAX_H);
    const slackX = nw * 0.3;
    const slackY = nh * 0.3;
    const minX = campusPlate.x - slackX;
    const maxX = campusPlate.x + campusPlate.w + slackX - nw;
    const minY = campusPlate.y - slackY;
    const maxY = campusPlate.y + campusPlate.h + slackY - nh;
    const nx = maxX > minX ? Math.min(Math.max(v.x, minX), maxX) : v.x;
    const ny = maxY > minY ? Math.min(Math.max(v.y, minY), maxY) : v.y;
    return { x: nx, y: ny, w: nw, h: nh };
  };

  // Convert client (screen) coords to SVG world coords using the SVG's own CTM —
  // handles preserveAspectRatio="meet" automatically.
  const clientToWorld = (clientX: number, clientY: number): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  // Center-of-viewport zoom (used by + / − buttons & keyboard)
  const zoomView = (factor: number) => {
    setViewState((v) => {
      const nw = v.w * factor;
      const nh = v.h * factor;
      return clampView({ x: v.x + (v.w - nw) / 2, y: v.y + (v.h - nh) / 2, w: nw, h: nh });
    });
  };

  // Zoom while keeping the world point under (clientX, clientY) fixed — cursor-locked zoom
  const zoomAtClient = (clientX: number, clientY: number, factor: number) => {
    const world = clientToWorld(clientX, clientY);
    setViewState((v) => {
      const nw = Math.min(Math.max(v.w * factor, ZOOM_MIN_W), ZOOM_MAX_W);
      const nh = Math.min(Math.max(v.h * factor, ZOOM_MIN_H), ZOOM_MAX_H);
      const fx = (world.x - v.x) / v.w;
      const fy = (world.y - v.y) / v.h;
      return clampView({ x: world.x - fx * nw, y: world.y - fy * nh, w: nw, h: nh });
    });
  };

  const focusBuilding = (letter: string) => {
    const preset = KSYK_BUILDING_OUTLINES[letter];
    const b = campusBuildings.find((x) => x.name === letter);
    if (settings.useOsmBasemap && leafletMapRef.current && preset) {
      const anchor = getLabelAnchor(preset.shape);
      const [lat, lng] = svgToLatLng(anchor.x, anchor.y);
      leafletMapRef.current.flyTo([lat, lng], Math.max(settings.osmDefaultZoom, 18), { duration: 0.5 });
    } else if (preset) {
      tweenView(clampView(viewBoxForOutline(preset.shape, 160)));
    }
    if (b) setSelectedBuilding(b);
    setSelectedRoom(null);
  };

  // Wheel: cursor-locked zoom
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Trackpads send small deltas; mouse wheels send large ones. Normalize.
      const intensity = Math.min(2.5, Math.max(0.5, Math.abs(e.deltaY) / 100));
      const dir = e.deltaY > 0 ? 1 : -1;
      const factor = dir > 0 ? Math.pow(2 - zoomFactor, intensity) : Math.pow(zoomFactor, intensity);
      // Cancel any in-flight tween or inertia when user is actively zooming
      if (tweenRef.current) {
        cancelAnimationFrame(tweenRef.current);
        tweenRef.current = null;
      }
      if (inertiaRef.current) {
        cancelAnimationFrame(inertiaRef.current);
        inertiaRef.current = null;
      }
      zoomAtClient(e.clientX, e.clientY, factor);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomFactor]);

  // Unified pointer-based pan + pinch
  const stopInertia = () => {
    if (inertiaRef.current) {
      cancelAnimationFrame(inertiaRef.current);
      inertiaRef.current = null;
    }
  };

  const beginPan = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-map-feature]")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    stopInertia();
    if (tweenRef.current) {
      cancelAnimationFrame(tweenRef.current);
      tweenRef.current = null;
    }
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      panStartRef.current = { pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY, view: { ...viewStateRef.current } };
      velocityRef.current = { vx: 0, vy: 0, lastT: performance.now(), lastX: e.clientX, lastY: e.clientY };
      setIsPanning(true);
    } else if (activePointers.current.size === 2) {
      // Initialize pinch
      const pts = Array.from(activePointers.current.values());
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const midClient = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const midWorld = clientToWorld(midClient.x, midClient.y);
      pinchStartRef.current = { distance, midClient, midWorld, view: { ...viewStateRef.current } };
      panStartRef.current = null;
      setIsPanning(false);
    }
  };

  const updatePan = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Pinch in progress
    if (pinchStartRef.current && activePointers.current.size >= 2) {
      const pts = Array.from(activePointers.current.values());
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const scale = distance / pinchStartRef.current.distance;
      const v = pinchStartRef.current.view;
      const nw = Math.min(Math.max(v.w / scale, ZOOM_MIN_W), ZOOM_MAX_W);
      const nh = Math.min(Math.max(v.h / scale, ZOOM_MIN_H), ZOOM_MAX_H);
      // Anchor the original midpoint world coord at the (possibly drifted) current midpoint client coord
      const midNow = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      // For the original view, midWorld was at midClient. After scale change, we want midWorld at midNow.
      // Express: world.x = newX + fx * nw where fx = (midClient.x - rect.left) / rect.width — but
      // we already have the world point. We need to know what fx is now (mid client position in CTM coords).
      // Approximation: assume aspect ratio unchanged so the fractional position fx,fy doesn't change.
      // That's correct for "meet" with constant container size: fraction (midX - vbX)/vbW only depends on midClient.
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Recompute world coord under current midpoint with a fresh inverse CTM — but viewBox has changed.
      // Use the trick: figure out fx,fy from container ratio of midNow in viewport.
      const fx = (midNow.x - rect.left) / rect.width;
      const fy = (midNow.y - rect.top) / rect.height;
      // For meet, the viewBox is letterboxed into rect — but since we're using fractions of the same letterbox,
      // applying f to the inner box is what we want. So we map: world = newViewboxOrigin + f * newViewbox.
      const w = pinchStartRef.current.midWorld;
      setViewState(clampView({ x: w.x - fx * nw, y: w.y - fy * nh, w: nw, h: nh }));
      e.preventDefault?.();
      return;
    }

    // Single-finger / mouse pan
    if (!panStartRef.current || e.pointerId !== panStartRef.current.pointerId) return;
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const view = panStartRef.current.view;

    // Choose the scale that matches the rendered aspect ratio (preserveAspectRatio="meet")
    // — pixels-per-world-unit is min(rect.w / view.w, rect.h / view.h) for "meet".
    const pxPerUnit = Math.min(rect.width / view.w, rect.height / view.h);
    const dxWorld = (e.clientX - panStartRef.current.clientX) / pxPerUnit;
    const dyWorld = (e.clientY - panStartRef.current.clientY) / pxPerUnit;

    setViewState(clampView({ ...view, x: view.x - dxWorld, y: view.y - dyWorld }));

    // Track velocity (px/ms) for inertia
    const now = performance.now();
    const dt = Math.max(1, now - velocityRef.current.lastT);
    velocityRef.current = {
      vx: (e.clientX - velocityRef.current.lastX) / dt,
      vy: (e.clientY - velocityRef.current.lastY) / dt,
      lastT: now,
      lastX: e.clientX,
      lastY: e.clientY,
    };
    e.preventDefault?.();
  };

  const endPan = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);

    if (activePointers.current.size < 2) pinchStartRef.current = null;
    if (activePointers.current.size === 0) {
      setIsPanning(false);
      // Start inertia if velocity is high enough
      const { vx, vy } = velocityRef.current;
      const speed = Math.hypot(vx, vy);
      if (speed > 0.4 && !pinchStartRef.current && panStartRef.current) {
        const rect = mapRef.current?.getBoundingClientRect();
        const view = viewStateRef.current;
        if (rect) {
          const pxPerUnit = Math.min(rect.width / view.w, rect.height / view.h);
          let curVx = vx;
          let curVy = vy;
          const friction = 0.94;
          const stepInertia = () => {
            curVx *= friction;
            curVy *= friction;
            if (Math.hypot(curVx, curVy) < 0.04) {
              inertiaRef.current = null;
              return;
            }
            setViewState((v) => clampView({ ...v, x: v.x - curVx * 16 / pxPerUnit, y: v.y - curVy * 16 / pxPerUnit }));
            inertiaRef.current = requestAnimationFrame(stepInertia);
          };
          inertiaRef.current = requestAnimationFrame(stepInertia);
        }
      }
      panStartRef.current = null;
    }
  };

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
        if (settings.useOsmBasemap && leafletMapRef.current) leafletMapRef.current.zoomIn(0.5);
        else zoomView(zoomFactor);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        if (settings.useOsmBasemap && leafletMapRef.current) leafletMapRef.current.zoomOut(0.5);
        else zoomView(2 - zoomFactor);
      } else if (e.key === "0") {
        e.preventDefault();
        if (settings.useOsmBasemap && leafletMapRef.current) {
          leafletMapRef.current.flyTo(
            [settings.osmCenterLat, settings.osmCenterLng],
            settings.osmDefaultZoom,
            { duration: 0.4 }
          );
        } else {
          tweenView(baseViewBox);
        }
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
  }, [baseViewBox, zoomFactor, maxFloor, settings.useOsmBasemap, settings.osmCenterLat, settings.osmCenterLng, settings.osmDefaultZoom]);

  // Effective screen pixels per world unit — used for zoom-aware detail visibility
  const pxPerUnit = useMemo(() => {
    const el = mapRef.current;
    if (!el) return 0.5;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height || !viewState.w || !viewState.h) return 0.5;
    return Math.min(rect.width / viewState.w, rect.height / viewState.h);
  }, [viewState]);

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

  // Scale bar: ~120 px wide, snapped to a nice metre value.
  // In OSM mode, derive metres-per-pixel from Leaflet's zoom/centre;
  // otherwise use the SVG viewBox scale (1 world-unit ≈ 0.1 m).
  const scaleBarMeters = useMemo(() => {
    if (!containerWidth) return { px: 100, label: "—" };
    const metersPerPx =
      settings.useOsmBasemap && leafletMetersPerPx !== null
        ? leafletMetersPerPx
        : (viewState.w / containerWidth) * 0.1;
    const targetPx = 120;
    const meters = targetPx * metersPerPx;
    const buckets = [1, 2, 5, 10, 20, 50, 100, 200, 500];
    const nice = buckets.reduce((p, c) => (Math.abs(c - meters) < Math.abs(p - meters) ? c : p), buckets[0]);
    const px = nice / metersPerPx;
    return { px: Math.max(40, Math.min(220, px)), label: `${nice} m` };
  }, [viewState, containerWidth, settings.useOsmBasemap, leafletMetersPerPx]);

  // The campus SVG body: wings, rooms, navigation route — shared between the
  // standalone-SVG canvas and the OSM-overlay portal. References component state
  // via closure so both branches stay in sync.
  const campusBody = (
    <>
      <defs>
        <filter id="wingShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#0f172a" floodOpacity={darkMode ? 0.45 : 0.16} />
        </filter>
        <filter id="roomGlow">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.4" />
        </filter>
        {Object.values(KSYK_BUILDING_OUTLINES).map((p) => (
          <linearGradient key={`grad-${p.letter}`} id={`wingGrad-${p.letter}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.stroke} stopOpacity={darkMode ? 0.22 : 0.18} />
            <stop offset="100%" stopColor={p.stroke} stopOpacity={darkMode ? 0.1 : 0.1} />
          </linearGradient>
        ))}
        {settings.showGrid && !settings.useOsmBasemap && (
          <pattern id="spaceGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={darkMode ? "#334155" : "#e2e8f0"} strokeWidth="0.6" />
          </pattern>
        )}
        <marker id="routeArrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0 0 L8 4 L0 8 z" fill="#2563eb" />
        </marker>
        <radialGradient id="herePulse">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>
      {settings.showGrid && !settings.useOsmBasemap && (
        <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#spaceGrid)" />
      )}

      {/* Campus plate — hide in OSM mode (tiles replace it) */}
      {!settings.useOsmBasemap && (
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
      )}

      {layers.wings && !settings.useOsmBasemap &&
        campusBuildings.map((building) => {
          const letter = building.name;
          const preset = KSYK_BUILDING_OUTLINES[letter];
          const shape = preset?.shape ?? parseBuildingShape(building);
          const pathD = outlineToPath(shape);
          const isSel = selectedBuilding?.name === letter || highlightLetter === letter;
          const isHover = hoveredWing === letter;
          const stroke = preset?.stroke ?? building.colorCode ?? "#2563eb";
          const anchor = getLabelAnchor(shape);
          const bounds = getShapeBounds(shape);
          // In OSM mode, always show labels (we can't reliably compute pxPerUnit relative to leaflet)
          const showLabel = layers.labels && (settings.useOsmBasemap || Math.min(bounds.width, bounds.height) * pxPerUnit > 40);

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
              <path d={pathD} fill={`url(#wingGrad-${letter})`} stroke="none" />
              <path
                d={pathD}
                fill="none"
                stroke={isSel ? "#fbbf24" : isHover ? "#93c5fd" : stroke}
                strokeWidth={isSel ? 4 : isHover ? 3 : 2.2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                d={pathD}
                fill="none"
                stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.55)"}
                strokeWidth={0.8}
                strokeLinejoin="round"
              />
              {showLabel && preset && (
                <>
                  <rect
                    x={anchor.x - 56}
                    y={anchor.y - 12}
                    width={112}
                    height={24}
                    rx={12}
                    fill={darkMode ? "rgba(15,23,42,0.88)" : "rgba(255,255,255,0.96)"}
                    stroke={darkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"}
                    strokeWidth={1}
                    className="pointer-events-none"
                  />
                  <text
                    x={anchor.x}
                    y={anchor.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={stroke}
                    fontSize="11"
                    fontWeight="700"
                    letterSpacing="0.04em"
                    className="pointer-events-none"
                  >
                    {(isFi ? preset.nameFi : preset.nameEn).toUpperCase()}
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
          // Effective screen size of the room (px). In OSM mode this comes from
          // Leaflet's current scale; in SVG mode from our own viewBox.
          const metersPerSvgUnit = settings.osmCampusSpanMeters / baseViewBox.w;
          const roomMinPx = settings.useOsmBasemap && leafletMetersPerPx
            ? (Math.min(w, h) * metersPerSvgUnit) / leafletMetersPerPx
            : Math.min(w, h) * pxPerUnit;
          // Density-gated labels — only show when the room is large enough on screen.
          // Selected/hovered rooms always show their label so the user can find what they clicked.
          const showLabel = isSel || isHover || roomMinPx >= 28;
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
              {showIcon && (
                <g
                  transform={`translate(${x + w / 2 - iconSize / 2} ${y + (showLabel ? h / 2 - iconSize - 1 : h / 2 - iconSize / 2)}) scale(${iconSize / 24})`}
                  className="pointer-events-none"
                >
                  <path d={iconD!} fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
                  r={2.8}
                  fill={statusColor}
                  stroke={darkMode ? "#1e293b" : "#fff"}
                  strokeWidth={0.8}
                  className="pointer-events-none"
                />
              )}
            </g>
          );
        })}

      {navFrom && navTo && (
        <g className="pointer-events-none">
          <line x1={navFrom.x} y1={navFrom.y} x2={navTo.x} y2={navTo.y} stroke="#3b82f6" strokeOpacity="0.25" strokeWidth="14" strokeLinecap="round" />
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
          <circle cx={navFrom.x} cy={navFrom.y} r={9} fill="url(#herePulse)">
            <animate attributeName="r" values="9;18;9" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx={navFrom.x} cy={navFrom.y} r={6} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
          <circle cx={navTo.x} cy={navTo.y} r={8} fill="#ef4444" stroke="#fff" strokeWidth={2} />
        </g>
      )}
    </>
  );

  return (
    <div ref={fullscreenWrapRef} className="relative h-full w-full overflow-hidden bg-[#dde6ef] dark:bg-gray-900">
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

      {/* Floor selector — MazeMap-style vertical stack with per-floor buttons */}
      <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-2">
        <div className={cn(panel, "px-3 py-1.5 text-xs font-medium text-muted-foreground hidden sm:block")}>
          {isFi ? "Kerros" : "Floor"} · {floorRooms.length} {isFi ? "tilaa" : "rooms"}
        </div>
        <div className={cn(panel, "flex flex-col overflow-hidden")}>
          {Array.from({ length: maxFloor + 1 }, (_, i) => maxFloor - i).map((f) => {
            const isActive = selectedFloor === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setSelectedFloor(f)}
                className={cn(
                  "w-11 h-9 flex items-center justify-center font-bold text-sm transition-colors border-b last:border-b-0",
                  darkMode ? "border-gray-700" : "border-gray-200",
                  isActive
                    ? "bg-blue-600 text-white"
                    : darkMode
                    ? "text-gray-200 hover:bg-gray-800"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                title={`${isFi ? "Kerros" : "Floor"} ${f}`}
              >
                {f}
              </button>
            );
          })}
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
      <div
        className={cn(
          "absolute left-3 z-30",
          // In OSM mode, leave room for Leaflet's bottom-left scale control
          settings.useOsmBasemap
            ? "bottom-[max(7rem,calc(2.5rem+env(safe-area-inset-bottom)))] sm:bottom-12"
            : "bottom-[max(5.5rem,calc(1rem+env(safe-area-inset-bottom)))] sm:bottom-4"
        )}
      >
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

      {/* Map canvas — OSM basemap if enabled, otherwise the standalone SVG canvas */}
      {settings.useOsmBasemap ? (
        <div ref={mapRef} className="absolute inset-0">
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
          />
        </div>
      ) : (
        <div
        ref={mapRef}
        className={cn(
          "h-full w-full select-none",
          darkMode
            ? "bg-[radial-gradient(ellipse_at_50%_30%,#1e3a5f_0%,#0f172a_45%,#030712_100%)]"
            : "bg-[radial-gradient(ellipse_at_50%_25%,#dbeafe_0%,#f1f5f9_40%,#e2e8f0_100%)]"
        )}
        style={{ cursor: isPanning ? "grabbing" : "grab", touchAction: "none" }}
        onPointerDown={beginPan}
        onPointerMove={updatePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onPointerLeave={(e) => {
          if (!activePointers.current.has(e.pointerId)) return;
        }}
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).closest("[data-map-feature]")) return;
          zoomAtClient(e.clientX, e.clientY, zoomFactor * zoomFactor);
        }}
      >
        <svg
          ref={svgRef}
          className="h-full w-full"
          viewBox={formatViewBox(viewState)}
          preserveAspectRatio="xMidYMid meet"
        >
          {campusBody}
        </svg>
        </div>
      )}

      {/* OSM mode — portal the campus visuals into the leaflet SVG overlay so they
          pan/zoom/rotate with the basemap tiles. */}
      {settings.useOsmBasemap && overlayEl && createPortal(campusBody, overlayEl)}

      {/* Floating controls — compass + reset always; zoom buttons only in SVG mode
         (OSM mode uses Leaflet's native zoom buttons rendered at bottom-right by Leaflet). */}
      <div
        className={cn(
          "absolute right-3 z-20 flex flex-col items-end gap-2",
          // Lift above Leaflet's native zoom (~80px tall + scale margin) in OSM mode
          settings.useOsmBasemap
            ? "bottom-[max(8.5rem,calc(4rem+env(safe-area-inset-bottom)))] sm:bottom-28"
            : "bottom-[max(5.5rem,calc(1rem+env(safe-area-inset-bottom)))] sm:bottom-4"
        )}
      >
        <div
          className={cn(panel, "w-11 h-11 flex items-center justify-center")}
          title={isFi ? "Pohjoinen ylös" : "North up"}
        >
          <Compass className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        {settings.useOsmBasemap && (
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
        )}
        <Button
          variant="ghost"
          size="sm"
          aria-label={isFullscreen ? (isFi ? "Sulje koko näyttö" : "Exit fullscreen") : (isFi ? "Koko näyttö" : "Fullscreen")}
          className={cn(panel, "w-11 h-11 p-0")}
          onClick={toggleFullscreen}
          title={isFullscreen ? (isFi ? "Esc poistuu" : "Esc to exit") : (isFi ? "Koko näyttö" : "Fullscreen")}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={isFi ? "Palauta näkymä" : "Reset view"}
          className={cn(panel, "w-11 h-11 p-0")}
          onClick={() => {
            if (settings.useOsmBasemap && leafletMapRef.current) {
              leafletMapRef.current.flyTo(
                [settings.osmCenterLat, settings.osmCenterLng],
                settings.osmDefaultZoom,
                { duration: 0.4 }
              );
            } else {
              tweenView(baseViewBox);
            }
          }}
          title="Reset view (0)"
        >
          <MapPin className="h-4 w-4" />
        </Button>
        {!settings.useOsmBasemap && (
          <div className={cn(panel, "flex flex-col")}>
            <Button
              variant="ghost"
              size="sm"
              aria-label={isFi ? "Suurenna" : "Zoom in"}
              className="w-11 h-10 rounded-none"
              onClick={() => zoomView(zoomFactor)}
              title="Zoom in (+)"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={isFi ? "Pienennä" : "Zoom out"}
              className="w-11 h-10 rounded-none border-t"
              onClick={() => zoomView(2 - zoomFactor)}
              title="Zoom out (-)"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Mini-map — SVG mode only, top-right under the floor selector */}
      {!settings.useOsmBasemap && (
        <div
          className={cn(
            "absolute top-3 right-3 z-10 pointer-events-none hidden sm:block",
            panel,
            "p-1 overflow-hidden"
          )}
          style={{ width: 140, height: 90, marginTop: "calc(7rem + 8px)" }}
          aria-hidden="true"
          title={isFi ? "Karttakartta" : "Overview"}
        >
          <svg
            viewBox={`${campusPlate.x} ${campusPlate.y} ${campusPlate.w} ${campusPlate.h}`}
            style={{ width: "100%", height: "100%" }}
            preserveAspectRatio="xMidYMid meet"
          >
            {Object.values(KSYK_BUILDING_OUTLINES).map((preset) => (
              <path
                key={preset.letter}
                d={outlineToPath(preset.shape)}
                fill={preset.stroke}
                fillOpacity={0.18}
                stroke={preset.stroke}
                strokeWidth="8"
                strokeLinejoin="round"
              />
            ))}
            <rect
              x={viewState.x}
              y={viewState.y}
              width={viewState.w}
              height={viewState.h}
              fill="rgba(59,130,246,0.12)"
              stroke="#3b82f6"
              strokeWidth="8"
            />
          </svg>
        </div>
      )}

      {/* Scale bar — only in SVG mode; OSM mode uses Leaflet's native scale */}
      {!settings.useOsmBasemap && (
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
      )}

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

      {/* Locate-me error toast */}
      {locateError && (
        <div
          role="alert"
          className="absolute top-16 right-3 z-40 max-w-xs px-3 py-2 rounded-xl bg-red-500/95 text-white text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-2"
        >
          {locateError}
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

    </div>
  );
}
