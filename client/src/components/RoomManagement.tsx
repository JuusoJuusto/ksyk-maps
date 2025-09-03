import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import type { Room, Building, InsertRoom } from "@shared/schema";

const ROOM_TYPES = [
  { value: "classroom", label: "Classroom", icon: "fas fa-chalkboard-teacher", color: "#3B82F6" },
  { value: "lab", label: "Laboratory", icon: "fas fa-flask", color: "#8B5CF6" },
  { value: "office", label: "Office", icon: "fas fa-briefcase", color: "#10B981" },
  { value: "hallway", label: "Hallway", icon: "fas fa-arrows-alt-h", color: "#6B7280" },
  { value: "toilet", label: "Toilet", icon: "fas fa-restroom", color: "#F59E0B" },
  { value: "emergency_exit", label: "Emergency Exit", icon: "fas fa-door-open", color: "#EF4444" },
  { value: "storage", label: "Storage", icon: "fas fa-box", color: "#8B5CF6" },
  { value: "cafeteria", label: "Cafeteria", icon: "fas fa-utensils", color: "#F59E0B" },
  { value: "library_room", label: "Library Room", icon: "fas fa-book", color: "#10B981" },
  { value: "music_room", label: "Music Room", icon: "fas fa-music", color: "#EF4444" },
  { value: "gym", label: "Gymnasium", icon: "fas fa-dumbbell", color: "#F59E0B" },
  { value: "auditorium", label: "Auditorium", icon: "fas fa-theater-masks", color: "#8B5CF6" },
  { value: "stairs", label: "Staircase", icon: "fas fa-level-up-alt", color: "#6B7280" },
  { value: "elevator", label: "Elevator", icon: "fas fa-elevator", color: "#6B7280" }
];

const EQUIPMENT_OPTIONS = [
  "Projector", "Whiteboard", "Computer", "Microscope", "Fume Hood", 
  "Fire Extinguisher", "First Aid Kit", "AED", "Emergency Light",
  "Wheelchair Access", "Hearing Loop", "Braille Signs", "Piano", 
  "Sound System", "Stage Lighting", "Gym Equipment", "Lockers"
];

const FEATURES_OPTIONS = [
  "Wheelchair Accessible", "Emergency Exit", "Fire Safety Equipment",
  "Security Camera", "Natural Light", "Air Conditioning", "Heating",
  "Wi-Fi", "Power Outlets", "Emergency Phone", "Evacuation Route"
];

export default function RoomManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertRoom) => {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to create room");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Room created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create room",
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<InsertRoom> }) => {
      const response = await fetch(`/api/rooms/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update room");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Room updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update room",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/rooms/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete room");
      }
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: "Room deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete room",
        variant: "destructive",
      });
    }
  });

  const filteredRooms = rooms.filter(room => {
    const matchesType = filterType === "all" || room.type === filterType;
    const matchesSearch = !searchQuery || 
      room.roomNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.nameFi?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getRoomTypeInfo = (type: string) => {
    return ROOM_TYPES.find(t => t.value === type) || ROOM_TYPES[0];
  };

  const RoomForm = ({ room, onSubmit, isLoading }: { 
    room?: Room | null, 
    onSubmit: (data: any) => void,
    isLoading: boolean 
  }) => {
    const [formData, setFormData] = useState({
      buildingId: room?.buildingId || "",
      roomNumber: room?.roomNumber || "",
      name: room?.name || "",
      nameEn: room?.nameEn || "",
      nameFi: room?.nameFi || "",
      floor: room?.floor || 1,
      capacity: room?.capacity || 0,
      type: room?.type || "",
      subType: room?.subType || "",
      equipment: room?.equipment || [],
      features: room?.features || [],
      mapPositionX: room?.mapPositionX || 0,
      mapPositionY: room?.mapPositionY || 0,
      width: room?.width || 50,
      height: room?.height || 50,
      colorCode: room?.colorCode || "#6B7280",
      emergencyInfo: room?.emergencyInfo || "",
      accessibilityInfo: room?.accessibilityInfo || "",
      maintenanceNotes: room?.maintenanceNotes || "",
      isPublic: room?.isPublic ?? true,
      isAccessible: room?.isAccessible ?? true,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };

    const handleEquipmentChange = (equipment: string) => {
      setFormData(prev => ({
        ...prev,
        equipment: prev.equipment.includes(equipment)
          ? prev.equipment.filter(e => e !== equipment)
          : [...prev.equipment, equipment]
      }));
    };

    const handleFeaturesChange = (feature: string) => {
      setFormData(prev => ({
        ...prev,
        features: prev.features.includes(feature)
          ? prev.features.filter(f => f !== feature)
          : [...prev.features, feature]
      }));
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="safety">Safety</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="buildingId">Building</Label>
                <Select value={formData.buildingId} onValueChange={(value) => setFormData({...formData, buildingId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(building => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.nameEn || building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="roomNumber">Room Number</Label>
                <Input
                  id="roomNumber"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
                  placeholder="e.g., U34, Main-101"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Room name"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Room Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value, colorCode: ROOM_TYPES.find(t => t.value === value)?.color || "#6B7280"})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <i className={`${type.icon} text-sm`} style={{ color: type.color }}></i>
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  type="number"
                  value={formData.floor}
                  onChange={(e) => setFormData({...formData, floor: parseInt(e.target.value) || 1})}
                />
              </div>
              
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Label htmlFor="subType">Sub Type</Label>
                <Input
                  id="subType"
                  value={formData.subType}
                  onChange={(e) => setFormData({...formData, subType: e.target.value})}
                  placeholder="e.g., Chemistry, Physics"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="location" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mapPositionX">Map X Position</Label>
                <Input
                  id="mapPositionX"
                  type="number"
                  value={formData.mapPositionX}
                  onChange={(e) => setFormData({...formData, mapPositionX: parseInt(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Label htmlFor="mapPositionY">Map Y Position</Label>
                <Input
                  id="mapPositionY"
                  type="number"
                  value={formData.mapPositionY}
                  onChange={(e) => setFormData({...formData, mapPositionY: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  type="number"
                  value={formData.width}
                  onChange={(e) => setFormData({...formData, width: parseInt(e.target.value) || 50})}
                />
              </div>
              
              <div>
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({...formData, height: parseInt(e.target.value) || 50})}
                />
              </div>
              
              <div>
                <Label htmlFor="colorCode">Color</Label>
                <Input
                  id="colorCode"
                  type="color"
                  value={formData.colorCode}
                  onChange={(e) => setFormData({...formData, colorCode: e.target.value})}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="features" className="space-y-4">
            <div>
              <Label>Equipment</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {EQUIPMENT_OPTIONS.map(equipment => (
                  <label key={equipment} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.equipment.includes(equipment)}
                      onChange={() => handleEquipmentChange(equipment)}
                      className="rounded"
                    />
                    <span>{equipment}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Features</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {FEATURES_OPTIONS.map(feature => (
                  <label key={feature} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.features.includes(feature)}
                      onChange={() => handleFeaturesChange(feature)}
                      className="rounded"
                    />
                    <span>{feature}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                  className="rounded"
                />
                <span>Show on public map</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isAccessible}
                  onChange={(e) => setFormData({...formData, isAccessible: e.target.checked})}
                  className="rounded"
                />
                <span>Wheelchair accessible</span>
              </label>
            </div>
          </TabsContent>
          
          <TabsContent value="safety" className="space-y-4">
            <div>
              <Label htmlFor="emergencyInfo">Emergency Information</Label>
              <Textarea
                id="emergencyInfo"
                value={formData.emergencyInfo}
                onChange={(e) => setFormData({...formData, emergencyInfo: e.target.value})}
                placeholder="Emergency procedures, exit routes, etc."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="accessibilityInfo">Accessibility Information</Label>
              <Textarea
                id="accessibilityInfo"
                value={formData.accessibilityInfo}
                onChange={(e) => setFormData({...formData, accessibilityInfo: e.target.value})}
                placeholder="Accessibility features and information"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="maintenanceNotes">Maintenance Notes</Label>
              <Textarea
                id="maintenanceNotes"
                value={formData.maintenanceNotes}
                onChange={(e) => setFormData({...formData, maintenanceNotes: e.target.value})}
                placeholder="Maintenance history and notes"
                rows={3}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : room ? "Update Room" : "Create Room"}
          </Button>
        </div>
      </form>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Room & Facility Management</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <i className="fas fa-plus mr-2"></i>
              Add Room/Facility
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Room/Facility</DialogTitle>
            </DialogHeader>
            <RoomForm 
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <Input
          placeholder="Search rooms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ROOM_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((room) => {
          const typeInfo = getRoomTypeInfo(room.type || "");
          return (
            <Card key={room.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <i className={`${typeInfo.icon} text-sm`} style={{ color: typeInfo.color }}></i>
                    <span>{room.roomNumber}</span>
                  </CardTitle>
                  <Badge variant="secondary" style={{ backgroundColor: `${typeInfo.color}20`, color: typeInfo.color }}>
                    {typeInfo.label}
                  </Badge>
                </div>
                {room.name && <p className="text-sm text-muted-foreground">{room.nameEn || room.name}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <div><strong>Floor:</strong> {room.floor}</div>
                  {room.capacity && <div><strong>Capacity:</strong> {room.capacity}</div>}
                  {room.subType && <div><strong>Sub Type:</strong> {room.subType}</div>}
                </div>
                
                {room.equipment && room.equipment.length > 0 && (
                  <div>
                    <strong className="text-sm">Equipment:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {room.equipment.slice(0, 3).map((eq, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {eq}
                        </Badge>
                      ))}
                      {room.equipment.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{room.equipment.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {room.features && room.features.length > 0 && (
                  <div>
                    <strong className="text-sm">Features:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {room.features.slice(0, 2).map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {room.features.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{room.features.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2">
                  <Dialog open={isEditDialogOpen && selectedRoom?.id === room.id} onOpenChange={(open) => {
                    setIsEditDialogOpen(open);
                    if (!open) setSelectedRoom(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedRoom(room)}
                      >
                        <i className="fas fa-edit mr-1"></i>
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Room/Facility</DialogTitle>
                      </DialogHeader>
                      <RoomForm 
                        room={selectedRoom}
                        onSubmit={(data) => updateMutation.mutate({ id: selectedRoom!.id, data })}
                        isLoading={updateMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this room?")) {
                        deleteMutation.mutate(room.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <i className="fas fa-trash mr-1"></i>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-12">
          <i className="fas fa-search text-4xl text-muted-foreground mb-4"></i>
          <p className="text-muted-foreground">No rooms found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}