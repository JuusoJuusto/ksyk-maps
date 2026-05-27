import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save, X, Users, GraduationCap, UserCheck, Baby, Briefcase, Heart, Shield, Stethoscope, UserCog, Brain, BookOpen, Wrench, Coffee, Laptop, FileText, HardHat, Utensils, ClipboardList, Backpack, Settings as SettingsIcon, Lock, Eye, EyeOff, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WILMA_ROLES } from "@shared/wilmaConfig";

interface WilmaUser {
  id: string;
  studentId: string;
  username: string;
  password: string;
  plainPassword?: string;
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
  'nuoriso-ohjaaja': Target,
  custom: SettingsIcon,
};

export default function EnhancedWilmaUserManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<WilmaUser | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
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

  // Fetch Wilma users (excluding students and parents for staff tab)
  const { data: wilmaUsers = [], isLoading } = useQuery({
    queryKey: ["wilma-users"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/users");
      if (!response.ok) throw new Error("Failed to fetch Wilma users");
      const allUsers = await response.json();
      // Filter out students and parents - they have their own tab
      return allUsers.filter((user: WilmaUser) => 
        user.role !== 'student' && user.role !== 'parent'
      );
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
        title: "✅ Käyttäjä luotu",
        description: `${data.firstName} ${data.lastName} (ID: ${data.studentId}) on luotu onnistuneesti!${newUser.sendEmailInvitation ? ' Kirjautumistiedot lähetetty sähköpostitse.' : ''}`,
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
        title: "✅ Käyttäjä päivitetty",
        description: `${data.firstName} ${data.lastName} on päivitetty onnistuneesti!`,
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
        title: "🗑️ Käyttäjä poistettu",
        description: "Käyttäjä on poistettu pysyvästi tietokannasta.",
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
        title: "⚠️ Puuttuvat kentät",
        description: "Täytä käyttäjänimi, etunimi ja sukunimi",
        variant: "destructive",
      });
      return;
    }
    
    if (!newUser.sendEmailInvitation && !newUser.password) {
      toast({
        title: "⚠️ Salasana vaaditaan",
        description: "Syötä salasana tai ota käyttöön sähköpostikutsu",
        variant: "destructive",
      });
      return;
    }
    
    if (newUser.sendEmailInvitation && !newUser.email) {
      toast({
        title: "⚠️ Sähköposti vaaditaan",
        description: "Sähköposti vaaditaan sähköpostikutsua varten",
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
    if (!confirm(`Poista käyttäjä ${name} (${username})?\n\nTätä toimintoa ei voi perua.`)) return;
    deleteUserMutation.mutate(id);
  };

  const handleResetPassword = async (id: string, email: string | undefined, name: string) => {
    if (!email) {
      toast({
        title: "❌ Ei sähköpostia",
        description: "Käyttäjällä ei ole sähköpostiosoitetta. Salasanan nollaus ei onnistu.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Nollaa salasana käyttäjälle ${name}?\n\nUusi väliaikainen salasana luodaan ja lähetetään osoitteeseen ${email}.`)) return;

    try {
      // Generate new temporary password
      const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
      
      // Update user with new password (both hashed and plain)
      const response = await fetch(`/api/wilma/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          password: tempPassword,
          plainPassword: tempPassword, // Store plain password for admin viewing
          isTemporaryPassword: true 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset password");
      }

      // Send email with new password
      const emailResponse = await fetch('/api/wilma/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, tempPassword })
      });

      if (!emailResponse.ok) {
        throw new Error("Password reset but email failed to send");
      }

      queryClient.invalidateQueries({ queryKey: ["wilma-users"] });
      toast({
        title: "✅ Salasana nollattu",
        description: `Uusi väliaikainen salasana lähetetty osoitteeseen ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
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
    students: 0, // Students are in their own tab
    teachers: wilmaUsers.filter((u: WilmaUser) => u.role === 'teacher').length,
    parents: 0, // Parents are in their own tab
    staff: wilmaUsers.filter((u: WilmaUser) => ['admin', 'principal', 'vice_principal', 'counselor', 'social_worker', 'nurse', 'psychologist', 'special_ed_teacher', 'assistant', 'librarian', 'it_support', 'secretary', 'janitor', 'cafeteria_staff', 'substitute_teacher', 'student_teacher', 'nuoriso-ohjaaja', 'custom'].includes(u.role)).length,
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Stats - Mobile Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Yhteensä</p>
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
                <p className="text-xs md:text-sm text-muted-foreground">Opiskelijat</p>
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
                <p className="text-xs md:text-sm text-muted-foreground">Opettajat</p>
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
                <p className="text-xs md:text-sm text-muted-foreground">Henkilökunta</p>
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
              <CardTitle className="text-lg md:text-xl">Wilma käyttäjähallinta</CardTitle>
              <CardDescription className="text-xs md:text-sm mt-1">
                Hallitse kaikkia Wilma-käyttäjiä eri rooleilla ja oikeuksilla
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
              Lisää käyttäjä
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
                    {editingUser ? "Muokkaa käyttäjää" : "Lisää uusi käyttäjä"}
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
                    <Label className="text-xs md:text-sm">Käyttäjänimi *</Label>
                    <Input
                      value={editingUser ? editingUser.username : newUser.username}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, username: e.target.value})
                        : setNewUser({...newUser, username: e.target.value})
                      }
                      placeholder="matti.meikalainen"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">Salasana *</Label>
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
                          <span>Lähetä sähköpostikutsu</span>
                        </label>
                        {newUser.sendEmailInvitation && (
                          <p className="text-xs text-blue-600 mt-1">
                            📧 Käyttäjä saa kirjautumistiedot sähköpostitse
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">Etunimi *</Label>
                    <Input
                      value={editingUser ? editingUser.firstName : newUser.firstName}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, firstName: e.target.value})
                        : setNewUser({...newUser, firstName: e.target.value})
                      }
                      placeholder="Matti"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">Sukunimi *</Label>
                    <Input
                      value={editingUser ? editingUser.lastName : newUser.lastName}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, lastName: e.target.value})
                        : setNewUser({...newUser, lastName: e.target.value})
                      }
                      placeholder="Meikäläinen"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">Sähköposti</Label>
                    <Input
                      type="email"
                      value={editingUser ? editingUser.email || "" : newUser.email}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, email: e.target.value})
                        : setNewUser({...newUser, email: e.target.value})
                      }
                      placeholder="matti.meikalainen@ksyk.fi"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">Puhelin</Label>
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
                    <Label className="text-xs md:text-sm">Rooli *</Label>
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
                      <Label className="text-xs md:text-sm">Mukautettu roolin nimi *</Label>
                      <Input
                        value={editingUser ? editingUser.customRoleName || "" : (newUser as any).customRoleName || ""}
                        onChange={(e) => editingUser 
                          ? setEditingUser({...editingUser, customRoleName: e.target.value})
                          : setNewUser({...newUser, customRoleName: e.target.value} as any)
                        }
                        placeholder="esim. IT-koordinaattori, Urheiluvalmentaja"
                        className="text-sm"
                      />
                    </div>
                  )}
                  {(editingUser?.role === 'student' || newUser.role === 'student') && (
                    <div>
                      <Label className="text-xs md:text-sm">Luokka</Label>
                      <Input
                        value={editingUser ? editingUser.studentClass || "" : newUser.studentClass}
                        onChange={(e) => editingUser 
                          ? setEditingUser({...editingUser, studentClass: e.target.value})
                          : setNewUser({...newUser, studentClass: e.target.value})
                        }
                        placeholder="9A, 8B, jne."
                        className="text-sm"
                      />
                    </div>
                  )}
                  {!['student', 'parent'].includes(editingUser?.role || newUser.role) && (
                    <>
                      <div>
                        <Label className="text-xs md:text-sm">Osasto</Label>
                        <Input
                          value={editingUser ? editingUser.department || "" : newUser.department}
                          onChange={(e) => editingUser 
                            ? setEditingUser({...editingUser, department: e.target.value})
                            : setNewUser({...newUser, department: e.target.value})
                          }
                          placeholder="Matematiikka, Hallinto, jne."
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs md:text-sm">Asema</Label>
                        <Input
                          value={editingUser ? editingUser.position || "" : newUser.position}
                          onChange={(e) => editingUser 
                            ? setEditingUser({...editingUser, position: e.target.value})
                            : setNewUser({...newUser, position: e.target.value})
                          }
                          placeholder="Pääopettaja, Kouluterveydenhoitaja, jne."
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs md:text-sm">Toimistohuone</Label>
                        <Input
                          value={editingUser ? editingUser.officeRoom || "" : newUser.officeRoom}
                          onChange={(e) => editingUser 
                            ? setEditingUser({...editingUser, officeRoom: e.target.value})
                            : setNewUser({...newUser, officeRoom: e.target.value})
                          }
                          placeholder="Huone 205"
                          className="text-sm"
                        />
                      </div>
                    </>
                  )}
                  <div className="md:col-span-2">
                    <Label className="text-xs md:text-sm">Kuvaus / Esittely</Label>
                    <textarea
                      className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
                      value={editingUser ? editingUser.bio || "" : newUser.bio}
                      onChange={(e) => editingUser 
                        ? setEditingUser({...editingUser, bio: e.target.value})
                        : setNewUser({...newUser, bio: e.target.value})
                      }
                      placeholder="Lyhyt kuvaus tai esittely..."
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
                    Peruuta
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto"
                    onClick={editingUser ? handleUpdateUser : handleCreateUser}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingUser ? "Päivitä käyttäjä" : "Luo käyttäjä"}
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
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Tunnus</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Nimi</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Käyttäjänimi</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Salasana</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Sähköposti</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Rooli</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Luokka/Osasto</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Tila</th>
                      <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Toiminnot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isLoading ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500 text-sm">
                          Ladataan käyttäjiä...
                        </td>
                      </tr>
                    ) : wilmaUsers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500 text-sm">
                          Ei käyttäjiä. Klikkaa "Lisää käyttäjä" luodaksesi uuden.
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
                            <td className="px-2 md:px-4 py-2 md:py-3">
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-xs md:text-sm text-gray-600">
                                  {visiblePasswords[user.id] 
                                    ? (user.plainPassword || user.password || '••••••••')
                                    : '••••••••'}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => togglePasswordVisibility(user.id)}
                                  className="h-6 w-6 p-0"
                                  title={visiblePasswords[user.id] ? "Hide password" : "Show password"}
                                >
                                  {visiblePasswords[user.id] ? (
                                    <EyeOff className="h-3 w-3" />
                                  ) : (
                                    <Eye className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </td>
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
                                  onClick={() => handleResetPassword(user.id, user.email, `${user.firstName} ${user.lastName}`)}
                                  title="Reset password"
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                >
                                  <Lock className="h-3 w-3 md:h-4 md:w-4" />
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
