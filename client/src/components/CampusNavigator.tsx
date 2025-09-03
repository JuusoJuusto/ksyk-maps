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
  const [mapTransform, setMapTransform] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragThreshold, setDragThreshold] = useState(false);
  const [showDirections, setShowDirections] = useState(false);

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
    // Prevent room clicks during dragging
    if (dragThreshold) return;
    
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
    setShowDirections(false);
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
    setMapTransform({ x: 0, y: 0 });
  };

  const handleMapMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragThreshold(false);
    setDragStart({ 
      x: e.clientX - mapTransform.x, 
      y: e.clientY - mapTransform.y 
    });
  };

  const handleMapMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Check if user has moved beyond threshold to prevent accidental clicks
    if (Math.abs(deltaX - mapTransform.x) > 5 || Math.abs(deltaY - mapTransform.y) > 5) {
      setDragThreshold(true);
    }
    
    setMapTransform({ x: deltaX, y: deltaY });
  };

  const handleMapMouseUp = () => {
    setIsDragging(false);
    // Reset drag threshold after a delay to allow for click events
    setTimeout(() => setDragThreshold(false), 100);
  };


  const getDirections = () => {
    if (!startRoom || !endRoom) return [];
    const directions = [];
    
    // Floor navigation
    if (startRoom.floor !== endRoom.floor) {
      directions.push(language === 'fi' 
        ? `Siirry kerroksesta ${startRoom.floor} kerrokseen ${endRoom.floor}`
        : `Go from floor ${startRoom.floor} to floor ${endRoom.floor}`);
    }
    
    // Building navigation
    const startBuilding = buildings.find(b => b.id === startRoom.buildingId);
    const endBuilding = buildings.find(b => b.id === endRoom.buildingId);
    
    if (startBuilding?.id !== endBuilding?.id) {
      directions.push(language === 'fi'
        ? `Siirry rakennuksesta ${startBuilding?.name} rakennukseen ${endBuilding?.name}`
        : `Go from ${startBuilding?.name} building to ${endBuilding?.name} building`);
    }
    
    directions.push(language === 'fi'
      ? `Saavu huoneeseen ${endRoom.roomNumber}`
      : `Arrive at room ${endRoom.roomNumber}`);
    
    return directions;
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
              <p className="text-sm text-gray-600">by Owl Apps</p>
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

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div className={`
          ${sidebarOpen ? 'w-80' : 'w-0'} 
          transition-all duration-300 ease-in-out
          bg-white border-r border-gray-200 flex flex-col
          ${!sidebarOpen && 'overflow-hidden'}
          md:relative absolute inset-y-0 left-0 z-30 shadow-xl md:shadow-none
        `}>
        
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
            data-testid="sidebar-overlay"
          />
        )}
          <div className="p-4 overflow-y-auto flex-1">
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
                  className="h-12 touch-manipulation text-base"
                  data-testid="room-search-input"
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
                      className="h-12 touch-manipulation text-lg"
                      data-testid={`floor-${floor}-button`}
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
                      data-testid={`search-result-${room.roomNumber}`}
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
            viewBox="-400 -300 800 600"
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            style={{ 
              touchAction: 'none',
              transform: `scale(${mapScale}) translate(${mapTransform.x}px, ${mapTransform.y}px)`
            }}
            onMouseDown={handleMapMouseDown}
            onMouseMove={handleMapMouseMove}
            onMouseUp={handleMapMouseUp}
            onMouseLeave={handleMapMouseUp}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              setIsDragging(true);
              setDragThreshold(false);
              setDragStart({ 
                x: touch.clientX - mapTransform.x, 
                y: touch.clientY - mapTransform.y 
              });
            }}
            onTouchMove={(e) => {
              if (!isDragging) return;
              e.preventDefault();
              const touch = e.touches[0];
              const deltaX = touch.clientX - dragStart.x;
              const deltaY = touch.clientY - dragStart.y;
              
              // Check movement threshold
              if (Math.abs(deltaX - mapTransform.x) > 5 || Math.abs(deltaY - mapTransform.y) > 5) {
                setDragThreshold(true);
              }
              
              setMapTransform({ x: deltaX, y: deltaY });
            }}
            onTouchEnd={() => {
              setIsDragging(false);
              setTimeout(() => setDragThreshold(false), 100);
            }}
            data-testid="interactive-map"
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
                  data-testid={`room-${room.roomNumber}`}
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
            <Button 
              onClick={handleZoomIn} 
              size="sm" 
              className="w-12 h-12 p-0 text-lg font-bold shadow-lg hover:scale-110 transition-transform"
              data-testid="zoom-in-button"
            >
              +
            </Button>
            <Button 
              onClick={handleZoomOut} 
              size="sm" 
              className="w-12 h-12 p-0 text-lg font-bold shadow-lg hover:scale-110 transition-transform"
              data-testid="zoom-out-button"
            >
              -
            </Button>
            <Button 
              onClick={resetMap} 
              size="sm" 
              variant="outline" 
              className="w-12 h-12 p-0 text-lg shadow-lg hover:scale-110 transition-transform"
              data-testid="reset-map-button"
            >
              ⌂
            </Button>
          </div>

          {/* Navigation Panel */}
          {(startRoom || endRoom) && (
            <div className="absolute top-4 right-4 bg-white rounded-lg p-4 shadow-xl max-w-sm z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg">
                  {language === 'fi' ? 'Navigointi' : 'Navigation'}
                </h3>
                <Button 
                  onClick={clearNavigation} 
                  size="sm" 
                  variant="outline"
                  className="h-8 w-8 p-0"
                  data-testid="clear-navigation-button"
                >
                  ✕
                </Button>
              </div>
              
              {startRoom && (
                <div className="mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-sm">
                      {language === 'fi' ? 'Lähtö:' : 'Start:'} {startRoom.roomNumber}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 ml-5">{getRoomName(startRoom)}</p>
                </div>
              )}
              
              {endRoom && (
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="font-medium text-sm">
                      {language === 'fi' ? 'Määränpää:' : 'Destination:'} {endRoom.roomNumber}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 ml-5">{getRoomName(endRoom)}</p>
                </div>
              )}

              {startRoom && endRoom && (
                <div>
                  <Button
                    onClick={() => setShowDirections(!showDirections)}
                    size="sm"
                    className="w-full mb-2"
                    data-testid="show-directions-button"
                  >
                    {showDirections 
                      ? (language === 'fi' ? 'Piilota ohjeet' : 'Hide Directions')
                      : (language === 'fi' ? 'Näytä ohjeet' : 'Show Directions')
                    }
                  </Button>
                  
                  {showDirections && (
                    <div className="bg-blue-50 rounded p-3">
                      <h4 className="font-medium text-sm mb-2">
                        {language === 'fi' ? 'Reittiohje:' : 'Directions:'}
                      </h4>
                      <ol className="text-xs space-y-1">
                        {getDirections().map((direction, index) => (
                          <li key={index} className="flex">
                            <span className="font-medium mr-2">{index + 1}.</span>
                            <span>{direction}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

          {/* Buildings Legend - Moved to bottom-left to avoid collision with Navigation Panel */}
          <div className="absolute bottom-20 left-4 bg-white rounded-lg p-3 shadow-lg max-w-xs">
            <div className="text-sm font-medium mb-2">
              {language === 'fi' ? 'Rakennukset:' : 'Buildings:'}
            </div>
            <div className="space-y-1">
              {buildings.map(building => (
                <div key={building.id} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: building.colorCode }}
                    data-testid={`building-color-${building.id}`}
                  ></div>
                  <span data-testid={`building-name-${building.id}`}>{building.name} - {getBuildingName(building)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}