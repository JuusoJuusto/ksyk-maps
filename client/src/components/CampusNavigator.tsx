import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Navigation, MapPin, Users, Calendar, Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Building {
  id: string;
  name: string;
  nameEn: string;
  nameFi: string;
  descriptionEn?: string;
  descriptionFi?: string;
  colorCode: string;
  mapPositionX: number;
  mapPositionY: number;
  floors: number;
}

interface Room {
  id: string;
  buildingId: string;
  roomNumber: string;
  nameEn: string;
  nameFi: string;
  floor: number;
  type: string;
  capacity: number;
  mapPositionX: number;
  mapPositionY: number;
  width: number;
  height: number;
  equipment?: string[];
}

export default function CampusNavigator() {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [startRoom, setStartRoom] = useState<Room | null>(null);
  const [endRoom, setEndRoom] = useState<Room | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentFloor, setCurrentFloor] = useState(1);
  const [language, setLanguage] = useState<'en' | 'fi'>('en');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapScale, setMapScale] = useState(1);
  const [mapPanX, setMapPanX] = useState(0);
  const [mapPanY, setMapPanY] = useState(0);

  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ['/api/buildings'],
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
  });

  const filteredRooms = rooms.filter(room => 
    room.floor === currentFloor && 
    (searchTerm === "" || 
     room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
     room.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
     room.nameFi.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleRoomClick = (room: Room) => {
    if (!startRoom) {
      setStartRoom(room);
      setSelectedRoom(room);
    } else if (startRoom && !endRoom && room.id !== startRoom.id) {
      setEndRoom(room);
    } else {
      setStartRoom(room);
      setEndRoom(null);
      setSelectedRoom(room);
    }
  };

  const clearNavigation = () => {
    setStartRoom(null);
    setEndRoom(null);
    setSelectedRoom(null);
  };

  const getRoomColor = (room: Room) => {
    if (startRoom?.id === room.id) return "#10b981";
    if (endRoom?.id === room.id) return "#ef4444";
    if (selectedRoom?.id === room.id) return "#3b82f6";
    return "#f3f4f6";
  };

  const getRoomName = (room: Room) => {
    return language === 'fi' ? room.nameFi : room.nameEn;
  };

  const getBuildingName = (building: Building) => {
    return language === 'fi' ? building.nameFi : building.nameEn;
  };

  const handleZoomIn = () => {
    setMapScale(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setMapScale(prev => Math.max(prev / 1.2, 0.5));
  };

  const resetMap = () => {
    setMapScale(1);
    setMapPanX(0);
    setMapPanY(0);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">KSYK Map</h1>
              <p className="text-sm text-gray-600">by OLW APPS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={language === 'en' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguage('en')}
            >
              EN
            </Button>
            <Button
              variant={language === 'fi' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguage('fi')}
            >
              FI
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white border-r flex flex-col overflow-hidden lg:w-80`}>
          <div className="p-4">
            {/* Search */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  {language === 'fi' ? 'Hae huoneita' : 'Search Rooms'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={language === 'fi' ? 'Huoneen numero tai nimi...' : 'Room number or name...'}
                />
              </CardContent>
            </Card>

            {/* Floor Selector */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {language === 'fi' ? 'Kerros' : 'Floor'} ({filteredRooms.length} {language === 'fi' ? 'huonetta' : 'rooms'})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(floor => (
                    <Button
                      key={floor}
                      variant={currentFloor === floor ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentFloor(floor)}
                    >
                      {floor}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Navigation Status */}
            {startRoom && (
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    {language === 'fi' ? 'Navigointi' : 'Navigation'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">{language === 'fi' ? 'Lähtö:' : 'From:'} {startRoom.roomNumber}</span>
                  </div>
                  {endRoom && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">{language === 'fi' ? 'Määränpää:' : 'To:'} {endRoom.roomNumber}</span>
                    </div>
                  )}
                  {!endRoom && (
                    <p className="text-xs text-gray-500">
                      {language === 'fi' ? 'Klikkaa toista huonetta määränpäänä' : 'Click another room as destination'}
                    </p>
                  )}
                  <Button onClick={clearNavigation} variant="outline" size="sm" className="w-full">
                    {language === 'fi' ? 'Tyhjennä reitti' : 'Clear Route'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Room Details */}
            {selectedRoom && (
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{selectedRoom.roomNumber}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-gray-600">{getRoomName(selectedRoom)}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{language === 'fi' ? 'Kerros' : 'Floor'} {selectedRoom.floor}</Badge>
                    <Badge variant="outline">{selectedRoom.capacity} {language === 'fi' ? 'paikkaa' : 'seats'}</Badge>
                    <Badge variant="outline">{selectedRoom.type}</Badge>
                  </div>
                  {selectedRoom.equipment && selectedRoom.equipment.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        {language === 'fi' ? 'Varusteet:' : 'Equipment:'}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedRoom.equipment.map((item, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {item.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Search Results */}
            {searchTerm && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    {filteredRooms.length} {language === 'fi' ? 'tulosta' : 'results'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filteredRooms.map(room => (
                    <button
                      key={room.id}
                      onClick={() => handleRoomClick(room)}
                      className="w-full text-left p-2 hover:bg-gray-50 rounded-md border border-gray-200"
                    >
                      <div className="font-medium text-sm">{room.roomNumber}</div>
                      <div className="text-xs text-gray-600">{getRoomName(room)}</div>
                      <div className="text-xs text-gray-500">
                        {language === 'fi' ? 'Kerros' : 'Floor'} {room.floor} • {room.capacity} {language === 'fi' ? 'paikkaa' : 'seats'}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Map Canvas */}
        <div className="flex-1 relative overflow-hidden bg-blue-50">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`${-400/mapScale + mapPanX} ${-300/mapScale + mapPanY} ${800/mapScale} ${600/mapScale}`}
            className="absolute inset-0"
          >
            {/* Grid Background */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Navigation Route */}
            {startRoom && endRoom && (
              <line
                x1={startRoom.mapPositionX}
                y1={startRoom.mapPositionY}
                x2={endRoom.mapPositionX}
                y2={endRoom.mapPositionY}
                stroke="#2563eb"
                strokeWidth="4"
                strokeDasharray="10,5"
                className="animate-pulse"
              />
            )}

            {/* Buildings */}
            {buildings.map(building => (
              <g key={building.id}>
                <rect
                  x={building.mapPositionX - 60}
                  y={building.mapPositionY - 40}
                  width="120"
                  height="80"
                  fill={building.colorCode + "30"}
                  stroke={building.colorCode}
                  strokeWidth="3"
                  rx="8"
                />
                <text
                  x={building.mapPositionX}
                  y={building.mapPositionY - 50}
                  textAnchor="middle"
                  className="text-sm font-bold fill-gray-800"
                >
                  {building.name}
                </text>
                <text
                  x={building.mapPositionX}
                  y={building.mapPositionY - 35}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {getBuildingName(building)}
                </text>
              </g>
            ))}

            {/* Rooms */}
            {filteredRooms.map(room => (
              <g key={room.id}>
                <rect
                  x={room.mapPositionX - room.width/2}
                  y={room.mapPositionY - room.height/2}
                  width={room.width}
                  height={room.height}
                  fill={getRoomColor(room)}
                  stroke={startRoom?.id === room.id ? "#059669" : endRoom?.id === room.id ? "#dc2626" : "#d1d5db"}
                  strokeWidth="2"
                  rx="4"
                  className="cursor-pointer hover:stroke-blue-500 transition-all duration-200"
                  onClick={() => handleRoomClick(room)}
                />
                <text
                  x={room.mapPositionX}
                  y={room.mapPositionY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-bold fill-gray-800 pointer-events-none"
                >
                  {room.roomNumber}
                </text>
                {/* Floor indicator */}
                <circle
                  cx={room.mapPositionX + room.width/2 - 10}
                  cy={room.mapPositionY - room.height/2 + 10}
                  r="8"
                  fill="#3b82f6"
                  className="pointer-events-none"
                />
                <text
                  x={room.mapPositionX + room.width/2 - 10}
                  y={room.mapPositionY - room.height/2 + 14}
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-white pointer-events-none"
                >
                  {room.floor}
                </text>
              </g>
            ))}
          </svg>

          {/* Map Controls */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            <Button onClick={handleZoomIn} size="sm" className="w-10 h-10 p-0">
              +
            </Button>
            <Button onClick={handleZoomOut} size="sm" className="w-10 h-10 p-0">
              -
            </Button>
            <Button onClick={resetMap} size="sm" variant="outline" className="w-10 h-10 p-0">
              ⌂
            </Button>
          </div>

          {/* Map Instructions */}
          <div className="absolute bottom-4 right-4 bg-white rounded-lg p-3 shadow-lg max-w-xs">
            <div className="text-sm font-medium mb-2">
              {language === 'fi' ? 'Kartan käyttö:' : 'How to use:'}
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>• {language === 'fi' ? 'Klikkaa huoneita navigoidaksesi' : 'Click rooms to navigate'}</div>
              <div>• {language === 'fi' ? 'Vihreä = lähtö, punainen = määränpää' : 'Green = start, red = destination'}</div>
              <div>• {language === 'fi' ? 'Hae huoneita hakupalkista' : 'Search rooms from search bar'}</div>
              <div>• {language === 'fi' ? 'Zoomaa + ja - napeilla' : 'Zoom with + and - buttons'}</div>
            </div>
          </div>

          {/* Buildings Legend */}
          <div className="absolute top-4 right-4 bg-white rounded-lg p-3 shadow-lg">
            <div className="text-sm font-medium mb-2">
              {language === 'fi' ? 'Rakennukset:' : 'Buildings:'}
            </div>
            <div className="space-y-1">
              {buildings.map(building => (
                <div key={building.id} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: building.colorCode }}
                  ></div>
                  <span>{building.name} - {getBuildingName(building)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}