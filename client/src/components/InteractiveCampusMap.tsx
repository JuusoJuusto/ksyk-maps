import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Building, 
  Users, 
  Search, 
  Zap,
  Navigation,
  Info,
  Star
} from "lucide-react";

interface Building {
  id: string;
  name: string;
  nameEn?: string;
  nameFi?: string;
  floors: number;
  colorCode: string;
  mapPositionX?: number;
  mapPositionY?: number;
}

interface Room {
  id: string;
  roomNumber: string;
  name?: string;
  nameEn?: string;
  type: string;
  floor: number;
  buildingId: string;
}

interface InteractiveCampusMapProps {
  selectedFloor: number;
  selectedRoom: Room | null;
  onRoomSelect: (room: Room | null) => void;
  buildings: Building[];
  rooms: Room[];
}

export default function InteractiveCampusMap({ 
  selectedFloor, 
  selectedRoom, 
  onRoomSelect, 
  buildings: propBuildings, 
  rooms: propRooms 
}: InteractiveCampusMapProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 600 });

  // Use props or fetch data as fallback
  const buildings = propBuildings.length > 0 ? propBuildings : [];
  const rooms = propRooms.length > 0 ? propRooms : [];

  const filteredRooms = rooms.filter((room: Room) =>
    selectedBuilding ? room.buildingId === selectedBuilding.id && room.floor === selectedFloor : false
  );

  const floorRooms = rooms.filter((room: Room) => room.floor === selectedFloor);

  const getPopularRooms = () => {
    const popularTypes = ['library', 'gymnasium', 'cafeteria', 'lab', 'music_room'];
    return rooms.filter((room: Room) => 
      popularTypes.some(type => room.type.toLowerCase().includes(type))
    ).slice(0, 6);
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    
    const dx = (e.clientX - dragStart.x) * (viewBox.width / 1000);
    const dy = (e.clientY - dragStart.y) * (viewBox.height / 600);
    
    setViewBox(prev => ({
      ...prev,
      x: prev.x - dx,
      y: prev.y - dy
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    
    setViewBox(prev => ({
      x: prev.x,
      y: prev.y,
      width: Math.max(500, Math.min(2000, prev.width * zoomFactor)),
      height: Math.max(300, Math.min(1200, prev.height * zoomFactor))
    }));
  };

  return (
    <div className="space-y-6">
      {/* Interactive Map Container */}
      <Card className="shadow-2xl border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
          <CardTitle className="text-3xl flex items-center">
            <MapPin className="mr-3 h-8 w-8" />
            KSYK Campus Map
          </CardTitle>
          <p className="text-blue-100 text-lg">Drag to pan • Scroll to zoom • Click buildings to explore</p>
        </CardHeader>
        <CardContent className="p-0">
          {/* Map Grid */}
          <div className="relative bg-white min-h-[600px] overflow-hidden">
            {/* Grid Background */}
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }}></div>
            
            {/* Buildings Grid */}
            <svg 
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
              className={`w-full h-[600px] relative z-10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              {/* Grid Lines (Major) */}
              {Array.from({ length: 25 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i * 40}
                  y1="0"
                  x2={i * 40}
                  y2="600"
                  stroke="#d1d5db"
                  strokeWidth="1"
                  opacity="0.3"
                />
              ))}
              {Array.from({ length: 15 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={i * 40}
                  x2="1000"
                  y2={i * 40}
                  stroke="#d1d5db"
                  strokeWidth="1"
                  opacity="0.3"
                />
              ))}

              {/* Buildings as Grid-Aligned Elements */}
              {buildings.map((building: Building, index: number) => {
                // Snap to grid (40px units)
                const gridX = building.mapPositionX ? Math.round(building.mapPositionX / 40) * 40 : 80 + (index % 5) * 200;
                const gridY = building.mapPositionY ? Math.round(building.mapPositionY / 40) * 40 : 80 + Math.floor(index / 5) * 160;
                const isHovered = hoveredBuilding === building.id;
                const isSelected = selectedBuilding?.id === building.id;
                const buildingRooms = rooms.filter(room => room.buildingId === building.id && room.floor === selectedFloor);
                
                // Building dimensions (grid-aligned)
                const buildingWidth = 160;
                const buildingHeight = 120;
                
                return (
                  <g key={building.id}>
                    {/* Building Shadow */}
                    <rect
                      x={gridX + 3}
                      y={gridY + 3}
                      width={buildingWidth}
                      height={buildingHeight}
                      fill="rgba(0,0,0,0.15)"
                      rx="4"
                    />
                    
                    {/* Building */}
                    <rect
                      x={gridX}
                      y={gridY}
                      width={buildingWidth}
                      height={buildingHeight}
                      fill={building.colorCode}
                      stroke={isSelected ? "#fbbf24" : isHovered ? "#60a5fa" : "#94a3b8"}
                      strokeWidth={isSelected ? "3" : "2"}
                      rx="4"
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredBuilding(building.id)}
                      onMouseLeave={() => setHoveredBuilding(null)}
                      onClick={() => setSelectedBuilding(building)}
                    />
                    
                    {/* Building Grid Pattern */}
                    {Array.from({ length: building.floors }).map((_, floorIdx) => (
                      <line
                        key={`floor-${floorIdx}`}
                        x1={gridX}
                        y1={gridY + (floorIdx + 1) * (buildingHeight / (building.floors + 1))}
                        x2={gridX + buildingWidth}
                        y2={gridY + (floorIdx + 1) * (buildingHeight / (building.floors + 1))}
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="1"
                        className="pointer-events-none"
                      />
                    ))}
                    
                    {/* Building Label */}
                    <text
                      x={gridX + buildingWidth / 2}
                      y={gridY + buildingHeight / 2 - 10}
                      textAnchor="middle"
                      className="fill-white font-bold text-3xl pointer-events-none"
                      style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                    >
                      {building.name}
                    </text>
                    
                    {/* Building Name */}
                    <text
                      x={gridX + buildingWidth / 2}
                      y={gridY + buildingHeight / 2 + 15}
                      textAnchor="middle"
                      className="fill-white text-sm pointer-events-none"
                      style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.7)" }}
                    >
                      {building.nameEn || building.name}
                    </text>
                    
                    {/* Floor indicator */}
                    <text
                      x={gridX + buildingWidth / 2}
                      y={gridY + buildingHeight / 2 + 30}
                      textAnchor="middle"
                      className="fill-white text-xs pointer-events-none opacity-90"
                    >
                      {building.floors} Floor{building.floors > 1 ? 's' : ''} • {buildingRooms.length} Rooms
                    </text>
                    
                    {/* Selection indicator */}
                    {isSelected && (
                      <>
                        <circle
                          cx={gridX + buildingWidth / 2}
                          cy={gridY - 15}
                          r="6"
                          fill="#fbbf24"
                          className="animate-pulse"
                        />
                        <rect
                          x={gridX - 2}
                          y={gridY - 2}
                          width={buildingWidth + 4}
                          height={buildingHeight + 4}
                          fill="none"
                          stroke="#fbbf24"
                          strokeWidth="2"
                          strokeDasharray="8,4"
                          rx="4"
                          className="pointer-events-none animate-pulse"
                        />
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
            
            {/* Legend */}
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur rounded-lg p-4 shadow-xl border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                <Info className="h-4 w-4 mr-2 text-blue-600" />
                Map Guide
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-2 border border-gray-300"></div>
                  <span className="text-gray-700">Academic Buildings</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2 border border-gray-300"></div>
                  <span className="text-gray-700">Sports & Recreation</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-500 rounded mr-2 border border-gray-300"></div>
                  <span className="text-gray-700">Administration</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-500 rounded mr-2 border border-gray-300"></div>
                  <span className="text-gray-700">Special Facilities</span>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Click buildings to explore rooms</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Building Details & Room List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selected Building Info */}
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardTitle className="flex items-center">
              <Building className="mr-2 h-6 w-6" />
              {selectedBuilding ? `Building ${selectedBuilding.name}` : "Select a Building"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {selectedBuilding ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">{selectedBuilding.nameEn}</h3>
                  <div 
                    className="w-8 h-8 rounded-full shadow-md"
                    style={{ backgroundColor: selectedBuilding.colorCode }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{selectedBuilding.floors}</div>
                    <div className="text-sm text-blue-800">Floors</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{filteredRooms.length}</div>
                    <div className="text-sm text-green-800">Rooms</div>
                  </div>
                </div>
                
                {/* Room Types */}
                <div>
                  <h4 className="font-semibold mb-2">Room Types:</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(filteredRooms.map((room: Room) => room.type))).map((type: string) => (
                      <Badge key={type} variant="outline" className="capitalize">
                        {type.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Building className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Click on a building to see details</p>
                <p className="text-sm">Explore rooms, facilities, and floor plans</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Locations */}
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
            <CardTitle className="flex items-center">
              <Star className="mr-2 h-6 w-6" />
              Popular Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {getPopularRooms().map((room: Room) => (
                <div key={room.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <div>
                    <div className="font-semibold text-gray-900">{room.roomNumber}</div>
                    <div className="text-sm text-gray-600">{room.name || room.nameEn}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="capitalize text-xs">
                      {room.type.replace('_', ' ')}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">Floor {room.floor}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <Search className="mr-2 h-4 w-4" />
                Search All Rooms
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}