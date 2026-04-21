import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, Users, GraduationCap, Calendar, BookOpen, User } from "lucide-react";
import { useLocation } from "wouter";
import EnhancedUserSelector from "@/components/EnhancedUserSelector";

export default function ClassesManager() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    homeroom: "",
    teacher: "",
    studentCount: 0
  });

  // Fetch classes
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["wilma-classes"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/classes");
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch students to count per class
  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/users?role=student");
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch teachers for dropdown
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/users?role=teacher");
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Calculate student count per class
  const classesWithCount = classes.map((cls: any) => {
    const count = students.filter((s: any) => s.class === cls.name || s.studentClass === cls.name).length;
    return { ...cls, studentCount: count };
  });

  // Create/Update class mutation
  const saveClassMutation = useMutation({
    mutationFn: async (classData: any) => {
      const url = editingClass 
        ? `/api/wilma/classes/${editingClass.id}`
        : "/api/wilma/classes";
      const method = editingClass ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classData)
      });
      if (!response.ok) throw new Error("Failed to save class");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wilma-classes"] });
      alert(editingClass ? "✅ Luokka päivitetty!" : "✅ Luokka lisätty!");
      resetForm();
    },
    onError: () => {
      alert("❌ Tallennus epäonnistui");
    }
  });

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/classes/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete class");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wilma-classes"] });
      alert("✅ Luokka poistettu!");
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      grade: "",
      homeroom: "",
      teacher: "",
      studentCount: 0
    });
    setShowAddForm(false);
    setEditingClass(null);
  };

  const handleEdit = (cls: any) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name || "",
      grade: cls.grade || "",
      homeroom: cls.homeroom || "",
      teacher: cls.teacher || "",
      studentCount: cls.studentCount || 0
    });
    setShowAddForm(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.grade) {
      alert("Täytä pakolliset kentät");
      return;
    }
    saveClassMutation.mutate(formData);
  };

  const filteredClasses = classesWithCount.filter((cls: any) =>
    `${cls.name} ${cls.grade} ${cls.teacher} ${cls.homeroom}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Sort classes by grade and name
  const sortedClasses = filteredClasses.sort((a: any, b: any) => {
    const gradeA = parseInt(a.grade) || 0;
    const gradeB = parseInt(b.grade) || 0;
    if (gradeA !== gradeB) return gradeA - gradeB;
    return (a.name || "").localeCompare(b.name || "");
  });

  if (showAddForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            {editingClass ? "Muokkaa luokkaa" : "Lisää luokka"}
          </h2>
          <Button variant="outline" onClick={resetForm}>
            Peruuta
          </Button>
        </div>

        <Card className="border-2 border-indigo-200 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Luokan nimi * (esim. 7A, 8B)</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="7A"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Vuosiluokka *</Label>
                <Input
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="7"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Kotiluokka</Label>
                <Input
                  value={formData.homeroom}
                  onChange={(e) => setFormData({ ...formData, homeroom: e.target.value })}
                  placeholder="A201"
                  className="mt-1"
                />
              </div>
              <div>
                <EnhancedUserSelector
                  users={teachers}
                  value={formData.teacher}
                  onChange={(value) => {
                    const teacher = teachers.find((t: any) => t.id === value);
                    if (teacher) {
                      setFormData({ ...formData, teacher: `${teacher.firstName} ${teacher.lastName}` });
                    }
                  }}
                  label="Luokanvalvoja"
                  placeholder="Valitse opettaja..."
                  filterRole="teacher"
                  showDetails={true}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={saveClassMutation.isPending}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {saveClassMutation.isPending ? "Tallennetaan..." : "Tallenna"}
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
          <GraduationCap className="w-6 h-6 text-indigo-600" />
          Luokat
        </h2>
        <div className="flex gap-2">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Hae luokkia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-64"
            />
          </div>
          <Button onClick={() => setShowAddForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Lisää luokka
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm">Luokkia yhteensä</p>
                <p className="text-3xl font-bold mt-1">{classes.length}</p>
              </div>
              <GraduationCap className="w-12 h-12 text-indigo-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Opiskelijoita</p>
                <p className="text-3xl font-bold mt-1">{students.length}</p>
              </div>
              <Users className="w-12 h-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Keskikoko</p>
                <p className="text-3xl font-bold mt-1">
                  {classes.length > 0 ? Math.round(students.length / classes.length) : 0}
                </p>
              </div>
              <User className="w-12 h-12 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Vuosiluokkia</p>
                <p className="text-3xl font-bold mt-1">
                  {new Set(classes.map((c: any) => c.grade)).size}
                </p>
              </div>
              <BookOpen className="w-12 h-12 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ladataan luokkia...</p>
        </div>
      ) : sortedClasses.length === 0 ? (
        <Card className="border-2 border-gray-200">
          <CardContent className="p-12 text-center text-gray-500">
            <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Ei luokkia</p>
            <Button onClick={() => setShowAddForm(true)} className="mt-4">
              Lisää ensimmäinen luokka
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedClasses.map((cls: any) => (
            <Card key={cls.id} className="hover:shadow-xl transition-all border-2 border-indigo-100 hover:border-indigo-300">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                      {cls.name}
                    </div>
                    <div>
                      <p className="text-lg font-bold">{cls.name}</p>
                      <p className="text-sm text-gray-600 font-normal">{cls.grade}. luokka</p>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">Opiskelijat</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{cls.studentCount}</span>
                  </div>

                  {cls.teacher && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <User className="w-4 h-4" />
                      <span>Luokanvalvoja: {cls.teacher}</span>
                    </div>
                  )}

                  {cls.homeroom && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Calendar className="w-4 h-4" />
                      <span>Luokkahuone: {cls.homeroom}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button 
                    size="sm" 
                    variant="default"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => {
                      const currentPath = window.location.pathname;
                      const adminId = currentPath.split('/')[2];
                      setLocation(`/wilma-admin/${adminId}/class/${cls.id}`);
                    }}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Katso
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleEdit(cls)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (confirm(`Poista luokka ${cls.name}?`)) {
                        deleteClassMutation.mutate(cls.id);
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
