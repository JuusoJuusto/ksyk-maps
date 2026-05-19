/**
 * MODERN AALTO SPACE HOME PAGE
 * Clean, minimal campus navigation inspired by Aalto Space
 * NO BOTTOM NAV - Just the map
 */

import { useState } from "react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import Header from "@/components/Header";
import AaltoMapView from "@/components/AaltoMapView";
import Working3DBuilder from "@/components/Working3DBuilder";
import { Button } from "@/components/ui/button";
import { 
  Box,
  Map as MapIcon,
} from "lucide-react";

export default function AaltoHome() {
  const { darkMode } = useDarkMode();
  const [mapMode, setMapMode] = useState<"2d" | "3d">("2d");

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header />
      
      {/* Main Content Area - Just the Map */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full relative">
          {/* Map Mode Toggle - Floating Button */}
          <div className="absolute top-4 right-4 z-30 flex gap-2">
            <Button
              onClick={() => setMapMode("2d")}
              variant={mapMode === "2d" ? "default" : "outline"}
              size="sm"
              className={`shadow-lg ${mapMode === "2d" ? 'bg-blue-600 text-white' : ''}`}
            >
              <MapIcon className="h-4 w-4 mr-2" />
              2D Map
            </Button>
            <Button
              onClick={() => setMapMode("3d")}
              variant={mapMode === "3d" ? "default" : "outline"}
              size="sm"
              className={`shadow-lg ${mapMode === "3d" ? 'bg-blue-600 text-white' : ''}`}
            >
              <Box className="h-4 w-4 mr-2" />
              3D View
            </Button>
          </div>

          {/* Render 2D or 3D Map */}
          {mapMode === "2d" ? (
            <AaltoMapView />
          ) : (
            <Working3DBuilder />
          )}
        </div>
      </div>
    </div>
  );
}
