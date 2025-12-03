import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import NavigationModal from "@/components/NavigationModal";
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
  X,
  Navigation,
  ArrowRight,
  Zap
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
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [navigationFrom, setNavigationFrom] = useState<string>("");
  const [navigationTo, setNavigationTo] = useState<string>("");
  
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

  const handleNavigate = (from: string, to: string) => {
    setNavigationFrom(from);
    setNavigationTo(to);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <NavigationModal 
        isOpen={navigationOpen} 
        onClose={() => setNavigationOpen(false)}
        onNavigate={handleNavigate}
      />
      
      <div className="flex h-[calc(100vh-4rem)] relative">
        {/* Left Sidebar - Navigation - COLLAPSIBLE & MOBILE FRIENDLY */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-white border-r border-gray-200 flex flex-col shadow-sm transition-all duration-300 overflow-hidden md:relative absolute md:static z-40 h-full`}>
          {/* Navigation Button - Clean Header */}
          <div className="p-4 border-b border-gray-200 bg-blue-600">
            <Button
              onClick={() => setNavigationOpen(true)}
              className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 h-12 text-lg font-semibold"
            >
              <Navigation className="mr-2 h-5 w-5" />
              Get Directions
            </Button>
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

          {/* How to use - Clean Guide */}
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <h4 className="text-base font-bold text-blue-900 mb-3 flex items-center">
                <Zap className="mr-2 h-5 w-5 text-blue-600" />
                Quick Guide
              </h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">🧭</span>
                  <span><strong>Get Directions:</strong> Click button above to navigate between rooms</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">🔍</span>
                  <span><strong>Search:</strong> Find any room by number or name</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">🗺️</span>
                  <span><strong>Map Controls:</strong> Zoom with +/- buttons, drag to pan</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">📱</span>
                  <span><strong>Mobile:</strong> Tap outside sidebar to close</span>
                </li>
              </ul>
            </div>
            
            {/* Navigation Route Display */}
            {navigationFrom && navigationTo && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="text-sm font-bold text-green-900 mb-2">Active Route:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-800">{navigationFrom}</span>
                  </div>
                  <div className="flex items-center">
                    <ArrowRight className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">Walking route</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-red-800">{navigationTo}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Toggle Button - MOBILE FRIENDLY */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed md:absolute top-1/2 -translate-y-1/2 z-50 bg-blue-600 text-white p-2 md:p-3 rounded-r-lg shadow-lg hover:bg-blue-700 transition-all text-sm md:text-base"
          style={{ 
            left: sidebarOpen ? (typeof window !== 'undefined' && window.innerWidth < 768 ? '0px' : '320px') : '0px'
          }}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
        
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Main Content - Campus Map */}
        <div className="flex-1 relative bg-white">
          <Tabs defaultValue="map" className="h-full">
            <TabsList className="absolute top-4 left-4 z-10 bg-white shadow-lg border border-gray-200 flex-col md:flex-row">
              <TabsTrigger value="map" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
                <MapPin className="h-3 md:h-4 w-3 md:w-4" />
                <span className="hidden md:inline">Map</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
                <Calendar className="h-3 md:h-4 w-3 md:w-4" />
                <span className="hidden md:inline">Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
                <Settings className="h-3 md:h-4 w-3 md:w-4" />
                <span className="hidden md:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Enhanced Announcements Banner with animations */}
            <AnnouncementBanner />

            <TabsContent value="map" className="h-full m-0 p-0">
              {/* Navigation Route Display */}
              {navigationFrom && navigationTo && (
                <div className="absolute top-16 md:top-20 left-4 right-16 md:right-20 z-20 bg-white/95 backdrop-blur rounded-lg shadow-xl border-2 border-blue-500 p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 md:space-x-4 flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                        <span className="text-xs md:text-sm font-semibold text-green-700 truncate">{navigationFrom}</span>
                      </div>
                      <div className="flex-shrink-0">
                        <ArrowRight className="h-4 md:h-5 w-4 md:w-5 text-blue-600" />
                      </div>
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                        <span className="text-xs md:text-sm font-semibold text-red-700 truncate">{navigationTo}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNavigationFrom("");
                        setNavigationTo("");
                      }}
                      className="ml-2 h-6 w-6 md:h-8 md:w-8 p-0 flex-shrink-0"
                    >
                      <X className="h-3 md:h-4 w-3 md:w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 flex items-center">
                    <Navigation className="h-3 w-3 mr-1" />
                    <span className="hidden md:inline">Follow the blue path • Estimated time: ~3 minutes</span>
                    <span className="md:hidden">~3 min walk</span>
                  </div>
                </div>
              )}
              
              {/* Campus Map - CLEAN GRID ONLY */}
              <div className="h-full bg-white p-0 overflow-hidden relative">
                {/* Map Controls - MOBILE FRIENDLY */}
                <div className="absolute top-16 md:top-20 right-2 md:right-4 z-20 flex flex-col space-y-1 md:space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 md:w-10 md:h-10 p-0 bg-white shadow-lg hover:bg-blue-50"
                    onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
                    title="Zoom In"
                  >
                    <Plus className="h-4 md:h-5 w-4 md:w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 md:w-10 md:h-10 p-0 bg-white shadow-lg hover:bg-blue-50"
                    onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
                    title="Zoom Out"
                  >
                    <Minus className="h-4 md:h-5 w-4 md:w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 md:w-10 md:h-10 p-0 bg-white shadow-lg hover:bg-blue-50"
                    onClick={() => {
                      setZoom(1);
                      setPanX(0);
                      setPanY(0);
                    }}
                    title="Reset View"
                  >
                    <RotateCcw className="h-4 md:h-5 w-4 md:w-5" />
                  </Button>
                  
                  {/* Mobile Navigation Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 md:w-10 md:h-10 p-0 bg-blue-600 text-white shadow-lg hover:bg-blue-700 md:hidden"
                    onClick={() => setNavigationOpen(true)}
                    title="Navigation"
                  >
                    <Navigation className="h-4 w-4" />
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
                <svg viewBox="-500 -500 2000 1500" className="w-full h-full pointer-events-none">
                  {/* Grid background - Larger viewport to prevent cropping */}
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                    </pattern>
                    <pattern id="gridMajor" width="200" height="200" patternUnits="userSpaceOnUse">
                      <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#d1d5db" strokeWidth="2"/>
                    </pattern>
                  </defs>
                  <rect x="-500" y="-500" width="2000" height="1500" fill="white" />
                  <rect x="-500" y="-500" width="2000" height="1500" fill="url(#grid)" />
                  <rect x="-500" y="-500" width="2000" height="1500" fill="url(#gridMajor)" />

                  {/* Buildings removed - use KSYK Builder in Admin Panel to add buildings */}
                  {/* The map is now much larger (2000x1500) so buildings won't crop out */}
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
