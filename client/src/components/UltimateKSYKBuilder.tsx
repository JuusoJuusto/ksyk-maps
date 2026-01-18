import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Building, Home, Plus, Trash2, MousePointer, Check, X, Undo, Square, Move, Layers, Zap, Save, Edit3, ZoomIn, ZoomOut, Maximize2, Copy, Edit, Grid3x3 } from "lucide-react";

interface Point { x: number; y: number; }

type Tool = "select" | "building" | "room" | "stairway" | "hallway" | "door";
type ShapeMode = "rectangle" | "custom";

export default function UltimateKSYKBuilder() {
  const queryClient = useQueryClient();
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [activeTool, setActiveTool] = useState<Tool>("building");
  const [isDrawing, setIsDrawing] = useState(false);
  const [shapeMode, setShapeMode] = useState<ShapeMode>("rectangle");
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [rectStart, setRectStart] = useState<Point | null>(null);
  const [rectEnd, setRectEnd] = useState<Point | null>(null);
  const [gridSize] = useState(50);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 5000, height: 3000 });
  const [copiedBuilding, setCopiedBuilding] = useState<any>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [buildingToDelete, setBuildingToDelete] = useState<any>(null);
  
  const [buildingData, setBuildingData] = useState({
    name: "", nameEn: "", nameFi: "", floors: [1] as number[],
    capacity: 100, colorCode: "#3B82F6", mapPositionX: 0, mapPositionY: 0
  });

  const [roomData, setRoomData] = useState({
    buildingId: "", roomNumber: "", name: "", nameEn: "", nameFi: "",
    floor: 1, capacity: 30, type: "classroom", connectedRoomId: ""
  });

  const [hallwayData, setHallwayData] = useState({
    buildingId: "", name: "", nameEn: "", nameFi: "", floor: 1
  });


  const { data: buildings = [], isLoading: buildingsLoading } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/buildings");
      if (!response.ok) throw new Error("Failed to fetch buildings");
      return response.json();
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      console.log('🏠 Fetching rooms from API...');
      const response = await fetch("/api/rooms");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      const data = await response.json();
      console.log('✅ Received rooms:', data.length, data);
      return data;
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const { data: hallways = [], isLoading: hallwaysLoading } = useQuery({
    queryKey: ["hallways"],
    queryFn: async () => {
      console.log('🚶 Fetching hallways from API...');
      const response = await fetch("/api/hallways");
      if (!response.ok) throw new Error("Failed to fetch hallways");
      const data = await response.json();
      console.log('✅ Received hallways:', data.length, data);
      return data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const isLoading = buildingsLoading || roomsLoading || hallwaysLoading;

  // Memoize room type colors to avoid recalculation
  const getRoomColor = useMemo(() => (type: string) => {
    const colors: Record<string, string> = {
      classroom: '#3B82F6', lab: '#10B981', office: '#F59E0B',
      library: '#8B5CF6', gymnasium: '#EF4444', cafeteria: '#EC4899',
      toilet: '#6B7280', stairway: '#DC2626', elevator: '#7C3AED',
      hallway: '#9CA3AF'
    };
    return colors[type] || '#6B7280';
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected building
      if (e.key === 'Delete' && selectedBuilding && !isDrawing) {
        setBuildingToDelete(selectedBuilding);
        setDeleteConfirmOpen(true);
      }
      // Copy building (Ctrl+C)
      if (e.ctrlKey && e.key === 'c' && selectedBuilding) {
        setCopiedBuilding(selectedBuilding);
        alert('Building copied!');
      }
      // Paste building (Ctrl+V)
      if (e.ctrlKey && e.key === 'v' && copiedBuilding && !isDrawing) {
        const newBuilding = {
          ...copiedBuilding,
          name: copiedBuilding.name + ' Copy',
          mapPositionX: (copiedBuilding.mapPositionX || 0) + 100,
          mapPositionY: (copiedBuilding.mapPositionY || 0) + 100,
        };
        delete newBuilding.id;
        createBuildingMutation.mutate(newBuilding);
      }
      // Escape to cancel drawing
      if (e.key === 'Escape' && isDrawing) {
        cancelDrawing();
      }
      // Toggle grid (G key)
      if (e.key === 'g' && !isDrawing) {
        setShowGrid(!showGrid);
      }
      // Toggle snap (S key)
      if (e.key === 's' && !isDrawing) {
        setSnapEnabled(!snapEnabled);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBuilding, copiedBuilding, isDrawing, showGrid, snapEnabled]);

  const snapToGrid = (point: Point): Point => {
    if (!snapEnabled) return point;
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
  };

  const getSVGPoint = (e: React.MouseEvent<SVGSVGElement>): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    
    // Calculate point in SVG coordinate space using viewBox
    const x = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.width;
    const y = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.height;
    
    return snapToGrid({ x, y });
  };

  // Zoom functions - FIXED to zoom viewBox, not the whole page
  const handleZoomIn = () => {
    setViewBox(prev => {
      const newWidth = prev.width * 0.8; // Zoom in = smaller viewBox
      const newHeight = prev.height * 0.8;
      const centerX = prev.x + prev.width / 2;
      const centerY = prev.y + prev.height / 2;
      return {
        x: centerX - newWidth / 2,
        y: centerY - newHeight / 2,
        width: Math.max(newWidth, 500), // Min viewBox size
        height: Math.max(newHeight, 300)
      };
    });
  };
  
  const handleZoomOut = () => {
    setViewBox(prev => {
      const newWidth = prev.width * 1.25; // Zoom out = larger viewBox
      const newHeight = prev.height * 1.25;
      const centerX = prev.x + prev.width / 2;
      const centerY = prev.y + prev.height / 2;
      return {
        x: Math.max(0, centerX - newWidth / 2),
        y: Math.max(0, centerY - newHeight / 2),
        width: Math.min(newWidth, 10000), // Max viewBox size
        height: Math.min(newHeight, 6000)
      };
    });
  };
  
  const handleResetView = () => { 
    setViewBox({ x: 0, y: 0, width: 5000, height: 3000 });
  };
  
  // Pan functions - RIGHT CLICK TO DRAG!
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // RIGHT CLICK (button 2) for dragging - ALWAYS works!
    if (e.button === 2) {
      e.preventDefault(); // Prevent context menu
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Middle mouse also works
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Left click only for drawing mode
    if (e.button === 0 && !isDrawing) {
      // Allow left click drag when NOT drawing
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const dx = (e.clientX - panStart.x) * (viewBox.width / rect.width);
      const dy = (e.clientY - panStart.y) * (viewBox.height / rect.height);
      
      setViewBox(prev => ({
        ...prev,
        x: Math.max(0, Math.min(5000 - prev.width, prev.x - dx)),
        y: Math.max(0, Math.min(3000 - prev.height, prev.y - dy))
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (isDrawing && shapeMode === "rectangle" && rectStart) {
      setRectEnd(getSVGPoint(e));
    }
  };
  
  const handleMouseUp = () => {
    setIsPanning(false);
  };
  
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault(); // CRITICAL: Prevent page zoom!
    
    if (e.ctrlKey) {
      // Zoom with Ctrl+Scroll
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      // Get mouse position in SVG coordinates
      const mouseX = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.width;
      const mouseY = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.height;
      
      setViewBox(prev => {
        const newWidth = prev.width * zoomFactor;
        const newHeight = prev.height * zoomFactor;
        
        // Clamp viewBox size
        const clampedWidth = Math.max(500, Math.min(10000, newWidth));
        const clampedHeight = Math.max(300, Math.min(6000, newHeight));
        
        // Zoom towards mouse position
        const newX = mouseX - (mouseX - prev.x) * (clampedWidth / prev.width);
        const newY = mouseY - (mouseY - prev.y) * (clampedHeight / prev.height);
        
        return {
          x: Math.max(0, Math.min(5000 - clampedWidth, newX)),
          y: Math.max(0, Math.min(3000 - clampedHeight, newY)),
          width: clampedWidth,
          height: clampedHeight
        };
      });
    } else {
      // Pan with regular scroll
      const scrollSpeed = 2;
      setViewBox(prev => ({
        ...prev,
        x: Math.max(0, Math.min(5000 - prev.width, prev.x + e.deltaX * scrollSpeed)),
        y: Math.max(0, Math.min(3000 - prev.height, prev.y + e.deltaY * scrollSpeed))
      }));
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // Don't process clicks if we were panning
    if (isPanning) return;
    
    // Only process clicks in drawing mode
    if (!isDrawing || activeTool === "select") return;
    
    const point = getSVGPoint(e);
    
    if (shapeMode === "rectangle") {
      if (!rectStart) {
        setRectStart(point);
      } else {
        setRectEnd(point);
        // Auto-finish rectangle after second click
        setTimeout(() => finishDrawing(), 100);
      }
      return;
    }
    
    if (currentPoints.length > 2) {
      const firstPoint = currentPoints[0];
      const distance = Math.sqrt(Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2));
      if (distance < gridSize * 2) { finishDrawing(); return; }
    }
    setCurrentPoints([...currentPoints, point]);
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setCurrentPoints([]);
    setRectStart(null);
    setRectEnd(null);
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setCurrentPoints([]);
    setRectStart(null);
    setRectEnd(null);
  };

  const undoLastPoint = () => {
    if (shapeMode === "rectangle") {
      if (rectEnd) setRectEnd(null);
      else if (rectStart) setRectStart(null);
    } else if (currentPoints.length > 0) {
      setCurrentPoints(currentPoints.slice(0, -1));
    }
  };


  const finishDrawing = () => {
    let points = currentPoints;
    if (shapeMode === "rectangle" && rectStart && rectEnd) {
      const x1 = Math.min(rectStart.x, rectEnd.x), y1 = Math.min(rectStart.y, rectEnd.y);
      const x2 = Math.max(rectStart.x, rectEnd.x), y2 = Math.max(rectStart.y, rectEnd.y);
      points = [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }];
    }
    
    if (points.length < 3 && !(shapeMode === "rectangle" && rectStart && rectEnd)) {
      alert("Need at least 3 points!");
      return;
    }

    if (activeTool === "building") {
      if (!buildingData.name) { alert("Enter building name!"); return; }
      const xs = points.map(p => p.x), ys = points.map(p => p.y);
      createBuildingMutation.mutate({
        ...buildingData,
        floors: buildingData.floors.length || 1,
        mapPositionX: Math.min(...xs),
        mapPositionY: Math.min(...ys),
        description: JSON.stringify({ customShape: points })
      });
    } else if (activeTool === "room" || activeTool === "stairway" || activeTool === "door") {
      if (!roomData.buildingId || !roomData.roomNumber) {
        alert("Select building and enter room number!");
        return;
      }
      const xs = points.map(p => p.x), ys = points.map(p => p.y);
      const width = Math.max(...xs) - Math.min(...xs);
      const height = Math.max(...ys) - Math.min(...ys);
      createRoomMutation.mutate({
        ...roomData,
        mapPositionX: Math.min(...xs),
        mapPositionY: Math.min(...ys),
        width,
        height
      });
    } else if (activeTool === "hallway") {
      if (!hallwayData.buildingId || !hallwayData.name) {
        alert("Select building and enter hallway name!");
        return;
      }
      const xs = points.map(p => p.x), ys = points.map(p => p.y);
      createHallwayMutation.mutate({
        ...hallwayData,
        startX: Math.min(...xs),
        startY: Math.min(...ys),
        endX: Math.max(...xs),
        endY: Math.max(...ys),
        width: 2
      });
    }
  };

  const toggleFloor = (floor: number) => {
    const floors = buildingData.floors;
    if (floors.includes(floor)) {
      if (floors.length > 1) setBuildingData({ ...buildingData, floors: floors.filter(f => f !== floor) });
    } else {
      setBuildingData({ ...buildingData, floors: [...floors, floor].sort((a, b) => a - b) });
    }
  };

  const createBuildingMutation = useMutation({
    mutationFn: async (building: any) => {
      const response = await fetch("/api/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(building)
      });
      if (!response.ok) throw new Error("Failed to create building");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      alert("Building created!");
      cancelDrawing();
      setBuildingData({ name: "", nameEn: "", nameFi: "", floors: [1], capacity: 100, colorCode: "#3B82F6", mapPositionX: 0, mapPositionY: 0 });
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async (room: any) => {
      console.log('Creating room:', room);
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(room)
      });
      if (!response.ok) {
        const error = await response.text();
        console.error('Room creation failed:', error);
        throw new Error("Failed to create room");
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Room created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      alert("Room created!");
      cancelDrawing();
      setRoomData({ buildingId: "", roomNumber: "", name: "", nameEn: "", nameFi: "", floor: 1, capacity: 30, type: "classroom" });
    },
    onError: (error) => {
      console.error('Room creation error:', error);
      alert('Failed to create room: ' + error.message);
    }
  });

  const createHallwayMutation = useMutation({
    mutationFn: async (hallway: any) => {
      console.log('Creating hallway:', hallway);
      const response = await fetch("/api/hallways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(hallway)
      });
      if (!response.ok) {
        const error = await response.text();
        console.error('Hallway creation failed:', error);
        throw new Error("Failed to create hallway");
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Hallway created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ["hallways"] });
      alert("Hallway created!");
      cancelDrawing();
      setHallwayData({ buildingId: "", name: "", nameEn: "", nameFi: "", floor: 1 });
    },
    onError: (error) => {
      console.error('Hallway creation error:', error);
      alert('Failed to create hallway: ' + error.message);
    }
  });

  const deleteBuildingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/buildings/${id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error("Failed to delete building");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["buildings"] }),
  });

  const colors = [
    { name: "Blue", value: "#3B82F6" }, { name: "Red", value: "#EF4444" },
    { name: "Green", value: "#10B981" }, { name: "Purple", value: "#8B5CF6" },
    { name: "Orange", value: "#F97316" }, { name: "Teal", value: "#14B8A6" },
    { name: "Pink", value: "#EC4899" }, { name: "Yellow", value: "#EAB308" }
  ];

  const roomTypes = [
    { value: "classroom", label: "Classroom" }, { value: "lab", label: "Laboratory" },
    { value: "office", label: "Office" }, { value: "library", label: "Library" },
    { value: "gymnasium", label: "Gymnasium" }, { value: "cafeteria", label: "Cafeteria" },
    { value: "toilet", label: "Toilet" }, { value: "stairway", label: "Stairway" },
    { value: "elevator", label: "Elevator" }
  ];


  const renderCurrentShape = () => {
    if (shapeMode === "rectangle" && rectStart) {
      const end = rectEnd || rectStart;
      const x1 = Math.min(rectStart.x, end.x), y1 = Math.min(rectStart.y, end.y);
      const width = Math.abs(end.x - rectStart.x) || 1, height = Math.abs(end.y - rectStart.y) || 1;
      const color = activeTool === "building" ? buildingData.colorCode : 
                    activeTool === "room" ? getRoomColor(roomData.type) :
                    activeTool === "hallway" ? "#9CA3AF" :
                    activeTool === "door" ? "#F59E0B" : "#8B5CF6";
      return (
        <g>
          <rect x={x1} y={y1} width={width} height={height} fill={color} opacity="0.4" stroke={color} strokeWidth="3" strokeDasharray="8,4" />
          <circle cx={rectStart.x} cy={rectStart.y} r="8" fill={color} stroke="white" strokeWidth="2" />
          {rectEnd && <circle cx={rectEnd.x} cy={rectEnd.y} r="8" fill={color} stroke="white" strokeWidth="2" />}
        </g>
      );
    }
    
    if (currentPoints.length === 0) return null;
    const color = activeTool === "building" ? buildingData.colorCode : 
                  activeTool === "room" ? getRoomColor(roomData.type) :
                  activeTool === "hallway" ? "#9CA3AF" :
                  activeTool === "door" ? "#F59E0B" : "#8B5CF6";
    
    return (
      <g>
        {currentPoints.map((p, i) => i === 0 ? null : (
          <line key={i} x1={currentPoints[i-1].x} y1={currentPoints[i-1].y} x2={p.x} y2={p.y} stroke={color} strokeWidth="4" strokeDasharray="8,4" />
        ))}
        {currentPoints.length > 2 && (
          <>
            <line x1={currentPoints[currentPoints.length-1].x} y1={currentPoints[currentPoints.length-1].y} x2={currentPoints[0].x} y2={currentPoints[0].y} stroke={color} strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
            <polygon points={currentPoints.map(p => `${p.x},${p.y}`).join(" ")} fill={color} opacity="0.3" />
          </>
        )}
        {currentPoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="8" fill={color} stroke="white" strokeWidth="2" />
            <text x={p.x+12} y={p.y-8} fill={color} fontSize="14" fontWeight="bold">{i+1}</text>
          </g>
        ))}
        {currentPoints.length > 0 && (
          <circle cx={currentPoints[0].x} cy={currentPoints[0].y} r="16" fill="none" stroke={color} strokeWidth="2" className="animate-pulse" />
        )}
      </g>
    );
  };

  const tools = [
    { id: "building" as Tool, icon: Building, label: "Building", color: "bg-blue-600", hoverColor: "hover:bg-blue-700" },
    { id: "room" as Tool, icon: Home, label: "Room", color: "bg-purple-600", hoverColor: "hover:bg-purple-700" },
    { id: "hallway" as Tool, icon: Move, label: "Hallway", color: "bg-gray-600", hoverColor: "hover:bg-gray-700" },
    { id: "stairway" as Tool, icon: Layers, label: "Stairway/Elevator", color: "bg-green-600", hoverColor: "hover:bg-green-700" },
    { id: "door" as Tool, icon: Square, label: "Door", color: "bg-amber-600", hoverColor: "hover:bg-amber-700" },
  ];


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-2 md:p-4">
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-xl font-bold text-gray-800">Loading KSYK Builder...</p>
          </div>
        </div>
      )}
      
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="shadow-2xl border-2 border-blue-500 mb-4">
          <CardHeader className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white py-4 md:py-6">
            <CardTitle className="text-xl md:text-3xl flex flex-col md:flex-row items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Zap className="h-6 w-6 md:h-8 md:w-8" />
                <span>KSYK Campus Builder Pro</span>
              </span>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge className="bg-white/20 text-white px-3 py-1 text-sm">{buildings.length} Buildings</Badge>
                <Badge className="bg-white/20 text-white px-3 py-1 text-sm">{rooms.length} Rooms</Badge>
                <Badge className="bg-white/20 text-white px-3 py-1 text-sm">{hallways.length} Hallways</Badge>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="xl:col-span-1">
          <Card className="shadow-xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Tools & Properties
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-sm font-bold mb-2 block">Select Tool</Label>
                <div className="grid grid-cols-1 gap-2">
                  {tools.map((tool) => (
                    <motion.button
                      key={tool.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setActiveTool(tool.id); cancelDrawing(); }}
                      className={`p-3 rounded-lg border-2 flex items-center gap-3 transition-all ${
                        activeTool === tool.id
                          ? `${tool.color} text-white border-transparent shadow-lg`
                          : `bg-white border-gray-300 ${tool.hoverColor} hover:text-white`
                      }`}
                    >
                      <tool.icon className="h-5 w-5" />
                      <span className="font-semibold">{tool.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {activeTool === "building" && (
                  <motion.div key="building" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3 border-t pt-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-bold">Code *</Label>
                        <Input value={buildingData.name} onChange={(e) => setBuildingData({ ...buildingData, name: e.target.value })} placeholder="M, K, L" className="mt-1 h-9" />
                      </div>
                      <div>
                        <Label className="text-xs font-bold">English</Label>
                        <Input value={buildingData.nameEn} onChange={(e) => setBuildingData({ ...buildingData, nameEn: e.target.value })} placeholder="Music" className="mt-1 h-9" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Finnish</Label>
                      <Input value={buildingData.nameFi} onChange={(e) => setBuildingData({ ...buildingData, nameFi: e.target.value })} placeholder="Musiikkitalo" className="mt-1 h-9" />
                    </div>
                    <div>
                      <Label className="text-xs font-bold mb-2 block">Floors</Label>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5].map((floor) => (
                          <motion.button key={floor} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => toggleFloor(floor)} className={`w-9 h-9 rounded-lg border-2 font-bold transition-all ${buildingData.floors.includes(floor) ? "bg-blue-600 text-white border-blue-600 shadow-lg" : "bg-white text-gray-700 border-gray-300"}`}>{floor}</motion.button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-bold mb-2 block">Color</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {colors.map((color) => (
                          <motion.button key={color.value} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className={`h-9 rounded-lg border-2 transition-all ${buildingData.colorCode === color.value ? "border-black shadow-lg scale-110" : "border-gray-300"}`} style={{ backgroundColor: color.value }} onClick={() => setBuildingData({ ...buildingData, colorCode: color.value })} title={color.name} />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTool === "room" && (
                  <motion.div key="room" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3 border-t pt-4">
                    <div>
                      <Label className="text-xs font-bold">Building *</Label>
                      <select value={roomData.buildingId} onChange={(e) => setRoomData({ ...roomData, buildingId: e.target.value })} className="w-full p-2 border-2 rounded-lg mt-1 text-sm">
                        <option value="">Select Building</option>
                        {buildings.map((building: any) => (<option key={building.id} value={building.id}>{building.name} - {building.nameEn}</option>))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-bold">Room Number *</Label>
                        <Input value={roomData.roomNumber} onChange={(e) => setRoomData({ ...roomData, roomNumber: e.target.value })} placeholder="M12" className="mt-1 h-9" />
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Floor</Label>
                        <Input type="number" min="1" value={roomData.floor} onChange={(e) => setRoomData({ ...roomData, floor: parseInt(e.target.value) || 1 })} className="mt-1 h-9" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Type</Label>
                      <select value={roomData.type} onChange={(e) => setRoomData({ ...roomData, type: e.target.value })} className="w-full p-2 border-2 rounded-lg mt-1 text-sm">
                        {roomTypes.map((type) => (<option key={type.value} value={type.value}>{type.label}</option>))}
                      </select>
                    </div>
                  </motion.div>
                )}

                {activeTool === "stairway" && (
                  <motion.div key="stairway" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3 border-t pt-4">
                    <div>
                      <Label className="text-xs font-bold">Building *</Label>
                      <select value={roomData.buildingId} onChange={(e) => setRoomData({ ...roomData, buildingId: e.target.value })} className="w-full p-2 border-2 rounded-lg mt-1 text-sm">
                        <option value="">Select Building</option>
                        {buildings.map((building: any) => (<option key={building.id} value={building.id}>{building.name} - {building.nameEn}</option>))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-bold">Name *</Label>
                        <Input value={roomData.roomNumber} onChange={(e) => setRoomData({ ...roomData, roomNumber: e.target.value })} placeholder="Stairway A" className="mt-1 h-9" />
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Type</Label>
                        <select value={roomData.type} onChange={(e) => setRoomData({ ...roomData, type: e.target.value })} className="w-full p-2 border-2 rounded-lg mt-1 text-sm">
                          <option value="stairway">Stairway</option>
                          <option value="elevator">Elevator</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTool === "hallway" && (
                  <motion.div key="hallway" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3 border-t pt-4">
                    <div>
                      <Label className="text-xs font-bold">Building *</Label>
                      <select value={hallwayData.buildingId} onChange={(e) => setHallwayData({ ...hallwayData, buildingId: e.target.value })} className="w-full p-2 border-2 rounded-lg mt-1 text-sm">
                        <option value="">Select Building</option>
                        {buildings.map((building: any) => (<option key={building.id} value={building.id}>{building.name} - {building.nameEn}</option>))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Hallway Name *</Label>
                      <Input value={hallwayData.name} onChange={(e) => setHallwayData({ ...hallwayData, name: e.target.value })} placeholder="Main Hallway" className="mt-1 h-9" />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Floor</Label>
                      <Input type="number" min="1" value={hallwayData.floor} onChange={(e) => setHallwayData({ ...hallwayData, floor: parseInt(e.target.value) || 1 })} className="mt-1 h-9" />
                    </div>
                  </motion.div>
                )}

                {activeTool === "door" && (
                  <motion.div key="door" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3 border-t pt-4">
                    <div>
                      <Label className="text-xs font-bold">Building *</Label>
                      <select value={roomData.buildingId} onChange={(e) => setRoomData({ ...roomData, buildingId: e.target.value, type: "door" })} className="w-full p-2 border-2 rounded-lg mt-1 text-sm">
                        <option value="">Select Building</option>
                        {buildings.map((building: any) => (<option key={building.id} value={building.id}>{building.name} - {building.nameEn}</option>))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-bold">Door ID *</Label>
                        <Input value={roomData.roomNumber} onChange={(e) => setRoomData({ ...roomData, roomNumber: e.target.value })} placeholder="D1" className="mt-1 h-9" />
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Floor</Label>
                        <Input type="number" min="1" value={roomData.floor} onChange={(e) => setRoomData({ ...roomData, floor: parseInt(e.target.value) || 1 })} className="mt-1 h-9" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Connects To Building (Optional)</Label>
                      <select value={roomData.connectedRoomId} onChange={(e) => setRoomData({ ...roomData, connectedRoomId: e.target.value })} className="w-full p-2 border-2 rounded-lg mt-1 text-sm">
                        <option value="">No connection</option>
                        <optgroup label="Buildings">
                          {buildings.filter((b: any) => b.id !== roomData.buildingId).map((building: any) => (
                            <option key={`building-${building.id}`} value={`building-${building.id}`}>🏢 {building.name} - {building.nameEn}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Rooms">
                          {rooms.filter((r: any) => r.buildingId === roomData.buildingId && r.floor === roomData.floor).map((room: any) => (
                            <option key={room.id} value={room.id}>🚪 {room.roomNumber} - {room.type}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="border-t pt-4 space-y-2">
                <Label className="text-xs font-bold mb-2 block">Shape Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShapeMode("rectangle")} className={`p-2 rounded-lg border-2 flex items-center justify-center gap-2 transition-all text-sm ${shapeMode === "rectangle" ? "bg-blue-600 text-white border-blue-600 shadow-lg" : "bg-white border-gray-300 hover:border-blue-400"}`}>
                    <Square className="h-4 w-4" />Rectangle
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShapeMode("custom")} className={`p-2 rounded-lg border-2 flex items-center justify-center gap-2 transition-all text-sm ${shapeMode === "custom" ? "bg-blue-600 text-white border-blue-600 shadow-lg" : "bg-white border-gray-300 hover:border-blue-400"}`}>
                    <Move className="h-4 w-4" />Custom
                  </motion.button>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setSnapEnabled(!snapEnabled)} className={`w-full p-2 rounded-lg border-2 flex items-center justify-center gap-2 transition-all text-sm ${snapEnabled ? "bg-green-600 text-white border-green-600 shadow-lg" : "bg-white border-gray-300 hover:border-green-400"}`}>
                  <Layers className="h-4 w-4" />
                  Snap to Grid {snapEnabled ? "ON" : "OFF"}
                </motion.button>
              </div>

              <div className="border-t pt-4 space-y-2">
                {!isDrawing ? (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button onClick={startDrawing} className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg h-11">
                      <MousePointer className="h-4 w-4 mr-2" />Start Drawing
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    <div className="text-xs text-center text-blue-600 font-bold p-2 bg-blue-50 rounded-lg border-2 border-blue-200">
                      {shapeMode === "rectangle" ? (rectStart ? "Click second corner" : "Click first corner") : `Click to add points (${currentPoints.length})`}
                    </div>
                    <Button variant="outline" size="sm" onClick={undoLastPoint} className="w-full h-9"><Undo className="h-4 w-4 mr-2" />Undo</Button>
                    <Button size="sm" onClick={finishDrawing} disabled={shapeMode === "rectangle" ? !rectEnd : currentPoints.length < 3} className="w-full bg-blue-600 hover:bg-blue-700 h-9"><Check className="h-4 w-4 mr-2" />Finish</Button>
                    <Button variant="destructive" size="sm" onClick={cancelDrawing} className="w-full h-9"><X className="h-4 w-4 mr-2" />Cancel</Button>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="xl:col-span-3">
          <Card className="shadow-2xl border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Live Campus Map
                </CardTitle>
                <Badge className={`${isDrawing ? "bg-green-500 animate-pulse" : "bg-gray-500"} text-white px-3 py-1`}>
                  {isDrawing ? (shapeMode === "rectangle" ? "Drawing Rectangle" : `Drawing: ${currentPoints.length} pts`) : "View Mode"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                className="relative bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden" 
                style={{ height: "calc(100vh - 250px)", minHeight: "500px" }}
                onWheel={(e) => {
                  // Prevent page zoom when over the map
                  if (e.ctrlKey) {
                    e.preventDefault();
                  }
                }}
              >
                {/* Enhanced Zoom Controls with better styling */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  <motion.button 
                    whileHover={{ scale: 1.1 }} 
                    whileTap={{ scale: 0.95 }} 
                    onClick={handleZoomIn} 
                    className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-xl border-2 border-blue-400 hover:from-blue-600 hover:to-blue-700 transition-all group"
                    title="Zoom In (Ctrl + Scroll Up)"
                  >
                    <ZoomIn className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1 }} 
                    whileTap={{ scale: 0.95 }} 
                    onClick={handleZoomOut} 
                    className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-xl border-2 border-blue-400 hover:from-blue-600 hover:to-blue-700 transition-all group"
                    title="Zoom Out (Ctrl + Scroll Down)"
                  >
                    <ZoomOut className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1 }} 
                    whileTap={{ scale: 0.95 }} 
                    onClick={handleResetView} 
                    className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-xl border-2 border-green-400 hover:from-green-600 hover:to-green-700 transition-all group" 
                    title="Reset View (Show All)"
                  >
                    <Maximize2 className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1 }} 
                    whileTap={{ scale: 0.95 }} 
                    onClick={() => setShowGrid(!showGrid)} 
                    className={`p-3 rounded-xl shadow-xl border-2 transition-all group ${
                      showGrid 
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-400 hover:from-amber-600 hover:to-amber-700' 
                        : 'bg-white border-gray-300 hover:border-amber-400 hover:bg-amber-50'
                    }`} 
                    title="Toggle Grid (G)"
                  >
                    <Grid3x3 className={`h-6 w-6 group-hover:scale-110 transition-transform ${showGrid ? 'text-white' : 'text-gray-700'}`} />
                  </motion.button>
                </div>
                
                {/* Enhanced zoom indicator */}
                <div className="absolute bottom-4 right-4 z-10 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 rounded-2xl shadow-2xl border-2 border-white/20 text-white backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <ZoomIn className="h-5 w-5 text-white" />
                      <span className="text-2xl font-bold">{Math.round((5000 / viewBox.width) * 100)}%</span>
                    </div>
                    <div className="h-8 w-px bg-white/30"></div>
                    <div className="text-sm text-white/90 space-y-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <span>🖱️</span>
                        <span>Right-Click + Drag to Pan</span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <span>⌨️</span>
                        <span>Ctrl + Scroll to Zoom</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Mini-map navigator */}
                <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-2xl border-2 border-gray-300">
                  <div className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <Layers className="h-3 w-3" />
                    Navigator
                  </div>
                  <svg width="150" height="90" viewBox="0 0 5000 3000" className="border-2 border-gray-300 rounded bg-gray-50">
                    {/* Mini grid */}
                    <rect width="5000" height="3000" fill="#f9fafb" />
                    <rect width="5000" height="3000" fill="url(#smallGrid)" opacity="0.3" />
                    
                    {/* Buildings on minimap */}
                    {buildings.map((building: any) => {
                      const x = building.mapPositionX || 100;
                      const y = building.mapPositionY || 100;
                      return (
                        <rect
                          key={building.id}
                          x={x}
                          y={y}
                          width="150"
                          height="100"
                          fill={building.colorCode}
                          opacity="0.7"
                        />
                      );
                    })}
                    
                    {/* Current viewport indicator */}
                    <rect
                      x={viewBox.x}
                      y={viewBox.y}
                      width={viewBox.width}
                      height={viewBox.height}
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="40"
                      strokeDasharray="100,50"
                      opacity="0.8"
                    />
                  </svg>
                </div>
                
                <svg 
                  ref={svgRef} 
                  viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                  className={`w-full h-full select-none ${
                    isPanning ? 'cursor-grabbing' : 
                    isDrawing ? 'cursor-crosshair' : 
                    'cursor-grab'
                  }`} 
                  onClick={handleCanvasClick} 
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{ touchAction: 'none' }}
                >
                  <defs>
                    <pattern id="smallGrid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                      <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                    </pattern>
                    <pattern id="largeGrid" width={gridSize * 5} height={gridSize * 5} patternUnits="userSpaceOnUse">
                      <rect width={gridSize * 5} height={gridSize * 5} fill="url(#smallGrid)"/>
                      <path d={`M ${gridSize * 5} 0 L 0 0 0 ${gridSize * 5}`} fill="none" stroke="#d1d5db" strokeWidth="2"/>
                    </pattern>
                    <linearGradient id="buildingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: "white", stopOpacity: 0.4 }} />
                      <stop offset="100%" style={{ stopColor: "white", stopOpacity: 0 }} />
                    </linearGradient>
                  </defs>
                  <rect width="5000" height="3000" fill="white" />
                  {showGrid && <rect width="5000" height="3000" fill="url(#largeGrid)" />}
                  
                  {buildings.map((building: any) => {
                    const x = building.mapPositionX || 100, y = building.mapPositionY || 100;
                    let customShape = null;
                    try { if (building.description) customShape = JSON.parse(building.description).customShape; } catch {}
                    
                    const isSelected = selectedBuilding?.id === building.id;
                    
                    if (customShape && customShape.length > 2) {
                      const xs = customShape.map((p: Point) => p.x), ys = customShape.map((p: Point) => p.y);
                      const centerX = (Math.min(...xs) + Math.max(...xs)) / 2, centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
                      return (
                        <g key={building.id} className="cursor-pointer transition-all" onClick={() => setSelectedBuilding(building)}>
                          {/* Shadow */}
                          <polygon 
                            points={customShape.map((p: Point) => `${p.x + 4},${p.y + 4}`).join(" ")} 
                            fill="rgba(0,0,0,0.3)" 
                            opacity="0.5"
                          />
                          {/* Building */}
                          <polygon 
                            points={customShape.map((p: Point) => `${p.x},${p.y}`).join(" ")} 
                            fill={building.colorCode} 
                            stroke={isSelected ? "#FFD700" : "white"} 
                            strokeWidth={isSelected ? "6" : "4"} 
                            opacity="0.95"
                            className="transition-all"
                          />
                          {/* Highlight effect */}
                          <polygon 
                            points={customShape.map((p: Point) => `${p.x},${p.y}`).join(" ")} 
                            fill="url(#buildingGradient)" 
                            opacity="0.3"
                          />
                          <text x={centerX} y={centerY - 10} textAnchor="middle" fill="white" fontSize="28" fontWeight="900" style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.8)" }}>{building.name}</text>
                          <text x={centerX} y={centerY + 18} textAnchor="middle" fill="white" fontSize="12" fontWeight="600" style={{ opacity: 0.95 }}>{building.nameEn}</text>
                        </g>
                      );
                    }
                    
                    return (
                      <g key={building.id} className="cursor-pointer transition-all" onClick={() => setSelectedBuilding(building)}>
                        {/* Shadow */}
                        <rect 
                          x={x + 4} 
                          y={y + 4} 
                          width="150" 
                          height="100" 
                          fill="rgba(0,0,0,0.3)" 
                          rx="12" 
                          opacity="0.5"
                        />
                        {/* Building */}
                        <rect 
                          x={x} 
                          y={y} 
                          width="150" 
                          height="100" 
                          fill={building.colorCode} 
                          stroke={isSelected ? "#FFD700" : "white"} 
                          strokeWidth={isSelected ? "6" : "4"} 
                          rx="12" 
                          opacity="0.95"
                          className="transition-all"
                        />
                        {/* Highlight effect */}
                        <rect 
                          x={x} 
                          y={y} 
                          width="150" 
                          height="100" 
                          fill="url(#buildingGradient)" 
                          rx="12" 
                          opacity="0.3"
                        />
                        <text x={x + 75} y={y + 48} textAnchor="middle" fill="white" fontSize="32" fontWeight="900" style={{ textShadow: "2px 2px 6px rgba(0,0,0,0.8)" }}>{building.name}</text>
                        <text x={x + 75} y={y + 75} textAnchor="middle" fill="white" fontSize="13" fontWeight="600" opacity="0.95">{building.nameEn}</text>
                      </g>
                    );
                  })}
                  
                  {/* Rooms rendering */}
                  {rooms.map((room: any, index: number) => {
                    // Default position if not set
                    const roomX = room.mapPositionX || (100 + (index * 60));
                    const roomY = room.mapPositionY || 500;
                    const roomWidth = room.width || 40;
                    const roomHeight = room.height || 30;
                    const roomColor = getRoomColor(room.type);
                    
                    return (
                      <g key={room.id} className="cursor-pointer transition-all">
                        {/* Room shadow */}
                        <rect
                          x={roomX + 2}
                          y={roomY + 2}
                          width={roomWidth}
                          height={roomHeight}
                          fill="rgba(0,0,0,0.2)"
                          rx="4"
                        />
                        {/* Room */}
                        <rect
                          x={roomX}
                          y={roomY}
                          width={roomWidth}
                          height={roomHeight}
                          fill={roomColor}
                          stroke="white"
                          strokeWidth="2"
                          rx="4"
                          opacity="0.9"
                        />
                        {/* Room number */}
                        <text
                          x={roomX + roomWidth / 2}
                          y={roomY + roomHeight / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="12"
                          fontWeight="bold"
                          style={{ pointerEvents: 'none', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                        >
                          {room.roomNumber}
                        </text>
                      </g>
                    );
                  })}

                  {/* Hallways rendering - Enhanced with gradients and animations */}
                  {hallways.map((hallway: any, index: number) => {
                    const startX = hallway.startX || (200 + (index * 100));
                    const startY = hallway.startY || 400;
                    const endX = hallway.endX || (startX + 100);
                    const endY = hallway.endY || startY;
                    const width = hallway.width || 2;
                    const midX = (startX + endX) / 2;
                    const midY = (startY + endY) / 2;
                    
                    // Calculate angle for proper text rotation
                    const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
                    
                    return (
                      <g key={hallway.id} className="hallway-group cursor-pointer hover:opacity-100 transition-opacity" opacity="0.85">
                        {/* Shadow/glow effect */}
                        <line
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke="rgba(0,0,0,0.2)"
                          strokeWidth={(width * 10) + 4}
                          strokeLinecap="round"
                        />
                        {/* Main hallway line with gradient */}
                        <line
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke="#9CA3AF"
                          strokeWidth={width * 10}
                          strokeLinecap="round"
                          opacity="0.8"
                        />
                        {/* Highlight line on top */}
                        <line
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke="white"
                          strokeWidth={width * 4}
                          strokeLinecap="round"
                          opacity="0.3"
                        />
                        {/* Hallway label with background */}
                        <g transform={`translate(${midX}, ${midY - 15})`}>
                          <rect
                            x="-40"
                            y="-10"
                            width="80"
                            height="20"
                            fill="white"
                            stroke="#9CA3AF"
                            strokeWidth="2"
                            rx="4"
                            opacity="0.95"
                          />
                          <text
                            x="0"
                            y="4"
                            textAnchor="middle"
                            fill="#4B5563"
                            fontSize="11"
                            fontWeight="bold"
                          >
                            {hallway.name}
                          </text>
                        </g>
                        {/* Floor indicator */}
                        <circle
                          cx={startX}
                          cy={startY}
                          r="8"
                          fill="#6B7280"
                          stroke="white"
                          strokeWidth="2"
                        />
                        <text
                          x={startX}
                          y={startY + 1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="8"
                          fontWeight="bold"
                        >
                          {hallway.floor || 1}
                        </text>
                      </g>
                    );
                  })}
                  
                  {renderCurrentShape()}
                  
                  {/* Center crosshair guides */}
                  <line x1="2500" y1="0" x2="2500" y2="3000" stroke="#94a3b8" strokeWidth="2" strokeDasharray="10,10" opacity="0.3" />
                  <line x1="0" y1="1500" x2="5000" y2="1500" stroke="#94a3b8" strokeWidth="2" strokeDasharray="10,10" opacity="0.3" />
                </svg>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Buildings and Rooms Section - Full Width */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="mt-4">
        <Card className="shadow-xl border-2 border-gray-200">
          <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Buildings ({buildings.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
              {buildings.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <Building className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-semibold">No buildings yet</p>
                  <p className="text-sm">Click "Start Drawing" to create your first building!</p>
                </div>
              ) : (
                buildings.map((building: any) => (
                  <motion.div key={building.id} whileHover={{ scale: 1.03, y: -2 }} className="border-2 rounded-xl p-3 hover:shadow-xl transition-all cursor-pointer" style={{ borderColor: building.colorCode }} onClick={() => setSelectedBuilding(building)}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg" style={{ color: building.colorCode }}>{building.name}</h4>
                        <p className="text-sm text-gray-600 truncate">{building.nameEn}</p>
                      </div>
                      <div className="flex gap-1">
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setCopiedBuilding(building); alert('Building copied! Press Ctrl+V to paste'); }} className="p-1 hover:bg-blue-100 rounded" title="Copy (Ctrl+C)">
                          <Copy className="h-4 w-4 text-blue-600" />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setEditMode(true); setBuildingData({ name: building.name, nameEn: building.nameEn, nameFi: building.nameFi, floors: Array.isArray(building.floors) ? building.floors : [building.floors], capacity: building.capacity, colorCode: building.colorCode, mapPositionX: building.mapPositionX, mapPositionY: building.mapPositionY }); }} className="p-1 hover:bg-green-100 rounded" title="Edit">
                          <Edit className="h-4 w-4 text-green-600" />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setBuildingToDelete(building); setDeleteConfirmOpen(true); }} className="p-1 hover:bg-red-100 rounded" title="Delete (Del)">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </motion.button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        <span>{building.floors} Floor{building.floors > 1 ? "s" : ""}</span>
                      </div>
                      <div className="truncate">Pos: ({building.mapPositionX}, {building.mapPositionY})</div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Rooms Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="mt-4">
        <Card className="shadow-xl border-2 border-gray-200">
          <CardHeader className="bg-gradient-to-r from-purple-800 to-purple-900 text-white py-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Rooms ({rooms.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {rooms.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Home className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-semibold">No rooms yet</p>
                <p className="text-sm">Use the Room tool to add rooms to your buildings!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Group rooms by building */}
                {buildings.map((building: any) => {
                  const buildingRooms = rooms.filter((r: any) => r.buildingId === building.id);
                  if (buildingRooms.length === 0) return null;
                  
                  return (
                    <div key={building.id} className="border-2 rounded-xl p-4" style={{ borderColor: building.colorCode }}>
                      <h4 className="font-bold text-lg mb-3 flex items-center gap-2" style={{ color: building.colorCode }}>
                        <Building className="h-5 w-5" />
                        {building.name} - {building.nameEn}
                        <Badge variant="outline" className="ml-2">{buildingRooms.length} rooms</Badge>
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {buildingRooms.map((room: any) => {
                          const roomColor = getRoomColor(room.type);
                          
                          return (
                            <motion.div 
                              key={room.id} 
                              whileHover={{ scale: 1.05 }} 
                              className="border rounded-lg p-2 hover:shadow-md transition-all text-sm"
                              style={{ borderColor: roomColor, borderWidth: '2px' }}
                            >
                              <div className="font-bold text-center" style={{ color: roomColor }}>{room.roomNumber}</div>
                              <div className="flex items-center justify-between mt-1">
                                <Badge variant="outline" className="text-xs" style={{ borderColor: roomColor, color: roomColor }}>
                                  Floor {room.floor}
                                </Badge>
                                <span className="text-xs text-gray-500 capitalize">{room.type.replace('_', ' ')}</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Custom Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Building?"
        description={`Are you sure you want to delete "${buildingToDelete?.name}"? This action cannot be undone.`}
        onConfirm={() => {
          if (buildingToDelete) {
            deleteBuildingMutation.mutate(buildingToDelete.id);
            setSelectedBuilding(null);
            setBuildingToDelete(null);
          }
          setDeleteConfirmOpen(false);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Hallways Section - NEW */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="mt-4">
        <Card className="shadow-xl border-2 border-gray-200">
          <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-900 text-white py-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Move className="h-5 w-5" />
                Hallways & Connections ({hallways.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {hallways.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Move className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-semibold">No hallways yet</p>
                <p className="text-sm">Use the Hallway tool to create navigation paths!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Group hallways by building */}
                {buildings.map((building: any) => {
                  const buildingHallways = hallways.filter((h: any) => h.buildingId === building.id);
                  if (buildingHallways.length === 0) return null;
                  
                  return (
                    <div key={building.id} className="border-2 rounded-xl p-4 border-gray-400">
                      <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-gray-700">
                        <Building className="h-5 w-5" />
                        {building.name} - {building.nameEn}
                        <Badge variant="outline" className="ml-2">{buildingHallways.length} hallways</Badge>
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {buildingHallways.map((hallway: any) => {
                          const length = Math.sqrt(
                            Math.pow((hallway.endX || 0) - (hallway.startX || 0), 2) +
                            Math.pow((hallway.endY || 0) - (hallway.startY || 0), 2)
                          );
                          const lengthMeters = Math.round(length / 10);
                          
                          return (
                            <motion.div
                              key={hallway.id}
                              whileHover={{ scale: 1.03, y: -2 }}
                              className="border-2 border-gray-400 rounded-lg p-3 hover:shadow-lg transition-all bg-gradient-to-br from-gray-50 to-gray-100"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-bold text-gray-700 flex items-center gap-2">
                                  <Move className="h-4 w-4" />
                                  {hallway.name}
                                </div>
                                <Badge variant="outline" className="text-xs bg-white">
                                  Floor {hallway.floor || 1}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold">Width:</span>
                                  <span>{hallway.width || 2}m</span>
                                </div>
                                {lengthMeters > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold">Length:</span>
                                    <span>~{lengthMeters}m</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-gray-500">
                                  <span>({hallway.startX}, {hallway.startY}) → ({hallway.endX}, {hallway.endY})</span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
