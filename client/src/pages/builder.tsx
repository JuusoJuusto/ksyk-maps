/**
 * KSYK Maps — Builder page (fresh Leaflet-based implementation).
 *
 * Admin-only campus editor. Draws buildings, rooms and hallways directly on
 * the Leaflet campus map (via the shared OsmBasemap) instead of on a fake
 * SVG canvas. Layout mirrors MazeMap / Aalto Space:
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  TopBar (h-14) — brand · save-state pill · Publish      │
 *   ├──────────┬────────────────────────────────┬─────────────┤
 *   │          │                                │             │
 *   │  Left    │        Map canvas              │  Property   │
 *   │  sidebar │        (Leaflet + SVG          │  panel      │
 *   │  280px   │         overlay drawings)      │  320px      │
 *   │          │                                │  (when      │
 *   │          │                                │   selected) │
 *   └──────────┴────────────────────────────────┴─────────────┘
 *
 * Drawing tools operate directly on the Leaflet overlay; every shape is
 * persisted in SVG-space (mapPositionX/Y) so the customer-facing
 * KSYKMapView renders it the same way.
 *
 * Below the `lg:` breakpoint we show a "Best on desktop" hero card — the
 * old builder shipped the same message and drawing interactions don't
 * translate well to touch anyway.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Monitor,
  Building2,
  MapPin,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import type { Building, Room, Hallway } from "@shared/schema";

import BuilderTopBar, { type SaveState } from "@/components/builder/BuilderTopBar";
import BuilderSidebar from "@/components/builder/BuilderSidebar";
import BuilderMap, {
  type BuilderMapHandle,
  type BuildingDraft,
  type RoomDraft,
  type HallwayDraft,
} from "@/components/builder/BuilderMap";
import BuilderPropertyPanel, {
  type Selection,
  type BuildingEdits,
  type RoomEdits,
} from "@/components/builder/BuilderPropertyPanel";
import type { BuilderTool } from "@/components/builder/BuilderToolbar";

export default function BuilderPage() {
  const [, setLocation] = useLocation();
  const [authState, setAuthState] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    const loggedIn = localStorage.getItem("ksyk_admin_logged_in") === "true";
    const userRaw = localStorage.getItem("ksyk_admin_user");
    if (!loggedIn || !userRaw) {
      setAuthState("denied");
      return;
    }
    try {
      const user = JSON.parse(userRaw);
      const role = user?.role;
      if (role === "admin" || role === "owner" || role === "editor") {
        setAuthState("allowed");
      } else {
        setAuthState("denied");
      }
    } catch {
      setAuthState("denied");
    }
  }, []);

  if (authState === "checking") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (authState === "denied") {
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

// ─── Builder workspace — mounted once auth is allowed ────────────────────
function BuilderWorkspace() {
  const qc = useQueryClient();
  const [activeTool, setActiveTool] = useState<BuilderTool>("select");
  const [selection, setSelection] = useState<Selection>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const mapHandleRef = useRef<BuilderMapHandle | null>(null);

  // ─── Data ────────────────────────────────────────────────────────────────
  const buildingsQ = useQuery<Building[]>({ queryKey: ["/api/buildings"] });
  const roomsQ = useQuery<Room[]>({ queryKey: ["/api/rooms"] });
  const hallwaysQ = useQuery<Hallway[]>({ queryKey: ["/api/hallways"] });

  const buildings = buildingsQ.data ?? [];
  const rooms = roomsQ.data ?? [];
  const hallways = hallwaysQ.data ?? [];

  const isLoading = buildingsQ.isLoading || roomsQ.isLoading || hallwaysQ.isLoading;

  // ─── Mutations ───────────────────────────────────────────────────────────
  const flashSave = <T,>(p: Promise<T>): Promise<T> => {
    setSaveState("saving");
    setSaveError(null);
    return p
      .then((r) => {
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1800);
        return r;
      })
      .catch((e: any) => {
        setSaveError(e?.message || "Save failed");
        setSaveState("error");
        setTimeout(() => setSaveState("idle"), 3200);
        throw e;
      });
  };

  const createBuilding = useMutation({
    mutationFn: async (draft: BuildingDraft) => {
      const body = {
        name: `Building ${String.fromCharCode(65 + buildings.length)}`,
        nameEn: `Building ${String.fromCharCode(65 + buildings.length)}`,
        floors: 1,
        colorCode: "#2563eb",
        mapPositionX: draft.mapPositionX,
        mapPositionY: draft.mapPositionY,
        isActive: true,
      };
      const res = await apiRequest("POST", "/api/buildings", body);
      return (await res.json()) as Building;
    },
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ["/api/buildings"] });
      setSelection({ kind: "building", value: b });
      setActiveTool("select");
    },
  });

  const updateBuilding = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<BuildingEdits> }) => {
      const res = await apiRequest("PUT", `/api/buildings/${id}`, patch);
      return (await res.json()) as Building;
    },
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ["/api/buildings"] });
      setSelection({ kind: "building", value: b });
    },
  });

  const deleteBuilding = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/buildings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/buildings"] });
      qc.invalidateQueries({ queryKey: ["/api/rooms"] });
      qc.invalidateQueries({ queryKey: ["/api/hallways"] });
      setSelection(null);
    },
  });

  const createRoom = useMutation({
    mutationFn: async (draft: RoomDraft) => {
      const body = {
        buildingId: draft.buildingId,
        roomNumber: `R${String(rooms.length + 1).padStart(3, "0")}`,
        floor: 1,
        type: "classroom",
        colorCode: "#6b7280",
        mapPositionX: draft.mapPositionX,
        mapPositionY: draft.mapPositionY,
        width: draft.width,
        height: draft.height,
        isActive: true,
        isPublic: true,
      };
      const res = await apiRequest("POST", "/api/rooms", body);
      return (await res.json()) as Room;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["/api/rooms"] });
      setSelection({ kind: "room", value: r });
      setActiveTool("select");
    },
  });

  const updateRoom = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RoomEdits> }) => {
      const res = await apiRequest("PUT", `/api/rooms/${id}`, patch);
      return (await res.json()) as Room;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["/api/rooms"] });
      setSelection({ kind: "room", value: r });
    },
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/rooms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/rooms"] });
      setSelection(null);
    },
  });

  const createHallway = useMutation({
    mutationFn: async (draft: HallwayDraft) => {
      const body = {
        buildingId: draft.buildingId,
        name: `Hall ${hallways.length + 1}`,
        startX: draft.startX,
        startY: draft.startY,
        endX: draft.endX,
        endY: draft.endY,
        width: 3,
        colorCode: "#2563eb",
        isActive: true,
        isPublic: true,
      };
      const res = await apiRequest("POST", "/api/hallways", body);
      return (await res.json()) as Hallway;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/hallways"] });
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────
  const onDrawBuilding = (d: BuildingDraft) => void flashSave(createBuilding.mutateAsync(d));
  const onDrawRoom = (d: RoomDraft) => void flashSave(createRoom.mutateAsync(d));
  const onDrawHallway = (d: HallwayDraft) => void flashSave(createHallway.mutateAsync(d));

  const onSaveBuilding = async (patch: Partial<BuildingEdits>) => {
    if (selection?.kind !== "building") return;
    await flashSave(updateBuilding.mutateAsync({ id: selection.value.id, patch }));
  };
  const onSaveRoom = async (patch: Partial<RoomEdits>) => {
    if (selection?.kind !== "room") return;
    await flashSave(updateRoom.mutateAsync({ id: selection.value.id, patch }));
  };

  const onMoveBuilding = (id: string, x: number, y: number) =>
    void flashSave(updateBuilding.mutateAsync({ id, patch: { mapPositionX: x, mapPositionY: y } }));
  const onMoveRoom = (id: string, x: number, y: number) =>
    void flashSave(updateRoom.mutateAsync({ id, patch: { mapPositionX: x, mapPositionY: y } }));

  const onDelete = () => {
    if (!selection) return;
    const confirmed = window.confirm(
      selection.kind === "building"
        ? `Delete building "${selection.value.name}"? Its rooms and hallways will be orphaned.`
        : `Delete room "${selection.value.roomNumber}"?`
    );
    if (!confirmed) return;
    if (selection.kind === "building") {
      void flashSave(deleteBuilding.mutateAsync(selection.value.id));
    } else {
      void flashSave(deleteRoom.mutateAsync(selection.value.id));
    }
  };

  // Keep the selected object in sync with the freshest query data.
  useEffect(() => {
    if (!selection) return;
    if (selection.kind === "building") {
      const fresh = buildings.find((b) => b.id === selection.value.id);
      if (fresh && fresh !== selection.value) {
        setSelection({ kind: "building", value: fresh });
      }
    } else {
      const fresh = rooms.find((r) => r.id === selection.value.id);
      if (fresh && fresh !== selection.value) {
        setSelection({ kind: "room", value: fresh });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings, rooms]);

  // Keyboard shortcuts — one-letter tool hotkeys + Del.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip if the user is typing in a field
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "v" || e.key === "V") setActiveTool("select");
      else if (e.key === "b" || e.key === "B") setActiveTool("building");
      else if (e.key === "g" || e.key === "G") setActiveTool("polygon");
      else if (e.key === "r" || e.key === "R") setActiveTool("room");
      else if (e.key === "h" || e.key === "H") setActiveTool("hallway");
      else if (e.key === "w" || e.key === "W") setActiveTool("wall");
      else if (e.key === " ") setActiveTool("pan");
      else if (e.key === "Delete" || e.key === "Backspace") onDelete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  const emptyCampus = !isLoading && buildings.length === 0;
  const saveIsPending = createBuilding.isPending || updateBuilding.isPending ||
    createRoom.isPending || updateRoom.isPending ||
    createHallway.isPending || deleteBuilding.isPending || deleteRoom.isPending;

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <BuilderTopBar
        saveState={saveIsPending ? "saving" : saveState}
        saveError={saveError}
        onPublished={() => {
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 2000);
        }}
      />

      {/* Mobile / small screens: friendly "best on desktop" card */}
      <div className="lg:hidden flex-1 overflow-auto p-4 flex items-center justify-center">
        <MobileNoticeCard />
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex flex-1 min-h-0">
        <BuilderSidebar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onDelete={onDelete}
          onFitCampus={() => mapHandleRef.current?.fitCampus()}
          hasSelection={selection !== null}
          buildings={buildings}
          rooms={rooms}
          selectedId={selection?.value.id ?? null}
          onSelectBuilding={(b) => {
            setSelection({ kind: "building", value: b });
            setActiveTool("select");
          }}
          onSelectRoom={(r) => {
            setSelection({ kind: "room", value: r });
            setActiveTool("select");
          }}
        />

        <main className="flex-1 min-w-0 relative bg-gray-100 dark:bg-gray-900">
          <BuilderMap
            activeTool={activeTool}
            buildings={buildings}
            rooms={rooms}
            hallways={hallways}
            selection={selection}
            onSelect={setSelection}
            onDrawBuilding={onDrawBuilding}
            onDrawRoom={onDrawRoom}
            onDrawHallway={onDrawHallway}
            onMoveBuilding={onMoveBuilding}
            onMoveRoom={onMoveRoom}
            registerHandle={(h) => { mapHandleRef.current = h; }}
          />

          {isLoading && <LoadingCurtain />}
          {/* Empty-state "Get started" popup removed at user request —
           *  the sidebar Directory already shows an empty state and the
           *  toolbar itself is discoverable. */}
          {activeTool !== "select" && activeTool !== "pan" && (
            <ToolCoachOverlay tool={activeTool} />
          )}
        </main>

        {selection && (
          <BuilderPropertyPanel
            selection={selection}
            onClose={() => setSelection(null)}
            onSaveBuilding={onSaveBuilding}
            onSaveRoom={onSaveRoom}
            saving={saveIsPending}
          />
        )}
      </div>
    </div>
  );
}

// ─── Small overlays ──────────────────────────────────────────────────────
function LoadingCurtain() {
  return (
    <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-30">
      <div className="flex items-center gap-2.5 px-4 h-11 rounded-2xl bg-card border border-border shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <span className="text-sm font-semibold text-foreground">Loading campus…</span>
      </div>
    </div>
  );
}

function EmptyStateOverlay({ onStart }: { onStart: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className="pointer-events-auto max-w-md w-[92%] bg-card border border-border rounded-2xl shadow-sm p-6 text-center">
        <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-100 dark:ring-blue-900/60 flex items-center justify-center">
          <Building2 className="h-7 w-7 text-blue-600 dark:text-blue-400" strokeWidth={2.2} />
        </div>
        <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-600 dark:text-blue-400 mb-2">
          Get started
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">
          Draw your first building
        </h2>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          Click the button below, then click-and-drag anywhere on the map to
          drop a building footprint. You can rename, colour and resize it after.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="h-11 px-6 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98] inline-flex items-center gap-1.5"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2} />
          Start with Building tool
        </button>
      </div>
    </div>
  );
}

function ToolCoachOverlay({ tool }: { tool: BuilderTool }) {
  const label = useMemo(() => {
    switch (tool) {
      case "building":
        return "Click-and-drag on the map to draw a building";
      case "room":
        return "Click-and-drag inside a building to draw a room";
      case "hallway":
        return "Click waypoints — Enter or double-click to finish";
      case "wall":
        return "Click two points to place a wall";
      default:
        return "";
    }
  }, [tool]);
  if (!label) return null;
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-sm shadow-blue-600/25 ring-1 ring-white/10">
        <MapPin className="h-3.5 w-3.5" strokeWidth={2.4} />
        {label}
      </div>
    </div>
  );
}

function MobileNoticeCard() {
  return (
    <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-sm p-6 text-center">
      <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-100 dark:ring-blue-900/60 flex items-center justify-center">
        <Monitor className="h-7 w-7 text-blue-600 dark:text-blue-400" strokeWidth={2.2} />
      </div>
      <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-600 dark:text-blue-400 mb-2">
        Best on desktop
      </div>
      <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">
        Grab a bigger screen
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        The campus builder needs at least 1024 px of horizontal room to draw
        buildings, rooms and hallways precisely. Come back on a laptop — the
        rest of KSYK Maps still works great on your phone.
      </p>
    </div>
  );
}
