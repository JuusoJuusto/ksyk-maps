import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AnnouncementManager from "@/components/AnnouncementManager";
import UnifiedKSYKBuilder from "@/components/UnifiedKSYKBuilder";
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
  Layers
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="ksyk-builder">KSYK Builder</TabsTrigger>
          <TabsTrigger value="buildings">Buildings</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
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
                <p className="text-gray-500">User management is restricted to the owner account.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>User Management (Owner Only)</CardTitle>
                    <CardDescription>
                      Add and manage admin users in the system
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
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
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
                                  ? `✅ User created!\n\n📧 Email invitation sent to: ${newUser.email}\n\n⚠️ If email doesn't arrive:\n📝 Password: ${result.password || 'Check server logs'}\n\nShare this password manually if needed.`
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

        <TabsContent value="ksyk-builder" className="space-y-6">
          <UnifiedKSYKBuilder />
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
              <CardTitle>Buildings Management</CardTitle>
              <CardDescription>
                Manage campus buildings and their properties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {buildings.map((building: Building) => (
                  <div key={building.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: building.colorCode }}
                      />
                      <div>
                        <h3 className="font-semibold">{building.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {building.floors} floors • Capacity: {building.capacity || 'N/A'}
                        </p>
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
          <Card>
            <CardHeader>
              <CardTitle>Staff Management</CardTitle>
              <CardDescription>
                Manage staff members and their information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {staff.slice(0, 10).map((member: Staff) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{member.firstName} {member.lastName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {member.position} • {member.department}
                      </p>
                      {member.email && (
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={member.isActive ? "default" : "secondary"}>
                        {member.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {staff.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Showing 10 of {staff.length} staff members
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-6">
          <AnnouncementManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}