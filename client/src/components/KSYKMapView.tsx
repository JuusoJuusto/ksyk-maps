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
import { Plus, Minus, X, Layers, Maximize2 } from "lucide-react";
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
  const pinchStart = useRef<{ distance: number; view: typeof viewState } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const touchDistance = (touches: React.TouchList | TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

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

  const searchLetter = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    if (q.length === 1 && (KSYK_BUILDING_LETTERS as readonly string[]).includes(q)) return q;
    return null;
  }, [searchQuery]);

  const activeHighlight = highlightLetter ?? selectedLetter ?? searchLetter;

  const selectedPreset = activeHighlight ? KSYK_BUILDING_OUTLINES[activeHighlight] : null;
  const isFi = i18n.language === "fi";

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

  const applyPan = (clientX: number, clientY: number) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = panStart.current.view.w / rect.width;
    const scaleY = panStart.current.view.h / rect.height;
    const dx = (clientX - panStart.current.clientX) * scaleX;
    const dy = (clientY - panStart.current.clientY) * scaleY;
    setViewState({
      ...panStart.current.view,
      x: panStart.current.view.x - dx,
      y: panStart.current.view.y - dy,
    });
  };

  useEffect(() => {
    if (!isPanning) return;
    const onMove = (e: MouseEvent) => applyPan(e.clientX, e.clientY);
    const onUp = () => setIsPanning(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPanning]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPanning(false);
      pinchStart.current = { distance: touchDistance(e.touches), view: { ...viewState } };
      return;
    }
    if (e.touches.length !== 1) return;
    if ((e.target as HTMLElement).closest("[data-map-feature]")) return;
    const t = e.touches[0];
    handlePanStart(t.clientX, t.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      e.preventDefault();
      const dist = touchDistance(e.touches);
      const scale = dist / pinchStart.current.distance;
      const v = pinchStart.current.view;
      const nw = Math.min(Math.max(v.w / scale, 300), 5000);
      const nh = Math.min(Math.max(v.h / scale, 200), 3500);
      const cx = v.x + v.w / 2;
      const cy = v.y + v.h / 2;
      setViewState({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh });
      return;
    }
    if (!isPanning || e.touches.length !== 1) return;
    e.preventDefault();
    applyPan(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchStart.current = null;
    if (e.touches.length === 0) setIsPanning(false);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={mapRef}
        className={cn(
          "h-full w-full overflow-hidden select-none transition-colors duration-300",
          darkMode
            ? "bg-gradient-to-br from-[#0c1220] via-[#0f1419] to-[#111827]"
            : "bg-gradient-to-br from-slate-100 via-[#f1f5f9] to-blue-50/40",
          settings.highContrast && (darkMode ? "bg-black" : "bg-white")
        )}
        style={{ cursor: isPanning ? "grabbing" : "grab", touchAction: "none" }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest("[data-map-feature]")) return;
          handlePanStart(e.clientX, e.clientY);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <svg className="h-full w-full" viewBox={formatViewBox(viewState)} preserveAspectRatio="xMidYMid meet">
          <defs>
            {settings.showGrid && (
              <pattern id="campusGrid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path
                  d="M 48 0 L 0 0 0 48"
                  fill="none"
                  stroke={darkMode ? "#1e293b" : "#e2e8f0"}
                  strokeWidth="0.75"
                />
              </pattern>
            )}
            <filter id="wingGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
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
            const pathD = outlineToPath(shape);

            return (
              <g
                key={building.id}
                data-map-feature="building"
                opacity={dimmed ? 0.3 : 1}
                style={{ transition: "opacity 0.25s ease" }}
              >
                <path
                  d={pathD}
                  fill={stroke}
                  fillOpacity={isSelected ? 0.14 : darkMode ? 0.06 : 0.08}
                  stroke="none"
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke={isSelected ? "#fbbf24" : stroke}
                  strokeWidth={isSelected ? 5 : settings.highContrast ? 4 : 3.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  filter={isSelected ? "url(#wingGlow)" : undefined}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLetter(letter);
                  }}
                />
                {settings.showWingLabels && (
                  <>
                    <ellipse
                      cx={bounds.centerX}
                      cy={bounds.centerY + 4}
                      rx={Math.min(bounds.width / 2.8, 42)}
                      ry={Math.min(bounds.height / 4, 28)}
                      fill={darkMode ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.75)"}
                      className="pointer-events-none"
                    />
                    <text
                      x={bounds.centerX}
                      y={bounds.centerY + 8}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isSelected ? "#fbbf24" : darkMode ? "#f1f5f9" : stroke}
                      fontSize={Math.min(52, Math.max(24, bounds.width / 4.5))}
                      fontWeight="900"
                      className="pointer-events-none select-none"
                      style={{ paintOrder: "stroke", stroke: darkMode ? "#0f172a" : "#fff", strokeWidth: 3 }}
                    >
                      {letter}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {selectedPreset && activeHighlight && (
        <div
          className={cn(
            "absolute left-3 sm:left-4 z-20 max-w-[min(100%,18rem)]",
            "bottom-[max(5.5rem,calc(1rem+env(safe-area-inset-bottom)))] sm:bottom-4",
            "rounded-2xl shadow-2xl backdrop-blur-xl p-4 animate-in slide-in-from-bottom-4 fade-in duration-300",
            darkMode ? "bg-gray-900/90 text-white" : "bg-white/92 text-gray-900"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center text-xl font-black text-white shrink-0 shadow-lg"
                style={{ backgroundColor: selectedPreset.stroke }}
              >
                {activeHighlight}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-base truncate">
                  {isFi ? selectedPreset.nameFi : selectedPreset.nameEn}
                </p>
                <p className={cn("text-xs mt-0.5 flex items-center gap-1", darkMode ? "text-gray-400" : "text-gray-500")}>
                  <Layers className="h-3 w-3 shrink-0" />
                  {selectedPreset.floors} {isFi ? "kerrosta" : "floors"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLetter(null)}
              className={cn(
                "p-1.5 rounded-lg shrink-0 transition-colors",
                darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
              )}
              aria-label={isFi ? "Sulje" : "Close"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Zoom controls — raised on mobile so they are not clipped */}
      <div className="absolute bottom-[max(5.5rem,calc(1rem+env(safe-area-inset-bottom)))] right-3 sm:bottom-4 sm:right-4 z-20">
        <div
          className={cn(
            "rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col",
            darkMode ? "bg-gray-900/80" : "bg-white/85"
          )}
        >
          <Button variant="ghost" size="sm" onClick={handleZoomIn} className="w-11 h-11 rounded-none hover:bg-blue-50 dark:hover:bg-gray-800">
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetView}
            className="w-11 h-11 rounded-none hover:bg-blue-50/80 dark:hover:bg-gray-800"
            title={isFi ? "Näytä koko kampus" : "Fit campus"}
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleZoomOut} className="w-11 h-11 rounded-none hover:bg-blue-50 dark:hover:bg-gray-800">
            <Minus className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
