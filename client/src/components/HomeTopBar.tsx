/**
 * Unified home top bar: HD logo, 2D/3D, search, HSL, Settings
 */
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Box, Map as MapIcon, Search, Settings, X } from "lucide-react";
import KSYKLogo from "@/components/KSYKLogo";
import { cn } from "@/lib/utils";

type HomeTopBarProps = {
  mapMode: "2d" | "3d";
  onMapModeChange: (mode: "2d" | "3d") => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenSettings: () => void;
  showMapTools?: boolean;
};

export default function HomeTopBar({
  mapMode,
  onMapModeChange,
  searchQuery,
  onSearchChange,
  onOpenSettings,
  showMapTools = true,
}: HomeTopBarProps) {
  const { i18n } = useTranslation();
  const { darkMode } = useDarkMode();
  const isFi = i18n.language === "fi";

  return (
    <header
      className={cn(
        "shrink-0 z-50 border-b safe-top",
        darkMode ? "bg-gray-900/98 border-gray-800" : "bg-white/98 border-gray-200",
        "backdrop-blur-lg shadow-sm"
      )}
    >
      {/* Brand row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center justify-between gap-2 h-[5.25rem] sm:h-[7.5rem]">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-4 min-w-0 group">
          <div className="relative shrink-0 transition-transform duration-200 group-hover:scale-[1.05]">
            <div
              className="absolute inset-0 rounded-full bg-blue-500/20 blur-2xl scale-125 opacity-80 group-hover:opacity-100 transition-opacity"
              aria-hidden
            />
            <KSYKLogo size="hero" priority className="relative" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent truncate leading-tight">
              KSYK Maps
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">Nordbyte Studio</p>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link href="/lunch">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200",
                "hover:scale-[1.03] active:scale-[0.98]",
                "bg-orange-50 border-orange-500 text-orange-800 hover:bg-orange-100",
                "dark:bg-orange-950/40 dark:border-orange-600 dark:text-orange-200 dark:hover:bg-orange-900/50"
              )}
              data-testid="button-lunch"
            >
              <span className="sm:hidden">🍽️</span>
              <span className="hidden sm:inline">🍽️ {isFi ? "Ruoka" : "Lunch"}</span>
            </Button>
          </Link>
          <Link href="/hsl">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200",
                "hover:scale-[1.03] active:scale-[0.98]",
                "bg-emerald-50 border-emerald-600 text-emerald-800 hover:bg-emerald-100",
                "dark:bg-emerald-950/50 dark:border-emerald-600 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
              )}
              data-testid="button-hsl"
            >
              HSL
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenSettings}
            className={cn(
              "h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl gap-1.5 font-semibold transition-all duration-200",
              "hover:scale-[1.03] hover:shadow-md active:scale-[0.98]",
              darkMode
                ? "border-gray-600 bg-gray-800 text-gray-100 hover:bg-gray-700"
                : "border-gray-200 bg-white hover:bg-gray-50"
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden md:inline">{isFi ? "Asetukset" : "Settings"}</span>
          </Button>
        </div>
      </div>

      {/* Map tools row */}
      {showMapTools && (
        <div
          className={cn(
            "border-t px-3 py-2 sm:px-4 sm:py-2.5",
            darkMode ? "border-gray-800 bg-gray-900/60" : "border-gray-100 bg-slate-50/80"
          )}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div
              className={cn(
                "flex p-0.5 rounded-xl shrink-0 self-start sm:self-center shadow-md backdrop-blur-md",
                darkMode ? "bg-gray-800/90" : "bg-white/90"
              )}
            >
              {(["2d", "3d"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onMapModeChange(mode)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold min-w-[3.25rem] transition-all duration-200",
                    mapMode === mode
                      ? "bg-blue-600 text-white shadow-md"
                      : darkMode
                      ? "text-gray-300 hover:bg-gray-700"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {mode === "2d" ? <MapIcon className="h-4 w-4" /> : <Box className="h-4 w-4" />}
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-0 w-full">
              <Search
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none",
                  darkMode ? "text-gray-500" : "text-gray-400"
                )}
              />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={isFi ? "Etsi siipiä (A, U, K…)" : "Search wings (A, U, K…)"}
                className={cn(
                  "h-10 w-full pl-10 pr-10 text-sm rounded-xl border transition-all duration-200",
                  "focus-visible:ring-2 focus-visible:ring-blue-500/40",
                  darkMode
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-200 shadow-sm"
                )}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
