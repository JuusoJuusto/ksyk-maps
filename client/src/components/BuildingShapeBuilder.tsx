import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Layers
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

export default function BuildingShapeBuilder() {
  const queryClient = useQueryClient();
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  
  const [buildingData, setBuildingData] = useState({
    name: "",
    nameEn: "",
    nameFi: "",
    description: "",
    floors: 1,
    capacity: 100,
    colorCode: "#3B82F6"
  });
  
  const [savedBuildings, setSavedBuildings] = useState<BuildingShape[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);

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
    
    // Check if clicking near the first point to close the shape
    if (currentPoints.length > 2) {
      const firstPoint = currentPoints[0];
      const distance = Math.sqrt(
        Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
      );
      
      if (distance < gridSize * 2) {
        // Close the shape
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

    // Calculate bounding box for position
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
      // Convert points to a format that can be stored
      const buildingWithShape = {
        ...building,
        // Store points as JSON string in description for now
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      
      // Save to local state
      const newBuilding: BuildingShape = {
        id: data.id,
        ...buildingData,
        points: currentPoints,
        mapPositionX: Math.min(...currentPoints.map(p => p.x)),
        mapPositionY: Math.min(...currentPoints.map(p => p.y))
      };
      setSavedBuildings([...savedBuildings, newBuilding]);
      
      alert("✅ Building created successfully!");
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

  const renderCurrentShape = () => {
    if (currentPoints.length === 0) return null;

    return (
      <g>
        {/* Lines between points */}
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
        
        {/* Closing line preview */}
        {currentPoints.length > 2 && (
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
        )}
        
        {/* Filled shape preview */}
        {currentPoints.length > 2 && (
          <polygon
            points={currentPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill={buildingData.colorCode}
            opacity="0.3"
          />
        )}
        
        {/* Points */}
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
        
        {/* First point indicator */}
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Panel - Controls */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardTitle className="text-lg flex items-center">
              <Building className="mr-2 h-5 w-5" />
              Building Designer
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Building Info */}
            <div>
              <Label htmlFor="buildingName" className="text-sm font-semibold">Building Code *</Label>
              <Input
                id="buildingName"
                value={buildingData.name}
                onChange={(e) => setBuildingData({ ...buildingData, name: e.target.value })}
                placeholder="M, K, L, etc."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="nameEn" className="text-sm">English Name</Label>
              <Input
                id="nameEn"
                value={buildingData.nameEn}
                onChange={(e) => setBuildingData({ ...buildingData, nameEn: e.target.value })}
                placeholder="Music Building"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="nameFi" className="text-sm">Finnish Name</Label>
              <Input
                id="nameFi"
                value={buildingData.nameFi}
                onChange={(e) => setBuildingData({ ...buildingData, nameFi: e.target.value })}
                placeholder="Musiikkitalo"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm">Description</Label>
              <Input
                id="description"
                value={buildingData.description}
                onChange={(e) => setBuildingData({ ...buildingData, description: e.target.value })}
                placeholder="Brief description"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="floors" className="text-sm">Floors</Label>
                <Input
                  id="floors"
                  type="number"
                  min="1"
                  max="10"
                  value={buildingData.floors}
                  onChange={(e) => setBuildingData({ ...buildingData, floors: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="capacity" className="text-sm">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={buildingData.capacity}
                  onChange={(e) => setBuildingData({ ...buildingData, capacity: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Building Color</Label>
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        buildingData.colorCode === color.value 
                          ? 'border-gray-900 scale-110 shadow-lg' 
                          : 'border-gray-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setBuildingData({ ...buildingData, colorCode: color.value })}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <Label className="text-xs">Custom:</Label>
                  <input
                    type="color"
                    value={buildingData.colorCode}
                    onChange={(e) => setBuildingData({ ...buildingData, colorCode: e.target.value })}
                    className="w-full h-10 rounded cursor-pointer border-2 border-gray-300"
                  />
                </div>
                <div className="text-xs text-gray-500 text-center font-mono">
                  {buildingData.colorCode}
                </div>
              </div>
            </div>

            {/* Grid Settings */}
            <div className="pt-4 border-t">
              <Label className="text-sm font-semibold mb-2 block">Grid Settings</Label>
              <div className="flex items-center space-x-2 mb-2">
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
            </div>

            {/* Drawing Controls */}
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
                    Undo Point ({currentPoints.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={finishBuilding}
                    disabled={currentPoints.length < 3}
                    className="w-full bg-blue-50 hover:bg-blue-100"
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

        {/* Instructions */}
        <Card>
          <CardHeader className="bg-gray-800 text-white">
            <CardTitle className="text-sm">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs space-y-2">
            <p>1. Fill in building details (name, floors, etc.)</p>
            <p>2. Choose a color for your building</p>
            <p>3. Click "Start Drawing"</p>
            <p>4. Click on canvas to add corner points</p>
            <p>5. Click near first point to close shape</p>
            <p>6. Or click "Finish Building" when done</p>
            <p>7. Your building appears on the canvas!</p>
            <p className="text-blue-400 font-semibold pt-2">
              💡 Tip: Points snap to grid for perfect alignment!
            </p>
            <p className="text-green-400 font-semibold">
              ✨ Buildings are saved and visible on the map!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Canvas */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <Square className="mr-2 h-5 w-5" />
                Drawing Canvas
              </CardTitle>
              <div className="flex items-center space-x-2">
                {isDrawing && (
                  <Badge variant="secondary" className="bg-green-500 text-white">
                    🎨 Drawing Mode Active
                  </Badge>
                )}
                <Badge variant="secondary">
                  {currentPoints.length} points
                </Badge>
                <Badge variant="secondary">
                  {savedBuildings.length} buildings saved
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative bg-gray-50 overflow-hidden" style={{ height: '700px' }}>
              {/* Status Bar */}
              <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur px-4 py-2 rounded-lg shadow-lg">
                <div className="text-sm font-semibold">
                  {isDrawing ? (
                    <span className="text-green-600">
                      🖱️ Click to add points • {currentPoints.length} points added
                      {currentPoints.length > 2 && " • Click near first point to close"}
                    </span>
                  ) : (
                    <span className="text-gray-600">
                      Click "Start Drawing" to begin creating your building
                    </span>
                  )}
                </div>
              </div>

              <svg
                ref={svgRef}
                viewBox="0 0 1000 700"
                className={`w-full h-full ${
                  isDrawing ? 'cursor-crosshair' : 'cursor-default'
                }`}
                onClick={handleCanvasClick}
              >
                {/* Grid */}
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

                {/* Saved Buildings */}
                {savedBuildings.map((building) => (
                  <g 
                    key={building.id} 
                    className="cursor-pointer"
                    onClick={() => setSelectedBuilding(building.id || null)}
                    opacity={selectedBuilding === building.id ? 1 : 0.7}
                  >
                    <polygon
                      points={building.points.map(p => `${p.x},${p.y}`).join(' ')}
                      fill={building.colorCode}
                      stroke={selectedBuilding === building.id ? "#fbbf24" : "#ffffff"}
                      strokeWidth={selectedBuilding === building.id ? "3" : "2"}
                      opacity="0.6"
                    />
                    <text
                      x={building.mapPositionX + 20}
                      y={building.mapPositionY + 30}
                      fill="white"
                      fontSize="20"
                      fontWeight="bold"
                      style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                    >
                      {building.name}
                    </text>
                  </g>
                ))}

                {/* Current Shape Being Drawn */}
                {renderCurrentShape()}

                {/* Center guide */}
                {!isDrawing && savedBuildings.length === 0 && (
                  <g opacity="0.3">
                    <line x1="500" y1="0" x2="500" y2="700" stroke="#94a3b8" strokeWidth="1" strokeDasharray="5,5" />
                    <line x1="0" y1="350" x2="1000" y2="350" stroke="#94a3b8" strokeWidth="1" strokeDasharray="5,5" />
                    <text x="510" y="360" fill="#94a3b8" fontSize="12">Center</text>
                  </g>
                )}
              </svg>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
