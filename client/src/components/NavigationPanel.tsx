/**
 * NavigationPanel — v1 directions overlay for the public map.
 *
 * Simple flow:
 *   1. Two search inputs (from / to). Each opens the same shared
 *      search index used by the header search.
 *   2. Compute the route as a straight great-circle line between the
 *      centroids (hallway A* comes later). Show distance + walking
 *      time.
 *   3. Draw the route as a blue dashed line on the map, with green
 *      "A" and red "B" pins at either end. Auto-fit the map to the
 *      route bounds.
 *
 * Kept as a floating card in the corner so it stays out of the way
 * when not in use. `onClose` retracts it back to a small pill.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigation2, X, ArrowRightLeft, MapPin, Clock } from "lucide-react";
import type { Map as MaplibreMap } from "maplibre-gl";
import type { Building, Room } from "@ksyk/shared";
import { buildRoomSearchIndex, polygonCentroid, haversineMeters } from "@ksyk/shared";
import { fetchList } from "@/lib/fetchList";
import { cn } from "@/lib/utils";

interface NavigationPanelProps {
  map: MaplibreMap | null;
  onClose: () => void;
}

type Endpoint =
  | { kind: "room"; room: Room; building: Building | null }
  | { kind: "building"; building: Building };

/** Preferred display name for an endpoint. */
function endpointLabel(e: Endpoint): string {
  if (e.kind === "building") return e.building.name;
  const parts = [e.room.roomNumber, e.room.name].filter(Boolean);
  return parts.join(" · ") || "(unnamed room)";
}

function endpointCenter(e: Endpoint): { lat: number; lng: number } | null {
  if (e.kind === "building") {
    return e.building.points?.length ? polygonCentroid(e.building.points) : null;
  }
  return e.room.points?.length ? polygonCentroid(e.room.points) : null;
}

/** Walking pace — 1.35 m/s, indoor-ish. */
const WALKING_MPS = 1.35;

const ROUTE_SOURCE_ID = "nav-route-src";
const ROUTE_LAYER_ID = "nav-route-line";
const ROUTE_ENDS_SOURCE_ID = "nav-route-ends";
const ROUTE_ENDS_LAYER_ID = "nav-route-ends-layer";

export default function NavigationPanel({ map, onClose }: NavigationPanelProps) {
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    queryFn: () => fetchList<Room>("/api/rooms"),
    staleTime: 60_000,
  });
  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
    queryFn: () => fetchList<Building>("/api/buildings"),
    staleTime: 60_000,
  });

  const index = useMemo(() => buildRoomSearchIndex(rooms, buildings), [rooms, buildings]);

  const [from, setFrom] = useState<Endpoint | null>(null);
  const [to, setTo] = useState<Endpoint | null>(null);

  const route = useMemo(() => {
    if (!from || !to) return null;
    const a = endpointCenter(from);
    const b = endpointCenter(to);
    if (!a || !b) return null;
    return {
      a, b,
      distanceMeters: haversineMeters(a, b),
    };
  }, [from, to]);

  const walkingSeconds = route ? route.distanceMeters / WALKING_MPS : 0;

  // Draw / clear the route on the map when it changes.
  useEffect(() => {
    if (!map) return;
    const upsertLine = () => {
      if (!route) {
        // Clear any existing route.
        if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
        if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
        if (map.getLayer(ROUTE_ENDS_LAYER_ID)) map.removeLayer(ROUTE_ENDS_LAYER_ID);
        if (map.getSource(ROUTE_ENDS_SOURCE_ID)) map.removeSource(ROUTE_ENDS_SOURCE_ID);
        return;
      }
      const lineData = {
        type: "FeatureCollection" as const,
        features: [{
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [[route.a.lng, route.a.lat], [route.b.lng, route.b.lat]],
          },
          properties: {},
        }],
      };
      // Midpoint chip — shows the distance floating on the route line.
      const midLat = (route.a.lat + route.b.lat) / 2;
      const midLng = (route.a.lng + route.b.lng) / 2;
      const distanceLabel = route.distanceMeters < 1000
        ? `${route.distanceMeters.toFixed(0)} m`
        : `${(route.distanceMeters / 1000).toFixed(2)} km`;
      const endsData = {
        type: "FeatureCollection" as const,
        features: [
          { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [route.a.lng, route.a.lat] }, properties: { role: "from", label: "A" } },
          { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [route.b.lng, route.b.lat] }, properties: { role: "to",   label: "B" } },
          { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [midLng, midLat] },           properties: { role: "mid",  label: distanceLabel } },
        ],
      };
      const srcLine = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      const srcEnds = map.getSource(ROUTE_ENDS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (srcLine) srcLine.setData(lineData as never);
      else {
        map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: lineData as never });
        map.addLayer({
          id: ROUTE_LAYER_ID,
          source: ROUTE_SOURCE_ID,
          type: "line",
          paint: {
            "line-color": "#2563eb",
            "line-width": 6,
            "line-opacity": 0.85,
            "line-dasharray": [2, 1.5],
          },
        });
      }
      if (srcEnds) srcEnds.setData(endsData as never);
      else {
        map.addSource(ROUTE_ENDS_SOURCE_ID, { type: "geojson", data: endsData as never });
        // Circle behind each endpoint / distance chip.
        map.addLayer({
          id: ROUTE_ENDS_LAYER_ID,
          source: ROUTE_ENDS_SOURCE_ID,
          type: "circle",
          paint: {
            "circle-radius": ["case",
              ["==", ["get", "role"], "mid"], 16,
              10,
            ],
            "circle-color": ["case",
              ["==", ["get", "role"], "from"], "#10b981",
              ["==", ["get", "role"], "to"],   "#dc2626",
              "#ffffff",
            ],
            "circle-stroke-color": ["case",
              ["==", ["get", "role"], "mid"], "#2563eb",
              "#ffffff",
            ],
            "circle-stroke-width": 3,
          },
          filter: ["!=", ["get", "role"], "mid-hidden"],
        });
        // Text labels — "A", "B", and the distance figure.
        map.addLayer({
          id: `${ROUTE_ENDS_LAYER_ID}-label`,
          source: ROUTE_ENDS_SOURCE_ID,
          type: "symbol",
          layout: {
            "text-field": ["get", "label"],
            "text-size": ["case",
              ["==", ["get", "role"], "mid"], 11,
              12,
            ],
            "text-font": ["Noto Sans Regular"],
            "text-allow-overlap": true,
            "text-anchor": "center",
          },
          paint: {
            "text-color": ["case",
              ["==", ["get", "role"], "mid"], "#1e3a8a",
              "#ffffff",
            ],
          },
        });
      }
      // Fit the route bounds, preserving rotation + pitch.
      const minLng = Math.min(route.a.lng, route.b.lng);
      const maxLng = Math.max(route.a.lng, route.b.lng);
      const minLat = Math.min(route.a.lat, route.b.lat);
      const maxLat = Math.max(route.a.lat, route.b.lat);
      map.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
        padding: 100,
        duration: 600,
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    };
    if (map.isStyleLoaded()) upsertLine();
    else map.once("load", upsertLine);
    return () => {
      // Route lifetime = component lifetime. On unmount, clear.
    };
  }, [map, route]);

  // Clean up route layers when the panel unmounts.
  useEffect(() => {
    return () => {
      if (!map) return;
      const labelId = `${ROUTE_ENDS_LAYER_ID}-label`;
      if (map.getLayer(labelId)) map.removeLayer(labelId);
      if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
      if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
      if (map.getLayer(ROUTE_ENDS_LAYER_ID)) map.removeLayer(ROUTE_ENDS_LAYER_ID);
      if (map.getSource(ROUTE_ENDS_SOURCE_ID)) map.removeSource(ROUTE_ENDS_SOURCE_ID);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  const swap = useCallback(() => {
    setFrom(to);
    setTo(from);
  }, [from, to]);

  return (
    <div
      className={cn(
        // Mobile: bottom sheet, full width, safe-area padded so the map
        // controls above it stay reachable. Desktop / sm+: floating
        // top-left card. z-40 sits below the header (z-50) but above
        // the right-rail buttons.
        "fixed z-40 rounded-2xl border border-border bg-card shadow-xl overflow-hidden",
        "left-2 right-2 sm:left-3 sm:right-auto sm:w-[min(92vw,24rem)]",
        // Bottom-anchored on mobile, top-anchored on desktop.
        "bottom-2 sm:bottom-auto sm:top-24",
      )}
      style={{
        // Respect safe-area on both edges.
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        maxHeight: "min(70dvh, 34rem)",
      }}
      role="dialog"
      aria-label="Navigation directions"
    >
      <header className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border bg-blue-50/50 dark:bg-blue-950/30">
        <Navigation2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <p className="text-[13px] font-semibold text-foreground flex-1">Directions</p>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Close directions"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="p-3 space-y-2.5 overflow-y-auto">
        <EndpointField
          label="From"
          color="#10b981"
          value={from}
          onChange={setFrom}
          index={index}
        />

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <button
            type="button"
            onClick={swap}
            disabled={!from || !to}
            title="Swap from / to"
            className={cn(
              "h-7 w-7 rounded-full border border-border flex items-center justify-center transition-colors",
              from && to
                ? "text-foreground hover:bg-muted"
                : "text-muted-foreground opacity-50 cursor-not-allowed",
            )}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex-1 h-px bg-border" />
        </div>

        <EndpointField
          label="To"
          color="#dc2626"
          value={to}
          onChange={setTo}
          index={index}
        />

        {route && (
          <div className="mt-2 rounded-xl bg-muted/40 border border-border p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Distance</div>
              <div className="text-base font-semibold tabular-nums">
                {route.distanceMeters < 1000
                  ? `${route.distanceMeters.toFixed(0)} m`
                  : `${(route.distanceMeters / 1000).toFixed(2)} km`}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" /> Walking
              </div>
              <div className="text-base font-semibold tabular-nums">
                {formatWalkTime(walkingSeconds)}
              </div>
            </div>
          </div>
        )}
        {!route && from && to && (
          <p className="text-[11px] text-muted-foreground text-center">
            One of these has no location on the map yet.
          </p>
        )}
        {(!from || !to) && (
          <p className="text-[11px] text-muted-foreground text-center">
            Pick a start and destination to see the route.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Endpoint input with search dropdown ────────────────────────────

interface EndpointFieldProps {
  label: string;
  color: string;
  value: Endpoint | null;
  onChange: (e: Endpoint | null) => void;
  index: ReturnType<typeof buildRoomSearchIndex>;
}

function EndpointField({ label, color, value, onChange, index }: EndpointFieldProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const hits = useMemo(() => {
    if (!query.trim()) return [];
    return index.search(query, { limit: 6 });
  }, [index, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const displayValue = value ? endpointLabel(value) : query;

  return (
    <div ref={rootRef} className="relative">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <MapPin className="h-2.5 w-2.5" style={{ color }} />
        {label}
      </label>
      <div className="relative mt-1">
        <input
          type="search"
          value={displayValue}
          placeholder={value ? "" : "Search rooms or buildings…"}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            if (value) onChange(null);
            setQuery(e.target.value);
            setOpen(true);
          }}
          className="w-full h-9 px-3 pr-8 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          autoComplete="off"
          spellCheck={false}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(null); setQuery(""); setOpen(true); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && hits.length > 0 && !value && (
        <ul className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden z-10 max-h-64 overflow-y-auto">
          {hits.map((hit) => {
            const room = hit.doc.data?.room ?? null;
            const building = hit.doc.data?.building ?? null;
            const pick: Endpoint | null = room
              ? { kind: "room", room, building }
              : building
              ? { kind: "building", building }
              : null;
            if (!pick) return null;
            return (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => { onChange(pick); setOpen(false); setQuery(""); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-500/10 flex flex-col"
                >
                  <span className="font-semibold truncate">{endpointLabel(pick)}</span>
                  {hit.doc.subtitle && (
                    <span className="text-[11px] text-muted-foreground truncate">{hit.doc.subtitle}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatWalkTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 1) return "< 1 min";
  const mins = seconds / 60;
  if (mins < 1) return `${Math.round(seconds)} s`;
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}
