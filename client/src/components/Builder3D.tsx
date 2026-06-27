/**
 * KSYK Maps — Map Builder.
 *
 * Single workspace for admins to manage every room on the campus.
 * What this gives admins:
 *   • Multi-select — shift-click rooms OR shift-drag empty area for a lasso box.
 *   • Bulk move / resize / delete / duplicate / type-set / floor-set.
 *   • Alignment toolbar (left/right/top/bottom/centre) when 2+ rooms selected.
 *   • Distribute horizontally / vertically when 3+ rooms selected.
 *   • Copy / paste via ⌘C / ⌘V (in-memory clipboard, offsets by 12 px).
 *   • Working corner-resize handles (NW/NE/SW/SE).
 *   • Undo / redo (40-op stack, ⌘Z / ⌘⇧Z).
 *   • Snap-to-grid (8 px) with grid overlay; toggle with G.
 *   • Ghost preview of the floor below.
 *   • Live coords + dimensions tooltip while dragging / resizing.
 *   • Right-click context menu — duplicate / lock / type / floor / delete.
 *   • Status colour legend on the canvas (bottom-left).
 *   • Sidebar with type-filter chips + auto-scroll to selection.
 *   • Comprehensive keyboard shortcuts (press the ⌨ button for the list).
 *
 * Everything still writes through /api/rooms; what admins see IS what
 * students see.
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
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal,
  AlignEndVertical, AlignHorizontalSpaceAround, AlignStartHorizontal,
  AlignStartVertical, AlignVerticalSpaceAround,
  Building2, Clipboard, Copy, Eye, EyeOff, Grid3x3, Keyboard, Layers, Loader2,
  Mountain, MousePointer2, PlusCircle, Redo2, Save, Search, Trash2, Undo2, X,
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
  virtualTourUrl?: string;
}

type Mode = "select" | "add";
type Corner = "nw" | "ne" | "sw" | "se";

const ROOM_TYPES = [
  "classroom", "office", "lab", "library", "cafeteria",
  "auditorium", "gym", "hallway", "stairs", "wc", "other",
] as const;

const GRID_SIZE = 8;
const NUDGE_SMALL = 1;
const NUDGE_LARGE = 10;
const MIN_ROOM_W = 20;
const MIN_ROOM_H = 16;
const HISTORY_MAX = 40;

/** A snapshot of the editable state we restore on undo / redo. */
interface HistoryEntry {
  positions: Record<string, { x: number; y: number; w: number; h: number }>;
}

/** A copy-pasted room shape, kept in memory only. */
interface ClipboardItem {
  roomNumber: string;
  name?: string;
  floor: number;
  type?: string;
  width?: number;
  height?: number;
  mapPositionX: number;
  mapPositionY: number;
  buildingId?: string;
  virtualTourUrl?: string;
}

interface ContextMenuState {
  x: number;     // viewport coords for placement
  y: number;
  roomId: string | null;
}

export default function Builder3D() {
  const { darkMode } = useDarkMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings, update } = useAppSettings();

  const [overlayEl, setOverlayEl] = useState<SVGSVGElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const sidebarListRef = useRef<HTMLDivElement | null>(null);

  /* ── UI state ───────────────────────────────────────────────────── */
  const [floor, setFloor] = useState(1);
  const [mode, setMode] = useState<Mode>("select");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGhost, setShowGhost] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showLegend, setShowLegend] = useState(true);

  /* ── Lasso (box) selection state ────────────────────────────────── */
  const [lasso, setLasso] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const lassoStart = useRef<{ x: number; y: number } | null>(null);

  /* ── Clipboard + context menu ───────────────────────────────────── */
  const clipboardRef = useRef<ClipboardItem[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  /* ── Drag / resize state ────────────────────────────────────────── */
  const [dragId, setDragId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number } | null>(null);
  const dragStartPositions = useRef<Record<string, { x: number; y: number }> | null>(null);
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});

  const [resizing, setResizing] = useState<{ id: string; corner: Corner } | null>(null);
  const resizeStart = useRef<{ x: number; y: number; w: number; h: number; px: number; py: number } | null>(null);
  const [localSizes, setLocalSizes] = useState<Record<string, { w: number; h: number; x?: number; y?: number }>>({});

  /** Live tooltip — populated during drag / resize, cleared on pointer up. */
  const [hoverTip, setHoverTip] = useState<{ x: number; y: number; text: string } | null>(null);

  /* ── Undo / redo ────────────────────────────────────────────────── */
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);
  const [, forceHistoryTick] = useState(0);
  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  /* ── Queries ────────────────────────────────────────────────────── */

  const { data: rooms = [] } = useQuery<Room[]>({
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

  /* ── Derived ────────────────────────────────────────────────────── */

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

  const ghostRooms = useMemo(
    () => showGhost
      ? rooms.filter((r) => (r.floor ?? 1) === floor - 1 && r.mapPositionX != null && r.mapPositionY != null)
      : [],
    [rooms, floor, showGhost],
  );

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rooms.filter((x) => (x.floor ?? 1) === floor)) {
      if (r.type) set.add(r.type);
    }
    return Array.from(set).sort();
  }, [rooms, floor]);

  const sidebarRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rooms
      .filter((r) => (r.floor ?? 1) === floor)
      .filter((r) => !typeFilter || r.type === typeFilter)
      .filter((r) => {
        if (!q) return true;
        return (
          r.roomNumber?.toLowerCase().includes(q) ||
          (r.name ?? "").toLowerCase().includes(q) ||
          (r.type ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.roomNumber || "").localeCompare(b.roomNumber || ""));
  }, [rooms, floor, query, typeFilter]);

  const selectedRoom = useMemo(() => {
    if (selectedIds.size !== 1) return null;
    const id = Array.from(selectedIds)[0];
    return rooms.find((r) => r.id === id) ?? null;
  }, [rooms, selectedIds]);

  /* ── Helpers ────────────────────────────────────────────────────── */

  const snap = useCallback((n: number) => snapToGrid ? Math.round(n / GRID_SIZE) * GRID_SIZE : Math.round(n), [snapToGrid]);

  const eventToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = overlayEl;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  }, [overlayEl]);

  const pushHistory = useCallback(() => {
    const snapshot: HistoryEntry = {
      positions: Object.fromEntries(rooms.map((r) => [
        r.id,
        { x: r.mapPositionX ?? 0, y: r.mapPositionY ?? 0, w: r.width ?? 56, h: r.height ?? 40 },
      ])),
    };
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(snapshot);
    if (historyRef.current.length > HISTORY_MAX) historyRef.current.shift();
    else historyIndexRef.current = historyRef.current.length - 1;
    forceHistoryTick((n) => n + 1);
  }, [rooms]);

  /* ── Mutations ──────────────────────────────────────────────────── */

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rooms"] }),
    onError: (e: Error) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
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
      setSelectedIds(new Set([room.id]));
      setMode("select");
    },
    onError: (e: Error) => toast({ title: "Couldn't add", description: e.message, variant: "destructive" }),
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/rooms/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok && r.status !== 204) throw new Error(`Delete failed (${r.status})`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    onError: (e: Error) => toast({ title: "Couldn't delete", description: e.message, variant: "destructive" }),
  });

  /* ── Drag handlers ──────────────────────────────────────────────── */

  const onRoomPointerDown = useCallback((e: React.PointerEvent, room: Room, shiftKey: boolean) => {
    if (mode !== "select") return;
    const p = eventToSvg(e.clientX, e.clientY);
    if (!p) return;
    e.stopPropagation();

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shiftKey) {
        if (next.has(room.id)) next.delete(room.id);
        else next.add(room.id);
      } else if (!next.has(room.id)) {
        next.clear();
        next.add(room.id);
      }
      return next;
    });

    pushHistory();

    dragOffset.current = { x: p.x - (room.mapPositionX ?? 0), y: p.y - (room.mapPositionY ?? 0) };
    // Snapshot every selected room's start position for bulk move.
    dragStartPositions.current = Object.fromEntries(
      Array.from(selectedIds.size > 0 && !shiftKey && !selectedIds.has(room.id) ? new Set([room.id]) : selectedIds.size > 0 ? selectedIds : new Set([room.id]))
        .map((id) => {
          const r = rooms.find((rm) => rm.id === id);
          return [id, { x: r?.mapPositionX ?? 0, y: r?.mapPositionY ?? 0 }];
        })
    );
    if (!dragStartPositions.current[room.id]) {
      dragStartPositions.current[room.id] = { x: room.mapPositionX ?? 0, y: room.mapPositionY ?? 0 };
    }

    setDragId(room.id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    mapRef.current?.dragging?.disable();
  }, [eventToSvg, mode, selectedIds, rooms, pushHistory]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (lasso && lassoStart.current) {
      const p = eventToSvg(e.clientX, e.clientY);
      if (!p) return;
      setLasso({ x0: lassoStart.current.x, y0: lassoStart.current.y, x1: p.x, y1: p.y });
      return;
    }
    if (resizing && resizeStart.current) {
      const p = eventToSvg(e.clientX, e.clientY);
      if (!p) return;
      const start = resizeStart.current;
      let nx = start.x, ny = start.y, nw = start.w, nh = start.h;
      const dx = p.x - start.px;
      const dy = p.y - start.py;

      if (resizing.corner === "se") { nw = Math.max(MIN_ROOM_W, snap(start.w + dx)); nh = Math.max(MIN_ROOM_H, snap(start.h + dy)); }
      else if (resizing.corner === "sw") { nx = snap(start.x + dx); nw = Math.max(MIN_ROOM_W, start.x + start.w - nx); nh = Math.max(MIN_ROOM_H, snap(start.h + dy)); }
      else if (resizing.corner === "ne") { ny = snap(start.y + dy); nw = Math.max(MIN_ROOM_W, snap(start.w + dx)); nh = Math.max(MIN_ROOM_H, start.y + start.h - ny); }
      else if (resizing.corner === "nw") { nx = snap(start.x + dx); ny = snap(start.y + dy); nw = Math.max(MIN_ROOM_W, start.x + start.w - nx); nh = Math.max(MIN_ROOM_H, start.y + start.h - ny); }

      setLocalSizes((prev) => ({ ...prev, [resizing.id]: { w: nw, h: nh, x: nx, y: ny } }));
      setHoverTip({ x: p.x, y: p.y, text: `${Math.round(nw)} × ${Math.round(nh)}` });
      return;
    }

    if (!dragId || !dragOffset.current || !dragStartPositions.current) return;
    const p = eventToSvg(e.clientX, e.clientY);
    if (!p) return;

    const targetX = snap(p.x - dragOffset.current.x);
    const targetY = snap(p.y - dragOffset.current.y);
    const anchor = dragStartPositions.current[dragId];
    if (!anchor) return;
    const dx = targetX - anchor.x;
    const dy = targetY - anchor.y;

    const next: Record<string, { x: number; y: number }> = {};
    for (const id of Object.keys(dragStartPositions.current)) {
      const s = dragStartPositions.current[id];
      next[id] = { x: s.x + dx, y: s.y + dy };
    }
    setLocalPositions(next);
    setHoverTip({ x: p.x, y: p.y, text: `${targetX}, ${targetY}` });
  }, [dragId, eventToSvg, snap, resizing, lasso]);

  const onPointerUp = useCallback(async () => {
    mapRef.current?.dragging?.enable();
    setHoverTip(null);

    if (lasso) {
      const x0 = Math.min(lasso.x0, lasso.x1);
      const y0 = Math.min(lasso.y0, lasso.y1);
      const x1 = Math.max(lasso.x0, lasso.x1);
      const y1 = Math.max(lasso.y0, lasso.y1);
      // Picked: any room whose centre lies inside the lasso.
      const picked = floorRooms.filter((r) => {
        const cx = (r.mapPositionX ?? 0) + (r.width  ?? 56) / 2;
        const cy = (r.mapPositionY ?? 0) + (r.height ?? 40) / 2;
        return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
      }).map((r) => r.id);
      // Lasso is additive (it's triggered by shift-drag).
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of picked) next.add(id);
        return next;
      });
      setLasso(null);
      lassoStart.current = null;
      return;
    }

    if (resizing) {
      const id = resizing.id;
      const sz = localSizes[id];
      setResizing(null);
      resizeStart.current = null;
      if (!sz) return;
      setSavingId(id);
      try {
        const patch: Partial<Room> = { width: Math.round(sz.w), height: Math.round(sz.h) };
        if (sz.x != null && sz.y != null) {
          patch.mapPositionX = Math.round(sz.x);
          patch.mapPositionY = Math.round(sz.y);
        }
        await updateRoom.mutateAsync({ id, patch });
        setLocalSizes((prev) => { const n = { ...prev }; delete n[id]; return n; });
      } finally {
        setSavingId(null);
      }
      return;
    }

    if (!dragId) return;
    const ids = Object.keys(localPositions);
    setDragId(null);
    dragOffset.current = null;
    dragStartPositions.current = null;
    if (ids.length === 0) return;
    // Save every moved room in parallel.
    try {
      await Promise.all(ids.map((id) => {
        const pos = localPositions[id];
        return updateRoom.mutateAsync({ id, patch: { mapPositionX: pos.x, mapPositionY: pos.y } });
      }));
      setLocalPositions({});
    } catch { /* error already toasted */ }
  }, [dragId, localPositions, updateRoom, resizing, localSizes, lasso, floorRooms]);

  useEffect(() => {
    if (!dragId && !resizing && !lasso) return;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [dragId, resizing, lasso, onPointerMove, onPointerUp]);

  const onResizePointerDown = useCallback((e: React.PointerEvent, room: Room, corner: Corner) => {
    e.stopPropagation();
    const p = eventToSvg(e.clientX, e.clientY);
    if (!p) return;
    pushHistory();
    resizeStart.current = {
      x: room.mapPositionX ?? 0, y: room.mapPositionY ?? 0,
      w: room.width ?? 56, h: room.height ?? 40,
      px: p.x, py: p.y,
    };
    setResizing({ id: room.id, corner });
    (e.target as Element).setPointerCapture?.(e.pointerId);
    mapRef.current?.dragging?.disable();
  }, [eventToSvg, pushHistory]);

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
      mapPositionX: snap(p.x - 28),
      mapPositionY: snap(p.y - 20),
      buildingId: buildings[0]?.id,
    });
  }, [mode, eventToSvg, rooms, floor, buildings, createRoom, snap]);

  /* ── Duplicate / delete / undo / nudge ──────────────────────────── */

  const duplicateSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const sources = rooms.filter((r) => selectedIds.has(r.id));
    const newIds: string[] = [];
    for (const src of sources) {
      const dup = await createRoom.mutateAsync({
        roomNumber: nextRoomNumber(rooms, src.floor),
        name: src.name,
        floor: src.floor,
        type: src.type,
        currentStatus: src.currentStatus,
        width: src.width,
        height: src.height,
        mapPositionX: (src.mapPositionX ?? 0) + 12,
        mapPositionY: (src.mapPositionY ?? 0) + 12,
        buildingId: src.buildingId,
      });
      if (dup?.id) newIds.push(dup.id);
    }
    if (newIds.length > 0) setSelectedIds(new Set(newIds));
  }, [selectedIds, rooms, createRoom]);

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(count === 1 ? "Delete this room? Can't be undone." : `Delete ${count} rooms? Can't be undone.`)) return;
    for (const id of Array.from(selectedIds)) deleteRoom.mutate(id);
  }, [selectedIds, deleteRoom]);

  const nudge = useCallback(async (dx: number, dy: number) => {
    if (selectedIds.size === 0) return;
    pushHistory();
    const updates = Array.from(selectedIds).map((id) => {
      const r = rooms.find((rm) => rm.id === id);
      if (!r) return null;
      return updateRoom.mutateAsync({
        id,
        patch: {
          mapPositionX: (r.mapPositionX ?? 0) + dx,
          mapPositionY: (r.mapPositionY ?? 0) + dy,
        },
      });
    });
    await Promise.all(updates.filter(Boolean));
  }, [selectedIds, rooms, updateRoom, pushHistory]);

  const undo = useCallback(async () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const entry = historyRef.current[historyIndexRef.current];
    forceHistoryTick((n) => n + 1);
    const ids = Object.keys(entry.positions).filter((id) => {
      const r = rooms.find((rm) => rm.id === id);
      if (!r) return false;
      const p = entry.positions[id];
      return (r.mapPositionX ?? 0) !== p.x || (r.mapPositionY ?? 0) !== p.y || (r.width ?? 56) !== p.w || (r.height ?? 40) !== p.h;
    });
    await Promise.all(ids.map((id) => updateRoom.mutateAsync({
      id,
      patch: {
        mapPositionX: entry.positions[id].x,
        mapPositionY: entry.positions[id].y,
        width: entry.positions[id].w,
        height: entry.positions[id].h,
      },
    })));
  }, [rooms, updateRoom]);

  const redo = useCallback(async () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const entry = historyRef.current[historyIndexRef.current];
    forceHistoryTick((n) => n + 1);
    await Promise.all(Object.keys(entry.positions).map((id) => updateRoom.mutateAsync({
      id,
      patch: {
        mapPositionX: entry.positions[id].x,
        mapPositionY: entry.positions[id].y,
        width: entry.positions[id].w,
        height: entry.positions[id].h,
      },
    })));
  }, [updateRoom]);

  /* ── Alignment / distribution ───────────────────────────────────── */

  const alignSelected = useCallback(async (dir: "left" | "right" | "top" | "bottom" | "centerX" | "centerY") => {
    if (selectedIds.size < 2) return;
    pushHistory();
    const items = rooms.filter((r) => selectedIds.has(r.id));
    let anchor: number;
    switch (dir) {
      case "left":    anchor = Math.min(...items.map((r) => r.mapPositionX ?? 0)); break;
      case "right":   anchor = Math.max(...items.map((r) => (r.mapPositionX ?? 0) + (r.width ?? 56))); break;
      case "top":     anchor = Math.min(...items.map((r) => r.mapPositionY ?? 0)); break;
      case "bottom":  anchor = Math.max(...items.map((r) => (r.mapPositionY ?? 0) + (r.height ?? 40))); break;
      case "centerX": {
        const left  = Math.min(...items.map((r) => r.mapPositionX ?? 0));
        const right = Math.max(...items.map((r) => (r.mapPositionX ?? 0) + (r.width ?? 56)));
        anchor = (left + right) / 2;
        break;
      }
      case "centerY": {
        const top    = Math.min(...items.map((r) => r.mapPositionY ?? 0));
        const bottom = Math.max(...items.map((r) => (r.mapPositionY ?? 0) + (r.height ?? 40)));
        anchor = (top + bottom) / 2;
        break;
      }
    }
    await Promise.all(items.map((r) => {
      const w = r.width ?? 56, h = r.height ?? 40;
      let nx = r.mapPositionX ?? 0;
      let ny = r.mapPositionY ?? 0;
      if (dir === "left")    nx = anchor;
      if (dir === "right")   nx = anchor - w;
      if (dir === "top")     ny = anchor;
      if (dir === "bottom")  ny = anchor - h;
      if (dir === "centerX") nx = Math.round(anchor - w / 2);
      if (dir === "centerY") ny = Math.round(anchor - h / 2);
      return updateRoom.mutateAsync({ id: r.id, patch: { mapPositionX: nx, mapPositionY: ny } });
    }));
    toast({ title: `Aligned ${items.length} rooms` });
  }, [selectedIds, rooms, updateRoom, pushHistory, toast]);

  const distributeSelected = useCallback(async (axis: "h" | "v") => {
    if (selectedIds.size < 3) return;
    pushHistory();
    const items = rooms.filter((r) => selectedIds.has(r.id));
    const sorted = [...items].sort((a, b) =>
      axis === "h"
        ? (a.mapPositionX ?? 0) - (b.mapPositionX ?? 0)
        : (a.mapPositionY ?? 0) - (b.mapPositionY ?? 0)
    );
    const first = sorted[0], last = sorted[sorted.length - 1];
    if (!first || !last) return;
    const start = axis === "h" ? (first.mapPositionX ?? 0) : (first.mapPositionY ?? 0);
    const end   = axis === "h" ? (last.mapPositionX  ?? 0) : (last.mapPositionY  ?? 0);
    const step = (end - start) / (sorted.length - 1);
    await Promise.all(sorted.map((r, i) => {
      const target = Math.round(start + i * step);
      const patch = axis === "h" ? { mapPositionX: target } : { mapPositionY: target };
      return updateRoom.mutateAsync({ id: r.id, patch });
    }));
    toast({ title: `Distributed ${sorted.length} rooms ${axis === "h" ? "horizontally" : "vertically"}` });
  }, [selectedIds, rooms, updateRoom, pushHistory, toast]);

  /* ── Clipboard ──────────────────────────────────────────────────── */

  const copySelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const items: ClipboardItem[] = rooms
      .filter((r) => selectedIds.has(r.id))
      .map((r) => ({
        roomNumber: r.roomNumber,
        name: r.name,
        floor: r.floor,
        type: r.type,
        width: r.width,
        height: r.height,
        mapPositionX: r.mapPositionX ?? 0,
        mapPositionY: r.mapPositionY ?? 0,
        buildingId: r.buildingId,
        virtualTourUrl: r.virtualTourUrl,
      }));
    clipboardRef.current = items;
    toast({ title: `Copied ${items.length} room${items.length === 1 ? "" : "s"}` });
  }, [selectedIds, rooms, toast]);

  const pasteClipboard = useCallback(async () => {
    const items = clipboardRef.current;
    if (items.length === 0) {
      toast({ title: "Clipboard is empty", variant: "destructive" });
      return;
    }
    const newIds: string[] = [];
    for (const src of items) {
      const created = await createRoom.mutateAsync({
        roomNumber: nextRoomNumber(rooms, floor),
        name: src.name,
        floor,                       // paste lands on the active floor
        type: src.type,
        currentStatus: "unknown",
        width: src.width,
        height: src.height,
        mapPositionX: src.mapPositionX + 12,
        mapPositionY: src.mapPositionY + 12,
        buildingId: src.buildingId,
      });
      if (created?.id) newIds.push(created.id);
    }
    if (newIds.length > 0) setSelectedIds(new Set(newIds));
  }, [rooms, floor, createRoom, toast]);

  /* ── Bulk patch (type / floor / etc.) ────────────────────────────── */

  const bulkPatch = useCallback(async (patch: Partial<Room>) => {
    if (selectedIds.size === 0) return;
    pushHistory();
    await Promise.all(Array.from(selectedIds).map((id) => updateRoom.mutateAsync({ id, patch })));
    toast({ title: `Updated ${selectedIds.size} room${selectedIds.size === 1 ? "" : "s"}` });
  }, [selectedIds, updateRoom, pushHistory, toast]);

  /* ── Keyboard shortcuts ─────────────────────────────────────────── */

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore typing into inputs / textareas.
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.shiftKey && e.key.toLowerCase() === "z") { e.preventDefault(); redo(); return; }
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); return; }
      if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); return; }
      if (mod && e.key.toLowerCase() === "c") { e.preventDefault(); copySelected(); return; }
      if (mod && e.key.toLowerCase() === "v") { e.preventDefault(); pasteClipboard(); return; }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedIds(new Set(floorRooms.map((r) => r.id)));
        return;
      }
      if (e.key === "Escape") { setSelectedIds(new Set()); setContextMenu(null); return; }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); return; }
      if (e.key.toLowerCase() === "v") { setMode("select"); return; }
      if (e.key.toLowerCase() === "a") { setMode("add"); setSelectedIds(new Set()); return; }
      if (e.key.toLowerCase() === "g") { setSnapToGrid((s) => !s); return; }

      const fmatch = e.key.match(/^[1-9]$/);
      if (fmatch && !mod) {
        const f = parseInt(fmatch[0], 10);
        if (f <= maxFloor) { setFloor(f); return; }
      }

      const step = e.shiftKey ? NUDGE_LARGE : NUDGE_SMALL;
      if (e.key === "ArrowLeft")  { e.preventDefault(); nudge(-step, 0); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); nudge( step, 0); return; }
      if (e.key === "ArrowUp")    { e.preventDefault(); nudge(0, -step); return; }
      if (e.key === "ArrowDown")  { e.preventDefault(); nudge(0,  step); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, duplicateSelected, deleteSelected, nudge, maxFloor, copySelected, pasteClipboard, floorRooms]);

  /* ── Auto-scroll sidebar to active ───────────────────────────────── */

  useEffect(() => {
    if (selectedIds.size !== 1 || !sidebarListRef.current) return;
    const id = Array.from(selectedIds)[0];
    const el = sidebarListRef.current.querySelector<HTMLElement>(`[data-room-id="${id}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIds]);

  /* ── Overlay body ────────────────────────────────────────────────── */

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
        <pattern id="builderGrid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
          <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                fill="none"
                stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(11,19,34,0.04)"}
                strokeWidth={0.4} />
        </pattern>
      </defs>

      {/* Optional snap-grid */}
      {snapToGrid && (
        <rect
          x={baseViewBox.x} y={baseViewBox.y}
          width={baseViewBox.w} height={baseViewBox.h}
          fill="url(#builderGrid)"
          className="pointer-events-none"
        />
      )}

      {/* Click target for add mode */}
      {mode === "add" && (
        <rect
          x={baseViewBox.x} y={baseViewBox.y}
          width={baseViewBox.w} height={baseViewBox.h}
          fill="rgba(37,99,235,0.04)"
          className="cursor-crosshair"
          onPointerDown={onCanvasClick}
        />
      )}

      {/* Lasso / deselect target in select mode — also drives shift-drag lasso. */}
      {mode === "select" && (
        <rect
          x={baseViewBox.x} y={baseViewBox.y}
          width={baseViewBox.w} height={baseViewBox.h}
          fill="transparent"
          onPointerDown={(e) => {
            const p = eventToSvg(e.clientX, e.clientY);
            if (!p) return;
            // Shift-drag → lasso. Plain click → clear selection (deselect).
            if (e.shiftKey) {
              lassoStart.current = { x: p.x, y: p.y };
              setLasso({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
              (e.target as Element).setPointerCapture?.(e.pointerId);
              mapRef.current?.dragging?.disable();
            } else {
              if (selectedIds.size > 0) setSelectedIds(new Set());
            }
          }}
        />
      )}

      {/* Live lasso rectangle */}
      {lasso && (
        <rect
          x={Math.min(lasso.x0, lasso.x1)}
          y={Math.min(lasso.y0, lasso.y1)}
          width={Math.abs(lasso.x1 - lasso.x0)}
          height={Math.abs(lasso.y1 - lasso.y0)}
          fill="rgba(37,99,235,0.10)"
          stroke="#2563eb"
          strokeWidth={1}
          strokeDasharray="3,3"
          className="pointer-events-none"
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

      {/* Ghost rooms from floor below */}
      {ghostRooms.map((room) => {
        const x = room.mapPositionX ?? 0;
        const y = room.mapPositionY ?? 0;
        const w = room.width ?? 56;
        const h = room.height ?? 40;
        return (
          <g key={`ghost-${room.id}`} className="pointer-events-none" opacity={0.18}>
            <rect x={x} y={y} width={w} height={h} rx={4} fill={getRoomFillColor(room.type, room.currentStatus)} />
            <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle"
                  fill="#94a3b8" fontSize={9} fontWeight={600}>
              {room.roomNumber}
            </text>
          </g>
        );
      })}

      {/* Active floor rooms */}
      {floorRooms.map((room) => {
        const localPos = localPositions[room.id];
        const localSz = localSizes[room.id];
        const x = (localSz?.x ?? localPos?.x ?? room.mapPositionX) ?? 0;
        const y = (localSz?.y ?? localPos?.y ?? room.mapPositionY) ?? 0;
        const w = localSz?.w ?? room.width ?? 56;
        const h = localSz?.h ?? room.height ?? 40;
        const fill = getRoomFillColor(room.type, room.currentStatus);
        const isSelected = selectedIds.has(room.id);
        const isDragging = dragId === room.id || (dragId != null && selectedIds.has(room.id));
        const isResizing = resizing?.id === room.id;
        const isSaving = savingId === room.id;
        const floorN = room.floor ?? 1;
        const pitch = safeNum(settings.osmPitchDeg, 0);
        const pitchScale = is3DMode ? 0.7 + (pitch / 45) * 0.7 : 0;
        const wallH = is3DMode ? Math.max(10, (floorN * 9 + 4) * pitchScale) : 0;
        const sideW = is3DMode ? Math.max(4, Math.min(w * 0.12, 9)) : 0;

        return (
          <g
            key={room.id}
            onPointerDown={(e) => onRoomPointerDown(e, room, e.shiftKey)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (!selectedIds.has(room.id)) setSelectedIds(new Set([room.id]));
              setContextMenu({ x: e.clientX, y: e.clientY, roomId: room.id });
            }}
            className={cn("group", mode === "select" && "cursor-grab", isDragging && "cursor-grabbing")}
            style={{ touchAction: "none" }}
            filter={isDragging || isResizing ? "url(#builderDragHalo)" : undefined}
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
            {/* Roof / 2D body */}
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
            {/* Resize handles when single-selected and not currently dragging */}
            {isSelected && selectedIds.size === 1 && !isDragging && (
              <>
                {([
                  { c: "nw" as Corner, cx: x,     cy: y     },
                  { c: "ne" as Corner, cx: x + w, cy: y     },
                  { c: "sw" as Corner, cx: x,     cy: y + h },
                  { c: "se" as Corner, cx: x + w, cy: y + h },
                ]).map(({ c, cx, cy }) => (
                  <circle
                    key={c}
                    cx={cx} cy={cy} r={3.5}
                    fill="white" stroke="#2563eb" strokeWidth={1.5}
                    style={{ cursor: c === "nw" || c === "se" ? "nwse-resize" : "nesw-resize" }}
                    onPointerDown={(e) => onResizePointerDown(e, room, c)}
                  />
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

      {/* Live coords / dimensions tooltip */}
      {hoverTip && (
        <g className="pointer-events-none">
          <rect
            x={hoverTip.x + 10}
            y={hoverTip.y - 22}
            width={Math.max(48, hoverTip.text.length * 6.5)}
            height={18}
            rx={4}
            fill="rgba(15,23,42,0.92)"
          />
          <text
            x={hoverTip.x + 14}
            y={hoverTip.y - 9}
            fill="#fff"
            fontSize={10}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontWeight={600}
          >
            {hoverTip.text}
          </text>
        </g>
      )}
    </>
  );

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <div className="h-full flex flex-col" tabIndex={0}>
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

        {/* Undo / redo */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
            className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mode */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          <button type="button" onClick={() => setMode("select")}
            className={cn("h-7 px-3 text-xs font-semibold rounded-lg gap-1.5 inline-flex items-center transition-colors",
              mode === "select"
                ? "bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900")}>
            <MousePointer2 className="h-3.5 w-3.5" />
            Select <kbd className="opacity-50 text-[9px] ml-0.5">V</kbd>
          </button>
          <button type="button" onClick={() => { setMode("add"); setSelectedIds(new Set()); }}
            className={cn("h-7 px-3 text-xs font-semibold rounded-lg gap-1.5 inline-flex items-center transition-colors",
              mode === "add"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900")}>
            <PlusCircle className="h-3.5 w-3.5" />
            Add <kbd className="opacity-60 text-[9px] ml-0.5">A</kbd>
          </button>
        </div>

        {/* Floor */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500 px-2">Floor</span>
          {Array.from({ length: maxFloor }, (_, i) => i + 1).map((f) => (
            <button key={f} type="button" onClick={() => setFloor(f)}
              className={cn("h-7 w-7 text-xs font-bold rounded-lg transition-all tabular-nums",
                floor === f
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700")}>
              {f}
            </button>
          ))}
        </div>

        {/* Snap to grid */}
        <button type="button" onClick={() => setSnapToGrid((s) => !s)} title="Snap to grid (G)"
          className={cn("h-9 px-3 rounded-xl text-xs font-bold gap-1.5 inline-flex items-center transition-colors",
            snapToGrid
              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-900"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200")}>
          <Grid3x3 className="h-3.5 w-3.5" />
          {GRID_SIZE}px
        </button>

        {/* Ghost floor below */}
        <button type="button" onClick={() => setShowGhost((s) => !s)} title="Show ghost of floor below"
          className={cn("h-9 px-3 rounded-xl text-xs font-bold gap-1.5 inline-flex items-center transition-colors",
            showGhost
              ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-1 ring-purple-200 dark:ring-purple-900"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200")}>
          {showGhost ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          Ghost
        </button>

        {/* 3D toggle */}
        <button type="button" onClick={() => update("osmPitchDeg", is3DMode ? 0 : 32)}
          className={cn("h-9 px-3 rounded-xl text-xs font-bold gap-1.5 inline-flex items-center transition-colors",
            is3DMode
              ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200")}>
          <Mountain className="h-3.5 w-3.5" />
          {is3DMode ? "3D" : "2D"}
        </button>

        {is3DMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800">
            <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <input type="range" min={0} max={45}
              value={safeNum(settings.osmPitchDeg, 0)}
              onChange={(e) => update("osmPitchDeg", Number(e.target.value))}
              className="w-24 accent-blue-600"
              aria-label="Pitch" />
            <span className="text-xs font-bold tabular-nums w-8 text-right text-blue-700 dark:text-blue-300">
              {Math.round(safeNum(settings.osmPitchDeg, 0))}°
            </span>
          </div>
        )}

        <button type="button" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts"
          className="h-9 w-9 rounded-xl inline-flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200">
          <Keyboard className="h-3.5 w-3.5" />
        </button>
        {!showLegend && (
          <button type="button" onClick={() => setShowLegend(true)} title="Show legend"
            className="h-9 px-3 rounded-xl inline-flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 text-xs font-bold">
            Legend
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex">
        {/* Sidebar */}
        <aside className={cn(
          "hidden md:flex flex-col w-64 lg:w-72 shrink-0 border-r overflow-hidden",
          darkMode ? "border-gray-800 bg-gray-900/40" : "border-gray-200 bg-gray-50/50",
        )}>
          <div className="shrink-0 p-3 border-b border-gray-200/70 dark:border-gray-800/70 space-y-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search rooms…"
                value={query} onChange={(e) => setQuery(e.target.value)}
                className={cn("w-full h-9 pl-9 pr-3 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500",
                  darkMode ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200")} />
            </div>

            {/* Type filter chips */}
            {availableTypes.length > 0 && (
              <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                <button type="button" onClick={() => setTypeFilter(null)}
                  className={cn("shrink-0 h-6 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors",
                    typeFilter == null
                      ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                      : "bg-white dark:bg-gray-900 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 ring-1 ring-gray-200 dark:ring-gray-800")}>
                  All
                </button>
                {availableTypes.map((t) => (
                  <button key={t} type="button" onClick={() => setTypeFilter(t === typeFilter ? null : t)}
                    className={cn("shrink-0 h-6 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors",
                      typeFilter === t
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-900 text-gray-500 hover:text-blue-600 ring-1 ring-gray-200 dark:ring-gray-800")}>
                    {t}
                  </button>
                ))}
              </div>
            )}

            <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">
              {sidebarRooms.length} {sidebarRooms.length === 1 ? "room" : "rooms"} · floor {floor}
              {selectedIds.size > 0 && <span className="text-blue-600 dark:text-blue-400 ml-2">· {selectedIds.size} selected</span>}
            </p>
          </div>

          <div ref={sidebarListRef} className="flex-1 overflow-y-auto py-1">
            {sidebarRooms.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-gray-500">
                No rooms here yet. Switch to <strong>Add room</strong> mode and tap the map.
              </p>
            ) : (
              sidebarRooms.map((r) => (
                <button
                  key={r.id}
                  data-room-id={r.id}
                  type="button"
                  onClick={(e) => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (e.shiftKey) {
                        if (next.has(r.id)) next.delete(r.id);
                        else next.add(r.id);
                      } else {
                        next.clear();
                        next.add(r.id);
                      }
                      return next;
                    });
                    // Pan map roughly toward the room — we project using a
                    // best-effort lerp from svgViewBox to map.getBounds().
                    const m = mapRef.current;
                    if (m && r.mapPositionX != null && r.mapPositionY != null) {
                      const tx = (r.mapPositionX + (r.width ?? 56) / 2 - baseViewBox.x) / baseViewBox.w;
                      const ty = (r.mapPositionY + (r.height ?? 40) / 2 - baseViewBox.y) / baseViewBox.h;
                      const b = m.getBounds();
                      const lat = b.getNorth() - ty * (b.getNorth() - b.getSouth());
                      const lng = b.getWest() + tx * (b.getEast() - b.getWest());
                      m.panTo([lat, lng], { animate: true });
                    }
                  }}
                  className={cn("w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 border-l-2",
                    selectedIds.has(r.id)
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-600"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 border-transparent")}>
                  <span className="font-mono font-bold text-xs w-12 shrink-0 tabular-nums">{r.roomNumber}</span>
                  <span className="flex-1 truncate text-xs">{r.name || r.type || "—"}</span>
                  {r.mapPositionX == null && <span className="text-[9px] text-amber-500 font-bold shrink-0">·</span>}
                  {savingId === r.id && <Loader2 className="h-3 w-3 animate-spin text-blue-500 shrink-0" />}
                </button>
              ))
            )}
          </div>

          {/* Sidebar footer — bulk actions when something's selected */}
          {selectedIds.size > 0 && (
            <div className="shrink-0 border-t border-gray-200/70 dark:border-gray-800/70 p-2 flex gap-1.5">
              <Button type="button" size="sm" variant="outline" onClick={duplicateSelected}
                disabled={createRoom.isPending}
                className="flex-1 h-8 text-xs gap-1.5">
                <Copy className="h-3 w-3" /> Duplicate
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={deleteSelected}
                className="flex-1 h-8 text-xs gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
            </div>
          )}
        </aside>

        {/* MAP */}
        <div className="flex-1 min-w-0 relative">
          <div className={cn(
            "absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-md border shadow-sm pointer-events-none",
            mode === "add"
              ? "bg-blue-600/95 text-white border-blue-700/50"
              : darkMode ? "bg-gray-900/85 text-gray-300 border-gray-700" : "bg-white/90 text-gray-700 border-gray-200",
          )}>
            {mode === "add"
              ? "Tap the map to place a new room"
              : selectedIds.size > 1
                ? `${selectedIds.size} rooms selected · drag to move all`
                : selectedRoom
                  ? `Drag to move · drag a corner to resize · ${selectedRoom.roomNumber}`
                  : "Click a room (Shift+click for multi) · arrows to nudge"}
          </div>

          {/* Alignment + distribute toolbar — pops up when 2+ rooms selected */}
          {selectedIds.size >= 2 && (
            <div className={cn(
              "absolute top-3 right-3 z-30 rounded-xl shadow-xl border backdrop-blur-md flex items-center gap-0.5 p-1 animate-in slide-in-from-top-2 fade-in duration-200",
              darkMode ? "bg-gray-900/95 border-gray-700" : "bg-white/95 border-gray-200",
            )}>
              <AlignBtn title="Align left"   onClick={() => alignSelected("left")}><AlignStartVertical className="h-3.5 w-3.5" /></AlignBtn>
              <AlignBtn title="Centre X"     onClick={() => alignSelected("centerX")}><AlignCenterVertical className="h-3.5 w-3.5" /></AlignBtn>
              <AlignBtn title="Align right"  onClick={() => alignSelected("right")}><AlignEndVertical className="h-3.5 w-3.5" /></AlignBtn>
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
              <AlignBtn title="Align top"    onClick={() => alignSelected("top")}><AlignStartHorizontal className="h-3.5 w-3.5" /></AlignBtn>
              <AlignBtn title="Centre Y"     onClick={() => alignSelected("centerY")}><AlignCenterHorizontal className="h-3.5 w-3.5" /></AlignBtn>
              <AlignBtn title="Align bottom" onClick={() => alignSelected("bottom")}><AlignEndHorizontal className="h-3.5 w-3.5" /></AlignBtn>
              {selectedIds.size >= 3 && (
                <>
                  <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
                  <AlignBtn title="Distribute horizontally" onClick={() => distributeSelected("h")}><AlignHorizontalSpaceAround className="h-3.5 w-3.5" /></AlignBtn>
                  <AlignBtn title="Distribute vertically"   onClick={() => distributeSelected("v")}><AlignVerticalSpaceAround className="h-3.5 w-3.5" /></AlignBtn>
                </>
              )}
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
              <div className="px-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {selectedIds.size}
              </div>
            </div>
          )}

          {/* Bulk type / floor edit — pops up below the alignment bar */}
          {selectedIds.size >= 2 && (
            <div className={cn(
              "absolute top-16 right-3 z-30 rounded-xl shadow-xl border backdrop-blur-md flex items-center gap-1.5 p-2 animate-in slide-in-from-top-2 fade-in duration-200",
              darkMode ? "bg-gray-900/95 border-gray-700" : "bg-white/95 border-gray-200",
            )}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">Bulk</span>
              <select
                aria-label="Set type for all selected"
                defaultValue=""
                onChange={(e) => { if (e.target.value) { bulkPatch({ type: e.target.value }); e.target.value = ""; } }}
                className="h-7 text-xs rounded-md border border-input bg-background px-2"
              >
                <option value="">Set type…</option>
                {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                aria-label="Set floor for all selected"
                defaultValue=""
                onChange={(e) => { if (e.target.value) { bulkPatch({ floor: Number(e.target.value) }); e.target.value = ""; } }}
                className="h-7 text-xs rounded-md border border-input bg-background px-2"
              >
                <option value="">Set floor…</option>
                {Array.from({ length: maxFloor }, (_, i) => i + 1).map((f) => <option key={f} value={f}>Floor {f}</option>)}
              </select>
            </div>
          )}

          <OsmBasemap
            svgViewBox={{ x: baseViewBox.x, y: baseViewBox.y, w: baseViewBox.w, h: baseViewBox.h }}
            enableOverlay
            onOverlayReady={setOverlayEl}
            onReady={(m) => { mapRef.current = m; }}
            className="absolute inset-0"
          />
          {overlayEl && createPortal(overlayBody, overlayEl)}

          {/* Status legend (bottom-left) */}
          {showLegend && (
            <div className={cn(
              "absolute bottom-3 left-3 z-20 rounded-xl shadow-lg border backdrop-blur-md text-xs p-2.5 max-w-[200px]",
              darkMode ? "bg-gray-900/85 border-gray-700 text-gray-200" : "bg-white/90 border-gray-200 text-gray-700",
            )}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-[10px] uppercase tracking-wider text-gray-400">Legend</span>
                <button type="button" onClick={() => setShowLegend(false)}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <LegendDot color={getRoomFillColor("classroom", "available")} label="Available" />
                <LegendDot color={getRoomFillColor("classroom", "occupied")} label="Occupied" />
                <LegendDot color={getRoomFillColor("hallway",   undefined)}  label="Hallway" />
                <LegendDot color={getRoomFillColor("lab",       undefined)}  label="Lab" />
                <LegendDot color={getRoomFillColor("office",    undefined)}  label="Office" />
                <LegendDot color={getRoomFillColor("wc",        undefined)}  label="WC" />
              </div>
            </div>
          )}

          {floorRooms.length === 0 && mode !== "add" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={cn("text-center px-5 py-4 rounded-2xl backdrop-blur-md max-w-sm shadow-lg pointer-events-auto",
                darkMode ? "bg-gray-900/85 text-gray-300" : "bg-white/90 text-gray-700")}>
                <Building2 className="h-7 w-7 mx-auto mb-2 text-blue-500/70" />
                <p className="text-sm font-semibold">No rooms on floor {floor}</p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  Switch to <strong>Add room</strong> mode and tap the map.
                </p>
                <Button size="sm" onClick={() => setMode("add")}
                  className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5">
                  <PlusCircle className="h-3.5 w-3.5" /> Start adding
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Properties panel */}
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
            onDuplicate={duplicateSelected}
            onClose={() => setSelectedIds(new Set())}
            darkMode={darkMode}
          />
        )}
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <div
            className={cn(
              "fixed z-50 rounded-xl shadow-2xl border min-w-[180px] py-1 text-sm animate-in fade-in duration-100",
              darkMode ? "bg-gray-900 border-gray-700 text-gray-200" : "bg-white border-gray-200 text-gray-900",
            )}
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 280) }}
          >
            <CtxItem onClick={() => { duplicateSelected(); setContextMenu(null); }}>
              <Copy className="h-3.5 w-3.5" /> Duplicate
              <kbd className="ml-auto text-[10px] text-gray-400">⌘D</kbd>
            </CtxItem>
            <CtxItem onClick={() => { copySelected(); setContextMenu(null); }}>
              <Copy className="h-3.5 w-3.5" /> Copy
              <kbd className="ml-auto text-[10px] text-gray-400">⌘C</kbd>
            </CtxItem>
            <CtxItem onClick={() => { pasteClipboard(); setContextMenu(null); }} disabled={clipboardRef.current.length === 0}>
              <Clipboard className="h-3.5 w-3.5" /> Paste
              <kbd className="ml-auto text-[10px] text-gray-400">⌘V</kbd>
            </CtxItem>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Set type</div>
            {ROOM_TYPES.slice(0, 7).map((t) => (
              <CtxItem key={t} onClick={() => { bulkPatch({ type: t }); setContextMenu(null); }}>
                <span className="w-3.5" /> {t}
              </CtxItem>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            <CtxItem onClick={() => { deleteSelected(); setContextMenu(null); }} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
              <Trash2 className="h-3.5 w-3.5" /> Delete
              <kbd className="ml-auto text-[10px] text-gray-400">Del</kbd>
            </CtxItem>
          </div>
        </>
      )}

      {/* Shortcuts dialog */}
      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

/* ── Small helpers used in the toolbar / overlay ───────────────────── */

function AlignBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
    >
      {children}
    </button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: color }} />
      <span className="truncate">{label}</span>
    </div>
  );
}

function CtxItem({ onClick, disabled, className, children }: { onClick: () => void; disabled?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full px-3 py-1.5 text-left text-xs flex items-center gap-2.5 transition-colors",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ── Properties panel ──────────────────────────────────────────────── */

function RoomPropertiesPanel({
  room, buildings, saving, onSave, onDelete, onDuplicate, onClose, darkMode,
}: {
  room: Room;
  buildings: Array<{ id: string; name: string }>;
  saving: boolean;
  onSave: (patch: Partial<Room>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
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
      <div className="shrink-0 px-4 py-3 border-b border-gray-200/70 dark:border-gray-800/70 flex items-center gap-2">
        <span className="font-mono text-xs font-bold tabular-nums text-blue-700 dark:text-blue-300">
          {room.roomNumber}
        </span>
        <span className="flex-1 truncate text-xs text-gray-500">
          {room.name || room.type || "no name"}
        </span>
        <button type="button" onClick={onDuplicate} title="Duplicate (⌘D)"
          className="h-6 w-6 flex items-center justify-center rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40">
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        <FieldPair label="Room number"
          input={<Input value={draft.roomNumber} onChange={(e) => setDraft({ ...draft, roomNumber: e.target.value })} className="h-9 rounded-lg text-sm font-mono" />} />
        <FieldPair label="Display name"
          input={<Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Chemistry Lab" className="h-9 rounded-lg text-sm" />} />
        <FieldPair label="Building"
          input={
            <select value={draft.buildingId ?? ""} onChange={(e) => setDraft({ ...draft, buildingId: e.target.value || undefined })}
              className="w-full h-9 rounded-lg text-sm border border-input bg-background px-3">
              <option value="">— none —</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          } />
        <div className="grid grid-cols-2 gap-2.5">
          <FieldPair label="Floor"
            input={<Input type="number" min={1} max={9} value={draft.floor}
              onChange={(e) => setDraft({ ...draft, floor: Number(e.target.value) || 1 })}
              className="h-9 rounded-lg text-sm tabular-nums" />} />
          <FieldPair label="Type"
            input={
              <select value={draft.type ?? "classroom"} onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                className="w-full h-9 rounded-lg text-sm border border-input bg-background px-2">
                {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            } />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <FieldPair label="Width"
            input={<Input type="number" min={10} max={500} value={draft.width ?? 56}
              onChange={(e) => setDraft({ ...draft, width: Number(e.target.value) || 56 })}
              className="h-9 rounded-lg text-sm tabular-nums" />} />
          <FieldPair label="Height"
            input={<Input type="number" min={10} max={500} value={draft.height ?? 40}
              onChange={(e) => setDraft({ ...draft, height: Number(e.target.value) || 40 })}
              className="h-9 rounded-lg text-sm tabular-nums" />} />
        </div>

        <div className="pt-3 border-t border-gray-200/70 dark:border-gray-800/70 space-y-1.5">
          <Label className="text-[10px] font-bold tracking-[0.22em] uppercase text-gray-400 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              3D
            </span>
            Matterport scan
          </Label>
          <input type="url" inputMode="url" placeholder="https://my.matterport.com/show/?m=…"
            value={draft.virtualTourUrl ?? ""}
            onChange={(e) => setDraft({ ...draft, virtualTourUrl: e.target.value })}
            className="w-full h-9 rounded-lg text-xs font-mono border border-input bg-background px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          {(draft.virtualTourUrl ?? "").trim() && (
            <a href={(draft.virtualTourUrl ?? "").trim()} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Open in new tab →
            </a>
          )}
          <p className="text-[11px] text-gray-400 leading-snug">
            Paste a tour URL or bare model ID. Students see a "3D walkthrough" button on this room.
          </p>
        </div>

        <div className="pt-3 border-t border-gray-200/70 dark:border-gray-800/70">
          <Label className="text-[10px] font-bold tracking-[0.22em] uppercase text-gray-400">
            Map position
          </Label>
          <p className="font-mono text-xs tabular-nums text-gray-600 dark:text-gray-400 mt-1">
            x: {Math.round(draft.mapPositionX ?? 0)} · y: {Math.round(draft.mapPositionY ?? 0)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Drag the room on the map or use arrow keys to nudge.
          </p>
        </div>
      </div>

      <div className="shrink-0 p-3 border-t border-gray-200/70 dark:border-gray-800/70 flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDelete}
          className="h-9 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1.5">
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
        <div className="flex-1" />
        <Button type="button" size="sm" disabled={!dirty || saving}
          onClick={() => onSave({
            roomNumber: draft.roomNumber, name: draft.name, floor: draft.floor,
            type: draft.type, width: draft.width, height: draft.height,
            buildingId: draft.buildingId,
            virtualTourUrl: (draft.virtualTourUrl ?? "").trim() || undefined,
          })}
          className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5">
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

/* ── Shortcuts dialog ──────────────────────────────────────────────── */

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const rows: Array<[string, string]> = [
    ["V", "Select mode"],
    ["A", "Add-room mode"],
    ["1–9", "Switch floor"],
    ["G", "Toggle snap-to-grid"],
    ["Esc", "Clear selection / close menu"],
    ["Del / Backspace", "Delete selected"],
    ["⌘/Ctrl + D", "Duplicate selected"],
    ["⌘/Ctrl + C", "Copy selected"],
    ["⌘/Ctrl + V", "Paste"],
    ["⌘/Ctrl + A", "Select all on floor"],
    ["⌘/Ctrl + Z", "Undo"],
    ["⌘/Ctrl + Shift + Z", "Redo"],
    ["← ↑ → ↓", "Nudge 1 px"],
    ["Shift + ← ↑ → ↓", "Nudge 10 px"],
    ["Shift + click", "Multi-select"],
    ["Shift + drag (empty)", "Lasso select"],
    ["Right-click room", "Context menu"],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Keyboard shortcuts</h3>
          <button type="button" onClick={onClose} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-1.5">
          {rows.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between text-sm py-1">
              <span className="text-gray-700 dark:text-gray-300">{label}</span>
              <kbd className="px-2 py-1 text-[11px] font-mono rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-gray-800">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Picks the next free number on a floor — uses the highest existing
 *  number + 1, or starts at floor*100. */
function nextRoomNumber(rooms: Room[], floor: number): string {
  const onFloor = rooms.filter((r) => (r.floor ?? 1) === floor);
  const nums = onFloor
    .map((r) => parseInt(r.roomNumber || "", 10))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return `${floor}01`;
  return String(Math.max(...nums) + 1);
}
