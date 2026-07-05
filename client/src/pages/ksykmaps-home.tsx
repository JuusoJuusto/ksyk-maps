/**
 * KSYK Maps — Main home (campus map).
 *
 * The mobile bottom navigation has been removed — actions live in the
 * top header / map hamburger menu so the map gets the full viewport.
 * KSYKMapView is always mounted so Leaflet's tile cache survives the
 * settings overlay opening and closing.
 */

import { useState } from "react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import Header from "@/components/Header";
import KSYKMapView from "@/components/KSYKMapView";
import CampusSettingsPanel from "@/components/CampusSettingsPanel";
import StudentLoginGate from "@/components/StudentLoginGate";
import { cn } from "@/lib/utils";

export default function KSYKMapsHome() {
  const { darkMode } = useDarkMode();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div
      className={cn(
        "ksykmaps-app flex flex-col overflow-hidden",
        darkMode
          ? "bg-gradient-to-b from-gray-950 via-gray-900 to-slate-900"
          : "bg-gradient-to-b from-slate-50 via-white to-blue-50/40",
      )}
      style={{
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <StudentLoginGate />
      <AnnouncementBanner />
      <Header
        searchQuery={settingsOpen ? undefined : searchQuery}
        onSearchChange={settingsOpen ? undefined : setSearchQuery}
        onOpenSettings={settingsOpen ? undefined : () => setSettingsOpen(true)}
      />

      {/* Map container — full-bleed. No bottom-nav padding needed; the map
          gets the entire remaining viewport, which is what users actually
          want when navigating campus on a phone. */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        <KSYKMapView searchQuery={searchQuery} />

        {settingsOpen && (
          <div
            className={cn(
              // z-50 puts it above the map-edge button stack (z-40) so the
              // 4 map controls don't leak through into the Settings screen.
              "absolute inset-0 z-50 overflow-y-auto overscroll-contain",
              darkMode
                ? "bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950"
                : "bg-gradient-to-b from-slate-50 via-white to-blue-50/30",
            )}
          >
            <CampusSettingsPanel onBack={() => setSettingsOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
