import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import AdvancedMapBuilder from "@/components/AdvancedMapBuilder";
import BuildingShapeBuilder from "@/components/BuildingShapeBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building, 
  Plus, 
  Save, 
  Trash2, 
  Edit, 
  MapPin, 
  Layers,
  Home,
  Palette,
  Grid,
  Zap,
  CheckCircle,
  Pencil
} from "lucide-react";

interface Building {
  id: string;
  name: string;
  nameEn?: string;
  nameFi?: string;
  description?: string;
  floors: number;
  capacity?: number;
  colorCode: string;
  mapPositionX?: number;
  mapPositionY?: number;
  isActive: boolean;
}

interface Room {
  id: string;
  buildingId: string;
  roomNumber: string;
  name?: string;
  nameEn?: string;
  nameFi?: string;
  floor: number;
  capacity?: number;
  type: string;
  mapPositionX?: number;
  mapPositionY?: number;
  width?: number;
  height?: number;
  colorCode?: string;
  isActive: boolean;
}

export default function Builder() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("shape-builder");
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  
  // Building form state
  const [buildingForm, setBuildingForm] = useState({
    name: "",
    nameEn: "",
    nameFi: "",
    description: "",
    floors: 1,
    capacity: 100,
    colorCode: "#3B82F6",
    mapPositionX: 100,
    mapPositionY: 100
  });

  // Room form state
  const [roomForm, setRoomForm] = useState({
    buildingId: "",
    roomNumber: "",
    name: "",
    nameEn: "",
    nameFi: "",
    floor: 1,
    capacity: 30,
    type: "classroom",
    mapPositionX: 50,
    mapPositionY: 50,
    width: 60,
    height: 40,
    colorCode: "#6B7280"
  });

  // Fetch buildings
  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/buildings");
      if (!response.ok) throw new Error("Failed to fetch buildings");
      return response.json();
    },
  });

  // Fetch rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await fetch("/api/rooms");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
  });

  // Create building mutation
  const createBuildingMutation = useMutation({
    mutationFn: async (building: any) => {
      const response = await fetch("/api/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(building),
      });
      if (!response.ok) throw new Error("Failed to create building");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      setBuildingForm({
        name: "",
        nameEn: "",
        nameFi: "",
        description: "",
        floors: 1,
        capacity: 100,
        colorCode: "#3B82F6",
        mapPositionX: 100,
        mapPositionY: 100
      });
    },
  });

  // Create room mutation
  const createRoomMutation = useMutation({
    mutationFn: async (room: any) => {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(room),
      });
      if (!response.ok) throw new Error("Failed to create room");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setRoomForm({
        buildingId: "",
        roomNumber: "",
        name: "",
        nameEn: "",
        nameFi: "",
        floor: 1,
        capacity: 30,
        type: "classroom",
        mapPositionX: 50,
        mapPositionY: 50,
        width: 60,
        height: 40,
        colorCode: "#6B7280"
      });
    },
  });

  const handleCreateBuilding = () => {
    if (!buildingForm.name) {
      alert("Please enter a building name");
      return;
    }
    createBuildingMutation.mutate(buildingForm);
  };

  const handleCreateRoom = () => {
    if (!roomForm.buildingId || !roomForm.roomNumber) {
      alert("Please select a building and enter a room number");
      return;
    }
    createRoomMutation.mutate(roomForm);
  };

  const roomTypes = [
    { value: "classroom", label: "Classroom", color: "#3B82F6" },
    { value: "lab", label: "Laboratory", color: "#EF4444" },
    { value: "office", label: "Office", color: "#8B5CF6" },
    { value: "library", label: "Library", color: "#10B981" },
    { value: "gymnasium", label: "Gymnasium", color: "#F59E0B" },
    { value: "cafeteria", label: "Cafeteria", color: "#EC4899" },
    { value: "music_room", label: "Music Room", color: "#6366F1" },
    { value: "art_studio", label: "Art Studio", color: "#84CC16" },
    { value: "storage", label: "Storage", color: "#6B7280" },
    { value: "hallway", label: "Hallway", color: "#9CA3AF" },
    { value: "toilet", label: "Toilet", color: "#06B6D4" },
    { value: "emergency_exit", label: "Emergency Exit", color: "#DC2626" }
  ];

  const buildingColors = [
    "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", 
    "#EC4899", "#6366F1", "#84CC16", "#06B6D4", "#F97316"
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            KSYK Builder
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Design and create buildings, classrooms, and campus facilities with our interactive builder tool
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-4xl mx-auto">
            <TabsTrigger value="shape-builder" className="flex items-center">
              <Building className="mr-2 h-4 w-4" />
              🏗️ Shape Builder
            </TabsTrigger>
            <TabsTrigger value="map-builder" className="flex items-center">
              <Pencil className="mr-2 h-4 w-4" />
              Floor Plans
            </TabsTrigger>
            <TabsTrigger value="buildings" className="flex items-center">
              <Building className="mr-2 h-4 w-4" />
              Buildings
            </TabsTrigger>
            <TabsTrigger value="rooms" className="flex items-center">
              <Home className="mr-2 h-4 w-4" />
              Rooms
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center">
              <Grid className="mr-2 h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Building Shape Builder */}
          <TabsContent value="shape-builder" className="space-y-6">
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">🏗️ Custom Building Shape Builder</h2>
              <p className="text-gray-600">
                Click to create custom building shapes! Add corner points by clicking on the canvas, 
                then close the shape by clicking near the first point or using the "Finish Building" button.
              </p>
            </div>
            <BuildingShapeBuilder />
          </TabsContent>

          {/* Advanced Map Builder */}
          <TabsContent value="map-builder" className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Advanced Map Builder</h2>
              <p className="text-gray-600">
                Click to draw custom shapes for walls, rooms, hallways, and doors. 
                Create precise floor plans by clicking points on the canvas.
              </p>
            </div>
            <AdvancedMapBuilder />
          </TabsContent>

          {/* Building Builder */}
          <TabsContent value="buildings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Building Form */}
              <Card className="shadow-lg">
                <CardHeader className="bg-blue-600 text-white">
                  <CardTitle className="flex items-center">
                    <Plus className="mr-2 h-6 w-6" />
                    Create New Building
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Building Code *</Label>
                      <Input
                        id="name"
                        value={buildingForm.name}
                        onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
                        placeholder="e.g., M, K, L, R"
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="floors">Number of Floors</Label>
                      <Input
                        id="floors"
                        type="number"
                        min="1"
                        max="10"
                        value={buildingForm.floors}
                        onChange={(e) => setBuildingForm({ ...buildingForm, floors: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nameEn">English Name</Label>
                      <Input
                        id="nameEn"
                        value={buildingForm.nameEn}
                        onChange={(e) => setBuildingForm({ ...buildingForm, nameEn: e.target.value })}
                        placeholder="e.g., Music Building"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nameFi">Finnish Name</Label>
                      <Input
                        id="nameFi"
                        value={buildingForm.nameFi}
                        onChange={(e) => setBuildingForm({ ...buildingForm, nameFi: e.target.value })}
                        placeholder="e.g., Musiikkitalo"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={buildingForm.description}
                      onChange={(e) => setBuildingForm({ ...buildingForm, description: e.target.value })}
                      placeholder="Brief description of the building's purpose"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={buildingForm.capacity}
                        onChange={(e) => setBuildingForm({ ...buildingForm, capacity: parseInt(e.target.value) || 0 })}
                        placeholder="Total building capacity"
                      />
                    </div>
                    <div>
                      <Label>Building Color</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {buildingColors.map((color) => (
                          <button
                            key={color}
                            className={`w-8 h-8 rounded-full border-2 ${
                              buildingForm.colorCode === color ? 'border-gray-800' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setBuildingForm({ ...buildingForm, colorCode: color })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mapX">Map Position X</Label>
                      <Input
                        id="mapX"
                        type="number"
                        value={buildingForm.mapPositionX}
                        onChange={(e) => setBuildingForm({ ...buildingForm, mapPositionX: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="mapY">Map Position Y</Label>
                      <Input
                        id="mapY"
                        type="number"
                        value={buildingForm.mapPositionY}
                        onChange={(e) => setBuildingForm({ ...buildingForm, mapPositionY: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleCreateBuilding}
                    disabled={createBuildingMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {createBuildingMutation.isPending ? (
                      <>Creating...</>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Create Building
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Buildings */}
              <Card className="shadow-lg">
                <CardHeader className="bg-gray-800 text-white">
                  <CardTitle className="flex items-center">
                    <Building className="mr-2 h-6 w-6" />
                    Existing Buildings ({buildings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {buildings.map((building: Building) => (
                      <div key={building.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: building.colorCode }}
                          />
                          <div>
                            <div className="font-bold text-lg">{building.name}</div>
                            <div className="text-sm text-gray-600">{building.nameEn}</div>
                            <div className="text-xs text-gray-500">{building.floors} floors</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={building.isActive ? "default" : "secondary"}>
                            {building.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {buildings.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No buildings created yet</p>
                        <p className="text-sm">Create your first building to get started!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Room Builder */}
          <TabsContent value="rooms" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Room Form */}
              <Card className="shadow-lg">
                <CardHeader className="bg-green-600 text-white">
                  <CardTitle className="flex items-center">
                    <Plus className="mr-2 h-6 w-6" />
                    Create New Room
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="buildingSelect">Building *</Label>
                      <select
                        id="buildingSelect"
                        value={roomForm.buildingId}
                        onChange={(e) => setRoomForm({ ...roomForm, buildingId: e.target.value })}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Select Building</option>
                        {buildings.map((building: Building) => (
                          <option key={building.id} value={building.id}>
                            {building.name} - {building.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="roomNumber">Room Number *</Label>
                      <Input
                        id="roomNumber"
                        value={roomForm.roomNumber}
                        onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                        placeholder="e.g., M12, K15, L01"
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="roomNameEn">English Name</Label>
                      <Input
                        id="roomNameEn"
                        value={roomForm.nameEn}
                        onChange={(e) => setRoomForm({ ...roomForm, nameEn: e.target.value })}
                        placeholder="e.g., Music Room 12"
                      />
                    </div>
                    <div>
                      <Label htmlFor="roomNameFi">Finnish Name</Label>
                      <Input
                        id="roomNameFi"
                        value={roomForm.nameFi}
                        onChange={(e) => setRoomForm({ ...roomForm, nameFi: e.target.value })}
                        placeholder="e.g., Musiikkiluokka 12"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="floor">Floor</Label>
                      <Input
                        id="floor"
                        type="number"
                        min="1"
                        value={roomForm.floor}
                        onChange={(e) => setRoomForm({ ...roomForm, floor: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="roomCapacity">Capacity</Label>
                      <Input
                        id="roomCapacity"
                        type="number"
                        value={roomForm.capacity}
                        onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="roomType">Room Type</Label>
                      <select
                        id="roomType"
                        value={roomForm.type}
                        onChange={(e) => {
                          const selectedType = roomTypes.find(t => t.value === e.target.value);
                          setRoomForm({ 
                            ...roomForm, 
                            type: e.target.value,
                            colorCode: selectedType?.color || "#6B7280"
                          });
                        }}
                        className="w-full p-2 border rounded-md"
                      >
                        {roomTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="roomX">Position X</Label>
                      <Input
                        id="roomX"
                        type="number"
                        value={roomForm.mapPositionX}
                        onChange={(e) => setRoomForm({ ...roomForm, mapPositionX: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="roomY">Position Y</Label>
                      <Input
                        id="roomY"
                        type="number"
                        value={roomForm.mapPositionY}
                        onChange={(e) => setRoomForm({ ...roomForm, mapPositionY: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="roomWidth">Width</Label>
                      <Input
                        id="roomWidth"
                        type="number"
                        value={roomForm.width}
                        onChange={(e) => setRoomForm({ ...roomForm, width: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="roomHeight">Height</Label>
                      <Input
                        id="roomHeight"
                        type="number"
                        value={roomForm.height}
                        onChange={(e) => setRoomForm({ ...roomForm, height: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleCreateRoom}
                    disabled={createRoomMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {createRoomMutation.isPending ? (
                      <>Creating...</>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Create Room
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Rooms */}
              <Card className="shadow-lg">
                <CardHeader className="bg-gray-800 text-white">
                  <CardTitle className="flex items-center">
                    <Home className="mr-2 h-6 w-6" />
                    Existing Rooms ({rooms.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {rooms.slice(0, 20).map((room: Room) => (
                      <div key={room.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: room.colorCode || "#6B7280" }}
                          />
                          <div>
                            <div className="font-bold">{room.roomNumber}</div>
                            <div className="text-sm text-gray-600">{room.nameEn || room.name}</div>
                            <div className="text-xs text-gray-500">Floor {room.floor} • {room.type}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {room.capacity} seats
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {rooms.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No rooms created yet</p>
                        <p className="text-sm">Create buildings first, then add rooms!</p>
                      </div>
                    )}
                    
                    {rooms.length > 20 && (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">Showing 20 of {rooms.length} rooms</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Preview */}
          <TabsContent value="preview" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="bg-purple-600 text-white">
                <CardTitle className="flex items-center">
                  <Grid className="mr-2 h-6 w-6" />
                  Campus Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-8 min-h-96">
                  <svg viewBox="0 0 800 600" className="w-full h-96 border rounded">
                    {/* Grid background */}
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    
                    {/* Buildings */}
                    {buildings.map((building: Building) => (
                      <g key={building.id}>
                        <rect
                          x={building.mapPositionX || 100}
                          y={building.mapPositionY || 100}
                          width="80"
                          height={60 + (building.floors * 8)}
                          fill={building.colorCode}
                          stroke="#ffffff"
                          strokeWidth="2"
                          rx="4"
                        />
                        <text
                          x={(building.mapPositionX || 100) + 40}
                          y={(building.mapPositionY || 100) + 35}
                          textAnchor="middle"
                          className="fill-white font-bold text-sm"
                        >
                          {building.name}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{buildings.length}</div>
                    <div className="text-sm text-blue-800">Buildings Created</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{rooms.length}</div>
                    <div className="text-sm text-green-800">Rooms Created</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {rooms.reduce((sum: number, room: Room) => sum + (room.capacity || 0), 0)}
                    </div>
                    <div className="text-sm text-purple-800">Total Capacity</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}