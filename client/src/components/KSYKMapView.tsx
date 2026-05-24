/**
 * KSYK Maps — Clean campus outline map (no rooms/services)
 */

import { useState, useEffect, useMemo, useRef } from "react";
import {
  parseBuildingShape,
  getShapeBounds,
  computeCampusViewBox,
  parseViewBox,
  formatViewBox,
  type BuildingMapData,
} from "@/lib/mapGeometry";
import {
  KSYK_BUILDING_LETTERS,
  KSYK_BUILDING_OUTLINES,
  getBuildingLetter,
  outlineToPath,
  outlinesAsMapBuildings,
} from "@/lib/ksykCampusOutlines";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Building extends BuildingMapData {
  openingHours?: unknown;
  facilities?: string[];
}

interface KSYKMapViewProps {
  searchQuery?: string;
  highlightLetter?: string | null;
}

export default function KSYKMapView({ searchQuery = "", highlightLetter = null }: KSYKMapViewProps) {
  const { i18n } = useTranslation();
  const { darkMode } = useDarkMode();
  const { settings } = useAppSettings();

  const [viewState, setViewState] = useState({ x: 0, y: 0, w: 1600, h: 900 });
  const [isPanning, setIsPanning] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const panStart = useRef({ clientX: 0, clientY: 0, view: { x: 0, y: 0, w: 1600, h: 900 } });
  const mapRef = useRef<HTMLDivElement>(null);

  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/buildings");
      if (!response.ok) throw new Error("Failed to fetch buildings");
      return response.json();
    },
    staleTime: 60000,
  });

  const campusBuildings = useMemo(() => {
    const apiByLetter = new Map<string, Building>();
    for (const b of buildings as Building[]) {
      const letter = getBuildingLetter(b.name);
      if (letter) apiByLetter.set(letter, b);
    }
    return KSYK_BUILDING_LETTERS.map((letter) => {
      const preset = KSYK_BUILDING_OUTLINES[letter];
      const api = apiByLetter.get(letter);
      return {
        ...api,
        id: api?.id ?? `wing-${letter}`,
        name: letter,
        nameEn: preset.nameEn,
        nameFi: preset.nameFi,
        floors: api?.floors ?? preset.floors,
        colorCode: preset.stroke,
        description: JSON.stringify({ customShape: preset.shape }),
      } as Building;
    });
  }, [buildings]);

  const filteredBuildings = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    if (!q) return campusBuildings;
    return campusBuildings.filter(
      (b) =>
        b.name.includes(q) ||
        b.nameEn?.toUpperCase().includes(q) ||
        b.nameFi?.toUpperCase().includes(q)
    );
  }, [campusBuildings, searchQuery]);

  const activeHighlight = highlightLetter ?? selectedLetter;

  const baseViewBox = useMemo(
    () => parseViewBox(computeCampusViewBox(outlinesAsMapBuildings() as BuildingMapData[])),
    []
  );

  useEffect(() => {
    setViewState(parseViewBox(computeCampusViewBox(outlinesAsMapBuildings() as BuildingMapData[])));
  }, []);

  const zoomFactor = settings.mapZoomSpeed === 2 ? 0.88 : settings.mapZoomSpeed === 0.5 ? 0.96 : 0.92;

  const zoomView = (factor: number) => {
    setViewState((v) => {
      const cx = v.x + v.w / 2;
      const cy = v.y + v.h / 2;
      const nw = Math.min(Math.max(v.w * factor, 300), 5000);
      const nh = Math.min(Math.max(v.h * factor, 200), 3500);
      return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
    });
  };

  const handleZoomIn = () => zoomView(zoomFactor);
  const handleZoomOut = () => zoomView(2 - zoomFactor);
  const handleResetView = () => setViewState(baseViewBox);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 2 - zoomFactor : zoomFactor;
      zoomView(factor);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomFactor]);

  const handlePanStart = (clientX: number, clientY: number) => {
    setIsPanning(true);
    panStart.current = { clientX, clientY, view: { ...viewState } };
  };

  useEffect(() => {
    if (!isPanning) return;
    const onMove = (e: MouseEvent) => {
      const rect = mapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scaleX = panStart.current.view.w / rect.width;
      const scaleY = panStart.current.view.h / rect.height;
      const dx = (e.clientX - panStart.current.clientX) * scaleX;
      const dy = (e.clientY - panStart.current.clientY) * scaleY;
      const smooth = settings.smoothPan ? 1 : 1;
      setViewState({
        ...panStart.current.view,
        x: panStart.current.view.x - dx * smooth,
        y: panStart.current.view.y - dy * smooth,
      });
    };
    const onUp = () => setIsPanning(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPanning, settings.smoothPan]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={mapRef}
        className={cn(
          "h-full w-full overflow-hidden select-none transition-colors duration-300",
          darkMode ? "bg-[#0f1419]" : "bg-[#f1f5f9]",
          settings.highContrast && (darkMode ? "bg-black" : "bg-white")
        )}
        style={{ cursor: isPanning ? "grabbing" : "grab", touchAction: "none" }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest("[data-map-feature]")) return;
          handlePanStart(e.clientX, e.clientY);
        }}
      >
        <svg className="h-full w-full" viewBox={formatViewBox(viewState)} preserveAspectRatio="xMidYMid meet">
          {settings.showGrid && (
            <defs>
              <pattern id="campusGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke={darkMode ? "#334155" : "#e2e8f0"}
                  strokeWidth="0.6"
                />
              </pattern>
            </defs>
          )}
          {settings.showGrid && (
            <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#campusGrid)" />
          )}

          {filteredBuildings.map((building: Building) => {
            const letter = building.name;
            const preset = KSYK_BUILDING_OUTLINES[letter];
            const shape = preset?.shape ?? parseBuildingShape(building);
            const bounds = getShapeBounds(shape);
            const isSelected = activeHighlight === letter;
            const stroke = preset?.stroke ?? building.colorCode ?? "#2563eb";
            const dimmed = searchQuery && !isSelected && activeHighlight !== letter;

            return (
              <g key={building.id} data-map-feature="building" opacity={dimmed ? 0.35 : 1}>
                <path
                  d={outlineToPath(shape)}
                  fill="none"
                  stroke={isSelected ? "#fbbf24" : stroke}
                  strokeWidth={isSelected ? 5 : settings.highContrast ? 4 : 3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className="cursor-pointer transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLetter(letter);
                  }}
                />
                {settings.showWingLabels && (
                  <text
                    x={bounds.centerX}
                    y={bounds.centerY + 6}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={darkMode ? "#f8fafc" : "#0f172a"}
                    fontSize={Math.min(48, Math.max(22, bounds.width / 5))}
                    fontWeight="900"
                    className="pointer-events-none select-none"
                  >
                    {letter}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-20">
        <div
          className={cn(
            "rounded-2xl shadow-xl border overflow-hidden flex flex-col",
            darkMode ? "bg-gray-900/95 border-gray-700" : "bg-white/95 border-gray-200"
          )}
        >
          <Button variant="ghost" size="sm" onClick={handleZoomIn} className="w-11 h-11 rounded-none hover:bg-blue-50 dark:hover:bg-gray-800">
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetView}
            className="w-11 h-11 rounded-none border-y border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-800"
            title={i18n.language === "fi" ? "Nollaa" : "Reset"}
          >
            <MapPin className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleZoomOut} className="w-11 h-11 rounded-none hover:bg-blue-50 dark:hover:bg-gray-800">
            <Minus className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
