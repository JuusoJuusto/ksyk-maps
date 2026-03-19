import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building, Plus, Trash2, MousePointer, X, Save, ZoomIn, ZoomOut, 
  RotateCcw, Grid3x3, Layers, MapPin, Home, Square
} from "lucide-react";

interface Point { x: number; y: number; }

interface BuildingData {
  code: string;
  name: string;
  color: string;
  outline: Point[];
  rooms: RoomData[];
}

interface RoomData {
  id: string;
  roomNumber: string;
  name: string;
  floor: number;
  type: string;
  capacity: number;
  position: Point;
  width: number;
  height: number;
}

type Tool = "campus" | "building" | "room" | "select";

export default function KSYKBuilderV3() {
  const queryClient = useQueryClient();
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>("campus");
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Campus state
  const [campusOutline, setCampusOutline] = useState<Point[]>([]);
  const [campusClosed, setCampusClosed] = useState(false);
  
  // Buildings state
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [currentBuilding, setCurrentBuilding] = useState<BuildingData | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  
  // Room state
  const [roomData, setRoomData] = useState({
    roomNumber: "",
    name: "",
    floor: 1,
    capacity: 30,
    type: "classroom",
    width: 100,
    height: 80
  });
  
  // View state
  const [gridSize] = useState(50);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  
  // Snap point to grid
  const snapToGrid = (point: Point): Point => {
    if (!snapEnabled) return point;
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
  };

  // Get SVG coordinates from mouse event
  const getSVGPoint = (e: React.MouseEvent<SVGSVGElement>): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    
    return snapToGrid({ x: svgP.x, y: svgP.y });
  };

  // Handle mouse down on SVG
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const point = getSVGPoint(e);
    
    if (activeTool === "campus" && !campusClosed) {
      setCampusOutline([...campusOutline, point]);
      setIsDrawing(true);
    } else if (activeTool === "building" && currentBuilding) {
      setCurrentBuilding({
        ...currentBuilding,
        outline: [...currentBuilding.outline, point]
      });
      setIsDrawing(true);
    } else if (activeTool === "room" && selectedBuilding) {
      addRoomAtPosition(point);
    }
  };

  // Close campus outline
  const closeCampus = () => {
    if (campusOutline.length >= 3) {
      setCampusClosed(true);
      setIsDrawing(false);
      setActiveTool("building");
    }
  };

  // Start new building
  const startBuilding = (code: string, name: string, color: string) => {
    setCurrentBuilding({
      code,
      name,
      color,
      outline: [],
      rooms: []
    });
    setActiveTool("building");
  };

  // Finish building
  const finishBuilding = () => {
    if (currentBuilding && currentBuilding.outline.length >= 3) {
      setBuildings([...buildings, currentBuilding]);
      setSelectedBuilding(currentBuilding.code);
      setCurrentBuilding(null);
      setIsDrawing(false);
      setActiveTool("room");
    }
  };

  // Add room at position
  const addRoomAtPosition = (position: Point) => {
    if (!selectedBuilding || !roomData.roomNumber) {
      alert("Please enter a room number first!");
      return;
    }
    
    const building = buildings.find(b => b.code === selectedBuilding);
    if (!building) return;
    
    // Validate room number format (A32, M1, U205)
    const roomNumberPattern = /^[A-Z]\d+$/i;
    if (!roomNumberPattern.test(roomData.roomNumber)) {
      alert("Room number must be a letter followed by numbers (e.g., A32, M1, U205)");
      return;
    }
    
    // Check if room number starts with building code
    if (!roomData.roomNumber.toUpperCase().startsWith(building.code)) {
      alert(`Room number must start with building code "${building.code}" (e.g., ${building.code}32, ${building.code}1)`);
      return;
    }
    
    const newRoom: RoomData = {
      id: `room-${Date.now()}`,
      roomNumber: roomData.roomNumber.toUpperCase(),
      name: roomData.name,
      floor: roomData.floor,
      type: roomData.type,
      capacity: roomData.capacity,
      position,
      width: roomData.width,
      height: roomData.height
    };
    
    // Update building with new room
    const updatedBuildings = buildings.map(b => 
      b.code === selectedBuilding 
        ? { ...b, rooms: [...b.rooms, newRoom] }
        : b
    );
    setBuildings(updatedBuildings);
    
    // Auto-increment room number
    const match = roomData.roomNumber.match(/^([A-Z])(\d+)$/i);
    if (match) {
      const letter = match[1].toUpperCase();
      const number = parseInt(match[2]) + 1;
      setRoomData({ ...roomData, roomNumber: `${letter}${number}` });
    }
  };

  // Save to database
  const saveMutation = useMutation({
    mutationFn: async () => {
      const buildingPromises = buildings.map(async (building) => {
        // Calculate building bounds
        const xs = building.outline.map(p => p.x);
        const ys = building.outline.map(p => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        
        // Create building
        const buildingResponse = await fetch('/api/buildings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: building.code,
            nameEn: building.name,
            nameFi: building.name,
            floors: Math.max(...building.rooms.map(r => r.floor), 1),
            colorCode: building.color,
            mapPositionX: minX,
            mapPositionY: minY,
            description: JSON.stringify({
              customShape: building.outline
            })
          })
        });
        
        if (!buildingResponse.ok) throw new Error('Failed to create building');
        const buildingData = await buildingResponse.json();
        
        // Create rooms
        const roomPromises = building.rooms.map(room => 
          fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              buildingId: buildingData.id,
              roomNumber: room.roomNumber,
              name: room.name,
              nameEn: room.name,
              floor: room.floor,
              capacity: room.capacity,
              type: room.type,
              mapPositionX: room.position.x,
              mapPositionY: room.position.y,
              width: room.width,
              height: room.height
            })
          })
        );
        
        await Promise.all(roomPromises);
      });
      
      await Promise.all(buildingPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      alert('✅ Campus saved successfully!');
    },
    onError: (error) => {
      console.error('Save error:', error);
      alert('❌ Failed to save. Please try again.');
    }
  });

  // Get room color
  const getRoomColor = (type: string): string => {
    const colors: Record<string, string> = {
      classroom: '#60A5FA',
      lab: '#34D399',
      office: '#FBBF24',
      library: '#A78BFA',
      gymnasium: '#F87171',
      cafeteria: '#FB923C',
      toilet: '#94A3B8',
      stairway: '#EF4444',
      hallway: '#D1D5DB',
    };
    return colors[type] || '#9CA3AF';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building className="h-6 w-6" />
            KSYK Builder v3.0
          </h1>
          
          <div className="flex gap-2">
            <Button
              variant={activeTool === "campus" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("campus")}
              disabled={campusClosed}
            >
              <Home className="h-4 w-4 mr-2" />
              Campus Outline
            </Button>
            <Button
              variant={activeTool === "building" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("building")}
              disabled={!campusClosed}
            >
              <Building className="h-4 w-4 mr-2" />
              Buildings
            </Button>
            <Button
              variant={activeTool === "room" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("room")}
              disabled={buildings.length === 0}
            >
              <Square className="h-4 w-4 mr-2" />
              Rooms
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowGrid(!showGrid)}>
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(zoom + 0.2, 3))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={buildings.length === 0 || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 bg-white border-r p-4 overflow-y-auto">
          {/* Campus Section */}
          {!campusClosed && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Step 1: Campus Outline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Click on the canvas to draw the school boundary. Click at least 3 points.
                </p>
                <div className="space-y-2">
                  <p className="text-sm">Points: {campusOutline.length}</p>
                  <Button
                    onClick={closeCampus}
                    disabled={campusOutline.length < 3}
                    className="w-full"
                  >
                    Close Campus Outline
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Building Section */}
          {campusClosed && !currentBuilding && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Step 2: Add Buildings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Building Code *</Label>
                  <Input
                    id="buildingCode"
                    placeholder="A, M, U, K, L, R"
                    maxLength={1}
                    onChange={(e) => {
                      const code = e.target.value.toUpperCase();
                      if (code && /^[A-Z]$/.test(code)) {
                        const colors = {
                          'A': '#3B82F6', 'M': '#10B981', 'U': '#F59E0B',
                          'K': '#8B5CF6', 'L': '#EF4444', 'R': '#EC4899'
                        };
                        const color = colors[code as keyof typeof colors] || '#6B7280';
                        startBuilding(code, `${code} Building`, color);
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Single letter: A, M, U, K, L, or R
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Building Drawing */}
          {currentBuilding && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">
                  Drawing: {currentBuilding.code} Building
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Click to draw the building outline. At least 3 points needed.
                </p>
                <div className="space-y-2">
                  <p className="text-sm">Points: {currentBuilding.outline.length}</p>
                  <Button
                    onClick={finishBuilding}
                    disabled={currentBuilding.outline.length < 3}
                    className="w-full"
                  >
                    Finish Building
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentBuilding(null)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Room Section */}
          {buildings.length > 0 && !currentBuilding && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Square className="h-5 w-5" />
                  Step 3: Add Rooms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Building</Label>
                  <Select value={selectedBuilding || ""} onValueChange={setSelectedBuilding}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose building" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map(b => (
                        <SelectItem key={b.code} value={b.code}>
                          {b.code} Building ({b.rooms.length} rooms)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedBuilding && (
                  <>
                    <div>
                      <Label>Room Number *</Label>
                      <Input
                        placeholder={`${selectedBuilding}32, ${selectedBuilding}1`}
                        value={roomData.roomNumber}
                        onChange={(e) => setRoomData({ ...roomData, roomNumber: e.target.value.toUpperCase() })}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Format: {selectedBuilding}32 or {selectedBuilding}1 (no dash)
                      </p>
                    </div>

                    <div>
                      <Label>Room Name</Label>
                      <Input
                        placeholder="Physics Lab"
                        value={roomData.name}
                        onChange={(e) => setRoomData({ ...roomData, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Room Type</Label>
                      <Select value={roomData.type} onValueChange={(v) => setRoomData({ ...roomData, type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="classroom">Classroom</SelectItem>
                          <SelectItem value="lab">Laboratory</SelectItem>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="library">Library</SelectItem>
                          <SelectItem value="gymnasium">Gymnasium</SelectItem>
                          <SelectItem value="cafeteria">Cafeteria</SelectItem>
                          <SelectItem value="toilet">Toilet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <p className="text-sm text-blue-600">
                      Click on the canvas to place room
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Buildings Summary */}
          {buildings.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Buildings ({buildings.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {buildings.map(b => (
                  <div key={b.code} className="mb-2 p-2 bg-gray-50 rounded">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{b.code}</span>
                      <span className="text-sm text-gray-600">{b.rooms.length} rooms</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Canvas */}
        <div className="flex-1 relative overflow-hidden bg-gray-100">
          <svg
            ref={svgRef}
            className="w-full h-full cursor-crosshair"
            viewBox="0 0 10000 6000"
            onMouseDown={handleMouseDown}
          >
            {/* Grid */}
            {showGrid && (
              <>
                <defs>
                  <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                    <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="10000" height="6000" fill="url(#grid)" />
              </>
            )}
            
            {/* Campus Outline */}
            {campusOutline.length > 0 && (
              <polyline
                points={campusOutline.map(p => `${p.x},${p.y}`).join(' ')}
                fill={campusClosed ? "rgba(59, 130, 246, 0.1)" : "none"}
                stroke="#3B82F6"
                strokeWidth="4"
                strokeDasharray={campusClosed ? "0" : "10,5"}
                strokeLinejoin="round"
              />
            )}
            
            {/* Buildings */}
            {buildings.map((building) => (
              <g key={building.code}>
                <polygon
                  points={building.outline.map(p => `${p.x},${p.y}`).join(' ')}
                  fill={`${building.color}33`}
                  stroke={building.color}
                  strokeWidth="3"
                />
                <text
                  x={building.outline[0].x + 20}
                  y={building.outline[0].y + 40}
                  fill={building.color}
                  fontSize="32"
                  fontWeight="bold"
                >
                  {building.code}
                </text>
                
                {/* Rooms in this building */}
                {building.rooms.map((room) => (
                  <g key={room.id}>
                    <rect
                      x={room.position.x}
                      y={room.position.y}
                      width={room.width}
                      height={room.height}
                      fill={getRoomColor(room.type)}
                      stroke="white"
                      strokeWidth="2"
                      rx="4"
                      opacity="0.9"
                    />
                    <text
                      x={room.position.x + room.width / 2}
                      y={room.position.y + room.height / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="14"
                      fontWeight="bold"
                    >
                      {room.roomNumber}
                    </text>
                  </g>
                ))}
              </g>
            ))}
            
            {/* Current Building Being Drawn */}
            {currentBuilding && currentBuilding.outline.length > 0 && (
              <polyline
                points={currentBuilding.outline.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={currentBuilding.color}
                strokeWidth="3"
                strokeDasharray="10,5"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
