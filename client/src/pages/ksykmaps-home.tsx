/**
 * KSYK Maps — Main home (campus map)
 */

import { useState } from "react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import Header from "@/components/Header";
import KSYKMapView from "@/components/KSYKMapView";
import Working3DBuilder from "@/components/Working3DBuilder";
import { Button } from "@/components/ui/button";
import { Box, Map as MapIcon } from "lucide-react";

export default function KSYKMapsHome() {
  const { darkMode } = useDarkMode();
  const [mapMode, setMapMode] = useState<"2d" | "3d">("2d");

  return (
    <div className={`ksykmaps-app h-screen flex flex-col ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <AnnouncementBanner />
      <Header />

      <div className="flex-1 overflow-hidden relative">
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <Button
            onClick={() => setMapMode("2d")}
            variant={mapMode === "2d" ? "default" : "outline"}
            size="sm"
            className={`shadow-lg ${mapMode === "2d" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
          >
            <MapIcon className="h-4 w-4 mr-2" />
            2D Map
          </Button>
          <Button
            onClick={() => setMapMode("3d")}
            variant={mapMode === "3d" ? "default" : "outline"}
            size="sm"
            className={`shadow-lg ${mapMode === "3d" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
          >
            <Box className="h-4 w-4 mr-2" />
            3D View
          </Button>
        </div>

        {mapMode === "2d" ? <KSYKMapView /> : <Working3DBuilder />}
      </div>
    </div>
  );
}
