/**
 * KSYK Maps — application shell header.
 *
 * v4.7.43 full component redesign. Not a chip, not a card, not floating.
 * A proper school-app top bar with a hairline bottom border, a compact
 * search field, and a hamburger drawer that reads like a navigation
 * panel rather than a bag of pill buttons.
 *
 * DESIGN INTENT
 *  - One coherent surface across mobile + desktop
 *  - Navy `#003d82` as the sole accent, no iOS blue
 *  - Uppercase 10 px section labels in the drawer (Wilma-style meta rows)
 *  - Active route highlighted with a navy left-edge marker + navy label
 *  - No emojis, no glass, no ornamentation
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import {
  Sun, Moon, Menu, X, Settings, Search, LogOut,
  UtensilsCrossed, Bus, Monitor, Sparkles, LifeBuoy,
  HelpCircle, MapPin, Info, Download, Shield,
} from "lucide-react";
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

/** Single primary navigation route. `href` is the wouter path.  `icon`
 *  is a Lucide component.  We keep the list small and Wilma-flat — no
 *  emoji, no colored pills, no colored icon squares. */
type NavRoute = {
  href: string;
  labelEn: string;
  labelFi: string;
  icon: typeof MapPin;
};

const PRIMARY_ROUTES: NavRoute[] = [
  { href: "/",         labelEn: "Map",       labelFi: "Kartta",     icon: MapPin },
  { href: "/lunch",    labelEn: "Lunch",     labelFi: "Ruokalista", icon: UtensilsCrossed },
  { href: "/hsl",      labelEn: "Transport", labelFi: "HSL",        icon: Bus },
];

const SECONDARY_ROUTES: NavRoute[] = [
  { href: "/faq",      labelEn: "FAQ",       labelFi: "UKK",             icon: HelpCircle },
  { href: "/support",  labelEn: "Support",   labelFi: "Tuki",            icon: LifeBuoy },
  { href: "/download", labelEn: "Get app",   labelFi: "Lataa sovellus",  icon: Download },
  { href: "/privacy",  labelEn: "Privacy",   labelFi: "Tietosuoja",      icon: Shield },
];

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
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const { theme, setTheme, neonUnlocked } = useTheme();
  const { darkMode } = useDarkMode();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ksyk_language");
    if (saved && saved !== i18n.language) {
      i18n.changeLanguage(saved);
      setCurrentLang(saved);
    }
  }, [i18n]);

  useEffect(() => { setDrawerOpen(false); }, [location]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // ⌘K / Ctrl+K quick-focus search
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftSearch, setDraftSearch] = useState(searchQuery ?? "");
  useEffect(() => { setDraftSearch(searchQuery ?? ""); }, [searchQuery]);

  const handleSearchChange = useCallback((value: string) => {
    setDraftSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      onSearchChange?.(value);
      const q = value.trim();
      if (q.length >= 2) {
        void import("@/lib/analytics").then(m => {
          try { m.trackFeatureUse("search_performed", { queryLength: q.length }); }
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

  const isAdmin = isAuthenticated && (user as { role?: string })?.role === "admin";
  const isInAdminPanel = location === "/admin" || location.startsWith("/admin/");
  const fi = currentLang === "fi";

  const handleLanguageChange = (lang: string) => {
    localStorage.setItem("ksyk_language", lang);
    trackFeature("language_change", { lang });
    i18n.changeLanguage(lang).then(() => { window.location.reload(); });
  };

  const handleThemeChange = async (newTheme: "light" | "dark" | "neon" | "system") => {
    setTheme(newTheme);
    trackFeature("theme_change", { theme: newTheme });
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch { /* non-critical */ }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch { /* non-critical */ } finally {
      posthog.reset();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    }
  };

  const routeIsActive = (href: string) => {
    if (href === "/") return location === "/";
    return location === href || location.startsWith(href + "/");
  };

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────────────
       *   Institutional Wilma-style top bar: no floating chip, no glass.
       *   Hairline bottom border.  56 px on mobile, 60 px on desktop —
       *   a hair taller than the v4.7.43 pass for better breathing room
       *   at every viewport.  <header> tag matters — SearchResultsDropdown
       *   measures `document.querySelector('header')` to position itself
       *   under the input. */}
      <header
        className="sticky top-0 z-50 bg-white dark:bg-gray-950 border-b border-[#d5dae0] dark:border-[#2a3040]"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-5">
          {/* v4.7.54 — shrunk from 56/60px → 48/52px so 150% zoom users
           *  keep more map real estate. */}
          <div className="flex items-center gap-3 h-12 sm:h-[52px]">
            {/* Wordmark — logo slightly smaller than v4.7.43 for a more
             *  modern balance against the taller bar.  KSYKLogo has no
             *  "xs" size; we scale down via a wrapper so the type stays
             *  the primary weight, not the logo. */}
            <Link href="/" className="flex-shrink-0 flex items-center gap-2.5 group" data-testid="link-home">
              <span className="inline-flex items-center justify-center scale-90 origin-left">
                <KSYKLogo size={largeLogo ? "md" : "sm"} priority={largeLogo} />
              </span>
              <div className="flex flex-col leading-none">
                <span className="text-[15px] sm:text-[16px] font-bold tracking-tight text-[#003d82] dark:text-[#4a90d9]">
                  KSYK Maps
                </span>
                <span className="hidden sm:block mt-0.5 text-[9px] font-semibold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
                  Campus navigation
                </span>
              </div>
            </Link>

            {/* Desktop primary nav — inline text links, no colored pills */}
            {!homeMinimal && !isInAdminPanel && (
              <nav className="hidden md:flex items-center gap-1 ml-5">
                {PRIMARY_ROUTES.filter((r) => r.href !== "/").map((r) => {
                  const active = routeIsActive(r.href);
                  return (
                    <Link
                      key={r.href}
                      href={r.href}
                      className={cn(
                        "h-9 px-3 rounded-[6px] text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors",
                        active
                          ? "text-[#003d82] dark:text-[#4a90d9] bg-[#e6ecf3] dark:bg-[#4a90d9]/10"
                          : "text-gray-700 dark:text-gray-300 hover:text-[#003d82] dark:hover:text-[#4a90d9] hover:bg-gray-50 dark:hover:bg-gray-900",
                      )}
                    >
                      <r.icon className="h-4 w-4" strokeWidth={2} />
                      <span>{fi ? r.labelFi : r.labelEn}</span>
                    </Link>
                  );
                })}
              </nav>
            )}

            <div className="flex-1" />

            {/* Desktop right side — ORDER: Settings → EN/FI → theme
             *  Per user's v4.7.44 request: "settings and then the en/fi
             *  and then the dark or light". */}
            {!homeMinimal && (
              <div className="hidden md:flex items-center gap-1.5">
                {onOpenSettings && !isInAdminPanel && (
                  <button
                    onClick={onOpenSettings}
                    data-testid="button-settings"
                    className="h-9 px-3 rounded-[6px] text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:text-[#003d82] dark:hover:text-[#4a90d9] hover:bg-gray-50 dark:hover:bg-gray-900 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Settings className="h-4 w-4" strokeWidth={2} />
                    <span className="hidden xl:inline">{fi ? "Asetukset" : "Settings"}</span>
                  </button>
                )}
                {/* Language toggle — second per user request */}
                <div className="flex items-center border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] overflow-hidden">
                  {["fi", "en"].map((lang) => (
                    <button
                      key={lang}
                      className={cn(
                        "px-3 h-9 text-[12px] font-bold tabular-nums transition-colors",
                        currentLang === lang
                          ? "bg-[#003d82] text-white"
                          : "bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
                      )}
                      onClick={() => handleLanguageChange(lang)}
                      data-testid={`button-lang-${lang}`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
                {/* Theme toggle — third per user request */}
                <button
                  onClick={() => handleThemeChange(theme === "dark" ? "light" : "dark")}
                  className="h-9 w-9 rounded-[6px] flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-[#003d82] dark:hover:text-[#4a90d9] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  aria-label={theme === "dark"
                    ? (fi ? "Vaihda vaaleaan tilaan" : "Switch to light mode")
                    : (fi ? "Vaihda tummaan tilaan" : "Switch to dark mode")}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                {isInAdminPanel && (
                  <button
                    onClick={handleLogout}
                    className="h-9 px-3 rounded-[6px] text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={2} />
                    <span className="hidden xl:inline">{fi ? "Kirjaudu ulos" : "Log out"}</span>
                  </button>
                )}
              </div>
            )}

            {/* Mobile hamburger */}
            {!homeMinimal && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden h-10 w-10 flex items-center justify-center rounded-[6px] text-gray-700 dark:text-gray-300 hover:text-[#003d82] dark:hover:text-[#4a90d9] hover:bg-gray-50 dark:hover:bg-gray-900 active:scale-95 transition-all"
                aria-label={fi ? "Avaa valikko" : "Open menu"}
                aria-expanded={drawerOpen}
                aria-controls="mobile-drawer"
              >
                <Menu className="h-4 w-4" strokeWidth={2.25} />
              </button>
            )}
          </div>
        </div>

        {/* Search row — a hair taller (44 px input, more page breathing)
         *  per v4.7.44 feedback ("make the whole top bar and search bar
         *  and announcements a bit bigger"). */}
        {onSearchChange && (
          <div className="border-t border-[#d5dae0] dark:border-[#2a3040] bg-[#f5f6f8] dark:bg-[#12161f]">
            <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2 relative">
              <Search className={cn(
                "absolute left-6 sm:left-8 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none z-10 transition-colors",
                (searchQuery && searchQuery.trim()) ? "text-[#003d82] dark:text-[#4a90d9]" : "text-gray-400",
              )} strokeWidth={2.25} />
              <Input
                ref={searchInputRef}
                type="text"
                inputMode="search"
                enterKeyHint="search"
                value={draftSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder ?? (fi ? "Etsi tiloja tai rakennuksia…" : "Search rooms or buildings…")}
                className={cn(
                  "h-9 w-full pl-10 pr-14 text-[16px] sm:text-[13px] rounded-[6px] border font-medium transition-all",
                  "bg-white dark:bg-gray-950 border-[#d5dae0] dark:border-[#2a3040]",
                  "focus-visible:border-[#003d82] focus-visible:ring-2 focus-visible:ring-[#003d82]/25",
                )}
                aria-label={fi ? "Etsi tiloja tai rakennuksia" : "Search rooms or buildings"}
                role="combobox"
                aria-controls="search-results-listbox"
                aria-expanded={!!(draftSearch && draftSearch.trim())}
                aria-autocomplete="list"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {draftSearch ? (
                <button
                  type="button"
                  onClick={() => { setDraftSearch(""); onSearchChange?.(""); }}
                  className="absolute right-5 sm:right-7 top-1/2 -translate-y-1/2 h-7 w-7 rounded-[6px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label={fi ? "Tyhjennä haku" : "Clear search"}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              ) : (
                <kbd className="absolute right-5 sm:right-7 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[4px] border border-[#d5dae0] dark:border-[#2a3040] bg-white dark:bg-gray-950 text-gray-500 pointer-events-none select-none">
                  {typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘K" : "Ctrl K"}
                </kbd>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile drawer — full-height navigation panel ─────────────────
       *   Not a floating card.  A proper application drawer that slides in
       *   from the right, hairline separator between sections, active
       *   route flagged with a navy left edge marker.  Reads like
       *   professional Finnish school admin software. */}
      <div
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
        className="fixed inset-0 z-[60] md:hidden bg-black/50"
        style={{
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? "auto" : "none",
          transition: "opacity 220ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      />

      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={fi ? "Navigointi" : "Navigation"}
        className="fixed z-[70] md:hidden top-0 bottom-0 right-0 w-[min(88vw,320px)] bg-white dark:bg-gray-950 border-l border-[#d5dae0] dark:border-[#2a3040] flex flex-col"
        style={{
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 260ms cubic-bezier(0.32, 0.72, 0, 1)",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Drawer header */}
        <div className="shrink-0 flex items-center justify-between h-12 sm:h-14 px-4 border-b border-[#d5dae0] dark:border-[#2a3040]">
          <div className="flex items-center gap-2.5 min-w-0">
            <KSYKLogo size="sm" />
            <span className="text-[15px] font-bold tracking-tight text-[#003d82] dark:text-[#4a90d9]">
              KSYK Maps
            </span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="h-9 w-9 rounded-[6px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
            aria-label={fi ? "Sulje valikko" : "Close menu"}
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto">
          {!isInAdminPanel && (
            <>
              {/* Primary section — Map / Lunch / Transport */}
              <NavSection label={fi ? "Navigointi" : "Navigate"}>
                {PRIMARY_ROUTES.map((r) => (
                  <NavRow
                    key={r.href}
                    href={r.href}
                    icon={r.icon}
                    label={fi ? r.labelFi : r.labelEn}
                    active={routeIsActive(r.href)}
                    onNavigate={() => setDrawerOpen(false)}
                  />
                ))}
                {onOpenSettings && (
                  <NavRow
                    icon={Settings}
                    label={fi ? "Asetukset" : "Settings"}
                    onClick={() => { setDrawerOpen(false); onOpenSettings(); }}
                    active={false}
                  />
                )}
              </NavSection>

              {/* Secondary section — Help / Support / Download / Privacy */}
              <NavSection label={fi ? "Tietoja" : "Information"}>
                {SECONDARY_ROUTES.map((r) => (
                  <NavRow
                    key={r.href}
                    href={r.href}
                    icon={r.icon}
                    label={fi ? r.labelFi : r.labelEn}
                    active={routeIsActive(r.href)}
                    onNavigate={() => setDrawerOpen(false)}
                  />
                ))}
              </NavSection>

              {/* Preferences */}
              <NavSection label={fi ? "Ulkoasu" : "Appearance"}>
                <SegRow
                  options={[
                    { id: "light",  label: fi ? "Vaalea" : "Light",   icon: Sun },
                    { id: "dark",   label: fi ? "Tumma" : "Dark",     icon: Moon },
                    { id: "system", label: fi ? "Auto" : "System",    icon: Monitor },
                    ...(neonUnlocked ? [{ id: "neon", label: "Neon", icon: Sparkles }] : []),
                  ]}
                  active={theme}
                  onSelect={(id) => handleThemeChange(id as "light" | "dark" | "system" | "neon")}
                />
              </NavSection>

              <NavSection label={fi ? "Kieli" : "Language"}>
                <SegRow
                  options={[
                    { id: "fi", label: "Suomi" },
                    { id: "en", label: "English" },
                    ...(typeof localStorage !== "undefined" && localStorage.getItem("ksyk_british_unlocked") === "true"
                      ? [{ id: "en-GB", label: "British" }] : []),
                  ]}
                  active={currentLang}
                  onSelect={handleLanguageChange}
                />
              </NavSection>

              {isAdmin && (
                <NavSection label={fi ? "Ylläpito" : "Admin"}>
                  <NavRow
                    href="/admin"
                    icon={Shield}
                    label={fi ? "Hallintapaneeli" : "Admin panel"}
                    active={false}
                    onNavigate={() => setDrawerOpen(false)}
                  />
                </NavSection>
              )}
            </>
          )}

          {isInAdminPanel && (
            <>
              <NavSection label={fi ? "Sivut" : "Pages"}>
                {PRIMARY_ROUTES.filter((r) => r.href !== "/").map((r) => (
                  <NavRow
                    key={r.href}
                    href={r.href}
                    icon={r.icon}
                    label={fi ? r.labelFi : r.labelEn}
                    active={routeIsActive(r.href)}
                    onNavigate={() => setDrawerOpen(false)}
                  />
                ))}
                <NavRow
                  href="/"
                  icon={MapPin}
                  label={fi ? "Julkinen kartta" : "Public map"}
                  active={false}
                  onNavigate={() => setDrawerOpen(false)}
                />
              </NavSection>

              <NavSection label={fi ? "Ulkoasu" : "Appearance"}>
                <SegRow
                  options={[
                    { id: "light",  label: fi ? "Vaalea" : "Light", icon: Sun },
                    { id: "dark",   label: fi ? "Tumma" : "Dark",   icon: Moon },
                  ]}
                  active={theme}
                  onSelect={(id) => handleThemeChange(id as "light" | "dark")}
                />
              </NavSection>

              <NavSection label={fi ? "Tili" : "Account"}>
                <NavRow
                  icon={LogOut}
                  label={fi ? "Kirjaudu ulos" : "Log out"}
                  onClick={() => { setDrawerOpen(false); handleLogout(); }}
                  active={false}
                  danger
                />
              </NavSection>
            </>
          )}
        </div>

      </div>
    </>
  );
}

/** ── Drawer building blocks ─────────────────────────────────────── */

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[#d5dae0] dark:border-[#2a3040] last:border-b-0">
      <p className="px-4 pt-4 pb-2 text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <div className="pb-2">{children}</div>
    </section>
  );
}

function NavRow({
  href,
  icon: Icon,
  label,
  active,
  danger,
  onClick,
  onNavigate,
}: {
  href?: string;
  icon: typeof MapPin;
  label: string;
  active: boolean;
  danger?: boolean;
  onClick?: () => void;
  onNavigate?: () => void;
}) {
  const body = (
    <div
      className={cn(
        "relative flex items-center gap-3 h-10 px-4 text-[14px] font-semibold transition-colors",
        active
          ? "text-[#003d82] dark:text-[#4a90d9] bg-[#e6ecf3] dark:bg-[#4a90d9]/10"
          : danger
            ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            : "text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-[2px] bg-[#003d82] dark:bg-[#4a90d9]" aria-hidden="true" />
      )}
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span className="flex-1 truncate">{label}</span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onNavigate}>
        <a className="block">{body}</a>
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      {body}
    </button>
  );
}

function SegRow({
  options,
  active,
  onSelect,
}: {
  options: Array<{ id: string; label: string; icon?: typeof MapPin }>;
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mx-4 mb-2 flex items-center border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] overflow-hidden">
      {options.map((o) => {
        const OIcon = o.icon;
        const isActive = active === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onSelect(o.id)}
            aria-pressed={isActive}
            className={cn(
              "flex-1 h-9 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors",
              isActive
                ? "bg-[#003d82] text-white"
                : "bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900",
            )}
          >
            {OIcon && <OIcon className="h-3.5 w-3.5" strokeWidth={2.25} />}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
