/**
 * KSYK Maps — main campus map view (MapLibre-based).
 *
 * Chrome around the CampusMap:
 *   - Floor selector (top-right)
 *   - Zoom in/out stack (bottom-right, above 3D/Center)
 *   - 3D toggle + Center button (bottom-right, above zoom)
 *   - North reset (only shows when map is rotated off north)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useQuery } from "@tanstack/react-query";
import CampusMap, { type CampusMapHandle } from "@/components/CampusMap";
import CampusOverlay from "@/components/CampusOverlay";
import ErrorBoundary from "@/components/ErrorBoundary";
import SearchResultsDropdown, { type SearchPick } from "@/components/SearchResultsDropdown";
// LayersToggle temporarily removed from public map — toggle lives only in builder.
import { useAppSettings, loadMapDefaultsFromServer, pickPlatformMapDefaults } from "@/hooks/useAppSettings";
import { loadAppSettings } from "@/lib/appSettings";
import { useAccessDecision } from "@/hooks/useAccessDecision";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";
import { isFeatureAllowed } from "@/lib/accessControl";
import { LocateFixed, Plus, Minus, Navigation2, Layers, Navigation } from "lucide-react";
import NavigationPanel from "@/components/NavigationPanel";
import FeatureInfoSheet, { type ClickedFeature } from "@/components/FeatureInfoSheet";
import FeatureHighlight from "@/components/FeatureHighlight";
import CompassChip from "@/components/CompassChip";
import type { LatLng } from "@ksyk/shared";
import { cn } from "@/lib/utils";
import { polygonCentroid } from "@ksyk/shared";
import type { Building as SharedBuilding } from "@ksyk/shared";
import { useCampusData } from "@/hooks/useCampusData";
import posthog from "@/lib/posthog";

interface KSYKMapViewProps {
  /** From the header search input — drives the dropdown + map focus. */
  searchQuery?: string;
  /** Admin-only: show live GPS dot on the map. Off by default. */
  showGpsLocation?: boolean;
}

/** Local building shape — extends the shared one with just what the
 *  floor selector needs. Buildings without `floors` fall back to 1. */
interface Building extends Pick<SharedBuilding, "id" | "name" | "floors" | "points"> {
  floorMin?: number | null;
  floorMax?: number | null;
}

/** Resolve a desired floor against the floors that actually exist in the
 *  campus. An unknown or out-of-range value falls back to floor 1 when
 *  present, otherwise to the existing floor nearest to 1. `floors` is the
 *  union of every building's declared range and is never empty — it
 *  carries a [1] fallback. This is the guard that stops a stray
 *  `?floor=0` (or any floor no building declares) from filtering every
 *  overlay to an empty set. */
function resolveFloor(desired: number | null, floors: number[]): number {
  if (desired != null && floors.includes(desired)) return desired;
  if (floors.includes(1)) return 1;
  return floors.reduce(
    (best, f) => (Math.abs(f - 1) < Math.abs(best - 1) ? f : best),
    floors[0] ?? 1,
  );
}

export default function KSYKMapView(props: KSYKMapViewProps = {}) {
  const { searchQuery = "", showGpsLocation = false } = props;
  const { settings, update } = useAppSettings();
  const accessDecision = useAccessDecision();
  const { settings: secSettings } = useSecuritySettings();
  const canUseRouting = isFeatureAllowed("routing", accessDecision, secSettings);
  const canUse3D = isFeatureAllowed("threeDView", accessDecision, secSettings);
  const handleRef = useRef<CampusMapHandle | null>(null);
  // Mirrored to state so children get an actual re-render when the
  // map is ready. Without this, CampusOverlay receives `map={null}`
  // forever unless another prop change triggers a re-render — which
  // is why fresh visits sometimes showed a blank campus map until the
  // user interacted with something.
  const [mapInstance, setMapInstance] = useState<CampusMapHandle["map"] | null>(null);
  // Persisted view state — user's 3D toggle + current floor survive
  // a full page reload. Fresh visitors get 3D off + floor 1.
  const [is3D, setIs3D] = usePersistedState<boolean>(
    "ksyk_map_is3d",
    (settings.osmPitchDeg ?? 0) > 0,
  );
  // v3.26.0 — floor no longer persists across visits per feedback;
  // every session opens on floor 1. The URL query still wins if a
  // shared link specifies ?floor=… (see the effect below).
  const [selectedFloor, setSelectedFloor] = useState<number>(1);

  // v3.25.9 — read initial floor from ?floor= query param on mount so
  // shared links restore the correct level. Written back to the URL
  // whenever selectedFloor changes so subsequent copies of the URL
  // stay accurate. Only runs on the client; SSR-safe via typeof guard.
  //
  // v4.5.57 — a MISSING param must keep the default floor 1, not become
  // floor 0. `Number(p.get("floor"))` read `Number(null)` as 0 on every
  // plain visit; 0 passed the finite check, wrote itself back as
  // `?floor=0`, and — because no building declares floor 0 — filtered
  // the room, corridor, hallway, and POI layers to empty. So we only
  // apply the value when the param is actually present and an integer;
  // the clamp effect below then snaps it into the real floor list.
  const urlFloorAppliedRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("floor");
    if (raw === null || raw.trim() === "") return; // missing → keep floor 1
    const n = Number(raw);
    if (!Number.isInteger(n)) return; // garbage → keep floor 1
    setSelectedFloor(n); // optimistic; clamped against floorList once ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const p = new URLSearchParams(window.location.search);
      // Only write the floor param when it differs from the default so
      // trivial URLs stay clean. Floor 1 is our default → omit it.
      if (selectedFloor === 1) p.delete("floor");
      else p.set("floor", String(selectedFloor));
      const q = p.toString();
      const next = `${window.location.pathname}${q ? "?" + q : ""}${window.location.hash}`;
      window.history.replaceState(null, "", next);
    } catch { /* history API missing — non-fatal */ }
  }, [selectedFloor]);

  // v3.32.0 — camera nudge on floor change when 3D is on. Briefly
  // eases pitch up then back so users see the "we switched floors"
  // motion cue in 3D. In 2D top-down, no nudge — the change is
  // instantly visible.
  const previousFloorRef = useRef<number>(selectedFloor);
  useEffect(() => {
    if (previousFloorRef.current === selectedFloor) return;
    previousFloorRef.current = selectedFloor;
    if (!is3D || !mapInstance) return;
    const originalPitch = mapInstance.getPitch();
    mapInstance.easeTo({
      pitch: Math.min(60, originalPitch + 8),
      duration: 240,
      essential: true,
    });
    window.setTimeout(() => {
      try {
        mapInstance.easeTo({
          pitch: originalPitch,
          duration: 260,
          essential: true,
        });
      } catch { /* map might've unmounted */ }
    }, 280);
  }, [selectedFloor, is3D, mapInstance]);
  // Floor-change toast — brief direction indicator when the user switches
  // floors so the transition is legible in both 2D and 3D.
  const [floorToast, setFloorToast] = useState<string | null>(null);
  const prevFloorToastRef = useRef<number>(selectedFloor);
  useEffect(() => {
    if (prevFloorToastRef.current === selectedFloor) return;
    const prev = prevFloorToastRef.current;
    prevFloorToastRef.current = selectedFloor;
    const dir = selectedFloor > prev ? "↑" : "↓";
    const _sl = typeof window !== "undefined" ? localStorage.getItem('ksyk_language') : null;
    const fi = _sl ? _sl === 'fi' : (typeof navigator !== "undefined" && navigator.language.startsWith("fi"));
    setFloorToast(`${dir} ${fi ? "Kerros" : "Floor"} ${selectedFloor}`);
    const t = window.setTimeout(() => setFloorToast(null), 1400);
    return () => window.clearTimeout(t);
  }, [selectedFloor]);

  const [showNav, setShowNav] = useState(false);
  const [clickedFeature, setClickedFeature] = useState<ClickedFeature | null>(null);
  const [highlightPolygon, setHighlightPolygon] = useState<LatLng[] | null>(null);

  // ── GPS location (admin campus-map tab only) ─────────────────────
  const [gpsPosition, setGpsPosition] = useState<{ lng: number; lat: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsFollowing, setGpsFollowing] = useState(false);
  const gpsWatchRef = useRef<number | null>(null);
  const gpsMarkerRef = useRef<HTMLDivElement | null>(null);
  const gpsDotRef = useRef<maplibregl.Marker | null>(null);
  const gpsFollowingRef = useRef(gpsFollowing);

  useEffect(() => {
    if (!showGpsLocation || !mapInstance) return;

    if (!navigator.geolocation) {
      setGpsError("Selain ei tue paikannusta");
      return;
    }

    const onPos = (pos: GeolocationPosition) => {
      const { longitude: lng, latitude: lat, accuracy } = pos.coords;
      setGpsPosition({ lng, lat, accuracy });
      setGpsError(null);

      // Accuracy circle via GeoJSON fill-circle
      const src = "ksyk-gps-accuracy";
      const circlePoints = 64;
      const R = 6371000;
      const coords = Array.from({ length: circlePoints }, (_, i) => {
        const angle = (i / circlePoints) * Math.PI * 2;
        const dlat = (accuracy / R) * (180 / Math.PI) * Math.sin(angle);
        const dlng = (accuracy / R) * (180 / Math.PI) * Math.cos(angle) / Math.cos(lat * Math.PI / 180);
        return [lng + dlng, lat + dlat];
      });
      coords.push(coords[0]);
      const geoJson = {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [coords] },
        properties: {},
      };
      try {
        if (mapInstance.getSource(src)) {
          (mapInstance.getSource(src) as maplibregl.GeoJSONSource).setData(geoJson);
        } else {
          mapInstance.addSource(src, { type: "geojson", data: geoJson });
          mapInstance.addLayer({
            id: "ksyk-gps-accuracy-fill",
            type: "fill",
            source: src,
            paint: { "fill-color": "#3b82f6", "fill-opacity": 0.12 },
          });
          mapInstance.addLayer({
            id: "ksyk-gps-accuracy-line",
            type: "line",
            source: src,
            paint: { "line-color": "#3b82f6", "line-opacity": 0.35, "line-width": 1.5 },
          });
        }
      } catch { /* layer ops can fail if map is mid-style-change */ }

      // Pulsing blue dot via custom Marker
      if (!gpsDotRef.current) {
        const el = document.createElement("div");
        el.className = "ksyk-gps-dot";
        el.innerHTML = `
          <style>
            .ksyk-gps-dot{position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;}
            .ksyk-gps-dot__pulse{position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.35);animation:ksyk-gps-pulse 2s ease-out infinite;}
            .ksyk-gps-dot__core{width:16px;height:16px;border-radius:50%;background:#3b82f6;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(59,130,246,0.6);position:relative;z-index:1;}
            @keyframes ksyk-gps-pulse{0%{transform:scale(0.8);opacity:0.9}70%{transform:scale(2.2);opacity:0}100%{transform:scale(2.2);opacity:0}}
          </style>
          <div class="ksyk-gps-dot__pulse"></div>
          <div class="ksyk-gps-dot__core"></div>
        `;
        el.style.cssText = "width:22px;height:22px;";
        gpsMarkerRef.current = el;

        // Dynamically import Marker from maplibre-gl
        import("maplibre-gl").then(({ default: mgl }) => {
          if (!mapInstance) return;
          const marker = new mgl.Marker({ element: el, anchor: "center" })
            .setLngLat([lng, lat])
            .addTo(mapInstance);
          gpsDotRef.current = marker;
        });
      } else {
        gpsDotRef.current.setLngLat([lng, lat]);
      }

      if (gpsFollowingRef.current) {
        mapInstance.easeTo({ center: [lng, lat], duration: 400, essential: true });
      }
    };

    const onErr = (e: GeolocationPositionError) => {
      setGpsError(
        e.code === 1 ? "Paikannus estetty — salli sijaintilupa selaimessa" :
        e.code === 2 ? "Sijaintia ei saatu" : "Paikannus aikakatkaistiin"
      );
    };

    gpsWatchRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 2000,
    });

    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
      }
      if (gpsDotRef.current) {
        gpsDotRef.current.remove();
        gpsDotRef.current = null;
      }
      try {
        if (mapInstance.getLayer("ksyk-gps-accuracy-fill")) mapInstance.removeLayer("ksyk-gps-accuracy-fill");
        if (mapInstance.getLayer("ksyk-gps-accuracy-line")) mapInstance.removeLayer("ksyk-gps-accuracy-line");
        if (mapInstance.getSource("ksyk-gps-accuracy")) mapInstance.removeSource("ksyk-gps-accuracy");
      } catch { /* style may have changed */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGpsLocation, mapInstance]);

  // Full campus data — used to resolve a feature id from a click into
  // the full entity so the info sheet has everything to display.
  const campus = useCampusData();

  // v3.27.5 — await server defaults BEFORE rendering the map. Old
  // code fired-and-forgot the fetch and mounted the map immediately,
  // which meant users briefly saw the hardcoded Kulosaari fallback
  // before the real admin spawn arrived. Now we block the map mount
  // with a 2 s hard timeout so the fetch either completes or we
  // fall back to localStorage — either way the map's first frame
  // reflects the admin's real spawn.
  const [defaultsReady, setDefaultsReady] = useState(false);
  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setDefaultsReady(true); } };
    loadMapDefaultsFromServer().finally(finish);
    // 2 s hard timeout — no user should stare at a spinner forever
    // just because /api/map-defaults is slow.
    const t = window.setTimeout(finish, 2000);
    return () => window.clearTimeout(t);
  }, []);

  // NavigationPanel dispatches `ksyk:select-floor` when the user
  // clicks a step on a different floor — we mirror that into the
  // floor selector so overlays filter to the right level.
  useEffect(() => {
    const onFloor = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === "number") setSelectedFloor(detail);
    };
    window.addEventListener("ksyk:select-floor", onFloor);
    return () => window.removeEventListener("ksyk:select-floor", onFloor);
  }, []);

  // Command palette handlers — palette dispatches these globally so any
  // mounted map view responds. Only the actions that need the map
  // instance live here; global ones (like switch page) fire directly.
  useEffect(() => {
    const on3D = () => {
      const h = handleRef.current;
      if (!h) return;
      const next = is3D ? 0 : 45;
      setIs3D(!is3D);
      h.setPitch(next);
      update("osmPitchDeg", next);
    };
    const onRecenter = () => { handleRef.current?.recenter(); };
    const onResetBearing = () => { handleRef.current?.setBearing(0); };
    const onOpenDirections = () => setShowNav(true);
    const onFlyTo = (e: Event) => {
      const d = (e as CustomEvent<{ lat: number; lng: number; zoom?: number; floor?: number | null }>).detail;
      const h = handleRef.current;
      if (!d || !h) return;
      h.map.flyTo({
        center: [d.lng, d.lat],
        zoom: d.zoom ?? Math.max(h.map.getZoom(), 18),
        bearing: h.map.getBearing(),
        pitch: h.map.getPitch(),
        duration: 800,
        essential: true,
      });
      if (typeof d.floor === "number") setSelectedFloor(d.floor);
    };
    // "/" focuses the header search input; "Escape" closes the info sheet.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setClickedFeature(null); return; }
      const active = document.activeElement;
      const isEditing = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
      if (e.key === "/" && !isEditing) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("ksyk:focus-search"));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("ksyk:cmd:toggle-3d", on3D);
    window.addEventListener("ksyk:cmd:recenter", onRecenter);
    window.addEventListener("ksyk:cmd:reset-bearing", onResetBearing);
    window.addEventListener("ksyk:cmd:open-directions", onOpenDirections);
    window.addEventListener("ksyk:cmd:fly-to", onFlyTo);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("ksyk:cmd:toggle-3d", on3D);
      window.removeEventListener("ksyk:cmd:recenter", onRecenter);
      window.removeEventListener("ksyk:cmd:reset-bearing", onResetBearing);
      window.removeEventListener("ksyk:cmd:open-directions", onOpenDirections);
      window.removeEventListener("ksyk:cmd:fly-to", onFlyTo);
    };
  }, [is3D, update]);

  const _savedLang = typeof window !== "undefined" ? localStorage.getItem('ksyk_language') : null;
  const fi = _savedLang ? _savedLang === 'fi' : (typeof navigator !== "undefined" && navigator.language.startsWith("fi"));

  // ── Quick POI finder ─────────────────────────────────────────────────
  // Finds the nearest POI of the given kind to the current map center on
  // the active floor and flies there. Floor-aware: stairs/elevators serve
  // all floors, generic POIs filter to the current floor when floor is set.
  const findNearestPOI = useCallback((kind: string) => {
    const h = handleRef.current;
    if (!h) return;
    const center = h.map.getCenter();
    type Pt = { lat: number; lng: number };
    const near = (c: Pt) => {
      const dx = c.lng - center.lng; const dy = c.lat - center.lat;
      return dx * dx + dy * dy;
    };
    let best: Pt | null = null;
    let bestD = Infinity;
    const check = (c: Pt) => { const d = near(c); if (d < bestD) { bestD = d; best = c; } };

    if (kind === "stairs") {
      campus.stairs.forEach(s => { if (s.position?.lat && s.position?.lng) check(s.position); });
      // Also rooms typed as stairs
      campus.rooms.filter(r => r.type === "stairs" && r.points?.length).forEach(r => {
        const c = polygonCentroid(r.points!); if (c) check(c);
      });
    } else if (kind === "elevator") {
      campus.elevators.forEach(e => { if (e.position?.lat && e.position?.lng) check(e.position); });
      campus.rooms.filter(r => r.type === "elevator" && r.points?.length).forEach(r => {
        const c = polygonCentroid(r.points!); if (c) check(c);
      });
    } else if (kind === "bathroom") {
      campus.pois.filter(p => (p.kind === "bathroom" || p.kind === "restroom" || p.kind === "restroom_m" || p.kind === "restroom_f" || p.kind === "restroom_a") && (p.floor == null || p.floor === selectedFloor)).forEach(p => {
        if (p.position?.lat && p.position?.lng) check(p.position);
      });
      campus.rooms.filter(r => r.type === "bathroom" && r.points?.length && (r.floor == null || r.floor === selectedFloor)).forEach(r => {
        const c = polygonCentroid(r.points!); if (c) check(c);
      });
    } else {
      campus.pois.filter(p => p.kind === kind && (p.floor == null || p.floor === selectedFloor)).forEach(p => {
        if (p.position?.lat && p.position?.lng) check(p.position);
      });
    }

    if (!best) return;
    h.map.flyTo({ center: [(best as Pt).lng, (best as Pt).lat], zoom: Math.max(h.map.getZoom(), 18.5), duration: 700, essential: true });
  }, [campus, selectedFloor]);

  // Floor list — union of every building's declared floor range.
  // Buildings can span -1..3 while a neighbour is 2..4, so the selector
  // needs every distinct floor number that exists in the campus.
  const floorList = useMemo(() => {
    const set = new Set<number>();
    for (const b of campus.buildings as Building[]) {
      const min = typeof b.floorMin === "number" ? b.floorMin : 1;
      const max = typeof b.floorMax === "number" ? b.floorMax : (b.floors ?? 1);
      const lo = Math.min(min, max);
      const hi = Math.max(min, max);
      for (let f = lo; f <= hi; f++) set.add(f);
    }
    if (set.size === 0) set.add(1);
    return [...set].sort((a, b) => b - a); // top-to-bottom: highest first
  }, [campus.buildings]);

  // v4.5.57 — clamp the active floor into the floors that actually exist
  // once campus data is ready (floorList is only meaningful after the
  // buildings load). A missing or out-of-range value resolves to floor 1
  // so no overlay filters to an empty set. Runs once per load; later
  // manual floor changes come from the selector or real feature data and
  // are already valid, so we leave them untouched.
  useEffect(() => {
    if (!campus.isReady || urlFloorAppliedRef.current) return;
    urlFloorAppliedRef.current = true;
    setSelectedFloor((current) => resolveFloor(current, floorList));
  }, [campus.isReady, floorList]);

  // Room count per floor — shown as a tiny badge under each floor
  // number so users can see at a glance which floors have many rooms.
  const roomsPerFloor = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of campus.rooms) {
      const f = (r as { floor?: number | null }).floor;
      if (typeof f === "number") m.set(f, (m.get(f) ?? 0) + 1);
    }
    return m;
  }, [campus.rooms]);

  const onMapReady = useCallback((h: CampusMapHandle) => {
    handleRef.current = h;
    setMapInstance(h.map);
  }, []);

  /** Resolve a click on a rendered feature into a full entity for the
   *  info sheet. CampusOverlay only knows kind + id — we look the rest
   *  up from useCampusData. */
  const onFeatureClick = useCallback((kind: "building" | "room" | "hallway", id: string) => {
    if (kind === "building") {
      const b = campus.buildings.find((x) => x.id === id);
      if (b) {
        setClickedFeature({ kind: "building", entity: b });
        if (b.points?.length) {
          setHighlightPolygon(b.points);
          // Zoom to fit the building's bounds so the whole footprint is visible.
          const h = handleRef.current;
          if (h && b.points.length >= 2) {
            const lngs = b.points.map((p) => p.lng);
            const lats = b.points.map((p) => p.lat);
            const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
            const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
            h.map.fitBounds([sw, ne], { padding: 80, maxZoom: 20, duration: 700 });
          }
        }
      }
    } else if (kind === "room") {
      const r = campus.rooms.find((x) => x.id === id);
      // Corridors (type="hallway") are walkable areas, not rooms — skip.
      if (r && r.type !== "hallway") {
        setClickedFeature({ kind: "room", entity: r });
        if (r.points?.length) setHighlightPolygon(r.points);
      }
    } else {
      const h = campus.hallways.find((x) => x.id === id);
      if (h) setClickedFeature({ kind: "hallway", entity: h });
    }
  }, [campus]);

  /** Handoff to NavigationPanel — opens it (if closed) and fires an
   *  event carrying the destination. NavigationPanel listens and
   *  prefills the To field. */
  const handleRouteTo = useCallback((f: ClickedFeature) => {
    posthog.capture("directions_opened", { destination_type: f.kind, entry_point: "feature_info_sheet" });
    setShowNav(true);
    setClickedFeature(null);
    // Defer so NavigationPanel is mounted before we dispatch.
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent("ksyk:route-to", { detail: f }));
      } catch { /* SSR / old browser — non-fatal */ }
    }, 60);
  }, []);

  const toggle3D = useCallback(() => {
    const next = is3D ? 0 : 45;
    posthog.capture("map_view_mode_changed", { view_mode: next > 0 ? "3d" : "2d" });
    setIs3D(!is3D);
    handleRef.current?.setPitch(next);
    update("osmPitchDeg", next);
  }, [is3D, update]);

  // When persisted is3D says "on" but the map loaded flat (fresh
  // mount, no user gesture yet), lift the pitch so 3D extrusions
  // become visible. Only fires once per mount.
  useEffect(() => {
    if (!mapInstance || !is3D) return;
    if (mapInstance.getPitch() < 5) mapInstance.setPitch(45);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance]);

  /** Center the camera on the platform default (mobile vs laptop) while
   *  preserving whatever bearing the user has set — clicking Center
   *  shouldn't rip them out of a rotated view. Pitch is preserved too. */
  const recenter = useCallback(async () => {
    try {
      await loadMapDefaultsFromServer();
    } catch { /* keep current settings */ }
    const h = handleRef.current;
    if (!h) return;
    // Re-read the snapshot fresh — the `settings` from the closure was
    // captured before the server-load merged new values in.
    const target = pickPlatformMapDefaults(loadAppSettings());
    // Center resets to the admin's chosen view: center + zoom AND
    // bearing + pitch. If the user only wants to re-center without
    // touching rotation they can use the CompassChip (auto-hidden
    // when already at the default bearing).
    h.map.flyTo({
      center: [target.lng, target.lat],
      zoom: target.zoom,
      bearing: target.bearing,
      pitch: target.pitch,
      duration: 800,
      essential: true,
    });
  }, []);

  /** Fly the map to the pick AND open the FeatureInfoSheet.
   *  v3.27.3 — reverted the "search click = directions" behaviour;
   *  clicking a search result now opens the info drawer (with photo /
   *  hours / contact / etc.) so users can see WHAT the room is before
   *  deciding whether to route to it. The info drawer's "Directions
   *  here" button still hands off to NavigationPanel for the routing
   *  flow, so the previous behaviour is one tap away. */
  const onPickResult = useCallback((pick: SearchPick) => {
    const h = handleRef.current;
    if (!h) return;
    let centre: { lat: number; lng: number } | null = null;
    let infoFeature: ClickedFeature | null = null;
    if (pick.kind === "room" && pick.room.points?.length) {
      centre = polygonCentroid(pick.room.points);
      if (typeof pick.room.floor === "number") setSelectedFloor(pick.room.floor);
      setHighlightPolygon(pick.room.points);
      infoFeature = { kind: "room", entity: pick.room };
    } else if (pick.kind === "building" && pick.building.points?.length) {
      centre = polygonCentroid(pick.building.points);
      setHighlightPolygon(pick.building.points);
      infoFeature = { kind: "building", entity: pick.building };
    }
    if (centre) {
      h.map.flyTo({
        center: [centre.lng, centre.lat],
        zoom: Math.max(h.map.getZoom(), pick.kind === "building" ? 17.5 : 18.5),
        // Preserve rotation + pitch — the user asked us to keep it.
        bearing: h.map.getBearing(),
        pitch: h.map.getPitch(),
        duration: 800,
        essential: true,
      });
    }
    // Show the info drawer — same UI a click on the map opens.
    if (infoFeature) {
      posthog.capture("map_search_result_selected", { result_type: pick.kind });
      setClickedFeature(infoFeature);
    }
    // v3.27.5 — clear the search input after a pick so the dropdown
    // closes and the info drawer isn't blocked. Especially critical
    // on mobile where the dropdown occupies most of the viewport.
    // Header/home listens for `ksyk:search-clear` to zero out its
    // controlled searchQuery state.
    try { window.dispatchEvent(new CustomEvent("ksyk:search-clear")); }
    catch { /* SSR / old browser — non-fatal */ }
  }, []);

  return (
    <div className="absolute inset-0">
      {/* v3.27.5 — hold map mount until admin defaults have loaded
       *  (or the 2s timeout fired). Prevents the flash of Kulosaari
       *  fallback before the real spawn arrives. */}
      {defaultsReady && <CampusMap onReady={onMapReady} />}
      {!defaultsReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-50 to-blue-50/40 dark:from-gray-950 dark:to-slate-900">
          <div className="relative h-14 w-14 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-[2.5px] border-blue-100 dark:border-blue-950" />
            <div className="absolute inset-0 rounded-full border-[2.5px] border-blue-500 dark:border-blue-400 border-t-transparent animate-spin" />
            <span className="text-[13px] font-black tracking-widest text-blue-500 dark:text-blue-400">K</span>
          </div>
          <p className="text-[12px] font-medium text-slate-400 dark:text-gray-600 tracking-wide">Loading campus map…</p>
        </div>
      )}

      {/* Live campus overlay — draws every published building, room,
       *  and hallway on top of the OSM basemap. Refetches every 60s so
       *  Builder publishes show up on the public map without a reload.
       *  `map` is state (not ref) so a fresh mount that hasn't triggered
       *  a re-render yet still installs its layers. */}
      <ErrorBoundary
        name="CampusOverlay"
        fallback={
          <div className="absolute bottom-4 left-4 z-50 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 shadow">
            Map overlay error — reload to recover
          </div>
        }
      >
        <CampusOverlay
          map={mapInstance}
          activeFloor={selectedFloor}
          onFeatureClick={onFeatureClick}
          is3D={is3D}
        />
      </ErrorBoundary>

      {/* Search results overlay — anchored under the header search bar. */}
      <SearchResultsDropdown
        query={searchQuery}
        onSelect={onPickResult}
      />

      {/* GPS status chip — admin campus-map tab only. Bottom-left. */}
      {showGpsLocation && (
        <div
          className="absolute left-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-md border shadow-sm"
          style={{ bottom: "max(1.5rem, calc(1rem + env(safe-area-inset-bottom)))" }}
        >
          {gpsError ? (
            <span className="text-red-500 border-red-200 bg-red-50/90 dark:bg-red-950/60 dark:border-red-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              {gpsError}
            </span>
          ) : gpsPosition ? (
            <span className="text-blue-700 dark:text-blue-300 bg-white/90 dark:bg-gray-900/90 border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse" />
              {gpsPosition.lat.toFixed(5)}°N&nbsp;{gpsPosition.lng.toFixed(5)}°E&nbsp;
              <span className="text-blue-400 dark:text-blue-500">±{Math.round(gpsPosition.accuracy)}m</span>
            </span>
          ) : (
            <span className="text-slate-500 bg-white/90 dark:bg-gray-900/90 border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-300 inline-block animate-pulse" />
              GPS paikantaa…
            </span>
          )}
        </div>
      )}

      {/* Floor selector — top-right. Hidden when there's only one floor
       *  in the whole campus. Renders the UNION of every building's
       *  floor range so a building spanning -1..3 and another at 4 both
       *  show up. MazeMap-style — highlighted active floor, subtle chip
       *  around each row, tighter spacing so 6+ floors still fit on
       *  mobile without scrolling. */}
      {floorList.length > 1 && (
        <div
          className="absolute right-3 z-30 flex flex-col p-1 rounded-2xl border border-white/80 dark:border-gray-700/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-lg shadow-black/10"
          style={{ top: "max(0.75rem, calc(0.75rem + env(safe-area-inset-top)))" }}
          aria-label="Floor selector"
        >
          {/* v3.25.9 — icon replaces the "FL" text label. Chrome's
           *  auto-translate was rewriting "FL" to "Florida" in some
           *  locales; even with the global translate="no" we don't want
           *  a two-letter abbreviation whose language-neutrality is
           *  fragile. The layers icon reads as "floors" universally. */}
          <div
            className="flex items-center justify-center py-1 text-muted-foreground"
            translate="no"
            aria-label="Floors"
            title="Floors"
          >
            <Layers className="h-3 w-3" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col gap-0.5">
            {floorList.map((floor) => (
              <button
                key={floor}
                type="button"
                aria-label={`Floor ${floor}`}
                aria-pressed={selectedFloor === floor}
                onClick={() => {
                  posthog.capture("map_floor_selected", { floor });
                  setSelectedFloor(floor);
                }}
                className={cn(
                  "min-w-[38px] h-9 px-2 rounded-xl text-sm font-bold transition-all leading-none tabular-nums flex flex-col items-center justify-center gap-0.5",
                  selectedFloor === floor
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25 scale-[1.02]"
                    : "text-foreground hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
                )}
              >
                <span>{floor}</span>
                {(roomsPerFloor.get(floor) ?? 0) > 0 && (
                  <span className={cn(
                    "text-[8px] font-semibold tabular-nums leading-none",
                    selectedFloor === floor ? "text-blue-200" : "text-muted-foreground",
                  )}>
                    {roomsPerFloor.get(floor)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Right-side control rail — single vertical column with consistent
       *  spacing so buttons can't overlap the way they did when each stack
       *  had its own hardcoded `bottom` offset. Groups stay visually
       *  distinct via the border between them; flex-col gap-3 handles
       *  the between-group breathing room. */}
      <div
        className="absolute right-3 z-30 flex flex-col-reverse gap-2 items-end max-h-[calc(100%-3rem)] overflow-hidden"
        style={{ bottom: "max(0.5rem, env(safe-area-inset-bottom, 0.5rem))" }}
      >
        {/* 3D toggle + Center */}
        <div className="flex flex-col gap-1.5">
          {canUse3D && (
          <button
            type="button"
            aria-label={is3D ? "Switch to flat 2D" : "Switch to 3D view"}
            aria-pressed={is3D}
            onClick={toggle3D}
            title={is3D ? "2D flat" : "3D view"}
            className={cn(
              "w-10 h-10 rounded-2xl border shadow-md flex items-center justify-center transition-colors active:scale-[0.97]",
              is3D
                ? "bg-blue-600 text-white border-blue-700/40 shadow-blue-600/30"
                : "bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-white/80 dark:border-gray-700/80 text-foreground hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 shadow-black/10",
            )}
          >
            <span className="text-[11px] font-bold tabular-nums">
              {is3D ? "3D" : "2D"}
            </span>
          </button>
          )}

          <button
            type="button"
            aria-label="Reset view to campus defaults"
            onClick={recenter}
            title="Reset view — recenter, zoom, rotate to defaults"
            className="w-10 h-10 rounded-2xl border border-white/80 dark:border-gray-700/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md text-foreground shadow-md shadow-black/10 flex items-center justify-center transition-colors active:scale-[0.97] hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
          >
            <LocateFixed className="h-4 w-4" strokeWidth={2.25} />
          </button>
          {/* GPS button — admin campus-map tab only */}
          {showGpsLocation && (
            <button
              type="button"
              title={
                gpsError ? gpsError :
                gpsPosition ? `GPS: ${gpsPosition.lat.toFixed(5)}, ${gpsPosition.lng.toFixed(5)} (±${Math.round(gpsPosition.accuracy)}m)` :
                "Paikannus käynnissä…"
              }
              onClick={() => {
                if (gpsPosition && mapInstance) {
                  mapInstance.flyTo({
                    center: [gpsPosition.lng, gpsPosition.lat],
                    zoom: Math.max(mapInstance.getZoom(), 19),
                    duration: 900,
                    essential: true,
                  });
                  setGpsFollowing((v) => { gpsFollowingRef.current = !v; return !v; });
                }
              }}
              className={cn(
                "w-10 h-10 rounded-2xl border shadow-md flex items-center justify-center transition-colors active:scale-[0.97]",
                gpsError
                  ? "bg-red-50 border-red-200 text-red-500 dark:bg-red-950/30 dark:border-red-800"
                  : gpsPosition
                    ? gpsFollowing
                      ? "bg-blue-600 text-white border-blue-700/40 shadow-blue-600/30"
                      : "bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-white/80 dark:border-gray-700/80 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                    : "bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-white/80 dark:border-gray-700/80 text-foreground animate-pulse",
              )}
            >
              <Navigation className="h-4 w-4" strokeWidth={2.25} />
            </button>
          )}
        </div>

        {/* Zoom in / out — attached pair, one rounded chip. */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-white/80 dark:border-gray-700/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-md shadow-black/10">
          <button
            type="button"
            onClick={() => {
              handleRef.current?.zoomIn();
              // Announce for the Zoom Lord easter egg watcher (see
              // useKsykEasterEggs). Custom event keeps the hook
              // decoupled from MapLibre.
              window.dispatchEvent(new CustomEvent("ksyk:zoomin"));
            }}
            aria-label="Zoom in"
            title="Zoom in"
            className="w-10 h-10 flex items-center justify-center text-foreground border-b border-border transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            onClick={() => handleRef.current?.zoomOut()}
            aria-label="Zoom out"
            title="Zoom out"
            className="w-10 h-10 flex items-center justify-center text-foreground transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 active:scale-[0.97]"
          >
            <Minus className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        {/* Directions — opens the NavigationPanel top-left. Toggle button
         *  so users can retract it. Hidden for restricted users when routing
         *  is disabled in security settings. */}
        {canUseRouting && (
        <button
          type="button"
          onClick={() => {
            if (!showNav) posthog.capture("directions_opened", { entry_point: "map_controls" });
            setShowNav((v) => !v);
          }}
          aria-label={showNav ? "Close directions" : "Get directions"}
          aria-pressed={showNav}
          title="Directions"
          className={cn(
            "w-10 h-10 rounded-2xl border shadow-md flex items-center justify-center transition-colors active:scale-[0.97]",
            showNav
              ? "bg-blue-600 text-white border-blue-700/40 shadow-blue-600/30"
              : "bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-white/80 dark:border-gray-700/80 text-foreground hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 shadow-black/10",
          )}
        >
          <Navigation2 className="h-4 w-4" strokeWidth={2.25} />
        </button>
        )}

        {/* Compass — MazeMap-style rotation chip. Auto-hides when the
         *  map is at the admin's default bearing/pitch; taps to reset.
         *  The N arrow rotates with the map so users always know
         *  which way north is even when the map is spun. */}
        <CompassChip map={mapInstance} />

        {/* LayersToggle temporarily removed — available in builder only. */}
      </div>

      {showNav && (
        <NavigationPanel
          map={mapInstance}
          onClose={() => setShowNav(false)}
          searchActive={!!searchQuery.trim()}
        />
      )}

      {/* Floor-change toast — brief indicator when switching floors. */}
      {floorToast && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none select-none">
          <div
            className="px-7 py-3 rounded-2xl font-bold text-[22px] shadow-xl backdrop-blur-md"
            style={{
              background: "rgba(15,23,42,0.88)",
              color: "#f1f5f9",
              animation: "ksyk-floor-toast 1.4s ease forwards",
            }}
          >
            {floorToast}
          </div>
          <style>{`
            @keyframes ksyk-floor-toast {
              0%   { opacity:0; transform:scale(0.85); }
              15%  { opacity:1; transform:scale(1); }
              70%  { opacity:1; transform:scale(1); }
              100% { opacity:0; transform:scale(0.9) translateY(-8px); }
            }
          `}</style>
        </div>
      )}

      {/* Quick POI finder — MazeMap-style pill bar to jump to the nearest
       *  WC / Stairs / Elevator / Info / Cafe. Hidden when the info sheet
       *  is open (it would be covered) or nav panel is open. */}
      {!clickedFeature && !showNav && campus.isReady && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 px-2 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg shadow-black/10 select-none"
          style={{ bottom: "max(1.25rem, calc(0.75rem + env(safe-area-inset-bottom)))" }}
        >
          {([
            { kind: "bathroom",  glyph: "WC", label: "WC",                        fg: "text-pink-600 dark:text-pink-400" },
            { kind: "stairs",    glyph: "⊿",  label: fi ? "Portaat" : "Stairs",    fg: "text-amber-600 dark:text-amber-400" },
            { kind: "elevator",  glyph: "↕",  label: fi ? "Hissi" : "Lift",        fg: "text-blue-600 dark:text-blue-400" },
            { kind: "info",      glyph: "ⓘ",  label: "Info",                       fg: "text-sky-600 dark:text-sky-400" },
            { kind: "cafe",      glyph: "☕",  label: fi ? "Kahvila" : "Cafe",      fg: "text-amber-700 dark:text-amber-500" },
          ] as const).map(({ kind, glyph, label, fg }) => (
            <button
              key={kind}
              type="button"
              onClick={() => findNearestPOI(kind)}
              title={fi ? `Löydä lähin: ${label}` : `Find nearest: ${label}`}
              className="flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl hover:bg-black/6 dark:hover:bg-white/6 active:scale-[0.95] transition-all"
            >
              <span className={cn("text-[13px] font-bold leading-none", fg)}>{glyph}</span>
              <span className="text-[8.5px] font-semibold text-muted-foreground leading-none tracking-tight">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Feature info sheet — click a room/building on the map to
       *  inspect it and get one-tap directions there. */}
      {clickedFeature && (
        <FeatureInfoSheet
          feature={clickedFeature}
          onClose={() => setClickedFeature(null)}
          onRouteTo={handleRouteTo}
        />
      )}

      {/* Ephemeral pulsing outline on the last-picked feature so users
       *  can find it after the fly-to. Auto-clears after ~2.5s. */}
      {highlightPolygon && (
        <FeatureHighlight
          map={mapInstance}
          polygon={highlightPolygon}
          onFinished={() => setHighlightPolygon(null)}
        />
      )}
    </div>
  );
}

