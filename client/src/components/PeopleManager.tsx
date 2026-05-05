import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, Trash2, User, Users, Mail, Phone, MapPin, Link as LinkIcon, Home } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import BulkEmailConfigDialog, { BulkEmailConfig } from "./BulkEmailConfigDialog";

export default function PeopleManager() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("students");
  const [showBulkEmailDialog, setShowBulkEmailDialog] = useState(false);
  
  // Get adminId from URL params
  const adminId = params.adminId || window.location.pathname.split('/')[2];

  // Bulk email mutation
  const bulkEmailMutation = useMutation({
    mutationFn: async (config: BulkEmailConfig) => {
      const response = await fetch('/api/wilma/send-bulk-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send emails');
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Bulk email result:', data);
      
      // Calculate total recipients (students + parents)
      const studentCount = data.sent || 0;
      const parentCount = data.parentsSent || 0;
      const totalRecipients = studentCount + (parentCount > 0 ? parentCount : 0);
      
      toast({
        title: "✅ Sähköpostit lähetetty!",
        description: `Lähetetty ${totalRecipients} sähköpostia (${studentCount} opiskelijaa${parentCount > 0 ? ` + ${parentCount} huoltajaa` : ''})${data.failed > 0 ? `. Epäonnistui: ${data.failed}` : ''}`,
      });
      setShowBulkEmailDialog(false);
    },
    onError: (error: any) => {
      console.error('❌ Bulk email error:', error);
      toast({
        title: "❌ Virhe",
        description: `Sähköpostien lähetys epäonnistui: ${error.message}`,
        variant: "destructive",
      });
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

  // Memoize filtered results for performance
  const filteredStudents = useMemo(() => 
    students.filter((student: any) =>
      `${student.firstName} ${student.lastName} ${student.email} ${student.studentId} ${student.studentClass}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    ),
    [students, searchTerm]
  );

  const filteredParents = useMemo(() =>
    parentsWithStudentCount.filter((parent: any) =>
      `${parent.firstName} ${parent.lastName} ${parent.email}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    ),
    [parentsWithStudentCount, searchTerm]
  );

  // Delete mutations with proper toast notifications
  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/users/${id}`, { 
        method: "DELETE",
        credentials: "include"
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete student");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({
        title: "✅ Opiskelija poistettu",
        description: "Opiskelija on poistettu onnistuneesti.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Virhe",
        description: `Opiskelijan poistaminen epäonnistui: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const deleteParentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/users/${id}`, { 
        method: "DELETE",
        credentials: "include"
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete parent");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      toast({
        title: "✅ Huoltaja poistettu",
        description: "Huoltaja on poistettu onnistuneesti.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Virhe",
        description: `Huoltajan poistaminen epäonnistui: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-4">
      {/* Enhanced Header with Stats */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <User className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{students.length}</p>
              <p className="text-sm text-gray-600">Opiskelijaa</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{parents.length}</p>
              <p className="text-sm text-gray-600">Huoltajaa</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <Mail className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{students.filter((s: any) => s.email).length}</p>
              <p className="text-sm text-gray-600">Sähköpostia</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <Home className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">{new Set(students.map((s: any) => s.studentClass)).size}</p>
              <p className="text-sm text-gray-600">Luokkaa</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 mb-4">
          <TabsList className="bg-white border-2 border-gray-200 w-full md:w-auto shadow-sm">
            <TabsTrigger value="students" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white flex-1 md:flex-none">
              <User className="w-4 h-4 mr-2" />
              <span className="text-sm md:text-base font-semibold">Opiskelijat ({students.length})</span>
            </TabsTrigger>
            <TabsTrigger value="parents" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white flex-1 md:flex-none">
              <Users className="w-4 h-4 mr-2" />
              <span className="text-sm md:text-base font-semibold">Huoltajat ({parents.length})</span>
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
              onClick={() => setLocation(`/wilma-admin/${adminId}/add-student`)}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {filteredStudents.map((student: any) => (
                <Card key={student.id} className="hover:shadow-xl hover:scale-[1.02] transition-all duration-200 border-2 border-blue-100 bg-gradient-to-br from-white to-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <User className="w-7 h-7 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-lg truncate text-gray-800">{student.firstName} {student.lastName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">{student.studentId}</span>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">{student.studentClass}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm bg-white/50 rounded-lg p-3 mb-3">
                      <p className="flex items-center gap-2 text-gray-700 truncate">
                        <Mail className="w-4 h-4 flex-shrink-0 text-blue-600" />
                        <span className="truncate font-medium">{student.email}</span>
                      </p>
                      {student.phone && (
                        <p className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-4 h-4 flex-shrink-0 text-green-600" />
                          <span className="font-medium">{student.phone}</span>
                        </p>
                      )}
                      {student.address && (
                        <p className="flex items-center gap-2 text-gray-700 truncate">
                          <MapPin className="w-4 h-4 flex-shrink-0 text-red-600" />
                          <span className="truncate font-medium">{student.address}, {student.city}</span>
                        </p>
                      )}
                    </div>
                    {(student.parent1FirstName || student.parent2FirstName) && (
                      <div className="bg-purple-50 rounded-lg p-3 mb-3 border border-purple-200">
                        <p className="text-xs font-bold text-purple-700 mb-2 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Huoltajat:
                        </p>
                        {student.parent1FirstName && (
                          <p className="text-xs text-gray-700 font-medium mb-1">
                            👤 {student.parent1FirstName} {student.parent1LastName}
                          </p>
                        )}
                        {student.parent2FirstName && (
                          <p className="text-xs text-gray-700 font-medium">
                            👤 {student.parent2FirstName} {student.parent2LastName}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        onClick={() => {
                          // Use 8-digit student ID if available, otherwise use Firebase ID
                          const identifier = student.studentId || student.id;
                          setLocation(`/wilma-admin/${adminId}/student-view/${identifier}`);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Näytä
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-green-600 hover:bg-green-50 border-green-300 px-3"
                        onClick={() => {
                          if (confirm(`Lähetä salasanan nollauslinkki oppilaalle ${student.firstName} ${student.lastName}?`)) {
                            fetch(`/api/wilma/users/${student.id}/send-password-reset`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include'
                            })
                            .then(res => res.json())
                            .then(data => {
                              if (data.success) {
                                toast({
                                  title: "✅ Sähköposti lähetetty",
                                  description: `Salasanan nollauslinkki lähetetty osoitteeseen ${student.email}`,
                                });
                              } else {
                                toast({
                                  title: "❌ Virhe",
                                  description: data.message || "Sähköpostin lähetys epäonnistui",
                                  variant: "destructive",
                                });
                              }
                            })
                            .catch(err => {
                              toast({
                                title: "❌ Virhe",
                                description: `Virhe lähetyksessä: ${err.message}`,
                                variant: "destructive",
                              });
                            });
                          }
                        }}
                        title="Lähetä salasanan nollauslinkki"
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:bg-red-50 border-red-300 px-3"
                        onClick={() => {
                          if (confirm(`Poista ${student.firstName} ${student.lastName}?`)) {
                            deleteStudentMutation.mutate(student.id);
                          }
                        }}
                        disabled={deleteStudentMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {filteredParents.map((parent: any) => (
                <Card key={parent.id} className="hover:shadow-xl hover:scale-[1.02] transition-all duration-200 border-2 border-purple-100 bg-gradient-to-br from-white to-purple-50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Users className="w-7 h-7 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-lg truncate text-gray-800">{parent.firstName} {parent.lastName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">
                              {parent.relationship || "Huoltaja"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm bg-white/50 rounded-lg p-3 mb-3">
                      <p className="flex items-center gap-2 text-gray-700 truncate">
                        <Mail className="w-4 h-4 flex-shrink-0 text-purple-600" />
                        <span className="truncate font-medium">{parent.email}</span>
                      </p>
                      {parent.phone && (
                        <p className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-4 h-4 flex-shrink-0 text-green-600" />
                          <span className="font-medium">{parent.phone}</span>
                        </p>
                      )}
                      <p className="flex items-center gap-2 text-purple-700 font-semibold bg-purple-100 rounded px-2 py-1">
                        <LinkIcon className="w-4 h-4 flex-shrink-0" />
                        {parent.linkedStudentCount || 0} opiskelijaa linkitetty
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                        onClick={() => setLocation(`/wilma-admin/parent/${parent.id}`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Näytä
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:bg-red-50 border-red-300 px-3"
                        onClick={() => {
                          if (confirm(`Poista ${parent.firstName} ${parent.lastName}?`)) {
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
                  Ei huoltajia
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bulk Email Configuration Dialog - Single source of truth */}
      <BulkEmailConfigDialog
        open={showBulkEmailDialog}
        onOpenChange={setShowBulkEmailDialog}
        onSend={(config) => bulkEmailMutation.mutate(config)}
        students={students}
        isLoading={bulkEmailMutation.isPending}
      />
    </div>
  );
}
