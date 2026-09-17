/**
 * CampusEventsLayer — v4.7.9
 *
 * Renders active + upcoming events on the campus map as amber pin
 * markers. Powered by /api/events/map which resolves each event to a
 * concrete lat/lng via the linked room's polygon centroid (or a
 * "lat,lng" parse of the free-form `location` field as a fallback).
 *
 * Click a pin → opens a popover with the event title, start/end time,
 * description, and a "Show on map" hint. Popover state lives in this
 * component so the parent map view doesn't need to know about it.
 */
import { useEffect, useMemo, useState } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import { useQuery } from "@tanstack/react-query";

interface MapEvent {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  startTime: string;
  endTime: string;
  location: string | null;
  roomId: string | null;
  lat: number;
  lng: number;
}

interface Props {
  map: MaplibreMap | null;
  lang?: "fi" | "en";
}

const SRC = "campus-events";
const LAYERS = {
  glow: "campus-events-glow",
  chip: "campus-events-chip",
  icon: "campus-events-icon",
} as const;

export default function CampusEventsLayer({ map, lang = "fi" }: Props) {
  const { data: events } = useQuery<MapEvent[]>({
    queryKey: ["/api/events/map"],
    queryFn: async () => {
      const r = await fetch("/api/events/map");
      if (!r.ok) return [];
      return r.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const [selected, setSelected] = useState<MapEvent | null>(null);

  useEffect(() => {
    if (!map) return;
    const feats = (events ?? []).map((e) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [e.lng, e.lat] },
      properties: { id: e.id },
    }));
    const fc = { type: "FeatureCollection", features: feats };
    const src = map.getSource(SRC) as import("maplibre-gl").GeoJSONSource | undefined;
    if (src) {
      src.setData(fc as never);
    } else {
      map.addSource(SRC, { type: "geojson", data: fc as never });
      map.addLayer({
        id: LAYERS.glow,
        source: SRC,
        type: "circle",
        minzoom: 13,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 12, 18, 22, 20, 32],
          "circle-color": "#f59e0b",
          "circle-opacity": 0.22,
          "circle-blur": 0.5,
        },
      });
      map.addLayer({
        id: LAYERS.chip,
        source: SRC,
        type: "circle",
        minzoom: 14,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 10, 18, 15, 20, 20],
          "circle-color": "#f59e0b",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
          "circle-opacity": 1,
        },
      });
      map.addLayer({
        id: LAYERS.icon,
        source: SRC,
        type: "symbol",
        minzoom: 15,
        layout: {
          "text-field": "★",
          "text-size": ["interpolate", ["linear"], ["zoom"], 15, 9, 18, 14, 20, 18],
          "text-font": ["Noto Sans Regular"],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#78350f",
          "text-halo-width": 0.8,
        },
      });
    }

    const onClick = (e: import("maplibre-gl").MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const id = f?.properties?.id;
      if (typeof id !== "string") return;
      const evt = (events ?? []).find((x) => x.id === id) ?? null;
      if (evt) {
        setSelected(evt);
        e.originalEvent?.stopPropagation();
        map.flyTo({ center: [evt.lng, evt.lat], zoom: Math.max(map.getZoom(), 19), duration: 500 });
      }
    };
    const onEnter = () => { map.getCanvas().style.cursor = "pointer"; };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };
    map.off("click", LAYERS.chip, onClick);
    map.off("mouseenter", LAYERS.chip, onEnter);
    map.off("mouseleave", LAYERS.chip, onLeave);
    map.on("click", LAYERS.chip, onClick);
    map.on("mouseenter", LAYERS.chip, onEnter);
    map.on("mouseleave", LAYERS.chip, onLeave);

    return () => {
      map.off("click", LAYERS.chip, onClick);
      map.off("mouseenter", LAYERS.chip, onEnter);
      map.off("mouseleave", LAYERS.chip, onLeave);
    };
  }, [map, events]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (!map || !map.style) return;
      for (const l of Object.values(LAYERS)) {
        if (map.getLayer(l)) map.removeLayer(l);
      }
      if (map.getSource(SRC)) map.removeSource(SRC);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  const fmt = useMemo(() => {
    const locale = lang === "fi" ? "fi-FI" : "en-US";
    const fmtDate = (iso: string) => {
      try {
        const d = new Date(iso);
        return d.toLocaleString(locale, {
          weekday: "short", day: "numeric", month: "short",
          hour: "2-digit", minute: "2-digit",
        });
      } catch { return iso; }
    };
    return fmtDate;
  }, [lang]);

  if (!selected) return null;

  const title = lang === "en" ? (selected.titleEn || selected.title) : selected.title;
  const desc = lang === "en" ? (selected.descriptionEn || selected.description) : selected.description;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 max-w-md w-[calc(100%-2rem)] bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-amber-50 dark:bg-amber-950/30 flex items-start gap-3">
        <div className="text-2xl leading-none">★</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            {lang === "fi" ? "Tapahtuma" : "Event"}
          </div>
          <div className="text-base font-bold text-foreground truncate">{title}</div>
        </div>
        <button
          onClick={() => setSelected(null)}
          className="h-7 w-7 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-muted-foreground"
          aria-label="Close"
        >×</button>
      </div>
      <div className="px-4 py-3 space-y-1 text-sm">
        <div className="text-muted-foreground text-[11px] font-mono">
          {fmt(selected.startTime)} → {fmt(selected.endTime)}
        </div>
        {selected.location && (
          <div className="text-[12px] text-muted-foreground">📍 {selected.location}</div>
        )}
        {desc && <p className="text-sm text-foreground pt-1 leading-relaxed">{desc}</p>}
      </div>
    </div>
  );
}
