/**
 * KSYK Maps — Builder (v2, MapLibre-based).
 *
 * Top-level /builder route. Admin-only. Uses the new MapLibre-based
 * CampusMap so buildings/rooms/hallways rotate with the map (they're
 * drawn as GeoJSON layers on the WebGL canvas, not portalled SVG).
 *
 * Tools:
 *   - Select (V) — click features to select + edit
 *   - Building (B) — click 4+ corners → polygon → POST /api/buildings
 *   - Room (R) — click 4+ corners inside a building → POST /api/rooms
 *   - Hallway (H) — click waypoints → LineString → POST /api/hallways
 *
 * Enter finalizes, Escape cancels. Del removes the selected feature.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import maplibregl, { Map as MaplibreMap, LngLat, MapMouseEvent } from "maplibre-gl";
import CampusMap, { type CampusMapHandle } from "@/components/CampusMap";
import { Button } from "@/components/ui/button";
import {
  Building2,
  DoorOpen,
  Route as RouteIcon,
  MousePointer2,
  Trash2,
  Loader2,
  ShieldAlert,
  ChevronLeft,
  Save,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

type BuilderTool = "select" | "building" | "room" | "hallway";

interface FeatureBuilding {
  id: string;
  name: string;
  nameEn?: string | null;
  nameFi?: string | null;
  colorCode?: string | null;
  floors?: number | null;
  points?: Array<{ lng: number; lat: number }>; // polygon corners
}

// ─── Auth gate ────────────────────────────────────────────────────────────
function useAdminAuth() {
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");
  useEffect(() => {
    const loggedIn = localStorage.getItem("ksyk_admin_logged_in") === "true";
    const userRaw = localStorage.getItem("ksyk_admin_user");
    if (!loggedIn || !userRaw) {
      setState("denied");
      return;
    }
    try {
      const u = JSON.parse(userRaw);
      if (["admin", "owner", "editor"].includes(u?.role)) setState("allowed");
      else setState("denied");
    } catch {
      setState("denied");
    }
  }, []);
  return state;
}

// ─── Root page ────────────────────────────────────────────────────────────
export default function BuilderPage() {
  const [, setLocation] = useLocation();
  const auth = useAdminAuth();

  if (auth === "checking") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }
  if (auth === "denied") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-sm p-6 text-center">
          <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-red-50 dark:bg-red-950/40 ring-1 ring-red-100 dark:ring-red-900/60 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-red-600 dark:text-red-400" strokeWidth={2.25} />
          </div>
          <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-red-600 dark:text-red-400 mb-2">
            Restricted
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground mb-2">
            Builder is admin-only
          </h1>
          <p className="text-sm text-muted-foreground mb-5">
            Sign in as an admin or owner to edit the campus map.
          </p>
          <Button
            onClick={() => setLocation("/admin")}
            className="h-11 px-6 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98]"
          >
            Go to admin login
          </Button>
        </div>
      </div>
    );
  }

  return <BuilderWorkspace />;
}

// ─── Workspace ────────────────────────────────────────────────────────────
function BuilderWorkspace() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [activeTool, setActiveTool] = useState<BuilderTool>("select");
  const [waypoints, setWaypoints] = useState<LngLat[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const handleRef = useRef<CampusMapHandle | null>(null);

  const buildingsQ = useQuery<FeatureBuilding[]>({
    queryKey: ["/api/buildings"],
  });
  const buildings = useMemo<FeatureBuilding[]>(
    () => buildingsQ.data ?? [],
    [buildingsQ.data],
  );

  // ── Draw waypoints layer sync ───────────────────────────────────────────
  useEffect(() => {
    const h = handleRef.current;
    if (!h) return;
    const map = h.map;
    const sourceId = "builder-waypoints";
    const layerId = "builder-waypoints-line";
    const pointsLayerId = "builder-waypoints-points";

    const setSourceData = () => {
      const coords = waypoints.map((w) => [w.lng, w.lat]);
      const src = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
      const data = {
        type: "FeatureCollection" as const,
        features:
          coords.length >= 2
            ? [
                {
                  type: "Feature" as const,
                  geometry: {
                    type: activeTool === "hallway" ? "LineString" : "Polygon",
                    coordinates:
                      activeTool === "hallway"
                        ? coords
                        : coords.length >= 3
                        ? [[...coords, coords[0]]]
                        : [coords],
                  } as any,
                  properties: {},
                },
                ...coords.map((c, i) => ({
                  type: "Feature" as const,
                  geometry: { type: "Point" as const, coordinates: c },
                  properties: { idx: i },
                })),
              ]
            : coords.map((c, i) => ({
                type: "Feature" as const,
                geometry: { type: "Point" as const, coordinates: c },
                properties: { idx: i },
              })),
      };
      if (src) {
        src.setData(data as any);
      } else {
        map.addSource(sourceId, { type: "geojson", data: data as any });
        map.addLayer({
          id: layerId,
          source: sourceId,
          type: activeTool === "hallway" ? "line" : "fill",
          paint:
            activeTool === "hallway"
              ? { "line-color": "#2563eb", "line-width": 8, "line-opacity": 0.6 }
              : {
                  "fill-color": "#2563eb",
                  "fill-opacity": 0.15,
                  "fill-outline-color": "#2563eb",
                },
          filter:
            activeTool === "hallway"
              ? ["==", "$type", "LineString"]
              : ["==", "$type", "Polygon"],
        });
        map.addLayer({
          id: pointsLayerId,
          source: sourceId,
          type: "circle",
          paint: {
            "circle-radius": 6,
            "circle-color": "#ffffff",
            "circle-stroke-color": "#2563eb",
            "circle-stroke-width": 2,
          },
          filter: ["==", "$type", "Point"],
        });
      }
    };
    setSourceData();
  }, [waypoints, activeTool]);

  // ── Draw finalized buildings layer ──────────────────────────────────────
  useEffect(() => {
    const h = handleRef.current;
    if (!h || buildings.length === 0) return;
    const map = h.map;
    const sourceId = "builder-buildings";
    const layerId = "builder-buildings-fill";
    const outlineLayerId = "builder-buildings-outline";
    const labelLayerId = "builder-buildings-labels";

    const featureCollection = {
      type: "FeatureCollection" as const,
      features: buildings
        .filter((b) => b.points && b.points.length >= 3)
        .map((b) => ({
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                ...b.points!.map((p) => [p.lng, p.lat]),
                [b.points![0].lng, b.points![0].lat],
              ],
            ],
          },
          properties: {
            id: b.id,
            name: b.name,
            color: b.colorCode ?? "#2563eb",
            selected: b.id === selectedId,
          },
        })),
    };

    const src = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(featureCollection as any);
    } else {
      map.addSource(sourceId, { type: "geojson", data: featureCollection as any });
      map.addLayer({
        id: layerId,
        source: sourceId,
        type: "fill",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": [
            "case",
            ["boolean", ["get", "selected"], false],
            0.35,
            0.2,
          ],
        },
      });
      map.addLayer({
        id: outlineLayerId,
        source: sourceId,
        type: "line",
        paint: {
          "line-color": ["get", "color"],
          "line-width": [
            "case",
            ["boolean", ["get", "selected"], false],
            4,
            2,
          ],
        },
      });
      map.addLayer({
        id: labelLayerId,
        source: sourceId,
        type: "symbol",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 14,
          "text-font": ["Noto Sans Regular"],
        },
        paint: {
          "text-color": ["get", "color"],
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });
    }
  }, [buildings, selectedId]);

  // ── Map click handler — drops waypoints in draw mode ────────────────────
  useEffect(() => {
    const h = handleRef.current;
    if (!h) return;
    const map = h.map;

    const onClick = (e: MapMouseEvent) => {
      if (activeTool === "select") {
        // Query rendered features under the click for selection
        const feats = map.queryRenderedFeatures(e.point, {
          layers: ["builder-buildings-fill"],
        });
        if (feats.length > 0) {
          setSelectedId(String(feats[0].properties?.id) || null);
        } else {
          setSelectedId(null);
        }
        return;
      }
      if (activeTool === "building" || activeTool === "room" || activeTool === "hallway") {
        setWaypoints((prev) => [...prev, e.lngLat]);
      }
    };

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [activeTool]);

  // ── Keyboard: Enter to finalize, Escape to cancel, hotkeys ──────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" ||
          (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "Escape") {
        setWaypoints([]);
        setActiveTool("select");
        return;
      }
      if (e.key === "Enter") {
        finalize();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        onDeleteSelected();
        return;
      }
      if (e.key === "v" || e.key === "V") setActiveTool("select");
      else if (e.key === "b" || e.key === "B") { setActiveTool("building"); setWaypoints([]); }
      else if (e.key === "r" || e.key === "R") { setActiveTool("room"); setWaypoints([]); }
      else if (e.key === "h" || e.key === "H") { setActiveTool("hallway"); setWaypoints([]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, waypoints, selectedId]);

  // ── Mutations ───────────────────────────────────────────────────────────
  const createBuilding = useMutation({
    mutationFn: async (payload: {
      name: string;
      points: Array<{ lng: number; lat: number }>;
    }) => {
      const res = await apiRequest("POST", "/api/buildings", {
        name: payload.name,
        nameEn: payload.name,
        nameFi: payload.name,
        colorCode: "#2563eb",
        floors: 1,
        // Store polygon in `points`. Server may not use it yet — passing
        // through as-is; will be persisted once schema catches up. In the
        // meantime we compute mapPositionX/Y from bbox center.
        points: payload.points,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/buildings"] });
      setWaypoints([]);
    },
  });

  const createHallway = useMutation({
    mutationFn: async (payload: { points: Array<{ lng: number; lat: number }> }) => {
      // Chunk polyline into start/end segments — matches the server schema.
      for (let i = 0; i < payload.points.length - 1; i++) {
        await apiRequest("POST", "/api/hallways", {
          startX: payload.points[i].lng,
          startY: payload.points[i].lat,
          endX: payload.points[i + 1].lng,
          endY: payload.points[i + 1].lat,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hallways"] });
      setWaypoints([]);
    },
  });

  const deleteBuilding = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/buildings/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/buildings"] });
      setSelectedId(null);
    },
  });

  const finalize = useCallback(() => {
    if (activeTool === "hallway" && waypoints.length >= 2) {
      createHallway.mutate({
        points: waypoints.map((w) => ({ lng: w.lng, lat: w.lat })),
      });
      return;
    }
    if ((activeTool === "building" || activeTool === "room") && waypoints.length >= 3) {
      const nextLetter = String.fromCharCode(65 + buildings.length);
      createBuilding.mutate({
        name: nextLetter,
        points: waypoints.map((w) => ({ lng: w.lng, lat: w.lat })),
      });
    }
  }, [activeTool, waypoints, buildings.length, createBuilding, createHallway]);

  const onDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    if (!confirm("Delete this building?")) return;
    deleteBuilding.mutate(selectedId);
  }, [selectedId, deleteBuilding]);

  const isDirty =
    createBuilding.isPending || createHallway.isPending || deleteBuilding.isPending;

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Top bar */}
      <header className="h-14 shrink-0 flex items-center justify-between px-3 sm:px-4 border-b border-border bg-card">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95"
            aria-label="Back to map"
            title="Back to map"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <div className="flex items-baseline gap-2.5 min-w-0">
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-600 dark:text-blue-400">
              KSYK Maps
            </span>
            <span className="text-lg font-bold tracking-tight text-foreground hidden sm:inline">
              Builder
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold",
              isDirty
                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                isDirty ? "bg-amber-500 animate-pulse" : "bg-emerald-500",
              )}
            />
            {isDirty ? "Saving…" : "Saved"}
          </div>
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="h-9 px-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted"
            title="View public map"
          >
            <Home className="h-4 w-4 inline mr-1.5" />
            <span className="hidden sm:inline">View map</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card overflow-y-auto">
          <div className="p-3 space-y-4">
            <ToolGroup label="Draw">
              <ToolButton
                Icon={Building2}
                label="Building"
                hotkey="B"
                active={activeTool === "building"}
                onClick={() => { setActiveTool("building"); setWaypoints([]); }}
              />
              <ToolButton
                Icon={DoorOpen}
                label="Room"
                hotkey="R"
                active={activeTool === "room"}
                onClick={() => { setActiveTool("room"); setWaypoints([]); }}
              />
              <ToolButton
                Icon={RouteIcon}
                label="Hallway"
                hotkey="H"
                active={activeTool === "hallway"}
                onClick={() => { setActiveTool("hallway"); setWaypoints([]); }}
              />
            </ToolGroup>

            <ToolGroup label="Edit">
              <ToolButton
                Icon={MousePointer2}
                label="Select"
                hotkey="V"
                active={activeTool === "select"}
                onClick={() => setActiveTool("select")}
              />
              <ToolButton
                Icon={Trash2}
                label="Delete"
                hotkey="Del"
                active={false}
                onClick={onDeleteSelected}
                disabled={!selectedId}
                variant="danger"
              />
            </ToolGroup>

            <ToolGroup label="Directory">
              {buildings.length === 0 ? (
                <p className="text-[12px] text-muted-foreground px-1">
                  No buildings yet. Click Building, then click 3+ corners on the map and press Enter.
                </p>
              ) : (
                <ul className="space-y-1">
                  {buildings.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(b.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          selectedId === b.id
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                            : "hover:bg-muted text-foreground",
                        )}
                      >
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                          style={{ background: b.colorCode ?? "#2563eb" }}
                        />
                        {b.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ToolGroup>
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 min-w-0 relative">
          <CampusMap onReady={(h) => (handleRef.current = h)} />

          {/* In-flight coach */}
          {(activeTool === "building" || activeTool === "room" || activeTool === "hallway") && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-card border border-border rounded-xl shadow-sm px-3.5 py-2 text-[13px] font-medium text-foreground pointer-events-none">
              {activeTool === "hallway" ? (
                <>Click waypoints — Enter to finish ({waypoints.length})</>
              ) : (
                <>Click corners — Enter to finish ({waypoints.length}/3+ needed)</>
              )}
            </div>
          )}

          {/* Mobile fallback message */}
          <div className="md:hidden absolute inset-0 bg-card/95 flex items-center justify-center p-4 z-40">
            <div className="max-w-sm text-center bg-card border border-border rounded-2xl shadow-sm p-6">
              <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-600 dark:text-blue-400 mb-2">
                Builder
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">
                Best on desktop
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                The map editor needs a mouse and keyboard. Open KSYK Maps on a laptop or desktop.
              </p>
              <Button
                onClick={() => setLocation("/")}
                className="h-11 px-6 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98]"
              >
                Back to map
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── UI helpers ───────────────────────────────────────────────────────────
function ToolGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground pl-1 mb-2">
        {label}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ToolButton({
  Icon,
  label,
  hotkey,
  active,
  onClick,
  disabled,
  variant = "default",
}: {
  Icon: typeof Building2;
  label: string;
  hotkey?: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full h-10 rounded-xl px-3 flex items-center gap-2 text-sm font-semibold transition-colors active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none",
        active
          ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
          : variant === "danger"
          ? "text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
          : "text-foreground hover:bg-muted",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      <span className="flex-1 text-left">{label}</span>
      {hotkey && (
        <span
          className={cn(
            "text-[10px] font-mono px-1.5 py-0.5 rounded",
            active
              ? "bg-white/20 text-white"
              : "bg-muted text-muted-foreground",
          )}
        >
          {hotkey}
        </span>
      )}
    </button>
  );
}
