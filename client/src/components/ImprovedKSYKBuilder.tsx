import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, MousePointer, X, Undo, Redo, Square,
  Save, ZoomIn, ZoomOut, RotateCcw, Grid3x3, Layers, Hand, Minus,
  Copy as CopyIcon, Search, AlertCircle,
  Download, Upload, CheckCircle2, Sparkles,
  Building2, Ruler, Tag, MapPin, ChevronDown, Monitor,
  AlignLeft, AlignCenter, AlignRight,
  AlignVerticalJustifyCenter, AlignStartHorizontal, AlignEndHorizontal,
  MoveHorizontal, MoveVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoomFillColor } from "@/lib/campusSpace";
import { KSYK_WING_PRESETS } from "@/lib/ksykWings";
import KSYKLogo from "@/components/KSYKLogo";
import {
  KSYK_BUILDING_LETTERS,
  KSYK_BUILDING_OUTLINES,
  outlineToPath,
} from "@/lib/ksykCampusOutlines";

interface Point { x: number; y: number; }

type Tool = "outline" | "wall" | "room" | "select" | "pan";
type PropertyTab = "identity" | "position" | "style";

// ── Editorial section label used everywhere ────────────────────────
const KICKER = "text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground";

// Room type dropdown options
const ROOM_TYPES: [string, string][] = [
  ["classroom", "Classroom"],
  ["classroom_science", "Science"],
  ["classroom_language", "Language"],
  ["classroom_art", "Art"],
  ["classroom_music", "Music"],
  ["classroom_computer", "Computer Lab"],
  ["lab", "Laboratory"],
  ["office", "Office"],
  ["library", "Library"],
  ["gymnasium", "Gymnasium"],
  ["cafeteria", "Cafeteria"],
  ["lobby", "Lobby"],
  ["toilet", "Toilet"],
  ["stairway", "Stairway"],
  ["hallway", "Hallway"],
  ["storage", "Storage"],
  ["auditorium", "Auditorium"],
];

// KSYK-friendly palette chips for style tab
const COLOR_CHIPS = [
  "#2563EB", "#7C3AED", "#DC2626", "#EC4899",
  "#F59E0B", "#059669", "#0891B2", "#475569",
];

export default function ImprovedKSYKBuilder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const svgRef = useRef<SVGSVGElement>(null);

  // ─────────────── State (identical to previous — do NOT change) ──────────
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [isDrawing, setIsDrawing] = useState(false);
  const [campusOutline, setCampusOutline] = useState<Point[]>([]);
  const [walls, setWalls] = useState<Point[][]>([]);
  const [currentWall, setCurrentWall] = useState<Point[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [gridSize] = useState(50);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [showReferenceOutlines, setShowReferenceOutlines] = useState(true);
  const [activeWingLetter, setActiveWingLetter] = useState<string>("K");
  const [history, setHistory] = useState<Point[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isPanningCanvas, setIsPanningCanvas] = useState(false);
  const panDragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [propertyTab, setPropertyTab] = useState<PropertyTab>("identity");

  // Building collapse state — remembers which building groups are open.
  const [collapsedBuildings, setCollapsedBuildings] = useState<Set<string>>(new Set());

  // Drag state for moving rooms / resizing rooms
  type DragState =
    | { kind: "move"; ids: string[]; startMouse: Point; startBoxes: Record<string, { x: number; y: number }> }
    | { kind: "resize"; id: string; corner: "tl" | "tr" | "bl" | "br"; startMouse: Point; startBox: { x: number; y: number; w: number; h: number } }
    | null;
  const [drag, setDrag] = useState<DragState>(null);

  // Room edits history for undo/redo
  const [roomHistory, setRoomHistory] = useState<any[][]>([]);
  const [roomHistoryIndex, setRoomHistoryIndex] = useState(-1);
  // Rubber-band drag selection
  type RubberBand = { x0: number; y0: number; x1: number; y1: number } | null;
  const [rubberBand, setRubberBand] = useState<RubberBand>(null);
  const rubberBandStartRef = useRef<{ x: number; y: number } | null>(null);
  const pushRoomHistory = useCallback((next: any[]) => {
    setRoomHistory((h) => {
      const trimmed = h.slice(0, roomHistoryIndex + 1);
      trimmed.push(next.map((r) => ({ ...r })));
      return trimmed.slice(-50);
    });
    setRoomHistoryIndex((i) => Math.min(i + 1, 49));
    setUnsavedChanges(true);
  }, [roomHistoryIndex]);

  const [roomData, setRoomData] = useState({
    roomNumber: "",
    name: "",
    floor: 1,
    capacity: 30,
    type: "classroom",
    x: 0,
    y: 0,
    width: 100,
    height: 80,
  });

  const [dataLoaded, setDataLoaded] = useState(false);
  const [builderFloor, setBuilderFloor] = useState(1);
  const [roomSearch, setRoomSearch] = useState("");
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const { data: existingRooms = [], isFetched: roomsFetched } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const res = await fetch("/api/rooms", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Snap point to grid
  const snapToGrid = (point: Point): Point => {
    if (!snapEnabled) return point;
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    };
  };

  // Get SVG world coordinates from any mouse event using the CTM.
  const getSVGPoint = (e: { clientX: number; clientY: number }): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const world = pt.matrixTransform(ctm.inverse());
    return snapToGrid({ x: world.x, y: world.y });
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === "pan" || e.button === 1) {
      setIsPanningCanvas(true);
      panDragStart.current = { x: e.clientX, y: e.clientY, panX, panY };
      return;
    }
    const point = getSVGPoint(e);

    if (activeTool === "outline") {
      setIsDrawing(true);
      setCampusOutline([...campusOutline, point]);
    } else if (activeTool === "wall") {
      setIsDrawing(true);
      setCurrentWall([...currentWall, point]);
    } else if (activeTool === "room") {
      // Click-to-place: if room number filled, immediately add room at cursor
      if (roomData.roomNumber && validateRoomNumber(roomData.roomNumber)) {
        const building = extractBuilding(roomData.roomNumber);
        const newRoom = {
          ...roomData,
          id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          x: point.x,
          y: point.y,
          building,
          mapPositionX: point.x,
          mapPositionY: point.y,
          _isLocalNew: true,
        };
        const next = [...rooms, newRoom];
        setRooms(next);
        pushRoomHistory(next);
        setRoomData((prev) => ({
          ...prev,
          x: point.x + (prev.width + 10),
          y: point.y,
          roomNumber: autoIncrementRoomNumber(prev.roomNumber),
        }));
      } else {
        setRoomData({ ...roomData, x: point.x, y: point.y });
      }
    } else if (activeTool === "select") {
      if (!(e.target as Element).closest("[data-room]")) {
        setSelectedRoom(null);
        setSelectedRoomIds(new Set());
        rubberBandStartRef.current = point;
        setRubberBand({ x0: point.x, y0: point.y, x1: point.x, y1: point.y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanningCanvas) {
      const dx = (e.clientX - panDragStart.current.x) * (1 / zoom);
      const dy = (e.clientY - panDragStart.current.y) * (1 / zoom);
      setPanX(panDragStart.current.panX - dx);
      setPanY(panDragStart.current.panY - dy);
      return;
    }

    // Update rubber-band
    if (rubberBandStartRef.current) {
      const pt = getSVGPoint(e);
      setRubberBand({ x0: rubberBandStartRef.current.x, y0: rubberBandStartRef.current.y, x1: pt.x, y1: pt.y });
    }

    if (!drag) return;
    const mouse = getSVGPoint(e);

    if (drag.kind === "move") {
      const dx = mouse.x - drag.startMouse.x;
      const dy = mouse.y - drag.startMouse.y;
      setRooms((rs) =>
        rs.map((r) => {
          const start = drag.startBoxes[r.id];
          if (!start) return r;
          const nx = snapToGrid({ x: start.x + dx, y: start.y + dy });
          return { ...r, mapPositionX: nx.x, mapPositionY: nx.y, x: nx.x, y: nx.y };
        })
      );
    } else if (drag.kind === "resize") {
      const id = drag.id;
      const { startBox, corner } = drag;
      const mx = mouse.x;
      const my = mouse.y;
      let nx = startBox.x;
      let ny = startBox.y;
      let nw = startBox.w;
      let nh = startBox.h;
      if (corner === "br") {
        nw = Math.max(40, mx - startBox.x);
        nh = Math.max(40, my - startBox.y);
      } else if (corner === "tr") {
        nw = Math.max(40, mx - startBox.x);
        ny = Math.min(startBox.y + startBox.h - 40, my);
        nh = Math.max(40, startBox.y + startBox.h - ny);
      } else if (corner === "bl") {
        nx = Math.min(startBox.x + startBox.w - 40, mx);
        nw = Math.max(40, startBox.x + startBox.w - nx);
        nh = Math.max(40, my - startBox.y);
      } else if (corner === "tl") {
        nx = Math.min(startBox.x + startBox.w - 40, mx);
        ny = Math.min(startBox.y + startBox.h - 40, my);
        nw = Math.max(40, startBox.x + startBox.w - nx);
        nh = Math.max(40, startBox.y + startBox.h - ny);
      }
      const snapped = snapToGrid({ x: nx, y: ny });
      setRooms((rs) =>
        rs.map((r) =>
          r.id === id
            ? { ...r, mapPositionX: snapped.x, mapPositionY: snapped.y, x: snapped.x, y: snapped.y, width: Math.round(nw / gridSize) * gridSize || nw, height: Math.round(nh / gridSize) * gridSize || nh }
            : r
        )
      );
    }
  };

  const handleMouseUp = () => {
    setIsPanningCanvas(false);
    if (drag) {
      pushRoomHistory(rooms);
      setDrag(null);
    }
    // Finish rubber-band selection
    if (rubberBand && rubberBandStartRef.current) {
      const minX = Math.min(rubberBand.x0, rubberBand.x1);
      const maxX = Math.max(rubberBand.x0, rubberBand.x1);
      const minY = Math.min(rubberBand.y0, rubberBand.y1);
      const maxY = Math.max(rubberBand.y0, rubberBand.y1);
      if (maxX - minX > 4 || maxY - minY > 4) {
        const hit = floorRooms.filter(
          (r) =>
            r.mapPositionX < maxX &&
            r.mapPositionX + r.width > minX &&
            r.mapPositionY < maxY &&
            r.mapPositionY + r.height > minY
        );
        setSelectedRoomIds(new Set(hit.map((r) => r.id)));
        if (hit.length === 1) setSelectedRoom(hit[0]);
      }
      setRubberBand(null);
      rubberBandStartRef.current = null;
    }
  };

  // Begin a move/resize drag from a room sub-element
  const beginMoveRoom = (e: React.MouseEvent, roomId: string) => {
    if (activeTool !== "select" && activeTool !== "pan") return;
    if (activeTool === "pan") return;
    e.stopPropagation();
    const ids = e.shiftKey
      ? Array.from(new Set([...selectedRoomIds, roomId]))
      : selectedRoomIds.has(roomId)
      ? Array.from(selectedRoomIds)
      : [roomId];

    setSelectedRoomIds(new Set(ids));
    const r = rooms.find((x) => x.id === roomId);
    setSelectedRoom(r || null);
    if (r) {
      setRoomData({
        roomNumber: r.roomNumber,
        name: r.name || "",
        floor: r.floor ?? 1,
        capacity: r.capacity ?? 30,
        type: r.type || "classroom",
        x: r.mapPositionX,
        y: r.mapPositionY,
        width: r.width,
        height: r.height,
      });
      setBuilderFloor(r.floor ?? 1);
    }

    const startBoxes: Record<string, { x: number; y: number }> = {};
    for (const id of ids) {
      const rr = rooms.find((x) => x.id === id);
      if (rr) startBoxes[id] = { x: rr.mapPositionX, y: rr.mapPositionY };
    }
    setDrag({ kind: "move", ids, startMouse: getSVGPoint(e as React.MouseEvent<SVGSVGElement>), startBoxes });
  };

  const beginResizeRoom = (e: React.MouseEvent, roomId: string, corner: "tl" | "tr" | "bl" | "br") => {
    e.stopPropagation();
    const r = rooms.find((x) => x.id === roomId);
    if (!r) return;
    setDrag({
      kind: "resize",
      id: roomId,
      corner,
      startMouse: getSVGPoint(e as React.MouseEvent<SVGSVGElement>),
      startBox: { x: r.mapPositionX, y: r.mapPositionY, w: r.width, h: r.height },
    });
  };

  const duplicateSelected = () => {
    if (selectedRoomIds.size === 0) return;
    const additions: any[] = [];
    rooms.forEach((r) => {
      if (selectedRoomIds.has(r.id)) {
        additions.push({
          ...r,
          id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          mapPositionX: r.mapPositionX + gridSize,
          mapPositionY: r.mapPositionY + gridSize,
          x: r.mapPositionX + gridSize,
          y: r.mapPositionY + gridSize,
          _isLocalNew: true,
        });
      }
    });
    if (additions.length === 0) return;
    const next = [...rooms, ...additions];
    setRooms(next);
    pushRoomHistory(next);
    setSelectedRoomIds(new Set(additions.map((a) => a.id)));
  };

  const deleteSelected = () => {
    if (selectedRoomIds.size === 0) return;
    const next = rooms.filter((r) => !selectedRoomIds.has(r.id));
    setRooms(next);
    pushRoomHistory(next);
    setSelectedRoomIds(new Set());
    setSelectedRoom(null);
  };

  // Zoom to fit all/selected rooms on current floor
  const zoomToFit = useCallback((mode: "selection" | "all" = "all") => {
    const inView = rooms.filter((r) => (r.floor ?? 1) === builderFloor);
    const target = mode === "selection" ? inView.filter((r) => selectedRoomIds.has(r.id)) : inView;
    if (target.length === 0) return;
    const pad = 80;
    const minX = Math.min(...target.map((r) => r.mapPositionX)) - pad;
    const minY = Math.min(...target.map((r) => r.mapPositionY)) - pad;
    const maxX = Math.max(...target.map((r) => r.mapPositionX + r.width)) + pad;
    const maxY = Math.max(...target.map((r) => r.mapPositionY + r.height)) + pad;
    const bw = maxX - minX;
    const bh = maxY - minY;
    const W = 1600, H = 900;
    const newZoom = Math.min(Math.max(0.25, Math.min(W / bw, H / bh)), 4);
    const newVbW = W / newZoom;
    const newVbH = H / newZoom;
    setZoom(newZoom);
    setPanX((minX + maxX) / 2 - newVbW / 2);
    setPanY((minY + maxY) / 2 - newVbH / 2);
  }, [rooms, builderFloor, selectedRoomIds]);

  // Keyboard shortcuts in builder
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedRoomIds.size > 0) {
        e.preventDefault();
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        if (roomHistoryIndex > 0) {
          const next = roomHistoryIndex - 1;
          setRoomHistoryIndex(next);
          setRooms(roomHistory[next] ? roomHistory[next].map((r) => ({ ...r })) : []);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        if (roomHistoryIndex < roomHistory.length - 1) {
          const next = roomHistoryIndex + 1;
          setRoomHistoryIndex(next);
          setRooms(roomHistory[next] ? roomHistory[next].map((r) => ({ ...r })) : []);
        }
      } else if (e.key === "Escape") {
        setSelectedRoom(null);
        setSelectedRoomIds(new Set());
      } else if (e.key === "v") setActiveTool("select");
      else if (e.key === "h") setActiveTool("pan");
      else if (e.key === "r") setActiveTool("room");
      else if ((e.key === "f" || e.key === "F") && !e.ctrlKey) {
        e.preventDefault();
        zoomToFit(selectedRoomIds.size > 0 ? "selection" : "all");
      } else if (e.key.startsWith("Arrow") && selectedRoomIds.size > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        setRooms((rs) =>
          rs.map((r) =>
            selectedRoomIds.has(r.id)
              ? { ...r, mapPositionX: r.mapPositionX + dx, mapPositionY: r.mapPositionY + dy, x: r.mapPositionX + dx, y: r.mapPositionY + dy }
              : r
          )
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomIds, rooms, roomHistory, roomHistoryIndex, zoomToFit]);

  const finishOutline = () => {
    if (campusOutline.length >= 3) pushHistory(campusOutline);
    if (campusOutline.length > 2) {
      setCampusOutline([...campusOutline, campusOutline[0]]);
    }
    setIsDrawing(false);
  };

  const finishWall = () => {
    if (currentWall.length > 1) {
      setWalls([...walls, currentWall]);
      setCurrentWall([]);
    }
    setIsDrawing(false);
  };

  const cancelDrawing = () => {
    if (activeTool === "outline") {
      setCampusOutline([]);
    } else if (activeTool === "wall") {
      setCurrentWall([]);
    }
    setIsDrawing(false);
  };

  const autoIncrementRoomNumber = (num: string): string => {
    const m = num.match(/^([A-Z]+)(\d+)$/);
    if (!m) return num;
    return `${m[1]}${parseInt(m[2]) + 1}`;
  };

  const extractBuilding = (roomNumber: string): string => {
    const match = roomNumber.match(/^([A-Z])/i);
    return match ? match[1].toUpperCase() : "";
  };

  useEffect(() => {
    if (dataLoaded || existingRooms.length === 0) return;
    const loaded = existingRooms.map((r: {
      id: string;
      roomNumber: string;
      name?: string;
      nameEn?: string;
      floor?: number;
      capacity?: number;
      type?: string;
      mapPositionX?: number;
      mapPositionY?: number;
      width?: number;
      height?: number;
    }) => ({
      id: r.id,
      roomNumber: r.roomNumber,
      name: r.name || r.nameEn || "",
      floor: r.floor || 1,
      capacity: r.capacity || 30,
      type: r.type || "classroom",
      x: r.mapPositionX ?? 100,
      y: r.mapPositionY ?? 100,
      width: r.width || 100,
      height: r.height || 80,
      building: extractBuilding(r.roomNumber),
      mapPositionX: r.mapPositionX ?? 100,
      mapPositionY: r.mapPositionY ?? 100,
    }));
    setRooms(loaded);
    setDataLoaded(true);
    setRoomHistory([loaded.map((r: any) => ({ ...r }))]);
    setRoomHistoryIndex(0);
  }, [existingRooms, dataLoaded]);

  const validateRoomNumber = (roomNumber: string): boolean => {
    const validBuildings = ["A", "M", "U", "K", "L", "R"];
    const match = roomNumber.match(/^([A-Z])(\d+)$/i);
    if (!match) return false;
    const building = match[1].toUpperCase();
    const number = parseInt(match[2]);
    if (!validBuildings.includes(building)) return false;
    if (building === "M" && (number < 1 || number > 2)) return false;
    if (building !== "M" && (number < 1 || number > 999)) return false;
    return true;
  };

  // Add room
  const addRoom = () => {
    if (!roomData.roomNumber) {
      toast({ title: "Room number required", description: "Enter a room number, e.g. A32, M1, U205.", variant: "destructive" });
      return;
    }
    if (!validateRoomNumber(roomData.roomNumber)) {
      toast({
        title: "Invalid room number",
        description: "Use letter + digits, no dashes. A/U/K/L/R accept any number; M only allows M1–M2.",
        variant: "destructive",
      });
      return;
    }
    const building = extractBuilding(roomData.roomNumber);
    if (!building) {
      toast({ title: "Missing building letter", description: "Room number must start with A, M, U, K, L, or R.", variant: "destructive" });
      return;
    }
    const centerX = panX + (1600 / zoom) / 2;
    const centerY = panY + (900 / zoom) / 2;
    const placeX = roomData.x || Math.round(centerX / gridSize) * gridSize;
    const placeY = roomData.y || Math.round(centerY / gridSize) * gridSize;
    const newRoom = {
      ...roomData,
      x: placeX,
      y: placeY,
      id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      building,
      mapPositionX: placeX,
      mapPositionY: placeY,
      _isLocalNew: true,
    };
    const next = [...rooms, newRoom];
    setRooms(next);
    pushRoomHistory(next);
    setRoomData({
      roomNumber: "",
      name: "",
      floor: roomData.floor,
      capacity: 30,
      type: "classroom",
      x: placeX + 120,
      y: placeY,
      width: 100,
      height: 80,
    });
  };

  const deleteRoom = (id: string) => {
    const next = rooms.filter((r) => r.id !== id);
    setRooms(next);
    pushRoomHistory(next);
    setSelectedRoom(null);
    setSelectedRoomIds((s) => {
      const ns = new Set(s);
      ns.delete(id);
      return ns;
    });
  };

  // Apply panel edits to the currently selected room (live edit)
  useEffect(() => {
    if (!selectedRoom) return;
    setRooms((rs) =>
      rs.map((r) =>
        r.id === selectedRoom.id
          ? {
              ...r,
              roomNumber: roomData.roomNumber || r.roomNumber,
              name: roomData.name,
              floor: roomData.floor,
              capacity: roomData.capacity,
              type: roomData.type,
              width: roomData.width,
              height: roomData.height,
            }
          : r
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomData.name, roomData.floor, roomData.capacity, roomData.type, roomData.width, roomData.height]);

  // Group rooms by building
  const groupedRooms = useMemo(
    () =>
      rooms.reduce((acc, room) => {
        const building = room.building;
        if (!acc[building]) acc[building] = [];
        acc[building].push(room);
        return acc;
      }, {} as Record<string, any[]>),
    [rooms]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const existingBuildingsRes = await fetch("/api/buildings", { credentials: "include" });
      const existingBuildings = existingBuildingsRes.ok ? await existingBuildingsRes.json() : [];
      const existingIds = new Set<string>(existingRooms.map((r: any) => r.id));
      const buildingPromises = (Object.entries(groupedRooms) as [string, any[]][]).map(async ([buildingLetter, buildingRooms]) => {
        const minX = Math.min(...buildingRooms.map((r) => r.mapPositionX));
        const minY = Math.min(...buildingRooms.map((r) => r.mapPositionY));
        const maxX = Math.max(...buildingRooms.map((r) => r.mapPositionX + r.width));
        const maxY = Math.max(...buildingRooms.map((r) => r.mapPositionY + r.height));

        const existing = existingBuildings.find(
          (b: { name?: string }) => b.name?.toUpperCase() === buildingLetter.toUpperCase()
        );

        let building = existing;
        if (!building) {
          const buildingResponse = await fetch("/api/buildings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: buildingLetter,
              nameEn: `${buildingLetter} Building`,
              nameFi: `${buildingLetter}-rakennus`,
              floors: Math.max(...buildingRooms.map((r) => r.floor)),
              colorCode: getColorForBuilding(buildingLetter),
              mapPositionX: minX,
              mapPositionY: minY,
              description: JSON.stringify({
                customShape: [
                  { x: minX, y: minY },
                  { x: maxX, y: minY },
                  { x: maxX, y: maxY },
                  { x: minX, y: maxY },
                ],
              }),
            }),
          });
          if (!buildingResponse.ok) throw new Error("Failed to create building");
          building = await buildingResponse.json();
        }

        const roomPromises = buildingRooms.map((room) => {
          const payload = {
            buildingId: building.id,
            roomNumber: room.roomNumber,
            name: room.name,
            nameEn: room.name,
            floor: room.floor,
            capacity: room.capacity,
            type: room.type,
            mapPositionX: room.mapPositionX,
            mapPositionY: room.mapPositionY,
            width: room.width,
            height: room.height,
          };
          if (existingIds.has(room.id)) {
            return fetch(`/api/rooms/${encodeURIComponent(room.id)}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(payload),
            });
          }
          return fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });
        });
        await Promise.all(roomPromises);
      });
      await Promise.all(buildingPromises);
      // Delete server rooms the user removed locally
      const localIds = new Set(rooms.map((r) => r.id));
      const removedIds = [...existingIds].filter((id) => !localIds.has(id));
      await Promise.all(
        removedIds.map((id) =>
          fetch(`/api/rooms/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setDataLoaded(false);
      setUnsavedChanges(false);
      toast({ title: "Published", description: "Map data has been updated." });
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast({ title: "Publish failed", description: "Could not save. Please try again.", variant: "destructive" });
    },
  });

  const getColorForBuilding = (letter: string): string => {
    return KSYK_WING_PRESETS.find((w) => w.letter === letter)?.color || "#6B7280";
  };

  const pushHistory = useCallback((outline: Point[]) => {
    setHistory((h) => {
      const trimmed = h.slice(0, historyIndex + 1);
      trimmed.push(outline.map((p) => ({ ...p })));
      return trimmed.slice(-40);
    });
    setHistoryIndex((i) => Math.min(i + 1, 39));
  }, [historyIndex]);

  const undo = () => {
    if (roomHistoryIndex > 0) {
      const next = roomHistoryIndex - 1;
      setRoomHistoryIndex(next);
      setRooms(roomHistory[next] ? roomHistory[next].map((r) => ({ ...r })) : []);
      return;
    }
    if (historyIndex <= 0) return;
    const next = historyIndex - 1;
    setHistoryIndex(next);
    setCampusOutline(history[next] ? [...history[next]] : []);
  };

  const redo = () => {
    if (roomHistoryIndex < roomHistory.length - 1) {
      const next = roomHistoryIndex + 1;
      setRoomHistoryIndex(next);
      setRooms(roomHistory[next] ? roomHistory[next].map((r) => ({ ...r })) : []);
      return;
    }
    if (historyIndex >= history.length - 1) return;
    const next = historyIndex + 1;
    setHistoryIndex(next);
    setCampusOutline(history[next] ? [...history[next]] : []);
  };

  const canUndo = roomHistoryIndex > 0 || historyIndex > 0;
  const canRedo = roomHistoryIndex < roomHistory.length - 1 || historyIndex < history.length - 1;

  const loadWingOutline = (letter: string) => {
    const preset = KSYK_BUILDING_OUTLINES[letter];
    if (!preset) return;
    setActiveWingLetter(letter);
    const next = [...preset.shape];
    setCampusOutline(next);
    pushHistory(next);
    setActiveTool("outline");
    setIsDrawing(false);
  };

  const exportJson = () => {
    const payload = {
      meta: { app: "KSYK Maps Builder", exportedAt: new Date().toISOString(), version: 1 },
      campusOutline,
      walls,
      rooms: rooms.map((r) => ({ ...r, _isLocalNew: undefined })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ksyk-campus-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data.rooms)) {
        const next = data.rooms.map((r: any) => ({ ...r, _isLocalNew: true }));
        setRooms(next);
        pushRoomHistory(next);
      }
      if (Array.isArray(data.campusOutline)) setCampusOutline(data.campusOutline);
      if (Array.isArray(data.walls)) setWalls(data.walls);
      toast({ title: "Imported", description: `Loaded ${data.rooms?.length || 0} rooms from file.` });
    } catch (e) {
      console.error(e);
      toast({ title: "Import failed", description: "Could not parse file — make sure it's a valid KSYK JSON export.", variant: "destructive" });
    }
  };

  type AlignDir = "left" | "right" | "top" | "bottom" | "centerX" | "centerY" | "distX" | "distY";
  const alignSelected = (dir: AlignDir) => {
    if (selectedRoomIds.size < 2) return;
    const sel = rooms.filter((r) => selectedRoomIds.has(r.id));
    let next = [...rooms];
    if (dir === "left") {
      const minX = Math.min(...sel.map((r) => r.mapPositionX));
      next = rooms.map((r) =>
        selectedRoomIds.has(r.id) ? { ...r, mapPositionX: minX, x: minX } : r
      );
    } else if (dir === "right") {
      const maxR = Math.max(...sel.map((r) => r.mapPositionX + r.width));
      next = rooms.map((r) =>
        selectedRoomIds.has(r.id) ? { ...r, mapPositionX: maxR - r.width, x: maxR - r.width } : r
      );
    } else if (dir === "top") {
      const minY = Math.min(...sel.map((r) => r.mapPositionY));
      next = rooms.map((r) =>
        selectedRoomIds.has(r.id) ? { ...r, mapPositionY: minY, y: minY } : r
      );
    } else if (dir === "bottom") {
      const maxB = Math.max(...sel.map((r) => r.mapPositionY + r.height));
      next = rooms.map((r) =>
        selectedRoomIds.has(r.id) ? { ...r, mapPositionY: maxB - r.height, y: maxB - r.height } : r
      );
    } else if (dir === "centerX") {
      const cx = sel.reduce((s, r) => s + r.mapPositionX + r.width / 2, 0) / sel.length;
      next = rooms.map((r) =>
        selectedRoomIds.has(r.id)
          ? { ...r, mapPositionX: cx - r.width / 2, x: cx - r.width / 2 }
          : r
      );
    } else if (dir === "centerY") {
      const cy = sel.reduce((s, r) => s + r.mapPositionY + r.height / 2, 0) / sel.length;
      next = rooms.map((r) =>
        selectedRoomIds.has(r.id)
          ? { ...r, mapPositionY: cy - r.height / 2, y: cy - r.height / 2 }
          : r
      );
    } else if (dir === "distX" && sel.length >= 3) {
      const sorted = [...sel].sort((a, b) => a.mapPositionX - b.mapPositionX);
      const minX = sorted[0].mapPositionX;
      const maxX = sorted[sorted.length - 1].mapPositionX;
      const step = (maxX - minX) / (sorted.length - 1);
      const map: Record<string, number> = {};
      sorted.forEach((r, i) => (map[r.id] = minX + i * step));
      next = rooms.map((r) => (map[r.id] !== undefined ? { ...r, mapPositionX: map[r.id], x: map[r.id] } : r));
    } else if (dir === "distY" && sel.length >= 3) {
      const sorted = [...sel].sort((a, b) => a.mapPositionY - b.mapPositionY);
      const minY = sorted[0].mapPositionY;
      const maxY = sorted[sorted.length - 1].mapPositionY;
      const step = (maxY - minY) / (sorted.length - 1);
      const map: Record<string, number> = {};
      sorted.forEach((r, i) => (map[r.id] = minY + i * step));
      next = rooms.map((r) => (map[r.id] !== undefined ? { ...r, mapPositionY: map[r.id], y: map[r.id] } : r));
    }
    setRooms(next);
    pushRoomHistory(next);
  };

  const CAMPUS_W = 1600;
  const CAMPUS_H = 900;
  const vbW = CAMPUS_W / zoom;
  const vbH = CAMPUS_H / zoom;
  const floorRooms = rooms.filter((r) => (r.floor ?? 1) === builderFloor);
  const maxBuilderFloor = Math.max(1, ...rooms.map((r) => r.floor ?? 1), 3);

  const buildingSearchHits = (bLetter: string, bRooms: any[]) => {
    if (!roomSearch.trim()) return bRooms;
    const q = roomSearch.toLowerCase();
    if (bLetter.toLowerCase().includes(q)) return bRooms;
    return bRooms.filter(
      (r) =>
        r.roomNumber?.toLowerCase().includes(q) ||
        r.name?.toLowerCase().includes(q)
    );
  };

  const totalVisibleRooms = (Object.entries(groupedRooms) as [string, any[]][]).reduce(
    (t, [b, list]) => t + buildingSearchHits(b, list).length,
    0
  );

  // ── Tools grouped visually per spec ───────────────────────────────
  const TOOL_GROUPS: {
    title: string;
    items: { id: Tool | "snap" | "undo" | "redo" | "clear-all"; icon: React.ReactNode; label: string; shortcut?: string; danger?: boolean }[];
  }[] = [
    {
      title: "Draw",
      items: [
        { id: "room" as Tool, icon: <Plus className="h-[18px] w-[18px]" strokeWidth={2} />, label: "Place room", shortcut: "R" },
        { id: "wall" as Tool, icon: <Square className="h-[18px] w-[18px]" strokeWidth={2} />, label: "Draw wall", shortcut: "W" },
        { id: "outline" as Tool, icon: <Layers className="h-[18px] w-[18px]" strokeWidth={2} />, label: "Wing outline", shortcut: "O" },
      ],
    },
    {
      title: "Edit",
      items: [
        { id: "select" as Tool, icon: <MousePointer className="h-[18px] w-[18px]" strokeWidth={2} />, label: "Select", shortcut: "V" },
        { id: "pan" as Tool, icon: <Hand className="h-[18px] w-[18px]" strokeWidth={2} />, label: "Pan", shortcut: "H" },
        { id: "snap", icon: <Grid3x3 className="h-[18px] w-[18px]" strokeWidth={2} />, label: "Snap to grid" },
      ],
    },
    {
      title: "History",
      items: [
        { id: "undo", icon: <Undo className="h-[18px] w-[18px]" strokeWidth={2} />, label: "Undo", shortcut: "Ctrl+Z" },
        { id: "redo", icon: <Redo className="h-[18px] w-[18px]" strokeWidth={2} />, label: "Redo", shortcut: "Ctrl+Y" },
      ],
    },
  ];

  // Empty state: show after the initial fetch resolves and no rooms exist.
  const isEmpty = roomsFetched && rooms.length === 0;

  // Sub-header of a property tab: the tab strip
  const TAB_ICONS: Record<PropertyTab, React.ReactNode> = {
    identity: <Tag className="h-3 w-3" strokeWidth={2.25} />,
    position: <MapPin className="h-3 w-3" strokeWidth={2.25} />,
    style: <Ruler className="h-3 w-3" strokeWidth={2.25} />,
  };

  return (
    <div className="h-screen w-full flex flex-col bg-muted/40 text-foreground font-sans">
      {/* ── Best-on-desktop hint (< lg) ────────────────────────────── */}
      <div className="lg:hidden fixed inset-0 z-50 flex items-center justify-center px-6 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/40">
        <div className="max-w-sm w-full p-6 text-center space-y-4 bg-card border border-border shadow-sm rounded-2xl">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center">
            <Monitor className="h-7 w-7" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-foreground">
              Best on desktop
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Campus Builder needs precise drawing and pinch-zoom — please open KSYK Maps on a laptop or larger screen.
            </p>
          </div>
          <div className={cn(KICKER, "pt-2")}>KSYK Maps · Builder</div>
        </div>
      </div>

      {/* ─────────────── Sticky top header (h-14) ─────────────── */}
      <header className="sticky top-0 z-40 h-14 shrink-0 flex items-center px-4 gap-3 bg-card border-b border-border shadow-sm">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <KSYKLogo size="sm" />
          <div className="leading-tight hidden sm:block">
            <p className="text-[14px] font-bold tracking-[-0.01em] text-foreground">
              Campus Builder
            </p>
            <p className={cn(KICKER, "leading-none")}>KSYK Maps</p>
          </div>
        </div>

        <div className="mx-1 h-6 w-px bg-border hidden md:block" />

        {/* Save-state pill */}
        <div className="hidden md:inline-flex items-center gap-2 h-8 px-3 rounded-full bg-muted/60 border border-border">
          <span className="relative flex h-2 w-2" aria-hidden>
            {unsavedChanges && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70 animate-ping" />
            )}
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                unsavedChanges
                  ? "bg-amber-500"
                  : saveMutation.isSuccess
                  ? "bg-emerald-500"
                  : "bg-muted-foreground/40"
              )}
            />
          </span>
          <span className="text-[11px] font-semibold text-foreground">
            {unsavedChanges
              ? "Unsaved changes"
              : saveMutation.isSuccess
              ? "All saved"
              : "Ready"}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Wing template */}
          <Select value={activeWingLetter} onValueChange={loadWingOutline}>
            <SelectTrigger className="h-9 w-40 text-xs rounded-xl bg-card border-border hidden xl:flex active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-3.5 w-3.5 text-[#2563eb] shrink-0" strokeWidth={2} />
                <SelectValue placeholder="Wing template" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {KSYK_BUILDING_LETTERS.map((letter) => (
                <SelectItem key={letter} value={letter}>
                  {KSYK_BUILDING_OUTLINES[letter].nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 rounded-xl text-xs text-foreground active:scale-[0.98] transition-transform hidden md:inline-flex"
            onClick={exportJson}
            title="Export JSON"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            Export
          </Button>
          <label className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs text-foreground hover:bg-muted cursor-pointer transition-all active:scale-[0.98]">
            <Upload className="h-3.5 w-3.5" strokeWidth={2} />
            Import
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
                e.target.value = "";
              }}
            />
          </label>

          <div className="mx-1 h-6 w-px bg-border hidden md:block" />

          {/* Publish */}
          <Button
            size="sm"
            className={cn(
              "h-9 gap-1.5 px-4 rounded-xl font-semibold text-white transition-all active:scale-[0.98]",
              unsavedChanges
                ? "bg-[#2563eb] hover:bg-[#1e4fd8] shadow-sm"
                : "bg-[#2563eb]/60 hover:bg-[#2563eb]/80"
            )}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Publishing…
              </>
            ) : saveMutation.isSuccess && !unsavedChanges ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                Published
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" strokeWidth={2.25} />
                Publish
              </>
            )}
          </Button>
        </div>
      </header>

      {/* ─────────────── Body ─────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ── Sticky left sidebar (256px) ── */}
        <aside className="w-[256px] shrink-0 flex flex-col overflow-hidden bg-card border-r border-border">
          {/* Toolbar */}
          <div className="shrink-0 p-3 border-b border-border">
            <p className={cn(KICKER, "px-1 mb-2")}>Tools</p>
            <div className="flex flex-col gap-3">
              {TOOL_GROUPS.map((group) => (
                <div key={group.title}>
                  <div className="flex items-center gap-1.5">
                    {group.items.map((item) => {
                      const isActiveTool = (item.id === "select" || item.id === "pan" || item.id === "room" || item.id === "wall" || item.id === "outline") && activeTool === item.id;
                      const isSnapOn = item.id === "snap" && snapEnabled;
                      const isDisabled =
                        (item.id === "undo" && !canUndo) ||
                        (item.id === "redo" && !canRedo);
                      const onClick = () => {
                        if (item.id === "snap") setSnapEnabled((s) => !s);
                        else if (item.id === "undo") undo();
                        else if (item.id === "redo") redo();
                        else setActiveTool(item.id as Tool);
                      };
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={onClick}
                          disabled={isDisabled}
                          title={item.shortcut ? `${item.label} — ${item.shortcut}` : item.label}
                          className={cn(
                            "group relative w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-[0.94] disabled:opacity-30 disabled:cursor-not-allowed",
                            isActiveTool || isSnapOn
                              ? "bg-[#2563eb] text-white shadow-sm"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {item.icon}
                          {/* Fly-out label */}
                          <span
                            className="pointer-events-none absolute left-full ml-3 whitespace-nowrap px-2 py-1 rounded-md bg-foreground text-background text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-50"
                          >
                            {item.label}
                            {item.shortcut && (
                              <span className="ml-1.5 opacity-60 font-mono">{item.shortcut}</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className={cn(KICKER, "mt-1.5 px-1 text-[9px] opacity-60")}>{group.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Directory header + search */}
          <div className="shrink-0 px-3 pt-3 pb-2 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <p className={KICKER}>Directory</p>
              <span className="text-[10px] font-mono tabular-nums font-semibold text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                {rooms.length}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" strokeWidth={2} />
              <input
                type="search"
                placeholder="Search rooms & buildings…"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-3 text-sm rounded-xl bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb] focus:bg-card transition-all"
              />
            </div>
          </div>

          {/* Buildings + Rooms list (internally scrollable) */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
            {(Object.entries(groupedRooms) as [string, any[]][]).length === 0 ? (
              <div className="mt-6 text-center px-4 py-8">
                <div className="mx-auto w-10 h-10 rounded-2xl bg-muted flex items-center justify-center mb-2.5">
                  <Building2 className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                </div>
                <p className="text-[12px] font-semibold text-foreground">Nothing here yet</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Add your first building on the canvas.
                </p>
              </div>
            ) : (
              (Object.entries(groupedRooms) as [string, any[]][])
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([bLetter, bRooms]) => {
                  const visible = buildingSearchHits(bLetter, bRooms);
                  if (visible.length === 0 && roomSearch.trim()) return null;
                  const collapsed = collapsedBuildings.has(bLetter);
                  return (
                    <div key={bLetter} className="rounded-xl border border-border bg-card overflow-hidden">
                      {/* Building header */}
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedBuildings((s) => {
                            const ns = new Set(s);
                            ns.has(bLetter) ? ns.delete(bLetter) : ns.add(bLetter);
                            return ns;
                          })
                        }
                        className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-muted/50 transition-colors group active:scale-[0.99]"
                      >
                        <span
                          className="w-3 h-3 rounded-md ring-1 ring-black/10 shrink-0"
                          style={{ background: getColorForBuilding(bLetter) }}
                        />
                        <span className="text-[13px] font-bold text-foreground">
                          {bLetter}
                          <span className="text-muted-foreground font-normal ml-1 text-[11px]">wing</span>
                        </span>
                        <span className="ml-auto text-[10px] font-mono tabular-nums font-semibold text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                          {visible.length}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 text-muted-foreground transition-transform",
                            collapsed && "-rotate-90"
                          )}
                          strokeWidth={2}
                        />
                      </button>

                      {!collapsed && (
                        <div className="border-t border-border p-1 space-y-0.5">
                          {visible.map((room) => {
                            const isSelected = selectedRoomIds.has(room.id);
                            return (
                              <div
                                key={room.id}
                                className={cn(
                                  "group flex items-center gap-2 px-2 min-h-11 rounded-lg cursor-pointer transition-all active:scale-[0.99]",
                                  isSelected
                                    ? "bg-[#2563eb]/10 text-[#2563eb] ring-1 ring-[#2563eb]/30"
                                    : "text-foreground hover:bg-muted/60"
                                )}
                                onClick={() => {
                                  setSelectedRoom(room);
                                  setSelectedRoomIds(new Set([room.id]));
                                  setRoomData({
                                    roomNumber: room.roomNumber,
                                    name: room.name || "",
                                    floor: room.floor ?? 1,
                                    capacity: room.capacity ?? 30,
                                    type: room.type || "classroom",
                                    x: room.mapPositionX,
                                    y: room.mapPositionY,
                                    width: room.width,
                                    height: room.height,
                                  });
                                  setBuilderFloor(room.floor ?? 1);
                                }}
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ background: getRoomFillColor(room.type, undefined) }}
                                />
                                <span className="font-mono font-semibold text-[12px] leading-tight shrink-0">
                                  {room.roomNumber}
                                </span>
                                <span className="text-[11px] text-muted-foreground truncate flex-1">
                                  {room.name || (
                                    <span className="italic capitalize opacity-70">
                                      {room.type?.replace(/_/g, " ")}
                                    </span>
                                  )}
                                </span>
                                <span className="text-[9px] font-mono font-semibold text-muted-foreground bg-muted px-1 py-0.5 rounded shrink-0">
                                  F{room.floor}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteRoom(room.id);
                                  }}
                                  className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all opacity-0 group-hover:opacity-100 active:scale-[0.94] shrink-0"
                                  title="Delete room"
                                >
                                  <Trash2 className="h-3 w-3" strokeWidth={2} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
            {roomSearch && totalVisibleRooms === 0 && rooms.length > 0 && (
              <div className="text-center py-8 px-3">
                <p className="text-[12px] font-semibold text-foreground">No matches</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Nothing matches "{roomSearch}"
                </p>
              </div>
            )}
          </div>

          {/* Sticky footer — quick actions */}
          <div className="shrink-0 p-3 border-t border-border bg-muted/30 space-y-2">
            <Button
              onClick={() => {
                setActiveTool("room");
                setSelectedRoom(null);
                setSelectedRoomIds(new Set());
                setPropertyTab("identity");
              }}
              className="w-full h-10 rounded-xl bg-[#2563eb] hover:bg-[#1e4fd8] text-white font-semibold text-xs gap-1.5 active:scale-[0.98] transition-all"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
              Add room
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-xl text-[11px] gap-1 active:scale-[0.98] transition-all border-border font-semibold"
                onClick={() => {
                  setActiveTool("outline");
                  setPropertyTab("identity");
                }}
                title="Draw a new building outline"
              >
                <Building2 className="h-3 w-3" strokeWidth={2} />
                Building
              </Button>
              <Button
                variant="outline"
                className="h-9 rounded-xl text-[11px] gap-1 active:scale-[0.98] transition-all border-border font-semibold"
                onClick={() => setActiveTool("wall")}
                title="Draw a wall"
              >
                <Square className="h-3 w-3" strokeWidth={2} />
                Wall
              </Button>
            </div>
          </div>
        </aside>

        {/* ─────────────── Canvas + right panel container ─────────── */}
        <div className="relative flex-1 flex overflow-hidden min-w-0">
          {/* ── Canvas ── */}
          <div className="relative flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_center,#eef2f7_0%,#d5dbe5_100%)] dark:bg-[radial-gradient(ellipse_at_center,#0f172a_0%,#020617_100%)]">
            {/* Empty state — centered card floats OVER the empty canvas */}
            {isEmpty && (
              <div className="absolute inset-0 z-20 flex items-center justify-center px-6 pointer-events-none">
                <div className="max-w-md w-full text-center bg-card border border-border shadow-sm rounded-2xl p-8 pointer-events-auto">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-[#2563eb]/10 border border-[#2563eb]/20 flex items-center justify-center mb-4">
                    <Building2 className="h-6 w-6 text-[#2563eb]" strokeWidth={2} />
                  </div>
                  <p className={KICKER}>Get started</p>
                  <h2 className="text-[22px] font-bold tracking-[-0.02em] text-foreground mt-1">
                    Your campus is empty
                  </h2>
                  <p className="text-[13px] text-muted-foreground mt-2 leading-snug">
                    Drop the first building onto the canvas to start mapping KSYK. You can rename, resize, and reshape it after placing.
                  </p>
                  <Button
                    onClick={() => {
                      setActiveTool("room");
                      setSelectedRoom(null);
                      setSelectedRoomIds(new Set());
                      setPropertyTab("identity");
                      setRoomData((rd) => ({ ...rd, x: 800, y: 450 }));
                    }}
                    className="mt-5 h-11 rounded-xl bg-[#2563eb] hover:bg-[#1e4fd8] text-white font-semibold gap-1.5 active:scale-[0.98] transition-all px-6"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.25} />
                    Add first building
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-4 font-mono">
                    Press R to place · V to select · H to pan
                  </p>
                </div>
              </div>
            )}

            {/* View overlay — top-left */}
            <div className="absolute top-4 left-4 z-10 flex gap-1 p-1 bg-card border border-border shadow-sm rounded-2xl">
              {[
                {
                  onClick: () => setShowGrid(!showGrid),
                  active: showGrid,
                  title: "Grid",
                  icon: <Grid3x3 className="h-4 w-4" strokeWidth={2} />,
                },
                {
                  onClick: () => setShowReferenceOutlines(!showReferenceOutlines),
                  active: showReferenceOutlines,
                  title: "References",
                  icon: <Layers className="h-4 w-4" strokeWidth={2} />,
                },
              ].map((b, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={b.onClick}
                  title={b.title}
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center transition-all active:scale-[0.94]",
                    b.active
                      ? "bg-[#2563eb] text-white shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {b.icon}
                </button>
              ))}
              <div className="w-px my-1 bg-border" />
              <button
                type="button"
                onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
                title="Zoom in"
                className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-[0.94]"
              >
                <ZoomIn className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
                title="Zoom out"
                className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-[0.94]"
              >
                <ZoomOut className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => zoomToFit(selectedRoomIds.size > 0 ? "selection" : "all")}
                title="Zoom to fit (F)"
                className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-[0.94]"
              >
                <MoveHorizontal className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPanX(0);
                  setPanY(0);
                }}
                title="Reset view"
                className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-[0.94]"
              >
                <RotateCcw className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            {/* Floor selector — floating overlay bottom-right */}
            <div className="absolute bottom-14 right-4 z-10 flex flex-col overflow-hidden bg-card border border-border shadow-sm rounded-2xl">
              <div className={cn(KICKER, "text-center py-1 px-3 border-b border-border bg-muted/40")}>
                Floor
              </div>
              <button
                type="button"
                onClick={() => setBuilderFloor((f) => Math.min(f + 1, maxBuilderFloor))}
                disabled={builderFloor >= maxBuilderFloor}
                className="w-11 h-9 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors active:scale-[0.94]"
                title="Floor up"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
              </button>
              <div className="w-11 h-11 flex items-center justify-center font-bold text-[17px] bg-[#2563eb] text-white tabular-nums">
                {builderFloor}
              </div>
              <button
                type="button"
                onClick={() => setBuilderFloor((f) => Math.max(f - 1, 0))}
                disabled={builderFloor <= 0}
                className="w-11 h-9 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors active:scale-[0.94]"
                title="Floor down"
              >
                <Minus className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            {/* Alignment toolbar (2+ selected) */}
            {selectedRoomIds.size >= 2 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 p-1 bg-card border border-border shadow-sm rounded-2xl">
                <span className="px-3 h-9 flex items-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#2563eb]">
                  {selectedRoomIds.size} selected
                </span>
                <div className="w-px h-5 mx-1 bg-border" />
                {[
                  { dir: "left" as const, icon: <AlignLeft className="h-4 w-4" strokeWidth={2} />, title: "Align left" },
                  { dir: "centerX" as const, icon: <AlignCenter className="h-4 w-4" strokeWidth={2} />, title: "Center X" },
                  { dir: "right" as const, icon: <AlignRight className="h-4 w-4" strokeWidth={2} />, title: "Align right" },
                  { dir: "top" as const, icon: <AlignStartHorizontal className="h-4 w-4" strokeWidth={2} />, title: "Align top" },
                  { dir: "centerY" as const, icon: <AlignVerticalJustifyCenter className="h-4 w-4" strokeWidth={2} />, title: "Center Y" },
                  { dir: "bottom" as const, icon: <AlignEndHorizontal className="h-4 w-4" strokeWidth={2} />, title: "Align bottom" },
                  { dir: "distX" as const, icon: <MoveHorizontal className="h-4 w-4" strokeWidth={2} />, title: "Distribute X" },
                  { dir: "distY" as const, icon: <MoveVertical className="h-4 w-4" strokeWidth={2} />, title: "Distribute Y" },
                ].map(({ dir, icon, title }) => (
                  <button
                    key={dir}
                    type="button"
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-[#2563eb]/10 hover:text-[#2563eb] transition-all active:scale-[0.94]"
                    onClick={() => alignSelected(dir)}
                    title={title}
                  >
                    {icon}
                  </button>
                ))}
                <div className="w-px h-5 mx-1 bg-border" />
                <button
                  type="button"
                  className="h-9 px-3 rounded-xl flex items-center gap-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all active:scale-[0.94]"
                  onClick={deleteSelected}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                  Delete
                </button>
              </div>
            )}

            <svg
              ref={svgRef}
              viewBox={`${panX} ${panY} ${vbW} ${vbH}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={(e) => {
                e.preventDefault();
                const svg = svgRef.current;
                if (!svg) return;
                const pt = svg.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const ctm = svg.getScreenCTM();
                if (!ctm) return;
                const world = pt.matrixTransform(ctm.inverse());
                const factor = e.deltaY > 0 ? 1.12 : 0.9;
                const newZoom = Math.min(4, Math.max(0.25, zoom * factor));
                const W = 1600,
                  H = 900;
                const oldVbW = W / zoom,
                  oldVbH = H / zoom;
                const newVbW = W / newZoom,
                  newVbH = H / newZoom;
                const fx = (world.x - panX) / oldVbW;
                const fy = (world.y - panY) / oldVbH;
                setZoom(newZoom);
                setPanX(world.x - fx * newVbW);
                setPanY(world.y - fy * newVbH);
              }}
              className={cn(
                "w-full h-full touch-none",
                activeTool === "pan" ? "cursor-grab" : "cursor-crosshair"
              )}
            >
              {showGrid && (
                <defs>
                  <pattern
                    id="grid"
                    width={gridSize}
                    height={gridSize}
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                      fill="none"
                      stroke="rgba(0,0,0,0.08)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
              )}
              {showGrid && <rect width={CAMPUS_W} height={CAMPUS_H} fill="url(#grid)" />}

              {showReferenceOutlines &&
                Object.values(KSYK_BUILDING_OUTLINES).map((preset) => (
                  <path
                    key={`ref-${preset.letter}`}
                    d={outlineToPath(preset.shape)}
                    fill={preset.stroke}
                    fillOpacity={0.07}
                    stroke={preset.stroke}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity={0.6}
                    pointerEvents="none"
                  />
                ))}

              {campusOutline.length > 0 && (
                <path
                  d={outlineToPath(campusOutline)}
                  fill={KSYK_BUILDING_OUTLINES[activeWingLetter]?.stroke ?? "#3B82F6"}
                  fillOpacity={0.12}
                  stroke={KSYK_BUILDING_OUTLINES[activeWingLetter]?.stroke ?? "#3B82F6"}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {walls.map((wall, idx) => (
                <polyline
                  key={`wall-${idx}`}
                  points={wall.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#1F2937"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {currentWall.length > 0 && (
                <polyline
                  points={currentWall.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="10,5"
                />
              )}

              {floorRooms.map((room) => {
                const isSelected =
                  selectedRoomIds.has(room.id) || selectedRoom?.id === room.id;
                const handleSize = 12;
                return (
                  <g key={room.id} data-room={room.id}>
                    <rect
                      x={room.mapPositionX}
                      y={room.mapPositionY}
                      width={room.width}
                      height={room.height}
                      fill={getRoomFillColor(room.type, room.currentStatus)}
                      stroke={isSelected ? "#2563eb" : "white"}
                      strokeWidth={isSelected ? 3 : 2}
                      rx="6"
                      opacity={isSelected ? 1 : 0.92}
                      className={
                        activeTool === "select" ? "cursor-move" : "cursor-pointer"
                      }
                      onMouseDown={(e) => beginMoveRoom(e, room.id)}
                    />
                    <text
                      x={room.mapPositionX + room.width / 2}
                      y={room.mapPositionY + room.height / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="16"
                      fontWeight="bold"
                      style={{ pointerEvents: "none" }}
                    >
                      {room.roomNumber}
                    </text>
                    {isSelected && activeTool === "select" && (
                      <>
                        {(
                          [
                            ["tl", room.mapPositionX, room.mapPositionY, "nwse-resize"],
                            ["tr", room.mapPositionX + room.width, room.mapPositionY, "nesw-resize"],
                            ["bl", room.mapPositionX, room.mapPositionY + room.height, "nesw-resize"],
                            ["br", room.mapPositionX + room.width, room.mapPositionY + room.height, "nwse-resize"],
                          ] as const
                        ).map(([corner, cx, cy, cursor]) => (
                          <rect
                            key={corner}
                            x={cx - handleSize / 2}
                            y={cy - handleSize / 2}
                            width={handleSize}
                            height={handleSize}
                            fill="#2563eb"
                            stroke="white"
                            strokeWidth={1.5}
                            rx={2}
                            style={{ cursor }}
                            onMouseDown={(e) => beginResizeRoom(e, room.id, corner)}
                          />
                        ))}
                      </>
                    )}
                  </g>
                );
              })}

              {rubberBand && (
                <rect
                  x={Math.min(rubberBand.x0, rubberBand.x1)}
                  y={Math.min(rubberBand.y0, rubberBand.y1)}
                  width={Math.abs(rubberBand.x1 - rubberBand.x0)}
                  height={Math.abs(rubberBand.y1 - rubberBand.y0)}
                  fill="rgba(37,99,235,0.08)"
                  stroke="#2563eb"
                  strokeWidth={1.5 / zoom}
                  strokeDasharray={`${4 / zoom} ${4 / zoom}`}
                  pointerEvents="none"
                />
              )}
            </svg>

            {/* Drawing instructions floating pill */}
            {isDrawing && (activeTool === "wall" || activeTool === "outline") && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#2563eb] text-white pl-4 pr-1.5 py-1.5 rounded-2xl shadow-sm">
                <span className="text-xs font-semibold">
                  {activeTool === "outline"
                    ? "Click to add outline points"
                    : "Click to add wall points"}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs rounded-xl font-semibold active:scale-[0.98] transition-transform"
                  onClick={activeTool === "outline" ? finishOutline : finishWall}
                >
                  {activeTool === "outline" ? "Finish outline" : "Finish wall"}
                </Button>
                <button
                  type="button"
                  onClick={cancelDrawing}
                  title="Cancel drawing"
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors active:scale-[0.94]"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            )}

            {/* Status bar */}
            <div className="absolute bottom-0 left-0 right-0 h-8 z-10 flex items-center px-4 gap-3 text-[11px] text-muted-foreground bg-card/90 backdrop-blur-md border-t border-border pointer-events-none select-none">
              <span className="font-mono tabular-nums font-semibold">{(zoom * 100).toFixed(0)}%</span>
              <span className="opacity-40">·</span>
              <span>
                <span className="font-mono tabular-nums font-semibold text-foreground">{floorRooms.length}</span>
                <span className="ml-1">rooms · floor</span>
                <span className="font-mono font-semibold ml-1 text-foreground">{builderFloor}</span>
              </span>
              {selectedRoomIds.size > 0 && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="text-[#2563eb] font-semibold">
                    <span className="font-mono tabular-nums">{selectedRoomIds.size}</span> selected
                  </span>
                </>
              )}
              <span className="ml-auto opacity-60 hidden md:block font-mono text-[10px]">
                [F] Fit · [V] Select · [H] Pan · [R] Room · Del · Ctrl+Z
              </span>
            </div>
          </div>

          {/* ─────────────── Right floating property panel (280px) ─────────────── */}
          {(selectedRoom || activeTool === "room") && (
            <aside className="w-[280px] shrink-0 flex flex-col overflow-hidden bg-card border-l border-border">
              {/* Header */}
              <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={KICKER}>
                      {selectedRoom ? "Editing" : "New room"}
                    </p>
                    <p className="text-[20px] font-bold tracking-[-0.02em] text-foreground font-mono truncate mt-0.5">
                      {selectedRoom ? selectedRoom.roomNumber : (roomData.roomNumber || "—")}
                    </p>
                    {selectedRoom?.name && (
                      <p className="text-[12px] text-muted-foreground truncate">
                        {selectedRoom.name}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoom(null);
                      setSelectedRoomIds(new Set());
                      if (activeTool === "room") setActiveTool("select");
                    }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-[0.94]"
                    title="Close (Esc)"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Tab strip */}
              <div className="shrink-0 px-3 pt-3 pb-2 border-b border-border">
                <div className="flex gap-1 p-1 rounded-xl bg-muted/60">
                  {(["identity", "position", "style"] as PropertyTab[]).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPropertyTab(id)}
                      className={cn(
                        "flex-1 h-8 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]",
                        propertyTab === id
                          ? "bg-card text-[#2563eb] shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {TAB_ICONS[id]}
                      {id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content — scrollable */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {propertyTab === "identity" && (
                  <>
                    <div>
                      <p className={KICKER}>Room number</p>
                      <Input
                        placeholder="A32, U205, K15…"
                        value={roomData.roomNumber}
                        onChange={(e) =>
                          setRoomData({
                            ...roomData,
                            roomNumber: e.target.value.toUpperCase(),
                          })
                        }
                        className="mt-1.5 min-h-11 h-11 text-[15px] font-mono font-semibold rounded-xl"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
                        Building letter + digits. Valid: A/U/K/L/R; M accepts M1–M2.
                      </p>
                    </div>

                    <div>
                      <p className={KICKER}>Name</p>
                      <Input
                        placeholder="Physics Lab, A-sali…"
                        value={roomData.name}
                        onChange={(e) => setRoomData({ ...roomData, name: e.target.value })}
                        className="mt-1.5 min-h-11 h-11 text-sm rounded-xl"
                      />
                    </div>

                    <div>
                      <p className={KICKER}>Description</p>
                      <textarea
                        placeholder="Optional notes for staff…"
                        rows={3}
                        className="mt-1.5 w-full min-h-16 px-3 py-2 text-sm rounded-xl bg-transparent border border-border focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb] resize-y"
                      />
                    </div>
                  </>
                )}

                {propertyTab === "position" && (
                  <>
                    <div>
                      <p className={KICKER}>Position (X / Y)</p>
                      <div className="mt-1.5 grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          value={selectedRoom ? Math.round(selectedRoom.mapPositionX) : Math.round(roomData.x)}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            if (selectedRoom) {
                              setRooms((rs) =>
                                rs.map((r) =>
                                  r.id === selectedRoom.id
                                    ? { ...r, mapPositionX: v, x: v }
                                    : r
                                )
                              );
                            } else {
                              setRoomData({ ...roomData, x: v });
                            }
                          }}
                          className="min-h-11 h-11 text-sm font-mono rounded-xl"
                          placeholder="X"
                        />
                        <Input
                          type="number"
                          value={selectedRoom ? Math.round(selectedRoom.mapPositionY) : Math.round(roomData.y)}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            if (selectedRoom) {
                              setRooms((rs) =>
                                rs.map((r) =>
                                  r.id === selectedRoom.id
                                    ? { ...r, mapPositionY: v, y: v }
                                    : r
                                )
                              );
                            } else {
                              setRoomData({ ...roomData, y: v });
                            }
                          }}
                          className="min-h-11 h-11 text-sm font-mono rounded-xl"
                          placeholder="Y"
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="mt-2 w-full h-9 rounded-xl border-border font-semibold text-[11px] active:scale-[0.98] transition-transform"
                        onClick={() => setActiveTool("room")}
                      >
                        <MapPin className="h-3.5 w-3.5 mr-1.5" strokeWidth={2} />
                        Pick from map
                      </Button>
                    </div>

                    <div>
                      <p className={KICKER}>Floor</p>
                      <div className="mt-1.5 flex gap-1.5 flex-wrap">
                        {[0, 1, 2, 3, 4, 5].map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => {
                              setRoomData({ ...roomData, floor: f });
                              setBuilderFloor(f);
                            }}
                            className={cn(
                              "h-9 min-w-11 px-3 rounded-xl text-[12px] font-mono font-bold transition-all active:scale-[0.94]",
                              roomData.floor === f
                                ? "bg-[#2563eb] text-white shadow-sm"
                                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                            )}
                          >
                            F{f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className={KICKER}>Capacity</p>
                      <Input
                        type="number"
                        min="1"
                        value={roomData.capacity}
                        onChange={(e) =>
                          setRoomData({ ...roomData, capacity: parseInt(e.target.value) || 1 })
                        }
                        className="mt-1.5 min-h-11 h-11 text-sm font-mono font-semibold rounded-xl"
                      />
                    </div>
                  </>
                )}

                {propertyTab === "style" && (
                  <>
                    <div>
                      <p className={KICKER}>Room type</p>
                      <Select
                        value={roomData.type}
                        onValueChange={(v) => setRoomData({ ...roomData, type: v })}
                      >
                        <SelectTrigger className="mt-1.5 min-h-11 h-11 text-sm rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROOM_TYPES.map(([v, l]) => (
                            <SelectItem key={v} value={v}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <p className={KICKER}>Color preview</p>
                      <div className="mt-1.5 flex gap-1.5 flex-wrap">
                        {COLOR_CHIPS.map((hex) => {
                          const active = getRoomFillColor(roomData.type, undefined).toLowerCase() === hex.toLowerCase();
                          return (
                            <span
                              key={hex}
                              className={cn(
                                "w-8 h-8 rounded-lg ring-1 ring-black/10 relative",
                                active && "ring-2 ring-[#2563eb]"
                              )}
                              style={{ background: hex }}
                              title={hex}
                            />
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2 leading-snug">
                        Color follows the room type. Change type above to change color.
                      </p>
                    </div>

                    <div>
                      <p className={KICKER}>Dimensions (px)</p>
                      <div className="mt-1.5 grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="50"
                          value={roomData.width}
                          onChange={(e) =>
                            setRoomData({ ...roomData, width: parseInt(e.target.value) || 50 })
                          }
                          className="min-h-11 h-11 text-sm font-mono rounded-xl"
                          placeholder="W"
                        />
                        <Input
                          type="number"
                          min="50"
                          value={roomData.height}
                          onChange={(e) =>
                            setRoomData({ ...roomData, height: parseInt(e.target.value) || 50 })
                          }
                          className="min-h-11 h-11 text-sm font-mono rounded-xl"
                          placeholder="H"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2 leading-snug">
                        Sizes snap to the {gridSize}px grid. Grab any corner on the canvas to resize by hand.
                      </p>
                    </div>
                  </>
                )}

                {/* Warn banner when trying to add without valid number */}
                {!selectedRoom && roomData.roomNumber && !validateRoomNumber(roomData.roomNumber) && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-100">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={2} />
                    <p className="text-[11px] leading-snug">
                      "{roomData.roomNumber}" isn't a valid room number. Use A/U/K/L/R + digits, or M1–M2.
                    </p>
                  </div>
                )}
              </div>

              {/* Sticky panel footer — Save / Cancel */}
              <div className="shrink-0 p-3 border-t border-border bg-muted/30">
                {selectedRoom ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl text-xs font-semibold active:scale-[0.98] transition-all border-border"
                      onClick={duplicateSelected}
                    >
                      <CopyIcon className="h-3.5 w-3.5 mr-1.5" strokeWidth={2} />
                      Duplicate
                    </Button>
                    <Button
                      variant="destructive"
                      className="h-11 rounded-xl text-xs font-semibold active:scale-[0.98] transition-all"
                      onClick={() => deleteRoom(selectedRoom.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" strokeWidth={2} />
                      Delete
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className="col-span-1 h-11 rounded-xl text-xs font-semibold active:scale-[0.98] transition-all border-border"
                      onClick={() => {
                        setRoomData({
                          roomNumber: "",
                          name: "",
                          floor: 1,
                          capacity: 30,
                          type: "classroom",
                          x: 0,
                          y: 0,
                          width: 100,
                          height: 80,
                        });
                        setActiveTool("select");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={addRoom}
                      className="col-span-2 h-11 rounded-xl bg-[#2563eb] hover:bg-[#1e4fd8] text-white font-semibold shadow-sm active:scale-[0.98] transition-all"
                    >
                      <Plus className="h-4 w-4 mr-1.5" strokeWidth={2.25} />
                      Save room
                    </Button>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
