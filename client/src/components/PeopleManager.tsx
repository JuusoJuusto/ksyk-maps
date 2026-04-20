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
  const [showBulkEmailDialog, setShowBulkEmailDialog] = useState(false);

  // Bulk email mutation
  const bulkEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/wilma/send-bulk-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send emails');
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Bulk email result:', data);
      alert(`✅ Lähetetty ${data.sent} sähköpostia onnistuneesti!${data.failed > 0 ? ` Epäonnistui: ${data.failed}` : ''}`);
      setShowBulkEmailDialog(false);
    },
    onError: (error: any) => {
      console.error('❌ Bulk email error:', error);
      alert(`❌ Sähköpostien lähetys epäonnistui: ${error.message}`);
    }
  });

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

  // Calculate linked students count for each parent
  const parentsWithStudentCount = parents.map((parent: any) => {
    const linkedStudents = students.filter((student: any) => 
      student.parent1Id === parent.id || student.parent2Id === parent.id
    );
    return {
      ...parent,
      linkedStudentCount: linkedStudents.length
    };
  });

  const filteredStudents = students.filter((student: any) =>
    `${student.firstName} ${student.lastName} ${student.email} ${student.studentId} ${student.studentClass}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const filteredParents = parentsWithStudentCount.filter((parent: any) =>
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
    <div className="space-y-4 p-2 md:p-0">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 mb-4">
          <TabsList className="bg-white border-2 border-gray-200 w-full md:w-auto">
            <TabsTrigger value="students" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex-1 md:flex-none">
              <User className="w-4 h-4 mr-2" />
              <span className="text-sm md:text-base">Opiskelijat</span>
            </TabsTrigger>
            <TabsTrigger value="parents" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white flex-1 md:flex-none">
              <Users className="w-4 h-4 mr-2" />
              <span className="text-sm md:text-base">Huoltajat</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={`Hae ${activeSubTab === "students" ? "opiskelijoita" : "huoltajia"}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full md:w-64"
              />
            </div>
            {activeSubTab === "students" && (
              <Button 
                onClick={() => setShowBulkEmailDialog(true)}
                className="bg-green-600 hover:bg-green-700 w-full md:w-auto"
                size="sm"
              >
                <Mail className="w-4 h-4 mr-2" />
                <span className="text-sm">Lähetä sähköpostit</span>
              </Button>
            )}
            <Button 
              className={`${activeSubTab === "students" ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"} w-full md:w-auto`}
              onClick={() => {
                const currentPath = window.location.pathname;
                const adminId = currentPath.split('/')[2];
                setLocation(`/wilma-admin/${adminId}/add-student`);
              }}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="text-sm">Lisää {activeSubTab === "students" ? "opiskelija" : "huoltaja"}</span>
            </Button>
          </div>
        </div>

        <TabsContent value="students" className="mt-0">
          {studentsLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Ladataan opiskelijoita...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {filteredStudents.map((student: any) => (
                <Card key={student.id} className="hover:shadow-lg transition-shadow border-2 border-blue-100">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-base md:text-lg truncate">{student.firstName} {student.lastName}</p>
                          <p className="text-xs md:text-sm text-gray-600">{student.studentId}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                      <p className="flex items-center gap-2 text-gray-700">
                        <span className="font-medium">Luokka:</span> {student.studentClass}
                      </p>
                      <p className="flex items-center gap-2 text-gray-700 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{student.email}</span>
                      </p>
                      {student.phone && (
                        <p className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          {student.phone}
                        </p>
                      )}
                      {student.address && (
                        <p className="flex items-center gap-2 text-gray-700 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{student.address}, {student.city}</span>
                        </p>
                      )}
                      {(student.parent1FirstName || student.parent2FirstName) && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Huoltajat:</p>
                          {student.parent1FirstName && (
                            <p className="text-xs text-gray-600">
                              • {student.parent1FirstName} {student.parent1LastName}
                            </p>
                          )}
                          {student.parent2FirstName && (
                            <p className="text-xs text-gray-600">
                              • {student.parent2FirstName} {student.parent2LastName}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3 md:mt-4 pt-3 md:pt-4 border-t">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-xs md:text-sm"
                        onClick={() => {
                          const currentPath = window.location.pathname;
                          const adminId = currentPath.split('/')[2];
                          setLocation(`/wilma-admin/${adminId}/student-view/${student.id}`);
                        }}
                      >
                        <Edit className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                        Katso
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:bg-red-50 px-2 md:px-3"
                        onClick={() => {
                          if (confirm(`Poista ${student.firstName} ${student.lastName}?`)) {
                            deleteStudentMutation.mutate(student.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredStudents.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  Ei opiskelijoita
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="parents" className="mt-0">
          {parentsLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Ladataan huoltajia...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {filteredParents.map((parent: any) => (
                <Card key={parent.id} className="hover:shadow-lg transition-shadow border-2 border-purple-100">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-base md:text-lg truncate">{parent.firstName} {parent.lastName}</p>
                          <p className="text-xs md:text-sm text-gray-600">{parent.relationship || "Huoltaja"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                      <p className="flex items-center gap-2 text-gray-700 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{parent.email}</span>
                      </p>
                      {parent.phone && (
                        <p className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          {parent.phone}
                        </p>
                      )}
                      <p className="flex items-center gap-2 text-gray-700">
                        <LinkIcon className="w-3 h-3 flex-shrink-0" />
                        {parent.linkedStudentCount || 0} opiskelijaa linkitetty
                      </p>
                    </div>
                    <div className="flex gap-2 mt-3 md:mt-4 pt-3 md:pt-4 border-t">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-xs md:text-sm"
                        onClick={() => setLocation(`/wilma-admin/parent/${parent.id}`)}
                      >
                        <Edit className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                        Muokkaa
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:bg-red-50 px-2 md:px-3"
                        onClick={() => {
                          if (confirm(`Poista ${parent.firstName} ${parent.lastName}?`)) {
                            deleteParentMutation.mutate(parent.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredParents.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  Ei huoltajia
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bulk Email Dialog */}
      {showBulkEmailDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 md:p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Mail className="w-5 h-5 text-green-600" />
                Lähetä tervetulosähköpostit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <p className="mb-3 md:mb-4 text-sm md:text-base">
                Haluatko lähettää tervetulosähköpostit kaikille opiskelijoille ja heidän huoltajilleen?
              </p>
              <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6">
                Sähköpostit lähetetään vain opiskelijoille, joilla on väliaikainen salasana.
              </p>
              <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                <Button
                  onClick={() => bulkEmailMutation.mutate()}
                  disabled={bulkEmailMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  {bulkEmailMutation.isPending ? 'Lähetetään...' : 'Lähetä'}
                </Button>
                <Button
                  onClick={() => setShowBulkEmailDialog(false)}
                  variant="outline"
                  disabled={bulkEmailMutation.isPending}
                  size="sm"
                >
                  Peruuta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
