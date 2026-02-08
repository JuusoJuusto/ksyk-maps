import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
import Header from "@/components/Header";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import NavigationModal from "@/components/NavigationModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import VersionInfo from "@/components/VersionInfo";
import TicketSystem from "@/components/TicketSystem";
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
  mapPositionX?: number;
  mapPositionY?: number;
  width?: number;
  height?: number;
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
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [navigationFrom, setNavigationFrom] = useState<string>("");
  const [navigationTo, setNavigationTo] = useState<string>("");
  const [navigationPath, setNavigationPath] = useState<Room[]>([]);
  const [showNavigationPopup, setShowNavigationPopup] = useState(false);
  const [showMobileHint, setShowMobileHint] = useState(() => {
    const seen = localStorage.getItem('mobileHintSeen');
    return !seen && window.innerWidth < 768;
  });
  
  useEffect(() => {
    if (showMobileHint) {
      const timer = setTimeout(() => {
        setShowMobileHint(false);
        localStorage.setItem('mobileHintSeen', 'true');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showMobileHint]);
  
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

  // Fetch buildings with caching
  const { data: buildings = [], isLoading: buildingsLoading } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/buildings");
      if (!response.ok) {
        throw new Error("Failed to fetch buildings");
      }
      const data = await response.json();
      return data;
    },
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });

  // Fetch rooms with caching
  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await fetch("/api/rooms");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });

  const isLoading = buildingsLoading || roomsLoading;



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

  // Drag handlers with touch support
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

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - pan
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY });
    } else if (e.touches.length === 2) {
      // Two fingers - prepare for pinch zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastTouchDistance(distance);
      setIsDragging(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      // Single touch - pan
      setPanX(e.touches[0].clientX - dragStart.x);
      setPanY(e.touches[0].clientY - dragStart.y);
    } else if (e.touches.length === 2 && lastTouchDistance) {
      // Two fingers - pinch zoom
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = distance - lastTouchDistance;
      const zoomDelta = delta * 0.01;
      setZoom(Math.max(0.5, Math.min(3, zoom + zoomDelta)));
      setLastTouchDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouchDistance(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(Math.max(0.5, Math.min(3, zoom + zoomDelta)));
  };

  const handleNavigate = (from: string, to: string, path?: Room[]) => {
    setNavigationFrom(from);
    setNavigationTo(to);
    if (path && path.length > 0) {
      setNavigationPath(path);
      setShowNavigationPopup(true);
      // Auto-hide popup after 5 seconds
      setTimeout(() => setShowNavigationPopup(false), 5000);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'}`}>
      {isLoading && <LoadingSpinner fullScreen variant="white" message="Loading KSYK Maps..." />}
      
      {/* Top Announcement Banner - Full width, auto-scroll */}
      <AnnouncementBanner />
      
      <Header />
      
      <NavigationModal 
        isOpen={navigationOpen} 
        onClose={() => setNavigationOpen(false)}
        onNavigate={handleNavigate}
      />
      
      {/* Version Info Button */}
      <VersionInfo />
      
      {/* Ticket System Button */}
      <TicketSystem />
      
      <div className="flex h-[calc(100vh-4rem)] relative overflow-hidden">
        {/* Left Sidebar - AMAZING mobile experience with better menu */}
        <div className={`
          ${darkMode ? 'bg-gray-800/98 border-gray-700' : 'bg-white/98 border-gray-200'}
          backdrop-blur-md
          flex flex-col shadow-2xl overflow-hidden
          transition-all duration-300 ease-in-out
          ${sidebarOpen 
            ? 'translate-y-0 md:translate-x-0 opacity-100' 
            : 'translate-y-full md:translate-y-0 md:-translate-x-full opacity-0 md:opacity-100'
          }
          fixed bottom-0 left-0 right-0 md:relative md:bottom-auto
          z-[45] h-[50vh] md:h-full w-full md:w-80
          rounded-t-3xl md:rounded-none
          border-t-4 md:border-t-0 md:border-r border-t-blue-500
          safe-area-inset-bottom
        `}>
          {/* Mobile Drag Handle - BIGGER and more visible */}
          <div className="md:hidden flex justify-center pt-3 pb-2">
            <div className={`w-16 h-1.5 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-400'} shadow-sm`}></div>
          </div>
          
          {/* Navigation Button - Clean Header */}
          <div className={`p-3 sm:p-4 border-b ${darkMode ? 'border-gray-700 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900' : 'border-gray-200 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700'}`}>
            <Button
              onClick={() => setNavigationOpen(true)}
              className="w-full bg-white/20 hover:bg-white/30 text-white border-2 border-white/40 h-12 sm:h-14 text-sm sm:text-base md:text-lg font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
            >
              <Navigation className="mr-2 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              {t('actions.directions')}
            </Button>
          </div>          
          {/* Search Rooms - MOBILE OPTIMIZED */}
          <div className={`p-3 md:p-4 border-b ${darkMode ? 'border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900' : 'border-gray-200 bg-gradient-to-br from-white to-blue-50'}`}>
            <label className={`block text-xs md:text-sm font-bold mb-2 md:mb-3 flex items-center ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              <Search className={`inline h-4 w-4 md:h-5 md:w-5 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              {t('search.rooms')}
            </label>
            <Input
              type="text"
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border-2 shadow-sm text-sm md:text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-blue-200 focus:border-blue-500'}`}
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

        {/* Sidebar Toggle Button - Perfect for mobile */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`
            fixed z-[50] 
            bg-gradient-to-r from-blue-600 to-indigo-600 text-white 
            shadow-xl hover:from-blue-700 hover:to-indigo-700 
            transition-all duration-300 ease-in-out
            active:scale-95
            
            ${sidebarOpen 
              ? 'bottom-[50vh] left-1/2 -translate-x-1/2 rounded-t-2xl px-8 py-3 shadow-2xl' 
              : 'bottom-6 left-1/2 -translate-x-1/2 rounded-full px-8 py-3.5 shadow-xl'
            }
            
            md:bottom-auto md:left-auto md:translate-x-0 md:top-1/2 md:-translate-y-1/2
            ${sidebarOpen 
              ? 'md:left-[320px] md:rounded-r-xl md:rounded-l-none md:px-3 md:py-4 md:shadow-lg' 
              : 'md:left-0 md:rounded-r-xl md:rounded-l-none md:px-3 md:py-4 md:shadow-lg'
            }
          `}
          title={sidebarOpen ? 'Close' : 'Open Menu'}
        >
          <div className="flex items-center justify-center gap-2">
            {/* Mobile icons */}
            <div className="md:hidden flex items-center gap-2">
              {sidebarOpen ? (
                <>
                  <X className="h-5 w-5" />
                  <span className="text-sm font-bold">Close</span>
                </>
              ) : (
                <>
                  <MapPin className="h-5 w-5" />
                  <span className="text-sm font-bold">Menu</span>
                </>
              )}
            </div>
            
            {/* Desktop icons */}
            <div className="hidden md:block">
              {sidebarOpen ? (
                <span className="text-2xl font-bold leading-none">◀</span>
              ) : (
                <span className="text-2xl font-bold leading-none">▶</span>
              )}
            </div>
          </div>
        </button>
        
        {/* Mobile Overlay - DARKER for better focus */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/70 z-[40] md:hidden backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Main Content - Campus Map */}
        <div className={`flex-1 relative ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <Tabs defaultValue="map" className="h-full">
            <TabsList className={`absolute top-2 left-2 md:top-4 md:left-4 z-10 shadow-xl border-2 rounded-xl ${darkMode ? 'bg-gray-800/98 border-gray-600' : 'bg-white/98 border-gray-300'} flex flex-row gap-0.5 md:gap-1 p-1 md:p-1.5 backdrop-blur-md`}>
              <TabsTrigger value="map" className="flex items-center justify-center space-x-1 md:space-x-2 text-xs md:text-sm px-2.5 md:px-4 py-2 md:py-2.5 min-w-[2.5rem] md:min-w-0 rounded-lg transition-all">
                <MapPin className="h-4 md:h-4 w-4 md:w-4" />
                <span className="hidden sm:inline font-medium">{t('nav.map')}</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center justify-center space-x-1 md:space-x-2 text-xs md:text-sm px-2.5 md:px-4 py-2 md:py-2.5 min-w-[2.5rem] md:min-w-0 rounded-lg transition-all">
                <Calendar className="h-4 md:h-4 w-4 md:w-4" />
                <span className="hidden sm:inline font-medium">{t('nav.schedule')}</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center justify-center space-x-1 md:space-x-2 text-xs md:text-sm px-2.5 md:px-4 py-2 md:py-2.5 min-w-[2.5rem] md:min-w-0 rounded-lg transition-all">
                <Settings className="h-4 md:h-4 w-4 md:w-4" />
                <span className="hidden sm:inline font-medium">{t('admin.settings')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="h-full m-0 p-0">
              {/* Google Maps-Style Navigation Popup - Positioned below announcement */}
              {showNavigationPopup && navigationPath.length > 0 && (
                <div className="absolute top-36 md:top-28 left-2 right-2 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 z-30 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-blue-500 p-4 md:p-6 max-w-md animate-in slide-in-from-top duration-300">
                  <div className="flex items-start justify-between mb-3 md:mb-4">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <div className="p-1.5 md:p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                        <Navigation className="h-4 w-4 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-sm md:text-lg font-bold text-gray-900 dark:text-white">Route Found!</h3>
                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{navigationPath.length} steps</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNavigationPopup(false)}
                      className="h-7 w-7 md:h-8 md:w-8 p-0 -mt-1 -mr-1"
                    >
                      <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="w-7 h-7 md:w-8 md:h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm flex-shrink-0">A</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-semibold text-green-700 dark:text-green-400 truncate">{navigationFrom}</p>
                        <p className="text-[10px] md:text-xs text-green-600 dark:text-green-500">Starting point</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center">
                      <div className="h-6 md:h-8 w-0.5 bg-blue-300 dark:bg-blue-600"></div>
                    </div>
                    
                    <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="w-7 h-7 md:w-8 md:h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm flex-shrink-0">B</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-semibold text-red-700 dark:text-red-400 truncate">{navigationTo}</p>
                        <p className="text-[10px] md:text-xs text-red-600 dark:text-red-500">Destination</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400 text-center">Follow the blue path on the map</p>
                  </div>
                </div>
              )}
              
              {/* Compact Navigation Bar - Positioned below announcement */}
              {navigationFrom && navigationTo && !showNavigationPopup && (
                <div className="absolute top-32 md:top-28 left-2 right-2 md:left-4 md:right-auto md:max-w-md z-20 bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 md:p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5 md:space-x-3 flex-1 min-w-0">
                      <div className="flex items-center space-x-1 md:space-x-2">
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full"></div>
                        <ArrowRight className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                        <div className="w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full"></div>
                      </div>
                      <span className="text-[10px] md:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">Active route</span>
                    </div>
                    <div className="flex items-center space-x-1 md:space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNavigationPopup(true)}
                        className="h-8 px-3 text-xs"
                      >
                        Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNavigationFrom("");
                          setNavigationTo("");
                          setNavigationPath([]);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Campus Map - CLEAN GRID ONLY */}
              <div className={`h-full p-0 overflow-hidden relative ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                {/* Mobile Hint - Pinch to Zoom */}
                {showMobileHint && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 md:hidden pointer-events-none">
                    <div className="pointer-events-auto animate-in fade-in zoom-in-95 duration-500">
                      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-2 rounded-2xl shadow-2xl p-6 max-w-xs`}>
                        <div className="text-center">
                          <div className="text-5xl mb-3 animate-pulse">👆✌️</div>
                          <p className={`text-base font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Pinch to zoom
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                            Use two fingers to zoom
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Drag with one finger to pan
                          </p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setShowMobileHint(false);
                              localStorage.setItem('mobileHintSeen', 'true');
                            }}
                            className="mt-4 bg-blue-600 hover:bg-blue-700 w-full"
                          >
                            Got it!
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Map Controls - TOP RIGHT, perfect positioning */}
                <div className="absolute top-20 md:top-4 right-2 md:right-4 z-20 flex flex-col space-y-2 md:space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-12 h-12 md:w-12 md:h-12 p-0 shadow-xl rounded-full border-2 ${darkMode ? 'bg-gray-800/95 hover:bg-gray-700 border-gray-600' : 'bg-white/95 hover:bg-blue-50 border-gray-300'} active:scale-90 transition-all backdrop-blur-md`}
                    onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
                    title="Zoom In"
                  >
                    <Plus className="h-5 md:h-5 w-5 md:w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-12 h-12 md:w-12 md:h-12 p-0 shadow-xl rounded-full border-2 ${darkMode ? 'bg-gray-800/95 hover:bg-gray-700 border-gray-600' : 'bg-white/95 hover:bg-blue-50 border-gray-300'} active:scale-90 transition-all backdrop-blur-md`}
                    onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
                    title="Zoom Out"
                  >
                    <Minus className="h-5 md:h-5 w-5 md:w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-12 h-12 md:w-12 md:h-12 p-0 shadow-xl rounded-full border-2 ${darkMode ? 'bg-gray-800/95 hover:bg-gray-700 border-gray-600' : 'bg-white/95 hover:bg-blue-50 border-gray-300'} active:scale-90 transition-all backdrop-blur-md`}
                    onClick={() => {
                      setZoom(1);
                      setPanX(0);
                      setPanY(0);
                    }}
                    title="Reset View"
                  >
                    <RotateCcw className="h-5 md:h-5 w-5 md:w-5" />
                  </Button>
                </div>

                <div 
                  className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} touch-none`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
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

                  {/* Buildings from Firebase - ENHANCED 3D RENDERING */}
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
                          className="cursor-pointer transition-all hover:opacity-90"
                        >
                          {/* Multi-layer 3D Shadow */}
                          <polygon
                            points={customShape.map(p => `${p.x + 8},${p.y + 8}`).join(' ')}
                            fill="rgba(0,0,0,0.15)"
                            opacity="0.6"
                          />
                          <polygon
                            points={customShape.map(p => `${p.x + 5},${p.y + 5}`).join(' ')}
                            fill="rgba(0,0,0,0.2)"
                            opacity="0.5"
                          />
                          <polygon
                            points={customShape.map(p => `${p.x + 2},${p.y + 2}`).join(' ')}
                            fill="rgba(0,0,0,0.25)"
                            opacity="0.4"
                          />
                          
                          {/* Building Base with Gradient */}
                          <defs>
                            <linearGradient id={`buildingGrad-${building.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" style={{ stopColor: building.colorCode || '#3B82F6', stopOpacity: 1 }} />
                              <stop offset="100%" style={{ stopColor: building.colorCode || '#3B82F6', stopOpacity: 0.7 }} />
                            </linearGradient>
                            <filter id={`glow-${building.id}`}>
                              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>
                          
                          <polygon
                            points={customShape.map(p => `${p.x},${p.y}`).join(' ')}
                            fill={`url(#buildingGrad-${building.id})`}
                            stroke="white"
                            strokeWidth="5"
                            opacity="0.98"
                            filter={`url(#glow-${building.id})`}
                          />
                          
                          {/* Glass Shine Effect */}
                          <polygon
                            points={customShape.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="url(#buildingGradient)"
                            opacity="0.4"
                          />
                          
                          {/* Building Name - Enhanced */}
                          <text
                            x={centerX}
                            y={centerY - 10}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="32"
                            fontWeight="900"
                            style={{ 
                              pointerEvents: 'none', 
                              textShadow: '3px 3px 6px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.5)',
                              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
                            }}
                          >
                            {building.name}
                          </text>
                          <text
                            x={centerX}
                            y={centerY + 16}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="12"
                            fontWeight="600"
                            style={{ pointerEvents: 'none', opacity: 0.95, textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}
                          >
                            {building.nameEn || building.nameFi}
                          </text>
                          
                          {/* Floor Badge */}
                          <g transform={`translate(${Math.min(...xs) + 10}, ${Math.min(...ys) + 10})`}>
                            <rect
                              x="0"
                              y="0"
                              width="45"
                              height="22"
                              fill="rgba(0,0,0,0.7)"
                              rx="11"
                              stroke="white"
                              strokeWidth="2"
                            />
                            <text
                              x="22.5"
                              y="11"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize="11"
                              fontWeight="bold"
                            >
                              {building.floors}F
                            </text>
                          </g>
                        </g>
                      );
                    }
                    
                    // Default rectangle rendering for buildings without custom shape - EVEN BIGGER
                    const width = 400; // Increased from 280
                    const height = 260; // Increased from 180
                    
                    return (
                      <g 
                        key={building.id}
                        onClick={() => {
                          setSelectedBuilding(building);
                          setSelectedFloor(1);
                        }}
                        className="cursor-pointer transition-all hover:opacity-90"
                        style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
                      >
                        {/* Multi-layer 3D Shadow - Enhanced */}
                        <rect
                          x={x + 10}
                          y={y + 10}
                          width={width}
                          height={height}
                          fill="rgba(0,0,0,0.2)"
                          rx="12"
                          opacity="0.7"
                        />
                        <rect
                          x={x + 6}
                          y={y + 6}
                          width={width}
                          height={height}
                          fill="rgba(0,0,0,0.25)"
                          rx="12"
                          opacity="0.6"
                        />
                        <rect
                          x={x + 3}
                          y={y + 3}
                          width={width}
                          height={height}
                          fill="rgba(0,0,0,0.3)"
                          rx="12"
                          opacity="0.5"
                        />
                        
                        {/* Building Base with Enhanced Gradient */}
                        <defs>
                          <linearGradient id={`buildingGrad-${building.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: building.colorCode || '#3B82F6', stopOpacity: 1 }} />
                            <stop offset="50%" style={{ stopColor: building.colorCode || '#3B82F6', stopOpacity: 0.9 }} />
                            <stop offset="100%" style={{ stopColor: building.colorCode || '#3B82F6', stopOpacity: 0.75 }} />
                          </linearGradient>
                          <filter id={`glow-${building.id}`}>
                            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                          <linearGradient id={`shine-${building.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: 'white', stopOpacity: 0.6 }} />
                            <stop offset="50%" style={{ stopColor: 'white', stopOpacity: 0.2 }} />
                            <stop offset="100%" style={{ stopColor: 'white', stopOpacity: 0 }} />
                          </linearGradient>
                        </defs>
                        
                        {/* Main Building Body */}
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={`url(#buildingGrad-${building.id})`}
                          stroke="white"
                          strokeWidth="4"
                          rx="12"
                          opacity="1"
                          filter={`url(#glow-${building.id})`}
                        />
                        
                        {/* Glass Shine Effect - Enhanced */}
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height / 2}
                          fill={`url(#shine-${building.id})`}
                          rx="12"
                          opacity="0.5"
                          style={{ pointerEvents: 'none' }}
                        />
                        
                        {/* Building Name - EVEN LARGER */}
                        <text
                          x={x + width / 2}
                          y={y + height / 2 - 20}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="96"
                          fontWeight="900"
                          style={{ 
                            pointerEvents: 'none',
                            paintOrder: 'stroke fill',
                            stroke: 'rgba(0,0,0,0.8)',
                            strokeWidth: '6px',
                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.9))'
                          }}
                        >
                          {building.name}
                        </text>
                        
                        {/* Building Subtitle - LARGER */}
                        <text
                          x={x + width / 2}
                          y={y + height / 2 + 50}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="28"
                          fontWeight="700"
                          style={{ 
                            pointerEvents: 'none',
                            paintOrder: 'stroke fill',
                            stroke: 'rgba(0,0,0,0.7)',
                            strokeWidth: '3px',
                            opacity: 0.95
                          }}
                        >
                          {building.nameEn || building.nameFi}
                        </text>
                        
                        {/* Floor Badge - EVEN LARGER */}
                        <g transform={`translate(${x + 20}, ${y + 20})`}>
                          <rect
                            x="0"
                            y="0"
                            width="90"
                            height="50"
                            fill="rgba(0,0,0,0.85)"
                            rx="25"
                            stroke="white"
                            strokeWidth="4"
                          />
                          <text
                            x="45"
                            y="25"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="26"
                            fontWeight="bold"
                          >
                            {building.floors}F
                          </text>
                        </g>
                        
                        {/* Hover Effect Border */}
                        <rect
                          x={x - 2}
                          y={y - 2}
                          width={width + 4}
                          height={height + 4}
                          fill="none"
                          stroke="rgba(255,255,255,0.5)"
                          strokeWidth="3"
                          rx="14"
                          opacity="0"
                          className="hover-border"
                          style={{ 
                            pointerEvents: 'none',
                            transition: 'opacity 0.3s ease'
                          }}
                        />
                      </g>
                    );
                  })}
                  
                  {/* Rooms inside buildings */}
                  {rooms.filter((room: Room) => room.floor === selectedFloor).map((room: Room) => {
                    if (!room.mapPositionX || !room.mapPositionY) return null;
                    
                    const roomWidth = room.width || 40;
                    const roomHeight = room.height || 30;
                    
                    // Room type colors
                    const roomColors: Record<string, string> = {
                      classroom: '#60A5FA',
                      lab: '#34D399',
                      office: '#FBBF24',
                      library: '#A78BFA',
                      gymnasium: '#F87171',
                      cafeteria: '#FB923C',
                      toilet: '#94A3B8',
                      stairway: '#EF4444',
                      hallway: '#D1D5DB',
                      elevator: '#10B981'
                    };
                    
                    const roomColor = roomColors[room.type] || '#9CA3AF';
                    
                    return (
                      <g key={room.id} className="cursor-pointer" onClick={() => setSelectedRoom(room)}>
                        {/* Room shadow - 2 layers */}
                        <rect
                          x={room.mapPositionX + 3}
                          y={room.mapPositionY + 3}
                          width={roomWidth}
                          height={roomHeight}
                          fill="rgba(0,0,0,0.25)"
                          rx="5"
                        />
                        <rect
                          x={room.mapPositionX + 1.5}
                          y={room.mapPositionY + 1.5}
                          width={roomWidth}
                          height={roomHeight}
                          fill="rgba(0,0,0,0.15)"
                          rx="5"
                        />
                        {/* Room - Full color with thicker border */}
                        <rect
                          x={room.mapPositionX}
                          y={room.mapPositionY}
                          width={roomWidth}
                          height={roomHeight}
                          fill={roomColor}
                          stroke="white"
                          strokeWidth="3.5"
                          rx="8"
                          opacity="0.95"
                        />
                        {/* Glass shine effect */}
                        <rect
                          x={room.mapPositionX}
                          y={room.mapPositionY}
                          width={roomWidth}
                          height={roomHeight / 3}
                          fill="white"
                          rx="5"
                          opacity="0.2"
                        />
                        {/* Room number - BIGGER */}
                        <text
                          x={room.mapPositionX + roomWidth / 2}
                          y={room.mapPositionY + roomHeight / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="18"
                          fontWeight="bold"
                          style={{ pointerEvents: 'none', textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}
                        >
                          {room.roomNumber}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* Navigation Path Visualization - ENHANCED Google Maps Style */}
                  {navigationPath.length > 1 && navigationPath.map((room, idx) => {
                    if (idx === navigationPath.length - 1 || !room.mapPositionX || !room.mapPositionY) return null;
                    const nextRoom = navigationPath[idx + 1];
                    if (!nextRoom.mapPositionX || !nextRoom.mapPositionY) return null;
                    
                    const x1 = room.mapPositionX + (room.width || 40) / 2;
                    const y1 = room.mapPositionY + (room.height || 30) / 2;
                    const x2 = nextRoom.mapPositionX + (nextRoom.width || 40) / 2;
                    const y2 = nextRoom.mapPositionY + (nextRoom.height || 30) / 2;
                    
                    return (
                      <g key={`path-${idx}`}>
                        {/* Outer glow - animated */}
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#60A5FA"
                          strokeWidth="16"
                          opacity="0.3"
                          strokeLinecap="round"
                        >
                          <animate
                            attributeName="opacity"
                            values="0.2;0.4;0.2"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                        </line>
                        {/* Middle glow */}
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#3B82F6"
                          strokeWidth="10"
                          opacity="0.6"
                          strokeLinecap="round"
                        />
                        {/* Main path - animated dashes */}
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#2563EB"
                          strokeWidth="6"
                          opacity="0.95"
                          strokeLinecap="round"
                          strokeDasharray="15,8"
                        >
                          <animate
                            attributeName="stroke-dashoffset"
                            from="0"
                            to="23"
                            dur="1s"
                            repeatCount="indefinite"
                          />
                        </line>
                        {/* Direction arrow with number */}
                        <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2})`}>
                          <circle r="12" fill="white" opacity="0.95" stroke="#2563EB" strokeWidth="2" />
                          <circle r="10" fill="#2563EB" opacity="0.9">
                            <animate
                              attributeName="r"
                              values="10;11;10"
                              dur="1.5s"
                              repeatCount="indefinite"
                            />
                          </circle>
                          <text
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="11"
                            fontWeight="bold"
                          >
                            {idx + 1}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                  
                  {/* Start Marker - Enhanced with animation */}
                  {navigationPath.length > 0 && navigationPath[0]?.mapPositionX && navigationPath[0]?.mapPositionY && (
                    <g>
                      {/* Pulsing outer ring */}
                      <circle
                        cx={navigationPath[0].mapPositionX + (navigationPath[0].width || 40) / 2}
                        cy={navigationPath[0].mapPositionY + (navigationPath[0].height || 30) / 2}
                        r="20"
                        fill="#10B981"
                        opacity="0.3"
                      >
                        <animate
                          attributeName="r"
                          values="20;25;20"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.3;0.1;0.3"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      {/* Main marker */}
                      <circle
                        cx={navigationPath[0].mapPositionX + (navigationPath[0].width || 40) / 2}
                        cy={navigationPath[0].mapPositionY + (navigationPath[0].height || 30) / 2}
                        r="16"
                        fill="#10B981"
                        opacity="0.95"
                        stroke="white"
                        strokeWidth="3"
                      />
                      <text
                        x={navigationPath[0].mapPositionX + (navigationPath[0].width || 40) / 2}
                        y={navigationPath[0].mapPositionY + (navigationPath[0].height || 30) / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="18"
                        fontWeight="bold"
                      >
                        A
                      </text>
                    </g>
                  )}
                  
                  {/* End Marker - Enhanced with animation */}
                  {navigationPath.length > 1 && navigationPath[navigationPath.length - 1]?.mapPositionX && navigationPath[navigationPath.length - 1]?.mapPositionY && (
                    <g>
                      {/* Pulsing outer ring */}
                      <circle
                        cx={navigationPath[navigationPath.length - 1].mapPositionX! + (navigationPath[navigationPath.length - 1].width || 40) / 2}
                        cy={navigationPath[navigationPath.length - 1].mapPositionY! + (navigationPath[navigationPath.length - 1].height || 30) / 2}
                        r="20"
                        fill="#EF4444"
                        opacity="0.3"
                      >
                        <animate
                          attributeName="r"
                          values="20;25;20"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.3;0.1;0.3"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      {/* Main marker */}
                      <circle
                        cx={navigationPath[navigationPath.length - 1].mapPositionX! + (navigationPath[navigationPath.length - 1].width || 40) / 2}
                        cy={navigationPath[navigationPath.length - 1].mapPositionY! + (navigationPath[navigationPath.length - 1].height || 30) / 2}
                        r="16"
                        fill="#EF4444"
                        opacity="0.95"
                        stroke="white"
                        strokeWidth="3"
                      />
                      <text
                        x={navigationPath[navigationPath.length - 1].mapPositionX! + (navigationPath[navigationPath.length - 1].width || 40) / 2}
                        y={navigationPath[navigationPath.length - 1].mapPositionY! + (navigationPath[navigationPath.length - 1].height || 30) / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="18"
                        fontWeight="bold"
                      >
                        B
                      </text>
                    </g>
                  )}
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
                
                {/* Support */}
                <Card className={`shadow-lg mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                  <CardContent className="p-6">
                    <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>📞 Support</h3>
                    <div className={`space-y-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-2">Need Help?</h4>
                        <p className="text-sm text-blue-800 dark:text-blue-400 mb-3">
                          For technical support, bug reports, or feature requests:
                        </p>
                        <div className="space-y-2">
                          <a 
                            href="mailto:juuso.kaikula@ksyk.fi?subject=KSYK Maps Support (v2.0.1)"
                            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-sm"
                          >
                            <span>📧</span>
                            <span>juuso.kaikula@ksyk.fi</span>
                          </a>
                          <br />
                          <a 
                            href="https://discord.gg/5ERZp9gUpr"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-sm"
                          >
                            <span>💬</span>
                            <span>Join Discord Community</span>
                          </a>
                        </div>
                        <p className="text-blue-600 dark:text-blue-400 text-xs mt-3">
                          ⏱️ Response time: Usually within 24 hours
                        </p>
                        <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                          💬 Please include version number (v2.0.1) when reporting issues
                        </p>
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <p><strong>School:</strong> Kulosaaren Yhteiskoulu (KSYK)</p>
                        <p><strong>Developer:</strong> StudiOWL</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* About */}
                <Card className={`shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                  <CardContent className="p-6">
                    <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>ℹ️ About</h3>
                    <div className={`space-y-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <div className="space-y-2">
                        <p><strong>KSYK Maps</strong> - Interactive Campus Navigation</p>
                        <p>Version 2.1.0</p>
                        <p>Latest Update: January 25, 2026</p>
                        <p>Originally Released: August 20, 2025</p>
                        <p>© 2026 StudiOWL</p>
                      </div>
                      
                      <Button
                        onClick={() => window.open('https://owlapps.vercel.app', '_blank')}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        Learn More About StudiOWL
                      </Button>
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
