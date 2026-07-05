import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Menu, X, Settings, Search, LogOut, UtensilsCrossed, Bus, ChevronRight, Monitor, Sparkles } from "lucide-react";
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

  // ── Segmented control button (theme + language) ──────────────────────
  // A pill inside a shared background with a subtle sliding indicator.
  // Used for the theme + language selectors — cleaner than a grid of cards.
  const SegBtn = ({
    active,
    onClick,
    children,
    ariaLabel,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    ariaLabel?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97]",
        active
          ? darkMode
            ? "bg-white text-gray-900 shadow-sm"
            : "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
          : darkMode
            ? "text-gray-400 hover:text-gray-200"
            : "text-gray-500 hover:text-gray-800",
      )}
    >
      {children}
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

      {/* ── Mobile menu — "Nordic Editorial" sheet.
       *   Full-width drop-down from the header. Single KSYK-blue accent,
       *   refined neutrals, editorial section labels, list rows with
       *   chevrons, segmented control for theme + language. Grab handle
       *   at the top signals it's a sheet.
       *   Rendered outside <header> to escape the sticky positioning. */}

      {/* Backdrop — soft dim + blur, click to close */}
      <div
        aria-hidden="true"
        onClick={() => setShowMobileMenu(false)}
        className="fixed inset-0 z-[60] lg:hidden bg-black/40 backdrop-blur-sm"
        style={{
          opacity: showMobileMenu ? 1 : 0,
          pointerEvents: showMobileMenu ? "auto" : "none",
          transition: "opacity 260ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />

      {/* Full-width sheet */}
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "fixed z-[70] lg:hidden left-0 right-0 top-14 sm:top-16",
          "overflow-hidden",
          "shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)]",
          "border-b",
          darkMode
            ? "bg-gray-950/98 border-gray-800/80 backdrop-blur-2xl"
            : "bg-white/98 border-gray-200/70 backdrop-blur-2xl",
        )}
        style={{
          opacity: showMobileMenu ? 1 : 0,
          transform: showMobileMenu
            ? "translateY(0)"
            : "translateY(-16px)",
          pointerEvents: showMobileMenu ? "auto" : "none",
          transition: "opacity 260ms ease, transform 320ms cubic-bezier(0.16,1,0.3,1)",
          maxHeight: "min(85dvh, calc(100dvh - 4rem))",
          paddingBottom: "env(safe-area-inset-bottom)",
          borderRadius: "0 0 24px 24px",
        }}
      >
        {/* Grab handle — visual affordance that this is a sheet */}
        <div className="flex justify-center pt-2 pb-1">
          <div className={cn(
            "h-1 w-9 rounded-full",
            darkMode ? "bg-gray-700" : "bg-gray-300",
          )} />
        </div>

        {/* Identity strip — big, editorial */}
        <div className={cn(
          "flex items-center justify-between px-5 py-3 border-b",
          darkMode ? "border-gray-800/70" : "border-gray-100",
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ring-1",
              darkMode
                ? "bg-blue-950/40 ring-blue-900/40 text-blue-300"
                : "bg-blue-50 ring-blue-100 text-blue-600",
            )}>
              <KSYKLogo size="sm" />
            </div>
            <div className="min-w-0">
              <div className={cn(
                "text-base font-bold tracking-tight leading-tight",
                darkMode ? "text-white" : "text-gray-900",
              )}>
                KSYK Maps
              </div>
              <div className={cn(
                "text-[11px] leading-tight",
                darkMode ? "text-gray-500" : "text-gray-500",
              )}>
                {currentLang === 'fi' ? 'Kampusnavigointi' : 'Campus navigation'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowMobileMenu(false)}
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center active:scale-90 transition-all",
              darkMode
                ? "text-gray-400 hover:text-white hover:bg-gray-800/70"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
            )}
            aria-label={currentLang === 'fi' ? 'Sulje valikko' : 'Close menu'}
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable content — constrained to max-w-2xl on tablets */}
        <div className="flex flex-col max-h-full overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto px-5 py-4 space-y-6">
            {!isInAdminPanel ? (
              <>
                {/* ── QUICK ACCESS section ─────────────────────────── */}
                <section
                  className="space-y-1.5"
                  style={{
                    animation: showMobileMenu ? "menuItem 380ms cubic-bezier(0.16,1,0.3,1) both" : "none",
                    animationDelay: "80ms",
                  }}
                >
                  <div className={cn(
                    "text-[10px] font-bold tracking-[0.18em] uppercase pl-1 mb-2.5",
                    darkMode ? "text-gray-500" : "text-gray-400",
                  )}>
                    {currentLang === 'fi' ? 'Pikavalinnat' : 'Quick access'}
                  </div>

                  {/* Row: Map settings */}
                  {onOpenSettings && (
                    <button
                      onClick={() => { setShowMobileMenu(false); onOpenSettings(); }}
                      className={cn(
                        "group w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.99]",
                        darkMode
                          ? "bg-gray-900/60 hover:bg-gray-800 border border-gray-800/60"
                          : "bg-white hover:bg-gray-50 border border-gray-200/70 hover:border-gray-300 shadow-sm hover:shadow",
                      )}
                    >
                      <span className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                        darkMode
                          ? "bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20"
                          : "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
                      )}>
                        <Settings className="h-5 w-5" strokeWidth={2} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "text-[15px] font-semibold tracking-tight",
                          darkMode ? "text-gray-100" : "text-gray-900",
                        )}>
                          {currentLang === 'fi' ? 'Asetukset' : 'Map settings'}
                        </div>
                        <div className={cn(
                          "text-[12px] leading-tight mt-0.5",
                          darkMode ? "text-gray-500" : "text-gray-500",
                        )}>
                          {currentLang === 'fi' ? 'Karttatyyli ja saavutettavuus' : 'Map style & accessibility'}
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                        darkMode ? "text-gray-600" : "text-gray-400",
                      )} />
                    </button>
                  )}

                  {/* Row: Lunch */}
                  <Link href="/lunch" onClick={() => setShowMobileMenu(false)}>
                    <div className={cn(
                      "group w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.99] cursor-pointer",
                      darkMode
                        ? "bg-gray-900/60 hover:bg-gray-800 border border-gray-800/60"
                        : "bg-white hover:bg-gray-50 border border-gray-200/70 hover:border-gray-300 shadow-sm hover:shadow",
                    )}>
                      <span className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                        darkMode
                          ? "bg-gray-800 text-gray-300 ring-1 ring-gray-700"
                          : "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
                      )}>
                        <UtensilsCrossed className="h-5 w-5" strokeWidth={2} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "text-[15px] font-semibold tracking-tight",
                          darkMode ? "text-gray-100" : "text-gray-900",
                        )}>
                          {t('quickActions.lunch')}
                        </div>
                        <div className={cn(
                          "text-[12px] leading-tight mt-0.5",
                          darkMode ? "text-gray-500" : "text-gray-500",
                        )}>
                          {currentLang === 'fi' ? 'Päivän ateriat ja koulun ruokala' : "Today's meals & cafeteria"}
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                        darkMode ? "text-gray-600" : "text-gray-400",
                      )} />
                    </div>
                  </Link>

                  {/* Row: Transport */}
                  <Link href="/hsl" onClick={() => setShowMobileMenu(false)}>
                    <div className={cn(
                      "group w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.99] cursor-pointer",
                      darkMode
                        ? "bg-gray-900/60 hover:bg-gray-800 border border-gray-800/60"
                        : "bg-white hover:bg-gray-50 border border-gray-200/70 hover:border-gray-300 shadow-sm hover:shadow",
                    )}>
                      <span className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                        darkMode
                          ? "bg-gray-800 text-gray-300 ring-1 ring-gray-700"
                          : "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
                      )}>
                        <Bus className="h-5 w-5" strokeWidth={2} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "text-[15px] font-semibold tracking-tight",
                          darkMode ? "text-gray-100" : "text-gray-900",
                        )}>
                          {t('quickActions.transport')}
                        </div>
                        <div className={cn(
                          "text-[12px] leading-tight mt-0.5",
                          darkMode ? "text-gray-500" : "text-gray-500",
                        )}>
                          {currentLang === 'fi' ? 'HSL-aikataulut ja pysäkit' : 'HSL schedules & stops'}
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                        darkMode ? "text-gray-600" : "text-gray-400",
                      )} />
                    </div>
                  </Link>
                </section>

                {/* ── APPEARANCE section — segmented control ────────────── */}
                <section
                  className="space-y-2.5"
                  style={{
                    animation: showMobileMenu ? "menuItem 380ms cubic-bezier(0.16,1,0.3,1) both" : "none",
                    animationDelay: "160ms",
                  }}
                >
                  <div className={cn(
                    "text-[10px] font-bold tracking-[0.18em] uppercase pl-1",
                    darkMode ? "text-gray-500" : "text-gray-400",
                  )}>
                    {currentLang === 'fi' ? 'Ulkoasu' : 'Appearance'}
                  </div>
                  <div className={cn(
                    "flex gap-1 p-1 rounded-2xl",
                    darkMode ? "bg-gray-900/70 ring-1 ring-gray-800/70" : "bg-gray-100/80 ring-1 ring-gray-200/70",
                  )}>
                    <SegBtn
                      active={theme === 'light'}
                      onClick={() => handleThemeChange('light')}
                      ariaLabel={t('theme.light')}
                    >
                      <Sun className="h-4 w-4" strokeWidth={2.25} />
                      <span>{t('theme.light')}</span>
                    </SegBtn>
                    <SegBtn
                      active={theme === 'dark'}
                      onClick={() => handleThemeChange('dark')}
                      ariaLabel={t('theme.dark')}
                    >
                      <Moon className="h-4 w-4" strokeWidth={2.25} />
                      <span>{t('theme.dark')}</span>
                    </SegBtn>
                    <SegBtn
                      active={theme === 'system'}
                      onClick={() => handleThemeChange('system')}
                      ariaLabel="System"
                    >
                      <Monitor className="h-4 w-4" strokeWidth={2.25} />
                      <span>{currentLang === 'fi' ? 'Auto' : 'Auto'}</span>
                    </SegBtn>
                    {neonUnlocked && (
                      <SegBtn
                        active={theme === 'neon'}
                        onClick={() => handleThemeChange('neon')}
                        ariaLabel="Neon"
                      >
                        <Sparkles className="h-4 w-4" strokeWidth={2.25} />
                        <span>Neon</span>
                      </SegBtn>
                    )}
                  </div>
                </section>

                {/* ── LANGUAGE section — segmented control ──────────────── */}
                <section
                  className="space-y-2.5"
                  style={{
                    animation: showMobileMenu ? "menuItem 380ms cubic-bezier(0.16,1,0.3,1) both" : "none",
                    animationDelay: "240ms",
                  }}
                >
                  <div className={cn(
                    "text-[10px] font-bold tracking-[0.18em] uppercase pl-1",
                    darkMode ? "text-gray-500" : "text-gray-400",
                  )}>
                    {currentLang === 'fi' ? 'Kieli' : 'Language'}
                  </div>
                  <div className={cn(
                    "flex gap-1 p-1 rounded-2xl",
                    darkMode ? "bg-gray-900/70 ring-1 ring-gray-800/70" : "bg-gray-100/80 ring-1 ring-gray-200/70",
                  )}>
                    <SegBtn
                      active={currentLang === 'en'}
                      onClick={() => handleLanguageChange('en')}
                      ariaLabel="English"
                    >
                      <span className="text-base leading-none">🇬🇧</span>
                      <span>English</span>
                    </SegBtn>
                    <SegBtn
                      active={currentLang === 'fi'}
                      onClick={() => handleLanguageChange('fi')}
                      ariaLabel="Suomi"
                    >
                      <span className="text-base leading-none">🇫🇮</span>
                      <span>Suomi</span>
                    </SegBtn>
                    {localStorage.getItem('ksyk_british_unlocked') === 'true' && (
                      <SegBtn
                        active={currentLang === 'en-GB'}
                        onClick={() => handleLanguageChange('en-GB')}
                        ariaLabel="British"
                      >
                        <span>British</span>
                      </SegBtn>
                    )}
                  </div>
                </section>

                {/* Footer — version + attribution */}
                <div
                  className={cn(
                    "flex items-center justify-between text-[10px] font-medium tracking-wide pt-2 pb-1",
                    darkMode ? "text-gray-600" : "text-gray-400",
                  )}
                  style={{
                    animation: showMobileMenu ? "menuItem 380ms cubic-bezier(0.16,1,0.3,1) both" : "none",
                    animationDelay: "320ms",
                  }}
                >
                  <span>v1.8.0</span>
                  <span className="uppercase tracking-[0.14em]">Nordbyte Studio</span>
                </div>
              </>
            ) : (
              // ─── Admin-panel variant ───
              <>
                <section className="space-y-1.5">
                  <div className={cn(
                    "text-[10px] font-bold tracking-[0.18em] uppercase pl-1 mb-2.5",
                    darkMode ? "text-gray-500" : "text-gray-400",
                  )}>
                    {currentLang === 'fi' ? 'Pikavalinnat' : 'Quick access'}
                  </div>

                  <Link href="/lunch" onClick={() => setShowMobileMenu(false)}>
                    <div className={cn(
                      "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all cursor-pointer",
                      darkMode
                        ? "bg-gray-900/60 hover:bg-gray-800 border border-gray-800/60"
                        : "bg-white hover:bg-gray-50 border border-gray-200/70 shadow-sm",
                    )}>
                      <span className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                        darkMode ? "bg-gray-800 text-gray-300 ring-1 ring-gray-700" : "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
                      )}>
                        <UtensilsCrossed className="h-5 w-5" strokeWidth={2} />
                      </span>
                      <span className={cn(
                        "text-[15px] font-semibold flex-1 tracking-tight",
                        darkMode ? "text-gray-100" : "text-gray-900",
                      )}>
                        {t('quickActions.lunch')}
                      </span>
                      <ChevronRight className={cn("h-4 w-4 shrink-0", darkMode ? "text-gray-600" : "text-gray-400")} />
                    </div>
                  </Link>

                  <Link href="/hsl" onClick={() => setShowMobileMenu(false)}>
                    <div className={cn(
                      "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all cursor-pointer",
                      darkMode
                        ? "bg-gray-900/60 hover:bg-gray-800 border border-gray-800/60"
                        : "bg-white hover:bg-gray-50 border border-gray-200/70 shadow-sm",
                    )}>
                      <span className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                        darkMode ? "bg-gray-800 text-gray-300 ring-1 ring-gray-700" : "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
                      )}>
                        <Bus className="h-5 w-5" strokeWidth={2} />
                      </span>
                      <span className={cn(
                        "text-[15px] font-semibold flex-1 tracking-tight",
                        darkMode ? "text-gray-100" : "text-gray-900",
                      )}>
                        {t('quickActions.transport')}
                      </span>
                      <ChevronRight className={cn("h-4 w-4 shrink-0", darkMode ? "text-gray-600" : "text-gray-400")} />
                    </div>
                  </Link>

                  <button
                    onClick={() => { handleLogout(); setShowMobileMenu(false); }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all",
                      darkMode
                        ? "bg-red-950/30 hover:bg-red-950/50 border border-red-900/40 text-red-300"
                        : "bg-red-50/70 hover:bg-red-50 border border-red-200/70 text-red-700",
                    )}
                  >
                    <span className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                      darkMode ? "bg-red-500/10 ring-1 ring-red-900/40" : "bg-red-100 ring-1 ring-red-200",
                    )}>
                      <LogOut className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="text-[15px] font-semibold flex-1 tracking-tight">
                      {t('logout')}
                    </span>
                  </button>
                </section>

                <section className="space-y-2.5">
                  <div className={cn(
                    "text-[10px] font-bold tracking-[0.18em] uppercase pl-1",
                    darkMode ? "text-gray-500" : "text-gray-400",
                  )}>
                    {currentLang === 'fi' ? 'Ulkoasu' : 'Appearance'}
                  </div>
                  <div className={cn(
                    "flex gap-1 p-1 rounded-2xl",
                    darkMode ? "bg-gray-900/70 ring-1 ring-gray-800/70" : "bg-gray-100/80 ring-1 ring-gray-200/70",
                  )}>
                    <SegBtn
                      active={theme === 'light'}
                      onClick={() => handleThemeChange('light')}
                    >
                      <Sun className="h-4 w-4" strokeWidth={2.25} />
                      <span>{t('theme.light')}</span>
                    </SegBtn>
                    <SegBtn
                      active={theme === 'dark'}
                      onClick={() => handleThemeChange('dark')}
                    >
                      <Moon className="h-4 w-4" strokeWidth={2.25} />
                      <span>{t('theme.dark')}</span>
                    </SegBtn>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>

    </>
  );
}
