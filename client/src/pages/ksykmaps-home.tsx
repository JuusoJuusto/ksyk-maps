/**
 * KSYK Maps — Main home (campus map, 2D only)
 *
 * KSYKMapView is always mounted so Leaflet's tile cache survives the
 * settings overlay being opened and closed. The settings panel overlays
 * the map via absolute positioning — no extra Header/Banner instances.
 */

import { useState } from "react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import Header from "@/components/Header";
import KSYKMapView from "@/components/KSYKMapView";
import CampusSettingsPanel from "@/components/CampusSettingsPanel";
import { cn } from "@/lib/utils";

export default function KSYKMapsHome() {
  const { darkMode } = useDarkMode();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div
      className={cn(
        "ksykmaps-app h-[100dvh] flex flex-col overflow-hidden",
        darkMode
          ? "bg-gradient-to-b from-gray-950 via-gray-900 to-slate-900"
          : "bg-gradient-to-b from-slate-50 via-white to-blue-50/40"
      )}
    >
      <AnnouncementBanner />
      <Header
        searchQuery={settingsOpen ? undefined : searchQuery}
        onSearchChange={settingsOpen ? undefined : setSearchQuery}
        onOpenSettings={settingsOpen ? undefined : () => setSettingsOpen(true)}
      />

      {/* Map container — always mounted so Leaflet stays alive */}
      <div className="flex-1 overflow-hidden relative min-h-0 pb-[env(safe-area-inset-bottom)]">
        <KSYKMapView searchQuery={searchQuery} />

        {/* Settings panel — absolutely positioned over the map, not a separate route */}
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
    </div>
  );
}
