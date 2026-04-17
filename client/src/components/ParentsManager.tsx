import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, Users, Mail, Phone, User, Link as LinkIcon } from "lucide-react";

interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  relationship?: string;
  studentIds?: string[];
  isActive: boolean;
}

export default function ParentsManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    relationship: "parent",
    studentIds: [] as string[],
    createAccount: true
  });

  // Fetch parents
  const { data: parents = [], isLoading } = useQuery({
    queryKey: ["parents"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/users?role=parent");
      if (!response.ok) throw new Error("Failed to fetch parents");
      return response.json();
    }
  });

  // Fetch students for linking
  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/users?role=student");
      if (!response.ok) throw new Error("Failed to fetch students");
      return response.json();
    }
  });

  // Create parent mutation
  const createParentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/wilma/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          role: "parent",
          username: data.email.split('@')[0],
          password: data.createAccount ? `Parent${Math.random().toString(36).slice(-8)}!` : undefined,
          isActive: true
        })
      });
      if (!response.ok) throw new Error("Failed to create parent");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      setIsAddDialogOpen(false);
      resetForm();
      alert("✅ Parent created successfully!");
    },
    onError: (error: any) => {
      alert(`❌ Failed to create parent: ${error.message}`);
    }
  });

  // Update parent mutation
  const updateParentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await fetch(`/api/wilma/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to update parent");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      setEditingParent(null);
      resetForm();
      alert("✅ Parent updated successfully!");
    },
    onError: (error: any) => {
      alert(`❌ Failed to update parent: ${error.message}`);
    }
  });

  // Delete parent mutation
  const deleteParentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/users/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error("Failed to delete parent");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      alert("✅ Parent deleted successfully!");
    },
    onError: (error: any) => {
      alert(`❌ Failed to delete parent: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingParent) {
      updateParentMutation.mutate({ id: editingParent.id, data: formData });
    } else {
      createParentMutation.mutate(formData);
    }
  };

  const handleEdit = (parent: Parent) => {
    setEditingParent(parent);
    setFormData({
      firstName: parent.firstName,
      lastName: parent.lastName,
      email: parent.email,
      phone: parent.phone || "",
      address: parent.address || "",
      city: parent.city || "",
      postalCode: parent.postalCode || "",
      relationship: parent.relationship || "parent",
      studentIds: parent.studentIds || [],
      createAccount: false
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteParentMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      relationship: "parent",
      studentIds: [],
      createAccount: true
    });
    setEditingParent(null);
  };

  const filteredParents = parents.filter((parent: Parent) =>
    `${parent.firstName} ${parent.lastName} ${parent.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const toggleStudentLink = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter(id => id !== studentId)
        : [...prev.studentIds, studentId]
    }));
  };

  return (
    <Card className="border-2 border-purple-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          Parent Management
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Search and Add */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search parents..."
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
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Parent
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingParent ? "Edit Parent" : "Add New Parent"}</DialogTitle>
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
                      <Label>Phone</Label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Relationship</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2"
                      value={formData.relationship}
                      onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    >
                      <option value="parent">Parent</option>
                      <option value="guardian">Guardian</option>
                      <option value="mother">Mother</option>
                      <option value="father">Father</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Address */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Address</h3>
                    <div className="space-y-4">
                      <div>
                        <Label>Street Address</Label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                    </div>
                  </div>

                  {/* Link to Students */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Link to Students
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {students.map((student: any) => (
                        <label key={student.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.studentIds.includes(student.id)}
                            onChange={() => toggleStudentLink(student.id)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">
                            {student.firstName} {student.lastName} ({student.studentId} - {student.studentClass})
                          </span>
                        </label>
                      ))}
                      {students.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No students available</p>
                      )}
                    </div>
                  </div>

                  {/* Account Creation */}
                  {!editingParent && (
                    <div className="border-t pt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.createAccount}
                          onChange={(e) => setFormData({ ...formData, createAccount: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium">Create Wilma account for parent</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        If checked, parent will receive login credentials via email
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                      {editingParent ? "Update Parent" : "Create Parent"}
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

          {/* Parents List */}
          {isLoading ? (
            <div className="text-center py-8">Loading parents...</div>
          ) : (
            <div className="space-y-2">
              {filteredParents.map((parent: Parent) => (
                <div key={parent.id} className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{parent.firstName} {parent.lastName}</p>
                      <p className="text-sm text-gray-600">
                        <Mail className="w-3 h-3 inline mr-1" />
                        {parent.email}
                        {parent.phone && (
                          <>
                            {" • "}
                            <Phone className="w-3 h-3 inline mr-1" />
                            {parent.phone}
                          </>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {parent.relationship || "Parent"} • {parent.studentIds?.length || 0} student(s) linked
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(parent)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(parent.id, `${parent.firstName} ${parent.lastName}`)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredParents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No parents found
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
