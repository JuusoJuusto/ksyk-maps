import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import NavigationModal from "@/components/NavigationModal";
import { Megaphone, ChevronLeft, ChevronRight } from "lucide-react";

export default function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  
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

  const handleLanguageChange = async (lang: string) => {
    await i18n.changeLanguage(lang);
    setCurrentLang(lang);
    localStorage.setItem('ksyk_language', lang);
    window.location.reload(); // Force reload to apply changes
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
    console.log(`✅ Navigation planned: ${from} → ${to}`);
    
    // Create a comprehensive success message
    const message = `🎯 Route Successfully Planned!\n\n📍 Starting Point: ${from}\n🎯 Destination: ${to}\n\n🗺️ Your route is now displayed on the interactive map with:\n• Animated blue path showing the way\n• Numbered waypoints for guidance\n• Step-by-step walking directions\n\nThe route should be visible immediately on the map below!`;
    
    // Show success feedback
    alert(message);
    
    // Log for debugging
    console.log("Navigation completed successfully");
  };

  return (
    <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 border-b-4 border-blue-900 shadow-xl sticky top-0 z-50">
      {/* Announcement Bar - TOP CENTER */}
      {activeAnnouncements.length > 0 && currentAnnouncement && (
        <div className={`${
          currentAnnouncement.priority === 'urgent' 
            ? 'bg-gradient-to-r from-red-600 to-red-700' 
            : currentAnnouncement.priority === 'high'
            ? 'bg-gradient-to-r from-orange-600 to-orange-700'
            : 'bg-gradient-to-r from-blue-800 to-blue-900'
        } text-white py-3 px-4 shadow-lg`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={prevAnnouncement}
              className="p-2 hover:bg-white/30 rounded-full transition-all transform hover:scale-110"
              disabled={activeAnnouncements.length <= 1}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="flex items-center space-x-3 flex-1 justify-center">
              <Megaphone className="h-6 w-6 animate-pulse" />
              <div className="text-center">
                <span className="font-bold text-lg">{currentAnnouncement.title}</span>
                <span className="mx-3">•</span>
                <span className="text-sm opacity-95">{currentAnnouncement.content}</span>
              </div>
            </div>
            
            <button
              onClick={nextAnnouncement}
              className="p-2 hover:bg-white/30 rounded-full transition-all transform hover:scale-110"
              disabled={activeAnnouncements.length <= 1}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex-shrink-0 flex items-center space-x-4 group" data-testid="link-home">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl group-hover:bg-white/30 transition-all"></div>
                <img src="/ksykmaps_logo.png" alt="KSYK Logo" className="h-16 w-16 object-contain relative z-10 transform group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight group-hover:text-yellow-300 transition-colors">KSYK Map</h1>
                <p className="text-sm text-blue-200 font-medium">by OWL Apps</p>
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
              <span className="px-4 py-2 text-lg font-bold text-yellow-300 bg-white/10 rounded-lg backdrop-blur-sm">
                Admin Management Portal
              </span>
            </nav>
          )}

          <div className="flex items-center space-x-4">
            {/* Show different buttons based on admin panel or regular app */}
            {!isInAdminPanel ? (
              <>
                {/* Language Toggle */}
                <div className="language-toggle flex bg-white/20 backdrop-blur-sm rounded-lg p-1 shadow-lg">
                  <button 
                    className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
                      currentLang === 'en' 
                        ? 'bg-white text-blue-700 shadow-md' 
                        : 'text-white hover:bg-white/20'
                    }`}
                    onClick={() => handleLanguageChange('en')}
                    data-testid="button-lang-en"
                  >
                    EN
                  </button>
                  <button 
                    className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
                      currentLang === 'fi' 
                        ? 'bg-white text-blue-700 shadow-md' 
                        : 'text-white hover:bg-white/20'
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
                    size="lg"
                    className="bg-green-500 border-2 border-green-600 text-white hover:bg-green-600 font-bold shadow-lg transform hover:scale-105 transition-all"
                    data-testid="button-hsl"
                  >
                    🚌 HSL
                  </Button>
                </Link>
                
                {/* Admin Panel Link */}
                <Link href="/admin-login">
                  <Button 
                    variant={isActive('/admin-login') ? 'default' : 'outline'}
                    size="lg"
                    className="bg-yellow-400 border-2 border-yellow-500 text-blue-900 hover:bg-yellow-300 font-bold shadow-lg transform hover:scale-105 transition-all"
                    data-testid="button-admin"
                  >
                    🔐 Admin
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {/* Admin Panel - Only HSL and Logout */}
                <Link href="/hsl">
                  <Button 
                    variant="outline"
                    size="lg"
                    className="bg-green-500 border-2 border-green-600 text-white hover:bg-green-600 font-bold shadow-lg"
                    data-testid="button-hsl"
                  >
                    🚌 HSL
                  </Button>
                </Link>
                
                {/* Logout Button - always show in admin panel */}
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={handleLogout}
                  className="bg-red-500 border-2 border-red-600 text-white hover:bg-red-600 font-bold shadow-lg"
                  data-testid="button-logout"
                >
                  🚪 Logout
                </Button>
              </>
            )}
            
            {/* Mobile menu button */}
            <button className="md:hidden text-white text-2xl" data-testid="button-mobile-menu">
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
            
            <div className="flex items-center space-x-3 flex-1 justify-center">
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex-shrink-0 flex items-center space-x-3" data-testid="link-home">
              <img src="/ksykmaps_logo.png" alt="KSYK Logo" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-primary">KSYK Map</h1>
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
                    🚌 HSL
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
                {/* Admin Panel - Only HSL and Logout */}
                <Link href="/hsl">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="bg-green-50 border-green-600 text-green-700 hover:bg-green-100"
                    data-testid="button-hsl"
                  >
                    🚌 HSL
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
