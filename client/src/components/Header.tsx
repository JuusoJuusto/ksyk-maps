import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import NavigationModal from "@/components/NavigationModal";

export default function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const [showNavigationModal, setShowNavigationModal] = useState(false);

  const isActive = (path: string) => location === path;
  const isAdmin = isAuthenticated && (user as any)?.role === 'admin';

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLang(lang);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleNavigation = (from: string, to: string) => {
    // This will integrate with the map to show navigation
    console.log(`Navigation requested from ${from} to ${to}`);
    // For now, show a success message
    alert(`Route planned from ${from} to ${to}! Check the map for directions.`);
  };

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex-shrink-0" data-testid="link-home">
              <h1 className="text-xl font-bold text-primary">KSYK Map</h1>
              <p className="text-xs text-muted-foreground">by OWL Apps</p>
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            <Link 
              href="/" 
              className={`px-3 py-2 text-sm font-medium ${
                isActive('/') 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-primary'
              }`}
              data-testid="nav-map"
            >
              {t('nav.map')}
            </Link>
            <Link 
              href="/directory" 
              className={`px-3 py-2 text-sm font-medium ${
                isActive('/directory') 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-primary'
              }`}
              data-testid="nav-directory"
            >
              {t('nav.directory')}
            </Link>
            <button 
              onClick={() => setShowNavigationModal(true)}
              className="text-muted-foreground hover:text-primary px-3 py-2 text-sm font-medium"
              data-testid="nav-navigation"
            >
              🧭 Navigation
            </button>
            <Link 
              href="/events" 
              className={`px-3 py-2 text-sm font-medium ${
                isActive('/events') 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-primary'
              }`}
              data-testid="nav-events"
            >
              {t('nav.events')}
            </Link>
            <Link 
              href="/info" 
              className={`px-3 py-2 text-sm font-medium ${
                isActive('/info') 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-primary'
              }`}
              data-testid="nav-info"
            >
              {t('nav.information')}
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            {/* Language Toggle */}
            <div className="language-toggle flex bg-muted rounded-md p-1">
              <button 
                className={`px-3 py-1 text-sm font-medium rounded-sm ${
                  currentLang === 'en' 
                    ? 'bg-primary text-primary-foreground' 
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
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => handleLanguageChange('fi')}
                data-testid="button-lang-fi"
              >
                FI
              </button>
            </div>
            
            {/* Admin Panel Link */}
            <Link href="/admin">
              <Button 
                variant={isActive('/admin') ? 'default' : 'outline'}
                className="hidden sm:flex items-center space-x-2"
                data-testid="button-admin"
              >
                <i className="fas fa-user-cog text-sm"></i>
                <span className="text-sm font-medium">{t('nav.admin')}</span>
              </Button>
            </Link>
            
            {/* Logout Button - only show if authenticated */}
            {isAuthenticated && (
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="hidden sm:flex items-center space-x-2"
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt text-sm"></i>
                <span className="text-sm font-medium">{t('logout')}</span>
              </Button>
            )}
            
            {/* Mobile menu button */}
            <button className="md:hidden" data-testid="button-mobile-menu">
              <i className="fas fa-bars text-xl text-foreground"></i>
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
