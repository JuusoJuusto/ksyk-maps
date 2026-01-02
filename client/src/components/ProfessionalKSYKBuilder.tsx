import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building, Home, Plus, Trash2 } from "lucide-react";

export default function ProfessionalKSYKBuilder() {
  const queryClient = useQueryClient();
  const [buildMode, setBuildMode] = useState<'building' | 'room' | 'stairway'>('building');
  
  const [buildingData, setBuildingData] = useState({
    name: "",
    nameEn: "",
    nameFi: "",
    floors: 1,
    capacity: 100,
    colorCode: "#3B82F6",
    mapPositionX: 0,
    mapPositionY: 0
  });

  const [roomData, setRoomData] = useState({
    buildingId: "",
    roomNumber: "",
    name: "",
    nameEn: "",
    nameFi: "",
    floor: 1,
    capacity: 30,
    type: "classroom"
  });

  // Fetch data
  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/buildings");
      if (!response.ok) throw new Error("Failed to fetch buildings");
      return response.json();
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await fetch("/api/rooms");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
  });

  // Mutations
  const createBuildingMutation = useMutation({
    mutationFn: async (building: any) => {
      const response = await fetch("/api/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(building),
      });
      if (!response.ok) throw new Error("Failed to create building");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      alert("✅ Building created and visible on map!");
      setBuildingData({
        name: "",
        nameEn: "",
        nameFi: "",
        floors: 1,
        capacity: 100,
        colorCode: "#3B82F6",
        mapPositionX: 0,
        mapPositionY: 0
      });
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async (room: any) => {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(room),
      });
      if (!response.ok) throw new Error("Failed to create room");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      alert("✅ Room created!");
      setRoomData({
        buildingId: "",
        roomNumber: "",
        name: "",
        nameEn: "",
        nameFi: "",
        floor: 1,
        capacity: 30,
        type: "classroom"
      });
    },
  });

  const deleteBuildingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/buildings/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete building");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      alert("✅ Building deleted!");
    },
  });

  const colors = [
    { name: "Blue", value: "#3B82F6" },
    { name: "Red", value: "#EF4444" },
    { name: "Green", value: "#10B981" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Orange", value: "#F97316" },
    { name: "Pink", value: "#EC4899" }
  ];

  const roomTypes = [
    { value: "classroom", label: "🎓 Classroom" },
    { value: "lab", label: "🔬 Laboratory" },
    { value: "office", label: "💼 Office" },
    { value: "library", label: "📚 Library" },
    { value: "gymnasium", label: "🏀 Gymnasium" },
    { value: "cafeteria", label: "🍽️ Cafeteria" },
    { value: "toilet", label: "🚻 Toilet" },
    { value: "stairway", label: "🪜 Stairway" }
  ];

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <Card className="shadow-lg border-2 border-blue-500 mb-6">
        <CardHeader className="bg-blue-600 text-white">
          <CardTitle className="text-3xl flex items-center justify-between">
            <span className="flex items-center">
              <Building className="mr-3 h-8 w-8" />
              BUILD - KSYK Campus Builder
            </span>
            <div className="flex space-x-2">
              <Badge className="bg-blue-700 text-white text-base px-3 py-1">
                🏢 {buildings.length} Buildings
              </Badge>
              <Badge className="bg-blue-700 text-white text-base px-3 py-1">
                🚪 {rooms.length} Rooms
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Mode Selector */}
      <div className="flex space-x-3 mb-6">
        <Button
          onClick={() => setBuildMode('building')}
          className={`flex-1 h-14 text-lg ${buildMode === 'building' ? 'bg-blue-600' : 'bg-gray-400'}`}
        >
          <Building className="mr-2 h-5 w-5" />
          Buildings
        </Button>
        <Button
          onClick={() => setBuildMode('room')}
          className={`flex-1 h-14 text-lg ${buildMode === 'room' ? 'bg-purple-600' : 'bg-gray-400'}`}
        >
          <Home className="mr-2 h-5 w-5" />
          Rooms & Classrooms
        </Button>
        <Button
          onClick={() => setBuildMode('stairway')}
          className={`flex-1 h-14 text-lg ${buildMode === 'stairway' ? 'bg-green-600' : 'bg-gray-400'}`}
        >
          🪜 Stairways
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Create Form */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gray-800 text-white">
            <CardTitle className="text-xl">
              {buildMode === 'building' && '🏢 Create Building'}
              {buildMode === 'room' && '🚪 Create Room'}
              {buildMode === 'stairway' && '🪜 Create Stairway'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {buildMode === 'building' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-bold">Building Code *</Label>
                    <Input
                      value={buildingData.name}
                      onChange={(e) => setBuildingData({ ...buildingData, name: e.target.value })}
                      placeholder="M, K, L"
                      className="mt-1 h-12 text-lg"
                    />
                  </div>
                  <div>
                    <Label className="font-bold">Floors (1 or 2)</Label>
                    <select
                      value={buildingData.floors}
                      onChange={(e) => setBuildingData({ ...buildingData, floors: parseInt(e.target.value) })}
                      className="w-full p-3 border-2 rounded-lg mt-1 text-lg"
                    >
                      <option value="1">1 Floor</option>
                      <option value="2">2 Floors</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-bold">English Name</Label>
                    <Input
                      value={buildingData.nameEn}
                      onChange={(e) => setBuildingData({ ...buildingData, nameEn: e.target.value })}
                      placeholder="Music Building"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="font-bold">Finnish Name</Label>
                    <Input
                      value={buildingData.nameFi}
                      onChange={(e) => setBuildingData({ ...buildingData, nameFi: e.target.value })}
                      placeholder="Musiikkitalo"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-bold">Map Position X</Label>
                    <Input
                      type="number"
                      value={buildingData.mapPositionX}
                      onChange={(e) => setBuildingData({ ...buildingData, mapPositionX: parseInt(e.target.value) || 0 })}
                      className="mt-1 h-12 text-lg"
                      placeholder="0 = center"
                    />
                  </div>
                  <div>
                    <Label className="font-bold">Map Position Y</Label>
                    <Input
                      type="number"
                      value={buildingData.mapPositionY}
                      onChange={(e) => setBuildingData({ ...buildingData, mapPositionY: parseInt(e.target.value) || 0 })}
                      className="mt-1 h-12 text-lg"
                      placeholder="0 = center"
                    />
                  </div>
                </div>

                <div>
                  <Label className="font-bold mb-2 block">Building Color</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        className={`h-16 rounded-lg border-2 transition-all ${
                          buildingData.colorCode === color.value ? 'border-black scale-110' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setBuildingData({ ...buildingData, colorCode: color.value })}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => createBuildingMutation.mutate(buildingData)}
                  disabled={!buildingData.name}
                  className="w-full h-16 text-xl bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-6 w-6 mr-2" />
                  Create Building
                </Button>
              </>
            )}

            {buildMode === 'room' && (
              <>
                <div>
                  <Label className="font-bold">Building *</Label>
                  <select
                    value={roomData.buildingId}
                    onChange={(e) => setRoomData({ ...roomData, buildingId: e.target.value })}
                    className="w-full p-3 border-2 rounded-lg mt-1 text-lg"
                  >
                    <option value="">Select Building</option>
                    {buildings.map((building: any) => (
                      <option key={building.id} value={building.id}>
                        {building.name} - {building.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-bold">Room Number *</Label>
                    <Input
                      value={roomData.roomNumber}
                      onChange={(e) => setRoomData({ ...roomData, roomNumber: e.target.value })}
                      placeholder="M12, K15"
                      className="mt-1 h-12 text-lg"
                    />
                  </div>
                  <div>
                    <Label className="font-bold">Floor (1 or 2)</Label>
                    <select
                      value={roomData.floor}
                      onChange={(e) => setRoomData({ ...roomData, floor: parseInt(e.target.value) })}
                      className="w-full p-3 border-2 rounded-lg mt-1"
                    >
                      <option value="1">Floor 1</option>
                      <option value="2">Floor 2</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="font-bold">Room Type</Label>
                  <select
                    value={roomData.type}
                    onChange={(e) => setRoomData({ ...roomData, type: e.target.value })}
                    className="w-full p-3 border-2 rounded-lg mt-1 text-lg"
                  >
                    {roomTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-bold">English Name</Label>
                    <Input
                      value={roomData.nameEn}
                      onChange={(e) => setRoomData({ ...roomData, nameEn: e.target.value })}
                      placeholder="Music Room"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="font-bold">Finnish Name</Label>
                    <Input
                      value={roomData.nameFi}
                      onChange={(e) => setRoomData({ ...roomData, nameFi: e.target.value })}
                      placeholder="Musiikkihuone"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => createRoomMutation.mutate(roomData)}
                  disabled={!roomData.buildingId || !roomData.roomNumber}
                  className="w-full h-16 text-xl bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-6 w-6 mr-2" />
                  Create Room
                </Button>
              </>
            )}

            {buildMode === 'stairway' && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-xl">🪜 Stairway creator</p>
                <p className="text-sm mt-2">Coming soon...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: List */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gray-800 text-white">
            <CardTitle className="text-xl">
              {buildMode === 'building' && `🏢 Buildings (${buildings.length})`}
              {buildMode === 'room' && `🚪 Rooms (${rooms.length})`}
              {buildMode === 'stairway' && '🪜 Stairways (0)'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3 max-h-[700px] overflow-y-auto">
              {buildMode === 'building' && buildings.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Building className="h-20 w-20 mx-auto mb-4 opacity-30" />
                  <p className="text-xl font-bold">No buildings yet</p>
                  <p className="text-sm">Create your first building!</p>
                </div>
              )}
              
              {buildMode === 'building' && buildings.map((building: any) => (
                <div
                  key={building.id}
                  className="border-2 rounded-lg p-4 hover:shadow-lg transition-all"
                  style={{ borderColor: building.colorCode }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-bold text-2xl">{building.name}</h4>
                      <p className="text-sm text-gray-600">{building.nameEn || building.nameFi}</p>
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        <div>📍 Position: ({building.mapPositionX}, {building.mapPositionY})</div>
                        <div>🏢 Floors: {building.floors}</div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete ${building.name}?`)) {
                          deleteBuildingMutation.mutate(building.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {buildMode === 'room' && rooms.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Home className="h-20 w-20 mx-auto mb-4 opacity-30" />
                  <p className="text-xl font-bold">No rooms yet</p>
                  <p className="text-sm">Create your first room!</p>
                </div>
              )}

              {buildMode === 'room' && rooms.map((room: any) => {
                const roomType = roomTypes.find(t => t.value === room.type);
                return (
                  <div
                    key={room.id}
                    className="border-2 rounded-lg p-4 hover:shadow-lg transition-all border-purple-300"
                  >
                    <h4 className="font-bold text-xl">{roomType?.label} {room.roomNumber}</h4>
                    <p className="text-sm text-gray-600">{room.nameEn || room.nameFi || room.name}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      <div>🏢 Floor: {room.floor}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
