import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Search, 
  Navigation,
  MapPin,
  Home,
  Layers
} from 'lucide-react';

interface Building {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  type: string;
  floors?: number;
}

interface OptimizedCampusMapProps {
  buildings: Building[];
  onBuildingClick?: (building: Building) => void;
  language?: 'fi' | 'en';
}

export default function OptimizedCampusMap({ 
  buildings, 
  onBuildingClick,
  language = 'fi' 
}: OptimizedCampusMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredBuilding, setHoveredBuilding] = useState<Building | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  
  const t = (fi: string, en: string) => language === 'fi' ? fi : en;

  // Animation frame ID for smooth rendering
  const animationFrameRef = useRef<number>();
  
  // Viewport culling - only render visible buildings
  const getVisibleBuildings = useCallback(() => {
    if (!canvasRef.current) return buildings;
    
    const canvas = canvasRef.current;
    const viewportLeft = -offset.x / scale;
    const viewportTop = -offset.y / scale;
    const viewportRight = viewportLeft + canvas.width / scale;
    const viewportBottom = viewportTop + canvas.height / scale;
    
    return buildings.filter(building => {
      const buildingRight = building.x + building.width;
      const buildingBottom = building.y + building.height;
      
      return !(
        buildingRight < viewportLeft ||
        building.x > viewportRight ||
        buildingBottom < viewportTop ||
        building.y > viewportBottom
      );
    });
  }, [buildings, offset, scale]);

  // Optimized rendering with canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save context state
    ctx.save();
    
    // Apply transformations
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw grid (only if zoomed in enough)
    if (scale > 0.5) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1 / scale;
      const gridSize = 50;
      const startX = Math.floor(-offset.x / scale / gridSize) * gridSize;
      const startY = Math.floor(-offset.y / scale / gridSize) * gridSize;
      const endX = startX + canvas.width / scale + gridSize;
      const endY = startY + canvas.height / scale + gridSize;

      for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
    }

    // Draw only visible buildings
    const visibleBuildings = getVisibleBuildings();
    
    visibleBuildings.forEach(building => {
      const isHovered = hoveredBuilding?.id === building.id;
      const isSelected = selectedBuilding?.id === building.id;
      
      // Building shadow (for depth)
      if (scale > 0.3) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(
          building.x + 4,
          building.y + 4,
          building.width,
          building.height
        );
      }
      
      // Building body
      ctx.fillStyle = isHovered || isSelected ? 
        adjustColor(building.color, 20) : 
        building.color;
      ctx.fillRect(building.x, building.y, building.width, building.height);
      
      // Building border
      ctx.strokeStyle = isSelected ? '#2563eb' : '#374151';
      ctx.lineWidth = (isSelected ? 3 : 1) / scale;
      ctx.strokeRect(building.x, building.y, building.width, building.height);
      
      // Building name (only if zoomed in enough)
      if (scale > 0.5) {
        ctx.fillStyle = '#1f2937';
        ctx.font = `${14 / scale}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          building.name,
          building.x + building.width / 2,
          building.y + building.height / 2
        );
      }
      
      // Floor indicator
      if (building.floors && scale > 0.7) {
        ctx.fillStyle = '#6b7280';
        ctx.font = `${10 / scale}px Inter, sans-serif`;
        ctx.fillText(
          `${building.floors} ${t('krs', 'fl')}`,
          building.x + building.width / 2,
          building.y + building.height - 10 / scale
        );
      }
    });

    // Restore context state
    ctx.restore();
  }, [buildings, offset, scale, hoveredBuilding, selectedBuilding, getVisibleBuildings, t]);

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else {
      // Check for hovered building
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - offset.x) / scale;
      const y = (e.clientY - rect.top - offset.y) / scale;

      const building = buildings.find(b =>
        x >= b.x && x <= b.x + b.width &&
        y >= b.y && y <= b.y + b.height
      );

      setHoveredBuilding(building || null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hoveredBuilding) {
      setSelectedBuilding(hoveredBuilding);
      onBuildingClick?.(hoveredBuilding);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, scale * delta));
    
    // Zoom towards mouse position
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldX = (mouseX - offset.x) / scale;
    const worldY = (mouseY - offset.y) / scale;
    
    setOffset({
      x: mouseX - worldX * newScale,
      y: mouseY - worldY * newScale
    });
    setScale(newScale);
  };

  const zoomIn = () => {
    setScale(prev => Math.min(5, prev * 1.2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.1, prev / 1.2));
  };

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const centerOnBuilding = (building: Building) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerX = building.x + building.width / 2;
    const centerY = building.y + building.height / 2;

    setOffset({
      x: canvas.width / 2 - centerX * scale,
      y: canvas.height / 2 - centerY * scale
    });
    setSelectedBuilding(building);
  };

  const filteredBuildings = buildings.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full h-full">
      {/* Search Bar */}
      <Card className="absolute top-4 left-4 z-10 p-2 shadow-lg">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            type="text"
            placeholder={t('Etsi rakennusta...', 'Search building...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>
        {searchQuery && filteredBuildings.length > 0 && (
          <div className="mt-2 max-h-48 overflow-y-auto">
            {filteredBuildings.map(building => (
              <div
                key={building.id}
                className="p-2 hover:bg-gray-100 cursor-pointer rounded"
                onClick={() => {
                  centerOnBuilding(building);
                  setSearchQuery('');
                }}
              >
                <div className="font-medium">{building.name}</div>
                <div className="text-xs text-gray-600">{building.type}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Controls */}
      <Card className="absolute top-4 right-4 z-10 p-2 shadow-lg">
        <div className="flex flex-col gap-2">
          <Button size="sm" variant="outline" onClick={zoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={zoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={resetView}>
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Building Info */}
      {selectedBuilding && (
        <Card className="absolute bottom-4 left-4 z-10 p-4 shadow-lg max-w-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg">{selectedBuilding.name}</h3>
              <p className="text-sm text-gray-600">{selectedBuilding.type}</p>
              {selectedBuilding.floors && (
                <p className="text-sm text-gray-600">
                  {selectedBuilding.floors} {t('kerrosta', 'floors')}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedBuilding(null)}
            >
              ×
            </Button>
          </div>
        </Card>
      )}

      {/* Zoom Level Indicator */}
      <div className="absolute bottom-4 right-4 z-10 bg-white px-3 py-1 rounded shadow text-sm">
        {Math.round(scale * 100)}%
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-move"
        style={{ cursor: isDragging ? 'grabbing' : hoveredBuilding ? 'pointer' : 'grab' }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          onWheel={handleWheel}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + amount);
  const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + amount);
  const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
