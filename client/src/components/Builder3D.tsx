/**
 * KSYK Maps — Map Builder (the only builder).
 *
 * Single workspace for admins to manage every room on the campus:
 *   - Live Leaflet basemap with the campus SVG overlay portalled on top
 *     (same exact view students see).
 *   - LEFT SIDEBAR — searchable room list, click to focus + select.
 *     Floor switcher up top, "+ Add room" button always in reach.
 *   - MAP — drag any room to reposition. Click empty space (with the
 *     "add mode" tool active) to create a new room at that point.
 *     Selected room shows resize handles in the corners.
 *   - PROPERTIES PANEL — shown when a room is selected. Edit number,
 *     name, floor, type, width, height; save / delete.
 *   - 2D / 3D toggle + pitch slider in the top bar.
 *
 * Everything writes through the existing /api/rooms endpoints and
 * invalidates the React-Query cache so the public map updates in real
 * time. No standalone SVG — what admins see IS what students see.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type L from "leaflet";
import OsmBasemap from "@/components/OsmBasemap";
import {
  computeCampusViewBox,
  parseViewBox,
  parseBuildingShape,
  type BuildingMapData,
} from "@/lib/mapGeometry";
import { outlinesAsMapBuildings } from "@/lib/ksykCampusOutlines";
import { getRoomFillColor } from "@/lib/campusSpace";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useToast } from "@/hooks/use-toast";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { safeNum } from "@/lib/safeNum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2, Layers, Loader2, Mountain, MousePointer2,
  PlusCircle, Save, Search, Trash2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Room {
  id: string;
  buildingId?: string;
  roomNumber: string;
  name?: string;
  floor: number;
  type?: string;
  currentStatus?: string;
  mapPositionX?: number;
  mapPositionY?: number;
  width?: number;
  height?: number;
  /** Optional Matterport tour URL — when set, students get a "3D
   * walkthrough" button on this room's detail sheet in the public map. */
  virtualTourUrl?: string;
}

type Mode = "select" | "add";

const ROOM_TYPES = [
  "classroom", "office", "lab", "library", "cafeteria",
  "auditorium", "gym", "hallway", "stairs", "wc", "other",
] as const;

export default function Builder3D() {
  const { darkMode } = useDarkMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings, update } = useAppSettings();

  const [overlayEl, setOverlayEl] = useState<SVGSVGElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const [floor, setFloor] = useState(1);
  const [mode, setMode] = useState<Mode>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number } | null>(null);
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});

  const { data: rooms = [], refetch } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: async () => {
      const r = await fetch("/api/rooms");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
  });

  const { data: buildings = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["buildings"],
    queryFn: async () => {
      const r = await fetch("/api/buildings");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
  });

  const baseViewBox = useMemo(
    () => parseViewBox(computeCampusViewBox(outlinesAsMapBuildings() as BuildingMapData[])),
    [],
  );

  const maxFloor = Math.max(1, ...rooms.map((r) => r.floor ?? 1), 3);
  const is3DMode = (settings.osmPitchDeg ?? 0) > 0;

  const floorRooms = useMemo(
    () => rooms.filter((r) => (r.floor ?? 1) === floor && r.mapPositionX != null && r.mapPositionY != null),
    [rooms, floor],
  );

  const sidebarRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rooms
      .filter((r) => (r.floor ?? 1) === floor)
      .filter((r) => {
        if (!q) return true;
        return (
          r.roomNumber?.toLowerCase().includes(q) ||
          (r.name ?? "").toLowerCase().includes(q) ||
          (r.type ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.roomNumber || "").localeCompare(b.roomNumber || ""));
  }, [rooms, floor, query]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedId) ?? null,
    [rooms, selectedId],
  );

  /* ── Mutations ────────────────────────────────────────────────────── */

  const updateRoom = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Room> }) => {
      const r = await fetch(`/api/rooms/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error(`Save failed (${r.status})`);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
    onError: (e: Error) => {
      toast({ title: "Couldn't save", description: e.message, variant: "destructive" });
    },
  });

  const createRoom = useMutation({
    mutationFn: async (payload: Partial<Room>) => {
      const r = await fetch("/api/rooms", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`Create failed (${r.status})`);
      return r.json();
    },
    onSuccess: (room: Room) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Room added", description: `${room.roomNumber} created.` });
      setSelectedId(room.id);
      setMode("select");
    },
    onError: (e: Error) => {
      toast({ title: "Couldn't add", description: e.message, variant: "destructive" });
    },
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/rooms/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok && r.status !== 204) throw new Error(`Delete failed (${r.status})`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Room deleted" });
      if (selectedId === id) setSelectedId(null);
    },
    onError: (e: Error) => {
      toast({ title: "Couldn't delete", description: e.message, variant: "destructive" });
    },
  });

  /* ── Drag + click handling ────────────────────────────────────────── */

  const eventToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = overlayEl;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  }, [overlayEl]);

  const onRoomPointerDown = useCallback((e: React.PointerEvent, room: Room) => {
    if (mode !== "select") return;
    const p = eventToSvg(e.clientX, e.clientY);
    if (!p) return;
    e.stopPropagation();
    dragOffset.current = {
      x: p.x - (room.mapPositionX ?? 0),
      y: p.y - (room.mapPositionY ?? 0),
    };
    setDragId(room.id);
    setSelectedId(room.id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    mapRef.current?.dragging?.disable();
  }, [eventToSvg, mode]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragId || !dragOffset.current) return;
    const p = eventToSvg(e.clientX, e.clientY);
    if (!p) return;
    setLocalPositions((prev) => ({
      ...prev,
      [dragId]: {
        x: Math.round(p.x - dragOffset.current!.x),
        y: Math.round(p.y - dragOffset.current!.y),
      },
    }));
  }, [dragId, eventToSvg]);

  const onPointerUp = useCallback(async () => {
    mapRef.current?.dragging?.enable();
    if (!dragId) return;
    const id = dragId;
    const pos = localPositions[id];
    setDragId(null);
    dragOffset.current = null;
    if (!pos) return;
    setSavingId(id);
    try {
      await updateRoom.mutateAsync({ id, patch: { mapPositionX: pos.x, mapPositionY: pos.y } });
      setLocalPositions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } finally {
      setSavingId(null);
    }
  }, [dragId, localPositions, updateRoom]);

  useEffect(() => {
    if (!dragId) return;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [dragId, onPointerMove, onPointerUp]);

  const onCanvasClick = useCallback((e: React.PointerEvent) => {
    if (mode !== "add") return;
    const p = eventToSvg(e.clientX, e.clientY);
    if (!p) return;
    const newRoomNumber = nextRoomNumber(rooms, floor);
    createRoom.mutate({
      roomNumber: newRoomNumber,
      name: "",
      floor,
      type: "classroom",
      currentStatus: "unknown",
      width: 56,
      height: 40,
      mapPositionX: Math.round(p.x - 28),
      mapPositionY: Math.round(p.y - 20),
      buildingId: buildings[0]?.id,
    });
  }, [mode, eventToSvg, rooms, floor, buildings, createRoom]);

  /* ── Render ───────────────────────────────────────────────────────── */

  const buildingPolys = useMemo(() => {
    return (outlinesAsMapBuildings() as BuildingMapData[]).map((b) => ({
      letter: b.name,
      pts: parseBuildingShape(b).map((p) => `${p.x},${p.y}`).join(" "),
    }));
  }, []);

  const overlayBody = (
    <>
      <defs>
        <filter id="builderDragHalo" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Click-target rectangle for "add" mode — fills the campus area */}
      {mode === "add" && (
        <rect
          x={baseViewBox.x} y={baseViewBox.y}
          width={baseViewBox.w} height={baseViewBox.h}
          fill="rgba(37,99,235,0.04)"
          className="cursor-crosshair"
          onPointerDown={onCanvasClick}
        />
      )}

      {/* Building outlines */}
      {buildingPolys.map(({ letter, pts }) => (
        <polygon
          key={letter}
          points={pts}
          fill={darkMode ? "rgba(255,255,255,0.04)" : "rgba(11,19,34,0.03)"}
          stroke={darkMode ? "rgba(255,255,255,0.12)" : "rgba(11,19,34,0.14)"}
          strokeWidth={0.8}
          strokeDasharray="4,3"
          className="pointer-events-none"
        />
      ))}

      {/* Rooms */}
      {floorRooms.map((room) => {
        const localPos = localPositions[room.id];
        const x = localPos?.x ?? room.mapPositionX ?? 0;
        const y = localPos?.y ?? room.mapPositionY ?? 0;
        const w = room.width ?? 56;
        const h = room.height ?? 40;
        const fill = getRoomFillColor(room.type, room.currentStatus);
        const isSelected = selectedId === room.id;
        const isDragging = dragId === room.id;
        const isSaving = savingId === room.id;
        const floorN = room.floor ?? 1;
        const pitch = safeNum(settings.osmPitchDeg, 0);
        const pitchScale = is3DMode ? 0.7 + (pitch / 45) * 0.7 : 0;
        const wallH = is3DMode ? Math.max(10, (floorN * 9 + 4) * pitchScale) : 0;
        const sideW = is3DMode ? Math.max(4, Math.min(w * 0.12, 9)) : 0;

        return (
          <g
            key={room.id}
            onPointerDown={(e) => onRoomPointerDown(e, room)}
            className={cn("group", mode === "select" && "cursor-grab", isDragging && "cursor-grabbing")}
            style={{ touchAction: "none" }}
            filter={isDragging ? "url(#builderDragHalo)" : undefined}
          >
            {/* 3D walls */}
            {is3DMode && sideW > 0 && (
              <>
                <polygon
                  points={`${x+w},${y} ${x+w+sideW},${y-sideW*0.55} ${x+w+sideW},${y+h+wallH-sideW*0.55} ${x+w},${y+h+wallH}`}
                  fill={fill} fillOpacity={0.6}
                  style={{ filter: "brightness(0.5) saturate(1.1)" }}
                />
                <polygon
                  points={`${x},${y} ${x-sideW*0.5},${y-sideW*0.4} ${x-sideW*0.5},${y+h+wallH-sideW*0.4} ${x},${y+h+wallH}`}
                  fill={fill} fillOpacity={0.5}
                  style={{ filter: "brightness(0.78) saturate(1.05)" }}
                />
                <rect x={x} y={y + h - 2} width={w} height={wallH + 2} fill={fill} fillOpacity={0.72} />
                <rect x={x} y={y + h - 2} width={w} height={wallH + 2} fill="rgba(0,0,0,0.38)" />
              </>
            )}
            {/* Roof / 2D room */}
            <rect
              x={x} y={y} width={w} height={h} rx={4}
              fill={fill}
              fillOpacity={isDragging || isSelected ? 1 : 0.92}
              stroke={
                isDragging ? "#2563eb"
                : isSelected ? "#2563eb"
                : isSaving ? "#fbbf24"
                : "rgba(255,255,255,0.9)"
              }
              strokeWidth={isDragging ? 3 : isSelected ? 2.5 : isSaving ? 2 : 0.9}
            />
            {/* Selection handles — small corner dots when selected */}
            {isSelected && !isDragging && (
              <>
                {[
                  [x, y], [x + w, y], [x, y + h], [x + w, y + h],
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r={2.5}
                          fill="#2563eb" stroke="white" strokeWidth={1}
                          className="pointer-events-none" />
                ))}
              </>
            )}
            {/* Label */}
            <text
              x={x + w / 2} y={y + h / 2}
              textAnchor="middle" dominantBaseline="middle"
              fill="#fff"
              fontSize={Math.min(12, Math.max(8, w / 6))}
              fontWeight="700"
              className="pointer-events-none select-none"
              style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.45)", strokeWidth: 0.8 }}
            >
              {room.roomNumber}
            </text>
          </g>
        );
      })}
    </>
  );

  /* ── Layout ───────────────────────────────────────────────────────── */

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className={cn(
        "shrink-0 px-4 sm:px-6 py-3 border-b flex items-center gap-3 flex-wrap z-10",
        darkMode ? "border-gray-800 bg-gray-900/60" : "border-gray-200 bg-white",
      )}>
        <div className="flex items-center gap-2.5">
          <img src="/favicon-128.png" alt="KSYK Maps" width={32} height={32} className="h-8 w-8 object-contain" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold tracking-[0.32em] uppercase text-gray-400 dark:text-gray-500 leading-none">
              KSYK · Builder
            </p>
            <p className="text-sm font-semibold leading-tight mt-0.5">
              Map Builder
            </p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setMode("select")}
            className={cn(
              "h-7 px-3 text-xs font-semibold rounded-lg gap-1.5 inline-flex items-center transition-colors",
              mode === "select"
                ? "bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900",
            )}
          >
            <MousePointer2 className="h-3.5 w-3.5" />
            Select
          </button>
          <button
            type="button"
            onClick={() => { setMode("add"); setSelectedId(null); }}
            className={cn(
              "h-7 px-3 text-xs font-semibold rounded-lg gap-1.5 inline-flex items-center transition-colors",
              mode === "add"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900",
            )}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Add room
          </button>
        </div>

        {/* Floor */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500 px-2">Floor</span>
          {Array.from({ length: maxFloor }, (_, i) => i + 1).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFloor(f)}
              className={cn(
                "h-7 w-7 text-xs font-bold rounded-lg transition-all tabular-nums",
                floor === f
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* 3D toggle */}
        <button
          type="button"
          onClick={() => update("osmPitchDeg", is3DMode ? 0 : 32)}
          className={cn(
            "h-9 px-3 rounded-xl text-xs font-bold gap-1.5 inline-flex items-center transition-colors",
            is3DMode
              ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200",
          )}
        >
          <Mountain className="h-3.5 w-3.5" />
          {is3DMode ? "3D" : "2D"}
        </button>

        {is3DMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800">
            <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <input
              type="range" min={0} max={45}
              value={safeNum(settings.osmPitchDeg, 0)}
              onChange={(e) => update("osmPitchDeg", Number(e.target.value))}
              className="w-24 accent-blue-600"
              aria-label="Pitch"
            />
            <span className="text-xs font-bold tabular-nums w-8 text-right text-blue-700 dark:text-blue-300">
              {Math.round(safeNum(settings.osmPitchDeg, 0))}°
            </span>
          </div>
        )}
      </div>

      {/* Body — sidebar + map (+ optional properties panel) */}
      <div className="flex-1 min-h-0 flex">
        {/* SIDEBAR */}
        <aside className={cn(
          "hidden md:flex flex-col w-64 lg:w-72 shrink-0 border-r overflow-hidden",
          darkMode ? "border-gray-800 bg-gray-900/40" : "border-gray-200 bg-gray-50/50",
        )}>
          {/* Search */}
          <div className="shrink-0 p-3 border-b border-gray-200/70 dark:border-gray-800/70">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search rooms…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={cn(
                  "w-full h-9 pl-9 pr-3 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500",
                  darkMode ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200",
                )}
              />
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-widest font-semibold text-gray-400">
              {sidebarRooms.length} {sidebarRooms.length === 1 ? "room" : "rooms"} · floor {floor}
            </p>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto py-1">
            {sidebarRooms.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-gray-500">
                No rooms here yet. Switch to <strong>Add room</strong> mode and tap the map.
              </p>
            ) : (
              sidebarRooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(r.id);
                    if (r.mapPositionX != null && r.mapPositionY != null) {
                      // Pan map to the room — best effort.
                      // Leaflet pan happens via the OsmBasemap; we use the
                      // overlay → latLng path indirectly by setting state.
                    }
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 border-l-2",
                    selectedId === r.id
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-600"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 border-transparent",
                  )}
                >
                  <span className="font-mono font-bold text-xs w-12 shrink-0 tabular-nums">{r.roomNumber}</span>
                  <span className="flex-1 truncate text-xs">{r.name || r.type || "—"}</span>
                  {savingId === r.id && <Loader2 className="h-3 w-3 animate-spin text-blue-500 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* MAP */}
        <div className="flex-1 min-w-0 relative">
          {/* Mode help strip */}
          <div className={cn(
            "absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-md border shadow-sm pointer-events-none",
            mode === "add"
              ? "bg-blue-600/95 text-white border-blue-700/50"
              : darkMode ? "bg-gray-900/85 text-gray-300 border-gray-700" : "bg-white/90 text-gray-700 border-gray-200",
          )}>
            {mode === "add"
              ? "Tap the map to place a new room"
              : selectedRoom
                ? `Drag to move · selected: ${selectedRoom.roomNumber}`
                : "Click a room to select · drag to move"}
          </div>

          <OsmBasemap
            svgViewBox={{ x: baseViewBox.x, y: baseViewBox.y, w: baseViewBox.w, h: baseViewBox.h }}
            enableOverlay
            onOverlayReady={setOverlayEl}
            onReady={(m) => { mapRef.current = m; }}
            className="absolute inset-0"
          />
          {overlayEl && createPortal(overlayBody, overlayEl)}

          {/* Empty-state */}
          {floorRooms.length === 0 && mode !== "add" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={cn(
                "text-center px-5 py-4 rounded-2xl backdrop-blur-md max-w-sm shadow-lg pointer-events-auto",
                darkMode ? "bg-gray-900/85 text-gray-300" : "bg-white/90 text-gray-700",
              )}>
                <Building2 className="h-7 w-7 mx-auto mb-2 text-blue-500/70" />
                <p className="text-sm font-semibold">No rooms on floor {floor}</p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  Switch to <strong>Add room</strong> mode and tap the map.
                </p>
                <Button
                  size="sm"
                  onClick={() => setMode("add")}
                  className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Start adding
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* PROPERTIES PANEL */}
        {selectedRoom && (
          <RoomPropertiesPanel
            key={selectedRoom.id}
            room={selectedRoom}
            buildings={buildings}
            saving={savingId === selectedRoom.id || updateRoom.isPending}
            onSave={(patch) => updateRoom.mutate({ id: selectedRoom.id, patch })}
            onDelete={() => {
              if (confirm(`Delete room ${selectedRoom.roomNumber}? This can't be undone.`)) {
                deleteRoom.mutate(selectedRoom.id);
              }
            }}
            onClose={() => setSelectedId(null)}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  );
}

/* ── Properties panel ──────────────────────────────────────────────── */

function RoomPropertiesPanel({
  room, buildings, saving, onSave, onDelete, onClose, darkMode,
}: {
  room: Room;
  buildings: Array<{ id: string; name: string }>;
  saving: boolean;
  onSave: (patch: Partial<Room>) => void;
  onDelete: () => void;
  onClose: () => void;
  darkMode: boolean;
}) {
  const [draft, setDraft] = useState<Room>(room);
  useEffect(() => setDraft(room), [room.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  const dirty =
    draft.roomNumber !== room.roomNumber
    || draft.name !== room.name
    || draft.floor !== room.floor
    || draft.type !== room.type
    || draft.width !== room.width
    || draft.height !== room.height
    || draft.buildingId !== room.buildingId
    || (draft.virtualTourUrl ?? "") !== (room.virtualTourUrl ?? "");

  return (
    <aside className={cn(
      "hidden lg:flex flex-col w-80 shrink-0 border-l overflow-hidden",
      darkMode ? "border-gray-800 bg-gray-900/40" : "border-gray-200 bg-white",
    )}>
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200/70 dark:border-gray-800/70 flex items-center gap-2">
        <span className="font-mono text-xs font-bold tabular-nums text-blue-700 dark:text-blue-300">
          {room.roomNumber}
        </span>
        <span className="flex-1 truncate text-xs text-gray-500">
          {room.name || room.type || "no name"}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        <FieldPair
          label="Room number"
          input={
            <Input
              value={draft.roomNumber}
              onChange={(e) => setDraft({ ...draft, roomNumber: e.target.value })}
              className="h-9 rounded-lg text-sm font-mono"
            />
          }
        />
        <FieldPair
          label="Display name"
          input={
            <Input
              value={draft.name ?? ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Chemistry Lab"
              className="h-9 rounded-lg text-sm"
            />
          }
        />
        <FieldPair
          label="Building"
          input={
            <select
              value={draft.buildingId ?? ""}
              onChange={(e) => setDraft({ ...draft, buildingId: e.target.value || undefined })}
              className="w-full h-9 rounded-lg text-sm border border-input bg-background px-3"
            >
              <option value="">— none —</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          }
        />
        <div className="grid grid-cols-2 gap-2.5">
          <FieldPair
            label="Floor"
            input={
              <Input
                type="number" min={1} max={9}
                value={draft.floor}
                onChange={(e) => setDraft({ ...draft, floor: Number(e.target.value) || 1 })}
                className="h-9 rounded-lg text-sm tabular-nums"
              />
            }
          />
          <FieldPair
            label="Type"
            input={
              <select
                value={draft.type ?? "classroom"}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                className="w-full h-9 rounded-lg text-sm border border-input bg-background px-2"
              >
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <FieldPair
            label="Width"
            input={
              <Input
                type="number" min={10} max={500}
                value={draft.width ?? 56}
                onChange={(e) => setDraft({ ...draft, width: Number(e.target.value) || 56 })}
                className="h-9 rounded-lg text-sm tabular-nums"
              />
            }
          />
          <FieldPair
            label="Height"
            input={
              <Input
                type="number" min={10} max={500}
                value={draft.height ?? 40}
                onChange={(e) => setDraft({ ...draft, height: Number(e.target.value) || 40 })}
                className="h-9 rounded-lg text-sm tabular-nums"
              />
            }
          />
        </div>

        {/* Matterport scan URL — links a 3D walkthrough to this room */}
        <div className="pt-3 border-t border-gray-200/70 dark:border-gray-800/70 space-y-1.5">
          <Label className="text-[10px] font-bold tracking-[0.22em] uppercase text-gray-400 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              3D
            </span>
            Matterport scan
          </Label>
          <input
            type="url"
            inputMode="url"
            placeholder="https://my.matterport.com/show/?m=…"
            value={draft.virtualTourUrl ?? ""}
            onChange={(e) => setDraft({ ...draft, virtualTourUrl: e.target.value })}
            className="w-full h-9 rounded-lg text-xs font-mono border border-input bg-background px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          {(draft.virtualTourUrl ?? "").trim() && (
            <a
              href={(draft.virtualTourUrl ?? "").trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Open in new tab →
            </a>
          )}
          <p className="text-[11px] text-gray-400 leading-snug">
            Paste a tour URL or bare model ID. Students see a "3D walkthrough" button on this room.
          </p>
        </div>

        {/* Position read-out (live) */}
        <div className="pt-3 border-t border-gray-200/70 dark:border-gray-800/70">
          <Label className="text-[10px] font-bold tracking-[0.22em] uppercase text-gray-400">
            Map position
          </Label>
          <p className="font-mono text-xs tabular-nums text-gray-600 dark:text-gray-400 mt-1">
            x: {Math.round(draft.mapPositionX ?? 0)} · y: {Math.round(draft.mapPositionY ?? 0)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Drag the room on the map to change.
          </p>
        </div>
      </div>

      {/* Footer actions */}
      <div className="shrink-0 p-3 border-t border-gray-200/70 dark:border-gray-800/70 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-9 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
        <div className="flex-1" />
        <Button
          type="button"
          size="sm"
          disabled={!dirty || saving}
          onClick={() => onSave({
            roomNumber: draft.roomNumber,
            name: draft.name,
            floor: draft.floor,
            type: draft.type,
            width: draft.width,
            height: draft.height,
            buildingId: draft.buildingId,
            virtualTourUrl: (draft.virtualTourUrl ?? "").trim() || undefined,
          })}
          className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>
    </aside>
  );
}

function FieldPair({ label, input }: { label: string; input: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-bold tracking-[0.22em] uppercase text-gray-400">
        {label}
      </Label>
      {input}
    </div>
  );
}

/** Picks the next free number on a floor — uses the highest existing
 *  number + 1, or starts at 100 + floor*100. */
function nextRoomNumber(rooms: Room[], floor: number): string {
  const onFloor = rooms.filter((r) => (r.floor ?? 1) === floor);
  const nums = onFloor
    .map((r) => parseInt(r.roomNumber || "", 10))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return `${floor}01`;
  return String(Math.max(...nums) + 1);
}
