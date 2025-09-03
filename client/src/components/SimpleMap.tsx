import { useState } from "react";

// Simple hardcoded campus data
const BUILDINGS = [
  { id: 1, name: "M", fullName: "Music Building", x: 200, y: 100, color: "#9333EA" },
  { id: 2, name: "K", fullName: "Central Hall", x: 400, y: 150, color: "#DC2626" },
  { id: 3, name: "L", fullName: "Gymnasium", x: 600, y: 120, color: "#059669" },
];

const ROOMS = [
  { id: 1, name: "M12", building: "M", x: 220, y: 120, floor: 1 },
  { id: 2, name: "K15", building: "K", x: 420, y: 170, floor: 1 },
  { id: 3, name: "Gym 1", building: "L", x: 620, y: 140, floor: 1 },
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

        {/* Floor Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Floor ({filteredRooms.length} rooms)
          </label>
          <button
            onClick={() => setCurrentFloor(1)}
            className={`px-4 py-2 rounded-md font-medium ${
              currentFloor === 1
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Floor 1
          </button>
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
          <div>• First click = start, second = destination</div>
          <div>• Search to find specific rooms</div>
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

          {/* Buildings */}
          {BUILDINGS.map(building => (
            <g key={building.id}>
              <rect
                x={building.x - 40}
                y={building.y - 30}
                width="120"
                height="80"
                fill={building.color + "20"}
                stroke={building.color}
                strokeWidth="3"
                rx="8"
              />
              <text
                x={building.x}
                y={building.y - 40}
                textAnchor="middle"
                className="text-sm font-bold fill-gray-800"
              >
                {building.name} - {building.fullName}
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