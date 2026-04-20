import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, User, Mail, Phone, BookOpen, Users, Building } from "lucide-react";

export default function TeacherDirectory() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
    room: "",
    department: ""
  });

  // Fetch teachers
  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/users?role=teacher");
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Create/Update teacher mutation
  const saveTeacherMutation = useMutation({
    mutationFn: async (teacherData: any) => {
      const url = editingTeacher 
        ? `/api/wilma/users/${editingTeacher.id}`
        : "/api/wilma/users";
      const method = editingTeacher ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...teacherData,
          role: "teacher",
          username: teacherData.email.split('@')[0],
          password: editingTeacher ? undefined : "teacher123",
          isActive: true,
          isTemporaryPassword: !editingTeacher
        })
      });
      if (!response.ok) throw new Error("Failed to save teacher");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      alert(editingTeacher ? "✅ Opettaja päivitetty!" : "✅ Opettaja lisätty!");
      resetForm();
    },
    onError: () => {
      alert("❌ Tallennus epäonnistui");
    }
  });

  // Delete teacher mutation
  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/users/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete teacher");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      alert("✅ Opettaja poistettu!");
    }
  });

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      subject: "",
      room: "",
      department: ""
    });
    setShowAddForm(false);
    setEditingTeacher(null);
  };

  const handleEdit = (teacher: any) => {
    setEditingTeacher(teacher);
    setFormData({
      firstName: teacher.firstName || "",
      lastName: teacher.lastName || "",
      email: teacher.email || "",
      phone: teacher.phone || "",
      subject: teacher.subject || "",
      room: teacher.room || "",
      department: teacher.department || ""
    });
    setShowAddForm(true);
  };

  const handleSave = () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert("Täytä pakolliset kentät");
      return;
    }
    saveTeacherMutation.mutate(formData);
  };

  const filteredTeachers = teachers.filter((teacher: any) =>
    `${teacher.firstName} ${teacher.lastName} ${teacher.email} ${teacher.subject} ${teacher.department}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (showAddForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {editingTeacher ? "Muokkaa opettajaa" : "Lisää opettaja"}
          </h2>
          <Button variant="outline" onClick={resetForm}>
            Peruuta
          </Button>
        </div>

        <Card className="border-2 border-blue-200">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Etunimi *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Etunimi"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Sukunimi *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Sukunimi"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Sähköposti *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="opettaja@ksyk.fi"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Puhelin</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+358 40 123 4567"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Opetettava aine</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Matematiikka"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Luokkahuone</Label>
                <Input
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="A201"
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Osasto</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Matematiikan ja luonnontieteiden osasto"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={saveTeacherMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {saveTeacherMutation.isPending ? "Tallennetaan..." : "Tallenna"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Peruuta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          Opettajahakemisto
        </h2>
        <div className="flex gap-2">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Hae opettajia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-64"
            />
          </div>
          <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Lisää opettaja
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ladataan opettajia...</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <Card className="border-2 border-gray-200">
          <CardContent className="p-12 text-center text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Ei opettajia</p>
            <Button onClick={() => setShowAddForm(true)} className="mt-4">
              Lisää ensimmäinen opettaja
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeachers.map((teacher: any) => (
            <Card key={teacher.id} className="hover:shadow-lg transition-shadow border-2 border-blue-100">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{teacher.firstName} {teacher.lastName}</p>
                      {teacher.subject && (
                        <p className="text-sm text-gray-600">{teacher.subject}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  {teacher.email && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{teacher.email}</span>
                    </p>
                  )}
                  {teacher.phone && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-3 h-3" />
                      {teacher.phone}
                    </p>
                  )}
                  {teacher.room && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <Building className="w-3 h-3" />
                      Luokka: {teacher.room}
                    </p>
                  )}
                  {teacher.department && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <BookOpen className="w-3 h-3" />
                      <span className="truncate">{teacher.department}</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleEdit(teacher)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Muokkaa
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (confirm(`Poista ${teacher.firstName} ${teacher.lastName}?`)) {
                        deleteTeacherMutation.mutate(teacher.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
