import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building, Plus, Trash2, MousePointer, X, Undo, Square, 
  Save, ZoomIn, ZoomOut, RotateCcw, Grid3x3, Layers
} from "lucide-react";

interface Point { x: number; y: number; }

type Tool = "wall" | "room" | "select";

export default function ImprovedKSYKBuilder() {
  const queryClient = useQueryClient();
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [activeTool, setActiveTool] = useState<Tool>("wall");
  const [isDrawing, setIsDrawing] = useState(false);
  const [walls, setWalls] = useState<Point[][]>([]);
  const [currentWall, setCurrentWall] = useState<Point[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [gridSize] = useState(50);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  
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
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / zoom) - panX;
    const y = ((e.clientY - rect.top) / zoom) - panY;
    
    return snapToGrid({ x, y });
  };

  // Handle mouse down on SVG
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const point = getSVGPoint(e);
    
    if (activeTool === "wall") {
      setIsDrawing(true);
      setCurrentWall([...currentWall, point]);
    } else if (activeTool === "room") {
      setRoomData({ ...roomData, x: point.x, y: point.y });
    }
  };

  // Handle mouse move on SVG
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || activeTool !== "wall") return;
    // Preview line while drawing
  };

  // Handle mouse up
  const handleMouseUp = () => {
    if (activeTool === "wall" && isDrawing) {
      // Continue drawing wall
    }
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
    setCurrentWall([]);
    setIsDrawing(false);
  };

  // Extract building letter from room number (A12 -> A, M1 -> M, U34 -> U)
  const extractBuilding = (roomNumber: string): string => {
    const match = roomNumber.match(/^([A-Z])/i);
    return match ? match[1].toUpperCase() : "";
  };

  // Add room
  const addRoom = () => {
    if (!roomData.roomNumber) {
      alert("Please enter a room number (e.g., A12, M1, U34)");
      return;
    }
    
    const building = extractBuilding(roomData.roomNumber);
    if (!building) {
      alert("Room number must start with a building letter (A, M, U, etc.)");
      return;
    }
    
    const newRoom = {
      ...roomData,
      id: `room-${Date.now()}`,
      building,
      mapPositionX: roomData.x,
      mapPositionY: roomData.y
    };
    
    setRooms([...rooms, newRoom]);
    
    // Reset form
    setRoomData({
      roomNumber: "",
      name: "",
      floor: 1,
      capacity: 30,
      type: "classroom",
      x: roomData.x + 120,
      y: roomData.y,
      width: 100,
      height: 80
    });
  };

  // Group rooms by building
  const groupedRooms = rooms.reduce((acc, room) => {
    const building = room.building;
    if (!acc[building]) acc[building] = [];
    acc[building].push(room);
    return acc;
  }, {} as Record<string, any[]>);

  // Save to database
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Create buildings from grouped rooms
      const buildingPromises = Object.entries(groupedRooms).map(async ([buildingLetter, buildingRooms]) => {
        // Calculate building bounds from rooms
        const minX = Math.min(...buildingRooms.map(r => r.mapPositionX));
        const minY = Math.min(...buildingRooms.map(r => r.mapPositionY));
        const maxX = Math.max(...buildingRooms.map(r => r.mapPositionX + r.width));
        const maxY = Math.max(...buildingRooms.map(r => r.mapPositionY + r.height));
        
        // Create building
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
        const building = await buildingResponse.json();
        
        // Create rooms for this building
        const roomPromises = buildingRooms.map(room => 
          fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
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
      alert('✅ Buildings and rooms saved successfully!');
    },
    onError: (error) => {
      console.error('Save error:', error);
      alert('❌ Failed to save. Please try again.');
    }
  });

  // Get color for building
  const getColorForBuilding = (letter: string): string => {
    const colors: Record<string, string> = {
      'A': '#3B82F6', // Blue
      'M': '#10B981', // Green
      'U': '#F59E0B', // Orange
      'K': '#8B5CF6', // Purple
      'L': '#EF4444', // Red
      'R': '#EC4899', // Pink
    };
    return colors[letter] || '#6B7280';
  };

  // Room type colors
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
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building className="h-6 w-6" />
            KSYK Builder v2.0
          </h1>
          
          <div className="flex gap-2">
            <Button
              variant={activeTool === "wall" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("wall")}
            >
              <Square className="h-4 w-4 mr-2" />
              Draw Walls
            </Button>
            <Button
              variant={activeTool === "room" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("room")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
            <Button
              variant={activeTool === "select" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("select")}
            >
              <MousePointer className="h-4 w-4 mr-2" />
              Select
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setZoom(1); setPanX(0); setPanY(0); }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={rooms.length === 0 || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Room Form */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Room</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="roomNumber">Room Number *</Label>
                <Input
                  id="roomNumber"
                  placeholder="e.g., A12, M1, U34"
                  value={roomData.roomNumber}
                  onChange={(e) => setRoomData({ ...roomData, roomNumber: e.target.value.toUpperCase() })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  First letter = Building (A, M, U, K, L, R)
                </p>
              </div>
              
              <div>
                <Label htmlFor="name">Room Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Physics Lab"
                  value={roomData.name}
                  onChange={(e) => setRoomData({ ...roomData, name: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  type="number"
                  min="0"
                  max="5"
                  value={roomData.floor}
                  onChange={(e) => setRoomData({ ...roomData, floor: parseInt(e.target.value) })}
                />
              </div>
              
              <div>
                <Label htmlFor="type">Room Type</Label>
                <Select
                  value={roomData.type}
                  onValueChange={(value) => setRoomData({ ...roomData, type: value })}
                >
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
                    <SelectItem value="stairway">Stairway</SelectItem>
                    <SelectItem value="hallway">Hallway</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="width">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    min="50"
                    value={roomData.width}
                    onChange={(e) => setRoomData({ ...roomData, width: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    min="50"
                    value={roomData.height}
                    onChange={(e) => setRoomData({ ...roomData, height: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              
              <Button onClick={addRoom} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            </CardContent>
          </Card>
          
          {/* Buildings Summary */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Buildings ({Object.keys(groupedRooms).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(groupedRooms).map(([building, buildingRooms]) => (
                <div key={building} className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg">{building} Building</span>
                    <span 
                      className="w-6 h-6 rounded" 
                      style={{ backgroundColor: getColorForBuilding(building) }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {buildingRooms.length} rooms
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {buildingRooms.map(room => (
                      <span 
                        key={room.id}
                        className="text-xs px-2 py-1 bg-white dark:bg-gray-800 rounded"
                      >
                        {room.roomNumber}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 relative overflow-hidden bg-gray-100 dark:bg-gray-950">
          <svg
            ref={svgRef}
            className="w-full h-full cursor-crosshair"
            viewBox={`${-panX} ${-panY} ${5000 / zoom} ${3000 / zoom}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
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
            {showGrid && <rect width="5000" height="3000" fill="url(#grid)" />}
            
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
            
            {/* Rooms */}
            {rooms.map((room) => (
              <g key={room.id}>
                <rect
                  x={room.mapPositionX}
                  y={room.mapPositionY}
                  width={room.width}
                  height={room.height}
                  fill={getRoomColor(room.type)}
                  stroke="white"
                  strokeWidth="3"
                  rx="5"
                  opacity="0.9"
                  className="cursor-pointer hover:opacity-100"
                  onClick={() => setSelectedRoom(room)}
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
              </g>
            ))}
          </svg>
          
          {/* Drawing Instructions */}
          {isDrawing && activeTool === "wall" && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
              Click to add points. Press ESC to cancel or click "Finish Wall" when done.
              <Button
                size="sm"
                variant="secondary"
                className="ml-4"
                onClick={finishWall}
              >
                Finish Wall
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-2"
                onClick={cancelDrawing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
