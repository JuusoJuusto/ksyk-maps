import { useState } from "react";

// KSYK Campus Data - Complete Layout
const BUILDINGS = [
  { id: 1, name: "M", fullName: "Music Building", x: 150, y: 200, color: "#9333EA" },
  { id: 2, name: "K", fullName: "Central Hall", x: 400, y: 180, color: "#DC2626" },
  { id: 3, name: "L", fullName: "Gymnasium", x: 650, y: 220, color: "#059669" },
  { id: 4, name: "R", fullName: "R Building", x: 300, y: 350, color: "#F59E0B" },
  { id: 5, name: "A", fullName: "A Building", x: 500, y: 320, color: "#8B5CF6" },
  { id: 6, name: "U", fullName: "U Building", x: 200, y: 80, color: "#3B82F6" },
  { id: 7, name: "OG", fullName: "Old Gymnasium", x: 550, y: 100, color: "#06B6D4" },
];

const ROOMS = [
  // Floor 1 Rooms
  { id: 1, name: "M12", building: "M", x: 170, y: 220, floor: 1 },
  { id: 2, name: "K15", building: "K", x: 420, y: 200, floor: 1 },
  { id: 3, name: "Gym 1", building: "L", x: 670, y: 240, floor: 1 },
  { id: 4, name: "R10", building: "R", x: 320, y: 370, floor: 1 },
  { id: 5, name: "A20", building: "A", x: 520, y: 340, floor: 1 },
  { id: 6, name: "U30", building: "U", x: 220, y: 100, floor: 1 },
  { id: 7, name: "OG5", building: "OG", x: 570, y: 120, floor: 1 },
  
  // Floor 2 Rooms
  { id: 8, name: "M22", building: "M", x: 170, y: 220, floor: 2 },
  { id: 9, name: "K25", building: "K", x: 420, y: 200, floor: 2 },
  { id: 10, name: "R20", building: "R", x: 320, y: 370, floor: 2 },
  { id: 11, name: "A25", building: "A", x: 520, y: 340, floor: 2 },
  { id: 12, name: "U35", building: "U", x: 220, y: 100, floor: 2 },
  
  // Floor 3 Rooms
  { id: 13, name: "M32", building: "M", x: 170, y: 220, floor: 3 },
  { id: 14, name: "K35", building: "K", x: 420, y: 200, floor: 3 },
  { id: 15, name: "A35", building: "A", x: 520, y: 340, floor: 3 },
  { id: 16, name: "U40", building: "U", x: 220, y: 100, floor: 3 },
];

export default function SimpleMap() {
  const [selectedRoom, setSelectedRoom] = useState<typeof ROOMS[0] | null>(null);
  const [startRoom, setStartRoom] = useState<typeof ROOMS[0] | null>(null);
  const [endRoom, setEndRoom] = useState<typeof ROOMS[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentFloor, setCurrentFloor] = useState(1);

  const handleRoomClick = (room: typeof ROOMS[0]) => {
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

  const filteredRooms = ROOMS.filter(room => 
    room.floor === currentFloor && 
    (searchTerm === "" || room.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="w-full h-screen bg-blue-50 relative">
      {/* Control Panel - Mobile Optimized */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 w-72 md:w-80 z-10 max-h-[80vh] overflow-y-auto">
        <h1 className="text-xl font-bold mb-4 text-gray-800">KSYK Campus Navigator</h1>
        
        {/* Search */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Search Rooms</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type M12, K15, or Gym 1"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Floor Selector - 3 Floors */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Floor ({filteredRooms.length} rooms)
          </label>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3].map(floor => (
              <button
                key={floor}
                onClick={() => setCurrentFloor(floor)}
                className={`px-3 py-2 rounded-md font-medium min-w-[44px] ${
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
        {startRoom && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="text-sm font-medium text-green-800">
              📍 From: {startRoom.name}
            </div>
            {endRoom ? (
              <div className="text-sm font-medium text-green-800">
                🎯 To: {endRoom.name}
              </div>
            ) : (
              <div className="text-xs text-green-600 mt-1">
                Click another room to set destination
              </div>
            )}
            <button
              onClick={clearNavigation}
              className="mt-2 px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600"
            >
              Clear Route
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-gray-600 space-y-1">
          <div>• Click rooms to start navigation</div>
          <div>• Switch floors to see different levels</div>
          <div>• Search: M12, K15, A20, U30, R10, etc.</div>
          <div>• Buildings: M, K, L, R, A, U, OG</div>
        </div>

        {/* Found Rooms */}
        {searchTerm && filteredRooms.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Found Rooms:</div>
            {filteredRooms.map(room => (
              <button
                key={room.id}
                onClick={() => handleRoomClick(room)}
                className="w-full text-left p-2 hover:bg-gray-100 rounded-md mb-1"
              >
                <div className="font-medium">{room.name}</div>
                <div className="text-xs text-gray-500">Building {room.building} • Floor {room.floor}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div className="absolute inset-0 overflow-hidden">
        <svg width="100%" height="100%" className="absolute inset-0">
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
              x1={startRoom.x}
              y1={startRoom.y}
              x2={endRoom.x}
              y2={endRoom.y}
              stroke="#2563eb"
              strokeWidth="4"
              strokeDasharray="10,5"
              className="animate-pulse"
            />
          )}

          {/* Buildings - All 7 Buildings */}
          {BUILDINGS.map(building => (
            <g key={building.id}>
              <rect
                x={building.x - 50}
                y={building.y - 40}
                width="100"
                height="80"
                fill={building.color + "20"}
                stroke={building.color}
                strokeWidth="3"
                rx="8"
              />
              <text
                x={building.x}
                y={building.y - 50}
                textAnchor="middle"
                className="text-sm font-bold fill-gray-800"
              >
                {building.name}
              </text>
              <text
                x={building.x}
                y={building.y - 35}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {building.fullName}
              </text>
            </g>
          ))}

          {/* Rooms */}
          {filteredRooms.map(room => {
            const isStart = startRoom?.id === room.id;
            const isEnd = endRoom?.id === room.id;
            const isSelected = selectedRoom?.id === room.id;
            
            return (
              <g key={room.id}>
                <rect
                  x={room.x - 25}
                  y={room.y - 15}
                  width="50"
                  height="30"
                  fill={isStart ? "#10b981" : isEnd ? "#ef4444" : isSelected ? "#3b82f6" : "#f3f4f6"}
                  stroke={isStart ? "#059669" : isEnd ? "#dc2626" : isSelected ? "#2563eb" : "#d1d5db"}
                  strokeWidth="2"
                  rx="4"
                  className="cursor-pointer hover:stroke-blue-500 transition-all duration-200"
                  onClick={() => handleRoomClick(room)}
                />
                <text
                  x={room.x}
                  y={room.y}
                  textAnchor="middle"
                  className="text-xs font-bold fill-gray-800 pointer-events-none"
                >
                  {room.name}
                </text>
                {/* Floor indicator */}
                <circle
                  cx={room.x + 20}
                  cy={room.y - 10}
                  r="8"
                  fill="#3b82f6"
                  className="pointer-events-none"
                />
                <text
                  x={room.x + 20}
                  y={room.y - 6}
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-white pointer-events-none"
                >
                  {room.floor}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Mobile Help */}
      <div className="absolute bottom-4 right-4 bg-white/90 rounded-lg p-3 shadow-lg max-w-xs">
        <div className="text-sm font-medium mb-1">Campus Navigator</div>
        <div className="text-xs text-gray-600">
          Click colored rooms to navigate between locations. Green = start, red = destination.
        </div>
      </div>
    </div>
  );
}