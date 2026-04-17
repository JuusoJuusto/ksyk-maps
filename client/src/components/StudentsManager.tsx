import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, User, Mail, Phone, MapPin, Users as UsersIcon } from "lucide-react";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  studentClass: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  parentIds?: string[];
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalInfo?: string;
  isActive: boolean;
}

export default function StudentsManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    studentId: "",
    studentClass: "",
    dateOfBirth: "",
    address: "",
    city: "",
    postalCode: "",
    phone: "",
    emergencyContact: "",
    emergencyPhone: "",
    medicalInfo: ""
  });

  // Fetch students
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/users?role=student");
      if (!response.ok) throw new Error("Failed to fetch students");
      return response.json();
    }
  });

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/wilma/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          role: "student",
          username: data.email.split('@')[0],
          password: `Student${Math.random().toString(36).slice(-8)}!`,
          isActive: true
        })
      });
      if (!response.ok) throw new Error("Failed to create student");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setIsAddDialogOpen(false);
      resetForm();
      alert("✅ Student created successfully!");
    },
    onError: (error: any) => {
      alert(`❌ Failed to create student: ${error.message}`);
    }
  });

  // Update student mutation
  const updateStudentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await fetch(`/api/wilma/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to update student");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setEditingStudent(null);
      resetForm();
      alert("✅ Student updated successfully!");
    },
    onError: (error: any) => {
      alert(`❌ Failed to update student: ${error.message}`);
    }
  });

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/users/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error("Failed to delete student");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      alert("✅ Student deleted successfully!");
    },
    onError: (error: any) => {
      alert(`❌ Failed to delete student: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      updateStudentMutation.mutate({ id: editingStudent.id, data: formData });
    } else {
      createStudentMutation.mutate(formData);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      studentId: student.studentId,
      studentClass: student.studentClass || "",
      dateOfBirth: student.dateOfBirth || "",
      address: student.address || "",
      city: student.city || "",
      postalCode: student.postalCode || "",
      phone: student.phone || "",
      emergencyContact: student.emergencyContact || "",
      emergencyPhone: student.emergencyPhone || "",
      medicalInfo: student.medicalInfo || ""
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteStudentMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      studentId: "",
      studentClass: "",
      dateOfBirth: "",
      address: "",
      city: "",
      postalCode: "",
      phone: "",
      emergencyContact: "",
      emergencyPhone: "",
      medicalInfo: ""
    });
    setEditingStudent(null);
  };

  const filteredStudents = students.filter((student: Student) =>
    `${student.firstName} ${student.lastName} ${student.email} ${student.studentId} ${student.studentClass}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="border-2 border-blue-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Student Management
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Search and Add */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingStudent ? "Edit Student" : "Add New Student"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>First Name *</Label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Last Name *</Label>
                      <Input
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Student ID *</Label>
                      <Input
                        value={formData.studentId}
                        onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Class *</Label>
                      <Input
                        value={formData.studentClass}
                        onChange={(e) => setFormData({ ...formData, studentClass: e.target.value })}
                        placeholder="e.g., 9A"
                        required
                      />
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Contact Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label>Address</Label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Street address"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>City</Label>
                          <Input
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Postal Code</Label>
                          <Input
                            value={formData.postalCode}
                            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Emergency Contact
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Contact Name</Label>
                        <Input
                          value={formData.emergencyContact}
                          onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Contact Phone</Label>
                        <Input
                          type="tel"
                          value={formData.emergencyPhone}
                          onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Medical Information */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Medical Information</h3>
                    <div>
                      <Label>Allergies / Medical Conditions</Label>
                      <Input
                        value={formData.medicalInfo}
                        onChange={(e) => setFormData({ ...formData, medicalInfo: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                      {editingStudent ? "Update Student" : "Create Student"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => {
                      setIsAddDialogOpen(false);
                      resetForm();
                    }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Students List */}
          {isLoading ? (
            <div className="text-center py-8">Loading students...</div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student: Student) => (
                <div key={student.id} className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{student.firstName} {student.lastName}</p>
                      <p className="text-sm text-gray-600">
                        {student.studentId} • {student.studentClass} • {student.email}
                      </p>
                      {student.address && (
                        <p className="text-xs text-gray-500 mt-1">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {student.address}, {student.city}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(student)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(student.id, `${student.firstName} ${student.lastName}`)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredStudents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No students found
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
