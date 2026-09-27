import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Menu, X, Settings, Search, LogOut, UtensilsCrossed, Bus, Monitor, Sparkles, ChevronRight, LifeBuoy } from "lucide-react";
import KSYKLogo from "@/components/KSYKLogo";
import { cn } from "@/lib/utils";
import { trackFeature } from "@/lib/analytics";
import posthog from "@/lib/posthog";

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
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Local draft keeps the input responsive while the 200ms debounce
  // prevents firing an API search on every keystroke.
  const [draftSearch, setDraftSearch] = useState(searchQuery ?? "");
  // Sync when parent clears the search (e.g. after a result is picked).
  useEffect(() => { setDraftSearch(searchQuery ?? ""); }, [searchQuery]);

  const handleSearchChange = useCallback((value: string) => {
    setDraftSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      onSearchChange?.(value);
      // v4.7.12 — fire search telemetry so the admin dashboard's
      // "Searches" tile stops showing 0. Only for non-empty queries
      // longer than 1 char so we don't count backspaced keystrokes.
      const q = value.trim();
      if (q.length >= 2) {
        void import("@/lib/analytics").then(m => {
          try { m.trackFeatureUse('search_performed', { queryLength: q.length }); }
          catch { /* non-fatal */ }
        });
      }
    }, 200);
  }, [onSearchChange]);
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
      posthog.reset();
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
      {/* v4.7.21 — safe-area-inset-top on the sticky header so the
       *  chip doesn't land under an iPhone notch or Android status bar. */}
      <div
        className="sticky top-0 z-50 px-2 sm:px-3 md:px-4 pt-2"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0.5rem))" }}
      >
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

            {/* Spacer — pins desktop controls to the right edge */}
            <div className="flex-1" />

            {/* Desktop controls */}
            <div className={homeMinimal ? "hidden" : "hidden md:flex flex-shrink-0 items-center space-x-1.5"}>
              {/* Theme toggle */}
              <button
                onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  theme === 'dark'
                    ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
                aria-label={theme === 'dark'
                  ? (currentLang === 'fi' ? 'Vaihda vaaleaan tilaan' : 'Switch to light mode')
                  : (currentLang === 'fi' ? 'Vaihda tummaan tilaan' : 'Switch to dark mode')}
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
                  <Link href="/lunch" data-testid="button-lunch">
                    <button className="h-8 px-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors flex items-center gap-1.5">
                      <UtensilsCrossed className="h-4 w-4" strokeWidth={2} />
                      <span className="hidden xl:inline">{currentLang === 'fi' ? 'Ruokalista' : 'Lunch'}</span>
                    </button>
                  </Link>
                  <Link href="/hsl" data-testid="button-hsl">
                    <button className="h-8 px-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors flex items-center gap-1.5">
                      <Bus className="h-4 w-4" strokeWidth={2} />
                      <span className="hidden xl:inline">HSL</span>
                    </button>
                  </Link>
                  {onOpenSettings && (
                    <button onClick={onOpenSettings} data-testid="button-settings" className="h-8 px-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors flex items-center gap-1.5">
                      <Settings className="h-4 w-4" strokeWidth={2} />
                      <span className="hidden xl:inline">{currentLang === "fi" ? "Asetukset" : "Settings"}</span>
                    </button>
                  )}
                </>
              )}

              {isInAdminPanel && (
                <>
                  <Link href="/lunch">
                    <button className="h-8 px-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors flex items-center gap-1.5">
                      <UtensilsCrossed className="h-4 w-4" strokeWidth={2} />
                      <span className="hidden xl:inline">{currentLang === 'fi' ? 'Ruokalista' : 'Lunch'}</span>
                    </button>
                  </Link>
                  <Link href="/hsl">
                    <button className="h-8 px-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors flex items-center gap-1.5">
                      <Bus className="h-4 w-4" strokeWidth={2} />
                      <span className="hidden xl:inline">HSL</span>
                    </button>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="h-8 px-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors flex items-center gap-1.5"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={2} />
                    <span className="hidden xl:inline">{currentLang === 'fi' ? 'Kirjaudu ulos' : 'Logout'}</span>
                  </button>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <div className={homeMinimal ? "hidden" : "md:hidden"}>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-3 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
          <div className={cn("border-t", darkMode ? "border-gray-800 bg-gray-900/60" : "border-gray-100 bg-slate-50/80")}>
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 relative">
              <Search className={cn(
                "absolute left-6 sm:left-7 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none z-10 transition-colors",
                (searchQuery && searchQuery.trim())
                  ? "text-blue-600 dark:text-blue-400"
                  : (darkMode ? "text-gray-500" : "text-gray-400"),
              )} />
              <Input
                ref={searchInputRef}
                type="search"
                value={draftSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
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
                aria-expanded={!!(draftSearch && draftSearch.trim())}
                aria-autocomplete="list"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {/* Right-side controls — clear button if searching, else a
               *  subtle keyboard hint pill so users know how to focus
               *  the field. MazeMap-style. */}
              {draftSearch ? (
                <button
                  type="button"
                  onClick={() => { setDraftSearch(""); onSearchChange?.(""); }}
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
                {/* ── Quick access — iOS Settings-style rows ──────── */}
                <section>
                  <div className={cn(
                    "rounded-2xl overflow-hidden divide-y",
                    darkMode ? "bg-gray-800/50 divide-gray-700/60" : "bg-black/[0.04] divide-black/[0.06]",
                  )}>
                    {onOpenSettings && (
                      <button
                        onClick={() => { setShowMobileMenu(false); onOpenSettings(); }}
                        className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-all active:bg-black/[0.06] dark:active:bg-white/[0.06]"
                      >
                        <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                          <Settings className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                        </div>
                        <span className="flex-1 text-[15px] font-medium text-foreground">
                          {currentLang === 'fi' ? 'Asetukset' : 'Map settings'}
                        </span>
                        <ChevronRight className="h-4 w-4 text-black/20 dark:text-white/20 shrink-0" />
                      </button>
                    )}
                    <Link href="/lunch" onClick={() => setShowMobileMenu(false)}>
                      <div className="w-full flex items-center gap-3.5 px-4 py-3.5 transition-all active:bg-black/[0.06] dark:active:bg-white/[0.06] cursor-pointer">
                        <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                          <UtensilsCrossed className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                        </div>
                        <span className="flex-1 text-[15px] font-medium text-foreground">
                          {t('quickActions.lunch')}
                        </span>
                        <ChevronRight className="h-4 w-4 text-black/20 dark:text-white/20 shrink-0" />
                      </div>
                    </Link>
                    <Link href="/hsl" onClick={() => setShowMobileMenu(false)}>
                      <div className="w-full flex items-center gap-3.5 px-4 py-3.5 transition-all active:bg-black/[0.06] dark:active:bg-white/[0.06] cursor-pointer">
                        <div className="h-9 w-9 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
                          <Bus className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                        </div>
                        <span className="flex-1 text-[15px] font-medium text-foreground">
                          {t('quickActions.transport')}
                        </span>
                        <ChevronRight className="h-4 w-4 text-black/20 dark:text-white/20 shrink-0" />
                      </div>
                    </Link>
                    <Link href="/support" onClick={() => setShowMobileMenu(false)}>
                      <div className="w-full flex items-center gap-3.5 px-4 py-3.5 transition-all active:bg-black/[0.06] dark:active:bg-white/[0.06] cursor-pointer">
                        <div className="h-9 w-9 rounded-xl bg-purple-500 flex items-center justify-center shrink-0">
                          <LifeBuoy className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                        </div>
                        <span className="flex-1 text-[15px] font-medium text-foreground">
                          {currentLang === 'fi' ? 'Tuki' : 'Support'}
                        </span>
                        <ChevronRight className="h-4 w-4 text-black/20 dark:text-white/20 shrink-0" />
                      </div>
                    </Link>
                  </div>
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
              // ─── Admin-panel variant ────────────────────────────────
              <>
                <section>
                  <div className={cn(
                    "rounded-2xl overflow-hidden divide-y",
                    darkMode ? "bg-gray-800/50 divide-gray-700/60" : "bg-black/[0.04] divide-black/[0.06]",
                  )}>
                    <Link href="/lunch" onClick={() => setShowMobileMenu(false)}>
                      <div className="w-full flex items-center gap-3.5 px-4 py-3.5 transition-all active:bg-black/[0.06] dark:active:bg-white/[0.06] cursor-pointer">
                        <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                          <UtensilsCrossed className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                        </div>
                        <span className="flex-1 text-[15px] font-medium text-foreground">{t('quickActions.lunch')}</span>
                        <ChevronRight className="h-4 w-4 text-black/20 dark:text-white/20 shrink-0" />
                      </div>
                    </Link>
                    <Link href="/hsl" onClick={() => setShowMobileMenu(false)}>
                      <div className="w-full flex items-center gap-3.5 px-4 py-3.5 transition-all active:bg-black/[0.06] dark:active:bg-white/[0.06] cursor-pointer">
                        <div className="h-9 w-9 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
                          <Bus className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                        </div>
                        <span className="flex-1 text-[15px] font-medium text-foreground">{t('quickActions.transport')}</span>
                        <ChevronRight className="h-4 w-4 text-black/20 dark:text-white/20 shrink-0" />
                      </div>
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setShowMobileMenu(false); }}
                      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-all active:bg-black/[0.06] dark:active:bg-white/[0.06]"
                    >
                      <div className="h-9 w-9 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
                        <LogOut className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                      </div>
                      <span className="flex-1 text-[15px] font-medium text-foreground">{t('logout')}</span>
                      <ChevronRight className="h-4 w-4 text-black/20 dark:text-white/20 shrink-0" />
                    </button>
                  </div>
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
