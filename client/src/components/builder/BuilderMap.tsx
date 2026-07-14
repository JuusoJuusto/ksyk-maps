/**
 * KSYK Maps Builder — Leaflet canvas with drawing overlays.
 *
 * Wraps <OsmBasemap> and paints buildings, rooms, hallways and the live
 * "in-progress" drawing preview into the campus SVG overlay it exposes.
 *
 * The coordinate system is the campus SVG-space (mapPositionX/Y ints in
 * pixels), same as the customer-facing KSYKMapView. Every persisted shape
 * lives in SVG-space so the existing hooks/routes keep working. The map
 * translates pointer events between SVG-space and lat/lng only for
 * displaying the "live preview" while drawing — drawings are committed to
 * SVG-space through `svgFromClientPoint`.
 *
 * Drawing tools:
 *   • building — drag-rect, emits BuildingDraft on drop
 *   • room     — drag-rect within a selected building; emits RoomDraft
 *   • hallway  — click waypoints, Enter/dbl-click finalises → HallwayDraft
 *   • wall     — 2 clicks → HallwayDraft (uses hallways table)
 *   • select   — click any shape to select
 *   • pan      — noop, just lets Leaflet handle the drag
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type L from "leaflet";
import OsmBasemap from "@/components/OsmBasemap";
import { useAppSettings } from "@/hooks/useAppSettings";
import { computeCampusViewBox, parseViewBox } from "@/lib/mapGeometry";
import { outlinesAsMapBuildings } from "@/lib/ksykCampusOutlines";
import type { Building, Hallway, Room } from "@shared/schema";
import type { BuilderTool } from "./BuilderToolbar";
import type { Selection } from "./BuilderPropertyPanel";

const DEFAULT_BUILDING_SIZE = { w: 200, h: 150 };

export interface BuildingDraft {
  mapPositionX: number;
  mapPositionY: number;
  width: number;
  height: number;
}
export interface RoomDraft {
  buildingId: string;
  mapPositionX: number;
  mapPositionY: number;
  width: number;
  height: number;
}
export interface HallwayDraft {
  buildingId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface BuilderMapHandle {
  fitCampus: () => void;
}

interface BuilderMapProps {
  activeTool: BuilderTool;
  buildings: Building[];
  rooms: Room[];
  hallways: Hallway[];
  selection: Selection;
  onSelect: (s: Selection) => void;
  onDrawBuilding: (draft: BuildingDraft) => void;
  onDrawRoom: (draft: RoomDraft) => void;
  onDrawHallway: (draft: HallwayDraft) => void;
  onMoveBuilding: (id: string, x: number, y: number) => void;
  onMoveRoom: (id: string, x: number, y: number) => void;
  registerHandle?: (h: BuilderMapHandle) => void;
}

export default function BuilderMap({
  activeTool,
  buildings,
  rooms,
  hallways,
  selection,
  onSelect,
  onDrawBuilding,
  onDrawRoom,
  onDrawHallway,
  onMoveBuilding,
  onMoveRoom,
  registerHandle,
}: BuilderMapProps) {
  const { settings } = useAppSettings();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<SVGSVGElement | null>(null);
  const [, setOverlayReadyTick] = useState(0);

  // Campus base viewBox — mirrors KSYKMapView so persisted SVG coords line
  // up with the same lat/lng anchors on the public map.
  const baseViewBox = useMemo(
    () => parseViewBox(computeCampusViewBox(outlinesAsMapBuildings())),
    []
  );

  // ─── Coordinate helpers ──────────────────────────────────────────────────
  const clientToSvg = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = overlayRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return null;
      const fx = (clientX - rect.left) / rect.width;
      const fy = (clientY - rect.top) / rect.height;
      return {
        x: Math.round(baseViewBox.x + fx * baseViewBox.w),
        y: Math.round(baseViewBox.y + fy * baseViewBox.h),
      };
    },
    [baseViewBox.x, baseViewBox.y, baseViewBox.w, baseViewBox.h]
  );

  // ─── Register handle for parent (fit-to-campus) ──────────────────────────
  useEffect(() => {
    if (!registerHandle) return;
    registerHandle({
      fitCampus: () => {
        const map = mapRef.current;
        if (!map) return;
        map.flyTo(
          [settings.osmCenterLat, settings.osmCenterLng],
          settings.osmDefaultZoom,
          { duration: 0.7 }
        );
      },
    });
  }, [registerHandle, settings.osmCenterLat, settings.osmCenterLng, settings.osmDefaultZoom]);

  // ─── Drawing state ───────────────────────────────────────────────────────
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);
  const [hallwayPoints, setHallwayPoints] = useState<{ x: number; y: number }[]>([]);
  const [cursorSvg, setCursorSvg] = useState<{ x: number; y: number } | null>(null);
  const [dragMove, setDragMove] = useState<{
    kind: "building" | "room";
    id: string;
    originX: number;
    originY: number;
    startClientX: number;
    startClientY: number;
    currentDX: number;
    currentDY: number;
  } | null>(null);

  // Reset draft when tool changes — avoids leftover rubber-band from previous tool.
  useEffect(() => {
    setDrawStart(null);
    setDrawEnd(null);
    setHallwayPoints([]);
    setCursorSvg(null);
    setDragMove(null);
  }, [activeTool]);

  // ─── Pointer wiring ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const overlayInteractive = activeTool !== "pan";

    // Toggle Leaflet dragging based on tool. For drawing tools we still let
    // the user pan outside their rubber-band, but a mid-draw drag turns off
    // panning to keep the rectangle honest.
    const map = mapRef.current;
    if (map) {
      if (activeTool === "pan" || activeTool === "select") {
        map.dragging.enable();
      } else {
        // Draw tools: dragging stays enabled unless user has started drawing
        map.dragging.enable();
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      // Only act on primary button
      if (e.button !== 0) return;
      // Skip Leaflet zoom/dragging events (they bubble from inside the map)
      const target = e.target as HTMLElement;
      if (target.closest(".leaflet-control")) return;
      if (target.closest("[data-builder-shape]")) return; // handled by shape click below

      if (!overlayInteractive) return;

      const svgPt = clientToSvg(e.clientX, e.clientY);
      if (!svgPt) return;

      if (activeTool === "building" || activeTool === "room") {
        e.preventDefault();
        setDrawStart(svgPt);
        setDrawEnd(svgPt);
        mapRef.current?.dragging.disable();
      } else if (activeTool === "hallway") {
        e.preventDefault();
        setHallwayPoints((pts) => [...pts, svgPt]);
      } else if (activeTool === "wall") {
        e.preventDefault();
        setHallwayPoints((pts) => {
          const next = [...pts, svgPt];
          if (next.length === 2) {
            // Auto-finalize wall on second click
            const buildingId = firstBuildingId(buildings);
            if (buildingId) {
              onDrawHallway({
                buildingId,
                startX: next[0].x,
                startY: next[0].y,
                endX: next[1].x,
                endY: next[1].y,
              });
            }
            return [];
          }
          return next;
        });
      } else if (activeTool === "select") {
        // Click on empty space clears selection
        onSelect(null);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const svgPt = clientToSvg(e.clientX, e.clientY);
      if (!svgPt) return;
      setCursorSvg(svgPt);

      if (drawStart) {
        setDrawEnd(svgPt);
      }
    };

    const onPointerUp = () => {
      if (drawStart && drawEnd) {
        const x = Math.min(drawStart.x, drawEnd.x);
        const y = Math.min(drawStart.y, drawEnd.y);
        const w = Math.abs(drawStart.x - drawEnd.x);
        const h = Math.abs(drawStart.y - drawEnd.y);

        if (w >= 10 && h >= 10) {
          if (activeTool === "building") {
            onDrawBuilding({
              mapPositionX: x,
              mapPositionY: y,
              width: w,
              height: h,
            });
          } else if (activeTool === "room") {
            const buildingId =
              selection?.kind === "building"
                ? selection.value.id
                : selection?.kind === "room"
                ? selection.value.buildingId
                : firstBuildingId(buildings);
            if (buildingId) {
              onDrawRoom({
                buildingId,
                mapPositionX: x,
                mapPositionY: y,
                width: w,
                height: h,
              });
            }
          }
        }
        setDrawStart(null);
        setDrawEnd(null);
        mapRef.current?.dragging.enable();
      }
    };

    const onDoubleClick = (e: MouseEvent) => {
      if (activeTool === "hallway" && hallwayPoints.length >= 2) {
        const buildingId =
          selection?.kind === "building"
            ? selection.value.id
            : firstBuildingId(buildings);
        if (buildingId) {
          for (let i = 0; i < hallwayPoints.length - 1; i++) {
            onDrawHallway({
              buildingId,
              startX: hallwayPoints[i].x,
              startY: hallwayPoints[i].y,
              endX: hallwayPoints[i + 1].x,
              endY: hallwayPoints[i + 1].y,
            });
          }
          setHallwayPoints([]);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && activeTool === "hallway" && hallwayPoints.length >= 2) {
        const buildingId =
          selection?.kind === "building"
            ? selection.value.id
            : firstBuildingId(buildings);
        if (buildingId) {
          for (let i = 0; i < hallwayPoints.length - 1; i++) {
            onDrawHallway({
              buildingId,
              startX: hallwayPoints[i].x,
              startY: hallwayPoints[i].y,
              endX: hallwayPoints[i + 1].x,
              endY: hallwayPoints[i + 1].y,
            });
          }
          setHallwayPoints([]);
        }
      } else if (e.key === "Escape") {
        setDrawStart(null);
        setDrawEnd(null);
        setHallwayPoints([]);
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    el.addEventListener("dblclick", onDoubleClick);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("dblclick", onDoubleClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    activeTool,
    buildings,
    selection,
    drawStart,
    drawEnd,
    hallwayPoints,
    clientToSvg,
    onDrawBuilding,
    onDrawRoom,
    onDrawHallway,
    onSelect,
  ]);

  // ─── Shape drag-to-move (select tool) ────────────────────────────────────
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragMove) return;
      const dxClient = e.clientX - dragMove.startClientX;
      const dyClient = e.clientY - dragMove.startClientY;
      // Convert client-pixel delta to SVG-space by re-projecting both anchor
      // and current cursor. Handles rotation + zoom transparently.
      const originSvg = clientToSvg(dragMove.startClientX, dragMove.startClientY);
      const nowSvg = clientToSvg(e.clientX, e.clientY);
      if (!originSvg || !nowSvg) return;
      const dx = nowSvg.x - originSvg.x;
      const dy = nowSvg.y - originSvg.y;
      setDragMove((d) => (d ? { ...d, currentDX: dx, currentDY: dy } : d));
      // Silence unused
      void dxClient; void dyClient;
    };
    const onUp = () => {
      if (!dragMove) return;
      const nextX = dragMove.originX + dragMove.currentDX;
      const nextY = dragMove.originY + dragMove.currentDY;
      if (dragMove.currentDX !== 0 || dragMove.currentDY !== 0) {
        if (dragMove.kind === "building") {
          onMoveBuilding(dragMove.id, Math.round(nextX), Math.round(nextY));
        } else {
          onMoveRoom(dragMove.id, Math.round(nextX), Math.round(nextY));
        }
      }
      setDragMove(null);
      mapRef.current?.dragging.enable();
    };
    if (dragMove) {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      return () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
    }
  }, [dragMove, clientToSvg, onMoveBuilding, onMoveRoom]);

  // ─── Rubber-band preview ─────────────────────────────────────────────────
  const previewRect = useMemo(() => {
    if (!drawStart || !drawEnd) return null;
    const x = Math.min(drawStart.x, drawEnd.x);
    const y = Math.min(drawStart.y, drawEnd.y);
    const w = Math.abs(drawStart.x - drawEnd.x);
    const h = Math.abs(drawStart.y - drawEnd.y);
    return { x, y, w, h };
  }, [drawStart, drawEnd]);

  const cursorClass = useMemo(() => {
    switch (activeTool) {
      case "building":
      case "room":
        return "cursor-crosshair";
      case "hallway":
      case "wall":
        return "cursor-crosshair";
      case "pan":
        return "cursor-grab";
      case "select":
      default:
        return "cursor-default";
    }
  }, [activeTool]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${cursorClass}`}
      data-tool={activeTool}
    >
      <OsmBasemap
        svgViewBox={{
          x: baseViewBox.x,
          y: baseViewBox.y,
          w: baseViewBox.w,
          h: baseViewBox.h,
        }}
        enableOverlay
        onReady={(m) => { mapRef.current = m; }}
        onOverlayReady={(svg) => {
          overlayRef.current = svg;
          // Force a repaint so children can portal in
          setOverlayReadyTick((n) => n + 1);
        }}
        className="w-full h-full"
      />

      {/* Overlay children — portalled into the campus SVG so they follow
          Leaflet's zoom/pan/rotation transforms for free. */}
      {overlayRef.current && createPortal(
        <g data-builder-overlay>
          {/* Hallways first (below everything) */}
          {hallways.map((h) => (
            <HallwayShape key={h.id} hallway={h} selected={selection?.kind === "building" && selection.value.id === h.buildingId} />
          ))}

          {/* Buildings — filled rects */}
          {buildings.map((b) => (
            <BuildingShape
              key={b.id}
              building={b}
              selected={selection?.kind === "building" && selection.value.id === b.id}
              draggable={activeTool === "select"}
              offsetX={dragMove?.kind === "building" && dragMove.id === b.id ? dragMove.currentDX : 0}
              offsetY={dragMove?.kind === "building" && dragMove.id === b.id ? dragMove.currentDY : 0}
              onSelect={() => onSelect({ kind: "building", value: b })}
              onDragStart={(e) => {
                if (activeTool !== "select") return;
                mapRef.current?.dragging.disable();
                setDragMove({
                  kind: "building",
                  id: b.id,
                  originX: b.mapPositionX ?? 0,
                  originY: b.mapPositionY ?? 0,
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  currentDX: 0,
                  currentDY: 0,
                });
              }}
            />
          ))}

          {/* Rooms — on top of buildings */}
          {rooms.map((r) => (
            <RoomShape
              key={r.id}
              room={r}
              selected={selection?.kind === "room" && selection.value.id === r.id}
              draggable={activeTool === "select"}
              offsetX={dragMove?.kind === "room" && dragMove.id === r.id ? dragMove.currentDX : 0}
              offsetY={dragMove?.kind === "room" && dragMove.id === r.id ? dragMove.currentDY : 0}
              onSelect={() => onSelect({ kind: "room", value: r })}
              onDragStart={(e) => {
                if (activeTool !== "select") return;
                mapRef.current?.dragging.disable();
                setDragMove({
                  kind: "room",
                  id: r.id,
                  originX: r.mapPositionX ?? 0,
                  originY: r.mapPositionY ?? 0,
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  currentDX: 0,
                  currentDY: 0,
                });
              }}
            />
          ))}

          {/* Rubber-band preview */}
          {previewRect && (
            <rect
              x={previewRect.x}
              y={previewRect.y}
              width={previewRect.w}
              height={previewRect.h}
              fill="rgba(37,99,235,0.15)"
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="8 4"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}

          {/* Hallway-in-progress polyline */}
          {hallwayPoints.length > 0 && (
            <g pointerEvents="none">
              <polyline
                points={
                  [
                    ...hallwayPoints.map((p) => `${p.x},${p.y}`),
                    cursorSvg ? `${cursorSvg.x},${cursorSvg.y}` : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                fill="none"
                stroke="#2563eb"
                strokeWidth={4}
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {hallwayPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={4} fill="#2563eb" vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          )}
        </g>,
        overlayRef.current
      )}
    </div>
  );
}

// ─── Building shape ────────────────────────────────────────────────────────
function BuildingShape({
  building,
  selected,
  draggable,
  offsetX,
  offsetY,
  onSelect,
  onDragStart,
}: {
  building: Building;
  selected: boolean;
  draggable: boolean;
  offsetX: number;
  offsetY: number;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent) => void;
}) {
  const x = (building.mapPositionX ?? 0) + offsetX;
  const y = (building.mapPositionY ?? 0) + offsetY;
  const w = DEFAULT_BUILDING_SIZE.w;
  const h = DEFAULT_BUILDING_SIZE.h;
  const color = building.colorCode || "#2563eb";
  const letter = (building.nameEn || building.name || "?").trim().charAt(0).toUpperCase();

  return (
    <g
      data-builder-shape
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        if (draggable) onDragStart(e);
      }}
      style={{ cursor: draggable ? "move" : "pointer" }}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill={color}
        fillOpacity={0.35}
        stroke={selected ? "#2563eb" : color}
        strokeWidth={selected ? 3 : 2}
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={x + w / 2}
        y={y + h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={48}
        fontWeight={800}
        fill="white"
        stroke={color}
        strokeWidth={2}
        paintOrder="stroke"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {letter}
      </text>

      {selected && <SelectionHandles x={x} y={y} w={w} h={h} />}
    </g>
  );
}

// ─── Room shape ────────────────────────────────────────────────────────────
function RoomShape({
  room,
  selected,
  draggable,
  offsetX,
  offsetY,
  onSelect,
  onDragStart,
}: {
  room: Room;
  selected: boolean;
  draggable: boolean;
  offsetX: number;
  offsetY: number;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent) => void;
}) {
  if (room.mapPositionX == null || room.mapPositionY == null) return null;
  const x = room.mapPositionX + offsetX;
  const y = room.mapPositionY + offsetY;
  const w = room.width ?? 60;
  const h = room.height ?? 40;
  const color = room.colorCode || "#6b7280";
  return (
    <g
      data-builder-shape
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        if (draggable) onDragStart(e);
      }}
      style={{ cursor: draggable ? "move" : "pointer" }}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={3}
        fill={color}
        fillOpacity={0.55}
        stroke={selected ? "#2563eb" : color}
        strokeWidth={selected ? 2.5 : 1}
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={x + w / 2}
        y={y + h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight={700}
        fill="white"
        stroke={color}
        strokeWidth={1}
        paintOrder="stroke"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {room.roomNumber}
      </text>
      {selected && <SelectionHandles x={x} y={y} w={w} h={h} />}
    </g>
  );
}

// ─── Hallway line ──────────────────────────────────────────────────────────
function HallwayShape({ hallway, selected }: { hallway: Hallway; selected: boolean }) {
  if (
    hallway.startX == null ||
    hallway.startY == null ||
    hallway.endX == null ||
    hallway.endY == null
  ) {
    return null;
  }
  return (
    <line
      x1={hallway.startX}
      y1={hallway.startY}
      x2={hallway.endX}
      y2={hallway.endY}
      stroke={hallway.colorCode || "#2563eb"}
      strokeWidth={selected ? 7 : 5}
      strokeOpacity={selected ? 0.9 : 0.6}
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
  );
}

// ─── Corner handles for selected shape ─────────────────────────────────────
function SelectionHandles({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const size = 8;
  const corners = [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ] as const;
  return (
    <g pointerEvents="none">
      {corners.map(([cx, cy], i) => (
        <rect
          key={i}
          x={cx - size / 2}
          y={cy - size / 2}
          width={size}
          height={size}
          fill="white"
          stroke="#2563eb"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

function firstBuildingId(list: Building[]): string | null {
  return list.length > 0 ? list[0].id : null;
}
