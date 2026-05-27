/**
 * KSYK Maps — Main home (campus map, 2D only)
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
  const [view, setView] = useState<"map" | "settings">("map");
  const [searchQuery, setSearchQuery] = useState("");

  if (view === "settings") {
    return (
      <div className={cn("h-[100dvh] flex flex-col overflow-hidden", darkMode ? "bg-gray-900" : "bg-gray-50")}>
        <AnnouncementBanner />
        <Header onOpenSettings={() => setView("map")} />
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          <CampusSettingsPanel onBack={() => setView("map")} />
        </div>
      </div>
    );
  }

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
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSettings={() => setView("settings")}
      />

      <div className="flex-1 overflow-hidden relative min-h-0 pb-[env(safe-area-inset-bottom)]">
        <KSYKMapView searchQuery={searchQuery} />
      </div>
    </div>
  );
}
