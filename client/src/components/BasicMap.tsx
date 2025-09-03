import { useState } from "react";

const ROOMS = [
  { id: 1, name: "M12", x: 200, y: 150, floor: 1, building: "Music" },
  { id: 2, name: "K15", x: 400, y: 200, floor: 1, building: "Central" },
  { id: 3, name: "L01", x: 600, y: 180, floor: 1, building: "Gym" },
  { id: 4, name: "R10", x: 300, y: 300, floor: 1, building: "R Building" },
  { id: 5, name: "A20", x: 500, y: 320, floor: 1, building: "A Building" },
  { id: 6, name: "U30", x: 250, y: 100, floor: 1, building: "U Building" },
];

export default function BasicMap() {
  const [selectedRoom, setSelectedRoom] = useState<typeof ROOMS[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleRoomClick = (room: typeof ROOMS[0]) => {
    setSelectedRoom(room);
  };

  const filteredRooms = ROOMS.filter(room => 
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full h-screen bg-gray-100">
      {/* Simple Control Panel */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 w-64 z-10">
        <h1 className="text-lg font-bold mb-4">KSYK Campus</h1>
        
        {/* Search */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search rooms (M12, K15...)"
          className="w-full p-2 border rounded-md mb-4"
        />

        {/* Selected Room Info */}
        {selectedRoom && (
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <div className="font-bold">{selectedRoom.name}</div>
            <div className="text-sm text-gray-600">{selectedRoom.building}</div>
            <div className="text-sm text-gray-600">Floor {selectedRoom.floor}</div>
          </div>
        )}

        {/* Room List */}
        <div className="max-h-48 overflow-y-auto">
          <div className="text-sm font-medium mb-2">All Rooms:</div>
          {filteredRooms.map(room => (
            <button
              key={room.id}
              onClick={() => handleRoomClick(room)}
              className={`w-full text-left p-2 rounded-md mb-1 ${
                selectedRoom?.id === room.id 
                  ? 'bg-blue-100 border-blue-300' 
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">{room.name}</div>
              <div className="text-xs text-gray-500">{room.building}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Simple Map */}
      <div className="absolute inset-0">
        <svg width="100%" height="100%">
          {/* Simple Grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Rooms as Simple Circles */}
          {ROOMS.map(room => (
            <g key={room.id}>
              <circle
                cx={room.x}
                cy={room.y}
                r="25"
                fill={selectedRoom?.id === room.id ? "#3b82f6" : "#f3f4f6"}
                stroke={selectedRoom?.id === room.id ? "#1d4ed8" : "#9ca3af"}
                strokeWidth="2"
                className="cursor-pointer hover:fill-blue-200 transition-colors"
                onClick={() => handleRoomClick(room)}
              />
              <text
                x={room.x}
                y={room.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm font-bold fill-gray-800 pointer-events-none"
              >
                {room.name}
              </text>
              <text
                x={room.x}
                y={room.y + 40}
                textAnchor="middle"
                className="text-xs fill-gray-600 pointer-events-none"
              >
                {room.building}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Simple Instructions */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg p-3 shadow-lg">
        <div className="text-sm font-medium">Click any room to select it</div>
        <div className="text-xs text-gray-600">Search to find specific rooms</div>
      </div>
    </div>
  );
}