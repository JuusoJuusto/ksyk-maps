/**
 * KSYK Maps — 3D Room Builder.
 *
 * Admin tool for placing rooms in 3D space. Renders the campus SVG with
 * the same extruded-room treatment the public map uses, but each room
 * is draggable; releasing a drag PUTs the new coordinates to
 * /api/rooms/:id. Floor switcher + a pitch slider so the admin can find
 * the angle they want to work at.
 *
 * No three.js / new deps — pure SVG + the existing campusBody pattern,
 * which keeps the bundle slim and matches the public map exactly so what
 * you see in the builder is what users will see.
 */

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Grid3x3, Layers, Loader2, MapPin, Move, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";
import {
  KSYK_BUILDING_OUTLINES,
  outlinesAsMapBuildings,
} from "@/lib/ksykCampusOutlines";
import {
  parseBuildingShape,
  computeCampusViewBox,
  parseViewBox,
  type BuildingMapData,
} from "@/lib/mapGeometry";
import { getRoomFillColor } from "@/lib/campusSpace";

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
  const svgRef = useRef<SVGSVGElement>(null);

  const [floor, setFloor] = useState(1);
  const [pitch, setPitch] = useState(28);
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

  /* ── Drag handling ──────────────────────────────────────────────────── */

  const eventToSvg = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inv = ctm.inverse();
    const p = pt.matrixTransform(inv);
    return { x: p.x, y: p.y };
  };

  const onPointerDown = (e: React.PointerEvent, room: Room) => {
    const p = eventToSvg(e.clientX, e.clientY);
    if (!p) return;
    const w = room.width ?? 56;
    const h = room.height ?? 40;
    // Store the click offset from the top-left of the room.
    dragOffset.current = { x: p.x - (room.mapPositionX ?? 0), y: p.y - (room.mapPositionY ?? 0) };
    setDragId(room.id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
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
  };

  const onPointerUp = async () => {
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
      toast({ title: "Saved", description: `Room moved to (${pos.x}, ${pos.y})` });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      // Clear the local override now that the server has authoritative state.
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
  };

  /* ── Render ─────────────────────────────────────────────────────────── */

  const buildingPolys = useMemo(() => {
    return (outlinesAsMapBuildings() as BuildingMapData[]).map((b) => {
      const pts = parseBuildingShape(b).map((p) => `${p.x},${p.y}`).join(" ");
      return { letter: b.name, pts };
    });
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className={cn(
        "shrink-0 px-4 sm:px-6 py-3 border-b flex items-center gap-3 flex-wrap",
        darkMode ? "border-gray-800 bg-gray-900/60" : "border-gray-200 bg-white/80",
      )}>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
            <Move className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p
              className="text-[9px] font-bold tracking-[0.28em] uppercase text-muted-foreground"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              KSYK · Builder
            </p>
            <p
              className="text-sm font-bold leading-tight"
              style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
            >
              3D Room Placement
            </p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Floor selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          <span
            className="text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground px-2"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
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
                  ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Pitch */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800">
          <Layers className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
          <input
            type="range"
            min={0}
            max={45}
            value={pitch}
            onChange={(e) => setPitch(Number(e.target.value))}
            className="w-28 accent-cyan-500"
            aria-label="Pitch"
          />
          <span
            className="text-xs font-bold tabular-nums w-8 text-right text-cyan-700 dark:text-cyan-300"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {pitch}°
          </span>
        </div>
      </div>

      {/* Help strip */}
      <div className={cn(
        "shrink-0 px-4 sm:px-6 py-2 text-[11px] flex items-center gap-3 border-b",
        darkMode ? "border-gray-800 text-gray-400 bg-gray-900/40" : "border-gray-200 text-gray-600 bg-blue-50/40",
      )}>
        <Move className="h-3 w-3" />
        Drag a room to reposition it. Releasing the pointer saves to the server.
        {savingId && (
          <span className="ml-auto flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </span>
        )}
      </div>

      {/* Stage */}
      <div className="flex-1 min-h-0 relative overflow-hidden"
           style={{
             background: darkMode
               ? "radial-gradient(circle at 50% 30%, #1b2540 0%, #0b1322 70%)"
               : "radial-gradient(circle at 50% 30%, #e6efff 0%, #dde6ef 70%)",
           }}>
        {/* Inner perspective container */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            perspective: "2400px",
            perspectiveOrigin: "50% 50%",
          }}
        >
          <div
            className="w-[min(96%,1100px)] aspect-[16/9]"
            style={{
              transform: `rotateX(${pitch}deg)`,
              transformStyle: "preserve-3d",
              transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <svg
              ref={svgRef}
              viewBox={`${baseViewBox.x} ${baseViewBox.y} ${baseViewBox.w} ${baseViewBox.h}`}
              className="w-full h-full select-none touch-none"
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              <defs>
                <filter id="builderRoomShadow" x="-30%" y="-20%" width="160%" height="180%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                  <feOffset dx="2" dy="5" />
                  <feComponentTransfer><feFuncA type="linear" slope="0.35" /></feComponentTransfer>
                  <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <pattern id="builderGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none"
                        stroke={darkMode ? "rgba(255,255,255,0.06)" : "rgba(11,19,34,0.07)"} strokeWidth="1" />
                </pattern>
              </defs>

              {/* Ground grid */}
              <rect x={baseViewBox.x} y={baseViewBox.y} width={baseViewBox.w} height={baseViewBox.h}
                    fill="url(#builderGrid)" />

              {/* Building outlines */}
              {buildingPolys.map(({ letter, pts }) => (
                <polygon
                  key={letter}
                  points={pts}
                  fill={darkMode ? "rgba(255,255,255,0.04)" : "rgba(11,19,34,0.05)"}
                  stroke={darkMode ? "rgba(255,255,255,0.15)" : "rgba(11,19,34,0.18)"}
                  strokeWidth={1}
                  strokeDasharray="4,3"
                />
              ))}

              {/* Rooms with 3D extrusion */}
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
                const pitchScale = 0.7 + (pitch / 45) * 0.7;
                const wallH = Math.max(12, (floorN * 9 + 6) * pitchScale);
                const sideW = Math.max(5, Math.min(w * 0.14, 11));

                return (
                  <g
                    key={room.id}
                    onPointerDown={(e) => onPointerDown(e, room)}
                    className={cn("cursor-grab", isDragging && "cursor-grabbing")}
                    filter={isDragging ? undefined : "url(#builderRoomShadow)"}
                    style={{ touchAction: "none" }}
                  >
                    {/* Right wall */}
                    <polygon
                      points={`${x+w},${y} ${x+w+sideW},${y-sideW*0.55} ${x+w+sideW},${y+h+wallH-sideW*0.55} ${x+w},${y+h+wallH}`}
                      fill={fill} fillOpacity={0.6}
                      style={{ filter: "brightness(0.5) saturate(1.1)" }}
                    />
                    {/* Left wall */}
                    <polygon
                      points={`${x},${y} ${x-sideW*0.5},${y-sideW*0.4} ${x-sideW*0.5},${y+h+wallH-sideW*0.4} ${x},${y+h+wallH}`}
                      fill={fill} fillOpacity={0.5}
                      style={{ filter: "brightness(0.78) saturate(1.05)" }}
                    />
                    {/* Front wall */}
                    <rect x={x} y={y + h - 2} width={w} height={wallH + 2} fill={fill} fillOpacity={0.72} />
                    <rect x={x} y={y + h - 2} width={w} height={wallH + 2} fill="rgba(0,0,0,0.38)" />
                    {/* Roof */}
                    <rect
                      x={x} y={y} width={w} height={h} rx={4}
                      fill={fill} fillOpacity={0.95}
                      stroke={isDragging ? "#22d3ee" : isSaving ? "#fbbf24" : "rgba(255,255,255,0.9)"}
                      strokeWidth={isDragging ? 2.5 : isSaving ? 2 : 0.9}
                    />
                    {/* Label */}
                    <text
                      x={x + w / 2} y={y + h / 2}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#fff"
                      fontSize={Math.min(12, Math.max(8, w / 6))}
                      fontWeight="700"
                      style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.45)", strokeWidth: 0.8 }}
                    >
                      {room.roomNumber}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Empty state */}
        {floorRooms.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={cn(
              "text-center px-6 py-4 rounded-2xl backdrop-blur-md max-w-sm",
              darkMode ? "bg-gray-900/70 text-gray-300" : "bg-white/70 text-gray-700",
            )}>
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">No rooms on floor {floor}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add rooms in the Rooms & Floors tab first, then drag them here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
