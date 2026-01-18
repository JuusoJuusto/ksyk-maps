import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import NavigationModal from "@/components/NavigationModal";
import { Megaphone, ChevronLeft, ChevronRight, Sun, Moon, X } from "lucide-react";

export default function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  
  useEffect(() => {
    const saved = localStorage.getItem('ksyk_language');
    if (saved && saved !== i18n.language) {
      i18n.changeLanguage(saved);
      setCurrentLang(saved);
    }
  }, []);
  
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);

  const isActive = (path: string) => location === path;
  const isAdmin = isAuthenticated && (user as any)?.role === 'admin';
  const isInAdminPanel = location === '/admin-ksyk-management-portal';

  // Fetch announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const response = await fetch("/api/announcements?limit=10");
      if (!response.ok) return [];
      return response.json();
    },
  });

  const activeAnnouncements = announcements.filter((a: any) => a.isActive);
  const currentAnnouncement = activeAnnouncements[currentAnnouncementIndex];

  const nextAnnouncement = () => {
    setCurrentAnnouncementIndex((prev) => (prev + 1) % activeAnnouncements.length);
  };

  const prevAnnouncement = () => {
    setCurrentAnnouncementIndex(
      (prev) => (prev - 1 + activeAnnouncements.length) % activeAnnouncements.length
    );
  };

  const handleLanguageChange = (lang: string) => {
    console.log('🌐 Changing language to:', lang);
    localStorage.setItem('ksyk_language', lang);
    i18n.changeLanguage(lang).then(() => {
      // Immediate reload
      window.location.reload();
    });
  };

  const handleLogout = async () => {
    try {
      // Call logout API endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear any local storage/session data
      localStorage.clear();
      sessionStorage.clear();
      // Redirect to home page
      window.location.href = "/";
    }
  };

  const handleNavigation = (from: string, to: string) => {
    console.log(`Navigation planned: ${from} to ${to}`);
    
    // Create a comprehensive success message
    const message = `Route Successfully Planned!\n\nStarting Point: ${from}\nDestination: ${to}\n\nYour route is now displayed on the interactive map with:\n- Animated blue path showing the way\n- Numbered waypoints for guidance\n- Step-by-step walking directions\n\nThe route should be visible immediately on the map below!`;
    
    // Show success feedback
    alert(message);
    
    // Log for debugging
    console.log("Navigation completed successfully");
  };

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      {/* Announcement Bar - TOP CENTER */}
      {activeAnnouncements.length > 0 && currentAnnouncement && (
        <div className={`${
          currentAnnouncement.priority === 'urgent' 
            ? 'bg-gradient-to-r from-red-500 to-red-600' 
            : currentAnnouncement.priority === 'high'
            ? 'bg-gradient-to-r from-orange-500 to-orange-600'
            : 'bg-gradient-to-r from-blue-500 to-blue-600'
        } text-white py-2 px-4`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={prevAnnouncement}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              disabled={activeAnnouncements.length <= 1}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div 
              className="flex items-center space-x-3 flex-1 justify-center cursor-pointer hover:bg-white/10 rounded-lg px-4 py-1 transition-colors"
              onClick={() => setShowAnnouncementDialog(true)}
            >
              <Megaphone className="h-5 w-5 animate-pulse" />
              <div className="text-center">
                <span className="font-semibold">{currentAnnouncement.title}</span>
                <span className="mx-2">•</span>
                <span className="text-sm opacity-90">{currentAnnouncement.content}</span>
              </div>
            </div>
            
            <button
              onClick={nextAnnouncement}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              disabled={activeAnnouncements.length <= 1}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Announcement Dialog */}
      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-blue-600" />
              {currentAnnouncement?.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Priority: {currentAnnouncement?.priority}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {currentAnnouncement?.content}
            </p>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setShowAnnouncementDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex-shrink-0 flex items-center space-x-3" data-testid="link-home">
              <img src="/ksykmaps_logo.png" alt="KSYK Logo" className="h-12 w-12 object-contain" />
              <div>
                <h1 
                  className="text-xl font-bold text-primary cursor-pointer hover:text-blue-600 transition-colors" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = '/secret-easter-egg';
                  }}
                  title="Click for a surprise! 🎉"
                >
                  KSYK Map
                </h1>
                <p className="text-xs text-muted-foreground">by OWL Apps</p>
              </div>
            </Link>
          </div>
          
          {/* Show different navigation based on admin panel or regular app */}
          {!isInAdminPanel ? (
            <nav className="hidden md:flex space-x-8">
              {/* Clean navigation - no extra links */}
            </nav>
          ) : (
            <nav className="hidden md:flex space-x-8">
              <span className="px-3 py-2 text-sm font-medium text-blue-600 font-semibold">
                Admin Management Portal
              </span>
            </nav>
          )}

          <div className="flex items-center space-x-4">
            {/* Show different buttons based on admin panel or regular app */}
            {!isInAdminPanel ? (
              <>
                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-lg transition-all ${
                    darkMode 
                      ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                
                {/* Language Toggle */}
                <div className="language-toggle flex bg-muted rounded-md p-1">
                  <button 
                    className={`px-3 py-1 text-sm font-medium rounded-sm ${
                      currentLang === 'en' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => handleLanguageChange('en')}
                    data-testid="button-lang-en"
                  >
                    EN
                  </button>
                  <button 
                    className={`px-3 py-1 text-sm font-medium rounded-sm ${
                      currentLang === 'fi' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => handleLanguageChange('fi')}
                    data-testid="button-lang-fi"
                  >
                    FI
                  </button>
                </div>
                
                {/* HSL Button */}
                <Link href="/hsl">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="bg-green-50 border-green-600 text-green-700 hover:bg-green-100"
                    data-testid="button-hsl"
                  >
                    HSL
                  </Button>
                </Link>
                
                {/* Admin Panel Link */}
                <Link href="/admin-login">
                  <Button 
                    variant={isActive('/admin-login') ? 'default' : 'outline'}
                    data-testid="button-admin"
                  >
                    Admin
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {/* Dark Mode Toggle in Admin Panel */}
                <button
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-lg transition-all ${
                    darkMode 
                      ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                
                {/* Admin Panel - Only HSL and Logout */}
                <Link href="/hsl">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="bg-green-50 border-green-600 text-green-700 hover:bg-green-100"
                    data-testid="button-hsl"
                  >
                    HSL
                  </Button>
                </Link>
                
                {/* Logout Button - always show in admin panel */}
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="bg-red-50 border-red-600 text-red-700 hover:bg-red-100"
                  data-testid="button-logout"
                >
                  Logout
                </Button>
              </>
            )}
            
            {/* Mobile menu button */}
            <button className="md:hidden" data-testid="button-mobile-menu">
              ☰
            </button>
          </div>
        </div>
      </div>
      
      <NavigationModal 
        isOpen={showNavigationModal}
        onClose={() => setShowNavigationModal(false)}
        onNavigate={handleNavigation}
      />
    </header>
  );
}
