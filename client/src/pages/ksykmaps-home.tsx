/**
 * KSYK Maps — Main home (campus map)
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDarkMode } from "@/contexts/DarkModeContext";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import Header from "@/components/Header";
import KSYKMapView from "@/components/KSYKMapView";
import Working3DBuilder from "@/components/Working3DBuilder";
import LoadingSpinner from "@/components/LoadingSpinner";
import CampusSettingsPanel from "@/components/CampusSettingsPanel";
import { Button } from "@/components/ui/button";
import { Box, Map as MapIcon, MapPin, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function KSYKMapsHome() {
  const { darkMode } = useDarkMode();
  const { t } = useTranslation();
  const [mapMode, setMapMode] = useState<"2d" | "3d">("2d");
  const [pageTab, setPageTab] = useState<"map" | "settings">("map");

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

  return (
    <div className={`ksykmaps-app h-screen flex flex-col overflow-hidden ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <AnnouncementBanner />
      <Header largeLogo />

      <div className="flex-1 overflow-hidden relative">
        {/* Map / Settings tabs — like /classic */}
        <div
          className={`absolute top-3 left-3 z-30 flex gap-1 p-1 rounded-xl shadow-lg border ${
            darkMode ? "bg-gray-900/95 border-gray-700" : "bg-white/95 border-gray-200"
          }`}
        >
          <button
            type="button"
            onClick={() => setPageTab("map")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              pageTab === "map" ? "bg-blue-600 text-white" : darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Map</span>
          </button>
          <button
            type="button"
            onClick={() => setPageTab("settings")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              pageTab === "settings" ? "bg-blue-600 text-white" : darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>

        {pageTab === "map" && (
          <>
            <div className="absolute top-3 right-3 z-20 flex gap-2">
              <Button
                onClick={() => setMapMode("2d")}
                variant={mapMode === "2d" ? "default" : "outline"}
                size="sm"
                className={`shadow-lg ${mapMode === "2d" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                <MapIcon className="h-4 w-4 mr-1" />
                2D
              </Button>
              <Button
                onClick={() => setMapMode("3d")}
                variant={mapMode === "3d" ? "default" : "outline"}
                size="sm"
                className={`shadow-lg ${mapMode === "3d" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                <Box className="h-4 w-4 mr-1" />
                3D
              </Button>
            </div>
            {mapMode === "2d" ? <KSYKMapView /> : <Working3DBuilder />}
          </>
        )}

        {pageTab === "settings" && (
          <div className={`h-full overflow-auto ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
            <div className="h-14" />
            <CampusSettingsPanel />
          </div>
        )}
      </div>

    </div>
  );
}
