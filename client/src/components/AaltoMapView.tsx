/**
 * AALTO SPACE - Map View Component
 * Redesigned map interface matching Aalto Space design principles
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  parseBuildingShape,
  getShapeBounds,
  pointsToSvgPath,
  computeCampusViewBox,
  getBuildingLabel,
  type BuildingMapData,
} from "@/lib/mapGeometry";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  MapPin,
  Navigation,
  Plus,
  Minus,
  Layers,
  X,
  ChevronRight,
  Building2,
  Users,
  Clock,
  Accessibility,
  Calendar,
} from "lucide-react";

interface Building extends BuildingMapData {
  openingHours?: unknown;
  facilities?: string[];
}

interface Room {
  id: string;
  roomNumber: string;
  name: string;
  floor: number;
  buildingId: string;
  capacity: number;
  currentStatus: string;
  isBookable: boolean;
  mapPositionX: number;
  mapPositionY: number;
  width: number;
  height: number;
}

interface AaltoMapViewProps {
  onNavigate?: (from: string, to: string) => void;
}

export default function AaltoMapView({ onNavigate }: AaltoMapViewProps) {
  const { t, i18n } = useTranslation();
  const { darkMode } = useDarkMode();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [showLayers, setShowLayers] = useState(false);
  const [layerSettings, setLayerSettings] = useState({
    rooms: true,
    services: true,
    accessibility: false,
  });

  // Fetch buildings
  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/buildings");
      if (!response.ok) throw new Error("Failed to fetch buildings");
      return response.json();
    },
    staleTime: 60000,
  });

  // Fetch rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await fetch("/api/rooms");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
    staleTime: 60000,
  });

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const buildingResults = buildings
        .filter((b: Building) => {
          const name = i18n.language === "fi" ? b.nameFi : b.nameEn || b.name;
          return name.toLowerCase().includes(searchQuery.toLowerCase());
        })
        .map((b: Building) => ({ ...b, type: "building" }));

      const roomResults = rooms
        .filter((r: Room) =>
          r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map((r: Room) => ({ ...r, type: "room" }));

      setSearchResults([...buildingResults, ...roomResults].slice(0, 8));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, buildings, rooms, i18n.language]);

  const maxFloor = useMemo(() => {
    const fromBuildings = buildings.length
      ? Math.max(...buildings.map((b: Building) => b.floors || 1))
      : 3;
    const fromRooms = rooms.length
      ? Math.max(...rooms.map((r: Room) => r.floor || 0))
      : 0;
    return Math.max(fromBuildings, fromRooms, 1);
  }, [buildings, rooms]);

  const viewBox = useMemo(
    () => computeCampusViewBox(buildings as BuildingMapData[]),
    [buildings]
  );

  const floorRooms = rooms.filter((r: Room) => {
    if (r.floor !== selectedFloor) return false;
    if (selectedBuilding) return r.buildingId === selectedBuilding.id;
    return true;
  });

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.15, 2.5));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.15, 0.4));
  const handleResetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedFloor(1);
    setSelectedBuilding(null);
    setSelectedRoom(null);
  };

  const handlePanStart = useCallback(
    (clientX: number, clientY: number) => {
      setIsPanning(true);
      panStart.current = {
        x: clientX,
        y: clientY,
        panX: panOffset.x,
        panY: panOffset.y,
      };
    },
    [panOffset]
  );

  const handlePanMove = useCallback((clientX: number, clientY: number) => {
    if (!isPanning) return;
    setPanOffset({
      x: panStart.current.panX + (clientX - panStart.current.x),
      y: panStart.current.panY + (clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handlePanEnd = useCallback(() => setIsPanning(false), []);

  useEffect(() => {
    if (!isPanning) return;
    const onMove = (e: MouseEvent) => handlePanMove(e.clientX, e.clientY);
    const onUp = () => handlePanEnd();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPanning, handlePanMove, handlePanEnd]);

  const toggleLayer = (layer: keyof typeof layerSettings) => {
    setLayerSettings((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "free":
        return "#10B981"; // green
      case "occupied":
        return "#EF4444"; // red
      case "reserved":
        return "#F59E0B"; // yellow
      default:
        return "#6B7280"; // gray
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Floating Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-30">
        <div className={`relative ${darkMode ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-2xl border ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder={i18n.language === "fi" ? "Etsi tiloja, rakennuksia..." : "Search rooms, buildings..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-12 pr-12 h-14 text-base border-0 rounded-2xl ${
              darkMode ? "bg-gray-800 text-white" : "bg-white"
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div
            className={`mt-2 rounded-2xl shadow-2xl border overflow-hidden ${
              darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}
          >
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (result.type === "building") {
                    setSelectedBuilding(result);
                  } else {
                    setSelectedRoom(result);
                    setSelectedFloor(result.floor);
                  }
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className={`w-full p-4 text-left border-b last:border-b-0 transition-colors ${
                  darkMode
                    ? "border-gray-700 hover:bg-gray-700"
                    : "border-gray-100 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {result.type === "building" ? (
                      <Building2 className={`h-5 w-5 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                    ) : (
                      <MapPin className={`h-5 w-5 ${darkMode ? "text-green-400" : "text-green-600"}`} />
                    )}
                    <div>
                      <div className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                        {result.type === "building"
                          ? i18n.language === "fi"
                            ? result.nameFi
                            : result.nameEn || result.name
                          : result.roomNumber}
                      </div>
                      <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                        {result.type === "building"
                          ? `${result.floors} ${i18n.language === "fi" ? "kerrosta" : "floors"}`
                          : result.name}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floor Selector (Floating) */}
      <div className="absolute top-24 right-4 z-30">
        <div
          className={`rounded-2xl shadow-2xl border overflow-hidden ${
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFloor(Math.min(selectedFloor + 1, maxFloor))}
            disabled={selectedFloor >= maxFloor}
            className="w-12 h-12 p-0 rounded-none"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <div
            className={`w-12 h-12 flex items-center justify-center font-bold text-lg border-y ${
              darkMode ? "border-gray-700 bg-blue-600 text-white" : "border-gray-200 bg-blue-500 text-white"
            }`}
          >
            {selectedFloor}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFloor(Math.max(selectedFloor - 1, 0))}
            disabled={selectedFloor <= 0}
            className="w-12 h-12 p-0 rounded-none"
          >
            <Minus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-24 right-4 z-30 md:bottom-4">
        <div
          className={`rounded-2xl shadow-2xl border overflow-hidden ${
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            className="w-12 h-12 p-0 rounded-none"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <div className={`border-y ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetView}
              className="w-12 h-12 p-0 rounded-none"
              title={i18n.language === "fi" ? "Nollaa näkymä" : "Reset view"}
            >
              <MapPin className="h-5 w-5" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            className="w-12 h-12 p-0 rounded-none"
          >
            <Minus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Layer Toggle */}
      <div className="absolute bottom-24 left-4 z-30 md:bottom-4">
        <Button
          onClick={() => setShowLayers(!showLayers)}
          className={`rounded-2xl shadow-2xl h-12 px-4 ${
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
          variant="outline"
        >
          <Layers className="h-5 w-5 mr-2" />
          {i18n.language === "fi" ? "Tasot" : "Layers"}
        </Button>

        {showLayers && (
          <div
            className={`absolute bottom-14 left-0 rounded-2xl shadow-2xl border p-3 space-y-2 ${
              darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}
          >
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={layerSettings.rooms}
                onChange={() => toggleLayer("rooms")}
                className="rounded"
              />
              <span className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                {i18n.language === "fi" ? "Tilat" : "Rooms"}
              </span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={layerSettings.services}
                onChange={() => toggleLayer("services")}
                className="rounded"
              />
              <span className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                {i18n.language === "fi" ? "Palvelut" : "Services"}
              </span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={layerSettings.accessibility}
                onChange={() => toggleLayer("accessibility")}
                className="rounded"
              />
              <span className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                <Accessibility className="h-4 w-4 inline mr-1" />
                {i18n.language === "fi" ? "Esteettömyys" : "Accessibility"}
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div
        className={`h-full w-full overflow-hidden ${darkMode ? "bg-[#e8eaed]" : "bg-[#eef1f4]"}`}
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest("[data-map-feature]")) return;
          handlePanStart(e.clientX, e.clientY);
        }}
      >
        {buildings.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8">
            <div
              className={`max-w-md rounded-2xl border p-8 text-center shadow-lg ${
                darkMode ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-gray-900"
              }`}
            >
              <Building2 className={`mx-auto mb-4 h-14 w-14 ${darkMode ? "text-gray-400" : "text-gray-400"}`} />
              <h3 className="text-xl font-bold mb-2">
                {i18n.language === "fi" ? "Ei rakennuksia kartalla" : "No buildings on the map yet"}
              </h3>
              <p className={`text-sm mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                {i18n.language === "fi"
                  ? "Luo rakennuksia ja huoneita Admin-paneelin Builder- tai 3D Map -välilehdellä."
                  : "Create buildings and rooms in the Admin panel Builder or 3D Map tab."}
              </p>
            </div>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="h-full w-full touch-none"
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            style={{
              transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: "center center",
              transition: isPanning ? "none" : "transform 0.15s ease-out",
            }}
          >
            <defs>
              <pattern id="campusGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke={darkMode ? "#cbd5e1" : "#d1d5db"}
                  strokeWidth="0.5"
                />
              </pattern>
              <filter id="buildingShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.25" />
              </filter>
            </defs>
            <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#campusGrid)" />

            {buildings.map((building: Building) => {
              const shape = parseBuildingShape(building);
              const bounds = getShapeBounds(shape);
              const isSelected = selectedBuilding?.id === building.id;
              const fill = building.colorCode || "#2563eb";
              const label = getBuildingLabel(building, i18n.language);

              return (
                <g key={building.id} data-map-feature="building">
                  <path
                    d={pointsToSvgPath(shape)}
                    fill={fill}
                    stroke={isSelected ? "#fbbf24" : darkMode ? "#1f2937" : "#ffffff"}
                    strokeWidth={isSelected ? 4 : 2}
                    opacity={isSelected ? 1 : 0.92}
                    filter="url(#buildingShadow)"
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBuilding(building);
                      setSelectedRoom(null);
                      setSelectedFloor(1);
                    }}
                  />
                  <text
                    x={bounds.centerX}
                    y={bounds.centerY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize={Math.min(22, Math.max(12, bounds.width / 8))}
                    fontWeight="700"
                    className="pointer-events-none select-none"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {layerSettings.rooms &&
              floorRooms.map((room: Room) => {
                const isSelected = selectedRoom?.id === room.id;
                const w = room.width || 60;
                const h = room.height || 40;
                return (
                  <g key={room.id} data-map-feature="room">
                    <rect
                      x={room.mapPositionX || 0}
                      y={room.mapPositionY || 0}
                      width={w}
                      height={h}
                      rx={4}
                      fill={getStatusColor(room.currentStatus)}
                      stroke={isSelected ? "#fbbf24" : darkMode ? "#374151" : "#fff"}
                      strokeWidth={isSelected ? 3 : 1.5}
                      opacity={isSelected ? 1 : 0.85}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRoom(room);
                        const parent = buildings.find((b: Building) => b.id === room.buildingId);
                        if (parent) setSelectedBuilding(parent);
                      }}
                    />
                    <text
                      x={(room.mapPositionX || 0) + w / 2}
                      y={(room.mapPositionY || 0) + h / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                      fontSize={Math.min(11, h / 3)}
                      fontWeight="600"
                      className="pointer-events-none"
                    >
                      {room.roomNumber}
                    </text>
                  </g>
                );
              })}
          </svg>
        )}
      </div>

      {/* Building Card (Bottom Sheet) */}
      {selectedBuilding && (
        <div className="absolute bottom-0 left-0 right-0 z-40 md:bottom-auto md:top-24 md:left-4 md:right-auto md:max-w-sm">
          <Card
            className={`rounded-t-3xl md:rounded-2xl shadow-2xl border-t-4 border-blue-500 ${
              darkMode ? "bg-gray-800 border-gray-700" : "bg-white"
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {i18n.language === "fi" ? selectedBuilding.nameFi : selectedBuilding.nameEn || selectedBuilding.name}
                  </h3>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {selectedBuilding.floors} {i18n.language === "fi" ? "kerrosta" : "floors"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedBuilding(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {selectedBuilding.facilities?.length ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedBuilding.facilities.map((facility, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1 text-sm rounded-full ${
                        darkMode ? "bg-gray-700 text-gray-300" : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {facility}
                    </span>
                  ))}
                </div>
              ) : null}

              <Button
                onClick={() => setSelectedBuilding(null)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Navigation className="h-4 w-4 mr-2" />
                {i18n.language === "fi" ? "Sulje" : "Close"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Room Card (Bottom Sheet) */}
      {selectedRoom && (
        <div className="absolute bottom-0 left-0 right-0 z-40 md:bottom-auto md:top-24 md:left-4 md:right-auto md:max-w-sm">
          <Card
            className={`rounded-t-3xl md:rounded-2xl shadow-2xl border-t-4 ${
              selectedRoom.currentStatus === "free"
                ? "border-green-500"
                : selectedRoom.currentStatus === "occupied"
                ? "border-red-500"
                : "border-yellow-500"
            } ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {selectedRoom.roomNumber}
                  </h3>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>{selectedRoom.name}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRoom(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {i18n.language === "fi" ? "Tila" : "Status"}
                  </span>
                  <span
                    className={`px-3 py-1 text-sm rounded-full font-medium ${
                      selectedRoom.currentStatus === "free"
                        ? "bg-green-100 text-green-700"
                        : selectedRoom.currentStatus === "occupied"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {selectedRoom.currentStatus === "free"
                      ? i18n.language === "fi"
                        ? "Vapaa"
                        : "Free"
                      : selectedRoom.currentStatus === "occupied"
                      ? i18n.language === "fi"
                        ? "Varattu"
                        : "Occupied"
                      : i18n.language === "fi"
                      ? "Varattu pian"
                      : "Reserved Soon"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    <Users className="h-4 w-4 inline mr-1" />
                    {i18n.language === "fi" ? "Kapasiteetti" : "Capacity"}
                  </span>
                  <span className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {selectedRoom.capacity}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    <MapPin className="h-4 w-4 inline mr-1" />
                    {i18n.language === "fi" ? "Kerros" : "Floor"}
                  </span>
                  <span className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {selectedRoom.floor}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    // Navigate to room
                    setSelectedRoom(null);
                  }}
                  variant="outline"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  {i18n.language === "fi" ? "Navigoi" : "Navigate"}
                </Button>
                {selectedRoom.isBookable && (
                  <Button
                    onClick={() => {
                      // Open booking modal
                      setSelectedRoom(null);
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {i18n.language === "fi" ? "Varaa" : "Book"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
