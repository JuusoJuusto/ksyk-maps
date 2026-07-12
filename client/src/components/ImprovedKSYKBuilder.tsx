import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, MousePointer, X, Undo, Redo, Square,
  Save, ZoomIn, ZoomOut, RotateCcw, Grid3x3, Layers, Hand, Minus,
  Copy as CopyIcon, Move, Maximize2, Search, AlertCircle, ChevronDown,
  Download, Upload, CheckCircle2, Pencil,
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

export default function ImprovedKSYKBuilder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  
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
    height: 80
  });

  const [dataLoaded, setDataLoaded] = useState(false);
  const [builderFloor, setBuilderFloor] = useState(1);
  const [roomSearch, setRoomSearch] = useState("");
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const { data: existingRooms = [] } = useQuery({
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
      y: Math.round(point.y / gridSize) * gridSize
    };
  };

  // Get SVG world coordinates from any mouse event using the CTM.
  // This correctly accounts for viewBox pan/zoom — the old formula missed panX/panY.
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
  }, [selectedRoomIds, rooms, roomHistory, roomHistoryIndex, zoomToFit]);

  const finishOutline = () => {
    if (campusOutline.length >= 3) pushHistory(campusOutline);
    if (campusOutline.length > 2) {
      // Close the outline by connecting to first point
      setCampusOutline([...campusOutline, campusOutline[0]]);
    }
    setIsDrawing(false);
  };

  // Finish drawing current wall
  const finishWall = () => {
    if (currentWall.length > 1) {
      setWalls([...walls, currentWall]);
      setCurrentWall([]);
    }
    setIsDrawing(false);
  };

  // Cancel drawing
  const cancelDrawing = () => {
    if (activeTool === "outline") {
      setCampusOutline([]);
    } else if (activeTool === "wall") {
      setCurrentWall([]);
    }
    setIsDrawing(false);
  };

  // Auto-increment room number: A32 -> A33, U205 -> U206
  const autoIncrementRoomNumber = (num: string): string => {
    const m = num.match(/^([A-Z]+)(\d+)$/);
    if (!m) return num;
    return `${m[1]}${parseInt(m[2]) + 1}`;
  };

  // Extract building letter from room number (A32 -> A, M1 -> M, U205 -> U)
  const extractBuilding = (roomNumber: string): string => {
    const match = roomNumber.match(/^([A-Z])/i);
    return match ? match[1].toUpperCase() : "";
  };

  // Validate room number format (A32, M1, U205 - letter followed by numbers, no dash)
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
    // Allow specific formats: A32, A21, M1, M2, U205, K15, L10, R5
    const validBuildings = ['A', 'M', 'U', 'K', 'L', 'R'];
    const match = roomNumber.match(/^([A-Z])(\d+)$/i);
    
    if (!match) return false;
    
    const building = match[1].toUpperCase();
    const number = parseInt(match[2]);
    
    // Check if building is valid
    if (!validBuildings.includes(building)) return false;
    
    // Special rules for M building (only M1, M2)
    if (building === 'M' && (number < 1 || number > 2)) return false;
    
    // For other buildings, allow reasonable room numbers
    if (building !== 'M' && (number < 1 || number > 999)) return false;
    
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
    
    const newRoom = {
      ...roomData,
      id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      building,
      mapPositionX: roomData.x,
      mapPositionY: roomData.y,
      _isLocalNew: true,
    };

    const next = [...rooms, newRoom];
    setRooms(next);
    pushRoomHistory(next);

    // Reset form (but advance the suggested position so successive adds don't stack)
    setRoomData({
      roomNumber: "",
      name: "",
      floor: roomData.floor,
      capacity: 30,
      type: "classroom",
      x: roomData.x + 120,
      y: roomData.y,
      width: 100,
      height: 80
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
    // intentionally omit pushRoomHistory here — would spam history on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomData.name, roomData.floor, roomData.capacity, roomData.type, roomData.width, roomData.height]);

  // Group rooms by building
  const groupedRooms = rooms.reduce((acc, room) => {
    const building = room.building;
    if (!acc[building]) acc[building] = [];
    acc[building].push(room);
    return acc;
  }, {} as Record<string, any[]>);

  // Save to database — PATCH existing rooms, POST new ones (no more duplicates)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const existingBuildingsRes = await fetch('/api/buildings', { credentials: 'include' });
      const existingBuildings = existingBuildingsRes.ok ? await existingBuildingsRes.json() : [];

      // Build map of existing room ids (from the API load) so we can tell new from edited
      const existingIds = new Set<string>(existingRooms.map((r: any) => r.id));

      const buildingPromises = (Object.entries(groupedRooms) as [string, any[]][]).map(async ([buildingLetter, buildingRooms]) => {
        const minX = Math.min(...buildingRooms.map(r => r.mapPositionX));
        const minY = Math.min(...buildingRooms.map(r => r.mapPositionY));
        const maxX = Math.max(...buildingRooms.map(r => r.mapPositionX + r.width));
        const maxY = Math.max(...buildingRooms.map(r => r.mapPositionY + r.height));

        const existing = existingBuildings.find(
          (b: { name?: string }) => b.name?.toUpperCase() === buildingLetter.toUpperCase()
        );

        let building = existing;
        if (!building) {
          const buildingResponse = await fetch('/api/buildings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: buildingLetter,
              nameEn: `${buildingLetter} Building`,
              nameFi: `${buildingLetter}-rakennus`,
              floors: Math.max(...buildingRooms.map(r => r.floor)),
              colorCode: getColorForBuilding(buildingLetter),
              mapPositionX: minX,
              mapPositionY: minY,
              description: JSON.stringify({
                customShape: [
                  { x: minX, y: minY },
                  { x: maxX, y: minY },
                  { x: maxX, y: maxY },
                  { x: minX, y: maxY }
                ]
              })
            })
          });

          if (!buildingResponse.ok) throw new Error('Failed to create building');
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

          // If this id existed on the server, PATCH it; otherwise POST.
          if (existingIds.has(room.id)) {
            return fetch(`/api/rooms/${encodeURIComponent(room.id)}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(payload),
            });
          }
          return fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
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
          fetch(`/api/rooms/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setDataLoaded(false);
      setUnsavedChanges(false);
      toast({ title: "Saved", description: "Map data has been updated." });
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast({ title: "Save failed", description: "Could not save. Please try again.", variant: "destructive" });
    }
  });

  // Get color for building
  const getColorForBuilding = (letter: string): string => {
    return KSYK_WING_PRESETS.find((w) => w.letter === letter)?.color || "#6B7280";
  };

  const addRoomFromPreset = (letter: string) => {
    setRoomData({
      ...roomData,
      roomNumber: `${letter}${roomData.floor}1`,
      x: 100 + rooms.length * 30,
      y: 100 + rooms.length * 20,
    });
    setActiveTool("room");
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
    // Prefer room history (more user-visible) when there is something to undo,
    // otherwise fall back to outline history.
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

  // Room type colors
  const getRoomColor = (type: string): string => {
    const colors: Record<string, string> = {
      classroom: '#60A5FA',
      classroom_science: '#10B981',
      classroom_language: '#F59E0B',
      classroom_art: '#EC4899',
      classroom_music: '#8B5CF6',
      classroom_computer: '#3B82F6',
      lab: '#34D399',
      office: '#FBBF24',
      library: '#A78BFA',
      gymnasium: '#F87171',
      cafeteria: '#FB923C',
      lobby: '#6366F1',
      toilet: '#94A3B8',
      stairway: '#EF4444',
      hallway: '#D1D5DB',
      door: '#78716C',
      storage: '#A3A3A3',
      auditorium: '#DC2626',
    };
    return colors[type] || '#9CA3AF';
  };

  // JSON export — download the current builder state to a file
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

  // JSON import — replace local state with the file's content
  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data.rooms)) {
        // Mark imported rooms as new so save logic POSTs them
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

  // Align / distribute selected rooms
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

  const filteredRooms = roomSearch.trim()
    ? rooms.filter(
        (r) =>
          r.roomNumber?.toLowerCase().includes(roomSearch.toLowerCase()) ||
          r.name?.toLowerCase().includes(roomSearch.toLowerCase())
      )
    : rooms;

  const floorCounts = rooms.reduce((acc: Record<number, number>, r) => {
    const f = r.floor ?? 1;
    acc[f] = (acc[f] ?? 0) + 1;
    return acc;
  }, {});

  const TOOLS: { id: Tool; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { id: "select", icon: <MousePointer className="h-4 w-4" />, label: "Select", shortcut: "V" },
    { id: "pan", icon: <Hand className="h-4 w-4" />, label: "Pan", shortcut: "H" },
    { id: "room", icon: <Plus className="h-4 w-4" />, label: "Place room", shortcut: "R" },
    { id: "wall", icon: <Square className="h-4 w-4" />, label: "Draw wall", shortcut: "W" },
    { id: "outline", icon: <Layers className="h-4 w-4" />, label: "Wing outline", shortcut: "O" },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-gray-950 font-sans">
      {/* Best-on-desktop hint for phones */}
      <div className="md:hidden shrink-0 flex items-center gap-2 px-3 py-2 border-b border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 text-[11px]">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>Campus Builder is optimised for desktop — pinch-zoom and precise editing work best on a larger screen.</span>
      </div>

      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="h-14 shrink-0 flex items-center justify-between px-4 gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3 min-w-0">
          <KSYKLogo size="sm" />
          <div>
            <p className="font-bold text-sm leading-tight tracking-[-0.01em] text-gray-900 dark:text-white">Campus Builder</p>
            <p className="text-[10px] text-muted-foreground leading-tight uppercase tracking-[0.1em]">KSYK Maps</p>
          </div>
          {unsavedChanges && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200 text-[10px] font-semibold">
              <AlertCircle className="h-3 w-3" />
              Unsaved
            </span>
          )}
          {saveMutation.isSuccess && !unsavedChanges && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-[10px] font-semibold">
              <CheckCircle2 className="h-3 w-3" />
              Saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Wing template */}
          <Select value={activeWingLetter} onValueChange={loadWingOutline}>
            <SelectTrigger className="h-10 w-40 text-xs rounded-xl">
              <SelectValue placeholder="Wing template" />
            </SelectTrigger>
            <SelectContent>
              {KSYK_BUILDING_LETTERS.map((letter) => (
                <SelectItem key={letter} value={letter}>
                  {KSYK_BUILDING_OUTLINES[letter].nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            className="h-10 text-xs gap-1.5 rounded-xl active:scale-[0.98] transition-transform"
            onClick={exportJson}
            title="Export JSON"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          {/* Import */}
          <label className="inline-flex items-center gap-1.5 h-10 text-xs px-3 rounded-xl border border-input bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all active:scale-[0.98]">
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Import</span>
            <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ""; }} />
          </label>

          {/* Save */}
          <Button
            size="sm"
            className={cn(
              "h-10 gap-1.5 rounded-xl font-semibold transition-all active:scale-[0.98]",
              unsavedChanges
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save className="h-3.5 w-3.5" />
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ── Tool Sidebar ─────────────────────────────────────────── */}
        <aside className="w-16 shrink-0 flex flex-col items-center gap-1.5 py-3 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500 mb-1">Tools</p>
          {TOOLS.map(({ id, icon, label, shortcut }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTool(id)}
              title={`${label} (${shortcut})`}
              className={cn(
                "w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.94]",
                activeTool === id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              {icon}
              <span className={cn(
                "text-[8px] font-bold leading-none tracking-wider",
                activeTool === id ? "opacity-80" : "opacity-60"
              )}>{shortcut}</span>
            </button>
          ))}

          <div className="flex-1" />

          <div className="w-8 h-px bg-gray-200 dark:bg-gray-800 my-1" />

          {/* Snap toggle */}
          <button
            type="button"
            onClick={() => setSnapEnabled((s) => !s)}
            title={snapEnabled ? "Snap to grid: ON" : "Snap to grid: OFF"}
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-[0.94]",
              snapEnabled
                ? "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-200 dark:ring-blue-900/40"
                : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>

          {/* Undo / Redo */}
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-25 disabled:hover:bg-transparent transition-all active:scale-[0.94]"
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-25 disabled:hover:bg-transparent transition-all active:scale-[0.94] mb-1"
          >
            <Redo className="h-4 w-4" />
          </button>
        </aside>

        {/* ── Properties / Add-Room Panel ──────────────────────────── */}
        <div className="w-72 shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
          {/* Panel header */}
          <div className="px-4 pt-3 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-1.5">
              {selectedRoom ? "Editing" : "New room"}
            </p>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2.5 h-2.5 rounded-full",
                selectedRoom ? "bg-amber-400 ring-4 ring-amber-400/20" : "bg-blue-500 ring-4 ring-blue-500/20"
              )} />
              <p className="text-sm font-bold text-gray-900 dark:text-white flex-1 min-w-0">
                {selectedRoom ? (
                  <span className="flex items-center gap-1.5">
                    <Pencil className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-blue-600 font-mono">{selectedRoom.roomNumber}</span>
                  </span>
                ) : "Add a room"}
              </p>
              {selectedRoom && (
                <button
                  type="button"
                  onClick={() => { setSelectedRoom(null); setSelectedRoomIds(new Set()); }}
                  className="ml-auto h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-[0.94]"
                  title="Close editor"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            <div>
              <Label className="text-[11px] font-semibold mb-1 block text-gray-700 dark:text-gray-300">
                Room number <span className="text-blue-600">*</span>
              </Label>
              <Input
                placeholder="A32, U205, K15…"
                value={roomData.roomNumber}
                onChange={(e) => setRoomData({ ...roomData, roomNumber: e.target.value.toUpperCase() })}
                className="h-10 text-sm font-mono rounded-lg"
              />
              <p className="text-[10px] text-muted-foreground mt-1">A / U / K / L / R + digits, or M1–M2</p>
            </div>

            <div>
              <Label className="text-[11px] font-semibold mb-1 block text-gray-700 dark:text-gray-300">Room name</Label>
              <Input
                placeholder="Physics Lab, A-sali…"
                value={roomData.name}
                onChange={(e) => setRoomData({ ...roomData, name: e.target.value })}
                className="h-10 text-sm rounded-lg"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold mb-1 block text-gray-700 dark:text-gray-300">Type</Label>
              <Select value={roomData.type} onValueChange={(v) => setRoomData({ ...roomData, type: v })}>
                <SelectTrigger className="h-10 text-sm rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ["classroom","📚 Classroom"],
                    ["classroom_science","🔬 Science"],
                    ["classroom_language","🗣️ Language"],
                    ["classroom_art","🎨 Art"],
                    ["classroom_music","🎵 Music"],
                    ["classroom_computer","💻 Computer Lab"],
                    ["lab","🧪 Laboratory"],
                    ["office","🏢 Office"],
                    ["library","📖 Library"],
                    ["gymnasium","🏀 Gymnasium"],
                    ["cafeteria","🍽️ Cafeteria"],
                    ["lobby","🚪 Lobby"],
                    ["toilet","🚻 Toilet"],
                    ["stairway","🪜 Stairway"],
                    ["hallway","🚶 Hallway"],
                    ["storage","📦 Storage"],
                    ["auditorium","🎭 Auditorium"],
                  ].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              {/* Color preview chip */}
              <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800/60">
                <span
                  className="w-3.5 h-3.5 rounded-sm ring-1 ring-black/10 dark:ring-white/10"
                  style={{ background: getRoomFillColor(roomData.type, undefined) }}
                />
                <span className="text-[10px] text-muted-foreground capitalize">{roomData.type.replace(/_/g, " ")}</span>
              </div>
            </div>

            <div className="pt-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-2">Placement</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-semibold mb-1 block text-gray-700 dark:text-gray-300">Floor</Label>
                  <Input type="number" min="0" max="5" value={roomData.floor}
                    onChange={(e) => { const f = parseInt(e.target.value) || 0; setRoomData({ ...roomData, floor: f }); setBuilderFloor(f); }}
                    className="h-10 text-sm font-mono rounded-lg" />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold mb-1 block text-gray-700 dark:text-gray-300">Capacity</Label>
                  <Input type="number" min="1" value={roomData.capacity}
                    onChange={(e) => setRoomData({ ...roomData, capacity: parseInt(e.target.value) || 1 })}
                    className="h-10 text-sm font-mono rounded-lg" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-semibold mb-1 block text-gray-700 dark:text-gray-300">Width (px)</Label>
                <Input type="number" min="50" value={roomData.width}
                  onChange={(e) => setRoomData({ ...roomData, width: parseInt(e.target.value) })}
                  className="h-10 text-sm font-mono rounded-lg" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold mb-1 block text-gray-700 dark:text-gray-300">Height (px)</Label>
                <Input type="number" min="50" value={roomData.height}
                  onChange={(e) => setRoomData({ ...roomData, height: parseInt(e.target.value) })}
                  className="h-10 text-sm font-mono rounded-lg" />
              </div>
            </div>

            {!selectedRoom ? (
              <Button
                onClick={addRoom}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-transform"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add room to canvas
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 rounded-xl text-xs font-semibold active:scale-[0.98] transition-transform"
                  onClick={duplicateSelected}
                >
                  <CopyIcon className="h-3.5 w-3.5 mr-1" />Duplicate
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-11 rounded-xl text-xs font-semibold active:scale-[0.98] transition-transform"
                  onClick={() => deleteRoom(selectedRoom.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                </Button>
              </div>
            )}
          </div>

          {/* Rooms browser */}
          <div className="border-t border-gray-100 dark:border-gray-800 shrink-0">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">Rooms</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  <span className="text-blue-600">{rooms.length}</span>
                  <span className="text-gray-400 dark:text-gray-500 font-normal text-xs ml-1">on canvas</span>
                </p>
              </div>
              {selectedRoomIds.size > 0 && (
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="h-8 px-2.5 rounded-lg text-[11px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold transition-colors active:scale-[0.96] flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete {selectedRoomIds.size}
                </button>
              )}
            </div>
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search rooms…"
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="overflow-y-auto max-h-56 px-3 pb-3 space-y-1.5">
            {(Object.entries(groupedRooms) as [string, any[]][]).map(([building, bRooms]) => {
              const visible = bRooms.filter(
                (r) => !roomSearch.trim() ||
                  r.roomNumber?.toLowerCase().includes(roomSearch.toLowerCase()) ||
                  r.name?.toLowerCase().includes(roomSearch.toLowerCase())
              );
              if (visible.length === 0) return null;
              return (
                <div key={building} className="space-y-0.5">
                  <div className="flex items-center gap-1.5 px-1 py-1 sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0 ring-1 ring-black/10 dark:ring-white/10"
                      style={{ background: getColorForBuilding(building) }}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 dark:text-gray-400">{building} wing</span>
                    <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">{visible.length}</span>
                  </div>
                  {visible.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => {
                        setSelectedRoom(room);
                        setSelectedRoomIds(new Set([room.id]));
                        setRoomData({ roomNumber: room.roomNumber, name: room.name || "", floor: room.floor ?? 1, capacity: room.capacity ?? 30, type: room.type || "classroom", x: room.mapPositionX, y: room.mapPositionY, width: room.width, height: room.height });
                        setBuilderFloor(room.floor ?? 1);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 h-10 rounded-lg text-left transition-all text-xs active:scale-[0.98]",
                        selectedRoomIds.has(room.id)
                          ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-100"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border border-transparent"
                      )}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0 ring-1 ring-black/10 dark:ring-white/10"
                        style={{ background: getRoomFillColor(room.type, undefined) }}
                      />
                      <span className="font-mono font-semibold">{room.roomNumber}</span>
                      <span className="truncate text-muted-foreground text-[10px]">{room.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0 font-mono">F{room.floor}</span>
                    </button>
                  ))}
                </div>
              );
            })}
            {filteredRooms.length === 0 && roomSearch && (
              <p className="text-xs text-muted-foreground text-center py-6">No rooms match "{roomSearch}"</p>
            )}
            {rooms.length === 0 && !roomSearch && (
              <p className="text-xs text-muted-foreground text-center py-6">No rooms yet — add your first one above.</p>
            )}
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden min-w-0 bg-[radial-gradient(ellipse_at_center,#e8ecf1_0%,#d4dae4_100%)] dark:bg-[radial-gradient(ellipse_at_center,#111827_0%,#030712_100%)]">
          {/* Floor selector — Aalto Space style */}
          <div className="absolute top-3 right-3 z-20 flex flex-col rounded-2xl overflow-hidden bg-white/95 dark:bg-gray-900/95 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setBuilderFloor((f) => Math.min(f + 1, maxBuilderFloor))}
              disabled={builderFloor >= maxBuilderFloor}
              className="w-11 h-11 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors active:scale-[0.94]"
              title="Floor up"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="w-11 h-11 flex items-center justify-center font-bold text-sm bg-blue-600 text-white border-y border-blue-700 tabular-nums shadow-inner">
              {builderFloor}
            </div>
            <button
              type="button"
              onClick={() => setBuilderFloor((f) => Math.max(f - 1, 0))}
              disabled={builderFloor <= 0}
              className="w-11 h-11 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors active:scale-[0.94]"
              title="Floor down"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>

          {/* View toolbar — grid/refs/zoom */}
          <div className="absolute top-3 left-3 z-10 flex gap-0.5 p-1 rounded-xl bg-white/95 dark:bg-gray-900/95 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              title="Toggle grid"
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center transition-all active:scale-[0.94]",
                showGrid
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowReferenceOutlines(!showReferenceOutlines)}
              title="Toggle reference outlines"
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center transition-all active:scale-[0.94]",
                showReferenceOutlines
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Layers className="h-4 w-4" />
            </button>
            <div className="w-px h-6 my-2 bg-gray-200 dark:bg-gray-700" />
            <button
              type="button"
              onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
              title="Zoom in"
              className="h-10 w-10 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-[0.94]"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
              title="Zoom out"
              className="h-10 w-10 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-[0.94]"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => zoomToFit(selectedRoomIds.size > 0 ? "selection" : "all")}
              title="Zoom to fit (F)"
              className="h-10 w-10 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-[0.94]"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => { setZoom(1); setPanX(0); setPanY(0); }}
              title="Reset view"
              className="h-10 w-10 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-[0.94]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Alignment toolbar — appears when 2+ rooms are selected */}
          {selectedRoomIds.size >= 2 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex gap-0.5 p-1 rounded-xl bg-white/95 dark:bg-gray-900/95 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-sm">
              <span className="px-3 h-10 flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.08em]">
                {selectedRoomIds.size}× align
              </span>
              <div className="w-px h-6 my-2 bg-gray-200 dark:bg-gray-700" />
              {[
                { dir: "left" as const, label: "⫷", title: "Align left" },
                { dir: "centerX" as const, label: "⫵", title: "Align center X" },
                { dir: "right" as const, label: "⫸", title: "Align right" },
                { dir: "top" as const, label: "⫶", title: "Align top" },
                { dir: "centerY" as const, label: "⫼", title: "Align center Y" },
                { dir: "bottom" as const, label: "⫻", title: "Align bottom" },
                { dir: "distX" as const, label: "↔", title: "Distribute X (≥3)" },
                { dir: "distY" as const, label: "↕", title: "Distribute Y (≥3)" },
              ].map(({ dir, label, title }) => (
                <button
                  key={dir}
                  type="button"
                  className="h-10 w-10 p-0 rounded-lg font-mono text-base text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 transition-all active:scale-[0.94]"
                  onClick={() => alignSelected(dir)}
                  title={title}
                >
                  {label}
                </button>
              ))}
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
              pt.x = e.clientX; pt.y = e.clientY;
              const ctm = svg.getScreenCTM();
              if (!ctm) return;
              const world = pt.matrixTransform(ctm.inverse());
              const factor = e.deltaY > 0 ? 1.12 : 0.9;
              const newZoom = Math.min(4, Math.max(0.25, zoom * factor));
              const W = 1600, H = 900;
              const oldVbW = W / zoom, oldVbH = H / zoom;
              const newVbW = W / newZoom, newVbH = H / newZoom;
              const fx = (world.x - panX) / oldVbW;
              const fy = (world.y - panY) / oldVbH;
              setZoom(newZoom);
              setPanX(world.x - fx * newVbW);
              setPanY(world.y - fy * newVbH);
            }}
            className={`w-full h-full touch-none ${activeTool === "pan" ? "cursor-grab" : "cursor-crosshair"}`}
          >
            {/* Grid */}
            {showGrid && (
              <defs>
                <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                  <path 
                    d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} 
                    fill="none" 
                    stroke="rgba(0,0,0,0.1)" 
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

            {/* Wing outline being edited */}
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
            
            {/* Walls */}
            {walls.map((wall, idx) => (
              <polyline
                key={`wall-${idx}`}
                points={wall.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#1F2937"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            
            {/* Current wall being drawn */}
            {currentWall.length > 0 && (
              <polyline
                points={currentWall.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="10,5"
              />
            )}
            
            {/* Rooms (current floor) */}
            {floorRooms.map((room) => {
              const isSelected = selectedRoomIds.has(room.id) || selectedRoom?.id === room.id;
              const handleSize = 12;
              return (
                <g key={room.id} data-room={room.id}>
                  <rect
                    x={room.mapPositionX}
                    y={room.mapPositionY}
                    width={room.width}
                    height={room.height}
                    fill={getRoomFillColor(room.type, room.currentStatus)}
                    stroke={isSelected ? "#fbbf24" : "white"}
                    strokeWidth={isSelected ? 3 : 2}
                    rx="4"
                    opacity={isSelected ? 1 : 0.92}
                    className={activeTool === "select" ? "cursor-move" : "cursor-pointer"}
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
                    style={{ pointerEvents: 'none' }}
                  >
                    {room.roomNumber}
                  </text>
                  {isSelected && activeTool === "select" && (
                    <>
                      {([
                        ["tl", room.mapPositionX, room.mapPositionY, "nwse-resize"],
                        ["tr", room.mapPositionX + room.width, room.mapPositionY, "nesw-resize"],
                        ["bl", room.mapPositionX, room.mapPositionY + room.height, "nesw-resize"],
                        ["br", room.mapPositionX + room.width, room.mapPositionY + room.height, "nwse-resize"],
                      ] as const).map(([corner, cx, cy, cursor]) => (
                        <rect
                          key={corner}
                          x={cx - handleSize / 2}
                          y={cy - handleSize / 2}
                          width={handleSize}
                          height={handleSize}
                          fill="#fbbf24"
                          stroke="#0f172a"
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
                fill="rgba(59,130,246,0.08)"
                stroke="#3b82f6"
                strokeWidth={1.5 / zoom}
                strokeDasharray={`${4 / zoom} ${4 / zoom}`}
                pointerEvents="none"
              />
            )}
          </svg>

          {/* Selected room properties panel */}
          {selectedRoom && (
            <div className="absolute bottom-8 left-0 right-0 z-30 sm:bottom-10 sm:left-4 sm:right-auto sm:max-w-xs px-3 sm:px-0">
              <Card className="rounded-2xl bg-white/98 dark:bg-gray-900/98 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-sm border-0 shadow-xl shadow-black/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white text-xs font-bold shadow ring-1 ring-black/10 shrink-0"
                        style={{ backgroundColor: getRoomFillColor(selectedRoom.type, selectedRoom.currentStatus) }}
                      >
                        {selectedRoom.roomNumber.slice(0, 3)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold leading-tight font-mono">{selectedRoom.roomNumber}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[11rem]">{selectedRoom.name || selectedRoom.type}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRoom(null)}
                      className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-[0.94]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs bg-gray-50 dark:bg-gray-800/60 rounded-lg p-2.5">
                    <span className="text-muted-foreground">Floor</span>
                    <span className="col-span-2 font-medium font-mono">{selectedRoom.floor}</span>
                    <span className="text-muted-foreground">Type</span>
                    <span className="col-span-2 font-medium capitalize">{selectedRoom.type?.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="col-span-2 font-medium font-mono">{selectedRoom.capacity ?? '—'}</span>
                    <span className="text-muted-foreground">Size</span>
                    <span className="col-span-2 font-medium tabular-nums font-mono">{selectedRoom.width} × {selectedRoom.height}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 text-xs rounded-lg active:scale-[0.98] transition-transform"
                      onClick={() => setActiveTool("select")}
                      title="Drag on canvas to move (Select tool)"
                    >
                      <Move className="h-3.5 w-3.5 mr-1" />
                      Move
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 text-xs rounded-lg active:scale-[0.98] transition-transform"
                      onClick={duplicateSelected}
                      title="Duplicate (Ctrl+D)"
                    >
                      <CopyIcon className="h-3.5 w-3.5 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-10 text-xs rounded-lg active:scale-[0.98] transition-transform"
                      onClick={() => deleteRoom(selectedRoom.id)}
                      title="Delete (Del)"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Del
                    </Button>
                  </div>
                  {selectedRoomIds.size > 1 && (
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 rounded-lg px-2.5 py-1.5">
                      {selectedRoomIds.size} rooms selected — drag any to move all
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Status bar */}
          <div className="absolute bottom-0 left-0 right-0 h-7 z-10 flex items-center px-3 gap-3 text-[11px] text-gray-600 dark:text-gray-400 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-gray-200/60 dark:border-gray-700/60 pointer-events-none select-none">
            <span className="font-mono tabular-nums">{(zoom * 100).toFixed(0)}%</span>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <span><span className="font-mono tabular-nums">{floorRooms.length}</span> rooms · floor <span className="font-mono">{builderFloor}</span></span>
            {selectedRoomIds.size > 0 && (
              <>
                <span className="text-gray-300 dark:text-gray-700">·</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold"><span className="font-mono tabular-nums">{selectedRoomIds.size}</span> selected</span>
              </>
            )}
            <span className="ml-auto opacity-60 hidden md:block font-mono text-[10px]">[F] Fit · [V] Select · [H] Pan · [R] Room · Del · Ctrl+Z Undo</span>
          </div>

          {/* Drawing Instructions */}
          {isDrawing && (activeTool === "wall" || activeTool === "outline") && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-2 bg-blue-600 text-white pl-4 pr-1.5 py-1.5 rounded-xl shadow-xl shadow-blue-600/30 ring-1 ring-blue-500/50">
              <span className="text-xs font-medium">
                {activeTool === "outline"
                  ? "Click to add outline points"
                  : "Click to add wall points"}
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs rounded-lg font-semibold active:scale-[0.98] transition-transform"
                onClick={activeTool === "outline" ? finishOutline : finishWall}
              >
                {activeTool === "outline" ? "Finish outline" : "Finish wall"}
              </Button>
              <button
                type="button"
                onClick={cancelDrawing}
                title="Cancel drawing"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors active:scale-[0.94]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
