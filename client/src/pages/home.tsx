import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  MapPin, 
  Settings,
  Calendar,
  Plus,
  Minus,
  RotateCcw,
  X
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
  capacity?: number;
  equipment?: string[];
}



export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved ? JSON.parse(saved) : window.innerWidth > 768;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Room[]>([]);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

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



  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = rooms.filter((room: Room) =>
        room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 10));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, rooms]);

  // Get rooms for selected floor
  const floorRooms = rooms.filter((room: Room) => room.floor === selectedFloor);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(Math.max(0.5, Math.min(3, zoom + zoomDelta)));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar - Navigation - COLLAPSIBLE */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-white border-r border-gray-200 flex flex-col shadow-sm transition-all duration-300 overflow-hidden`}>
          {/* Navigation Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
            <h2 className="text-xl font-bold text-white mb-1">KSYK Campus Map</h2>
            <p className="text-sm text-blue-100">Search and explore campus</p>
          </div>          
          {/* Search Rooms */}
          <div className="p-4 border-b border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Search className="inline h-4 w-4 mr-1" />
              Search Rooms
            </label>
            <Input
              type="text"
              placeholder="Room number or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-3 max-h-64 overflow-y-auto border rounded-lg bg-white shadow-sm">
                {searchResults.map((room: Room) => (
                  <div
                    key={room.id}
                    className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                    onClick={() => {
                      setSelectedRoom(room);
                      setSelectedFloor(room.floor);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                  >
                    <div className="font-semibold text-blue-600">{room.roomNumber}</div>
                    <div className="text-sm text-gray-600">{room.name || room.nameEn}</div>
                    <div className="text-xs text-gray-500">Floor {room.floor} • {room.type.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Floor Navigation */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Floor ({floorRooms.length} rooms)</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFloor(1)}
                className="h-8 w-8 p-0"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Floor Controls */}
            <div className="flex items-center justify-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFloor(Math.max(selectedFloor - 1, 0))}
                disabled={selectedFloor <= 0}
                className="w-10 h-10 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center justify-center w-16 h-16 bg-blue-600 text-white font-bold text-2xl rounded-xl shadow-lg">
                {selectedFloor}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFloor(Math.min(selectedFloor + 1, 3))}
                disabled={selectedFloor >= 3}
                className="w-10 h-10 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Selected Room Info */}
          {selectedRoom && (
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-blue-900 text-lg">{selectedRoom.roomNumber}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRoom(null)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-blue-700 mb-2">{selectedRoom.name || selectedRoom.nameEn}</p>
              <div className="text-xs text-blue-600 space-y-1">
                <div>Floor {selectedRoom.floor}</div>
                <div className="capitalize">{selectedRoom.type.replace('_', ' ')}</div>
                {selectedRoom.capacity && <div>{selectedRoom.capacity} seats</div>}
              </div>
              
              {/* Room Features */}
              {selectedRoom.equipment && selectedRoom.equipment.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {selectedRoom.equipment.map((item, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Buildings Legend */}
          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Buildings:</h3>
            <div className="space-y-2">
              {buildings.map((building: Building) => (
                <div 
                  key={building.id} 
                  className={`flex items-center space-x-2 text-sm p-2 rounded cursor-pointer transition-colors ${
                    selectedBuilding?.id === building.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedBuilding(building)}
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: building.colorCode }}
                  ></div>
                  <span className="font-medium">{building.name}</span>
                  <span className="text-gray-500">- {building.nameEn}</span>
                </div>
              ))}
            </div>
            
            {/* How to use */}
            <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">How to use:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Click rooms to navigate</li>
                <li>• Green = start, red = destination</li>
                <li>• Search rooms from search bar</li>
                <li>• Zoom with + and - buttons</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-blue-600 text-white p-2 rounded-r-lg shadow-lg hover:bg-blue-700 transition-all"
          style={{ left: sidebarOpen ? '320px' : '0px' }}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
        
        {/* Main Content - Campus Map */}
        <div className="flex-1 relative bg-white">
          <Tabs defaultValue="map" className="h-full">
            <TabsList className="absolute top-4 left-4 z-10 bg-white shadow-lg border border-gray-200">
              <TabsTrigger value="map" className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Map</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Enhanced Announcements Banner with animations */}
            <AnnouncementBanner />

            <TabsContent value="map" className="h-full m-0 p-0">
              {/* Campus Map - CLEAN GRID ONLY */}
              <div className="h-full bg-white p-0 overflow-hidden relative">
                {/* Map Controls */}
                <div className="absolute top-20 right-4 z-20 flex flex-col space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-10 h-10 p-0 bg-white shadow-lg hover:bg-blue-50"
                    onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
                    title="Zoom In"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-10 h-10 p-0 bg-white shadow-lg hover:bg-blue-50"
                    onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
                    title="Zoom Out"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-10 h-10 p-0 bg-white shadow-lg hover:bg-blue-50"
                    onClick={() => {
                      setZoom(1);
                      setPanX(0);
                      setPanY(0);
                    }}
                    title="Reset View"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </div>

                <div 
                  className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  style={{ 
                    transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, 
                    transformOrigin: 'center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease'
                  }}
                >
                <svg viewBox="0 0 1000 600" className="w-full h-full pointer-events-none">
                  {/* Grid background - CLEAN */}
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                    </pattern>
                    <pattern id="gridMajor" width="200" height="200" patternUnits="userSpaceOnUse">
                      <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#d1d5db" strokeWidth="2"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="white" />
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  <rect width="100%" height="100%" fill="url(#gridMajor)" />

                  {/* Buildings - GRID ALIGNED ONLY */}
                  {buildings.map((building: Building, index: number) => {
                    // Snap to 40px grid
                    const gridX = building.mapPositionX ? Math.round(building.mapPositionX / 40) * 40 : 80 + (index % 5) * 200;
                    const gridY = building.mapPositionY ? Math.round(building.mapPositionY / 40) * 40 : 80 + Math.floor(index / 5) * 160;
                    const isSelected = selectedBuilding?.id === building.id;
                    const buildingRooms = rooms.filter(
                      (room: Room) => room.buildingId === building.id && room.floor === selectedFloor
                    );
                    
                    const buildingWidth = 160;
                    const buildingHeight = 120;
                    
                    return (
                      <g key={building.id}>
                        {/* Building - CLEAN GRID STYLE */}
                        <rect
                          x={gridX}
                          y={gridY}
                          width={buildingWidth}
                          height={buildingHeight}
                          fill={building.colorCode}
                          stroke={isSelected ? "#2563eb" : "#94a3b8"}
                          strokeWidth={isSelected ? "3" : "2"}
                          rx="4"
                          className="cursor-pointer transition-all pointer-events-auto"
                          onClick={() => setSelectedBuilding(building)}
                        />
                        
                        {/* Floor lines */}
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
                        
                        {/* Building label */}
                        <text
                          x={gridX + buildingWidth / 2}
                          y={gridY + buildingHeight / 2 - 10}
                          textAnchor="middle"
                          className="fill-white font-bold text-3xl pointer-events-none"
                          style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                        >
                          {building.name}
                        </text>
                        
                        <text
                          x={gridX + buildingWidth / 2}
                          y={gridY + buildingHeight / 2 + 15}
                          textAnchor="middle"
                          className="fill-white text-sm pointer-events-none"
                          style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.7)" }}
                        >
                          {building.nameEn || building.name}
                        </text>
                        
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
                          <rect
                            x={gridX - 2}
                            y={gridY - 2}
                            width={buildingWidth + 4}
                            height={buildingHeight + 4}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="2"
                            strokeDasharray="8,4"
                            rx="4"
                            className="pointer-events-none animate-pulse"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="h-full m-0 p-8 overflow-auto">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Class Schedule</h2>
                <Card className="shadow-lg">
                  <CardContent className="p-8">
                    <p className="text-gray-600 text-center">Schedule functionality coming soon...</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="h-full m-0 p-8 overflow-auto">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Settings</h2>
                <Card className="shadow-lg">
                  <CardContent className="p-8">
                    <p className="text-gray-600 text-center">Settings panel coming soon...</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
