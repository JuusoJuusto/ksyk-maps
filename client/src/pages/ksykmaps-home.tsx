/**
 * KSYK Maps — Main home (campus map)
 *
 * KSYKMapView is always mounted so Leaflet's tile cache survives the
 * settings overlay being opened and closed. A mobile bottom navigation
 * bar provides quick access to Search, Lunch, HSL and Settings without
 * requiring the hamburger menu.
 */

import { useState, useRef } from "react";
import { Link } from "wouter";
import { useDarkMode } from "@/contexts/DarkModeContext";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import Header from "@/components/Header";
import KSYKMapView from "@/components/KSYKMapView";
import CampusSettingsPanel from "@/components/CampusSettingsPanel";
import { cn } from "@/lib/utils";
import { Map, Search, UtensilsCrossed, Bus, Settings } from "lucide-react";

export default function KSYKMapsHome() {
  const { darkMode } = useDarkMode();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const focusSearch = () => {
    // Close settings if open, then focus the search bar
    if (settingsOpen) setSettingsOpen(false);
    // Small delay so the settings panel unmounts first
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="search"]');
      input?.focus();
      input?.select();
    }, 50);
  };

  return (
    <div
      className={cn(
        "ksykmaps-app flex flex-col overflow-hidden",
        darkMode
          ? "bg-gradient-to-b from-gray-950 via-gray-900 to-slate-900"
          : "bg-gradient-to-b from-slate-50 via-white to-blue-50/40"
      )}
      style={{
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top, 0px)",
        // On mobile, reserve space for the bottom nav
        paddingBottom: "0px",
      }}
    >
      <AnnouncementBanner />
      <Header
        searchQuery={settingsOpen ? undefined : searchQuery}
        onSearchChange={settingsOpen ? undefined : setSearchQuery}
        onOpenSettings={settingsOpen ? undefined : () => setSettingsOpen(true)}
      />

      {/* Map container — full-bleed. On mobile we don't pad for the bottom
          nav here; instead the nav floats above the map so map fills 100%. */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        <KSYKMapView searchQuery={searchQuery} />

        {/* Settings panel — absolutely positioned over the map */}
        {settingsOpen && (
          <div
            className={cn(
              "absolute inset-0 z-30 overflow-y-auto overscroll-contain",
              darkMode
                ? "bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950"
                : "bg-gradient-to-b from-slate-50 via-white to-blue-50/30"
            )}
          >
            <CampusSettingsPanel onBack={() => setSettingsOpen(false)} />
          </div>
        )}
      </div>

      {/* ── Mobile bottom navigation bar ──────────────────────────────────
          Floating above the map on mobile (lg:hidden). Uses safe-area-inset-bottom
          so it sits above the iOS home indicator. */}
      <nav
        className={cn(
          "lg:hidden fixed bottom-0 left-0 right-0 z-[45]",
          "border-t backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.12)]",
          darkMode
            ? "bg-gray-900/95 border-gray-800"
            : "bg-white/95 border-gray-200/80"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Bottom navigation"
      >
        <div className="flex items-stretch justify-around px-1 py-1">
          {/* Map — active indicator */}
          <button
            type="button"
            aria-label="Map"
            aria-current={!settingsOpen ? "page" : undefined}
            onClick={() => { setSettingsOpen(false); setSearchQuery(""); }}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-colors",
              !settingsOpen
                ? darkMode
                  ? "text-blue-400"
                  : "text-blue-600"
                : darkMode
                ? "text-gray-500"
                : "text-gray-400"
            )}
          >
            <Map className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Map</span>
          </button>

          {/* Search */}
          <button
            type="button"
            aria-label="Search"
            onClick={focusSearch}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-colors",
              darkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-700"
            )}
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Search</span>
          </button>

          {/* Lunch */}
          <Link href="/lunch" className={cn(
            "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-colors",
            darkMode ? "text-gray-500 hover:text-orange-400" : "text-gray-400 hover:text-orange-500"
          )}>
            <UtensilsCrossed className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Lunch</span>
          </Link>

          {/* HSL Transit */}
          <Link href="/hsl" className={cn(
            "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-colors",
            darkMode ? "text-gray-500 hover:text-green-400" : "text-gray-400 hover:text-green-600"
          )}>
            <Bus className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">HSL</span>
          </Link>

          {/* Settings */}
          <button
            type="button"
            aria-label="Settings"
            aria-current={settingsOpen ? "page" : undefined}
            onClick={() => setSettingsOpen((v) => !v)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-colors",
              settingsOpen
                ? darkMode
                  ? "text-blue-400"
                  : "text-blue-600"
                : darkMode
                ? "text-gray-500 hover:text-gray-300"
                : "text-gray-400 hover:text-gray-700"
            )}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
