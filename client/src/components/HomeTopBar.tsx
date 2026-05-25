/**
 * Unified home top bar: logo, search, Lunch, HSL, Settings
 */
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Settings, X } from "lucide-react";
import KSYKLogo from "@/components/KSYKLogo";
import { cn } from "@/lib/utils";

type HomeTopBarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenSettings: () => void;
  showMapTools?: boolean;
};

export default function HomeTopBar({
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
            "border-t px-3 py-2 sm:px-4",
            darkMode ? "border-gray-800 bg-gray-900/60" : "border-gray-100 bg-slate-50/80"
          )}
        >
          <div className="max-w-7xl mx-auto relative">
            <Search
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none z-10",
                darkMode ? "text-gray-500" : "text-gray-400"
              )}
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={isFi ? "Etsi tiloja tai rakennuksia…" : "Search rooms or buildings…"}
              className={cn(
                "h-10 w-full pl-10 pr-10 text-sm rounded-xl border shadow-sm",
                darkMode
                  ? "bg-gray-800/90 border-gray-700 text-white placeholder:text-gray-500"
                  : "bg-white border-gray-200"
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
