import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
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
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved ? JSON.parse(saved) : window.innerWidth > 768;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Room[]>([]);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [zoom, setZoom] = useState(1); // Start at normal zoom to see buildings
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
  
  const handleLanguageChange = (lang: string) => {
    localStorage.setItem('ksyk_language', lang);
    i18n.changeLanguage(lang).then(() => {
      setCurrentLang(lang);
      window.location.reload();
    });
  };
  
  const handleResetMap = () => {
    setZoom(1); // Reset to normal zoom
    setPanX(0);
    setPanY(0);
    setSelectedFloor(1);
    setSelectedRoom(null);
    setSelectedBuilding(null);
  };

  // Fetch buildings
  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      console.log('🏢 Fetching buildings from API...');
      const response = await fetch("/api/buildings");
      if (!response.ok) {
        console.error('❌ Failed to fetch buildings:', response.status, response.statusText);
        throw new Error("Failed to fetch buildings");
      }
      const data = await response.json();
      console.log('✅ Received buildings:', data.length, data);
      return data;
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
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'}`}>
      <Header />
      
      <NavigationModal 
        isOpen={navigationOpen} 
        onClose={() => setNavigationOpen(false)}
        onNavigate={handleNavigate}
      />
      
      <div className="flex h-[calc(100vh-4rem)] relative">
        {/* Left Sidebar - Navigation - COLLAPSIBLE & MOBILE FRIENDLY */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/95 border-gray-200'} backdrop-blur-sm border-r flex flex-col shadow-2xl transition-all duration-300 overflow-hidden md:relative absolute md:static z-40 h-full`}>
          {/* Navigation Button - Clean Header */}
          <div className={`p-4 border-b ${darkMode ? 'border-gray-700 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900' : 'border-gray-200 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700'}`}>
            <Button
              onClick={() => setNavigationOpen(true)}
              className="w-full bg-white/20 hover:bg-white/30 text-white border-2 border-white/40 h-14 text-lg font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
            >
              <Navigation className="mr-2 h-6 w-6" />
              {t('actions.directions')}
            </Button>
          </div>          
          {/* Search Rooms */}
          <div className={`p-4 border-b ${darkMode ? 'border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900' : 'border-gray-200 bg-gradient-to-br from-white to-blue-50'}`}>
            <label className={`block text-sm font-bold mb-3 flex items-center ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              <Search className={`inline h-5 w-5 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              {t('search.rooms')}
            </label>
            <Input
              type="text"
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border-2 shadow-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-blue-200 focus:border-blue-500'}`}
            />
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className={`mt-3 max-h-64 overflow-y-auto border-2 rounded-xl shadow-lg ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-blue-200 bg-white'}`}>
                {searchResults.map((room: Room) => (
                  <div
                    key={room.id}
                    className={`p-3 cursor-pointer border-b last:border-b-0 transition-all ${darkMode ? 'hover:bg-gray-600 border-gray-600' : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 border-gray-200'}`}
                    onClick={() => {
                      setSelectedRoom(room);
                      setSelectedFloor(room.floor);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                  >
                    <div className={`font-bold text-lg ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>{room.roomNumber}</div>
                    <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{room.name || room.nameEn}</div>
                    <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Floor {room.floor} • {room.type.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Floor Navigation */}
          <div className={`p-4 border-b ${darkMode ? 'border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900' : 'border-gray-200 bg-gradient-to-br from-white to-purple-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{t('map.floors')} ({floorRooms.length} rooms)</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFloor(1)}
                className={`h-8 w-8 p-0 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-100'}`}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Floor Controls */}
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFloor(Math.max(selectedFloor - 1, 0))}
                disabled={selectedFloor <= 0}
                className={`w-12 h-12 p-0 border-2 disabled:opacity-30 ${darkMode ? 'border-gray-600 hover:bg-gray-700 bg-gray-800' : 'border-blue-300 hover:bg-blue-50'}`}
              >
                <Minus className="h-5 w-5" />
              </Button>
              
              <div className={`flex items-center justify-center w-20 h-20 font-black text-3xl rounded-2xl shadow-2xl transform hover:scale-110 transition-transform ${darkMode ? 'bg-gradient-to-br from-blue-700 to-indigo-900 text-white' : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'}`}>
                {selectedFloor}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFloor(Math.min(selectedFloor + 1, 3))}
                disabled={selectedFloor >= 3}
                className={`w-12 h-12 p-0 border-2 disabled:opacity-30 ${darkMode ? 'border-gray-600 hover:bg-gray-700 bg-gray-800' : 'border-blue-300 hover:bg-blue-50'}`}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Selected Room Info */}
          {selectedRoom && (
            <div className={`p-4 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-gray-200'}`}>
              <div className="flex items-start justify-between mb-2">
                <h3 className={`font-bold text-lg ${darkMode ? 'text-blue-400' : 'text-blue-900'}`}>{selectedRoom.roomNumber}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRoom(null)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-blue-700'}`}>{selectedRoom.name || selectedRoom.nameEn}</p>
              <div className={`text-xs space-y-1 ${darkMode ? 'text-gray-400' : 'text-blue-600'}`}>
                <div>Floor {selectedRoom.floor}</div>
                <div className="capitalize">{selectedRoom.type.replace('_', ' ')}</div>
                {selectedRoom.capacity && <div>{selectedRoom.capacity} seats</div>}
              </div>
              
              {/* Room Features */}
              {selectedRoom.equipment && selectedRoom.equipment.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {selectedRoom.equipment.map((item, idx) => (
                    <span key={idx} className={`px-2 py-1 text-xs rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-100 text-blue-800'}`}>
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* How to use - Clean Guide */}
          <div className="p-4 flex-1 overflow-y-auto">
            <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'}`}>
              <h4 className={`text-base font-bold mb-3 flex items-center ${darkMode ? 'text-gray-200' : 'text-blue-900'}`}>
                <Zap className={`mr-2 h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                Quick Guide
              </h4>
              <ul className={`text-sm space-y-2 ${darkMode ? 'text-gray-300' : 'text-blue-800'}`}>
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
              <div className={`mt-4 p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-green-50 border-green-200'}`}>
                <h4 className={`text-sm font-bold mb-2 ${darkMode ? 'text-gray-200' : 'text-green-900'}`}>Active Route:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${darkMode ? 'bg-green-400' : 'bg-green-500'}`}></div>
                    <span className={darkMode ? 'text-gray-300' : 'text-green-800'}>{navigationFrom}</span>
                  </div>
                  <div className="flex items-center">
                    <ArrowRight className={`h-4 w-4 mr-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Walking route</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${darkMode ? 'bg-red-400' : 'bg-red-500'}`}></div>
                    <span className={darkMode ? 'text-gray-300' : 'text-red-800'}>{navigationTo}</span>
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
        <div className={`flex-1 relative ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <Tabs defaultValue="map" className="h-full">
            <TabsList className={`absolute top-4 left-4 z-10 shadow-lg border flex-col md:flex-row ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <TabsTrigger value="map" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
                <MapPin className="h-3 md:h-4 w-3 md:w-4" />
                <span className="hidden md:inline">{t('nav.map')}</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
                <Calendar className="h-3 md:h-4 w-3 md:w-4" />
                <span className="hidden md:inline">{t('nav.schedule')}</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
                <Settings className="h-3 md:h-4 w-3 md:w-4" />
                <span className="hidden md:inline">{t('admin.settings')}</span>
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
              <div className={`h-full p-0 overflow-hidden relative ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                {/* Map Controls - MOBILE FRIENDLY */}
                <div className="absolute top-16 md:top-20 right-2 md:right-4 z-20 flex flex-col space-y-1 md:space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-8 h-8 md:w-10 md:h-10 p-0 shadow-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-blue-50'}`}
                    onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
                    title="Zoom In"
                  >
                    <Plus className="h-4 md:h-5 w-4 md:w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-8 h-8 md:w-10 md:h-10 p-0 shadow-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-blue-50'}`}
                    onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
                    title="Zoom Out"
                  >
                    <Minus className="h-4 md:h-5 w-4 md:w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-8 h-8 md:w-10 md:h-10 p-0 shadow-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-blue-50'}`}
                    onClick={() => {
                      setZoom(1); // Reset to normal zoom
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
                <svg viewBox="0 0 2000 1200" className="w-full h-full" preserveAspectRatio="xMidYMid meet" style={{ minWidth: '100%', minHeight: '100%' }}>
                  {/* Grid background - LARGER AREA with same grid size */}
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke={darkMode ? '#374151' : '#e5e7eb'} strokeWidth="1"/>
                    </pattern>
                    <pattern id="gridMajor" width="250" height="250" patternUnits="userSpaceOnUse">
                      <rect width="250" height="250" fill="url(#grid)"/>
                      <path d="M 250 0 L 0 0 0 250" fill="none" stroke={darkMode ? '#4b5563' : '#d1d5db'} strokeWidth="2"/>
                    </pattern>
                    <linearGradient id="buildingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: "white", stopOpacity: 0.4 }} />
                      <stop offset="100%" style={{ stopColor: "white", stopOpacity: 0 }} />
                    </linearGradient>
                  </defs>
                  {/* Background fills larger viewport */}
                  <rect width="100%" height="100%" fill={darkMode ? '#1f2937' : 'white'} />
                  <rect width="100%" height="100%" fill="url(#gridMajor)" />

                  {/* Buildings from Firebase - EXACT same rendering as KSYK Builder */}
                  {buildings.map((building: Building, index: number) => {
                    const x = building.mapPositionX ?? 100 + (index * 160);
                    const y = building.mapPositionY ?? 100;
                    
                    // Try to parse custom shape from description
                    let customShape: {x: number, y: number}[] | null = null;
                    try {
                      if ((building as any).description) {
                        const parsed = JSON.parse((building as any).description);
                        customShape = parsed.customShape;
                      }
                    } catch {}
                    
                    // If building has custom shape, render polygon
                    if (customShape && customShape.length > 2) {
                      const xs = customShape.map(p => p.x);
                      const ys = customShape.map(p => p.y);
                      const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
                      const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
                      
                      return (
                        <g 
                          key={building.id}
                          onClick={() => {
                            setSelectedBuilding(building);
                            setSelectedFloor(1);
                          }}
                          className="cursor-pointer transition-all"
                        >
                          {/* Shadow */}
                          <polygon
                            points={customShape.map(p => `${p.x + 4},${p.y + 4}`).join(' ')}
                            fill="rgba(0,0,0,0.3)"
                            opacity="0.5"
                          />
                          {/* Building */}
                          <polygon
                            points={customShape.map(p => `${p.x},${p.y}`).join(' ')}
                            fill={building.colorCode || '#3B82F6'}
                            stroke="white"
                            strokeWidth="4"
                            opacity="0.95"
                          />
                          {/* Highlight */}
                          <polygon
                            points={customShape.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="url(#buildingGradient)"
                            opacity="0.3"
                          />
                          <text
                            x={centerX}
                            y={centerY - 8}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="24"
                            fontWeight="bold"
                            style={{ pointerEvents: 'none', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                          >
                            {building.name}
                          </text>
                          <text
                            x={centerX}
                            y={centerY + 14}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="10"
                            style={{ pointerEvents: 'none', opacity: 0.9 }}
                          >
                            {building.nameEn || building.nameFi}
                          </text>
                        </g>
                      );
                    }
                    
                    // Default rectangle rendering for buildings without custom shape
                    const width = 150;
                    const height = 100;
                    
                    return (
                      <g 
                        key={building.id}
                        onClick={() => {
                          setSelectedBuilding(building);
                          setSelectedFloor(1);
                        }}
                        className="cursor-pointer transition-all"
                      >
                        {/* Shadow */}
                        <rect
                          x={x + 4}
                          y={y + 4}
                          width={width}
                          height={height}
                          fill="rgba(0,0,0,0.3)"
                          rx="8"
                          opacity="0.5"
                        />
                        {/* Building */}
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={building.colorCode || '#3B82F6'}
                          stroke="white"
                          strokeWidth="4"
                          rx="8"
                          opacity="0.95"
                        />
                        {/* Highlight */}
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill="url(#buildingGradient)"
                          rx="8"
                          opacity="0.3"
                        />
                        <text
                          x={x + width / 2}
                          y={y + height / 2 - 10}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="28"
                          fontWeight="bold"
                          style={{ pointerEvents: 'none', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
                        >
                          {building.name}
                        </text>
                        <text
                          x={x + width / 2}
                          y={y + height / 2 + 15}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="11"
                          style={{ pointerEvents: 'none', opacity: 0.9 }}
                        >
                          {building.nameEn || building.nameFi}
                        </text>
                        <rect
                          x={x + width - 35}
                          y={y + 8}
                          width="30"
                          height="20"
                          fill="rgba(255,255,255,0.3)"
                          rx="10"
                        />
                        <text
                          x={x + width - 20}
                          y={y + 18}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="12"
                          fontWeight="bold"
                          style={{ pointerEvents: 'none' }}
                        >
                          {building.floors}F
                        </text>
                      </g>
                    );
                  })}
                </svg>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="h-full m-0 p-8 overflow-auto">
              <div className="max-w-4xl mx-auto">
                <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('nav.schedule')}</h2>
                <Card className={`shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                  <CardContent className="p-8">
                    <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('loading')}...</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings" className={`h-full m-0 p-8 overflow-auto ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 to-blue-50'}`}>
              <div className="max-w-4xl mx-auto">
                <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('admin.settings')}</h2>
                
                {/* Language Settings */}
                <Card className={`shadow-lg mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                  <CardContent className="p-6">
                    <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>🌐 {t('nav.information')}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Language / Kieli
                        </label>
                        <div className="flex space-x-2">
                          <Button
                            variant={currentLang === 'en' ? 'default' : 'outline'}
                            onClick={() => handleLanguageChange('en')}
                            className="flex-1"
                          >
                            🇬🇧 English
                          </Button>
                          <Button
                            variant={currentLang === 'fi' ? 'default' : 'outline'}
                            onClick={() => handleLanguageChange('fi')}
                            className="flex-1"
                          >
                            🇫🇮 Suomi
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Appearance Settings */}
                <Card className={`shadow-lg mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                  <CardContent className="p-6">
                    <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>🎨 Appearance</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Dark Mode
                          </label>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Toggle dark theme</p>
                        </div>
                        <Button
                          variant={darkMode ? 'default' : 'outline'}
                          onClick={toggleDarkMode}
                          className="w-24"
                        >
                          {darkMode ? '🌙 On' : '☀️ Off'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Map Settings */}
                <Card className={`shadow-lg mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                  <CardContent className="p-6">
                    <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>🗺️ {t('map.title')}</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Reset Map View
                          </label>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Return to default position and zoom</p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={handleResetMap}
                          className="flex items-center space-x-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span>Reset</span>
                        </Button>
                      </div>
                      
                      <div className={`pt-4 border-t ${darkMode ? 'border-gray-700' : ''}`}>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Current Zoom: {(zoom * 100).toFixed(0)}%
                        </label>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))}
                            className={darkMode ? 'border-gray-600 hover:bg-gray-700' : ''}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className={`flex-1 flex items-center justify-center rounded px-4 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`}>
                            {(zoom * 100).toFixed(0)}%
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setZoom(Math.min(zoom + 0.1, 3))}
                            className={darkMode ? 'border-gray-600 hover:bg-gray-700' : ''}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* About */}
                <Card className="shadow-lg">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">ℹ️ About</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><strong>KSYK Map</strong> - Interactive Campus Navigation</p>
                      <p>Version 2.0</p>
                      <p>© 2025 OWL Apps</p>
                    </div>
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
