import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Navigation, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  MapPin, 
  Route, 
  Search,
  Target,
  Home,
  ArrowRight,
  Clock,
  Building,
  Layers
} from "lucide-react";
import type { Room, Building as BuildingType, Hallway, Floor } from "@shared/schema";

interface NavigationState {
  from: Room | null;
  to: Room | null;
  route: { x: number; y: number; step: number; instruction: string }[];
  isNavigating: boolean;
}

interface MapInteractionState {
  isDragging: boolean;
  lastMousePos: { x: number; y: number };
  zoom: number;
  panOffset: { x: number; y: number };
}

export default function SuperiorInteractiveMap() {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State management
  const [mapState, setMapState] = useState<MapInteractionState>({
    isDragging: false,
    lastMousePos: { x: 0, y: 0 },
    zoom: 1,
    panOffset: { x: 0, y: 0 }
  });
  
  const [navigation, setNavigation] = useState<NavigationState>({
    from: null,
    to: null,
    route: [],
    isNavigating: false
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredRoom, setHoveredRoom] = useState<Room | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [currentFloor, setCurrentFloor] = useState(1);

  // Data fetching
  const { data: buildings = [] } = useQuery<BuildingType[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: hallways = [] } = useQuery<Hallway[]>({
    queryKey: ["/api/hallways"],
  });

  const { data: floors = [] } = useQuery<Floor[]>({
    queryKey: ["/api/floors"],
  });

  // Filter rooms based on search and current floor
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.nameFi?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFloor = room.floor === currentFloor;
    return matchesSearch && matchesFloor;
  });

  // Get available floors for floor selector
  const availableFloors = [...new Set(rooms.map(room => room.floor).filter(Boolean))].sort();
  
  // Get floors by building for the current floor
  const currentFloorData = floors.filter(floor => floor.floorNumber === currentFloor);

  // Fixed room click handler that doesn't interfere with dragging
  const handleRoomClick = (room: Room, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Don't handle clicks if we're dragging
    if (mapState.isDragging) {
      return;
    }
    
    console.log("Room clicked:", room.roomNumber);
    
    if (!navigation.isNavigating) {
      // Start navigation mode
      setNavigation(prev => ({
        ...prev,
        from: room,
        isNavigating: true
      }));
      setSelectedRoom(room);
      console.log("Started navigation from:", room.roomNumber);
    } else if (!navigation.to) {
      // Set destination and calculate route
      const route = calculateRoute(navigation.from!, room);
      setNavigation(prev => ({
        ...prev,
        to: room,
        route: route
      }));
      console.log("Navigation route calculated from", navigation.from?.roomNumber, "to", room.roomNumber);
    } else {
      // Reset navigation
      setNavigation({
        from: room,
        to: null,
        route: [],
        isNavigating: true
      });
      setSelectedRoom(room);
      console.log("Reset navigation, new start:", room.roomNumber);
    }
  };

  // Calculate route between two rooms
  const calculateRoute = (from: Room, to: Room): { x: number; y: number; step: number; instruction: string }[] => {
    const route = [];
    const steps = 5;
    
    // Simple pathfinding with waypoints
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const x = from.mapPositionX + (to.mapPositionX - from.mapPositionX) * progress;
      const y = from.mapPositionY + (to.mapPositionY - from.mapPositionY) * progress;
      
      let instruction = "";
      if (i === 0) instruction = `Start at ${from.roomNumber}`;
      else if (i === steps) instruction = `Arrive at ${to.roomNumber}`;
      else if (i === Math.floor(steps / 2)) instruction = "Continue straight";
      else instruction = "Follow the blue path";
      
      route.push({ x, y, step: i + 1, instruction });
    }
    
    return route;
  };

  // Map controls
  const handleZoomIn = () => {
    setMapState(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 3) }));
  };

  const handleZoomOut = () => {
    setMapState(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.5) }));
  };

  const resetView = () => {
    setMapState(prev => ({ ...prev, zoom: 1, panOffset: { x: 0, y: 0 } }));
  };

  const resetNavigation = () => {
    setNavigation({
      from: null,
      to: null,
      route: [],
      isNavigating: false
    });
    setSelectedRoom(null);
  };

  // Fixed mouse interaction handlers
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only start dragging if not clicking on a room
    const target = event.target as HTMLElement;
    const isRoom = target.closest('[data-testid^="room-"]');
    
    if (!isRoom) {
      event.preventDefault();
      document.body.style.userSelect = 'none';
      setMapState(prev => ({
        ...prev,
        isDragging: true,
        lastMousePos: { x: event.clientX, y: event.clientY }
      }));
      console.log("Started dragging");
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (mapState.isDragging) {
      event.preventDefault();
      const deltaX = event.clientX - mapState.lastMousePos.x;
      const deltaY = event.clientY - mapState.lastMousePos.y;
      
      setMapState(prev => ({
        ...prev,
        lastMousePos: { x: event.clientX, y: event.clientY },
        panOffset: {
          x: prev.panOffset.x + deltaX,
          y: prev.panOffset.y + deltaY
        }
      }));
    }
  };

  const handleMouseUp = () => {
    document.body.style.userSelect = 'auto';
    setMapState(prev => ({ ...prev, isDragging: false }));
  };

  // Touch handlers for mobile support
  const handleTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      setMapState(prev => ({
        ...prev,
        isDragging: true,
        lastMousePos: { x: touch.clientX, y: touch.clientY }
      }));
    }
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (mapState.isDragging && event.touches.length === 1) {
      event.preventDefault();
      const touch = event.touches[0];
      const deltaX = touch.clientX - mapState.lastMousePos.x;
      const deltaY = touch.clientY - mapState.lastMousePos.y;
      
      setMapState(prev => ({
        ...prev,
        lastMousePos: { x: touch.clientX, y: touch.clientY },
        panOffset: {
          x: prev.panOffset.x + deltaX,
          y: prev.panOffset.y + deltaY
        }
      }));
    }
  };

  const handleTouchEnd = () => {
    setMapState(prev => ({ ...prev, isDragging: false }));
  };

  // Get room style based on state with fixed positioning
  const getRoomStyle = (room: Room) => {
    // Center rooms within the map view  
    const centerOffsetX = 400;
    const centerOffsetY = 300;
    
    const baseStyle = {
      position: 'absolute' as const,
      left: `${room.mapPositionX + mapState.panOffset.x + centerOffsetX}px`,
      top: `${room.mapPositionY + mapState.panOffset.y + centerOffsetY}px`,
      width: `${(room.width || 40)}px`,
      height: `${(room.height || 30)}px`,
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '2px solid',
      zIndex: 10,
    };

    // Dynamic styling based on state
    if (room === navigation.from) {
      return {
        ...baseStyle,
        backgroundColor: '#10B981',
        borderColor: '#059669',
        boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)',
        zIndex: 100,
      };
    } else if (room === navigation.to) {
      return {
        ...baseStyle,
        backgroundColor: '#EF4444',
        borderColor: '#DC2626',
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)',
        zIndex: 100,
      };
    } else if (room === hoveredRoom) {
      return {
        ...baseStyle,
        backgroundColor: '#3B82F6',
        borderColor: '#2563EB',
        boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)',
        transform: `scale(${mapState.zoom * 1.1})`,
        zIndex: 50,
      };
    } else {
      return {
        ...baseStyle,
        backgroundColor: room.colorCode || '#F3F4F6',
        borderColor: '#E5E7EB',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      };
    }
  };

  // Render navigation route
  const renderRoute = () => {
    if (navigation.route.length === 0) return null;

    const pathData = navigation.route.map((point, index) => {
      const x = point.x + mapState.panOffset.x;
      const y = point.y + mapState.panOffset.y;
      return index === 0 ? `M${x},${y}` : `L${x},${y}`;
    }).join(' ');

    return (
      <svg 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                  refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#3B82F6" />
          </marker>
        </defs>
        
        {/* Main route path */}
        <path
          d={pathData}
          stroke="#3B82F6"
          strokeWidth="6"
          fill="none"
          strokeDasharray="10,5"
          strokeLinecap="round"
          filter="url(#glow)"
          markerEnd="url(#arrowhead)"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-15;0"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>
        
        {/* Route waypoints */}
        {navigation.route.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x + mapState.panOffset.x}
              cy={point.y + mapState.panOffset.y}
              r="8"
              fill="#FFFFFF"
              stroke="#3B82F6"
              strokeWidth="3"
            />
            <text
              x={point.x + mapState.panOffset.x}
              y={point.y + mapState.panOffset.y + 4}
              textAnchor="middle"
              fontSize="12"
              fontWeight="bold"
              fill="#3B82F6"
            >
              {point.step}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <TooltipProvider>
      <div className="relative h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        
        {/* Enhanced Navigation Panel with Floor Selector */}
        <div className="absolute top-4 left-4 z-50 space-y-4">
          <Card className="w-80 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Navigation className="w-5 h-5" />
                Campus Navigation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search rooms (e.g., M12, U30, Gym 1)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-room-search"
                />
              </div>

              {/* Floor Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Floor Level ({filteredRooms.length} rooms)
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {availableFloors.map(floor => (
                    <Button
                      key={floor}
                      variant={currentFloor === floor ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentFloor(floor)}
                      className={`h-8 px-3 text-xs font-medium ${
                        currentFloor === floor 
                          ? 'bg-blue-600 text-white' 
                          : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      data-testid={`floor-selector-${floor}`}
                    >
                      Floor {floor}
                    </Button>
                  ))}
                </div>
                
                {/* Current Floor Info */}
                {currentFloorData.length > 0 && (
                  <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                    📍 Currently viewing Floor {currentFloor}
                    <br />
                    {currentFloorData.map(floor => {
                      const building = buildings.find(b => b.id === floor.buildingId);
                      return (
                        <span key={floor.id} className="block">
                          • {building?.name} ({building?.nameEn}): {floor.nameEn}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Navigation Status */}
              {navigation.isNavigating ? (
                <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      🧭 Navigation Active
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={resetNavigation}
                      data-testid="button-reset-navigation"
                    >
                      Reset
                    </Button>
                  </div>
                  
                  {navigation.from && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">From: {navigation.from.roomNumber}</span>
                      <span className="text-muted-foreground">- {navigation.from.nameEn}</span>
                    </div>
                  )}
                  
                  {navigation.to ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="font-medium">To: {navigation.to.roomNumber}</span>
                        <span className="text-muted-foreground">- {navigation.to.nameEn}</span>
                      </div>
                      
                      {/* Route Instructions */}
                      <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded border">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          📍 Step-by-Step Directions:
                        </div>
                        {navigation.route.map((step, index) => (
                          <div key={index} className="text-xs py-1 flex items-center gap-2">
                            <span className="w-4 h-4 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center font-bold text-[10px]">
                              {step.step}
                            </span>
                            <span>{step.instruction}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-blue-600 dark:text-blue-400 animate-pulse">
                      👆 Click a destination room on the map
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => setNavigation(prev => ({ ...prev, isNavigating: true }))}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  data-testid="button-start-navigation"
                >
                  <Route className="w-4 h-4 mr-2" />
                  Start Navigation
                </Button>
              )}

              {/* Enhanced Room Search with Building Info */}
              {searchQuery && filteredRooms.length > 0 && (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    🎯 Found {filteredRooms.length} rooms:
                  </div>
                  {filteredRooms.slice(0, 6).map(room => {
                    const building = buildings.find(b => b.id === room.buildingId);
                    return (
                      <Button
                        key={room.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-auto py-2 text-left flex-col items-start hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => {
                          handleRoomClick(room, {} as any);
                          setSearchQuery(""); // Clear search after selection
                        }}
                        data-testid={`quick-access-${room.roomNumber}`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <MapPin className="w-3 h-3 text-blue-600" />
                          <span className="font-bold text-blue-700">{room.roomNumber}</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {building?.nameEn || building?.nameFi || 'Building'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground pl-5">
                          {room.nameEn || room.nameFi} • Floor {room.floor}
                        </div>
                        {room.type && (
                          <div className="text-xs text-blue-600 pl-5">
                            {room.type.replace('_', ' ')}
                          </div>
                        )}
                      </Button>
                    );
                  })}
                  {filteredRooms.length > 6 && (
                    <div className="text-xs text-center text-muted-foreground py-1">
                      ...and {filteredRooms.length - 6} more rooms
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Map Controls */}
        <div className="absolute top-4 right-4 z-50 space-y-2">
          <div className="flex flex-col space-y-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-10 h-10 shadow-lg"
                  onClick={handleZoomIn}
                  data-testid="button-zoom-in"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-10 h-10 shadow-lg"
                  onClick={handleZoomOut}
                  data-testid="button-zoom-out"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-10 h-10 shadow-lg"
                  onClick={resetView}
                  data-testid="button-reset-view"
                >
                  <Home className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset View</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Room Info Panel */}
        {(hoveredRoom || selectedRoom) && (
          <div className="absolute bottom-4 left-4 z-50">
            <Card className="w-64 shadow-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {(hoveredRoom || selectedRoom)?.type?.replace('_', ' ') || 'Room'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Floor {(hoveredRoom || selectedRoom)?.floor || 1}
                  </span>
                </div>
                
                <h3 className="font-bold text-lg text-foreground">
                  {(hoveredRoom || selectedRoom)?.roomNumber}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {(hoveredRoom || selectedRoom)?.nameEn || (hoveredRoom || selectedRoom)?.nameFi || 'Room'}
                </p>
                
                {(hoveredRoom || selectedRoom)?.equipment && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Equipment:</p>
                    <div className="flex flex-wrap gap-1">
                      {((hoveredRoom || selectedRoom)?.equipment as string[] || []).map((item, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {navigation.isNavigating && (hoveredRoom || selectedRoom) !== navigation.from && (
                  <Button
                    size="sm"
                    className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleRoomClick(hoveredRoom || selectedRoom!, {} as any)}
                    data-testid="button-navigate-to-room"
                  >
                    <Route className="w-3 h-3 mr-1" />
                    Navigate Here
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Fixed Interactive Map with Working Dragging */}
        <div 
          ref={mapRef}
          className="relative w-full h-full overflow-hidden bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ 
            cursor: mapState.isDragging ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
          data-testid="interactive-map"
        >
          
          {/* Campus Background Grid */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: `${50 * mapState.zoom}px ${50 * mapState.zoom}px`,
              transform: `translate(${mapState.panOffset.x}px, ${mapState.panOffset.y}px)`
            }}
          />

          {/* Buildings (Background Shapes) - Fixed with Default Positions */}
          {buildings.map((building, index) => {
            // Assign default positions for buildings that don't have coordinates
            const buildingPositions = {
              'M': { x: -200, y: 50 },   // Music Building - left
              'K': { x: 100, y: 0 },     // Central Hall - center
              'L': { x: 350, y: 80 },    // Gym - right  
              'OG': { x: 300, y: -150 }, // Old Gym - upper right
              'U': { x: -100, y: -100 }, // U Building - upper left
              'A': { x: 200, y: -80 },   // A Building - upper center
              'R': { x: -50, y: 200 }    // R Building - lower center
            };
            
            const defaultPos = buildingPositions[building.name] || { x: index * 150, y: 50 };
            const posX = building.mapPositionX ?? defaultPos.x;
            const posY = building.mapPositionY ?? defaultPos.y;
            
            return (
              <div
                key={building.id}
                style={{
                  position: 'absolute',
                  left: `${posX + mapState.panOffset.x + 400}px`,
                  top: `${posY + mapState.panOffset.y + 300}px`,
                  width: `${(building.width || 250)}px`,
                  height: `${(building.height || 180)}px`,
                  backgroundColor: building.colorCode + '20' || 'rgba(59, 130, 246, 0.1)',
                  border: `3px solid ${building.colorCode || 'rgba(59, 130, 246, 0.5)'}`,
                  borderRadius: '12px',
                  zIndex: 1,
                }}
                className="pointer-events-none"
              >
                <div className="absolute -top-10 left-2 text-sm font-bold text-gray-800 dark:text-gray-200 bg-white/90 dark:bg-gray-800/90 px-3 py-1 rounded shadow-lg border">
                  {building.name} - {building.nameEn || building.nameFi}
                </div>
                
                {/* Building icon */}
                <div className="absolute top-3 right-3 opacity-60">
                  <Building className="w-5 h-5" style={{ color: building.colorCode || '#3B82F6' }} />
                </div>
              </div>
            );
          })}

          {/* Hallways */}
          {hallways.map(hallway => (
            <div
              key={hallway.id}
              style={{
                position: 'absolute',
                left: `${(hallway.mapPositionX || 0) + mapState.panOffset.x}px`,
                top: `${(hallway.mapPositionY || 0) + mapState.panOffset.y}px`,
                width: `${(hallway.width || 20) * mapState.zoom}px`,
                height: `${(hallway.height || 100) * mapState.zoom}px`,
                backgroundColor: 'rgba(209, 213, 219, 0.6)',
                borderRadius: '4px',
                transform: `scale(${mapState.zoom})`,
                transformOrigin: 'top left',
              }}
              className="pointer-events-none"
            />
          ))}

          {/* Enhanced Interactive Rooms with Animation */}
          {(searchQuery ? filteredRooms : rooms).map(room => (
            <Tooltip key={room.id}>
              <TooltipTrigger asChild>
                <div
                  style={getRoomStyle(room)}
                  onClick={(e) => handleRoomClick(room, e)}
                  onMouseEnter={() => setHoveredRoom(room)}
                  onMouseLeave={() => setHoveredRoom(null)}
                  className="group relative overflow-hidden"
                  data-testid={`room-${room.roomNumber}`}
                >
                  {/* Room content with enhanced styling */}
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-2 relative z-10">
                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight drop-shadow-sm">
                      {room.roomNumber}
                    </div>
                    {mapState.zoom > 0.8 && (
                      <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-1 leading-tight">
                        {room.nameEn?.substring(0, 12) || room.nameFi?.substring(0, 12)}
                      </div>
                    )}
                    
                    {/* Floor indicator */}
                    <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {room.floor || 1}
                    </div>
                    
                    {/* Capacity indicator */}
                    {room.capacity && mapState.zoom > 1.2 && (
                      <div className="text-[8px] text-gray-500 mt-1">
                        👥 {room.capacity}
                      </div>
                    )}
                  </div>

                  {/* Interactive hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  
                  {/* Click ripple effect */}
                  <div className="absolute inset-0 bg-blue-500 opacity-0 scale-95 group-active:opacity-20 group-active:scale-100 transition-all duration-150 rounded-md" />

                  {/* Selection indicators with animations */}
                  {room === navigation.from && (
                    <div className="absolute -top-3 -right-3 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center animate-pulse border-2 border-white">
                      <span className="text-white text-xs font-bold">START</span>
                    </div>
                  )}
                  
                  {room === navigation.to && (
                    <div className="absolute -top-3 -right-3 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center animate-bounce border-2 border-white">
                      <Target className="w-3 h-3 text-white" />
                    </div>
                  )}

                  {/* Equipment indicators */}
                  {room.equipment && Array.isArray(room.equipment) && room.equipment.length > 0 && mapState.zoom > 1 && (
                    <div className="absolute bottom-1 right-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full absolute bottom-0 right-0"></div>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-2">
                  <div className="font-semibold text-base">{room.roomNumber}</div>
                  <div className="text-sm text-blue-600">{room.nameEn || room.nameFi}</div>
                  {room.type && (
                    <Badge variant="outline" className="text-xs">
                      {room.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  )}
                  {room.capacity && (
                    <div className="text-xs text-muted-foreground">
                      👥 Capacity: {room.capacity}
                    </div>
                  )}
                  {room.equipment && Array.isArray(room.equipment) && room.equipment.length > 0 && (
                    <div className="text-xs">
                      <span className="font-medium">Equipment: </span>
                      <span className="text-muted-foreground">
                        {room.equipment.slice(0, 2).join(', ')}
                        {room.equipment.length > 2 && '...'}
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    📍 Floor {room.floor || 1} • 👆 Click to {navigation.isNavigating ? 'navigate here' : 'start navigation'}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Render navigation route */}
          {renderRoute()}
          
          {/* Campus Legend */}
          <div className="absolute bottom-4 right-4 z-40">
            <Card className="shadow-lg">
              <CardContent className="p-3">
                <div className="text-xs font-medium text-foreground mb-2">Campus Legend</div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                    <span>Start Point</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                    <span>Destination</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-1 bg-blue-500 rounded"></div>
                    <span>Navigation Route</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions Overlay */}
        {!navigation.isNavigating && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-40">
            <Card className="shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur">
              <CardContent className="p-4 text-center">
                <div className="text-sm text-muted-foreground">
                  💡 Click <strong>"Start Navigation"</strong> then click any room to begin route planning
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}