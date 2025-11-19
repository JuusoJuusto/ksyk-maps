import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building, 
  Save, 
  Trash2, 
  Undo, 
  Grid3x3,
  MousePointer,
  Square,
  X,
  Check,
  Home,
  Layers,
  Plus,
  Edit,
  MapPin,
  Zap
} from "lucide-react";

interface Point {
  x: number;
  y: number;
}

interface BuildingShape {
  id?: string;
  name: string;
  nameEn: string;
  nameFi: string;
  description?: string;
  floors: number;
  capacity: number;
  colorCode: string;
  points: Point[];
  mapPositionX: number;
  mapPositionY: number;
}

export default function UnifiedKSYKBuilder() {
  const queryClient = useQueryClient();
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [builderMode, setBuilderMode] = useState<'buildings' | 'rooms' | 'shapes'>('shapes');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [showGrid, setShowGrid] = useState(true);
  
  const [buildingData, setBuildingData] = useState({
    name: "",
    nameEn: "",
    nameFi: "",
    description: "",
    floors: 1,
    capacity: 100,
    colorCode: "#3B82F6"
  });

  const [roomData, setRoomData] = useState({
    buildingId: "",
    roomNumber: "",
    name: "",
    nameEn: "",
    floor: 1,
    capacity: 30,
    type: "classroom",
    colorCode: "#6B7280"
  });

  // Fetch existing data
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

  const snapToGrid = (point: Point): Point => {
    if (!showGrid) return point;
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

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    
    const point = getSVGPoint(e);
    
    if (currentPoints.length > 2) {
      const firstPoint = currentPoints[0];
      const distance = Math.sqrt(
        Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
      );
      
      if (distance < gridSize * 2) {
        finishBuilding();
        return;
      }
    }
    
    setCurrentPoints([...currentPoints, point]);
  };

  const undoLastPoint = () => {
    if (currentPoints.length > 0) {
      setCurrentPoints(currentPoints.slice(0, -1));
    }
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setCurrentPoints([]);
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const finishBuilding = () => {
    if (currentPoints.length < 3) {
      alert("A building needs at least 3 points!");
      return;
    }
    
    if (!buildingData.name) {
      alert("Please enter a building name!");
      return;
    }

    const xs = currentPoints.map(p => p.x);
    const ys = currentPoints.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);

    const buildingShape: BuildingShape = {
      ...buildingData,
      points: currentPoints,
      mapPositionX: minX,
      mapPositionY: minY
    };

    createBuildingMutation.mutate(buildingShape);
  };

  const createBuildingMutation = useMutation({
    mutationFn: async (building: BuildingShape) => {
      const buildingWithShape = {
        ...building,
        description: building.description || JSON.stringify({ customShape: building.points })
      };
      
      const response = await fetch("/api/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildingWithShape),
      });
      
      if (!response.ok) throw new Error("Failed to create building");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      alert("✅ Building created and synced to map!");
      setIsDrawing(false);
      setCurrentPoints([]);
      setBuildingData({
        name: "",
        nameEn: "",
        nameFi: "",
        description: "",
        floors: 1,
        capacity: 100,
        colorCode: "#3B82F6"
      });
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async (room: any) => {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(room),
      });
      if (!response.ok) throw new Error("Failed to create room");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      alert("✅ Room created and synced!");
      setRoomData({
        buildingId: "",
        roomNumber: "",
        name: "",
        nameEn: "",
        floor: 1,
        capacity: 30,
        type: "classroom",
        colorCode: "#6B7280"
      });
    },
  });

  const deleteBuildingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/buildings/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete building");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      alert("✅ Building deleted!");
    },
  });

  const renderCurrentShape = () => {
    if (currentPoints.length === 0) return null;

    return (
      <g>
        {currentPoints.map((p, i) => {
          if (i === 0) return null;
          const prev = currentPoints[i - 1];
          return (
            <line
              key={i}
              x1={prev.x}
              y1={prev.y}
              x2={p.x}
              y2={p.y}
              stroke={buildingData.colorCode}
              strokeWidth="4"
              strokeDasharray="8,4"
            />
          );
        })}
        
        {currentPoints.length > 2 && (
          <>
            <line
              x1={currentPoints[currentPoints.length - 1].x}
              y1={currentPoints[currentPoints.length - 1].y}
              x2={currentPoints[0].x}
              y2={currentPoints[0].y}
              stroke={buildingData.colorCode}
              strokeWidth="2"
              strokeDasharray="4,4"
              opacity="0.5"
            />
            <polygon
              points={currentPoints.map(p => `${p.x},${p.y}`).join(' ')}
              fill={buildingData.colorCode}
              opacity="0.3"
            />
          </>
        )}
        
        {currentPoints.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="6"
              fill={buildingData.colorCode}
              stroke="white"
              strokeWidth="2"
            />
            <text
              x={p.x + 10}
              y={p.y - 10}
              fill={buildingData.colorCode}
              fontSize="12"
              fontWeight="bold"
            >
              {i + 1}
            </text>
          </g>
        ))}
        
        {currentPoints.length > 0 && (
          <circle
            cx={currentPoints[0].x}
            cy={currentPoints[0].y}
            r="12"
            fill="none"
            stroke={buildingData.colorCode}
            strokeWidth="2"
            className="animate-pulse"
          />
        )}
      </g>
    );
  };

  const colors = [
    { name: "Blue", value: "#3B82F6" },
    { name: "Red", value: "#EF4444" },
    { name: "Green", value: "#10B981" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Orange", value: "#F97316" },
    { name: "Pink", value: "#EC4899" },
    { name: "Indigo", value: "#6366F1" },
    { name: "Teal", value: "#14B8A6" }
  ];

  const roomTypes = [
    { value: "classroom", label: "Classroom" },
    { value: "lab", label: "Laboratory" },
    { value: "office", label: "Office" },
    { value: "library", label: "Library" },
    { value: "gymnasium", label: "Gymnasium" },
    { value: "cafeteria", label: "Cafeteria" },
    { value: "hallway", label: "Hallway" },
    { value: "toilet", label: "Toilet" }
  ];

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <Card className="shadow-xl border-2 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
          <CardTitle className="text-3xl flex items-center justify-between">
            <span className="flex items-center">
              <Zap className="mr-3 h-8 w-8" />
              KSYK Professional Builder
            </span>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-white/20 text-white">
                {buildings.length} Buildings
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white">
                {rooms.length} Rooms
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex space-x-3">
            <Button
              onClick={() => setBuilderMode('shapes')}
              className={`flex-1 h-16 text-lg ${builderMode === 'shapes' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 hover:bg-gray-500'}`}
            >
              <Building className="mr-2 h-6 w-6" />
              Custom Shapes
            </Button>
            <Button
              onClick={() => setBuilderMode('buildings')}
              className={`flex-1 h-16 text-lg ${builderMode === 'buildings' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 hover:bg-gray-500'}`}
            >
              <Square className="mr-2 h-6 w-6" />
              Buildings
            </Button>
            <Button
              onClick={() => setBuilderMode('rooms')}
              className={`flex-1 h-16 text-lg ${builderMode === 'rooms' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 hover:bg-gray-500'}`}
            >
              <Home className="mr-2 h-6 w-6" />
              Rooms
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-1 space-y-4">
          {builderMode === 'shapes' && (
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Custom Shape Builder
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label>Building Code *</Label>
                  <Input
                    value={buildingData.name}
                    onChange={(e) => setBuildingData({ ...buildingData, name: e.target.value })}
                    placeholder="M, K, L"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>English Name</Label>
                    <Input
                      value={buildingData.nameEn}
                      onChange={(e) => setBuildingData({ ...buildingData, nameEn: e.target.value })}
                      placeholder="Music Building"
                    />
                  </div>
                  <div>
                    <Label>Finnish Name</Label>
                    <Input
                      value={buildingData.nameFi}
                      onChange={(e) => setBuildingData({ ...buildingData, nameFi: e.target.value })}
                      placeholder="Musiikkitalo"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Floors</Label>
                    <Input
                      type="number"
                      min="1"
                      value={buildingData.floors}
                      onChange={(e) => setBuildingData({ ...buildingData, floors: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      value={buildingData.capacity}
                      onChange={(e) => setBuildingData({ ...buildingData, capacity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="space-y-2 mt-2">
                    <div className="grid grid-cols-4 gap-2">
                      {colors.map((color) => (
                        <button
                          key={color.value}
                          className={`w-full h-10 rounded-lg border-2 ${
                            buildingData.colorCode === color.value ? 'border-gray-900 scale-110' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => setBuildingData({ ...buildingData, colorCode: color.value })}
                        />
                      ))}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label className="text-xs">Custom:</Label>
                      <input
                        type="color"
                        value={buildingData.colorCode}
                        onChange={(e) => setBuildingData({ ...buildingData, colorCode: e.target.value })}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      Current: {buildingData.colorCode}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 pt-4 border-t">
                  {!isDrawing ? (
                    <Button
                      onClick={startDrawing}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <MousePointer className="h-4 w-4 mr-2" />
                      Start Drawing
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={undoLastPoint}
                        disabled={currentPoints.length === 0}
                        className="w-full"
                      >
                        <Undo className="h-4 w-4 mr-2" />
                        Undo ({currentPoints.length})
                      </Button>
                      <Button
                        size="sm"
                        onClick={finishBuilding}
                        disabled={currentPoints.length < 3}
                        className="w-full bg-blue-600"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Finish Building
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={cancelDrawing}
                        className="w-full"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {builderMode === 'rooms' && (
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <CardTitle className="flex items-center">
                  <Home className="mr-2 h-5 w-5" />
                  Room Creator
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label>Building *</Label>
                  <select
                    value={roomData.buildingId}
                    onChange={(e) => setRoomData({ ...roomData, buildingId: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select Building</option>
                    {buildings.map((building: any) => (
                      <option key={building.id} value={building.id}>
                        {building.name} - {building.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Room Number *</Label>
                  <Input
                    value={roomData.roomNumber}
                    onChange={(e) => setRoomData({ ...roomData, roomNumber: e.target.value })}
                    placeholder="M12, K15"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Floor</Label>
                    <Input
                      type="number"
                      min="1"
                      value={roomData.floor}
                      onChange={(e) => setRoomData({ ...roomData, floor: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      value={roomData.capacity}
                      onChange={(e) => setRoomData({ ...roomData, capacity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Room Type</Label>
                  <select
                    value={roomData.type}
                    onChange={(e) => setRoomData({ ...roomData, type: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    {roomTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={() => createRoomMutation.mutate(roomData)}
                  disabled={!roomData.buildingId || !roomData.roomNumber}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Room
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Grid Settings */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gray-800 text-white">
              <CardTitle className="text-sm flex items-center">
                <Grid3x3 className="mr-2 h-4 w-4" />
                Grid Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Show Grid</span>
              </div>
              <div className="flex items-center space-x-2">
                <Label className="text-xs">Size:</Label>
                <Input
                  type="number"
                  value={gridSize}
                  onChange={(e) => setGridSize(parseInt(e.target.value) || 20)}
                  min="10"
                  max="50"
                  className="w-20 h-8"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Live Map Preview */}
        <div className="lg:col-span-2">
          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  Live Campus Map Preview
                </CardTitle>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {isDrawing ? `Drawing: ${currentPoints.length} points` : 'Ready'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative bg-gray-50" style={{ height: '700px' }}>
                <svg
                  ref={svgRef}
                  viewBox="0 0 1000 700"
                  className={`w-full h-full ${isDrawing ? 'cursor-crosshair' : 'cursor-default'}`}
                  onClick={handleCanvasClick}
                >
                  {showGrid && (
                    <defs>
                      <pattern id="smallGrid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                        <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                      </pattern>
                      <pattern id="grid" width={gridSize * 5} height={gridSize * 5} patternUnits="userSpaceOnUse">
                        <rect width={gridSize * 5} height={gridSize * 5} fill="url(#smallGrid)"/>
                        <path d={`M ${gridSize * 5} 0 L 0 0 0 ${gridSize * 5}`} fill="none" stroke="#d1d5db" strokeWidth="1"/>
                      </pattern>
                    </defs>
                  )}
                  <rect width="100%" height="100%" fill="white" />
                  {showGrid && <rect width="100%" height="100%" fill="url(#grid)" />}

                  {/* Existing Buildings */}
                  {buildings.map((building: any) => {
                    const x = building.mapPositionX || 100;
                    const y = building.mapPositionY || 100;
                    
                    return (
                      <g key={building.id}>
                        <rect
                          x={x}
                          y={y}
                          width="160"
                          height="120"
                          fill={building.colorCode}
                          stroke="#ffffff"
                          strokeWidth="2"
                          rx="4"
                          opacity="0.8"
                        />
                        <text
                          x={x + 80}
                          y={y + 60}
                          textAnchor="middle"
                          className="fill-white font-bold text-2xl"
                          style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                        >
                          {building.name}
                        </text>
                      </g>
                    );
                  })}

                  {/* Current Shape */}
                  {renderCurrentShape()}
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Buildings List */}
          {builderMode === 'buildings' && (
            <Card className="shadow-lg mt-6">
              <CardHeader className="bg-gray-800 text-white">
                <CardTitle>Existing Buildings ({buildings.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {buildings.map((building: any) => (
                    <div key={building.id} className="border-2 rounded-lg p-3 hover:shadow-lg transition-shadow" style={{ borderColor: building.colorCode }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg">{building.name}</h4>
                          <p className="text-sm text-gray-600">{building.nameEn}</p>
                          <p className="text-xs text-gray-500">{building.floors} floors</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => {
                            if (confirm(`Delete ${building.name}?`)) {
                              deleteBuildingMutation.mutate(building.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
