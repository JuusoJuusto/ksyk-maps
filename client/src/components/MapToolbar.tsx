import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Box, Map as MapIcon, Search, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";

type MapToolbarProps = {
  mapMode: "2d" | "3d";
  onMapModeChange: (mode: "2d" | "3d") => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenSettings: () => void;
};

export default function MapToolbar({
  mapMode,
  onMapModeChange,
  searchQuery,
  onSearchChange,
  onOpenSettings,
}: MapToolbarProps) {
  const { i18n } = useTranslation();
  const { darkMode } = useDarkMode();
  const isFi = i18n.language === "fi";

  return (
    <div
      className={cn(
        "shrink-0 z-40 border-b px-3 py-2.5 sm:px-4 sm:py-3",
        darkMode ? "bg-gray-900/95 border-gray-800 backdrop-blur-md" : "bg-white/95 border-gray-200 backdrop-blur-md"
      )}
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3 max-w-7xl mx-auto w-full">
        {/* 2D / 3D segmented control */}
        <div
          className={cn(
            "flex p-0.5 rounded-xl border shrink-0",
            darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-200"
          )}
          role="tablist"
          aria-label={isFi ? "Karttatila" : "Map mode"}
        >
          {(["2d", "3d"] as const).map((mode) => {
            const active = mapMode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onMapModeChange(mode)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 sm:px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200",
                  active
                    ? "bg-blue-600 text-white shadow-md scale-[1.02]"
                    : darkMode
                    ? "text-gray-300 hover:text-white hover:bg-gray-700/80"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white"
                )}
              >
                {mode === "2d" ? <MapIcon className="h-4 w-4" /> : <Box className="h-4 w-4" />}
                <span className="hidden xs:inline sm:inline">{mode.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {/* Centered search */}
        <div className="relative min-w-0 w-full max-w-xl mx-auto">
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
              "h-10 sm:h-11 pl-10 pr-10 text-sm sm:text-base rounded-xl border transition-all duration-200",
              "focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:border-blue-500",
              "hover:shadow-md",
              darkMode
                ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                : "bg-white border-gray-200 text-gray-900 shadow-sm"
            )}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors",
                darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"
              )}
              aria-label={isFi ? "Tyhjennä" : "Clear"}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Settings — top right */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenSettings}
          className={cn(
            "shrink-0 h-10 sm:h-11 px-3 rounded-xl gap-2 font-semibold transition-all duration-200",
            "hover:scale-[1.03] hover:shadow-md active:scale-[0.98]",
            darkMode
              ? "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700 hover:border-gray-600"
              : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
          )}
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">{isFi ? "Asetukset" : "Settings"}</span>
        </Button>
      </div>
    </div>
  );
}
