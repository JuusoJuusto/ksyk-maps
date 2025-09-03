import { useState } from "react";

const rooms = [
  { name: "M12", x: 200, y: 150 },
  { name: "K15", x: 400, y: 200 },
  { name: "R10", x: 300, y: 300 },
  { name: "A20", x: 500, y: 250 },
  { name: "U30", x: 250, y: 100 },
];

export default function MinimalMap() {
  const [selected, setSelected] = useState("");

  return (
    <div className="w-full h-screen bg-white">
      {/* Title */}
      <div className="p-4 bg-blue-600 text-white">
        <h1 className="text-xl font-bold">KSYK Campus Map</h1>
        {selected && <p>Selected: {selected}</p>}
      </div>

      {/* Map */}
      <div className="relative w-full h-full bg-gray-50">
        <svg className="w-full h-full">
          {rooms.map(room => (
            <g key={room.name}>
              <circle
                cx={room.x}
                cy={room.y}
                r="30"
                fill={selected === room.name ? "#3b82f6" : "#e5e7eb"}
                stroke="#374151"
                strokeWidth="2"
                className="cursor-pointer"
                onClick={() => setSelected(room.name)}
              />
              <text
                x={room.x}
                y={room.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm font-bold pointer-events-none"
              >
                {room.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}