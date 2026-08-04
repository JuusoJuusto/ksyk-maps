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
import { usePersistedState } from "@/hooks/usePersistedState";
import { useQuery } from "@tanstack/react-query";
import CampusMap, { type CampusMapHandle } from "@/components/CampusMap";
import CampusOverlay from "@/components/CampusOverlay";
import SearchResultsDropdown, { type SearchPick } from "@/components/SearchResultsDropdown";
import LayersToggle from "@/components/LayersToggle";
import { useAppSettings, loadMapDefaultsFromServer, pickPlatformMapDefaults } from "@/hooks/useAppSettings";
import { loadAppSettings } from "@/lib/appSettings";
import { LocateFixed, Plus, Minus, Navigation2, Layers } from "lucide-react";
import NavigationPanel from "@/components/NavigationPanel";
import FeatureInfoSheet, { type ClickedFeature } from "@/components/FeatureInfoSheet";
import FeatureHighlight from "@/components/FeatureHighlight";
import CompassChip from "@/components/CompassChip";
import type { LatLng } from "@ksyk/shared";
import { cn } from "@/lib/utils";
import { polygonCentroid } from "@ksyk/shared";
import type { Building as SharedBuilding } from "@ksyk/shared";
import { useCampusData } from "@/hooks/useCampusData";

interface KSYKMapViewProps {
  /** From the header search input — drives the dropdown + map focus. */
  searchQuery?: string;
}

/** Local building shape — extends the shared one with just what the
 *  floor selector needs. Buildings without `floors` fall back to 1. */
interface Building extends Pick<SharedBuilding, "id" | "name" | "floors" | "points"> {
  floorMin?: number | null;
  floorMax?: number | null;
}

export default function KSYKMapView(props: KSYKMapViewProps = {}) {
  const { searchQuery = "" } = props;
  const { settings, update } = useAppSettings();
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
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const f = Number(p.get("floor"));
    if (Number.isFinite(f)) setSelectedFloor(f);
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
  const [showNav, setShowNav] = useState(false);
  const [clickedFeature, setClickedFeature] = useState<ClickedFeature | null>(null);
  const [highlightPolygon, setHighlightPolygon] = useState<LatLng[] | null>(null);

  // Full campus data — used to resolve a feature id from a click into
  // the full entity so the info sheet has everything to display.
  const campus = useCampusData();

  // Pull the admin-published map defaults on first mount so every user
  // (including mobile) picks up mobile* / desktop* overrides. Without
  // this the client only ever saw whatever was in localStorage — the
  // mobile publish would land in Firestore but never reach the map
  // until the user clicked Recenter. Fires once; failures are silent.
  useEffect(() => {
    void loadMapDefaultsFromServer();
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
    window.addEventListener("ksyk:cmd:toggle-3d", on3D);
    window.addEventListener("ksyk:cmd:recenter", onRecenter);
    window.addEventListener("ksyk:cmd:reset-bearing", onResetBearing);
    window.addEventListener("ksyk:cmd:open-directions", onOpenDirections);
    window.addEventListener("ksyk:cmd:fly-to", onFlyTo);
    return () => {
      window.removeEventListener("ksyk:cmd:toggle-3d", on3D);
      window.removeEventListener("ksyk:cmd:recenter", onRecenter);
      window.removeEventListener("ksyk:cmd:reset-bearing", onResetBearing);
      window.removeEventListener("ksyk:cmd:open-directions", onOpenDirections);
      window.removeEventListener("ksyk:cmd:fly-to", onFlyTo);
    };
  }, [is3D, update]);

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
        if (b.points?.length) setHighlightPolygon(b.points);
      }
    } else if (kind === "room") {
      const r = campus.rooms.find((x) => x.id === id);
      if (r) {
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
    if (infoFeature) setClickedFeature(infoFeature);
  }, []);

  return (
    <div className="absolute inset-0">
      <CampusMap onReady={onMapReady} />

      {/* Live campus overlay — draws every published building, room,
       *  and hallway on top of the OSM basemap. Refetches every 60s so
       *  Builder publishes show up on the public map without a reload.
       *  `map` is state (not ref) so a fresh mount that hasn't triggered
       *  a re-render yet still installs its layers. */}
      <CampusOverlay
        map={mapInstance}
        activeFloor={selectedFloor}
        onFeatureClick={onFeatureClick}
        is3D={is3D}
      />

      {/* Search results overlay — anchored under the header search bar. */}
      <SearchResultsDropdown
        query={searchQuery}
        onSelect={onPickResult}
      />

      {/* Floor selector — top-right. Hidden when there's only one floor
       *  in the whole campus. Renders the UNION of every building's
       *  floor range so a building spanning -1..3 and another at 4 both
       *  show up. MazeMap-style — highlighted active floor, subtle chip
       *  around each row, tighter spacing so 6+ floors still fit on
       *  mobile without scrolling. */}
      {floorList.length > 1 && (
        <div
          className="absolute right-3 z-30 flex flex-col p-1 rounded-2xl border border-border bg-card/95 shadow-md backdrop-blur-md"
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
                onClick={() => setSelectedFloor(floor)}
                className={cn(
                  "min-w-[36px] h-9 px-1 rounded-xl text-[13px] font-bold transition-all leading-none tabular-nums flex items-center justify-center",
                  selectedFloor === floor
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25 scale-[1.02]"
                    : "text-foreground hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
                )}
              >
                {floor}
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
        className="absolute right-3 z-30 flex flex-col-reverse gap-3 items-end"
        style={{ bottom: "max(1.5rem, calc(1rem + env(safe-area-inset-bottom)))" }}
      >
        {/* 3D toggle + Center */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            aria-label={is3D ? "Switch to flat 2D" : "Switch to 3D view"}
            aria-pressed={is3D}
            onClick={toggle3D}
            title={is3D ? "2D flat" : "3D view"}
            className={cn(
              "w-11 h-11 rounded-2xl border shadow-sm flex items-center justify-center transition-colors active:scale-[0.97]",
              is3D
                ? "bg-blue-600 text-white border-blue-700/40 shadow-blue-600/25"
                : "bg-card border-border text-foreground hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
            )}
          >
            <span className="text-[11px] font-bold tabular-nums">
              {is3D ? "3D" : "2D"}
            </span>
          </button>

          <button
            type="button"
            aria-label="Reset view to campus defaults"
            onClick={recenter}
            title="Reset view — recenter, zoom, rotate to defaults"
            className="w-11 h-11 rounded-2xl border border-border bg-card text-foreground shadow-sm flex items-center justify-center transition-colors active:scale-[0.97] hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
          >
            <LocateFixed className="h-[19px] w-[19px]" strokeWidth={2.25} />
          </button>
        </div>

        {/* Zoom in / out — attached pair, one rounded chip. */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
            className="w-11 h-11 flex items-center justify-center text-foreground border-b border-border transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 active:scale-[0.97]"
          >
            <Plus className="h-[19px] w-[19px]" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            onClick={() => handleRef.current?.zoomOut()}
            aria-label="Zoom out"
            title="Zoom out"
            className="w-11 h-11 flex items-center justify-center text-foreground transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 active:scale-[0.97]"
          >
            <Minus className="h-[19px] w-[19px]" strokeWidth={2.25} />
          </button>
        </div>

        {/* Directions — opens the NavigationPanel top-left. Toggle button
         *  so users can retract it. */}
        <button
          type="button"
          onClick={() => setShowNav((v) => !v)}
          aria-label={showNav ? "Close directions" : "Get directions"}
          aria-pressed={showNav}
          title="Directions"
          className={cn(
            "w-11 h-11 rounded-2xl border shadow-sm flex items-center justify-center transition-colors active:scale-[0.97]",
            showNav
              ? "bg-blue-600 text-white border-blue-700/40 shadow-blue-600/25"
              : "bg-card border-border text-foreground hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
          )}
        >
          <Navigation2 className="h-[19px] w-[19px]" strokeWidth={2.25} />
        </button>

        {/* Compass — MazeMap-style rotation chip. Auto-hides when the
         *  map is at the admin's default bearing/pitch; taps to reset.
         *  The N arrow rotates with the map so users always know
         *  which way north is even when the map is spun. */}
        <CompassChip map={mapInstance} />

        {/* Layers — popover with per-layer visibility toggles. Client-only
         *  overrides on top of whatever the admin publishes. */}
        <LayersToggle />
      </div>

      {showNav && (
        <NavigationPanel
          map={mapInstance}
          onClose={() => setShowNav(false)}
          searchActive={!!searchQuery.trim()}
        />
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
