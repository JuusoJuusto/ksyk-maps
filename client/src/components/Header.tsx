import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import NavigationModal from "@/components/NavigationModal";
import { Sun, Moon, Menu, X, ChevronDown } from "lucide-react";

export default function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { theme, setTheme } = useTheme();
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
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

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme })
      });
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
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
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600 cursor-pointer hover:text-blue-700 transition-colors tracking-tight" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = '/secret-easter-egg';
                  }}
                  title="Click for a surprise! 🎉"
                  style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: '-0.02em' }}
                >
                  KSYK Maps
                </h2>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold">by StudiOWL</p>
              </div>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          {!isInAdminPanel ? (
            <nav className="hidden lg:flex space-x-8">
              {/* Clean navigation - no extra links */}
            </nav>
          ) : (
            <nav className="hidden lg:flex space-x-8">
              <span className="px-3 py-2 text-sm font-medium text-blue-600 font-semibold">
                Admin Management Portal
              </span>
            </nav>
          )}

          {/* Desktop Controls */}
          <div className="hidden lg:flex items-center space-x-2 lg:space-x-4">
            {!isInAdminPanel ? (
              <>
                {/* Theme Toggle */}
                <div className="relative">
                  <button
                    onClick={() => {
                      const nextTheme = theme === 'light' ? 'dark' : 'light';
                      handleThemeChange(nextTheme);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      theme === 'dark'
                        ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={`Current: ${theme} theme - Click to toggle`}
                  >
                    {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </button>
                </div>
                
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
                
                {/* Lunch Button */}
                <Link href="/lunch">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="bg-orange-50 border-orange-600 text-orange-700 hover:bg-orange-100 font-semibold shadow-sm"
                    data-testid="button-lunch"
                  >
                    🍽️ {currentLang === 'fi' ? 'Ruokalista' : 'Lunch'}
                  </Button>
                </Link>
                
                {/* HSL Button */}
                <Link href="/hsl">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="bg-green-50 border-green-600 text-green-700 hover:bg-green-100 font-semibold shadow-sm"
                    data-testid="button-hsl"
                  >
                    HSL
                  </Button>
                </Link>
                
                {/* Admin Panel Link */}
                <Link href="/admin-login">
                  <Button 
                    variant={isActive('/admin-login') ? 'default' : 'outline'}
                    className="font-semibold shadow-sm"
                    data-testid="button-admin"
                  >
                    Admin
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {/* Theme Toggle in Admin Panel */}
                <button
                  onClick={() => {
                    const nextTheme = theme === 'light' ? 'dark' : 'light';
                    handleThemeChange(nextTheme);
                  }}
                  className={`p-2 rounded-lg transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={`Current: ${theme} theme - Click to toggle`}
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                
                {/* Admin Panel - Lunch and HSL */}
                <Link href="/lunch">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="bg-orange-50 border-orange-600 text-orange-700 hover:bg-orange-100"
                    data-testid="button-lunch"
                  >
                    🍽️
                  </Button>
                </Link>
                
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
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Toggle mobile menu"
            >
              {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {showMobileMenu && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg z-50" style={{
            animation: 'slideDownFromTop 0.3s ease-out'
          }}>
            <div className="px-4 py-3 space-y-3">
              {!isInAdminPanel ? (
                <>
                  {/* Theme Selector */}
                  <div className="space-y-2 animate-slide-in-left">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('mobile.theme')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          handleThemeChange('light');
                          setShowMobileMenu(false);
                        }}
                        className={`p-3 text-xs rounded-lg border transition-all animate-zoom-in flex flex-col items-center gap-1 ${
                          theme === 'light' 
                            ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-lg ring-2 ring-blue-500' 
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:shadow-md'
                        }`}
                      >
                        <Sun className="h-5 w-5" />
                        <span className="font-semibold">{t('theme.light')}</span>
                      </button>
                      <button
                        onClick={() => {
                          handleThemeChange('dark');
                          setShowMobileMenu(false);
                        }}
                        className={`p-3 text-xs rounded-lg border transition-all animate-zoom-in flex flex-col items-center gap-1 ${
                          theme === 'dark' 
                            ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-lg ring-2 ring-blue-500' 
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:shadow-md'
                        }`}
                      >
                        <Moon className="h-5 w-5" />
                        <span className="font-semibold">{t('theme.dark')}</span>
                      </button>
                      <button
                        onClick={() => {
                          handleThemeChange('system');
                          setShowMobileMenu(false);
                        }}
                        className={`p-3 text-xs rounded-lg border transition-all animate-zoom-in flex flex-col items-center gap-1 ${
                          theme === 'system' 
                            ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-lg ring-2 ring-blue-500' 
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:shadow-md'
                        }`}
                      >
                        <span className="text-lg">🖥️</span>
                        <span className="font-semibold">System</span>
                      </button>
                    </div>
                  </div>

                  {/* Language Selector */}
                  <div className="space-y-2 animate-slide-in-right">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('mobile.language')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          handleLanguageChange('en');
                          setShowMobileMenu(false);
                        }}
                        className={`p-2 text-sm rounded-lg border transition-all animate-zoom-in ${
                          currentLang === 'en' 
                            ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-lg' 
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:shadow-md'
                        }`}
                      >
                        🇺🇸 English
                      </button>
                      <button
                        onClick={() => {
                          handleLanguageChange('fi');
                          setShowMobileMenu(false);
                        }}
                        className={`p-2 text-sm rounded-lg border transition-all animate-zoom-in ${
                          currentLang === 'fi' 
                            ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-lg' 
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:shadow-md'
                        }`}
                      >
                        🇫🇮 {t('language.suomi')}
                      </button>
                      <button
                        onClick={() => {
                          handleLanguageChange('en-GB');
                          setShowMobileMenu(false);
                        }}
                        className={`p-2 text-sm rounded-lg border transition-all animate-zoom-in col-span-2 ${
                          currentLang === 'en-GB' 
                            ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-lg' 
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:shadow-md'
                        }`}
                      >
                        🇬🇧 British English
                      </button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-3 animate-slide-in-bottom mt-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('mobile.quickActions')}</label>
                    <div className="space-y-3">
                      <Link href="/lunch">
                        <button
                          onClick={() => setShowMobileMenu(false)}
                          className="w-full p-3 text-left rounded-lg bg-orange-50 border border-orange-300 text-orange-700 hover:bg-orange-100 transition-all hover:shadow-lg"
                        >
                          🍽️ {t('quickActions.lunch')}
                        </button>
                      </Link>
                      <Link href="/hsl">
                        <button
                          onClick={() => setShowMobileMenu(false)}
                          className="w-full p-3 text-left rounded-lg bg-green-50 border border-green-300 text-green-700 hover:bg-green-100 transition-all hover:shadow-lg"
                        >
                          🚌 {t('quickActions.transport')}
                        </button>
                      </Link>
                      <Link href="/admin-login">
                        <button
                          onClick={() => setShowMobileMenu(false)}
                          className="w-full p-3 text-left rounded-lg bg-gray-50 border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all hover:shadow-lg"
                        >
                          ⚙️ {t('quickActions.admin')}
                        </button>
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Admin Panel Mobile Menu */}
                  <div className="space-y-2 animate-slide-in-left">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('mobile.theme')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          handleThemeChange('light');
                          setShowMobileMenu(false);
                        }}
                        className={`p-2 text-xs rounded-lg border transition-all animate-zoom-in ${
                          theme === 'light' 
                            ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-lg' 
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:shadow-md'
                        }`}
                      >
                        ☀️ {t('theme.light')}
                      </button>
                      <button
                        onClick={() => {
                          handleThemeChange('dark');
                          setShowMobileMenu(false);
                        }}
                        className={`p-2 text-xs rounded-lg border transition-all animate-zoom-in ${
                          theme === 'dark' 
                            ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-lg' 
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:shadow-md'
                        }`}
                      >
                        🌙 {t('theme.dark')}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 animate-slide-in-right">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('mobile.quickActions')}</label>
                    <div className="space-y-2">
                      <Link href="/lunch">
                        <button
                          onClick={() => setShowMobileMenu(false)}
                          className="w-full p-3 text-left rounded-lg bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 transition-all hover:shadow-lg animate-heartbeat"
                        >
                          🍽️ {t('quickActions.lunch')}
                        </button>
                      </Link>
                      <Link href="/hsl">
                        <button
                          onClick={() => setShowMobileMenu(false)}
                          className="w-full p-3 text-left rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-all hover:shadow-lg"
                        >
                          🚌 {t('quickActions.transport')}
                        </button>
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setShowMobileMenu(false);
                        }}
                        className="w-full p-3 text-left rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-all hover:shadow-lg"
                      >
                        🚪 {t('logout')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      <NavigationModal 
        isOpen={showNavigationModal}
        onClose={() => setShowNavigationModal(false)}
        onNavigate={handleNavigation}
      />
    </header>
  );
}
