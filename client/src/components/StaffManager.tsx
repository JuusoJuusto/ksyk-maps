}>
                {updateStaffMutation.isPending ? "Updating..." : "Update Staff Member"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
               onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingStaff(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateStaffMutation.isPending        <Label htmlFor="edit-officeLocation">Office Location</Label>
              <Input
                id="edit-officeLocation"
                value={formData.officeLocation}
                onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={formData.isActive}
 
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
            </div>
            
            <div>
      >Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-position">Position</Label>
                <Input
                  id="edit-position"
                  value={formData.position}     />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone"             value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-lastName">Last Name *</Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
           w-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update the staff member's information below
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-firstName">First Name *</Label>
                <Input
                  id="edit-firstName"
       onClick={() => handleDelete(member.id, `${member.firstName} ${member.lastName}`)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editingStaff !== null} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overfloine" 
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        handleEdit(member);
                        setIsAddDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    "text-xs text-gray-500">{member.officeLocation}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={member.isActive ? "default" : "secondary"} className={member.isActive ? "bg-green-600" : ""}>
                      {member.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outl">
                        {member.firstName} {member.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {member.position || 'No position'} • {member.department || 'No department'}
                      </p>
                      {member.email && (
                        <p className="text-xs text-gray-500 mt-1">{member.email}</p>
                      )}
                      {member.officeLocation && (
                        <p className=="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {member.firstName?.[0]}{member.lastName?.[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900uto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-600 mb-4">No staff members match "{searchQuery}"</p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStaff.map((member: Staff) => (
                <div key={member.id} className         <p className="text-gray-600 mb-6">Get started by adding your first staff member</p>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Staff Member
              </Button>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-16 w-16 mx-a
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading staff...</p>
            </div>
          ) : filteredStaff.length === 0 && staff.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Staff Members</h3>
     /CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>
            {filteredStaff.length === 0 && staff.length > 0
              ? `No staff members match "${searchQuery}"`
              : filteredStaff.length === 0
              ? "No staff members found. Add staff members to get started."
              : `Showing ${filteredStaff.length} of ${staff.length} staff members`
            }</CardContent>
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
          <Content>
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
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {staff.filter((s: Staff) => s.isActive).length}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </Card   </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{staff.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>4 text-gray-400" />
          <Input
            placeholder="Search staff by name, email, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
           </Button>
                <Button type="submit" disabled={createStaffMutation.isPending}>
                  {createStaffMutation.isPending ? "Adding..." : "Add Staff Member"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-               id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                              <Label htmlFor="officeLocation">Office Location</Label>
                <Input
                  id="officeLocation"
                  value={formData.officeLocation}
                  onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                  placeholder="e.g., Building M, Room 101"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
    Principal"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g., Mathematics, Administration"
                  />
                </div>
              </div>
              
              <div>
setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="e.g., Teacher,    <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>     />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                            </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
              enChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Enter the staff member's information below
rCase()) ||
    member.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.position?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff Management</h2>
          <p className="text-muted-foreground">Manage staff members and their information</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpocation || "",
      isActive: member.isActive
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteStaffMutation.mutate(id);
    }
  };

  const filteredStaff = staff.filter((member: Staff) =>
    searchQuery === "" ||
    member.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowe   
    if (editingStaff) {
      updateStaffMutation.mutate({ id: editingStaff.id, data: formData });
    } else {
      createStaffMutation.mutate(formData);
    }
  };

  const handleEdit = (member: Staff) => {
    setEditingStaff(member);
    setFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email || "",
      phone: member.phone || "",
      position: member.position || "",
      department: member.department || "",
      officeLocation: member.officeL (error) => {
      alert("❌ Failed to delete staff member: " + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      position: "",
      department: "",
      officeLocation: "",
      isActive: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      alert("Please enter first and last name");
      return;
    }
 mber: " + error.message);
    }
  });

  // Delete staff mutation
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
      alert("✅ Staff member deleted successfully!");
    },
    onError: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update staff member");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setEditingStaff(null);
      resetForm();
      alert("✅ Staff member updated successfully!");
    },
    onError: (error) => {
      alert("❌ Failed to update staff me: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setIsAddDialogOpen(false);
      resetForm();
      alert("✅ Staff member added successfully!");
    },
    onError: (error) => {
      alert("❌ Failed to add staff member: " + error.message);
    }
  });

  // Update staff mutation
  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await fetch(`/api/staff/${id}`, {
        method:to fetch staff");
      return response.json();
    },
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create staff member");
      return response.json();
    },
    onSuccessf] = useState<Staff | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    officeLocation: "",
    isActive: true
  });

  // Fetch staff
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const response = await fetch("/api/staff");
      if (!response.ok) throw new Error("Failed t";
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Building, 
  Layers,
  AlertTriangle,
  Search,
  X
} from "lucide-react";

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  officeLocation?: string;
  isActive: boolean;
}

export default function StaffManager() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStaff, setEditingStafeQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alerimport { useState } from "react";
import { useQuery, useMutation, us