/**
 * KSYK Maps — Map Builder (3D-aware).
 *
 * Renders the live Leaflet basemap with the campus SVG overlay portalled
 * on top, exactly like the public map. Each room is a draggable group
 * inside the overlay; pointer-up PUTs the new mapPositionX/Y to
 * /api/rooms/:id, then invalidates the React-Query cache so the public
 * map picks up the change without a refresh.
 *
 * The admin gets the same pitch toggle the public map has, so they can
 * preview how the building looks tilted before publishing.
 */

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Building2, Layers, Loader2, Mountain, Move, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface Room {
  id: string;
  roomNumber: string;
  name?: string;
  floor: number;
  type?: string;
  currentStatus?: string;
  mapPositionX?: number;
  mapPositionY?: number;
  width?: number;
  height?: number;
}

export default function Builder3D() {
  const { darkMode } = useDarkMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings, update } = useAppSettings();

  const overlayRef = useRef<SVGSVGElement | null>(null);
  const [overlayEl, setOverlayEl] = useState<SVGSVGElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const [floor, setFloor] = useState(1);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number } | null>(null);
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: async () => {
      const r = await fetch("/api/rooms");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
  });

  const baseViewBox = useMemo(
    () => parseViewBox(computeCampusViewBox(outlinesAsMapBuildings() as BuildingMapData[])),
    [],
  );

  const floorRooms = (rooms as Room[]).filter(
    (r) => (r.floor ?? 1) === floor && r.mapPositionX != null && r.mapPositionY != null,
  );

  const maxFloor = Math.max(1, ...rooms.map((r) => r.floor ?? 1), 3);

  const is3DMode = (settings.osmPitchDeg ?? 0) > 0;

  /* ── Drag handling ────────────────────────────────────────────────── */

  const eventToSvg = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = overlayEl;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inv = ctm.inverse();
    const p = pt.matrixTransform(inv);
    return { x: p.x, y: p.y };
  }, [overlayEl]);

  const onPointerDown = useCallback((e: React.PointerEvent, room: Room) => {
    const p = eventToSvg(e.clientX, e.clientY);
    if (!p) return;
    e.stopPropagation();
    dragOffset.current = {
      x: p.x - (room.mapPositionX ?? 0),
      y: p.y - (room.mapPositionY ?? 0),
    };
    setDragId(room.id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    // Disable Leaflet's drag while we're dragging a room.
    mapRef.current?.dragging?.disable();
  }, [eventToSvg]);

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
      const r = await fetch(`/api/rooms/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapPositionX: pos.x, mapPositionY: pos.y }),
      });
      if (!r.ok) throw new Error(`Save failed (${r.status})`);
      toast({
        title: "Saved",
        description: `Position updated · (${pos.x}, ${pos.y})`,
      });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setLocalPositions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  }, [dragId, localPositions, toast, queryClient]);

  // Pointer move / up live on window so a fast drag that leaves the
  // overlay still saves correctly.
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

  /* ── Render ───────────────────────────────────────────────────────── */

  // Building outlines — gray dashed footprint behind the rooms.
  const buildingPolys = useMemo(() => {
    return (outlinesAsMapBuildings() as BuildingMapData[]).map((b) => {
      const pts = parseBuildingShape(b).map((p) => `${p.x},${p.y}`).join(" ");
      return { letter: b.name, pts };
    });
  }, []);

  // The SVG overlay content — gets portalled into the SVG element Leaflet
  // creates inside the map pane.
  const overlayBody = (
    <>
      <defs>
        <filter id="builderDragHalo" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Building outlines */}
      {buildingPolys.map(({ letter, pts }) => (
        <polygon
          key={letter}
          points={pts}
          fill={darkMode ? "rgba(255,255,255,0.04)" : "rgba(11,19,34,0.03)"}
          stroke={darkMode ? "rgba(255,255,255,0.12)" : "rgba(11,19,34,0.14)"}
          strokeWidth={0.8}
          strokeDasharray="4,3"
        />
      ))}

      {/* Rooms — draggable */}
      {floorRooms.map((room) => {
        const localPos = localPositions[room.id];
        const x = localPos?.x ?? room.mapPositionX ?? 0;
        const y = localPos?.y ?? room.mapPositionY ?? 0;
        const w = room.width ?? 56;
        const h = room.height ?? 40;
        const fill = getRoomFillColor(room.type, room.currentStatus);
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
            onPointerDown={(e) => onPointerDown(e, room)}
            className={cn(
              "cursor-grab",
              isDragging && "cursor-grabbing",
            )}
            style={{ touchAction: "none" }}
            filter={isDragging ? "url(#builderDragHalo)" : undefined}
          >
            {/* 3D right wall */}
            {is3DMode && sideW > 0 && (
              <polygon
                points={`${x+w},${y} ${x+w+sideW},${y-sideW*0.55} ${x+w+sideW},${y+h+wallH-sideW*0.55} ${x+w},${y+h+wallH}`}
                fill={fill} fillOpacity={0.6}
                style={{ filter: "brightness(0.5) saturate(1.1)" }}
              />
            )}
            {/* 3D left wall */}
            {is3DMode && sideW > 0 && (
              <polygon
                points={`${x},${y} ${x-sideW*0.5},${y-sideW*0.4} ${x-sideW*0.5},${y+h+wallH-sideW*0.4} ${x},${y+h+wallH}`}
                fill={fill} fillOpacity={0.5}
                style={{ filter: "brightness(0.78) saturate(1.05)" }}
              />
            )}
            {/* 3D front wall */}
            {is3DMode && wallH > 0 && (
              <>
                <rect x={x} y={y + h - 2} width={w} height={wallH + 2} fill={fill} fillOpacity={0.72} />
                <rect x={x} y={y + h - 2} width={w} height={wallH + 2} fill="rgba(0,0,0,0.38)" />
              </>
            )}
            {/* Roof / 2D room */}
            <rect
              x={x} y={y} width={w} height={h} rx={4}
              fill={fill}
              fillOpacity={isDragging ? 1 : 0.92}
              stroke={isDragging ? "#2563eb" : isSaving ? "#fbbf24" : "rgba(255,255,255,0.9)"}
              strokeWidth={isDragging ? 3 : isSaving ? 2 : 0.9}
            />
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
            {/* Tiny drag-handle dot in the corner — affordance */}
            <circle
              cx={x + 4} cy={y + 4} r={1.8}
              fill="rgba(255,255,255,0.85)"
              className="pointer-events-none"
            />
            <circle
              cx={x + 4} cy={y + 4} r={0.9}
              fill="rgba(0,0,0,0.45)"
              className="pointer-events-none"
            />
          </g>
        );
      })}
    </>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className={cn(
        "shrink-0 px-4 sm:px-6 py-3 border-b flex items-center gap-3 flex-wrap z-10",
        darkMode ? "border-gray-800 bg-gray-900/60" : "border-gray-200 bg-white",
      )}>
        <div className="flex items-center gap-2.5">
          <img
            src="/favicon-128.png"
            alt="KSYK Maps"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          <div className="min-w-0">
            <p className="text-[9px] font-bold tracking-[0.32em] uppercase text-gray-400 dark:text-gray-500 leading-none">
              KSYK · Builder
            </p>
            <p className="text-sm font-semibold leading-tight mt-0.5">
              Map · 3D Placement
            </p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Floor selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500 px-2">
            Floor
          </span>
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

        {/* Pitch slider (only when 3D) */}
        {is3DMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800">
            <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <input
              type="range"
              min={0}
              max={45}
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

        {/* Room counter */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300">
          <span className="font-semibold tabular-nums">{floorRooms.length}</span>
          <span className="text-gray-500">{floorRooms.length === 1 ? "room" : "rooms"}</span>
        </div>
      </div>

      {/* Help strip */}
      <div className={cn(
        "shrink-0 px-4 sm:px-6 py-2 text-[11px] flex items-center gap-2 border-b",
        darkMode ? "border-gray-800 text-gray-400 bg-gray-900/40" : "border-gray-200 text-gray-600 bg-blue-50/60",
      )}>
        <Move className="h-3 w-3 text-blue-600 dark:text-blue-400" />
        <span>
          <strong className="font-semibold text-gray-700 dark:text-gray-300">Drag</strong> any room on the live map to reposition it. Save is automatic on release.
        </span>
        {savingId && (
          <span className="ml-auto flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </span>
        )}
        {!savingId && dragId && (
          <span className="ml-auto flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
            <Save className="h-3 w-3" />
            Drop to save
          </span>
        )}
      </div>

      {/* Stage — the actual Leaflet map */}
      <div className="flex-1 min-h-0 relative">
        <OsmBasemap
          svgViewBox={{ x: baseViewBox.x, y: baseViewBox.y, w: baseViewBox.w, h: baseViewBox.h }}
          enableOverlay
          onOverlayReady={(el) => {
            overlayRef.current = el;
            setOverlayEl(el);
          }}
          onReady={(m) => { mapRef.current = m; }}
          className="absolute inset-0"
        />
        {overlayEl && createPortal(overlayBody, overlayEl)}

        {/* Empty-state hint */}
        {floorRooms.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={cn(
              "text-center px-5 py-4 rounded-2xl backdrop-blur-md max-w-sm shadow-lg",
              darkMode ? "bg-gray-900/85 text-gray-300" : "bg-white/90 text-gray-700",
            )}>
              <Building2 className="h-7 w-7 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">No rooms on floor {floor}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add rooms in the <strong>Builder → Rooms & Floors</strong> tab first, then drag them here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
