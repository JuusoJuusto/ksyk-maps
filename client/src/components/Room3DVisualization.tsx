import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Box, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut,
  Move3D,
  Eye,
  Sun,
  Users,
  Maximize,
  Camera
} from 'lucide-react';

interface Room3D {
  id: string;
  name: string;
  dimensions: { width: number; height: number; depth: number };
  furniture: Array<{
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    rotation: number;
    color: string;
  }>;
  lighting: Array<{
    id: string;
    type: 'ceiling' | 'window' | 'lamp';
    position: { x: number; y: number; z: number };
    intensity: number;
  }>;
  capacity: number;
  currentOccupancy: number;
}

export function Room3DVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room3D | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'top' | 'side'>('3d');
  const [zoom, setZoom] = useState([50]);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [lighting, setLighting] = useState([75]);
  const [showFurniture, setShowFurniture] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const rooms3D: Room3D[] = [
    {
      id: 'M12',
      name: 'Music Room M12',
      dimensions: { width: 8, height: 3, depth: 6 },
      furniture: [
        { id: 'piano1', type: 'piano', position: { x: 2, y: 0, z: 1 }, rotation: 45, color: '#4A4A4A' },
        { id: 'chair1', type: 'chair', position: { x: 4, y: 0, z: 2 }, rotation: 0, color: '#8B4513' },
        { id: 'chair2', type: 'chair', position: { x: 5, y: 0, z: 2 }, rotation: 0, color: '#8B4513' },
        { id: 'desk1', type: 'desk', position: { x: 7, y: 0, z: 4 }, rotation: 90, color: '#D2691E' },
        { id: 'speaker1', type: 'speaker', position: { x: 1, y: 1, z: 1 }, rotation: 0, color: '#2F2F2F' },
        { id: 'speaker2', type: 'speaker', position: { x: 7, y: 1, z: 1 }, rotation: 0, color: '#2F2F2F' }
      ],
      lighting: [
        { id: 'ceiling1', type: 'ceiling', position: { x: 4, y: 3, z: 3 }, intensity: 0.8 },
        { id: 'window1', type: 'window', position: { x: 0, y: 2, z: 3 }, intensity: 0.6 },
        { id: 'lamp1', type: 'lamp', position: { x: 7, y: 2, z: 4 }, intensity: 0.4 }
      ],
      capacity: 30,
      currentOccupancy: 5
    },
    {
      id: 'K15',
      name: 'Classroom K15',
      dimensions: { width: 10, height: 3, depth: 8 },
      furniture: [
        { id: 'table1', type: 'table', position: { x: 2, y: 0, z: 2 }, rotation: 0, color: '#8B4513' },
        { id: 'table2', type: 'table', position: { x: 5, y: 0, z: 2 }, rotation: 0, color: '#8B4513' },
        { id: 'table3', type: 'table', position: { x: 8, y: 0, z: 2 }, rotation: 0, color: '#8B4513' },
        { id: 'chair1', type: 'chair', position: { x: 1, y: 0, z: 1 }, rotation: 0, color: '#4682B4' },
        { id: 'chair2', type: 'chair', position: { x: 3, y: 0, z: 1 }, rotation: 0, color: '#4682B4' },
        { id: 'projector1', type: 'projector', position: { x: 5, y: 2.5, z: 7 }, rotation: 180, color: '#FFFFFF' },
        { id: 'whiteboard1', type: 'whiteboard', position: { x: 5, y: 1.5, z: 0.1 }, rotation: 0, color: '#FFFFFF' }
      ],
      lighting: [
        { id: 'ceiling1', type: 'ceiling', position: { x: 3, y: 3, z: 4 }, intensity: 0.9 },
        { id: 'ceiling2', type: 'ceiling', position: { x: 7, y: 3, z: 4 }, intensity: 0.9 },
        { id: 'window1', type: 'window', position: { x: 10, y: 2, z: 4 }, intensity: 0.7 }
      ],
      capacity: 25,
      currentOccupancy: 18
    },
    {
      id: 'L20',
      name: 'Library Study Room L20',
      dimensions: { width: 6, height: 3, depth: 4 },
      furniture: [
        { id: 'table1', type: 'table', position: { x: 3, y: 0, z: 2 }, rotation: 0, color: '#8B4513' },
        { id: 'chair1', type: 'chair', position: { x: 2.5, y: 0, z: 1.5 }, rotation: 0, color: '#4682B4' },
        { id: 'chair2', type: 'chair', position: { x: 3.5, y: 0, z: 1.5 }, rotation: 180, color: '#4682B4' },
        { id: 'bookshelf1', type: 'bookshelf', position: { x: 0.2, y: 0, z: 1 }, rotation: 0, color: '#8B4513' },
        { id: 'bookshelf2', type: 'bookshelf', position: { x: 5.8, y: 0, z: 1 }, rotation: 0, color: '#8B4513' }
      ],
      lighting: [
        { id: 'ceiling1', type: 'ceiling', position: { x: 3, y: 3, z: 2 }, intensity: 0.7 },
        { id: 'lamp1', type: 'lamp', position: { x: 3, y: 1.5, z: 2 }, intensity: 0.8 }
      ],
      capacity: 12,
      currentOccupancy: 3
    }
  ];

  useEffect(() => {
    if (rooms3D.length > 0) {
      setSelectedRoom(rooms3D[0]);
    }
  }, []);

  useEffect(() => {
    if (selectedRoom && canvasRef.current) {
      drawRoom3D();
    }
  }, [selectedRoom, viewMode, zoom, rotation, lighting, showFurniture]);

  const drawRoom3D = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedRoom) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up 3D projection
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = zoom[0] / 50;

    // Draw room outline
    drawRoomStructure(ctx, centerX, centerY, scale);
    
    // Draw furniture if enabled
    if (showFurniture) {
      drawFurniture(ctx, centerX, centerY, scale);
    }
    
    // Draw lighting
    drawLighting(ctx, centerX, centerY, scale);
    
    // Draw occupancy indicators
    drawOccupancy(ctx, centerX, centerY, scale);
  };

  const drawRoomStructure = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number) => {
    if (!selectedRoom) return;

    const { width, height, depth } = selectedRoom.dimensions;
    
    // 3D perspective transformation
    const transform3D = (x: number, y: number, z: number) => {
      const rotX = rotation.x * Math.PI / 180;
      const rotY = rotation.y * Math.PI / 180;
      
      // Apply rotations
      let newX = x * Math.cos(rotY) - z * Math.sin(rotY);
      let newZ = x * Math.sin(rotY) + z * Math.cos(rotY);
      let newY = y * Math.cos(rotX) - newZ * Math.sin(rotX);
      newZ = y * Math.sin(rotX) + newZ * Math.cos(rotX);
      
      return {
        x: centerX + newX * scale * 20,
        y: centerY - newY * scale * 20 - newZ * scale * 10
      };
    };

    // Draw floor
    ctx.fillStyle = '#E6E6FA';
    ctx.strokeStyle = '#4682B4';
    ctx.lineWidth = 2;
    
    const corners = [
      transform3D(0, 0, 0),
      transform3D(width, 0, 0),
      transform3D(width, 0, depth),
      transform3D(0, 0, depth)
    ];
    
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    corners.forEach(corner => ctx.lineTo(corner.x, corner.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw walls
    ctx.fillStyle = '#F0F8FF';
    
    // Front wall
    const frontWall = [
      transform3D(0, 0, 0),
      transform3D(width, 0, 0),
      transform3D(width, height, 0),
      transform3D(0, height, 0)
    ];
    
    ctx.beginPath();
    ctx.moveTo(frontWall[0].x, frontWall[0].y);
    frontWall.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Side wall
    const sideWall = [
      transform3D(width, 0, 0),
      transform3D(width, 0, depth),
      transform3D(width, height, depth),
      transform3D(width, height, 0)
    ];
    
    ctx.beginPath();
    ctx.moveTo(sideWall[0].x, sideWall[0].y);
    sideWall.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const drawFurniture = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number) => {
    if (!selectedRoom) return;

    selectedRoom.furniture.forEach(item => {
      const x = centerX + item.position.x * scale * 20;
      const y = centerY - item.position.y * scale * 20 - item.position.z * scale * 10;
      
      ctx.fillStyle = item.color;
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      
      // Simple furniture representation
      switch (item.type) {
        case 'piano':
          ctx.fillRect(x - 15, y - 10, 30, 20);
          ctx.strokeRect(x - 15, y - 10, 30, 20);
          break;
        case 'chair':
          ctx.fillRect(x - 5, y - 5, 10, 10);
          ctx.strokeRect(x - 5, y - 5, 10, 10);
          break;
        case 'table':
        case 'desk':
          ctx.fillRect(x - 12, y - 8, 24, 16);
          ctx.strokeRect(x - 12, y - 8, 24, 16);
          break;
        case 'bookshelf':
          ctx.fillRect(x - 6, y - 3, 12, 6);
          ctx.strokeRect(x - 6, y - 3, 12, 6);
          break;
        case 'speaker':
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          break;
        case 'projector':
          ctx.fillRect(x - 8, y - 4, 16, 8);
          ctx.strokeRect(x - 8, y - 4, 16, 8);
          break;
        case 'whiteboard':
          ctx.fillRect(x - 20, y - 2, 40, 4);
          ctx.strokeRect(x - 20, y - 2, 40, 4);
          break;
      }
    });
  };

  const drawLighting = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number) => {
    if (!selectedRoom) return;

    selectedRoom.lighting.forEach(light => {
      const x = centerX + light.position.x * scale * 20;
      const y = centerY - light.position.y * scale * 20 - light.position.z * scale * 10;
      
      const intensity = light.intensity * (lighting[0] / 100);
      const alpha = intensity * 0.3;
      
      // Draw light source
      ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 15 * intensity, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw light icon
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const drawOccupancy = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number) => {
    if (!selectedRoom) return;

    // Draw people indicators
    const peoplePositions = [];
    for (let i = 0; i < selectedRoom.currentOccupancy; i++) {
      const angle = (i / selectedRoom.currentOccupancy) * 2 * Math.PI;
      const radius = 40 * scale;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      // Draw person icon
      ctx.fillStyle = '#FF6B6B';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = '#4ECDC4';
      ctx.fillRect(x - 3, y + 4, 6, 8);
    }
  };

  const resetView = () => {
    setRotation({ x: 0, y: 0 });
    setZoom([50]);
    setLighting([75]);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="space-y-4">
      {/* Room Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="w-5 h-5 text-blue-600" />
            3D Room Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {rooms3D.map((room) => (
              <Button
                key={room.id}
                variant={selectedRoom?.id === room.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRoom(room)}
              >
                {room.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3D Viewer */}
      <Card className={isFullscreen ? 'fixed inset-0 z-50' : ''}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              {selectedRoom?.name}
              {selectedRoom && (
                <Badge className="bg-blue-100 text-blue-700">
                  {selectedRoom.currentOccupancy}/{selectedRoom.capacity} occupied
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetView}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`space-y-4 ${isFullscreen ? 'h-full' : ''}`}>
            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ZoomIn className="w-4 h-4" />
                  <span className="text-sm">Zoom: {zoom[0]}%</span>
                </div>
                <Slider
                  value={zoom}
                  onValueChange={setZoom}
                  max={200}
                  min={10}
                  step={5}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Move3D className="w-4 h-4" />
                  <span className="text-sm">Rotation X: {rotation.x}°</span>
                </div>
                <Slider
                  value={[rotation.x]}
                  onValueChange={([value]) => setRotation({...rotation, x: value})}
                  max={360}
                  min={0}
                  step={15}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Move3D className="w-4 h-4" />
                  <span className="text-sm">Rotation Y: {rotation.y}°</span>
                </div>
                <Slider
                  value={[rotation.y]}
                  onValueChange={([value]) => setRotation({...rotation, y: value})}
                  max={360}
                  min={0}
                  step={15}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  <span className="text-sm">Lighting: {lighting[0]}%</span>
                </div>
                <Slider
                  value={lighting}
                  onValueChange={setLighting}
                  max={100}
                  min={10}
                  step={5}
                />
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === '3d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('3d')}
              >
                3D View
              </Button>
              <Button
                variant={viewMode === 'top' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('top')}
              >
                Top View
              </Button>
              <Button
                variant={viewMode === 'side' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('side')}
              >
                Side View
              </Button>
              <Button
                variant={showFurniture ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFurniture(!showFurniture)}
              >
                Furniture
              </Button>
            </div>

            {/* Canvas */}
            <div className="border rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
              <canvas
                ref={canvasRef}
                width={isFullscreen ? 1200 : 800}
                height={isFullscreen ? 800 : 500}
                className="w-full h-auto cursor-move"
                onMouseDown={(e) => {
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startRotation = {...rotation};
                  
                  const handleMouseMove = (e: MouseEvent) => {
                    const deltaX = e.clientX - startX;
                    const deltaY = e.clientY - startY;
                    setRotation({
                      x: startRotation.x + deltaY,
                      y: startRotation.y + deltaX
                    });
                  };
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };
                  
                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              />
            </div>

            {/* Room Info */}
            {selectedRoom && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-bold text-blue-600">{selectedRoom.dimensions.width}×{selectedRoom.dimensions.depth}m</div>
                  <div className="text-gray-600">Dimensions</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-bold text-green-600">{selectedRoom.furniture.length}</div>
                  <div className="text-gray-600">Furniture Items</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="font-bold text-yellow-600">{selectedRoom.lighting.length}</div>
                  <div className="text-gray-600">Light Sources</div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="font-bold text-purple-600">{Math.round((selectedRoom.currentOccupancy / selectedRoom.capacity) * 100)}%</div>
                  <div className="text-gray-600">Occupancy</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}