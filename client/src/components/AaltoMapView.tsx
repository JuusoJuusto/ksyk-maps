/**
 * AALTO SPACE - Map View Component
 * Redesigned map interface matching Aalto Space design principles
 */

import { useState, useEffect } from "react";
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

interface Building {
  id: string;
  name: string;
  nameEn: string;
  nameFi: string;
  floors: number;
  colorCode: string;
  mapPositionX: number;
  mapPositionY: number;
  openingHours: any;
  facilities: string[];
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
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
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

  const floorRooms = rooms.filter((r: Room) => r.floor === selectedFloor);

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.2, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setSelectedFloor(1);
  };

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
            onClick={() => setSelectedFloor(Math.min(selectedFloor + 1, 3))}
            disabled={selectedFloor >= 3}
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
        className={`h-full w-full ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}
        style={{
          transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
          transformOrigin: "center center",
          transition: "transform 0.2s ease-out",
        }}
      >
        <svg className="w-full h-full">
          {/* Render Buildings */}
          {buildings.map((building: Building) => {
            const isSelected = selectedBuilding?.id === building.id;
            return (
              <g key={building.id}>
                <rect
                  x={building.mapPositionX || 0}
                  y={building.mapPositionY || 0}
                  width={200}
                  height={150}
                  fill={building.colorCode || "#3B82F6"}
                  stroke={isSelected ? "#FBBF24" : (darkMode ? "#374151" : "#E5E7EB")}
                  strokeWidth={isSelected ? "4" : "2"}
                  opacity={isSelected ? "1" : "0.8"}
                  className="cursor-pointer hover:opacity-100 transition-all"
                  onClick={() => {
                    setSelectedBuilding(building);
                    setSelectedRoom(null);
                  }}
                  style={{ filter: isSelected ? "drop-shadow(0 0 10px rgba(251, 191, 36, 0.5))" : "none" }}
                />
                <text
                  x={(building.mapPositionX || 0) + 100}
                  y={(building.mapPositionY || 0) + 75}
                  textAnchor="middle"
                  fill="white"
                  fontSize="16"
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  {i18n.language === "fi" ? building.nameFi : building.nameEn || building.name}
                </text>
              </g>
            );
          })}

          {/* Render Rooms (if layer enabled) */}
          {layerSettings.rooms &&
            floorRooms.map((room: Room) => {
              const isSelected = selectedRoom?.id === room.id;
              return (
                <g key={room.id}>
                  <rect
                    x={room.mapPositionX || 0}
                    y={room.mapPositionY || 0}
                    width={room.width || 60}
                    height={room.height || 40}
                    fill={getStatusColor(room.currentStatus)}
                    stroke={isSelected ? "#FBBF24" : (darkMode ? "#374151" : "#E5E7EB")}
                    strokeWidth={isSelected ? "3" : "1"}
                    opacity={isSelected ? "1" : "0.7"}
                    className="cursor-pointer hover:opacity-100 transition-all"
                    onClick={() => {
                      setSelectedRoom(room);
                      setSelectedBuilding(null);
                    }}
                    style={{ filter: isSelected ? "drop-shadow(0 0 8px rgba(251, 191, 36, 0.5))" : "none" }}
                  />
                  <text
                    x={(room.mapPositionX || 0) + (room.width || 60) / 2}
                    y={(room.mapPositionY || 0) + (room.height || 40) / 2}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {room.roomNumber}
                  </text>
                </g>
              );
            })}
        </svg>
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

              {selectedBuilding.facilities && selectedBuilding.facilities.length > 0 && (
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
              )}

              <Button
                onClick={() => {
                  // Navigate to building
                  setSelectedBuilding(null);
                }}
                className="w-full"
              >
                <Navigation className="h-4 w-4 mr-2" />
                {i18n.language === "fi" ? "Navigoi tänne" : "Navigate Here"}
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
