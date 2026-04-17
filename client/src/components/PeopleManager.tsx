import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, Trash2, User, Users, Mail, Phone, MapPin, Link as LinkIcon, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function PeopleManager() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("students");

  // Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/users?role=student");
      if (!response.ok) throw new Error("Failed to fetch students");
      return response.json();
    }
  });

  // Fetch parents
  const { data: parents = [], isLoading: parentsLoading } = useQuery({
    queryKey: ["parents"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/users?role=parent");
      if (!response.ok) throw new Error("Failed to fetch parents");
      return response.json();
    }
  });

  const filteredStudents = students.filter((student: any) =>
    `${student.firstName} ${student.lastName} ${student.email} ${student.studentId} ${student.studentClass}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const filteredParents = parents.filter((parent: any) =>
    `${parent.firstName} ${parent.lastName} ${parent.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Delete mutations
  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/users/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete student");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      alert("✅ Student deleted successfully!");
    }
  });

  const deleteParentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/users/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete parent");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      alert("✅ Parent deleted successfully!");
    }
  });

  return (
    <div className="space-y-4">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-white border-2 border-gray-200">
            <TabsTrigger value="students" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" />
              Students
            </TabsTrigger>
            <TabsTrigger value="parents" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Parents
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={`Search ${activeSubTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button 
              className={activeSubTab === "students" ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"}
              onClick={() => {
                const currentPath = window.location.pathname;
                const adminId = currentPath.split('/')[2]; // Extract admin ID from URL
                setLocation(`/wilma-admin/${adminId}/add-student`);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {activeSubTab === "students" ? "Student" : "Parent"}
            </Button>
          </div>
        </div>

        <TabsContent value="students" className="mt-0">
          {studentsLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading students...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((student: any) => (
                <Card key={student.id} className="hover:shadow-lg transition-shadow border-2 border-blue-100">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">{student.firstName} {student.lastName}</p>
                          <p className="text-sm text-gray-600">{student.studentId}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2 text-gray-700">
                        <span className="font-medium">Class:</span> {student.studentClass}
                      </p>
                      <p className="flex items-center gap-2 text-gray-700">
                        <Mail className="w-3 h-3" />
                        {student.email}
                      </p>
                      {student.phone && (
                        <p className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-3 h-3" />
                          {student.phone}
                        </p>
                      )}
                      {student.address && (
                        <p className="flex items-center gap-2 text-gray-700">
                          <MapPin className="w-3 h-3" />
                          {student.address}, {student.city}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          const currentPath = window.location.pathname;
                          const adminId = currentPath.split('/')[2];
                          setLocation(`/wilma-admin/${adminId}/student/${student.id}`);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (confirm(`Delete ${student.firstName} ${student.lastName}?`)) {
                            deleteStudentMutation.mutate(student.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredStudents.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No students found
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="parents" className="mt-0">
          {parentsLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading parents...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredParents.map((parent: any) => (
                <Card key={parent.id} className="hover:shadow-lg transition-shadow border-2 border-purple-100">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">{parent.firstName} {parent.lastName}</p>
                          <p className="text-sm text-gray-600">{parent.relationship || "Parent"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2 text-gray-700">
                        <Mail className="w-3 h-3" />
                        {parent.email}
                      </p>
                      {parent.phone && (
                        <p className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-3 h-3" />
                          {parent.phone}
                        </p>
                      )}
                      <p className="flex items-center gap-2 text-gray-700">
                        <LinkIcon className="w-3 h-3" />
                        {parent.studentIds?.length || 0} student(s) linked
                      </p>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setLocation(`/wilma-admin/parent/${parent.id}`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (confirm(`Delete ${parent.firstName} ${parent.lastName}?`)) {
                            deleteParentMutation.mutate(parent.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredParents.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No parents found
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
