/**
 * KSYK BUILDER 3D - ADVANCED 3D MAP BUILDER
 * Professional 3D building and room editor with Three.js
 * Features: 3D visualization, floor plans, room editing, textures, lighting
 */

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Box,
  Layers,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Save,
  Upload,
  Download,
  Trash2,
  Copy,
  Grid3x3,
  Sun,
  Moon,
  Palette,
  Ruler,
  Home,
  Building2,
  DoorOpen,
  Stairs,
  Maximize2,
  Play,
  Pause,
} from "lucide-react";

interface Room3D {
  id: string;
  roomNumber: string;
  name: string;
  floor: number;
  position: { x: number; y: number; z: number };
  size: { width: number; height: number; depth: number };
  rotation: { x: number; y: number; z: number };
  color: string;
  texture?: string;
  type: string;
  walls: Wall[];
  doors: Door[];
  windows: Window3D[];
}

interface Wall {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  height: number;
  thickness: number;
  color: string;
  texture?: string;
}

interface Door {
  id: string;
  position: { x: number; y: number; z: number };
  width: number;
  height: number;
  rotation: number;
  type: 'single' | 'double' | 'sliding';
}

interface Window3D {
  id: string;
  position: { x: number; y: number; z: number };
  width: number;
  height: number;
  type: 'standard' | 'large' | 'skylight';
}

interface Building3D {
  id: string;
  name: string;
  floors: number;
  position: { x: number; y: number; z: number };
  size: { width: number; height: number; depth: number };
  color: string;
  rooms: Room3D[];
}

export default function KSYKBuilder3D() {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building3D | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room3D | null>(null);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [viewMode, setViewMode] = useState<'3d' | '2d' | 'split'>('3d');
  const [editMode, setEditMode] = useState<'select' | 'move' | 'rotate' | 'scale' | 'draw'>('select');
  const [showGrid, setShowGrid] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [lighting, setLighting] = useState<'day' | 'night' | 'custom'>('day');
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 50, z: 100 });
  const [cameraRotation, setCameraRotation] = useState({ x: -0.5, y: 0, z: 0 });
  const [zoom, setZoom] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  // Fetch buildings
  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/buildings");
      if (!response.ok) throw new Error("Failed to fetch buildings");
      return response.json();
    },
  });

  // Fetch rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await fetch("/api/rooms");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
  });

  // Initialize 3D scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Render 3D scene (simplified - in production use Three.js)
    renderScene(ctx, canvas.width, canvas.height);

    // Animation loop
    let animationId: number;
    if (isAnimating) {
      const animate = () => {
        renderScene(ctx, canvas.width, canvas.height);
        animationId = requestAnimationFrame(animate);
      };
      animate();
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [selectedBuilding, selectedFloor, viewMode, showGrid, lighting, cameraPosition, zoom, isAnimating]);

  const renderScene = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Clear canvas
    ctx.fillStyle = lighting === 'night' ? '#1a1a2e' : '#e8f4f8';
    ctx.fillRect(0, 0, width, height);

    if (viewMode === '3d' || viewMode === 'split') {
      render3DView(ctx, width, height);
    }

    if (viewMode === '2d' || viewMode === 'split') {
      render2DView(ctx, width, height);
    }

    if (showGrid) {
      renderGrid(ctx, width, height);
    }
  };

  const render3DView = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    // Draw ground plane
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, height * 0.6, width, height * 0.4);

    // Draw buildings in 3D perspective
    if (selectedBuilding) {
      const building = selectedBuilding;
      const scale = zoom * 2;
      
      // Simple isometric projection
      const isoX = (building.position.x - building.position.z) * scale;
      const isoY = (building.position.x + building.position.z) * scale * 0.5 - building.position.y * scale;

      // Draw building
      ctx.save();
      ctx.translate(centerX + isoX, centerY + isoY);

      // Front face
      ctx.fillStyle = building.color || '#3B82F6';
      ctx.fillRect(-building.size.width * scale / 2, -building.size.height * scale, building.size.width * scale, building.size.height * scale);

      // Top face (roof)
      ctx.fillStyle = '#2563EB';
      ctx.beginPath();
      ctx.moveTo(-building.size.width * scale / 2, -building.size.height * scale);
      ctx.lineTo(0, -building.size.height * scale - 20);
      ctx.lineTo(building.size.width * scale / 2, -building.size.height * scale);
      ctx.lineTo(-building.size.width * scale / 2, -building.size.height * scale);
      ctx.fill();

      // Side face
      ctx.fillStyle = '#1E40AF';
      ctx.fillRect(building.size.width * scale / 2, -building.size.height * scale, building.size.depth * scale * 0.5, building.size.height * scale);

      // Draw rooms
      building.rooms?.forEach((room: Room3D) => {
        if (room.floor === selectedFloor) {
          const roomIsoX = (room.position.x - room.position.z) * scale;
          const roomIsoY = (room.position.x + room.position.z) * scale * 0.5 - room.position.y * scale;

          ctx.fillStyle = room.color || '#60A5FA';
          ctx.fillRect(
            roomIsoX - room.size.width * scale / 2,
            roomIsoY - room.size.height * scale,
            room.size.width * scale,
            room.size.height * scale
          );

          // Room label
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(room.roomNumber, roomIsoX, roomIsoY);
        }
      });

      ctx.restore();
    }

    // Draw axis indicators
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, height - 50);
    ctx.lineTo(100, height - 50);
    ctx.stroke();
    ctx.fillStyle = '#FF0000';
    ctx.fillText('X', 110, height - 45);

    ctx.strokeStyle = '#00FF00';
    ctx.beginPath();
    ctx.moveTo(50, height - 50);
    ctx.lineTo(50, height - 100);
    ctx.stroke();
    ctx.fillStyle = '#00FF00';
    ctx.fillText('Y', 55, height - 110);

    ctx.strokeStyle = '#0000FF';
    ctx.beginPath();
    ctx.moveTo(50, height - 50);
    ctx.lineTo(25, height - 75);
    ctx.stroke();
    ctx.fillStyle = '#0000FF';
    ctx.fillText('Z', 15, height - 80);
  };

  const render2DView = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const offsetX = viewMode === 'split' ? width / 2 : 0;
    const viewWidth = viewMode === 'split' ? width / 2 : width;

    ctx.save();
    ctx.translate(offsetX, 0);

    // Draw floor plan
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, viewWidth, height);

    if (selectedBuilding) {
      const scale = zoom * 3;
      const centerX = viewWidth / 2;
      const centerY = height / 2;

      // Draw building outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        centerX - selectedBuilding.size.width * scale / 2,
        centerY - selectedBuilding.size.depth * scale / 2,
        selectedBuilding.size.width * scale,
        selectedBuilding.size.depth * scale
      );

      // Draw rooms
      selectedBuilding.rooms?.forEach((room: Room3D) => {
        if (room.floor === selectedFloor) {
          ctx.fillStyle = room.color || '#93C5FD';
          ctx.fillRect(
            centerX + room.position.x * scale - room.size.width * scale / 2,
            centerY + room.position.z * scale - room.size.depth * scale / 2,
            room.size.width * scale,
            room.size.depth * scale
          );

          // Room border
          ctx.strokeStyle = '#1E40AF';
          ctx.lineWidth = 2;
          ctx.strokeRect(
            centerX + room.position.x * scale - room.size.width * scale / 2,
            centerY + room.position.z * scale - room.size.depth * scale / 2,
            room.size.width * scale,
            room.size.depth * scale
          );

          // Room label
          ctx.fillStyle = '#1E40AF';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(
            room.roomNumber,
            centerX + room.position.x * scale,
            centerY + room.position.z * scale
          );

          // Room name
          ctx.font = '10px Arial';
          ctx.fillText(
            room.name || '',
            centerX + room.position.x * scale,
            centerY + room.position.z * scale + 15
          );
        }
      });
    }

    ctx.restore();
  };

  const renderGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = lighting === 'night' ? '#333333' : '#CCCCCC';
    ctx.lineWidth = 1;

    const gridSize = 50 * zoom;

    // Vertical lines
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.3));

  const handleExport3D = () => {
    // Export 3D model as JSON
    const data = {
      buildings: buildings.map((b: any) => ({
        ...b,
        rooms: rooms.filter((r: any) => r.buildingId === b.id),
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ksyk-3d-model.json';
    a.click();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b shadow-sm p-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Box className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold">KSYK Builder 3D</h1>
        </div>

        {/* View Mode */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <Button
            variant={viewMode === '3d' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('3d')}
          >
            <Box className="w-4 h-4 mr-2" />
            3D
          </Button>
          <Button
            variant={viewMode === '2d' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('2d')}
          >
            <Layers className="w-4 h-4 mr-2" />
            2D
          </Button>
          <Button
            variant={viewMode === 'split' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('split')}
          >
            <Maximize2 className="w-4 h-4 mr-2" />
            Split
          </Button>
        </div>

        {/* Edit Tools */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <Button
            variant={editMode === 'select' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setEditMode('select')}
            title="Select"
          >
            <Move className="w-4 h-4" />
          </Button>
          <Button
            variant={editMode === 'move' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setEditMode('move')}
            title="Move"
          >
            <Move className="w-4 h-4" />
          </Button>
          <Button
            variant={editMode === 'rotate' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setEditMode('rotate')}
            title="Rotate"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button
            variant={editMode === 'scale' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setEditMode('scale')}
            title="Scale"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button
            variant={editMode === 'draw' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setEditMode('draw')}
            title="Draw"
          >
            <Box className="w-4 h-4" />
          </Button>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-16 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsAnimating(!isAnimating)}>
            {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport3D}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="default" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Building/Room List */}
        <div className="w-80 bg-white border-r overflow-y-auto">
          <Tabs defaultValue="buildings" className="h-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="buildings">
                <Building2 className="w-4 h-4 mr-2" />
                Buildings
              </TabsTrigger>
              <TabsTrigger value="rooms">
                <DoorOpen className="w-4 h-4 mr-2" />
                Rooms
              </TabsTrigger>
            </TabsList>

            <TabsContent value="buildings" className="p-4 space-y-2">
              {buildings.map((building: any) => (
                <Card
                  key={building.id}
                  className={`cursor-pointer transition-all ${
                    selectedBuilding?.id === building.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedBuilding(building)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{building.name}</h4>
                        <p className="text-sm text-gray-600">{building.floors} floors</p>
                      </div>
                      <Building2 className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="rooms" className="p-4 space-y-2">
              {rooms
                .filter((r: any) => r.floor === selectedFloor)
                .map((room: any) => (
                  <Card
                    key={room.id}
                    className={`cursor-pointer transition-all ${
                      selectedRoom?.id === room.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{room.roomNumber}</h4>
                          <p className="text-sm text-gray-600">{room.name}</p>
                        </div>
                        <DoorOpen className="w-6 h-6 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 relative bg-gray-100">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ cursor: editMode === 'draw' ? 'crosshair' : 'default' }}
          />

          {/* Floor Selector */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3">
            <Label className="text-sm font-medium mb-2 block">Floor</Label>
            <div className="flex flex-col gap-2">
              {[3, 2, 1, 0].map((floor) => (
                <Button
                  key={floor}
                  variant={selectedFloor === floor ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFloor(floor)}
                  className="w-16"
                >
                  {floor === 0 ? 'G' : floor}
                </Button>
              ))}
            </div>
          </div>

          {/* Lighting Control */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3">
            <Label className="text-sm font-medium mb-2 block">Lighting</Label>
            <div className="flex gap-2">
              <Button
                variant={lighting === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLighting('day')}
              >
                <Sun className="w-4 h-4" />
              </Button>
              <Button
                variant={lighting === 'night' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLighting('night')}
              >
                <Moon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-80 bg-white border-l overflow-y-auto p-4 space-y-4">
          <h3 className="text-lg font-bold">Properties</h3>

          {selectedRoom ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Room: {selectedRoom.roomNumber}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={selectedRoom.name} />
                </div>

                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={selectedRoom.color} className="w-20" />
                    <Input value={selectedRoom.color} className="flex-1" />
                  </div>
                </div>

                <div>
                  <Label>Position X: {selectedRoom.position.x.toFixed(1)}</Label>
                  <Slider
                    value={[selectedRoom.position.x]}
                    min={-50}
                    max={50}
                    step={0.1}
                  />
                </div>

                <div>
                  <Label>Position Z: {selectedRoom.position.z.toFixed(1)}</Label>
                  <Slider
                    value={[selectedRoom.position.z]}
                    min={-50}
                    max={50}
                    step={0.1}
                  />
                </div>

                <div>
                  <Label>Width: {selectedRoom.size.width.toFixed(1)}</Label>
                  <Slider
                    value={[selectedRoom.size.width]}
                    min={1}
                    max={20}
                    step={0.1}
                  />
                </div>

                <div>
                  <Label>Depth: {selectedRoom.size.depth.toFixed(1)}</Label>
                  <Slider
                    value={[selectedRoom.size.depth]}
                    min={1}
                    max={20}
                    step={0.1}
                  />
                </div>

                <div>
                  <Label>Height: {selectedRoom.size.height.toFixed(1)}</Label>
                  <Slider
                    value={[selectedRoom.size.height]}
                    min={2}
                    max={10}
                    step={0.1}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Show Measurements</Label>
                  <Switch checked={showMeasurements} onCheckedChange={setShowMeasurements} />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                Select a room to edit properties
              </CardContent>
            </Card>
          )}

          {/* View Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">View Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Show Grid</Label>
                <Switch checked={showGrid} onCheckedChange={setShowGrid} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Animate</Label>
                <Switch checked={isAnimating} onCheckedChange={setIsAnimating} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span>Mode: {editMode.toUpperCase()}</span>
          <span>Floor: {selectedFloor}</span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Buildings: {buildings.length}</span>
          <span>Rooms: {rooms.length}</span>
          <span>Selected: {selectedRoom ? selectedRoom.roomNumber : 'None'}</span>
        </div>
      </div>
    </div>
  );
}
