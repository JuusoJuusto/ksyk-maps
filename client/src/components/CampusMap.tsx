import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface Room {
  id: string;
  roomNumber: string;
  nameEn?: string;
  floor: number;
  buildingId: string;
  mapPositionX: number;
  mapPositionY: number;
  width?: number;
  height?: number;
  type?: string;
  capacity?: number;
}

interface Building {
  id: string;
  name: string;
  nameEn?: string;
  colorCode?: string;
  mapPositionX?: number;
  mapPositionY?: number;
}

export default function CampusMap() {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [navigationStart, setNavigationStart] = useState<Room | null>(null);
  const [navigationEnd, setNavigationEnd] = useState<Room | null>(null);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Fetch data
  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  // Filter rooms by floor and search
  const filteredRooms = rooms.filter(room => {
    const matchesFloor = room.floor === currentFloor;
    const matchesSearch = !searchQuery || 
      room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.nameEn?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFloor && matchesSearch;
  });

  // Get available floors
  const availableFloors = [...new Set(rooms.map(room => room.floor))].sort();

  // Handle room click
  const handleRoomClick = (room: Room) => {
    if (!navigationStart) {
      setNavigationStart(room);
      setSelectedRoom(room);
    } else if (!navigationEnd && room !== navigationStart) {
      setNavigationEnd(room);
    } else {
      // Reset navigation
      setNavigationStart(room);
      setNavigationEnd(null);
      setSelectedRoom(room);
    }
  };

  // Handle map dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.room, .building')) return;
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    setMapOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const clearNavigation = () => {
    setNavigationStart(null);
    setNavigationEnd(null);
    setSelectedRoom(null);
  };

  return (
    <div className="h-screen w-full bg-blue-50 relative overflow-hidden">
      {/* Mobile-Optimized Control Panel */}
      <div className="absolute top-2 left-2 md:top-4 md:left-4 z-50 bg-white rounded-lg shadow-lg p-3 md:p-4 w-64 md:w-80 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-800">KSYK Campus Map</h2>
        
        {/* Search */}
        <div className="mb-3 md:mb-4">
          <input
            type="text"
            placeholder="Search rooms (M12, K15, Gym 1)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 border rounded-md text-sm"
          />
        </div>

        {/* Floor Selector */}
        <div className="mb-3 md:mb-4">
          <p className="text-sm font-medium mb-2">Floor: ({filteredRooms.length} rooms)</p>
          <div className="flex gap-1 md:gap-2 flex-wrap">
            {availableFloors.map(floor => (
              <button
                key={floor}
                onClick={() => setCurrentFloor(floor)}
                className={`px-3 py-1 text-sm rounded-md min-w-[44px] ${
                  currentFloor === floor 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Floor {floor}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Status */}
        {navigationStart && (
          <div className="mb-3 md:mb-4 p-3 bg-green-50 rounded-md border">
            <p className="text-sm font-medium text-green-800">
              📍 From: {navigationStart.roomNumber}
            </p>
            {navigationEnd ? (
              <p className="text-sm font-medium text-green-800">
                🎯 To: {navigationEnd.roomNumber}
              </p>
            ) : (
              <p className="text-xs text-green-600 mt-1">
                Click another room for destination
              </p>
            )}
            <button
              onClick={clearNavigation}
              className="mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded-md hover:bg-red-600"
            >
              Clear Navigation
            </button>
          </div>
        )}

        {/* Room List */}
        {searchQuery && filteredRooms.length > 0 && (
          <div className="max-h-32 overflow-y-auto">
            <p className="text-sm font-medium mb-2">Found Rooms:</p>
            {filteredRooms.slice(0, 5).map(room => (
              <button
                key={room.id}
                onClick={() => handleRoomClick(room)}
                className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm border-b"
              >
                <div className="font-medium">{room.roomNumber}</div>
                <div className="text-gray-500 text-xs">{room.nameEn} • Floor {room.floor}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div
        className="absolute inset-0 cursor-move select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {/* Grid Background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            transform: `translate(${mapOffset.x}px, ${mapOffset.y}px)`
          }}
        />

        {/* Buildings */}
        {buildings.map((building, index) => {
          const positions = {
            'M': { x: -200, y: 50 },   // Music Building
            'K': { x: 100, y: 0 },     // Central Hall
            'L': { x: 350, y: 80 },    // Gymnasium
          };
          const pos = positions[building.name as keyof typeof positions] || { x: index * 150, y: 50 };
          
          return (
            <div
              key={building.id}
              className="building absolute pointer-events-none"
              style={{
                left: `${pos.x + mapOffset.x + 400}px`,
                top: `${pos.y + mapOffset.y + 300}px`,
                width: '200px',
                height: '150px',
                backgroundColor: (building.colorCode || '#3B82F6') + '20',
                border: `3px solid ${building.colorCode || '#3B82F6'}`,
                borderRadius: '12px',
              }}
            >
              <div className="absolute -top-8 left-2 text-sm font-bold text-gray-800 bg-white px-2 py-1 rounded shadow">
                {building.name} - {building.nameEn}
              </div>
            </div>
          );
        })}

        {/* Navigation Route */}
        {navigationStart && navigationEnd && (
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
            <line
              x1={navigationStart.mapPositionX + mapOffset.x + 400}
              y1={navigationStart.mapPositionY + mapOffset.y + 300}
              x2={navigationEnd.mapPositionX + mapOffset.x + 400}
              y2={navigationEnd.mapPositionY + mapOffset.y + 300}
              stroke="#2563eb"
              strokeWidth="4"
              strokeDasharray="8,4"
            />
          </svg>
        )}

        {/* Rooms */}
        {filteredRooms.map(room => {
          const isStart = navigationStart?.id === room.id;
          const isEnd = navigationEnd?.id === room.id;
          const isSelected = selectedRoom?.id === room.id;
          
          return (
            <div
              key={room.id}
              className="room absolute cursor-pointer transition-all duration-200 hover:scale-110"
              style={{
                left: `${(room.mapPositionX || 0) + mapOffset.x + 400}px`,
                top: `${(room.mapPositionY || 0) + mapOffset.y + 300}px`,
                width: `${room.width || 60}px`,
                height: `${room.height || 40}px`,
                backgroundColor: isStart ? '#10b981' : isEnd ? '#ef4444' : isSelected ? '#3b82f6' : '#f3f4f6',
                border: `2px solid ${isStart ? '#059669' : isEnd ? '#dc2626' : isSelected ? '#2563eb' : '#d1d5db'}`,
                borderRadius: '8px',
                zIndex: 10,
              }}
              onClick={() => handleRoomClick(room)}
              title={`${room.roomNumber} - ${room.nameEn} (Floor ${room.floor})`}
            >
              <div className="flex flex-col items-center justify-center h-full text-xs font-medium text-gray-800 p-1">
                <div className="font-bold">{room.roomNumber}</div>
                {room.nameEn && (
                  <div className="text-[10px] text-center leading-tight">
                    {room.nameEn.substring(0, 10)}
                  </div>
                )}
              </div>
              
              {/* Floor indicator */}
              <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {room.floor}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Instructions */}
      <div className="absolute bottom-4 right-4 bg-white/90 rounded-lg p-3 text-sm max-w-xs shadow-lg">
        <div className="font-medium mb-1">How to use:</div>
        <div className="text-xs text-gray-600 space-y-1">
          <div>• Drag map to pan around</div>
          <div>• Click rooms to navigate</div>
          <div>• Use floor buttons to switch levels</div>
          <div>• Search for specific rooms</div>
        </div>
      </div>
    </div>
  );
}