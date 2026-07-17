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
          <ul className="p-1.5 overflow-y-auto" style={{ maxHeight: "min(52dvh, 18rem)" }}>
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
        </div>
      )}
    </div>
  );
}
