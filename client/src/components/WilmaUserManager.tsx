import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save, X, Users, GraduationCap, UserCheck, Baby } from "lucide-react";

interface WilmaUser {
  id: string;
  studentId: string; // 6-digit student ID
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: 'teacher' | 'student' | 'parent' | 'admin';
  studentClass?: string;
  isActive: boolean;
  createdAt: string;
  // Extended student details
  dateOfBirth?: string; // REQUIRED for students
  gender?: string;
  nationality?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
  // Parent/Guardian relationships
  parent1Id?: string;
  parent2Id?: string;
  // Emergency contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  // Medical info
  allergies?: string;
  medications?: string;
  specialNeeds?: string;
  // Academic
  startYear?: string;
  previousSchool?: string;
  notes?: string;
}

export default function WilmaUserManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<WilmaUser | null>(null);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
    role: "student" as 'teacher' | 'student' | 'parent' | 'admin',
    studentClass: "",
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
      console.log('🔵 Creating Wilma user:', user);
      
      // Generate 6-digit student ID
      const studentId = Math.floor(100000 + Math.random() * 900000).toString();
      
      const userData = {
        ...user,
        studentId
      };
      
      const response = await fetch("/api/wilma/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(userData),
      });
      
      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to create user");
      }
      return data;
    },
    onSuccess: (data) => {
      console.log('✅ User created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ["wilma-users"] });
      setShowForm(false);
      setNewUser({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        email: "",
        role: "student",
        studentClass: "",
        isActive: true,
        sendEmailInvitation: false
      });
      alert(`Wilma user created successfully!\n\nStudent ID: ${data.studentId}` + (newUser.sendEmailInvitation ? "\n\nLogin credentials have been sent to the user's email." : ""));
    },
    onError: (error: any) => {
      console.error('❌ Error creating user:', error);
      alert(`Error: ${error.message}`);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wilma-users"] });
      setShowForm(false);
      setEditingUser(null);
      alert("Wilma user updated successfully!");
    },
    onError: (error: any) => {
      alert(`Error: ${error.message}`);
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wilma-users"] });
      alert("Wilma user permanently deleted from database!");
    },
    onError: (error: any) => {
      alert(`Error: ${error.message}`);
    }
  });

  const handleCreateUser = () => {
    if (!newUser.username || !newUser.firstName || !newUser.lastName) {
      alert("Please fill in username, first name, and last name");
      return;
    }
    
    if (!newUser.sendEmailInvitation && !newUser.password) {
      alert("Please enter a password or enable email invitation");
      return;
    }
    
    if (newUser.sendEmailInvitation && !newUser.email) {
      alert("Email is required for email invitation");
      return;
    }
    
    createUserMutation.mutate(newUser);
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;
    updateUserMutation.mutate(editingUser);
  };

  const handleDeleteUser = (id: string, username: string) => {
    if (!confirm(`Delete Wilma user ${username}?\n\nThis action cannot be undone.`)) return;
    deleteUserMutation.mutate(id);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'teacher': return <GraduationCap className="h-4 w-4" />;
      case 'student': return <Users className="h-4 w-4" />;
      case 'parent': return <Baby className="h-4 w-4" />;
      case 'admin': return <UserCheck className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'teacher': return "bg-blue-100 text-blue-800 border-blue-200";
      case 'student': return "bg-green-100 text-green-800 border-green-200";
      case 'parent': return "bg-purple-100 text-purple-800 border-purple-200";
      case 'admin': return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const stats = {
    total: wilmaUsers.length,
    teachers: wilmaUsers.filter((u: WilmaUser) => u.role === 'teacher').length,
    students: wilmaUsers.filter((u: WilmaUser) => u.role === 'student').length,
    parents: wilmaUsers.filter((u: WilmaUser) => u.role === 'parent').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Teachers</p>
                <p className="text-2xl font-bold">{stats.teachers}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Students</p>
                <p className="text-2xl font-bold">{stats.students}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Parents</p>
                <p className="text-2xl font-bold">{stats.parents}</p>
              </div>
              <Baby className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Wilma User Management</CardTitle>
              <CardDescription>
                Manage Wilma users with different roles: teachers, students, parents, and admins
              </CardDescription>
            </div>
            <Button 
              onClick={() => {
                setShowForm(true);
                setEditingUser(null);
                setNewUser({
                  username: "",
                  password: "",
                  firstName: "",
                  lastName: "",
                  email: "",
                  role: "student",
                  studentClass: "",
                  isActive: true,
                  sendEmailInvitation: false
                });
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Wilma User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* User Form */}
            {showForm && (
              <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-blue-900">
                    {editingUser ? "Edit Wilma User" : "Add New Wilma User"}
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Username *</Label>
                    <Input
                      value={editingUser ? editingUser.username : newUser.username}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, username: e.target.value})
                        : setNewUser({...newUser, username: e.target.value})
                      }
                      placeholder="john.doe"
                    />
                  </div>
                  <div>
                    <Label>Password *</Label>
                    <Input
                      type="password"
                      value={editingUser ? editingUser.password : newUser.password}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, password: e.target.value})
                        : setNewUser({...newUser, password: e.target.value})
                      }
                      placeholder="••••••••"
                      disabled={!editingUser && newUser.sendEmailInvitation}
                    />
                    {!editingUser && (
                      <div className="mt-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
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
                          <span>Send email invitation instead</span>
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
                    <Label>First Name *</Label>
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
                    <Label>Last Name *</Label>
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
                      value={editingUser ? editingUser.email || "" : newUser.email}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, email: e.target.value})
                        : setNewUser({...newUser, email: e.target.value})
                      }
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  <div>
                    <Label>Role *</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2"
                      value={editingUser ? editingUser.role : newUser.role}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, role: e.target.value as any})
                        : setNewUser({...newUser, role: e.target.value as any})
                      }
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="parent">Parent</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {(editingUser?.role === 'student' || newUser.role === 'student') && (
                    <div>
                      <Label>Student Class</Label>
                      <Input
                        value={editingUser ? editingUser.studentClass || "" : newUser.studentClass}
                        onChange={(e) => editingUser 
                          ? setEditingUser({...editingUser, studentClass: e.target.value})
                          : setNewUser({...newUser, studentClass: e.target.value})
                        }
                        placeholder="9A, 8B, etc."
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingUser(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={editingUser ? handleUpdateUser : handleCreateUser}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingUser ? "Update User" : "Create User"}
                  </Button>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Student ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Class</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        Loading Wilma users...
                      </td>
                    </tr>
                  ) : wilmaUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No Wilma users found. Click "Add Wilma User" to create one.
                      </td>
                    </tr>
                  ) : (
                    wilmaUsers.map((user: WilmaUser) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-mono text-sm font-semibold text-blue-600">{user.studentId}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{user.username}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.email || '-'}</td>
                        <td className="px-4 py-3">
                          <Badge className={getRoleColor(user.role)}>
                            <span className="flex items-center gap-1">
                              {getRoleIcon(user.role)}
                              {user.role}
                            </span>
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.studentClass || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={user.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingUser(user);
                                setShowForm(true);
                              }}
                              title="Edit user"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteUser(user.id, user.username)}
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
