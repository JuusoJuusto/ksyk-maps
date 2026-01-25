import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import AnnouncementManager from "@/components/AnnouncementManager";
import UltimateKSYKBuilder from "@/components/UltimateKSYKBuilder";
import AppSettingsManager from "@/components/AppSettingsManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  Users, 
  Calendar, 
  Megaphone, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  X,
  MapPin,
  Clock,
  AlertTriangle,
  Layers,
  MessageSquare
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
  isActive: boolean;
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  position?: string;
  department?: string;
  isActive: boolean;
}

interface Announcement {
  id: string;
  title: string;
  titleEn?: string;
  titleFi?: string;
  content: string;
  contentEn?: string;
  contentFi?: string;
  priority: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
}

// BuildingCard Component - Extracted to fix React Hooks rules
function BuildingCard({ 
  building, 
  rooms, 
  queryClient,
  setActiveTab,
  setBuilderMode,
  setEditingRoom
}: { 
  building: Building;
  rooms: Room[];
  queryClient: QueryClient;
  setActiveTab: (tab: string) => void;
  setBuilderMode: (mode: 'buildings' | 'rooms' | 'hallways') => void;
  setEditingRoom: (room: any) => void;
}) {
  const buildingRooms = rooms.filter((r: Room) => r.buildingId === building.id);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: building.name,
    nameEn: building.nameEn || '',
    nameFi: building.nameFi || '',
    floors: building.floors,
    capacity: building.capacity || 0,
    colorCode: building.colorCode,
    description: building.description || ''
  });

  return (
    <Card className="border-2 hover:shadow-lg transition-all">
      <CardContent className="p-6">
        {/* Building Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4 flex-1">
            <div 
              className="w-16 h-16 rounded-xl shadow-lg flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: building.colorCode }}
            >
              {building.name}
            </div>
            <div className="flex-1">
              {!isEditing ? (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{building.name}</h3>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      {building.nameEn || 'No English name'}
                    </Badge>
                    {building.nameFi && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        {building.nameFi}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Layers className="h-4 w-4" />
                      <span className="font-semibold">{building.floors}</span> floors
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span className="font-semibold">{building.capacity || 'N/A'}</span> capacity
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span className="font-semibold">{buildingRooms.length}</span> rooms
                    </div>
                    {building.mapPositionX && building.mapPositionY && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <span className="text-xs">Position: ({building.mapPositionX}, {building.mapPositionY})</span>
                      </div>
                    )}
                  </div>
                  {building.description && (
                    <p className="text-sm text-gray-600 mt-2">{building.description}</p>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-bold">Building Code *</Label>
                      <Input
                        value={editData.name}
                        onChange={(e) => setEditData({...editData, name: e.target.value})}
                        placeholder="M, K, L"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">English Name</Label>
                      <Input
                        value={editData.nameEn}
                        onChange={(e) => setEditData({...editData, nameEn: e.target.value})}
                        placeholder="Music Building"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Finnish Name</Label>
                      <Input
                        value={editData.nameFi}
                        onChange={(e) => setEditData({...editData, nameFi: e.target.value})}
                        placeholder="Musiikkitalo"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-bold">Floors</Label>
                      <Input
                        type="number"
                        min="1"
                        value={editData.floors}
                        onChange={(e) => setEditData({...editData, floors: parseInt(e.target.value) || 1})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Capacity</Label>
                      <Input
                        type="number"
                        min="0"
                        value={editData.capacity}
                        onChange={(e) => setEditData({...editData, capacity: parseInt(e.target.value) || 0})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Color</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={editData.colorCode}
                          onChange={(e) => setEditData({...editData, colorCode: e.target.value})}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={editData.colorCode}
                          onChange={(e) => setEditData({...editData, colorCode: e.target.value})}
                          placeholder="#3B82F6"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Description</Label>
                    <Textarea
                      value={editData.description}
                      onChange={(e) => setEditData({...editData, description: e.target.value})}
                      placeholder="Building description..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="hover:bg-blue-50 hover:border-blue-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="hover:bg-green-50 hover:border-green-300"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  {isExpanded ? 'Hide' : 'Show'} Rooms ({buildingRooms.length})
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm(`Delete building ${building.name}? This will also delete all ${buildingRooms.length} rooms in this building.`)) return;
                    try {
                      const response = await fetch(`/api/buildings/${building.id}`, {
                        method: 'DELETE',
                        credentials: 'include'
                      });
                      if (response.ok) {
                        alert('Building deleted successfully!');
                        queryClient.invalidateQueries({ queryKey: ["buildings"] });
                        queryClient.invalidateQueries({ queryKey: ["rooms"] });
                      } else {
                        alert('Failed to delete building');
                      }
                    } catch (error) {
                      console.error('Error deleting building:', error);
                      alert('Error deleting building');
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      name: building.name,
                      nameEn: building.nameEn || '',
                      nameFi: building.nameFi || '',
                      floors: building.floors,
                      capacity: building.capacity || 0,
                      colorCode: building.colorCode,
                      description: building.description || ''
                    });
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/buildings/${building.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(editData)
                      });
                      if (response.ok) {
                        alert('Building updated successfully!');
                        queryClient.invalidateQueries({ queryKey: ["buildings"] });
                        setIsEditing(false);
                      } else {
                        alert('Failed to update building');
                      }
                    } catch (error) {
                      console.error('Error updating building:', error);
                      alert('Error updating building');
                    }
                  }}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Rooms Section */}
        {isExpanded && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                Rooms in {building.name}
              </h4>
              <Button 
                size="sm"
                onClick={() => {
                  setActiveTab('ksyk-builder');
                  setBuilderMode('rooms');
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Room
              </Button>
            </div>
            
            {buildingRooms.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">No rooms in this building yet</p>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    setActiveTab('ksyk-builder');
                    setBuilderMode('rooms');
                  }}
                >
                  Add First Room
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {buildingRooms.map((room: Room) => (
                  <div 
                    key={room.id} 
                    className="border rounded-lg p-3 hover:shadow-md transition-all bg-white"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {room.roomNumber}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{room.roomNumber}</p>
                          <p className="text-xs text-gray-500">Floor {room.floor}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {room.type}
                      </Badge>
                    </div>
                    {(room.name || room.nameEn) && (
                      <p className="text-xs text-gray-600 mb-2">
                        {room.name || room.nameEn}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Capacity: {room.capacity || 'N/A'}</span>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setActiveTab('ksyk-builder');
                            setBuilderMode('rooms');
                            setEditingRoom(room);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={async () => {
                            if (!confirm(`Delete room ${room.roomNumber}?`)) return;
                            try {
                              const response = await fetch(`/api/rooms/${room.id}`, {
                                method: 'DELETE',
                                credentials: 'include'
                              });
                              if (response.ok) {
                                queryClient.invalidateQueries({ queryKey: ["rooms"] });
                              } else {
                                alert('Failed to delete room');
                              }
                            } catch (error) {
                              console.error('Error deleting room:', error);
                              alert('Error deleting room');
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    titleEn: "",
    titleFi: "",
    content: "",
    contentEn: "",
    contentFi: "",
    priority: "normal",
    publishDate: new Date().toISOString().slice(0, 16), // datetime-local format
    expiresAt: "" // optional expiry date
  });
  
  // User management state
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "admin",
    password: "",
    passwordOption: "manual" // "manual" or "email"
  });
  const [showUserForm, setShowUserForm] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [viewingPassword, setViewingPassword] = useState<string | null>(null);
  
  // Staff management state
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [newStaff, setNewStaff] = useState<any>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
    positionEn: "",
    positionFi: "",
    department: "",
    departmentEn: "",
    departmentFi: "",
    bio: "",
    bioEn: "",
    bioFi: "",
    isActive: true
  });
  
  // Get current user from localStorage
  const getCurrentUser = () => {
    try {
      const storedUser = localStorage.getItem('ksyk_admin_user');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  };
  
  const currentUser = getCurrentUser();
  const isOwner = currentUser?.email === "JuusoJuusto112@gmail.com" || currentUser?.id === "owner-admin-user";
  const isAdmin = currentUser?.role === "admin" || isOwner; // Admin or owner
  
  // Builder state
  const [builderMode, setBuilderMode] = useState<'buildings' | 'rooms' | 'hallways'>('buildings');
  const [showBuilderForm, setShowBuilderForm] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<any>(null);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [editingHallway, setEditingHallway] = useState<any>(null);
  const [newBuilding, setNewBuilding] = useState({
    name: '',
    nameEn: '',
    nameFi: '',
    floors: 1,
    capacity: 0,
    colorCode: '#3B82F6',
    mapPositionX: 100,
    mapPositionY: 100
  });
  const [newRoom, setNewRoom] = useState({
    buildingId: '',
    roomNumber: '',
    name: '',
    nameEn: '',
    nameFi: '',
    floor: 1,
    capacity: 0,
    type: 'classroom',
    mapPositionX: 0,
    mapPositionY: 0
  });
  const [newHallway, setNewHallway] = useState({
    buildingId: '',
    floorId: '',
    name: '',
    nameEn: '',
    nameFi: '',
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    width: 2,
    colorCode: '#9CA3AF'
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

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const response = await fetch("/api/staff");
      if (!response.ok) throw new Error("Failed to fetch staff");
      return response.json();
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const response = await fetch("/api/announcements?limit=50");
      if (!response.ok) throw new Error("Failed to fetch announcements");
      return response.json();
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const response = await fetch("/api/tickets", { credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch tickets");
      return response.json();
    },
  });

  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcement: any) => {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(announcement),
      });
      if (!response.ok) throw new Error("Failed to create announcement");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setNewAnnouncement({
        title: "",
        titleEn: "",
        titleFi: "",
        content: "",
        contentEn: "",
        contentFi: "",
        priority: "normal",
        publishDate: new Date().toISOString().slice(0, 16),
        expiresAt: ""
      });
    },
  });

  // Update announcement mutation
  const updateAnnouncementMutation = useMutation({
    mutationFn: async ({ id, ...announcement }: any) => {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(announcement),
      });
      if (!response.ok) throw new Error("Failed to update announcement");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setEditingAnnouncement(null);
    },
  });

  // Delete announcement mutation
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete announcement");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  // Staff mutations
  const createStaffMutation = useMutation({
    mutationFn: async (staff: any) => {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(staff),
      });
      if (!response.ok) throw new Error("Failed to create staff member");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setShowStaffForm(false);
      setNewStaff({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        position: "",
        positionEn: "",
        positionFi: "",
        department: "",
        departmentEn: "",
        departmentFi: "",
        bio: "",
        bioEn: "",
        bioFi: "",
        isActive: true
      });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, ...staff }: any) => {
      const response = await fetch(`/api/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(staff),
      });
      if (!response.ok) throw new Error("Failed to update staff member");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setEditingStaff(null);
      setShowStaffForm(false);
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/staff/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete staff member");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });

  const handleCreateAnnouncement = () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      alert("Please fill in title and content");
      return;
    }
    createAnnouncementMutation.mutate(newAnnouncement);
  };

  const handleUpdateAnnouncement = () => {
    if (!editingAnnouncement) return;
    updateAnnouncementMutation.mutate(editingAnnouncement);
  };

  const handleCreateStaff = () => {
    if (!newStaff.firstName || !newStaff.lastName) {
      alert("Please fill in first name and last name");
      return;
    }
    createStaffMutation.mutate(newStaff);
  };

  const handleUpdateStaff = () => {
    if (!editingStaff) return;
    updateStaffMutation.mutate(editingStaff);
  };

  const handleDeleteStaff = (id: string, name: string) => {
    if (!confirm(`Delete staff member ${name}?`)) return;
    deleteStaffMutation.mutate(id);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "normal": return "bg-blue-100 text-blue-800 border-blue-200";
      case "low": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const stats = [
    {
      title: "Buildings",
      value: buildings.length,
      icon: Building,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Rooms",
      value: rooms.length,
      icon: MapPin,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Staff Members",
      value: staff.length,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Announcements",
      value: announcements.filter((a: Announcement) => a.isActive).length,
      icon: Megaphone,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-lg border-0 hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor} shadow-md`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="ksyk-builder">KSYK Builder</TabsTrigger>
          <TabsTrigger value="buildings">Buildings</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>
                Quick overview of your KSYK campus management system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Welcome to the KSYK Admin Dashboard. Here you can manage buildings, rooms, staff, and announcements.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Recent Activity</h3>
                    <p className="text-sm text-muted-foreground">
                      System is running smoothly. All services are operational.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Quick Actions</h3>
                    <div className="space-y-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setActiveTab("announcements")}
                      >
                        Create Announcement
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setActiveTab("rooms")}
                      >
                        Manage Rooms
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          {!isOwner ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Owner Access Only</h3>
                <p className="text-gray-500">User management is restricted to the owner account for security.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>User Management (Owner Only)</CardTitle>
                    <CardDescription>
                      Add and manage users in the system. Roles: visitor, user, admin, owner.
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setShowUserForm(true);
                      setEditingUser(null);
                      setNewUser({ email: "", firstName: "", lastName: "", role: "admin", password: "", passwordOption: "manual" });
                      setShowPasswordField(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* User Form */}
                  {showUserForm && (
                    <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-blue-900">
                          {editingUser ? "Edit User" : "Add New User"}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowUserForm(false);
                            setEditingUser(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>First Name</Label>
                          <Input
                            value={editingUser ? editingUser.firstName : newUser.firstName}
                            onChange={(e) => editingUser 
                              ? setEditingUser({...editingUser, firstName: e.target.value})
                              : setNewUser({...newUser, firstName: e.target.value})
                            }
                            placeholder="John"
                          />
                        </div>
                        <div>
                          <Label>Last Name</Label>
                          <Input
                            value={editingUser ? editingUser.lastName : newUser.lastName}
                            onChange={(e) => editingUser 
                              ? setEditingUser({...editingUser, lastName: e.target.value})
                              : setNewUser({...newUser, lastName: e.target.value})
                            }
                            placeholder="Doe"
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={editingUser ? editingUser.email : newUser.email}
                            onChange={(e) => editingUser 
                              ? setEditingUser({...editingUser, email: e.target.value})
                              : setNewUser({...newUser, email: e.target.value})
                            }
                            placeholder="john@example.com"
                          />
                        </div>
                        <div>
                          <Label>Role</Label>
                          <select
                            className="w-full border rounded-md px-3 py-2"
                            value={editingUser ? editingUser.role : newUser.role}
                            onChange={(e) => editingUser 
                              ? setEditingUser({...editingUser, role: e.target.value})
                              : setNewUser({...newUser, role: e.target.value})
                            }
                          >
                            <option value="visitor">Visitor</option>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                          </select>
                        </div>
                        {!editingUser && (
                          <>
                            <div className="col-span-2">
                              <Label className="mb-3 block">Password Setup</Label>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-4">
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="passwordOption"
                                      value="manual"
                                      checked={newUser.passwordOption === "manual"}
                                      onChange={(e) => setNewUser({...newUser, passwordOption: e.target.value, password: ""})}
                                      className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm font-medium">Set password manually</span>
                                  </label>
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="passwordOption"
                                      value="email"
                                      checked={newUser.passwordOption === "email"}
                                      onChange={(e) => setNewUser({...newUser, passwordOption: e.target.value, password: ""})}
                                      className="w-4 h-4 text-blue-600"
                                    />
                                    <span className="text-sm font-medium">Send email invitation</span>
                                  </label>
                                </div>
                                
                                {newUser.passwordOption === "manual" && (
                                  <div>
                                    <Input
                                      type="password"
                                      value={newUser.password}
                                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                      placeholder="Enter password"
                                      className="mt-2"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      User will use this password to login
                                    </p>
                                  </div>
                                )}
                                
                                {newUser.passwordOption === "email" && (
                                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                    <p className="text-sm text-blue-800">
                                      📧 An email will be sent to <strong>{newUser.email || "the user"}</strong> with instructions to set their password.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {editingUser && (
                          <div className="col-span-2">
                            <div className="flex items-center justify-between mb-2">
                              <Label>Password</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPasswordField(!showPasswordField)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                {showPasswordField ? "Hide" : "Change Password"}
                              </Button>
                            </div>
                            {showPasswordField && (
                              <div className="space-y-2">
                                <Input
                                  type="password"
                                  placeholder="Enter new password"
                                  onChange={(e) => setEditingUser({...editingUser, newPassword: e.target.value})}
                                />
                                <p className="text-xs text-gray-500">
                                  Leave empty to keep current password
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowUserForm(false);
                            setEditingUser(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={async () => {
                            try {
                              if (editingUser) {
                                // Update user
                                const response = await fetch(`/api/users/${editingUser.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(editingUser)
                                });
                                
                                if (!response.ok) {
                                  const error = await response.json();
                                  throw new Error(error.message || 'Failed to update user');
                                }
                                
                                alert('User updated successfully!');
                                queryClient.invalidateQueries({ queryKey: ["users"] });
                                setShowUserForm(false);
                                setEditingUser(null);
                              } else {
                                // Create user
                                if (!newUser.email || !newUser.firstName || !newUser.lastName) {
                                  alert('Please fill in all required fields');
                                  return;
                                }
                                
                                if (newUser.passwordOption === 'manual' && !newUser.password) {
                                  alert('Please enter a password or choose email invitation');
                                  return;
                                }
                                
                                const response = await fetch('/api/users', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(newUser)
                                });
                                
                                if (!response.ok) {
                                  const error = await response.json();
                                  throw new Error(error.message || 'Failed to create user');
                                }
                                
                                const result = await response.json();
                                
                                const message = newUser.passwordOption === 'email' 
                                  ? `✅ User created successfully!\n\n📧 Email invitation sent to: ${newUser.email}\n\nThe user will receive their login credentials via email.`
                                  : 'User created successfully!';
                                  
                                alert(message);
                                queryClient.invalidateQueries({ queryKey: ["users"] });
                                setShowUserForm(false);
                                setNewUser({ email: "", firstName: "", lastName: "", role: "admin", password: "", passwordOption: "manual" });
                              }
                            } catch (error: any) {
                              alert(`Error: ${error.message}`);
                            }
                          }}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {editingUser ? "Update User" : "Create User"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Password Viewer Modal */}
                  {viewingPassword && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">User Password</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingPassword(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4">
                          <p className="text-sm text-gray-600 mb-2">Email:</p>
                          <p className="font-mono text-sm font-semibold text-gray-900 mb-4">
                            {users.find((u: any) => u.id === viewingPassword)?.email}
                          </p>
                          <p className="text-sm text-gray-600 mb-2">Password:</p>
                          <p className="font-mono text-lg font-bold text-blue-600 bg-blue-50 p-3 rounded border border-blue-200">
                            {users.find((u: any) => u.id === viewingPassword)?.password || "No password set"}
                          </p>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <p className="text-xs text-yellow-800">
                            ⚠️ Keep this password secure. Share it only with the intended user.
                          </p>
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button
                            onClick={() => setViewingPassword(null)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Users Table */}
                  <div className="border rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {users.map((user: any) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="capitalize">
                                {user.role}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            </td>
                            <td className="px-4 py-3">
                              {user.email !== "JuusoJuusto112@gmail.com" && (
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingUser(user);
                                      setShowUserForm(true);
                                      setShowPasswordField(false);
                                    }}
                                    title="Edit user"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-700"
                                    onClick={() => setViewingPassword(user.id)}
                                    title="View password"
                                  >
                                    👁️
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={async () => {
                                      if (confirm(`Delete user ${user.email}?\n\nThis action cannot be undone.`)) {
                                        try {
                                          const response = await fetch(`/api/users/${user.id}`, {
                                            method: 'DELETE'
                                          });
                                          
                                          if (!response.ok) {
                                            const error = await response.json();
                                            throw new Error(error.message || 'Failed to delete user');
                                          }
                                          
                                          alert('User deleted successfully!');
                                          queryClient.invalidateQueries({ queryKey: ["users"] });
                                        } catch (error: any) {
                                          alert(`Error: ${error.message}`);
                                        }
                                      }
                                    }}
                                    title="Delete user"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                              {user.email === "JuusoJuusto112@gmail.com" && (
                                <Badge className="bg-yellow-100 text-yellow-800">Owner</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                              No users found. Click "Add User" to create one.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Owner Account Information</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p><strong>Email:</strong> JuusoJuusto112@gmail.com</p>
                      <p><strong>Name:</strong> Juuso Kaikula</p>
                      <p><strong>Role:</strong> Owner/Admin</p>
                      <p className="text-xs text-blue-600 mt-2">
                        This account is hardcoded and cannot be edited or deleted.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                    Support Tickets
                  </CardTitle>
                  <CardDescription>
                    View, manage, and respond to support tickets from users
                  </CardDescription>
                </div>
                <div className="flex gap-3">
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 px-3 py-1">
                    {tickets.filter((t: any) => t.status === 'pending').length} Pending
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1">
                    {tickets.filter((t: any) => t.status === 'in_progress').length} In Progress
                  </Badge>
                  <Badge className="bg-green-100 text-green-800 border-green-200 px-3 py-1">
                    {tickets.filter((t: any) => t.status === 'resolved').length} Resolved
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <MessageSquare className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Tickets Yet</h3>
                  <p className="text-gray-500">Support tickets will appear here when users submit them.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.map((ticket: any) => {
                    const [isExpanded, setIsExpanded] = useState(false);
                    const [response, setResponse] = useState('');
                    const [isSending, setIsSending] = useState(false);
                    
                    return (
                      <div key={ticket.id} className="border-2 rounded-lg p-4 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 rounded-lg ${
                              ticket.type === 'bug' ? 'bg-red-100' :
                              ticket.type === 'feature' ? 'bg-blue-100' :
                              'bg-gray-100'
                            }`}>
                              {ticket.type === 'bug' ? '🐛' :
                               ticket.type === 'feature' ? '✨' :
                               '💬'}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg">{ticket.title}</h3>
                                <select
                                  value={ticket.status}
                                  onChange={async (e) => {
                                    try {
                                      const response = await fetch(`/api/tickets/${ticket.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        credentials: 'include',
                                        body: JSON.stringify({ status: e.target.value })
                                      });
                                      
                                      if (response.ok) {
                                        queryClient.invalidateQueries({ queryKey: ["tickets"] });
                                      } else {
                                        alert('Failed to update status');
                                      }
                                    } catch (error) {
                                      console.error('Error updating status:', error);
                                      alert('Error updating status');
                                    }
                                  }}
                                  className={`text-xs px-2 py-1 rounded border ${
                                    ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                    ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                    ticket.status === 'resolved' ? 'bg-green-100 text-green-800 border-green-200' :
                                    'bg-gray-100 text-gray-800 border-gray-200'
                                  }`}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="resolved">Resolved</option>
                                  <option value="closed">Closed</option>
                                </select>
                                <Badge className={`text-xs ${
                                  ticket.priority === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                                  ticket.priority === 'normal' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                  'bg-gray-100 text-gray-800 border-gray-200'
                                }`}>
                                  {ticket.priority}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{ticket.description}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {ticket.name || 'Anonymous'}
                                </span>
                                {ticket.email && (
                                  <span className="flex items-center gap-1">
                                    📧 {ticket.email}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(ticket.createdAt).toLocaleDateString()}
                                </span>
                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                  {ticket.ticketId}
                                </span>
                              </div>
                              
                              {/* Response Section */}
                              {isExpanded && (
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                  <Label className="text-sm font-semibold mb-2 block">Send Response to User</Label>
                                  <Textarea
                                    value={response}
                                    onChange={(e) => setResponse(e.target.value)}
                                    placeholder="Type your response here..."
                                    rows={4}
                                    className="mb-3"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        if (!response.trim()) {
                                          alert('Please enter a response');
                                          return;
                                        }
                                        
                                        setIsSending(true);
                                        try {
                                          // Update ticket with response
                                          await fetch(`/api/tickets/${ticket.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            credentials: 'include',
                                            body: JSON.stringify({ 
                                              response: response,
                                              status: 'resolved'
                                            })
                                          });
                                          
                                          // Send email to user
                                          if (ticket.email) {
                                            await fetch('/api/send-ticket-response', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                email: ticket.email,
                                                ticketId: ticket.ticketId,
                                                title: ticket.title,
                                                response: response
                                              })
                                            });
                                          }
                                          
                                          queryClient.invalidateQueries({ queryKey: ["tickets"] });
                                          setResponse('');
                                          setIsExpanded(false);
                                          alert('Response sent successfully!');
                                        } catch (error) {
                                          console.error('Error sending response:', error);
                                          alert('Error sending response');
                                        } finally {
                                          setIsSending(false);
                                        }
                                      }}
                                      disabled={isSending}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      {isSending ? 'Sending...' : 'Send Response'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setIsExpanded(false);
                                        setResponse('');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIsExpanded(!isExpanded)}
                              className="hover:bg-blue-50"
                            >
                              {isExpanded ? 'Hide' : 'Respond'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={async () => {
                                if (!confirm(`Delete ticket ${ticket.ticketId}?`)) return;
                                
                                try {
                                  const response = await fetch(`/api/tickets/${ticket.id}`, {
                                    method: 'DELETE',
                                    credentials: 'include'
                                  });
                                  
                                  if (response.ok) {
                                    queryClient.invalidateQueries({ queryKey: ["tickets"] });
                                  } else {
                                    alert('Failed to delete ticket');
                                  }
                                } catch (error) {
                                  console.error('Error deleting ticket:', error);
                                  alert('Error deleting ticket');
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ksyk-builder" className="space-y-6">
          <UltimateKSYKBuilder />
        </TabsContent>

        <TabsContent value="builder" className="space-y-6">
          <Card className="border-2 border-blue-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardTitle className="text-2xl flex items-center">
                <Building className="mr-3 h-7 w-7" />
                🏗️ KSYK Interactive Builder
              </CardTitle>
              <CardDescription className="text-blue-100 text-lg">
                Create and manage buildings, rooms, and hallways with ease
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {/* Builder Mode Selector */}
              <div className="flex space-x-2 mb-6">
                <Button
                  onClick={() => setBuilderMode('buildings')}
                  className={builderMode === 'buildings' ? 'bg-blue-600' : 'bg-gray-400'}
                >
                  <Building className="mr-2 h-4 w-4" />
                  Buildings
                </Button>
                <Button
                  onClick={() => setBuilderMode('rooms')}
                  className={builderMode === 'rooms' ? 'bg-green-600' : 'bg-gray-400'}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Rooms
                </Button>
                <Button
                  onClick={() => setBuilderMode('hallways')}
                  className={builderMode === 'hallways' ? 'bg-purple-600' : 'bg-gray-400'}
                >
                  <Layers className="mr-2 h-4 w-4" />
                  Hallways
                </Button>
              </div>

              {/* Buildings Builder */}
              {builderMode === 'buildings' && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Side - Form and List */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold">Buildings ({buildings.length})</h3>
                      <Button
                        onClick={() => {
                          setShowBuilderForm(true);
                          setEditingBuilding(null);
                          setNewBuilding({
                            name: '',
                            nameEn: '',
                            nameFi: '',
                            floors: 1,
                            capacity: 0,
                            colorCode: '#3B82F6',
                            mapPositionX: 100,
                            mapPositionY: 100
                          });
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Building
                      </Button>
                    </div>

                  {showBuilderForm && (
                    <div className="border-2 border-blue-300 rounded-lg p-6 bg-blue-50">
                      <h4 className="text-lg font-semibold mb-4">
                        {editingBuilding ? 'Edit Building' : 'Create New Building'}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Building Code *</Label>
                          <Input
                            value={editingBuilding ? editingBuilding.name : newBuilding.name}
                            onChange={(e) => editingBuilding
                              ? setEditingBuilding({...editingBuilding, name: e.target.value})
                              : setNewBuilding({...newBuilding, name: e.target.value})
                            }
                            placeholder="M, K, L, etc."
                          />
                        </div>
                        <div>
                          <Label>English Name</Label>
                          <Input
                            value={editingBuilding ? editingBuilding.nameEn : newBuilding.nameEn}
                            onChange={(e) => editingBuilding
                              ? setEditingBuilding({...editingBuilding, nameEn: e.target.value})
                              : setNewBuilding({...newBuilding, nameEn: e.target.value})
                            }
                            placeholder="Music Building"
                          />
                        </div>
                        <div>
                          <Label>Finnish Name</Label>
                          <Input
                            value={editingBuilding ? editingBuilding.nameFi : newBuilding.nameFi}
                            onChange={(e) => editingBuilding
                              ? setEditingBuilding({...editingBuilding, nameFi: e.target.value})
                              : setNewBuilding({...newBuilding, nameFi: e.target.value})
                            }
                            placeholder="Musiikkitalo"
                          />
                        </div>
                        <div>
                          <Label>Number of Floors</Label>
                          <Input
                            type="number"
                            value={editingBuilding ? editingBuilding.floors : newBuilding.floors}
                            onChange={(e) => editingBuilding
                              ? setEditingBuilding({...editingBuilding, floors: parseInt(e.target.value)})
                              : setNewBuilding({...newBuilding, floors: parseInt(e.target.value)})
                            }
                          />
                        </div>
                        <div>
                          <Label>Capacity</Label>
                          <Input
                            type="number"
                            value={editingBuilding ? editingBuilding.capacity : newBuilding.capacity}
                            onChange={(e) => editingBuilding
                              ? setEditingBuilding({...editingBuilding, capacity: parseInt(e.target.value)})
                              : setNewBuilding({...newBuilding, capacity: parseInt(e.target.value)})
                            }
                          />
                        </div>
                        <div>
                          <Label>Color</Label>
                          <Input
                            type="color"
                            value={editingBuilding ? editingBuilding.colorCode : newBuilding.colorCode}
                            onChange={(e) => editingBuilding
                              ? setEditingBuilding({...editingBuilding, colorCode: e.target.value})
                              : setNewBuilding({...newBuilding, colorCode: e.target.value})
                            }
                          />
                        </div>
                        <div>
                          <Label>Map Position X</Label>
                          <Input
                            type="number"
                            value={editingBuilding ? editingBuilding.mapPositionX : newBuilding.mapPositionX}
                            onChange={(e) => editingBuilding
                              ? setEditingBuilding({...editingBuilding, mapPositionX: parseInt(e.target.value)})
                              : setNewBuilding({...newBuilding, mapPositionX: parseInt(e.target.value)})
                            }
                          />
                        </div>
                        <div>
                          <Label>Map Position Y</Label>
                          <Input
                            type="number"
                            value={editingBuilding ? editingBuilding.mapPositionY : newBuilding.mapPositionY}
                            onChange={(e) => editingBuilding
                              ? setEditingBuilding({...editingBuilding, mapPositionY: parseInt(e.target.value)})
                              : setNewBuilding({...newBuilding, mapPositionY: parseInt(e.target.value)})
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button variant="outline" onClick={() => {
                          setShowBuilderForm(false);
                          setEditingBuilding(null);
                        }}>
                          Cancel
                        </Button>
                        <Button
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={async () => {
                            try {
                              const data = editingBuilding || newBuilding;
                              const url = editingBuilding ? `/api/buildings/${editingBuilding.id}` : '/api/buildings';
                              const method = editingBuilding ? 'PUT' : 'POST';
                              
                              const response = await fetch(url, {
                                method,
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(data)
                              });
                              
                              if (!response.ok) throw new Error('Failed to save building');
                              
                              alert(editingBuilding ? 'Building updated!' : 'Building created!');
                              queryClient.invalidateQueries({ queryKey: ["buildings"] });
                              setShowBuilderForm(false);
                              setEditingBuilding(null);
                            } catch (error: any) {
                              alert(`Error: ${error.message}`);
                            }
                          }}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {editingBuilding ? 'Update' : 'Create'} Building
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Buildings List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {buildings.map((building: Building) => (
                      <div key={building.id} className="border-2 rounded-lg p-4 hover:shadow-lg transition-shadow" style={{ borderColor: building.colorCode }}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: building.colorCode }}>
                              {building.name}
                            </div>
                            <div>
                              <h4 className="font-bold text-lg">{building.nameEn || building.name}</h4>
                              <p className="text-sm text-gray-600">{building.floors} floors • {building.capacity || 0} capacity</p>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingBuilding(building);
                                setShowBuilderForm(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={async () => {
                                if (confirm(`Delete building ${building.name}?`)) {
                                  try {
                                    await fetch(`/api/buildings/${building.id}`, { method: 'DELETE' });
                                    alert('Building deleted!');
                                    queryClient.invalidateQueries({ queryKey: ["buildings"] });
                                  } catch (error) {
                                    alert('Failed to delete building');
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>

                  {/* Right Side - Interactive Map Preview */}
                  <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                    <h3 className="text-lg font-bold mb-4 flex items-center">
                      <MapPin className="mr-2 h-5 w-5" />
                      Live Map Preview
                    </h3>
                    <div className="bg-white border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                      <svg viewBox="0 0 1000 600" className="w-full h-full">
                        {/* Grid */}
                        <defs>
                          <pattern id="builderGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="white" />
                        <rect width="100%" height="100%" fill="url(#builderGrid)" />
                        
                        {/* Buildings on Map */}
                        {buildings.map((building: Building) => {
                          const x = building.mapPositionX || 100;
                          const y = building.mapPositionY || 100;
                          const isEditing = editingBuilding?.id === building.id;
                          
                          return (
                            <g key={building.id} className="cursor-pointer" onClick={() => {
                              setEditingBuilding(building);
                              setShowBuilderForm(true);
                            }}>
                              <rect
                                x={x}
                                y={y}
                                width="160"
                                height="120"
                                fill={building.colorCode}
                                stroke={isEditing ? "#fbbf24" : "#94a3b8"}
                                strokeWidth={isEditing ? "3" : "2"}
                                rx="4"
                                opacity="0.9"
                              />
                              <text
                                x={x + 80}
                                y={y + 60}
                                textAnchor="middle"
                                className="fill-white font-bold text-3xl pointer-events-none"
                                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                              >
                                {building.name}
                              </text>
                              <text
                                x={x + 80}
                                y={y + 85}
                                textAnchor="middle"
                                className="fill-white text-sm pointer-events-none"
                              >
                                {building.nameEn}
                              </text>
                            </g>
                          );
                        })}
                        
                        {/* Preview for new building */}
                        {showBuilderForm && !editingBuilding && (
                          <g opacity="0.5">
                            <rect
                              x={newBuilding.mapPositionX}
                              y={newBuilding.mapPositionY}
                              width="160"
                              height="120"
                              fill={newBuilding.colorCode}
                              stroke="#fbbf24"
                              strokeWidth="3"
                              strokeDasharray="8,4"
                              rx="4"
                            />
                            <text
                              x={newBuilding.mapPositionX + 80}
                              y={newBuilding.mapPositionY + 60}
                              textAnchor="middle"
                              className="fill-white font-bold text-3xl"
                              style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                            >
                              {newBuilding.name || '?'}
                            </text>
                            <text
                              x={newBuilding.mapPositionX + 80}
                              y={newBuilding.mapPositionY + 85}
                              textAnchor="middle"
                              className="fill-white text-sm"
                            >
                              Preview
                            </text>
                          </g>
                        )}
                      </svg>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Click on buildings to edit them. New buildings show as preview.
                    </p>
                  </div>
                </div>
              )}

              {/* Rooms Builder */}
              {builderMode === 'rooms' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Rooms ({rooms.length})</h3>
                    <Button
                      onClick={() => {
                        setShowBuilderForm(true);
                        setEditingRoom(null);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Room
                    </Button>
                  </div>
                  <p className="text-gray-600">Room builder coming soon! Use the Buildings tab for now.</p>
                </div>
              )}

              {/* Hallways Builder */}
              {builderMode === 'hallways' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Hallways</h3>
                    <Button
                      onClick={() => {
                        setShowBuilderForm(true);
                        setEditingHallway(null);
                      }}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Hallway
                    </Button>
                  </div>
                  <p className="text-gray-600">Hallway builder coming soon! Use the Buildings tab for now.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buildings" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl">Buildings Management</CardTitle>
                  <CardDescription>
                    Manage campus buildings, their properties, and associated rooms
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setActiveTab('ksyk-builder')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Building
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {buildings.length === 0 ? (
                  <div className="text-center py-12">
                    <Building className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Buildings Yet</h3>
                    <p className="text-gray-500 mb-4">Get started by adding your first building</p>
                    <Button onClick={() => setActiveTab('ksyk-builder')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Building
                    </Button>
                  </div>
                ) : (
                  buildings.map((building: Building) => (
                    <BuildingCard 
                      key={building.id} 
                      building={building} 
                      rooms={rooms}
                      queryClient={queryClient}
                      setActiveTab={setActiveTab}
                      setBuilderMode={setBuilderMode}
                      setEditingRoom={setEditingRoom}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rooms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rooms Management</CardTitle>
              <CardDescription>
                Manage individual rooms and their details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rooms.slice(0, 10).map((room: Room) => (
                  <div key={room.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{room.roomNumber}</h3>
                      <p className="text-sm text-muted-foreground">
                        {room.name || room.nameEn} • Floor {room.floor} • {room.type}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={room.isActive ? "default" : "secondary"}>
                        {room.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {rooms.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Showing 10 of {rooms.length} rooms
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Staff Management</h2>
              <p className="text-muted-foreground">Manage staff members and their information</p>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setShowStaffForm(true);
                setEditingStaff(null);
                setNewStaff({
                  firstName: "",
                  lastName: "",
                  email: "",
                  phone: "",
                  position: "",
                  positionEn: "",
                  positionFi: "",
                  department: "",
                  departmentEn: "",
                  departmentFi: "",
                  bio: "",
                  bioEn: "",
                  bioFi: "",
                  isActive: true
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </div>

          {/* Staff Form */}
          {showStaffForm && (
            <Card className="border-2 border-blue-500">
              <CardHeader>
                <CardTitle>{editingStaff ? "Edit Staff Member" : "Add New Staff Member"}</CardTitle>
                <CardDescription>
                  {editingStaff ? "Update staff member information" : "Fill in the details to add a new staff member"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      value={editingStaff ? editingStaff.firstName : newStaff.firstName}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, firstName: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, firstName: e.target.value });
                        }
                      }}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input
                      value={editingStaff ? editingStaff.lastName : newStaff.lastName}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, lastName: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, lastName: e.target.value });
                        }
                      }}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editingStaff ? editingStaff.email || "" : newStaff.email}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, email: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, email: e.target.value });
                        }
                      }}
                      placeholder="john.doe@ksyk.fi"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={editingStaff ? editingStaff.phone || "" : newStaff.phone}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, phone: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, phone: e.target.value });
                        }
                      }}
                      placeholder="+358 40 123 4567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Position (Default)</Label>
                    <Input
                      value={editingStaff ? editingStaff.position || "" : newStaff.position}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, position: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, position: e.target.value });
                        }
                      }}
                      placeholder="Teacher"
                    />
                  </div>
                  <div>
                    <Label>Position (English)</Label>
                    <Input
                      value={editingStaff ? editingStaff.positionEn || "" : newStaff.positionEn}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, positionEn: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, positionEn: e.target.value });
                        }
                      }}
                      placeholder="Teacher"
                    />
                  </div>
                  <div>
                    <Label>Position (Finnish)</Label>
                    <Input
                      value={editingStaff ? editingStaff.positionFi || "" : newStaff.positionFi}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, positionFi: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, positionFi: e.target.value });
                        }
                      }}
                      placeholder="Opettaja"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Department (Default)</Label>
                    <Input
                      value={editingStaff ? editingStaff.department || "" : newStaff.department}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, department: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, department: e.target.value });
                        }
                      }}
                      placeholder="Music"
                    />
                  </div>
                  <div>
                    <Label>Department (English)</Label>
                    <Input
                      value={editingStaff ? editingStaff.departmentEn || "" : newStaff.departmentEn}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, departmentEn: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, departmentEn: e.target.value });
                        }
                      }}
                      placeholder="Music"
                    />
                  </div>
                  <div>
                    <Label>Department (Finnish)</Label>
                    <Input
                      value={editingStaff ? editingStaff.departmentFi || "" : newStaff.departmentFi}
                      onChange={(e) => {
                        if (editingStaff) {
                          setEditingStaff({ ...editingStaff, departmentFi: e.target.value });
                        } else {
                          setNewStaff({ ...newStaff, departmentFi: e.target.value });
                        }
                      }}
                      placeholder="Musiikki"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editingStaff ? editingStaff.isActive : newStaff.isActive}
                    onChange={(e) => {
                      if (editingStaff) {
                        setEditingStaff({ ...editingStaff, isActive: e.target.checked });
                      } else {
                        setNewStaff({ ...newStaff, isActive: e.target.checked });
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowStaffForm(false);
                      setEditingStaff(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={editingStaff ? handleUpdateStaff : handleCreateStaff}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingStaff ? "Update" : "Create"} Staff Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Staff Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Staff</p>
                    <p className="text-2xl font-bold">{staff.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-green-600">
                      {staff.filter((s: Staff) => s.isActive).length}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Departments</p>
                    <p className="text-2xl font-bold">
                      {new Set(staff.map((s: Staff) => s.department).filter(Boolean)).size}
                    </p>
                  </div>
                  <Building className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Positions</p>
                    <p className="text-2xl font-bold">
                      {new Set(staff.map((s: Staff) => s.position).filter(Boolean)).size}
                    </p>
                  </div>
                  <Layers className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Staff Directory</CardTitle>
              <CardDescription>
                {staff.length === 0 
                  ? "No staff members found. Add staff members to get started."
                  : `Showing ${Math.min(staff.length, 20)} of ${staff.length} staff members`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Staff Members</h3>
                  <p className="text-gray-600 mb-6">Get started by adding your first staff member</p>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setShowStaffForm(true);
                      setEditingStaff(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Staff Member
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {staff.slice(0, 20).map((member: Staff) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {member.firstName?.[0]}{member.lastName?.[0]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {member.firstName} {member.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {member.position || 'No position'} • {member.department || 'No department'}
                          </p>
                          {member.email && (
                            <p className="text-xs text-gray-500 mt-1">{member.email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={member.isActive ? "default" : "secondary"} className={member.isActive ? "bg-green-600" : ""}>
                          {member.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingStaff(member);
                            setShowStaffForm(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteStaff(member.id, `${member.firstName} ${member.lastName}`)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {staff.length > 20 && (
                    <div className="text-center py-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing 20 of {staff.length} staff members
                      </p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Load More
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-6">
          <AnnouncementManager />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <AppSettingsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}