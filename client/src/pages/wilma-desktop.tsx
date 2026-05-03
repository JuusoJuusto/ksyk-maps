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
  calendar: Calendar,
  mail: Mail,
  settings: Settings,
  clock: Clock,
  books: BookOpen,
  video: Video,
  code: Code,
  terminal: Terminal,
  games: Gamepad2,
};

export default function WilmaDesktop() {
  const { id } = useParams();
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

  useEffect(() => {
    fetchDesktopData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [id]);

  const fetchDesktopData = async () => {
    try {
      console.log('🖥️ Fetching desktop data for user:', id);
      
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

  const wallpaper = userConfig?.wallpaper || "/wilma-bg.jpg";
  const installedApps = availableApps.filter(app => 
    userConfig?.installedApps?.includes(app.appId)
  );

  return (
    <div 
      className="fixed inset-0 overflow-hidden"
      style={{
        backgroundImage: `url(${wallpaper})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Desktop Icons */}
      <div className="absolute inset-0 p-4 grid grid-cols-8 gap-4 content-start">
        {installedApps.slice(0, 16).map((app, index) => (
          <button
            key={app.appId}
            onClick={() => openApp(app)}
            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-white/20 transition-colors group"
          >
            <div className="w-16 h-16 bg-white/90 rounded-xl shadow-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              {getIconComponent(app.icon)}
            </div>
            <span className="text-white text-xs font-medium text-center drop-shadow-lg">
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
            {/* Window Title Bar */}
            <div className="bg-[#003d82] text-white px-4 py-2 flex items-center justify-between cursor-move">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  {getIconComponent(window.app.icon)}
                </div>
                <span className="font-medium text-sm">
                  {window.app.nameFi || window.app.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {window.app.minimizable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-white/20"
                    onClick={() => toggleMinimize(window.id)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                )}
                {window.app.maximizable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-white/20"
                    onClick={() => toggleMaximize(window.id)}
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
                  className="h-6 w-6 p-0 hover:bg-red-500"
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
                />
              )}
              {window.app.appType === "component" && (
                <div className="p-4">
                  <p className="text-gray-600">
                    Component: {window.app.componentName}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {window.app.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      ))}

      {/* Taskbar */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 flex items-center px-2 gap-2">
        {/* Start Button */}
        <Button
          onClick={() => setStartMenuOpen(!startMenuOpen)}
          className="h-10 px-4 bg-blue-600 hover:bg-blue-700"
        >
          <span className="font-bold">Käynnistä</span>
        </Button>

        {/* Open Windows */}
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
            className="h-10 px-3 flex items-center gap-2"
          >
            {getIconComponent(window.app.icon)}
            <span className="text-sm max-w-[150px] truncate">
              {window.app.nameFi || window.app.name}
            </span>
          </Button>
        ))}

        {/* System Tray */}
        <div className="ml-auto flex items-center gap-4 text-white text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{currentTime.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div>
            {currentTime.toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* Start Menu */}
      {startMenuOpen && (
        <div className="absolute bottom-14 left-2 w-96 bg-white rounded-lg shadow-2xl overflow-hidden">
          <div className="bg-[#003d82] text-white p-4">
            <h3 className="font-bold text-lg">Sovellukset</h3>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto">
            <div className="grid grid-cols-3 gap-3">
              {installedApps.map(app => (
                <button
                  key={app.appId}
                  onClick={() => openApp(app)}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    {getIconComponent(app.icon)}
                  </div>
                  <span className="text-xs text-center font-medium">
                    {app.nameFi || app.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="border-t p-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setLocation(`/wilma/${id}`)}
            >
              Palaa Wilmaan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
