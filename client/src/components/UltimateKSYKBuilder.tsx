import { useState, useRef, useEffect } from "react";
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

type Tool = "select" | "building" | "room" | "stairway" | "hallway";
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
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
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
    floor: 1, capacity: 30, type: "classroom"
  });


  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/buildings");
      if (!response.ok) throw new Error("Failed to fetch buildings");
      return response.json();
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await fetch("/api/rooms");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
  });

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
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return snapToGrid({ x: svgP.x, y: svgP.y });
  };

  // Zoom functions
  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.5));
  const handleResetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  
  // Pan functions
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Middle mouse or Ctrl+Click
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (isDrawing && shapeMode === "rectangle" && rectStart) {
      setRectEnd(getSVGPoint(e));
    }
  };
  
  const handleMouseUp = () => {
    setIsPanning(false);
  };
  
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(Math.max(0.5, Math.min(3, zoom * delta)));
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) return;
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
    } else if (activeTool === "room") {
      if (!roomData.buildingId || !roomData.roomNumber) {
        alert("Select building and enter room number!");
        return;
      }
      createRoomMutation.mutate(roomData);
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
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(room)
      });
      if (!response.ok) throw new Error("Failed to create room");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      alert("Room created!");
      setRoomData({ buildingId: "", roomNumber: "", name: "", nameEn: "", nameFi: "", floor: 1, capacity: 30, type: "classroom" });
    },
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
      const color = activeTool === "building" ? buildingData.colorCode : "#8B5CF6";
      return (
        <g>
          <rect x={x1} y={y1} width={width} height={height} fill={color} opacity="0.4" stroke={color} strokeWidth="3" strokeDasharray="8,4" />
          <circle cx={rectStart.x} cy={rectStart.y} r="8" fill={color} stroke="white" strokeWidth="2" />
          {rectEnd && <circle cx={rectEnd.x} cy={rectEnd.y} r="8" fill={color} stroke="white" strokeWidth="2" />}
        </g>
      );
    }
    
    if (currentPoints.length === 0) return null;
    const color = activeTool === "building" ? buildingData.colorCode : "#8B5CF6";
    
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
    { id: "stairway" as Tool, icon: Layers, label: "Stairway/Elevator", color: "bg-green-600", hoverColor: "hover:bg-green-700" },
  ];


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-2 md:p-4">
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
              <div className="relative bg-white" style={{ height: "calc(100vh - 250px)", minHeight: "500px" }}>
                {/* Zoom Controls */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleZoomIn} className="p-2 bg-white rounded-lg shadow-lg border-2 border-gray-300 hover:border-blue-500">
                    <ZoomIn className="h-5 w-5 text-gray-700" />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleZoomOut} className="p-2 bg-white rounded-lg shadow-lg border-2 border-gray-300 hover:border-blue-500">
                    <ZoomOut className="h-5 w-5 text-gray-700" />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleResetView} className="p-2 bg-white rounded-lg shadow-lg border-2 border-gray-300 hover:border-blue-500">
                    <Maximize2 className="h-5 w-5 text-gray-700" />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowGrid(!showGrid)} className={`p-2 rounded-lg shadow-lg border-2 ${showGrid ? 'bg-green-500 border-green-600' : 'bg-white border-gray-300'}`}>
                    <Grid3x3 className={`h-5 w-5 ${showGrid ? 'text-white' : 'text-gray-700'}`} />
                  </motion.button>
                </div>
                
                {/* Zoom indicator */}
                <div className="absolute bottom-4 right-4 z-10 bg-white px-3 py-1 rounded-lg shadow-lg border-2 border-gray-300 text-sm font-bold">
                  {Math.round(zoom * 100)}%
                </div>
                
                <svg 
                  ref={svgRef} 
                  viewBox="0 0 2000 1200" 
                  className={`w-full h-full ${isPanning ? 'cursor-grabbing' : isDrawing ? 'cursor-crosshair' : 'cursor-grab'}`} 
                  onClick={handleCanvasClick} 
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center', transition: isPanning ? 'none' : 'transform 0.1s ease' }}
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
                  <rect width="100%" height="100%" fill="white" />
                  {showGrid && <rect width="100%" height="100%" fill="url(#largeGrid)" />}
                  
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
                  
                  {renderCurrentShape()}
                  
                  <line x1="1000" y1="0" x2="1000" y2="1200" stroke="#94a3b8" strokeWidth="1" strokeDasharray="5,5" opacity="0.3" />
                  <line x1="0" y1="600" x2="2000" y2="600" stroke="#94a3b8" strokeWidth="1" strokeDasharray="5,5" opacity="0.3" />
                </svg>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
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
    </div>
      
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
    </div>
  );
}
