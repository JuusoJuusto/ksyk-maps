/**
 * KSYK Maps — Main home (campus map)
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDarkMode } from "@/contexts/DarkModeContext";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import HomeTopBar from "@/components/HomeTopBar";
import KSYKMapView from "@/components/KSYKMapView";
import Working3DBuilder from "@/components/Working3DBuilder";
import LoadingSpinner from "@/components/LoadingSpinner";
import CampusSettingsPanel from "@/components/CampusSettingsPanel";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export default function KSYKMapsHome() {
  const { darkMode } = useDarkMode();
  const { t } = useTranslation();
  const [mapMode, setMapMode] = useState<"2d" | "3d">("2d");
  const [view, setView] = useState<"map" | "settings">("map");
  const [searchQuery, setSearchQuery] = useState("");

  const { isLoading: buildingsLoading } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const r = await fetch("/api/buildings");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 60000,
  });

  const { isLoading: announcementsLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const r = await fetch("/api/announcements?limit=5");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 30000,
  });

  const isPageLoading = buildingsLoading || announcementsLoading;

  if (isPageLoading) {
    return (
      <LoadingSpinner
        fullScreen
        variant="white"
        message={t("loading") === "loading" ? "Loading KSYK Maps..." : t("loading")}
      />
    );
  }

  if (view === "settings") {
    return (
      <div className={cn("h-[100dvh] flex flex-col overflow-hidden", darkMode ? "bg-gray-900" : "bg-gray-50")}>
        <AnnouncementBanner />
        <HomeTopBar
          mapMode={mapMode}
          onMapModeChange={setMapMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenSettings={() => setView("map")}
          showMapTools={false}
        />
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          <CampusSettingsPanel onBack={() => setView("map")} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("ksykmaps-app h-[100dvh] flex flex-col overflow-hidden", darkMode ? "bg-gray-900" : "bg-gray-50")}>
      <AnnouncementBanner />
      <HomeTopBar
        mapMode={mapMode}
        onMapModeChange={setMapMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSettings={() => setView("settings")}
        showMapTools
      />

      <div className="flex-1 overflow-hidden relative min-h-0 pb-[env(safe-area-inset-bottom)]">
        {mapMode === "2d" ? (
          <KSYKMapView searchQuery={searchQuery} />
        ) : (
          <Working3DBuilder embedded />
        )}
      </div>
    </div>
  );
}
