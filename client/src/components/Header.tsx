import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Menu, X, Settings, Search, LogOut, UtensilsCrossed, Bus, Monitor, Sparkles } from "lucide-react";
import KSYKLogo from "@/components/KSYKLogo";
import { cn } from "@/lib/utils";
import { trackFeature } from "@/lib/analytics";

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

  // MazeMap-style ⌘K / Ctrl+K quick-focus for the search input. Only
  // active when a search field is actually mounted for this page.
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!onSearchChange) return;
    const onKey = (e: KeyboardEvent) => {
      const modOK = e.metaKey || e.ctrlKey;
      if (modOK && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSearchChange]);

  const isActive = (path: string) => location === path;
  const isAdmin = isAuthenticated && (user as any)?.role === 'admin';
  const isInAdminPanel = location === '/admin' || location.startsWith('/admin/');

  const handleLanguageChange = (lang: string) => {
    localStorage.setItem('ksyk_language', lang);
    trackFeature('language_change', { lang });
    i18n.changeLanguage(lang).then(() => {
      window.location.reload();
    });
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'neon' | 'system') => {
    setTheme(newTheme);
    trackFeature('theme_change', { theme: newTheme });
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
      {/* Header — floating rounded card on every screen size.
       *  Side padding wraps a rounded-2xl inner element so the header
       *  looks like a chip, matching the announcement banner.
       *  overflow-hidden clips the inner search-row border-t against
       *  the rounded corners. */}
      <div className="sticky top-0 z-50 px-2 sm:px-3 md:px-4 pt-2">
        <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-white/80 dark:border-gray-700/60 shadow-md shadow-black/[0.06] rounded-2xl overflow-hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          {/* v3.27.5 — taller header on desktop. 14→16→20 across
           *  mobile/sm/lg so the nav reads as a proper top bar on
           *  desktop, not a squished chip. */}
          <div className="flex items-center gap-2 h-12 sm:h-14">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center space-x-2 sm:space-x-3 group" data-testid="link-home">
              <KSYKLogo
                size={largeLogo ? "lg" : "md"}
                priority={largeLogo}
                className="group-hover:scale-[1.02] transition-transform duration-200"
              />
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-blue-600 tracking-tight">KSYK Maps</h2>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold">Campus navigation</p>
              </div>
            </Link>

            {/* Desktop centre label */}
            {isInAdminPanel && (
              <nav className="hidden md:flex">
                <span className="px-3 py-2 text-sm font-semibold text-blue-600">
                  Admin Management Portal
                </span>
              </nav>
            )}

            {/* Inline search — md+ screens */}
            {onSearchChange && !isInAdminPanel && (
              <div className="hidden md:flex flex-1 min-w-0 max-w-xs lg:max-w-md relative mx-2">
                <Search className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 h-[15px] w-[15px] pointer-events-none z-10 transition-colors",
                  (searchQuery && searchQuery.trim()) ? "text-blue-600 dark:text-blue-400" : (darkMode ? "text-gray-500" : "text-gray-400"),
                )} />
                <Input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery ?? ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder ?? (currentLang === "fi" ? "Etsi tiloja tai rakennuksia…" : "Search rooms or buildings…")}
                  className={cn(
                    "h-9 w-full pl-9 pr-14 text-sm rounded-xl border shadow-sm transition-all",
                    "focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:border-blue-500/60 focus-visible:shadow-md focus-visible:shadow-blue-500/10",
                    darkMode ? "bg-gray-800/90 border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-200"
                  )}
                  role="combobox"
                  aria-controls="search-results-listbox"
                  aria-expanded={!!(searchQuery && searchQuery.trim())}
                  aria-autocomplete="list"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                ) : (
                  <kbd className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 hidden xl:inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border pointer-events-none select-none",
                    darkMode ? "border-gray-700 bg-gray-800 text-gray-500" : "border-gray-200 bg-white text-gray-400",
                  )}>
                    {typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘K" : "Ctrl K"}
                  </kbd>
                )}
              </div>
            )}

            {/* Desktop controls */}
            <div className={homeMinimal ? "hidden" : "hidden md:flex items-center space-x-1.5"}>
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
                      🍽️<span className="hidden xl:inline ml-1">{currentLang === 'fi' ? 'Ruokalista' : 'Lunch'}</span>
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
            <div className={homeMinimal ? "hidden" : "md:hidden"}>
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

        {/* Search row — MazeMap-style prominent bar with focus glow,
         *  keyboard hint pill, and a slightly bigger footprint so it
         *  reads as the primary way to explore the campus. */}
        {onSearchChange && (
          <div className={cn("md:hidden border-t", darkMode ? "border-gray-800 bg-gray-900/60" : "border-gray-100 bg-slate-50/80")}>
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 relative">
              <Search className={cn(
                "absolute left-6 sm:left-7 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none z-10 transition-colors",
                (searchQuery && searchQuery.trim())
                  ? "text-blue-600 dark:text-blue-400"
                  : (darkMode ? "text-gray-500" : "text-gray-400"),
              )} />
              <Input
                type="search"
                value={searchQuery ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder ?? (currentLang === "fi" ? "Etsi tiloja tai rakennuksia…" : "Search rooms or buildings…")}
                className={cn(
                  "h-11 w-full pl-10 pr-16 text-sm rounded-2xl border shadow-sm transition-all",
                  "focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:border-blue-500/60 focus-visible:shadow-md focus-visible:shadow-blue-500/10",
                  darkMode ? "bg-gray-800/90 border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-200"
                )}
                aria-label={currentLang === "fi" ? "Etsi tiloja tai rakennuksia" : "Search rooms or buildings"}
                // Combobox pattern — pairs with the KSYKMapView results
                // dropdown (id="search-results-listbox") so screen readers
                // announce results as the user types.
                role="combobox"
                aria-controls="search-results-listbox"
                aria-expanded={!!(searchQuery && searchQuery.trim())}
                aria-autocomplete="list"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {/* Right-side controls — clear button if searching, else a
               *  subtle keyboard hint pill so users know how to focus
               *  the field. MazeMap-style. */}
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              ) : (
                <kbd className={cn(
                  "absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border pointer-events-none select-none",
                  darkMode
                    ? "border-gray-700 bg-gray-800 text-gray-500"
                    : "border-gray-200 bg-white text-gray-400",
                )}>
                  {typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘K" : "Ctrl K"}
                </kbd>
              )}
            </div>
          </div>
        )}
        </header>
      </div>

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
        className="fixed inset-0 z-[60] md:hidden bg-black/40 backdrop-blur-sm"
        style={{
          opacity: showMobileMenu ? 1 : 0,
          pointerEvents: showMobileMenu ? "auto" : "none",
          transition: "opacity 260ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />

      {/* Floating rounded sheet — matches the top-bar + banner design.
       *  Wrapped in horizontal padding + full rounded-2xl corners so the
       *  sheet looks like a floating card, not an edge-to-edge modal. */}
      <div
        className={cn(
          "fixed z-[70] md:hidden left-0 right-0 top-[3.5rem] sm:top-[4rem]",
          "px-2 sm:px-3 md:px-4",
        )}
        style={{
          opacity: showMobileMenu ? 1 : 0,
          transform: showMobileMenu
            ? "translateY(0)"
            : "translateY(-16px)",
          pointerEvents: showMobileMenu ? "auto" : "none",
          transition: "opacity 260ms ease, transform 320ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)]"
        style={{
          maxHeight: "min(85dvh, calc(100dvh - 6rem))",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Identity strip — theme-var driven, matches the top bar. */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/40">
              <KSYKLogo size="sm" />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold tracking-tight leading-tight text-foreground">
                KSYK Maps
              </div>
              <div className="text-[11px] leading-tight text-muted-foreground">
                {currentLang === 'fi' ? 'Kampusnavigointi' : 'Campus navigation'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowMobileMenu(false)}
            className="h-9 w-9 rounded-full flex items-center justify-center active:scale-90 transition-all text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label={currentLang === 'fi' ? 'Sulje valikko' : 'Close menu'}
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable content — simple, single-column list.
         *  KSYK colors are back: blue for settings, orange for lunch,
         *  green for transport. No subtitles, no stagger — just clean
         *  colored rows. */}
        <div className="flex flex-col max-h-full overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto px-4 py-4 space-y-5">
            {!isInAdminPanel ? (
              <>
                {/* ── Quick access — flat colored rows ────────────── */}
                <section className="space-y-3">
                  {/* Row: Map settings — KSYK blue */}
                  {onOpenSettings && (
                    <button
                      onClick={() => { setShowMobileMenu(false); onOpenSettings(); }}
                      className={cn(
                        "w-full flex items-center gap-3.5 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.98]",
                        darkMode
                          ? "bg-blue-950/40 hover:bg-blue-900/50 border border-blue-900/40 text-blue-100"
                          : "bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900",
                      )}
                    >
                      <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                        darkMode ? "bg-blue-900/60" : "bg-blue-100",
                      )}>
                        <Settings className={cn("h-5 w-5", darkMode ? "text-blue-300" : "text-blue-600")} strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold leading-tight">
                          {currentLang === 'fi' ? 'Asetukset' : 'Map settings'}
                        </div>
                        <div className={cn("text-[11px] mt-0.5", darkMode ? "text-blue-300/70" : "text-blue-700/60")}>
                          {currentLang === 'fi' ? 'Näkymä, kerros, 3D' : 'View, floor, 3D'}
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Row: Lunch — KSYK orange */}
                  <Link href="/lunch" onClick={() => setShowMobileMenu(false)}>
                    <div className={cn(
                      "w-full flex items-center gap-3.5 px-4 py-4 rounded-2xl transition-all active:scale-[0.98] cursor-pointer",
                      darkMode
                        ? "bg-orange-950/40 hover:bg-orange-900/50 border border-orange-900/40 text-orange-100"
                        : "bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-900",
                    )}>
                      <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                        darkMode ? "bg-orange-900/60" : "bg-orange-100",
                      )}>
                        <UtensilsCrossed className={cn("h-5 w-5", darkMode ? "text-orange-300" : "text-orange-600")} strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold leading-tight">
                          {t('quickActions.lunch')}
                        </div>
                        <div className={cn("text-[11px] mt-0.5", darkMode ? "text-orange-300/70" : "text-orange-700/60")}>
                          {currentLang === 'fi' ? 'Tänään ja koko viikko' : 'Today & this week'}
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Row: Transport — KSYK green */}
                  <Link href="/hsl" onClick={() => setShowMobileMenu(false)}>
                    <div className={cn(
                      "w-full flex items-center gap-3.5 px-4 py-4 rounded-2xl transition-all active:scale-[0.98] cursor-pointer",
                      darkMode
                        ? "bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-900/40 text-emerald-100"
                        : "bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900",
                    )}>
                      <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                        darkMode ? "bg-emerald-900/60" : "bg-emerald-100",
                      )}>
                        <Bus className={cn("h-5 w-5", darkMode ? "text-emerald-300" : "text-emerald-600")} strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold leading-tight">
                          {t('quickActions.transport')}
                        </div>
                        <div className={cn("text-[11px] mt-0.5", darkMode ? "text-emerald-300/70" : "text-emerald-700/60")}>
                          {currentLang === 'fi' ? 'HSL aikataulut & linjat' : 'HSL schedules & routes'}
                        </div>
                      </div>
                    </div>
                  </Link>
                </section>

                {/* ── Appearance — segmented control ────────────── */}
                <section className="space-y-2">
                  <div className={cn(
                    "text-xs font-semibold pl-1",
                    darkMode ? "text-gray-400" : "text-gray-600",
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
                      <span>{t('theme.system')}</span>
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

                {/* ── Language — segmented control ────────────── */}
                <section className="space-y-2">
                  <div className={cn(
                    "text-xs font-semibold pl-1",
                    darkMode ? "text-gray-400" : "text-gray-600",
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

                {/* Footer — attribution */}
                <div className={cn(
                  "flex items-center justify-between text-[11px] pt-1 pb-1",
                  darkMode ? "text-gray-600" : "text-gray-500",
                )}>
                  <span>KSYK Maps</span>
                  <span>Campus navigation</span>
                </div>
              </>
            ) : (
              // ─── Admin-panel variant — same simple KSYK-color rows ───
              <>
                <section className="space-y-2">
                  <Link href="/lunch" onClick={() => setShowMobileMenu(false)}>
                    <div className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors active:scale-[0.98] cursor-pointer",
                      darkMode
                        ? "bg-orange-950/40 hover:bg-orange-900/50 border border-orange-900/40 text-orange-100"
                        : "bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-900",
                    )}>
                      <UtensilsCrossed className={cn(
                        "h-5 w-5 shrink-0",
                        darkMode ? "text-orange-300" : "text-orange-600",
                      )} strokeWidth={2} />
                      <span className="text-[15px] font-semibold flex-1">
                        {t('quickActions.lunch')}
                      </span>
                    </div>
                  </Link>

                  <Link href="/hsl" onClick={() => setShowMobileMenu(false)}>
                    <div className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors active:scale-[0.98] cursor-pointer",
                      darkMode
                        ? "bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-900/40 text-emerald-100"
                        : "bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900",
                    )}>
                      <Bus className={cn(
                        "h-5 w-5 shrink-0",
                        darkMode ? "text-emerald-300" : "text-emerald-600",
                      )} strokeWidth={2} />
                      <span className="text-[15px] font-semibold flex-1">
                        {t('quickActions.transport')}
                      </span>
                    </div>
                  </Link>

                  <button
                    onClick={() => { handleLogout(); setShowMobileMenu(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-colors active:scale-[0.98]",
                      darkMode
                        ? "bg-red-950/40 hover:bg-red-900/50 border border-red-900/40 text-red-100"
                        : "bg-red-50 hover:bg-red-100 border border-red-200 text-red-900",
                    )}
                  >
                    <LogOut className={cn(
                      "h-5 w-5 shrink-0",
                      darkMode ? "text-red-300" : "text-red-600",
                    )} strokeWidth={2} />
                    <span className="text-[15px] font-semibold flex-1">
                      {t('logout')}
                    </span>
                  </button>
                </section>

                <section className="space-y-2">
                  <div className={cn(
                    "text-xs font-semibold pl-1",
                    darkMode ? "text-gray-400" : "text-gray-600",
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
      </div>

    </>
  );
}
