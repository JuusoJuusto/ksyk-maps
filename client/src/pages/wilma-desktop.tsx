import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AppRenderer } from "@/components/desktop-apps/AppRegistry";
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
  Zap,
  Briefcase,
  Palette,
  Cpu,
  MessageSquare,
  Users,
  Cloud,
  HardDrive,
  Box,
  Brain,
  GraduationCap,
  Trello,
  Figma as FigmaIcon,
} from "lucide-react";

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
  browser: Globe,
  editor: FileText,
  snake: Gamepad2,
  viewer: Image,
  tasks: Briefcase,
  weather: Zap,
  paint: Palette,
  system: Cpu,
  spotify: Music,
  minecraft: Gamepad2,
  youtube: Video,
  steam: Gamepad2,
  discord: MessageSquare,
  vscode: Code,
  messenger: Mail,
  maps: Globe,
  excel: FileText,
  word: FileText,
  powerpoint: FileText,
  outlook: Mail,
  teams: Users,
  // New app icons
  wilma: GraduationCap,
  zoom: Video,
  github: Code,
  slack: MessageSquare,
  onedrive: Cloud,
  googledrive: HardDrive,
  googlemeet: Video,
  dropbox: Box,
  notion: FileText,
  trello: Trello,
  figma: FigmaIcon,
  canva: Palette,
  coursera: GraduationCap,
  udemy: Video,
  khanacademy: BookOpen,
  quizlet: Brain,
  duolingo: Globe,
};

export default function WilmaDesktop() {
  const params = useParams();
  // Support both studentId and adminId from routes
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
  
  // Windows-like features
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [snapZone, setSnapZone] = useState<'left' | 'right' | 'top' | null>(null);
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [currentDesktop, setCurrentDesktop] = useState(1);
  const [totalDesktops] = useState(4); // Virtual desktops

  useEffect(() => {
    fetchDesktopData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [id]);

  const fetchDesktopData = async () => {
    try {
      console.log('🖥️ Fetching desktop data for user:', id);
      console.log('🔄 Cache busting:', Date.now()); // Force fresh data
      
      // Check if desktop is enabled
      const settingsRes = await fetch("/api/wilma/desktop/settings");
      if (!settingsRes.ok) {
        console.error('❌ Failed to fetch desktop settings:', settingsRes.status);
        throw new Error("Failed to fetch desktop settings");
      }
      const settings = await settingsRes.json();
      console.log('✅ Desktop settings:', settings);
      
      if (!settings.enabled) {
        console.log('⚠️ Desktop is not enabled');
        toast({
          title: "Työpöytä ei käytössä",
          description: "Työpöytäympäristö ei ole vielä käytössä. Ota se käyttöön admin-asetuksista.",
          variant: "destructive",
        });
        setTimeout(() => setLocation(`/wilma/${id}`), 2000);
        return;
      }
      
      setDesktopEnabled(true);
      console.log('✅ Desktop is enabled');

      // Fetch available apps
      const appsRes = await fetch("/api/wilma/desktop/apps");
      if (!appsRes.ok) {
        console.error('❌ Failed to fetch apps:', appsRes.status);
        throw new Error("Failed to fetch apps");
      }
      const apps = await appsRes.json();
      console.log('✅ Fetched apps:', apps.length);
      
      // If no apps exist, show helpful message
      if (apps.length === 0) {
        console.log('⚠️ No desktop apps found');
        toast({
          title: "Ei sovelluksia",
          description: "Työpöydällä ei ole vielä sovelluksia. Pyydä järjestelmänvalvojaa lisäämään sovelluksia.",
          variant: "destructive",
        });
      }
      
      setAvailableApps(apps);

      // Fetch user config
      const configRes = await fetch(`/api/wilma/desktop/config/${id}`);
      if (!configRes.ok) {
        console.error('❌ Failed to fetch user config:', configRes.status);
        throw new Error("Failed to fetch user config");
      }
      const config = await configRes.json();
      console.log('✅ User config:', config);
      setUserConfig(config);

    } catch (error) {
      console.error("❌ Error fetching desktop data:", error);
      toast({
        title: "Virhe",
        description: "Työpöydän lataaminen epäonnistui. Tarkista konsolista lisätietoja.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openApp = (app: DesktopApp) => {
    const existingWindow = openWindows.find(w => w.app.appId === app.appId);
    if (existingWindow) {
      // Bring to front and restore if minimized
      bringToFront(existingWindow.id);
      if (existingWindow.isMinimized) {
        toggleMinimize(existingWindow.id);
      }
      return;
    }

    const newWindow: WindowState = {
      id: `window-${Date.now()}`,
      app,
      isMinimized: false,
      isMaximized: false,
      position: { x: 100 + openWindows.length * 30, y: 100 + openWindows.length * 30 },
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

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName] || FileText;
    return <IconComponent className="w-6 h-6" />;
  };

  // Windows Snap feature
  const handleWindowSnap = (windowId: string, zone: 'left' | 'right' | 'top') => {
    setOpenWindows(openWindows.map(w => {
      if (w.id !== windowId) return w;
      
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight - 56; // Subtract taskbar height
      
      let newPosition = { x: 0, y: 0 };
      let newSize = { width: 0, height: 0 };
      
      switch (zone) {
        case 'left':
          newPosition = { x: 0, y: 0 };
          newSize = { width: screenWidth / 2, height: screenHeight };
          break;
        case 'right':
          newPosition = { x: screenWidth / 2, y: 0 };
          newSize = { width: screenWidth / 2, height: screenHeight };
          break;
        case 'top':
          newPosition = { x: 0, y: 0 };
          newSize = { width: screenWidth, height: screenHeight };
          break;
      }
      
      return {
        ...w,
        position: newPosition,
        size: newSize,
        isMaximized: zone === 'top',
      };
    }));
    
    toast({
      title: "✨ Ikkuna kohdistettu",
      description: `Ikkuna kohdistettu ${zone === 'left' ? 'vasemmalle' : zone === 'right' ? 'oikealle' : 'koko näytölle'}`,
    });
  };

  // Virtual Desktop switching
  const switchDesktop = (desktopNumber: number) => {
    if (desktopNumber < 1 || desktopNumber > totalDesktops) return;
    setCurrentDesktop(desktopNumber);
    toast({
      title: `🖥️ Työpöytä ${desktopNumber}`,
      description: `Vaihdettu työpöydälle ${desktopNumber}`,
    });
  };

  // Filter windows by current desktop (for future implementation)
  const visibleWindows = openWindows; // In future: filter by desktop

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#003d82]">
        <div className="text-white text-xl">Ladataan työpöytää...</div>
      </div>
    );
  }

  if (!desktopEnabled) {
    return null;
  }

  const wallpaper = userConfig?.wallpaper || "/KSYK-logo-desktop.png";
  
  // Show ALL active apps from the system, not just user's installed apps
  // This ensures apps toggled ON in desktop manager show for everyone
  const installedApps = availableApps.filter(app => app.isActive);

  return (
    <div 
      className="fixed inset-0 overflow-hidden"
      style={{
        backgroundImage: `url(${wallpaper})`,
        backgroundSize: "5%",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#0078d4",
      }}
    >
      {/* Desktop Icons - Windows 11 Style */}
      <div className="absolute inset-0 p-4 grid grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-4 content-start pointer-events-none">
        {installedApps.slice(0, 48).map((app, index) => (
          <button
            key={app.appId}
            onClick={() => openApp(app)}
            className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-all group pointer-events-auto backdrop-blur-sm"
          >
            <div className="w-14 h-14 bg-white/90 rounded-xl shadow-xl flex items-center justify-center text-blue-600 group-hover:scale-110 group-active:scale-95 transition-transform border border-white/50">
              {getIconComponent(app.icon)}
            </div>
            <span className="text-white text-[10px] font-medium text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] max-w-[70px] line-clamp-2 px-1 py-0.5 rounded bg-black/20 backdrop-blur-sm">
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
            className={`absolute bg-white rounded-lg shadow-2xl overflow-hidden ${
              window.isMaximized ? "inset-4" : ""
            }`}
            style={{
              left: window.isMaximized ? undefined : window.position.x,
              top: window.isMaximized ? undefined : window.position.y,
              width: window.isMaximized ? undefined : window.size.width,
              height: window.isMaximized ? undefined : window.size.height,
              zIndex: window.zIndex,
            }}
            onClick={() => bringToFront(window.id)}
          >
            {/* Windows 11 Style Title Bar */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between cursor-move">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 flex items-center justify-center text-blue-600">
                  {getIconComponent(window.app.icon)}
                </div>
                <span className="font-medium text-sm text-gray-800">
                  {window.app.nameFi || window.app.name}
                </span>
              </div>
              <div className="flex items-center gap-0">
                {window.app.minimizable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-12 p-0 hover:bg-gray-100 rounded-none"
                    onClick={() => toggleMinimize(window.id)}
                  >
                    <Minus className="w-4 h-4 text-gray-700" />
                  </Button>
                )}
                {window.app.maximizable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-12 p-0 hover:bg-gray-100 rounded-none"
                    onClick={() => toggleMaximize(window.id)}
                  >
                    {window.isMaximized ? (
                      <Minimize2 className="w-4 h-4 text-gray-700" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-gray-700" />
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-12 p-0 hover:bg-red-500 hover:text-white rounded-none"
                  onClick={() => closeWindow(window.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Window Content */}
            <div className="h-[calc(100%-40px)] bg-white overflow-auto">
              {window.app.appType === "iframe" && window.app.appUrl && (
                <iframe
                  src={window.app.appUrl}
                  className="w-full h-full border-0"
                  title={window.app.name}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              )}
              {window.app.appType === "component" && window.app.componentName && (
                <AppRenderer
                  componentName={window.app.componentName}
                  onClose={() => closeWindow(window.id)}
                />
              )}
              {window.app.appType === "external" && (
                <div className="flex items-center justify-center h-full p-8 text-center">
                  <div>
                    <Globe className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-600 font-medium mb-2">Ulkoinen sovellus</p>
                    <p className="text-sm text-gray-500 mb-4">{window.app.description}</p>
                    {window.app.appUrl && (
                      <Button
                        onClick={() => window.open(window.app.appUrl, '_blank')}
                        className="bg-blue-600"
                      >
                        Avaa uudessa välilehdessä
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      ))}

      {/* Windows 11 Style Taskbar */}
      <div className="absolute bottom-0 left-0 right-0 h-14 bg-gray-900/70 backdrop-blur-xl border-t border-white/10 flex items-center justify-center px-4 gap-1">
        {/* Start Button - Windows 11 Style */}
        <Button
          onClick={() => setStartMenuOpen(!startMenuOpen)}
          className="h-11 w-11 p-0 bg-transparent hover:bg-white/10 active:bg-white/20 flex items-center justify-center rounded-lg transition-all"
        >
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="3" width="8" height="8" rx="1"/>
            <rect x="13" y="3" width="8" height="8" rx="1"/>
            <rect x="3" y="13" width="8" height="8" rx="1"/>
            <rect x="13" y="13" width="8" height="8" rx="1"/>
          </svg>
        </Button>

        {/* Open Windows - Centered */}
        <div className="flex items-center gap-1">
          {openWindows.map(window => (
            <Button
              key={window.id}
              onClick={() => {
                if (window.isMinimized) {
                  toggleMinimize(window.id);
                }
                bringToFront(window.id);
              }}
              className={`h-11 px-4 flex items-center gap-2 rounded-lg transition-all ${
                window.isMinimized 
                  ? "bg-white/5 hover:bg-white/10" 
                  : "bg-white/15 hover:bg-white/20 border-b-2 border-blue-400"
              }`}
            >
              <div className="w-5 h-5">
                {getIconComponent(window.app.icon)}
              </div>
              <span className="text-sm text-white max-w-[120px] truncate font-medium">
                {window.app.nameFi || window.app.name}
              </span>
            </Button>
          ))}
        </div>

        {/* System Tray - Windows 11 Style */}
        <div className="absolute right-4 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-11 w-11 text-white hover:bg-white/10 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </Button>
          <div className="px-3 py-2 hover:bg-white/10 rounded-lg cursor-pointer transition-all">
            <div className="text-white text-xs font-medium text-right">
              <div>{currentTime.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" })}</div>
              <div className="text-[10px] opacity-80">
                {currentTime.toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Windows 11 Style Start Menu */}
      {startMenuOpen && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[600px] bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden border border-white/10">
          <div className="p-6">
            <div className="mb-4">
              <Input
                placeholder="Hae sovelluksia..."
                className="bg-gray-800/50 border-white/10 text-white placeholder:text-gray-400"
              />
            </div>
            <h3 className="text-white font-semibold mb-3 text-sm">Kiinnitetyt</h3>
            <div className="grid grid-cols-6 gap-3 max-h-[400px] overflow-y-auto">
              {installedApps.map(app => (
                <button
                  key={app.appId}
                  onClick={() => openApp(app)}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-white/10 active:bg-white/20 transition-all group"
                >
                  <div className="w-12 h-12 bg-white/90 rounded-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform shadow-lg">
                    {getIconComponent(app.icon)}
                  </div>
                  <span className="text-[10px] text-white text-center font-medium line-clamp-2">
                    {app.nameFi || app.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-white/10 p-3 bg-gray-800/50">
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-white/10"
              onClick={() => setLocation(`/wilma/${id}`)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Palaa Wilmaan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
