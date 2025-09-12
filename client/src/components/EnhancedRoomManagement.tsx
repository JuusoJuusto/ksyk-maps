import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Filter,
  Monitor,
  Wifi,
  Users,
  Book,
  Calendar,
  Settings,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Room, Building as BuildingType } from "@shared/schema";

interface RoomFormData {
  buildingId: string;
  roomNumber: string;
  name: string;
  nameEn: string;
  nameFi: string;
  floor: number;
  capacity: number;
  type: string;
  equipment: string[];
  isAccessible: boolean;
  isActive: boolean;
}

export function EnhancedRoomManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    retry: false,
  });

  const { data: buildings = [] } = useQuery<BuildingType[]>({
    queryKey: ["/api/buildings"],
    retry: false,
  });

  const [formData, setFormData] = useState<RoomFormData>({
    buildingId: '',
    roomNumber: '',
    name: '',
    nameEn: '',
    nameFi: '',
    floor: 1,
    capacity: 20,
    type: 'classroom',
    equipment: [],
    isAccessible: true,
    isActive: true
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: RoomFormData) => {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create room');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setShowAddDialog(false);
      resetForm();
      toast({
        title: "Room Created",
        description: "New classroom has been added successfully",
      });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RoomFormData> }) => {
      const response = await fetch(`/api/rooms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update room');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setEditingRoom(null);
      resetForm();
      toast({
        title: "Room Updated",
        description: "Classroom information has been updated successfully",
      });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/rooms/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete room');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Room Deleted",
        description: "Classroom has been removed successfully",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      buildingId: '',
      roomNumber: '',
      name: '',
      nameEn: '',
      nameFi: '',
      floor: 1,
      capacity: 20,
      type: 'classroom',
      equipment: [],
      accessibility: true,
      bookingEnabled: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoom) {
      updateRoomMutation.mutate({ id: editingRoom.id, data: formData });
    } else {
      createRoomMutation.mutate(formData);
    }
  };

  const startEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      buildingId: room.buildingId,
      roomNumber: room.roomNumber,
      name: room.name || '',
      nameEn: room.nameEn || '',
      nameFi: room.nameFi || '',
      floor: room.floor || 1,
      capacity: room.capacity || 20,
      type: room.type || 'classroom',
      equipment: room.equipment || [],
      isAccessible: room.isAccessible || true,
      isActive: room.isActive || true
    });
    setShowAddDialog(true);
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.nameFi?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBuilding = selectedBuilding === 'all' || room.buildingId === selectedBuilding;
    const matchesFloor = selectedFloor === 'all' || room.floor.toString() === selectedFloor;
    return matchesSearch && matchesBuilding && matchesFloor;
  });

  const roomTypes = [
    { value: 'classroom', label: 'Classroom', icon: Book },
    { value: 'laboratory', label: 'Laboratory', icon: Settings },
    { value: 'office', label: 'Office', icon: Users },
    { value: 'auditorium', label: 'Auditorium', icon: Monitor },
    { value: 'library', label: 'Library', icon: Book },
    { value: 'gymnasium', label: 'Gymnasium', icon: Users },
    { value: 'cafeteria', label: 'Cafeteria', icon: Users },
    { value: 'meeting', label: 'Meeting Room', icon: Users },
  ];

  const equipmentOptions = [
    'Projector', 'Whiteboard', 'Smart Board', 'Computers', 'WiFi', 
    'Audio System', 'Video Conference', 'Laboratory Equipment', 
    'Musical Instruments', 'Sports Equipment', 'Art Supplies'
  ];

  const getFloors = () => {
    const floors = [...new Set(rooms.map(room => room.floor))].sort((a, b) => a - b);
    return floors;
  };

  const getRoomStats = () => {
    const stats = {
      total: rooms.length,
      byType: {} as Record<string, number>,
      byBuilding: {} as Record<string, number>,
      withBooking: rooms.filter(r => r.bookingEnabled).length,
      accessible: rooms.filter(r => r.accessibility).length
    };

    rooms.forEach(room => {
      const type = room.type || 'classroom';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      
      const building = buildings.find(b => b.id === room.buildingId);
      if (building) {
        stats.byBuilding[building.name] = (stats.byBuilding[building.name] || 0) + 1;
      }
    });

    return stats;
  };

  const stats = getRoomStats();

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Enhanced Classroom Management</h2>
          <p className="text-muted-foreground">Comprehensive room and classroom administration</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="add-room-button">
              <Plus className="w-4 h-4 mr-2" />
              Add New Room
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRoom ? 'Edit Room' : 'Add New Room'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="building">Building</Label>
                  <Select value={formData.buildingId} onValueChange={(value) => setFormData({...formData, buildingId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select building" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.name} - {building.nameEn}
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
                    placeholder="e.g., K15"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nameEn">Name (English)</Label>
                  <Input
                    id="nameEn"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({...formData, nameEn: e.target.value})}
                    placeholder="Physics Laboratory"
                  />
                </div>
                
                <div>
                  <Label htmlFor="nameFi">Name (Finnish)</Label>
                  <Input
                    id="nameFi"
                    value={formData.nameFi}
                    onChange={(e) => setFormData({...formData, nameFi: e.target.value})}
                    placeholder="Fysiikan laboratorio"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    type="number"
                    value={formData.floor}
                    onChange={(e) => setFormData({...formData, floor: parseInt(e.target.value)})}
                    min="1"
                    max="10"
                  />
                </div>
                
                <div>
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                    min="1"
                    max="500"
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Room Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.accessibility}
                    onChange={(e) => setFormData({...formData, accessibility: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Wheelchair Accessible</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.bookingEnabled}
                    onChange={(e) => setFormData({...formData, bookingEnabled: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Booking Enabled</span>
                </label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={createRoomMutation.isPending || updateRoomMutation.isPending}
                >
                  {editingRoom ? 'Update Room' : 'Create Room'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowAddDialog(false);
                    setEditingRoom(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Rooms</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.withBooking}</p>
                <p className="text-sm text-muted-foreground">Bookable</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.accessible}</p>
                <p className="text-sm text-muted-foreground">Accessible</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Book className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.byType.classroom || 0}</p>
                <p className="text-sm text-muted-foreground">Classrooms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by room number or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="room-search"
                />
              </div>
            </div>
            
            <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Buildings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buildings</SelectItem>
                {buildings.map((building) => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedFloor} onValueChange={setSelectedFloor}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Floors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Floors</SelectItem>
                {getFloors().map((floor) => (
                  <SelectItem key={floor} value={floor.toString()}>
                    Floor {floor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((room) => {
          const building = buildings.find(b => b.id === room.buildingId);
          const roomType = roomTypes.find(t => t.value === room.type) || roomTypes[0];
          
          return (
            <Card key={room.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{room.roomNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {building?.name} - Floor {room.floor}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {roomType.label}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium text-sm">{room.nameEn}</p>
                  <p className="text-sm text-muted-foreground">{room.nameFi}</p>
                </div>
                
                <div className="flex gap-2 text-xs">
                  <Badge variant="secondary">
                    <Users className="w-3 h-3 mr-1" />
                    {room.capacity || 'N/A'}
                  </Badge>
                  
                  {room.accessibility && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Accessible
                    </Badge>
                  )}
                  
                  {room.bookingEnabled && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <Calendar className="w-3 h-3 mr-1" />
                      Bookable
                    </Badge>
                  )}
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => startEdit(room)}
                    data-testid={`edit-room-${room.roomNumber}`}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (confirm(`Delete room ${room.roomNumber}?`)) {
                        deleteRoomMutation.mutate(room.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-700"
                    data-testid={`delete-room-${room.roomNumber}`}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredRooms.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No rooms found matching your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}