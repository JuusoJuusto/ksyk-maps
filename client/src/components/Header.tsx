import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useTranslation } from "react-i18next";
import NavigationModal from "@/components/NavigationModal";
import { Sun, Moon } from "lucide-react";

export default function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  
  useEffect(() => {
    const saved = localStorage.getItem('ksyk_language');
    if (saved && saved !== i18n.language) {
      i18n.changeLanguage(saved);
      setCurrentLang(saved);
    }
  }, []);

  const isActive = (path: string) => location === path;
  const isAdmin = isAuthenticated && (user as any)?.role === 'admin';
  const isInAdminPanel = location === '/admin-ksyk-management-portal';

  const handleLanguageChange = (lang: string) => {
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
    // Create a comprehensive success message
    const message = `Route Successfully Planned!\n\nStarting Point: ${from}\nDestination: ${to}\n\nYour route is now displayed on the interactive map with:\n- Animated blue path showing the way\n- Numbered waypoints for guidance\n- Step-by-step walking directions\n\nThe route should be visible immediately on the map below!`;
    
    // Show success feedback
    alert(message);
  };

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link href="/" className="flex-shrink-0 flex items-center space-x-2 sm:space-x-3 group" data-testid="link-home">
              <img src="/kulosaaren_yhteiskoulu_logo.jpeg" alt="KSYK Logo" className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-lg shadow-sm group-hover:shadow-md transition-shadow" />
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-blue-600 cursor-pointer hover:text-blue-700 transition-colors tracking-tight" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = '/secret-easter-egg';
                  }}
                  title="Click for a surprise! 🎉"
                  style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}
                >
                  KSYK Maps
                </h2>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold">by StudiOWL</p>
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

          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
            {/* Show different buttons based on admin panel or regular app */}
            {!isInAdminPanel ? (
              <>
                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleDarkMode}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                    darkMode 
                      ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {darkMode ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
                
                {/* Language Toggle */}
                <div className="language-toggle flex bg-muted rounded-md p-0.5 sm:p-1">
                  <button 
                    className={`px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium rounded-sm ${
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
                    className={`px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium rounded-sm ${
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
                    className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-600 text-green-700 hover:from-green-100 hover:to-emerald-100 font-semibold shadow-sm text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-9"
                    data-testid="button-hsl"
                  >
                    HSL
                  </Button>
                </Link>
                
                {/* Admin Panel Link */}
                <Link href="/admin-login">
                  <Button 
                    variant={isActive('/admin-login') ? 'default' : 'outline'}
                    className="font-semibold shadow-sm text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-9"
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
                  className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                    darkMode 
                      ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {darkMode ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
                
                {/* Admin Panel - Only HSL and Logout */}
                <Link href="/hsl">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="bg-green-50 border-green-600 text-green-700 hover:bg-green-100 text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-9"
                    data-testid="button-hsl"
                  >
                    HSL
                  </Button>
                </Link>
                
                {/* Logout Button - always show in admin panel */}
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="bg-red-50 border-red-600 text-red-700 hover:bg-red-100 text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-9"
                  data-testid="button-logout"
                >
                  Logout
                </Button>
              </>
            )}
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
