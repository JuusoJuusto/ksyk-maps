import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Maximize2,
  Minimize2,
  X,
  Minus,
  Calculator,
  FileText,
  Music,
  Image,
  Calendar,
  Mail,
  Settings,
  Clock,
  BookOpen,
  Video,
  Code,
  Terminal,
  Gamepad2,
  Globe,
  Home,
} from "lucide-react";

// Import desktop app components
import CalculatorApp from "@/components/desktop-apps/CalculatorApp";
import NotepadApp from "@/components/desktop-apps/NotepadApp";
import ClockApp from "@/components/desktop-apps/ClockApp";
import PaintApp from "@/components/desktop-apps/PaintApp";
import MusicPlayerApp from "@/components/desktop-apps/MusicPlayerApp";
import CalendarApp from "@/components/desktop-apps/CalendarApp";
import FileManagerApp from "@/components/desktop-apps/FileManagerApp";
import SettingsApp from "@/components/desktop-apps/SettingsApp";

interface DesktopApp {
  id: string;
  appId: string;
  name: string;
  nameFi?: string;
  icon: string;
  description?: string;
  category: string;
  appType: "iframe" | "component" | "external";
  appUrl?: string;
  componentName?: string;
  width: number;
  height: number;
  resizable: boolean;
  minimizable: boolean;
  maximizable: boolean;
}

interface WindowState {
  id: string;
  app: DesktopApp;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}

interface DesktopConfig {
  wallpaper: string;
  theme: string;
  installedApps: string[];
  desktopLayout: any;
  pinnedApps: string[];
}

const iconMap: Record<string, any> = {
  calculator: Calculator,
  notepad: FileText,
  music: Music,
  photos: Image,
  image: Image,
  calendar: Calendar,
  mail: Mail,
  settings: Settings,
  clock: Clock,
  books: BookOpen,
  video: Video,
  code: Code,
  terminal: Terminal,
  games: Gamepad2,
  globe: Globe,
};

export default function WilmaDesktopEnhanced() {
  const params = useParams();
  const id = params.studentId || params.adminId || '';
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [desktopEnabled, setDesktopEnabled] = useState(false);
  const [availableApps, setAvailableApps] = useState<DesktopApp[]>([]);
  const [userConfig, setUserConfig] = useState<DesktopConfig | null>(null);
  const [openWindows, setOpenWindows] = useState<WindowState[]>([]);
  const [highestZIndex, setHighestZIndex] = useState(1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [draggingWindow, setDraggingWindow] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingWindow, setResizingWindow] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    fetchDesktopData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [id]);

  const fetchDesktopData = async () => {
    try {
      console.log('🖥️ Fetching desktop data for user:', id);
      
      const settingsRes = await fetch("/api/wilma/desktop/settings");
      if (!settingsRes.ok) {
        throw new Error("Failed to fetch desktop settings");
      }
      const settings = await settingsRes.json();
      
      if (!settings.enabled) {
        toast({
          title: "Työpöytä ei käytössä",
          description: "Työpöytäympäristö ei ole vielä käytössä.",
          variant: "destructive",
        });
        setTimeout(() => setLocation(`/wilma/${id}`), 2000);
        return;
      }
      
      setDesktopEnabled(true);

      const appsRes = await fetch("/api/wilma/desktop/apps");
      if (!appsRes.ok) {
        throw new Error("Failed to fetch apps");
      }
      const apps = await appsRes.json();
      console.log('✅ Fetched apps:', apps.length);
      
      if (apps.length === 0) {
        toast({
          title: "Ei sovelluksia",
          description: "Työpöydällä ei ole vielä sovelluksia.",
          variant: "destructive",
        });
      }
      
      setAvailableApps(apps);

      const configRes = await fetch(`/api/wilma/desktop/config/${id}`);
      if (!configRes.ok) {
        const defaultConfig: DesktopConfig = {
          wallpaper: "/KSYK-logo-desktop.png",
          theme: "dark",
          installedApps: apps.map((app: DesktopApp) => app.appId),
          desktopLayout: {},
          pinnedApps: apps.slice(0, 8).map((app: DesktopApp) => app.appId),
        };
        setUserConfig(defaultConfig);
      } else {
        const config = await configRes.json();
        setUserConfig(config);
      }

    } catch (error) {
      console.error("❌ Error fetching desktop data:", error);
      toast({
        title: "Virhe",
        description: "Työpöydän lataaminen epäonnistui.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openApp = (app: DesktopApp) => {
    const existingWindow = openWindows.find(w => w.app.appId === app.appId);
    if (existingWindow) {
      bringToFront(existingWindow.id);
      if (existingWindow.isMinimized) {
        toggleMinimize(existingWindow.id);
      }
      return;
    }

    const centerX = (window.innerWidth - app.width) / 2;
    const centerY = (window.innerHeight - app.height) / 2;

    const newWindow: WindowState = {
      id: `window-${Date.now()}`,
      app,
      isMinimized: false,
      isMaximized: false,
      position: { x: Math.max(50, centerX), y: Math.max(50, centerY) },
      size: { width: app.width, height: app.height },
      zIndex: highestZIndex + 1,
    };

    setOpenWindows([...openWindows, newWindow]);
    setHighestZIndex(highestZIndex + 1);
    setStartMenuOpen(false);
  };

  const closeWindow = (windowId: string) => {
    setOpenWindows(openWindows.filter(w => w.id !== windowId));
  };

  const toggleMinimize = (windowId: string) => {
    setOpenWindows(openWindows.map(w =>
      w.id === windowId ? { ...w, isMinimized: !w.isMinimized } : w
    ));
  };

  const toggleMaximize = (windowId: string) => {
    setOpenWindows(openWindows.map(w =>
      w.id === windowId ? { ...w, isMaximized: !w.isMaximized } : w
    ));
  };

  const bringToFront = (windowId: string) => {
    const newZIndex = highestZIndex + 1;
    setOpenWindows(openWindows.map(w =>
      w.id === windowId ? { ...w, zIndex: newZIndex } : w
    ));
    setHighestZIndex(newZIndex);
  };

  const handleMouseDownTitle = (e: React.MouseEvent, windowId: string) => {
    e.preventDefault();
    const window = openWindows.find(w => w.id === windowId);
    if (!window || window.isMaximized) return;

    setDraggingWindow(windowId);
    setDragOffset({
      x: e.clientX - window.position.x,
      y: e.clientY - window.position.y,
    });
    bringToFront(windowId);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggingWindow) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      setOpenWindows(openWindows.map(w =>
        w.id === draggingWindow
          ? { ...w, position: { x: Math.max(0, newX), y: Math.max(0, newY) } }
          : w
      ));
    }

    if (resizingWindow) {
      const window = openWindows.find(w => w.id === resizingWindow);
      if (!window) return;

      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newWidth = Math.max(300, resizeStart.width + deltaX);
      const newHeight = Math.max(200, resizeStart.height + deltaY);

      setOpenWindows(openWindows.map(w =>
        w.id === resizingWindow
          ? { ...w, size: { width: newWidth, height: newHeight } }
          : w
      ));
    }
  };

  const handleMouseUp = () => {
    setDraggingWindow(null);
    setResizingWindow(null);
  };

  const handleMouseDownResize = (e: React.MouseEvent, windowId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const window = openWindows.find(w => w.id === windowId);
    if (!window || !window.app.resizable) return;

    setResizingWindow(windowId);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: window.size.width,
      height: window.size.height,
    });
    bringToFront(windowId);
  };

  useEffect(() => {
    if (draggingWindow || resizingWindow) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingWindow, resizingWindow, dragOffset, resizeStart, openWindows]);

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName] || FileText;
    return <IconComponent className="w-6 h-6" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl font-semibold">Ladataan työpöytää...</p>
        </div>
      </div>
    );
  }

  if (!desktopEnabled) {
    return null;
  }

  const wallpaper = userConfig?.wallpaper || "/KSYK-logo-desktop.png";
  const installedApps = availableApps.filter(app => 
    userConfig?.installedApps?.includes(app.appId)
  );

  return (
    <div 
      className="fixed inset-0 overflow-hidden select-none"
      style={{
        backgroundColor: "#000000",
      }}
    >
      {/* Desktop Background with KSYK Logo */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          backgroundImage: `url(${wallpaper})`,
          backgroundSize: "400px auto",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.25,
        }}
      />
      
      {/* Desktop Icons */}
      <div className="absolute inset-0 p-4 grid grid-cols-8 gap-4 content-start overflow-y-auto pb-20">
        {installedApps.slice(0, 32).map((app) => (
          <button
            key={app.appId}
            onClick={() => openApp(app)}
            onDoubleClick={() => openApp(app)}
            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-white/10 active:bg-white/20 transition-all duration-200 group cursor-pointer"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-white/90 to-white/70 rounded-xl shadow-lg flex items-center justify-center text-blue-600 group-hover:scale-110 group-active:scale-95 transition-transform duration-200">
              {getIconComponent(app.icon)}
            </div>
            <span className="text-white text-xs font-medium text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2 w-full">
              {app.nameFi || app.name}
            </span>
          </button>
        ))}
      </div>

      {/* Open Windows */}
      {openWindows.map(window => (
        !window.isMinimized && (
          <div
            key={window.id}
            className={`absolute bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-200 ${
              window.isMaximized ? "inset-4" : ""
            } ${draggingWindow === window.id ? "cursor-move" : ""}`}
            style={{
              left: window.isMaximized ? undefined : window.position.x,
              top: window.isMaximized ? undefined : window.position.y,
              width: window.isMaximized ? undefined : window.size.width,
              height: window.isMaximized ? undefined : window.size.height,
              zIndex: window.zIndex,
            }}
            onClick={() => bringToFront(window.id)}
          >
            {/* Window Title Bar */}
            <div 
              className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white px-4 py-2 flex items-center justify-between cursor-move select-none"
              onMouseDown={(e) => handleMouseDownTitle(e, window.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {getIconComponent(window.app.icon)}
                </div>
                <span className="font-medium text-sm truncate">
                  {window.app.nameFi || window.app.name}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {window.app.minimizable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-white/20 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMinimize(window.id);
                    }}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                )}
                {window.app.maximizable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-white/20 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMaximize(window.id);
                    }}
                  >
                    {window.isMaximized ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-red-500 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeWindow(window.id);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Window Content */}
            <div className="h-[calc(100%-40px)] bg-white overflow-auto relative">
              {window.app.appType === "iframe" && window.app.appUrl && (
                <iframe
                  src={window.app.appUrl}
                  className="w-full h-full border-0"
                  title={window.app.name}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                />
              )}
              {window.app.appType === "component" && (
                <div className="h-full">
                  {window.app.appId === "calculator" && <CalculatorApp />}
                  {window.app.appId === "notepad" && <NotepadApp />}
                  {window.app.appId === "clock" && <ClockApp />}
                  {window.app.appId === "paint" && <PaintApp />}
                  {window.app.appId === "music-player" && <MusicPlayerApp />}
                  {window.app.appId === "calendar" && <CalendarApp />}
                  {window.app.appId === "file-manager" && <FileManagerApp />}
                  {window.app.appId === "settings" && <SettingsApp />}
                  {!["calculator", "notepad", "clock", "paint", "music-player", "calendar", "file-manager", "settings"].includes(window.app.appId) && (
                    <div className="p-6">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                          {getIconComponent(window.app.icon)}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {window.app.nameFi || window.app.name}
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {window.app.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Resize Handle */}
              {window.app.resizable && !window.isMaximized && (
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 hover:bg-gray-400 transition-colors"
                  style={{
                    clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
                  }}
                  onMouseDown={(e) => handleMouseDownResize(e, window.id)}
                />
              )}
            </div>
          </div>
        )
      ))}

      {/* Taskbar */}
      <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 backdrop-blur-md border-t border-gray-700 flex items-center px-2 gap-2 shadow-2xl">
        <Button
          onClick={() => setStartMenuOpen(!startMenuOpen)}
          className="h-11 w-11 p-0 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 flex items-center justify-center rounded-lg shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Home className="w-6 h-6 text-white" />
        </Button>

        <div className="w-px h-8 bg-gray-700"></div>

        <div className="flex-1 flex items-center gap-2 overflow-x-auto">
          {openWindows.map(window => (
            <Button
              key={window.id}
              onClick={() => {
                if (window.isMinimized) {
                  toggleMinimize(window.id);
                }
                bringToFront(window.id);
              }}
              variant={window.isMinimized ? "outline" : "secondary"}
              className={`h-11 px-4 flex items-center gap-2 rounded-lg transition-all duration-200 ${
                window.isMinimized 
                  ? "bg-gray-800 hover:bg-gray-700 border-gray-600" 
                  : "bg-gray-700 hover:bg-gray-600 shadow-md"
              }`}
            >
              <div className="w-5 h-5 flex-shrink-0">
                {getIconComponent(window.app.icon)}
              </div>
              <span className="text-sm max-w-[150px] truncate text-white">
                {window.app.nameFi || window.app.name}
              </span>
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-white text-sm font-medium">
          <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg">
            <Clock className="w-4 h-4" />
            <span>{currentTime.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="bg-gray-800 px-3 py-2 rounded-lg">
            {currentTime.toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* Start Menu */}
      {startMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setStartMenuOpen(false)}
          />
          
          <div className="fixed bottom-16 left-2 w-[500px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-700">
            <div className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white p-6">
              <h3 className="font-bold text-2xl mb-1">Sovellukset</h3>
              <p className="text-sm text-white/80">{installedApps.length} sovellusta saatavilla</p>
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto">
              <div className="grid grid-cols-4 gap-3">
                {installedApps.map(app => (
                  <button
                    key={app.appId}
                    onClick={() => openApp(app)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white/10 active:bg-white/20 transition-all duration-200 group"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-active:scale-95 transition-transform duration-200">
                      {getIconComponent(app.icon)}
                    </div>
                    <span className="text-xs text-center font-medium text-white line-clamp-2">
                      {app.nameFi || app.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-700 p-3 bg-gray-900/50">
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10 rounded-lg"
                onClick={() => {
                  setStartMenuOpen(false);
                  setLocation(`/wilma/${id}`);
                }}
              >
                <Home className="w-5 h-5 mr-2" />
                Palaa Wilmaan
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
