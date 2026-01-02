import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Home, Layers, Plus, Trash2, Square, Stairs } from "lucide-react";

export default function ComprehensiveKSYKBuilder() {
  const queryClient = useQueryClient();
  
  const [buildingData, setBuildingData] = useState({
    name: "",
    nameEn: "",
    nameFi: "",
    floors: 1,
    capacity: 100,
    colorCode: "#3B82F6",
    mapPositionX: 0,
    mapPositionY: 0,
    width: 200,
    height: 150
  });

  const [roomData, setRoomData] = useState({
    buildingId: "",
    roomNumber: "",
    name: "",
    nameEn: "",
    nameFi: "",
    floor: 1,
    capacity: 30,
    type: "classroom",
    mapPositionX: 0,
    mapPositionY: 0,
    width: 50,
    height: 50
  });

  const [hallwayData, setHallwayData] = useState({
    buildingId: "",
    name: "",
    nameEn: "",
    nameFi: "",
    floor: 1,
    startX: 0,
    startY: 0,
    endX: 100,
    endY: 0,
    width: 3,
    colorCode: "#9CA3AF"
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
      alert("✅ Building created!");
      setBuildingData({
        name: "",
        nameEn: "",
        nameFi: "",
        floors: 1,
        capacity: 100,
        colorCode: "#3B82F6",
        mapPositionX: 0,
        mapPositionY: 0,
        width: 200,
        height: 150
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
        type: "classroom",
        mapPositionX: 0,
        mapPositionY: 0,
        width: 50,
        height: 50
      });
    },
  });

  const createHallwayMutation = useMutation({
    mutationFn: async (hallway: any) => {
      const response = await fetch("/api/hallways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(hallway),
      });
      if (!response.ok) throw new Error("Failed to create hallway");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hallways"] });
      alert("✅ Hallway created!");
      setHallwayData({
        buildingId: "",
        name: "",
        nameEn: "",
        nameFi: "",
        floor: 1,
        startX: 0,
        startY: 0,
        endX: 100,
        endY: 0,
        width: 3,
        colorCode: "#9CA3AF"
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
    { name: "Pink", value: "#EC4899" },
    { name: "Indigo", value: "#6366F1" },
    { name: "Teal", value: "#14B8A6" }
  ];

  const roomTypes = [
    { value: "classroom", label: "🎓 Classroom", icon: "📚" },
    { value: "lab", label: "🔬 Laboratory", icon: "🧪" },
    { value: "office", label: "💼 Office", icon: "🏢" },
    { value: "library", label: "📚 Library", icon: "📖" },
    { value: "gymnasium", label: "🏀 Gymnasium", icon: "⚽" },
    { value: "cafeteria", label: "🍽️ Cafeteria", icon: "🍴" },
    { value: "toilet", label: "🚻 Toilet", icon: "🚽" },
    { value: "stairway", label: "🪜 Stairway", icon: "🪜" },
    { value: "hallway", label: "🚪 Hallway", icon: "🚪" },
    { value: "emergency_exit", label: "🚨 Emergency Exit", icon: "🚨" }
  ];

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Header */}
      <Card className="shadow-2xl border-2 border-blue-300">
        <CardHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
          <CardTitle className="text-4xl flex items-center justify-between">
            <span className="flex items-center">
              <Building className="mr-3 h-10 w-10" />
              KSYK Builder Pro
            </span>
            <div className="flex space-x-2">
              <Badge variant="secondary" className="bg-white/20 text-white text-lg px-4 py-2">
                🏢 {buildings.length} Buildings
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white text-lg px-4 py-2">
                🚪 {rooms.length} Rooms
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="buildings" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-16 bg-white shadow-lg">
          <TabsTrigger value="buildings" className="text-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Building className="mr-2 h-5 w-5" />
            Buildings
          </TabsTrigger>
          <TabsTrigger value="rooms" className="text-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <Home className="mr-2 h-5 w-5" />
            Rooms & Classrooms
          </TabsTrigger>
          <TabsTrigger value="hallways" className="text-lg data-[state=active]:bg-green-600 data-[state=active]:text-white">
            <Layers className="mr-2 h-5 w-5" />
            Hallways
          </TabsTrigger>
        </TabsList>

        {/* BUILDINGS TAB */}
        <TabsContent value="buildings" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Building */}
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <CardTitle className="flex items-center text-2xl">
                  <Square className="mr-2 h-6 w-6" />
                  Create Building
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-bold">Building Code *</Label>
                    <Input
                      value={buildingData.name}
                      onChange={(e) => setBuildingData({ ...buildingData, name: e.target.value })}
                      placeholder="M, K, L"
                      className="mt-1 h-12 text-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Floors</Label>
                    <Input
                      type="number"
                      min="1"
                      value={buildingData.floors}
                      onChange={(e) => setBuildingData({ ...buildingData, floors: parseInt(e.target.value) || 1 })}
                      className="mt-1 h-12 text-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-bold">English Name</Label>
                    <Input
                      value={buildingData.nameEn}
                      onChange={(e) => setBuildingData({ ...buildingData, nameEn: e.target.value })}
                      placeholder="Music Building"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Finnish Name</Label>
                    <Input
                      value={buildingData.nameFi}
                      onChange={(e) => setBuildingData({ ...buildingData, nameFi: e.target.value })}
                      placeholder="Musiikkitalo"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-bold">X Position</Label>
                    <Input
                      type="number"
                      value={buildingData.mapPositionX}
                      onChange={(e) => setBuildingData({ ...buildingData, mapPositionX: parseInt(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Y Position</Label>
                    <Input
                      type="number"
                      value={buildingData.mapPositionY}
                      onChange={(e) => setBuildingData({ ...buildingData, mapPositionY: parseInt(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Width</Label>
                    <Input
                      type="number"
                      min="50"
                      value={buildingData.width}
                      onChange={(e) => setBuildingData({ ...buildingData, width: parseInt(e.target.value) || 200 })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Height</Label>
                    <Input
                      type="number"
                      min="50"
                      value={buildingData.height}
                      onChange={(e) => setBuildingData({ ...buildingData, height: parseInt(e.target.value) || 150 })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-bold mb-2 block">Color</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        className={`h-14 rounded-lg border-2 transition-all ${
                          buildingData.colorCode === color.value ? 'border-gray-900 scale-110 shadow-lg' : 'border-gray-300'
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
              </CardContent>
            </Card>

            {/* Building List */}
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
                <CardTitle className="flex items-center text-2xl">
                  <Building className="mr-2 h-6 w-6" />
                  Buildings ({buildings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {buildings.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Building className="h-20 w-20 mx-auto mb-4 opacity-30" />
                      <p className="text-xl font-bold">No buildings yet</p>
                      <p className="text-sm">Create your first building!</p>
                    </div>
                  ) : (
                    buildings.map((building: any) => (
                      <div
                        key={building.id}
                        className="border-2 rounded-xl p-4 hover:shadow-xl transition-all"
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
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ROOMS TAB */}
        <TabsContent value="rooms" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <CardTitle className="flex items-center text-2xl">
                  <Home className="mr-2 h-6 w-6" />
                  Create Room / Classroom
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label className="text-sm font-bold">Building *</Label>
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
                    <Label className="text-sm font-bold">Room Number *</Label>
                    <Input
                      value={roomData.roomNumber}
                      onChange={(e) => setRoomData({ ...roomData, roomNumber: e.target.value })}
                      placeholder="M12, K15"
                      className="mt-1 h-12 text-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Floor</Label>
                    <Input
                      type="number"
                      min="1"
                      value={roomData.floor}
                      onChange={(e) => setRoomData({ ...roomData, floor: parseInt(e.target.value) || 1 })}
                      className="mt-1 h-12 text-lg"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-bold">Room Type</Label>
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
                    <Label className="text-sm font-bold">English Name</Label>
                    <Input
                      value={roomData.nameEn}
                      onChange={(e) => setRoomData({ ...roomData, nameEn: e.target.value })}
                      placeholder="Music Room"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Finnish Name</Label>
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
              </CardContent>
            </Card>

            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                <CardTitle className="flex items-center text-2xl">
                  <Home className="mr-2 h-6 w-6" />
                  Rooms ({rooms.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {rooms.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Home className="h-20 w-20 mx-auto mb-4 opacity-30" />
                      <p className="text-xl font-bold">No rooms yet</p>
                      <p className="text-sm">Create your first room!</p>
                    </div>
                  ) : (
                    rooms.map((room: any) => {
                      const roomType = roomTypes.find(t => t.value === room.type);
                      return (
                        <div
                          key={room.id}
                          className="border-2 rounded-xl p-4 hover:shadow-xl transition-all border-purple-200"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-bold text-2xl">{roomType?.icon} {room.roomNumber}</h4>
                              <p className="text-sm text-gray-600">{room.nameEn || room.nameFi || room.name}</p>
                              <div className="mt-2 text-xs text-gray-500 space-y-1">
                                <div>🏢 Floor: {room.floor}</div>
                                <div>📋 Type: {roomType?.label}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* HALLWAYS TAB */}
        <TabsContent value="hallways" className="mt-6">
          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
              <CardTitle className="flex items-center text-2xl">
                <Layers className="mr-2 h-6 w-6" />
                Create Hallway
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="text-sm font-bold">Building *</Label>
                <select
                  value={hallwayData.buildingId}
                  onChange={(e) => setHallwayData({ ...hallwayData, buildingId: e.target.value })}
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-bold">Hallway Name *</Label>
                  <Input
                    value={hallwayData.name}
                    onChange={(e) => setHallwayData({ ...hallwayData, name: e.target.value })}
                    placeholder="Main Hallway"
                    className="mt-1 h-12"
                  />
                </div>
                <div>
                  <Label className="text-sm font-bold">English Name</Label>
                  <Input
                    value={hallwayData.nameEn}
                    onChange={(e) => setHallwayData({ ...hallwayData, nameEn: e.target.value })}
                    placeholder="Main Hallway"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-bold">Finnish Name</Label>
                  <Input
                    value={hallwayData.nameFi}
                    onChange={(e) => setHallwayData({ ...hallwayData, nameFi: e.target.value })}
                    placeholder="Pääkäytävä"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-5 gap-4">
                <div>
                  <Label className="text-sm font-bold">Start X</Label>
                  <Input
                    type="number"
                    value={hallwayData.startX}
                    onChange={(e) => setHallwayData({ ...hallwayData, startX: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-bold">Start Y</Label>
                  <Input
                    type="number"
                    value={hallwayData.startY}
                    onChange={(e) => setHallwayData({ ...hallwayData, startY: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-bold">End X</Label>
                  <Input
                    type="number"
                    value={hallwayData.endX}
                    onChange={(e) => setHallwayData({ ...hallwayData, endX: parseInt(e.target.value) || 100 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-bold">End Y</Label>
                  <Input
                    type="number"
                    value={hallwayData.endY}
                    onChange={(e) => setHallwayData({ ...hallwayData, endY: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-bold">Width</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={hallwayData.width}
                    onChange={(e) => setHallwayData({ ...hallwayData, width: parseInt(e.target.value) || 3 })}
                    className="mt-1"
                  />
                </div>
              </div>

              <Button
                onClick={() => createHallwayMutation.mutate(hallwayData)}
                disabled={!hallwayData.buildingId || !hallwayData.name}
                className="w-full h-16 text-xl bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-6 w-6 mr-2" />
                Create Hallway
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
