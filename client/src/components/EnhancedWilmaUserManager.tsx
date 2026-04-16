import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save, X, Users, GraduationCap, UserCheck, Baby, Briefcase, Heart, Shield, Stethoscope, UserCog, Brain, BookOpen, Wrench, Coffee, Laptop, FileText, HardHat, Utensils, ClipboardList, Backpack, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WILMA_ROLES } from "@shared/wilmaConfig";

interface WilmaUser {
  id: string;
  studentId: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: string;
  customRoleName?: string;
  studentClass?: string;
  department?: string;
  position?: string;
  specialization?: string;
  officeRoom?: string;
  officeHours?: any;
  bio?: string;
  profileImageUrl?: string;
  calendarSyncEnabled?: boolean;
  calendarProvider?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

const ROLE_ICONS: Record<string, any> = {
  student: Users,
  teacher: GraduationCap,
  parent: Baby,
  admin: UserCheck,
  principal: Shield,
  vice_principal: BookOpen,
  counselor: UserCog,
  social_worker: Heart,
  psychologist: Brain,
  nurse: Stethoscope,
  special_ed_teacher: GraduationCap,
  assistant: Briefcase,
  librarian: BookOpen,
  it_support: Laptop,
  secretary: FileText,
  janitor: Wrench,
  cafeteria_staff: Utensils,
  substitute_teacher: ClipboardList,
  student_teacher: Backpack,
  custom: SettingsIcon,
};

export default function EnhancedWilmaUserManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<WilmaUser | null>(null);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "student" as WilmaUser['role'],
    studentClass: "",
    department: "",
    position: "",
    specialization: "",
    officeRoom: "",
    bio: "",
    isActive: true,
    sendEmailInvitation: false
  });

  // Fetch Wilma users
  const { data: wilmaUsers = [], isLoading } = useQuery({
    queryKey: ["wilma-users"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/users");
      if (!response.ok) throw new Error("Failed to fetch Wilma users");
      return response.json();
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (user: any) => {
      const studentId = Math.floor(100000 + Math.random() * 900000).toString();
      const userData = { ...user, studentId };
      
      const response = await fetch("/api/wilma/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create user");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wilma-users"] });
      setShowForm(false);
      resetForm();
      toast({
        title: "✅ User Created",
        description: `${data.firstName} ${data.lastName} (ID: ${data.studentId}) has been created successfully!${newUser.sendEmailInvitation ? ' Login credentials sent via email.' : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...user }: any) => {
      const response = await fetch(`/api/wilma/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(user),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update user");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wilma-users"] });
      setShowForm(false);
      setEditingUser(null);
      toast({
        title: "✅ User Updated",
        description: `${data.firstName} ${data.lastName} has been updated successfully!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete user mutation - FIX JSON ERROR
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to delete user";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          // If response is not JSON, use default message
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      // Handle empty response (204 No Content)
      if (response.status === 204) {
        return { success: true };
      }
      
      // Try to parse JSON response
      const text = await response.text();
      if (!text) {
        return { success: true };
      }
      
      try {
        return JSON.parse(text);
      } catch {
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wilma-users"] });
      toast({
        title: "🗑️ User Deleted",
        description: "User has been permanently deleted from the database.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setNewUser({
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "student",
      studentClass: "",
      department: "",
      position: "",
      specialization: "",
      officeRoom: "",
      bio: "",
      isActive: true,
      sendEmailInvitation: false
    });
  };

  const handleCreateUser = () => {
    if (!newUser.username || !newUser.firstName || !newUser.lastName) {
      toast({
        title: "⚠️ Missing Fields",
        description: "Please fill in username, first name, and last name",
        variant: "destructive",
      });
      return;
    }
    
    if (!newUser.sendEmailInvitation && !newUser.password) {
      toast({
        title: "⚠️ Password Required",
        description: "Please enter a password or enable email invitation",
        variant: "destructive",
      });
      return;
    }
    
    if (newUser.sendEmailInvitation && !newUser.email) {
      toast({
        title: "⚠️ Email Required",
        description: "Email is required for email invitation",
        variant: "destructive",
      });
      return;
    }
    
    createUserMutation.mutate(newUser);
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;
    updateUserMutation.mutate(editingUser);
  };

  const handleDeleteUser = (id: string, username: string, name: string) => {
    if (!confirm(`Delete user ${name} (${username})?\n\nThis action cannot be undone.`)) return;
    deleteUserMutation.mutate(id);
  };

  const getRoleConfig = (role: string) => {
    const config = WILMA_ROLES.find(r => r.value === role);
    if (config) {
      return {
        ...config,
        icon: ROLE_ICONS[role] || Users
      };
    }
    return {
      value: role,
      label: role,
      labelEn: role,
      icon: ROLE_ICONS.custom,
      color: 'bg-violet-100 text-violet-800'
    };
  };

  const stats = {
    total: wilmaUsers.length,
    students: wilmaUsers.filter((u: WilmaUser) => u.role === 'student').length,
    teachers: wilmaUsers.filter((u: WilmaUser) => u.role === 'teacher').length,
    parents: wilmaUsers.filter((u: WilmaUser) => u.role === 'parent').length,
    staff: wilmaUsers.filter((u: WilmaUser) => ['staff', 'social_worker', 'counselor', 'nurse', 'principal'].includes(u.role)).length,
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Stats - Mobile Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total</p>
                <p className="text-xl md:text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Students</p>
                <p className="text-xl md:text-2xl font-bold">{stats.students}</p>
              </div>
              <Users className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Teachers</p>
                <p className="text-xl md:text-2xl font-bold">{stats.teachers}</p>
              </div>
              <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Staff</p>
                <p className="text-xl md:text-2xl font-bold">{stats.staff}</p>
              </div>
              <Briefcase className="h-6 w-6 md:h-8 md:w-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="shadow-lg">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div>
              <CardTitle className="text-lg md:text-xl">Wilma User Management</CardTitle>
              <CardDescription className="text-xs md:text-sm mt-1">
                Manage all Wilma users with different roles and permissions
              </CardDescription>
            </div>
            <Button 
              onClick={() => {
                setShowForm(true);
                setEditingUser(null);
                resetForm();
              }}
              className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          <div className="space-y-4">
            {/* User Form */}
            {showForm && (
              <div className="border-2 border-blue-200 rounded-lg p-3 md:p-6 bg-blue-50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base md:text-lg font-semibold text-blue-900">
                    {editingUser ? "Edit User" : "Add New User"}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowForm(false);
                      setEditingUser(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label className="text-xs md:text-sm">Username *</Label>
                    <Input
                      value={editingUser ? editingUser.username : newUser.username}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, username: e.target.value})
                        : setNewUser({...newUser, username: e.target.value})
                      }
                      placeholder="john.doe"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">Password *</Label>
                    <Input
                      type="password"
                      value={editingUser ? editingUser.password : newUser.password}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, password: e.target.value})
                        : setNewUser({...newUser, password: e.target.value})
                      }
                      placeholder="••••••••"
                      disabled={!editingUser && newUser.sendEmailInvitation}
                      className="text-sm"
                    />
                    {!editingUser && (
                      <div className="mt-2">
                        <label className="flex items-center gap-2 text-xs md:text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newUser.sendEmailInvitation}
                            onChange={(e) => setNewUser({
                              ...newUser, 
                              sendEmailInvitation: e.target.checked,
                              password: e.target.checked ? '' : newUser.password
                            })}
                            className="w-4 h-4"
                          />
                          <span>Send email invitation</span>
                        </label>
                        {newUser.sendEmailInvitation && (
                          <p className="text-xs text-blue-600 mt-1">
                            📧 User will receive login credentials via email
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">First Name *</Label>
                    <Input
                      value={editingUser ? editingUser.firstName : newUser.firstName}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, firstName: e.target.value})
                        : setNewUser({...newUser, firstName: e.target.value})
                      }
                      placeholder="John"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">Last Name *</Label>
                    <Input
                      value={editingUser ? editingUser.lastName : newUser.lastName}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, lastName: e.target.value})
                        : setNewUser({...newUser, lastName: e.target.value})
                      }
                      placeholder="Doe"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">Email</Label>
                    <Input
                      type="email"
                      value={editingUser ? editingUser.email || "" : newUser.email}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, email: e.target.value})
                        : setNewUser({...newUser, email: e.target.value})
                      }
                      placeholder="john.doe@example.com"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">Phone</Label>
                    <Input
                      type="tel"
                      value={editingUser ? editingUser.phone || "" : newUser.phone}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, phone: e.target.value})
                        : setNewUser({...newUser, phone: e.target.value})
                      }
                      placeholder="+358 40 123 4567"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">Role *</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={editingUser ? editingUser.role : newUser.role}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, role: e.target.value as any})
                        : setNewUser({...newUser, role: e.target.value as any})
                      }
                    >
                      {WILMA_ROLES.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.icon} {role.label} ({role.labelEn})
                        </option>
                      ))}
                    </select>
                  </div>
                  {(editingUser?.role === 'custom' || newUser.role === 'custom') && (
                    <div>
                      <Label className="text-xs md:text-sm">Custom Role Name *</Label>
                      <Input
                        value={editingUser ? editingUser.customRoleName || "" : (newUser as any).customRoleName || ""}
                        onChange={(e) => editingUser 
                          ? setEditingUser({...editingUser, customRoleName: e.target.value})
                          : setNewUser({...newUser, customRoleName: e.target.value} as any)
                        }
                        placeholder="e.g., IT Coordinator, Sports Coach"
                        className="text-sm"
                      />
                    </div>
                  )}
                  {(editingUser?.role === 'student' || newUser.role === 'student') && (
                    <div>
                      <Label className="text-xs md:text-sm">Student Class</Label>
                      <Input
                        value={editingUser ? editingUser.studentClass || "" : newUser.studentClass}
                        onChange={(e) => editingUser 
                          ? setEditingUser({...editingUser, studentClass: e.target.value})
                          : setNewUser({...newUser, studentClass: e.target.value})
                        }
                        placeholder="9A, 8B, etc."
                        className="text-sm"
                      />
                    </div>
                  )}
                  {!['student', 'parent'].includes(editingUser?.role || newUser.role) && (
                    <>
                      <div>
                        <Label className="text-xs md:text-sm">Department</Label>
                        <Input
                          value={editingUser ? editingUser.department || "" : newUser.department}
                          onChange={(e) => editingUser 
                            ? setEditingUser({...editingUser, department: e.target.value})
                            : setNewUser({...newUser, department: e.target.value})
                          }
                          placeholder="Mathematics, Administration, etc."
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs md:text-sm">Position</Label>
                        <Input
                          value={editingUser ? editingUser.position || "" : newUser.position}
                          onChange={(e) => editingUser 
                            ? setEditingUser({...editingUser, position: e.target.value})
                            : setNewUser({...newUser, position: e.target.value})
                          }
                          placeholder="Head Teacher, School Nurse, etc."
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs md:text-sm">Office Room</Label>
                        <Input
                          value={editingUser ? editingUser.officeRoom || "" : newUser.officeRoom}
                          onChange={(e) => editingUser 
                            ? setEditingUser({...editingUser, officeRoom: e.target.value})
                            : setNewUser({...newUser, officeRoom: e.target.value})
                          }
                          placeholder="Room 205"
                          className="text-sm"
                        />
                      </div>
                    </>
                  )}
                  <div className="md:col-span-2">
                    <Label className="text-xs md:text-sm">Bio / Description</Label>
                    <textarea
                      className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
                      value={editingUser ? editingUser.bio || "" : newUser.bio}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, bio: e.target.value})
                        : setNewUser({...newUser, bio: e.target.value})
                      }
                      placeholder="Brief description or bio..."
                    />
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingUser(null);
                    }}
                    className="w-full md:w-auto"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto"
                    onClick={editingUser ? handleUpdateUser : handleCreateUser}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingUser ? "Update User" : "Create User"}
                  </Button>
                </div>
              </div>
            )}

            {/* Users Table - Mobile Responsive */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">ID</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Name</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Username</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Email</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Role</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Class/Dept</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Status</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">
                          Loading users...
                        </td>
                      </tr>
                    ) : wilmaUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">
                          No users found. Click "Add User" to create one.
                        </td>
                      </tr>
                    ) : (
                      wilmaUsers.map((user: WilmaUser) => {
                        const roleConfig = getRoleConfig(user.role);
                        const Icon = roleConfig.icon;
                        return (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-2 md:px-4 py-2 md:py-3">
                              <div className="font-mono text-xs md:text-sm font-semibold text-blue-600">{user.studentId}</div>
                            </td>
                            <td className="px-2 md:px-4 py-2 md:py-3">
                              <div className="font-medium text-xs md:text-sm">{user.firstName} {user.lastName}</div>
                            </td>
                            <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600">{user.username}</td>
                            <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600">{user.email || '-'}</td>
                            <td className="px-2 md:px-4 py-2 md:py-3">
                              <Badge className={roleConfig.color + " text-xs"}>
                                <span className="flex items-center gap-1">
                                  <Icon className="h-3 w-3" />
                                  <span className="hidden md:inline">{roleConfig.label}</span>
                                </span>
                              </Badge>
                            </td>
                            <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600">
                              {user.studentClass || user.department || '-'}
                            </td>
                            <td className="px-2 md:px-4 py-2 md:py-3">
                              <Badge className={user.isActive ? "bg-green-100 text-green-800 text-xs" : "bg-gray-100 text-gray-800 text-xs"}>
                                {user.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="px-2 md:px-4 py-2 md:py-3">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setShowForm(true);
                                  }}
                                  title="Edit user"
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-3 w-3 md:h-4 md:w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                  onClick={() => handleDeleteUser(user.id, user.username, `${user.firstName} ${user.lastName}`)}
                                  title="Delete user"
                                >
                                  <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
