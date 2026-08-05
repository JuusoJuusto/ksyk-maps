/**
 * LayersToggle — floating map button that opens a popover of layer
 * visibility switches.
 *
 * Layers ("Buildings", "Rooms", "Hallways", "Labels") are the same
 * canonical layer ids CampusOverlay reads from `/api/layers`. This
 * popover writes visibility overrides to localStorage and dispatches a
 * `ksyk:layer-visibility` event that CampusOverlay listens for, so a
 * toggle takes effect instantly without a network round-trip.
 *
 * Overrides are per-user (localStorage). Admins still control the
 * default via the Builder's Layers tab.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Layers, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ksyk_layer_overrides_v1";

interface LayerRow {
  id: string;
  label: string;
}

/** The four layers CampusOverlay actually paints. Order = popover order. */
const LAYERS: LayerRow[] = [
  { id: "buildings", label: "Buildings" },
  { id: "rooms",     label: "Rooms" },
  { id: "hallways",  label: "Hallways" },
  { id: "labels",    label: "Labels" },
];

/** MazeMap-style POI category filters. Each category groups several
 *  POI kinds — hiding a category removes every chip of those kinds
 *  from the map. Backed by the same `ksyk:poi-filter` localStorage
 *  key + event that CampusOverlay listens to. */
export interface PoiCategory {
  id: string;
  label: string;
  tint: string;      // Tailwind class for the swatch
  kinds: string[];   // POI kinds that belong to this category
}

const POI_CATEGORIES: PoiCategory[] = [
  { id: "transit",    label: "Transit",    tint: "bg-blue-500",    kinds: ["stairs", "elevator", "door", "entrance", "exit"] },
  { id: "info",       label: "Info",       tint: "bg-sky-500",     kinds: ["info", "reception", "meeting_point"] },
  { id: "restrooms",  label: "Restrooms",  tint: "bg-pink-500",    kinds: ["restroom", "restroom_m", "restroom_f", "restroom_a", "bathroom"] },
  { id: "food",       label: "Food",       tint: "bg-amber-500",   kinds: ["cafe", "vending", "water"] },
  { id: "safety",     label: "Safety",     tint: "bg-red-500",     kinds: ["first_aid", "defibrillator"] },
  { id: "amenities",  label: "Amenities",  tint: "bg-emerald-500", kinds: ["parking", "bike", "printer"] },
];

const POI_FILTER_STORAGE_KEY = "ksyk_poi_filter_v1";

/** Read POI category visibility (all visible by default). */
export function readPoiCategoryFilters(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(POI_FILTER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed)) if (typeof v === "boolean") out[k] = v;
    return out;
  } catch {
    return {};
  }
}

function writePoiCategoryFilters(next: Record<string, boolean>) {
  try { window.localStorage.setItem(POI_FILTER_STORAGE_KEY, JSON.stringify(next)); } catch { /* quota */ }
  window.dispatchEvent(new CustomEvent("ksyk:poi-filter", { detail: next }));
}

/** Turn a category visibility map into the set of POI kinds a
 *  consumer (CampusOverlay) should HIDE. Any kind whose parent
 *  category is explicitly false is hidden. */
export function hiddenPoiKindsFromFilter(filter: Record<string, boolean>): Set<string> {
  const hidden = new Set<string>();
  for (const cat of POI_CATEGORIES) {
    if (filter[cat.id] === false) for (const k of cat.kinds) hidden.add(k);
  }
  return hidden;
}

export { POI_CATEGORIES };

/** Read the current visibility overrides from localStorage — safe on SSR. */
export function readLayerOverrides(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed)) if (typeof v === "boolean") out[k] = v;
    return out;
  } catch {
    return {};
  }
}

function writeLayerOverrides(next: Record<string, boolean>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* quota / private mode — no-op */ }
  window.dispatchEvent(new CustomEvent("ksyk:layer-visibility", { detail: next }));
}

export default function LayersToggle() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<Record<string, boolean>>(() => readLayerOverrides());
  const [poiState, setPoiState] = useState<Record<string, boolean>>(() => readPoiCategoryFilters());
  const popRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!popRef.current || !btnRef.current) return;
      const t = e.target as Node;
      if (popRef.current.contains(t) || btnRef.current.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, [id]: !(prev[id] ?? true) };
      writeLayerOverrides(next);
      return next;
    });
  }, []);

  const togglePoi = useCallback((id: string) => {
    setPoiState((prev) => {
      const next = { ...prev, [id]: !(prev[id] ?? true) };
      writePoiCategoryFilters(next);
      return next;
    });
  }, []);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle map layers"
        aria-expanded={open}
        title="Layers"
        className={cn(
          "w-11 h-11 rounded-2xl border shadow-sm flex items-center justify-center transition-colors active:scale-[0.97]",
          open
            ? "bg-blue-600 text-white border-blue-700/40 shadow-blue-600/25"
            : "bg-card border-border text-foreground hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
        )}
      >
        <Layers className="h-[19px] w-[19px]" strokeWidth={2.25} />
      </button>

      {open && (
        <div
          ref={popRef}
          role="menu"
          aria-label="Map layers"
          // Desktop / sm+: floating popover to the LEFT of the button
          // so it never clashes with header / other rail buttons.
          // Mobile: bottom-anchored sheet full-width in the map area.
          // z-50 sits above the right-rail (z-30) so nothing bleeds
          // through, and max-height scrolls internally instead of
          // spilling over the map controls.
          className={cn(
            "fixed sm:absolute rounded-2xl border border-border bg-card shadow-xl overflow-hidden z-50",
            "left-2 right-2 sm:left-auto sm:right-full sm:mr-2",
            "bottom-2 sm:bottom-0",
            "sm:w-56",
          )}
          style={{
            maxHeight: "min(60dvh, 22rem)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
              Layers
            </p>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "min(52dvh, 22rem)" }}>
            <ul className="p-1.5">
              {LAYERS.map((l) => {
                const visible = state[l.id] ?? true;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => toggle(l.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-colors",
                        visible
                          ? "text-foreground hover:bg-blue-50 dark:hover:bg-blue-500/10"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                      aria-pressed={visible}
                    >
                      {visible
                        ? <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" strokeWidth={2.25} />
                        : <EyeOff className="h-4 w-4" strokeWidth={2.25} />}
                      <span className="font-semibold flex-1 text-left">{l.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {/* POI category filter — MazeMap-style pill row so users can
             *  hide/show entire POI categories (Transit, Restrooms, Food,
             *  Safety, Amenities, Info) without wiping every marker. */}
            <div className="px-2.5 py-2 border-t border-border">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-1.5">
                POI categories
              </p>
              <div className="flex flex-wrap gap-1">
                {POI_CATEGORIES.map((c) => {
                  const visible = poiState[c.id] ?? true;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => togglePoi(c.id)}
                      aria-pressed={visible}
                      className={cn(
                        "text-[10.5px] font-semibold px-2 py-1 rounded-full border transition-all flex items-center gap-1.5",
                        visible
                          ? "border-blue-200 bg-white text-foreground shadow-sm dark:bg-gray-800 dark:border-blue-500/30"
                          : "border-transparent bg-muted text-muted-foreground opacity-60 line-through",
                      )}
                    >
                      <span className={cn("w-2 h-2 rounded-full", c.tint)} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[9.5px] text-muted-foreground mt-1.5">
                Hide entire POI groups you don't want on your map.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
