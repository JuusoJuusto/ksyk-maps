import { useDarkMode } from "@/contexts/DarkModeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail, MessageSquare, Github, Globe, Heart, Search, Wifi, Volume2, Battery, Calendar, Clock, Folder, Chrome, Code, Terminal, Settings, Image, Music, Video, FileText, Download, Trash2, Star, Sun, Moon } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

export default function Windows11Desktop() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const apps = [
    { name: "File Explorer", icon: Folder, color: "bg-yellow-500", action: () => alert("File Explorer") },
    { name: "Chrome", icon: Chrome, color: "bg-blue-500", action: () => window.open("https://google.com", "_blank") },
    { name: "VS Code", icon: Code, color: "bg-blue-600", action: () => alert("VS Code") },
    { name: "Terminal", icon: Terminal, color: "bg-gray-800", action: () => alert("Terminal") },
    { name: "Settings", icon: Settings, color: "bg-gray-600", action: () => alert("Settings") },
    { name: "Photos", icon: Image, color: "bg-purple-500", action: () => alert("Photos") },
    { name: "Music", icon: Music, color: "bg-pink-500", action: () => alert("Music") },
    { name: "Videos", icon: Video, color: "bg-red-500", action: () => alert("Videos") },
    { name: "Documents", icon: FileText, color: "bg-blue-400", action: () => alert("Documents") },
    { name: "Downloads", icon: Download, color: "bg-green-500", action: () => alert("Downloads") },
    { name: "KSYK Maps", icon: Globe, color: "bg-indigo-600", action: () => setLocation("/") },
    { name: "SL Studio", icon: Star, color: "bg-amber-500", action: () => setLocation("/owlapps") },
  ];

  const pinnedApps = apps.slice(0, 6);
  const recentFiles = [
    { name: "Project Report.docx", icon: FileText, time: "2 hours ago" },
    { name: "Presentation.pptx", icon: FileText, time: "Yesterday" },
    { name: "Budget.xlsx", icon: FileText, time: "2 days ago" },
  ];

  return (
    <div className={`min-h-screen relative overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400'}`}
         style={{
           backgroundImage: darkMode 
             ? 'url(https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&h=1080&fit=crop)' 
             : 'url(https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&h=1080&fit=crop)',
           backgroundSize: 'cover',
           backgroundPosition: 'center'
         }}>
      {/* Windows 11 Taskbar */}
      <div className={`fixed bottom-0 left-0 right-0 h-12 ${darkMode ? 'bg-gray-900/80' : 'bg-white/80'} backdrop-blur-xl border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between px-2 z-50`}>
        {/* Start Button & Search */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStartMenuOpen(!startMenuOpen)}
            className={`h-10 w-10 p-0 ${startMenuOpen ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          >
            <div className="w-5 h-5 grid grid-cols-2 gap-0.5">
              <div className="bg-blue-500 rounded-sm"></div>
              <div className="bg-green-500 rounded-sm"></div>
              <div className="bg-yellow-500 rounded-sm"></div>
              <div className="bg-red-500 rounded-sm"></div>
            </div>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-10 px-3 gap-2"
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Search</span>
          </Button>
        </div>

        {/* Pinned Apps */}
        <div className="flex items-center gap-1">
          {pinnedApps.map((app, i) => (
            <Button
              key={i}
              variant="ghost"
              size="sm"
              onClick={app.action}
              className="h-10 w-10 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              title={app.name}
            >
              <div className={`${app.color} p-2 rounded`}>
                <app.icon className="h-4 w-4 text-white" />
              </div>
            </Button>
          ))}
        </div>

        {/* System Tray */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={toggleDarkMode}>
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Wifi className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Volume2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Battery className="h-4 w-4" />
          </Button>
          <div className={`px-3 py-1 text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <div className="font-semibold">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-[10px]">{currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          </div>
        </div>
      </div>

      {/* Start Menu */}
      {startMenuOpen && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 w-[600px] z-50">
          <Card className={`${darkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'} backdrop-blur-xl shadow-2xl`}>
            <CardContent className="p-6">
              {/* Search Bar */}
              <div className="mb-6">
                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Search className="h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for apps, settings, and documents"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                  />
                </div>
              </div>

              {/* Pinned Apps */}
              <div className="mb-6">
                <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Pinned</h3>
                <div className="grid grid-cols-6 gap-4">
                  {apps.map((app, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        app.action();
                        setStartMenuOpen(false);
                      }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                    >
                      <div className={`${app.color} p-3 rounded-xl`}>
                        <app.icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-xs text-center line-clamp-2">{app.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Files */}
              <div>
                <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Recent</h3>
                <div className="space-y-2">
                  {recentFiles.map((file, i) => (
                    <button
                      key={i}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                    >
                      <div className="bg-blue-500 p-2 rounded">
                        <file.icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{file.name}</div>
                        <div className="text-xs text-gray-500">{file.time}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* User Profile */}
              <div className={`mt-6 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    JK
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Juuso Kaikula</div>
                    <div className="text-xs text-gray-500">juuso.kaikula@ksyk.fi</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLocation("/");
                    setStartMenuOpen(false);
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Desktop Icons */}
      <div className="p-4 grid grid-cols-1 gap-4 w-32">
        <button
          onClick={() => setLocation("/")}
          className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-white/10 backdrop-blur-sm transition-all"
        >
          <div className="bg-indigo-600 p-4 rounded-xl shadow-lg">
            <Globe className="h-8 w-8 text-white" />
          </div>
          <span className="text-sm font-semibold text-white drop-shadow-lg">KSYK Maps</span>
        </button>

        <button
          className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-white/10 backdrop-blur-sm transition-all"
        >
          <div className="bg-gray-700 p-4 rounded-xl shadow-lg">
            <Trash2 className="h-8 w-8 text-white" />
          </div>
          <span className="text-sm font-semibold text-white drop-shadow-lg">Recycle Bin</span>
        </button>
      </div>

      {/* Center Content - SL Studio Window */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl px-4">
        {/* Window Header */}
        <div className={`${darkMode ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur-xl rounded-t-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-3 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
              <span className="text-sm font-black text-white">OWL</span>
            </div>
            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>SL Studio</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">_</Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">□</Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-500 hover:text-white" onClick={() => setLocation("/")}>×</Button>
          </div>
        </div>

        {/* Window Content */}
        <div className={`${darkMode ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur-xl rounded-b-xl border-x border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} max-h-[70vh] overflow-y-auto`}>
          <div className="p-8">
            {/* Hero Section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl mb-4 shadow-xl">
                <span className="text-3xl font-black text-white">OWL</span>
              </div>
              <h1 className={`text-4xl font-black mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                SL Studio
              </h1>
              <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Building innovative solutions for education
              </p>
            </div>

            {/* Owner Section */}
            <div className={`mb-6 p-6 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Owner & Founder
              </h2>
              
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-600/50 border-blue-500' : 'bg-blue-50 border-blue-300'}`}>
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-blue-600 rounded-full">
                    <span className="text-xl font-black text-white">JK</span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Juuso Kaikula
                    </h3>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      Founder & Lead Developer
                    </p>
                    <p className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Passionate about creating innovative solutions for education. Specializing in full-stack development, 
                      UI/UX design, and building scalable applications.
                    </p>
                    <a
                      href="mailto:juuso.kaikula@ksyk.fi"
                      className={`flex items-center gap-2 text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      <Mail className="h-4 w-4" />
                      <span>juuso.kaikula@ksyk.fi</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className={`mb-6 p-6 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h2 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                About Us
              </h2>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                SL Studio is a software development team dedicated to creating innovative solutions for educational institutions. 
                We specialize in building intuitive, user-friendly applications that enhance the learning experience and streamline 
                campus operations.
              </p>
            </div>

            {/* Projects Section */}
            <div className={`mb-6 p-6 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Our Projects
              </h2>
              
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-600/50 border-blue-500' : 'bg-blue-50 border-blue-300'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-xl">
                    <Globe className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      KSYK Maps
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Interactive campus navigation system
                    </p>
                    <Button
                      onClick={() => setLocation("/")}
                      className="bg-blue-600 hover:bg-blue-700 mt-2 text-xs h-8"
                      size="sm"
                    >
                      Visit KSYK Maps
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className={`mb-6 p-6 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Get in Touch
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="mailto:juuso.kaikula@ksyk.fi"
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all hover:scale-105 ${
                    darkMode 
                      ? 'bg-gray-600/50 border-gray-500 hover:border-blue-500' 
                      : 'bg-white border-gray-200 hover:border-blue-500'
                  }`}
                >
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Email</h3>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Contact us</p>
                  </div>
                </a>

                <a
                  href="https://discord.gg/5ERZp9gUpr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all hover:scale-105 ${
                    darkMode 
                      ? 'bg-gray-600/50 border-gray-500 hover:border-indigo-500' 
                      : 'bg-white border-gray-200 hover:border-indigo-500'
                  }`}
                >
                  <div className="p-2 bg-indigo-600 rounded-lg">
                    <MessageSquare className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Discord</h3>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Community</p>
                  </div>
                </a>

                <a
                  href="https://github.com/JuusoJuusto/ksyk-maps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all hover:scale-105 ${
                    darkMode 
                      ? 'bg-gray-600/50 border-gray-500 hover:border-gray-400' 
                      : 'bg-white border-gray-200 hover:border-gray-500'
                  }`}
                >
                  <div className="p-2 bg-gray-800 rounded-lg">
                    <Github className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>GitHub</h3>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>View code</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center py-4">
              <p className={`flex items-center justify-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Made with <Heart className="h-3 w-3 text-red-500 fill-current" /> by SL Studio
              </p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                © 2026 SL Studio. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
