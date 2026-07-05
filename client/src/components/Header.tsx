import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Menu, X, Settings, Search, LogOut, UtensilsCrossed, Bus } from "lucide-react";
import KSYKLogo from "@/components/KSYKLogo";
import { cn } from "@/lib/utils";

type HeaderProps = {
  largeLogo?: boolean;
  homeMinimal?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onOpenSettings?: () => void;
};

export default function Header({
  largeLogo = false,
  homeMinimal = false,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  onOpenSettings,
}: HeaderProps) {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { theme, setTheme, neonUnlocked } = useTheme();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ksyk_language');
    if (saved && saved !== i18n.language) {
      i18n.changeLanguage(saved);
      setCurrentLang(saved);
    }
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setShowMobileMenu(false);
  }, [location]);

  // Esc + body scroll lock while drawer is open
  useEffect(() => {
    if (!showMobileMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMobileMenu(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [showMobileMenu]);

  const isActive = (path: string) => location === path;
  const isAdmin = isAuthenticated && (user as any)?.role === 'admin';
  const isInAdminPanel = location === '/admin' || location.startsWith('/admin/');

  const handleLanguageChange = (lang: string) => {
    localStorage.setItem('ksyk_language', lang);
    i18n.changeLanguage(lang).then(() => {
      window.location.reload();
    });
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'neon' | 'system') => {
    setTheme(newTheme);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme })
      });
    } catch { /* non-critical */ }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* non-critical */ } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    }
  };

  // ── Theme button helper ────────────────────────────────────────────────
  const ThemeBtn = ({ value, label, icon }: { value: 'light' | 'dark' | 'neon' | 'system'; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => { handleThemeChange(value); setShowMobileMenu(false); }}
      className={cn(
        "flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all",
        theme === value
          ? "bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm"
          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  // ── Language button helper ─────────────────────────────────────────────
  const LangBtn = ({ value, label }: { value: string; label: string }) => (
    <button
      onClick={() => { handleLanguageChange(value); setShowMobileMenu(false); }}
      className={cn(
        "flex-1 py-2.5 text-sm font-medium rounded-xl border transition-all",
        currentLang === value
          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
      )}
    >
      {label}
    </button>
  );

  return (
    <>
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center space-x-2 sm:space-x-3 group" data-testid="link-home">
              <KSYKLogo
                size={largeLogo ? "lg" : "md"}
                priority={largeLogo}
                className="group-hover:scale-[1.02] transition-transform duration-200"
              />
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-blue-600 tracking-tight">KSYK Maps</h2>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold">by Nordbyte Studio</p>
              </div>
            </Link>

            {/* Desktop centre label */}
            {isInAdminPanel && (
              <nav className="hidden lg:flex">
                <span className="px-3 py-2 text-sm font-semibold text-blue-600">
                  Admin Management Portal
                </span>
              </nav>
            )}

            {/* Desktop controls */}
            <div className={homeMinimal ? "hidden" : "hidden lg:flex items-center space-x-2 lg:space-x-3"}>
              {/* Theme toggle */}
              <button
                onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  theme === 'dark'
                    ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
                title={`Theme: ${theme} — click to toggle`}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Language toggle */}
              <div className="flex bg-muted rounded-md p-1">
                {['en', 'fi'].map((lang) => (
                  <button
                    key={lang}
                    className={cn(
                      "px-3 py-1 text-sm font-medium rounded-sm",
                      currentLang === lang ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => handleLanguageChange(lang)}
                    data-testid={`button-lang-${lang}`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>

              {!isInAdminPanel && (
                <>
                  <Link href="/lunch">
                    <Button variant="outline" size="sm" className="bg-orange-50 border-orange-600 text-orange-700 hover:bg-orange-100 font-semibold shadow-sm" data-testid="button-lunch">
                      🍽️ {currentLang === 'fi' ? 'Ruokalista' : 'Lunch'}
                    </Button>
                  </Link>
                  <Link href="/hsl">
                    <Button variant="outline" size="sm" className="bg-green-50 border-green-600 text-green-700 hover:bg-green-100 font-semibold shadow-sm" data-testid="button-hsl">
                      HSL
                    </Button>
                  </Link>
                  {onOpenSettings && (
                    <Button variant="outline" size="sm" onClick={onOpenSettings} className="gap-1 font-semibold shadow-sm" data-testid="button-settings">
                      <Settings className="h-4 w-4" />
                      <span className="hidden xl:inline">{currentLang === "fi" ? "Asetukset" : "Settings"}</span>
                    </Button>
                  )}
                </>
              )}

              {isInAdminPanel && (
                <>
                  <Link href="/lunch"><Button variant="outline" size="sm" className="bg-orange-50 border-orange-600 text-orange-700 hover:bg-orange-100">🍽️</Button></Link>
                  <Link href="/hsl"><Button variant="outline" size="sm" className="bg-green-50 border-green-600 text-green-700 hover:bg-green-100">HSL</Button></Link>
                  <Button variant="outline" onClick={handleLogout} className="bg-red-50 border-red-600 text-red-700 hover:bg-red-100">Logout</Button>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <div className={homeMinimal ? "hidden" : "lg:hidden"}>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Open menu"
                aria-expanded={showMobileMenu}
                aria-controls="mobile-drawer"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search row */}
        {onSearchChange && (
          <div className={cn("border-t", darkMode ? "border-gray-800 bg-gray-900/60" : "border-gray-100 bg-slate-50/80")}>
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 relative">
              <Search className={cn("absolute left-6 sm:left-7 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none z-10", darkMode ? "text-gray-500" : "text-gray-400")} />
              <Input
                type="search"
                value={searchQuery ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder ?? (currentLang === "fi" ? "Etsi tiloja tai rakennuksia…" : "Search rooms or buildings…")}
                className={cn(
                  "h-10 w-full pl-10 pr-10 text-sm rounded-xl border shadow-sm",
                  darkMode ? "bg-gray-800/90 border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-200"
                )}
                aria-label={currentLang === "fi" ? "Etsi tiloja tai rakennuksia" : "Search rooms or buildings"}
              />
              {searchQuery && (
                <button type="button" onClick={() => onSearchChange("")} className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Clear search">
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile dropdown menu (was a full-height side drawer).
       *   Anchored top-right below the hamburger button. Half the size,
       *   quicker to open/close, and doesn't feel like a modal. */}

      {/* Invisible click-away scrim — no backdrop tint, keeps the map
       *  visible behind the dropdown so users don't lose spatial context. */}
      {showMobileMenu && (
        <div
          aria-hidden="true"
          onClick={() => setShowMobileMenu(false)}
          className="fixed inset-0 z-[60] lg:hidden"
        />
      )}

      {/* Dropdown panel */}
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="false"
        aria-label="Navigation menu"
        className={cn(
          "fixed z-[70] lg:hidden right-3 top-16 w-[min(88vw,300px)]",
          "rounded-2xl border shadow-2xl overflow-hidden",
          "origin-top-right",
          darkMode
            ? "bg-gray-900/98 border-gray-800 backdrop-blur-lg"
            : "bg-white/98 border-gray-200 backdrop-blur-lg",
        )}
        style={{
          opacity: showMobileMenu ? 1 : 0,
          transform: showMobileMenu
            ? "translateY(0) scale(1)"
            : "translateY(-8px) scale(0.96)",
          pointerEvents: showMobileMenu ? "auto" : "none",
          transition: "opacity 180ms ease, transform 200ms cubic-bezier(0.22,1,0.36,1)",
          maxHeight: "min(560px, calc(100dvh - 5rem))",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex flex-col max-h-full overflow-y-auto">
          {!isInAdminPanel ? (
            <>
              {/* Actions — biggest, most tap-worthy items first */}
              <div className="p-2 space-y-1">
                {onOpenSettings && (
                  <button
                    onClick={() => { setShowMobileMenu(false); onOpenSettings(); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                      darkMode
                        ? "text-gray-200 hover:bg-gray-800 active:bg-gray-800/80"
                        : "text-gray-800 hover:bg-gray-100 active:bg-gray-100/80",
                    )}
                  >
                    <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-sm font-medium">
                      {currentLang === 'fi' ? 'Asetukset' : 'Map settings'}
                    </span>
                  </button>
                )}
                <Link href="/lunch" onClick={() => setShowMobileMenu(false)}>
                  <div className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                    darkMode
                      ? "text-gray-200 hover:bg-gray-800 active:bg-gray-800/80"
                      : "text-gray-800 hover:bg-gray-100 active:bg-gray-100/80",
                  )}>
                    <UtensilsCrossed className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                    <span className="text-sm font-medium">{t('quickActions.lunch')}</span>
                  </div>
                </Link>
                <Link href="/hsl" onClick={() => setShowMobileMenu(false)}>
                  <div className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                    darkMode
                      ? "text-gray-200 hover:bg-gray-800 active:bg-gray-800/80"
                      : "text-gray-800 hover:bg-gray-100 active:bg-gray-100/80",
                  )}>
                    <Bus className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-sm font-medium">{t('quickActions.transport')}</span>
                  </div>
                </Link>
              </div>

              <div className={cn("h-px mx-3", darkMode ? "bg-gray-800" : "bg-gray-100")} />

              {/* Theme picker — compact icon row */}
              <div className="p-3">
                <p className={cn(
                  "text-[10px] font-bold tracking-[0.14em] uppercase mb-2",
                  darkMode ? "text-gray-500" : "text-gray-400",
                )}>
                  {t('mobile.theme')}
                </p>
                <div className={`grid gap-1.5 ${neonUnlocked ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  <ThemeBtn value="light" label={t('theme.light')} icon={<Sun className="h-4 w-4" />} />
                  <ThemeBtn value="dark" label={t('theme.dark')} icon={<Moon className="h-4 w-4" />} />
                  <ThemeBtn value="system" label="Auto" icon={<span className="text-base leading-none">💻</span>} />
                  {neonUnlocked && <ThemeBtn value="neon" label="Neon" icon={<span className="text-base leading-none">🌈</span>} />}
                </div>
              </div>

              <div className={cn("h-px mx-3", darkMode ? "bg-gray-800" : "bg-gray-100")} />

              {/* Language picker — compact row */}
              <div className="p-3">
                <p className={cn(
                  "text-[10px] font-bold tracking-[0.14em] uppercase mb-2",
                  darkMode ? "text-gray-500" : "text-gray-400",
                )}>
                  {t('mobile.language')}
                </p>
                <div className="flex gap-1.5">
                  <LangBtn value="en" label="English" />
                  <LangBtn value="fi" label="Suomi" />
                  {localStorage.getItem('ksyk_british_unlocked') === 'true' && (
                    <LangBtn value="en-GB" label="British" />
                  )}
                </div>
              </div>
            </>
          ) : (
            // Admin-panel variant — smaller set, only theme + logout.
            <>
              <div className="p-2 space-y-1">
                <Link href="/lunch" onClick={() => setShowMobileMenu(false)}>
                  <div className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                    darkMode ? "text-gray-200 hover:bg-gray-800" : "text-gray-800 hover:bg-gray-100",
                  )}>
                    <UtensilsCrossed className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                    <span className="text-sm font-medium">{t('quickActions.lunch')}</span>
                  </div>
                </Link>
                <Link href="/hsl" onClick={() => setShowMobileMenu(false)}>
                  <div className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                    darkMode ? "text-gray-200 hover:bg-gray-800" : "text-gray-800 hover:bg-gray-100",
                  )}>
                    <Bus className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-sm font-medium">{t('quickActions.transport')}</span>
                  </div>
                </Link>
                <button
                  onClick={() => { handleLogout(); setShowMobileMenu(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                    darkMode
                      ? "text-red-400 hover:bg-red-950/40"
                      : "text-red-600 hover:bg-red-50",
                  )}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">{t('logout')}</span>
                </button>
              </div>

              <div className={cn("h-px mx-3", darkMode ? "bg-gray-800" : "bg-gray-100")} />

              <div className="p-3">
                <p className={cn(
                  "text-[10px] font-bold tracking-[0.14em] uppercase mb-2",
                  darkMode ? "text-gray-500" : "text-gray-400",
                )}>
                  {t('mobile.theme')}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <ThemeBtn value="light" label={t('theme.light')} icon={<Sun className="h-4 w-4" />} />
                  <ThemeBtn value="dark" label={t('theme.dark')} icon={<Moon className="h-4 w-4" />} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

    </>
  );
}
