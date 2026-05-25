/**
 * Unified home top bar: logo, 2D/3D, search, HSL, Settings
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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center justify-between gap-2 h-14 sm:h-16">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <KSYKLogo size="md" priority className="shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-blue-600 truncate leading-tight">KSYK Maps</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate hidden sm:block">
              Nordbyte Studio
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link href="/lunch">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg font-bold text-xs sm:text-sm",
                "bg-orange-50 border-orange-500 text-orange-800 hover:bg-orange-100",
                "dark:bg-orange-950/40 dark:border-orange-600 dark:text-orange-200"
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
                "h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg font-bold text-xs sm:text-sm",
                "bg-emerald-50 border-emerald-600 text-emerald-800 hover:bg-emerald-100",
                "dark:bg-emerald-950/50 dark:border-emerald-600 dark:text-emerald-300"
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
              "h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg gap-1 font-semibold text-xs sm:text-sm",
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

      {showMapTools && (
        <div
          className={cn(
            "border-t px-3 py-1.5 sm:px-4 sm:py-2",
            darkMode ? "border-gray-800 bg-gray-900/60" : "border-gray-100 bg-slate-50/80"
          )}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div
              className={cn(
                "flex p-0.5 rounded-lg shrink-0 self-start sm:self-center",
                darkMode ? "bg-gray-800/90" : "bg-white/90 shadow-sm"
              )}
            >
              {(["2d", "3d"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onMapModeChange(mode)}
                  className={cn(
                    "flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold min-w-[3rem] transition-colors",
                    mapMode === mode
                      ? "bg-blue-600 text-white"
                      : darkMode
                      ? "text-gray-300 hover:bg-gray-700"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {mode === "2d" ? <MapIcon className="h-3.5 w-3.5" /> : <Box className="h-3.5 w-3.5" />}
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
                  "h-9 w-full pl-9 pr-9 text-sm rounded-lg border",
                  darkMode
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-200"
                )}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
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
