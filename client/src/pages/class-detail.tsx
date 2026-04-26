import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import WilmaStyleAttendance from "@/components/WilmaStyleAttendance";
import { 
  ArrowLeft, Users, Calendar, CheckCircle, TrendingUp,
  User, Mail, Phone, Award, Clock, BookOpen
} from "lucide-react";

export default function ClassDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma-admin/:adminId/class/:classId');
  const [activeTab, setActiveTab] = useState('students');
  
  const adminId = params?.adminId;
  const classId = params?.classId;

  // Fetch class data
  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ["class-detail", classId],
    queryFn: async () => {
      if (!classId) throw new Error("No class ID");
      const response = await fetch(`/api/wilma/classes/${classId}`);
      if (!response.ok) throw new Error("Failed to fetch class");
      return response.json();
    },
    enabled: !!classId
  });

  // Fetch students in this class
  const { data: allStudents = [] } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const response = await fetch("/api/wilma/users?role=student");
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Filter students by class
  const students = allStudents.filter((s: any) => s.studentClass === classData?.name);

  // Fetch schedules for this class
  const { data: schedules = [] } = useQuery({
    queryKey: ["class-schedules", classData?.name],
    queryFn: async () => {
      if (!classData?.name) return [];
      const response = await fetch(`/api/wilma/schedules?class=${classData.name}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!classData?.name
  });

  // Fetch attendance for this class
  const { data: attendance = [] } = useQuery({
    queryKey: ["class-attendance", classData?.name],
    queryFn: async () => {
      if (!classData?.name) return [];
      // TODO: Implement attendance API
      return [];
    },
    enabled: !!classData?.name
  });

  if (classLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ladataan luokan tietoja...</p>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Luokkaa ei löytynyt</h2>
          <Button onClick={() => setLocation(`/wilma-admin/${adminId}/classes`)} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Takaisin luokkaluetteloon
          </Button>
        </div>
      </div>
    );
  }

  // Group schedules by day
  const DAYS = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'];
  const scheduleByDay: any = {};
  DAYS.forEach(day => {
    scheduleByDay[day] = schedules.filter((s: any) => s.day === day).sort((a: any, b: any) => {
      return a.timeSlot.localeCompare(b.timeSlot);
    });
  });

  // Calculate class statistics
  const avgGrade = 8.5; // TODO: Calculate from actual grades
  const attendanceRate = 95; // TODO: Calculate from actual attendance
  const maleCount = students.filter((s: any) => s.gender === 'male').length;
  const femaleCount = students.filter((s: any) => s.gender === 'female').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <Button
            variant="outline"
            onClick={() => setLocation(`/wilma-admin/${adminId}/classes`)}
            className="mb-4"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Takaisin
          </Button>
          
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Luokka {classData.name}</h1>
                <div className="flex flex-wrap gap-4 text-indigo-100">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {students.length} oppilasta
                  </span>
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Luokanvalvoja: {classData.homeroomTeacher}
                  </span>
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Kotiluokka: {classData.homeroom}
                  </span>
                </div>
              </div>
              <div className="hidden md:block text-6xl font-bold opacity-20">
                {classData.name}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Oppilaita</p>
                  <p className="text-3xl font-bold mt-1">{students.length}</p>
                </div>
                <Users className="w-10 h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Keskiarvo</p>
                  <p className="text-3xl font-bold mt-1">{avgGrade}</p>
                </div>
                <Award className="w-10 h-10 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Läsnäolo</p>
                  <p className="text-3xl font-bold mt-1">{attendanceRate}%</p>
                </div>
                <CheckCircle className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Tunteja</p>
                  <p className="text-3xl font-bold mt-1">{schedules.length}</p>
                </div>
                <Calendar className="w-10 h-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border-2 border-indigo-200 w-full md:w-auto grid grid-cols-3 md:flex">
            <TabsTrigger value="students" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Oppilaat
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Lukujärjestys
            </TabsTrigger>
            <TabsTrigger value="attendanceMarks" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <CheckCircle className="w-4 h-4 mr-2" />
              Tuntimerkinnät
            </TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card className="border-2 border-indigo-200">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Oppilasluettelo ({students.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {students.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Ei oppilaita tässä luokassa</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map((student: any) => (
                      <Card 
                        key={student.id}
                        className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-indigo-100 hover:border-indigo-300"
                        onClick={() => setLocation(`/wilma-admin/${adminId}/student-view/${student.studentId || student.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                              {student.firstName[0]}{student.lastName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg truncate">
                                {student.firstName} {student.lastName}
                              </h3>
                              <p className="text-sm text-gray-600">ID: {student.studentId}</p>
                              {student.email && (
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                  <Mail className="w-3 h-3" />
                                  {student.email}
                                </p>
                              )}
                              {student.phone && (
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {student.phone}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Parent Info */}
                          {(student.parent1FirstName || student.parent2FirstName) && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-semibold text-gray-700 mb-1">Huoltajat:</p>
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <Card className="border-2 border-green-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Viikon lukujärjestys
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {schedules.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Ei lukujärjestystä tälle luokalle</p>
                    <Button 
                      onClick={() => setLocation(`/wilma-admin/${adminId}/schedule`)}
                      className="mt-4 bg-green-600 hover:bg-green-700"
                    >
                      Luo lukujärjestys
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {DAYS.map(day => (
                      <div key={day} className="border-b pb-4 last:border-b-0">
                        <h3 className="font-semibold text-lg mb-3 text-green-700">{day}</h3>
                        {scheduleByDay[day].length === 0 ? (
                          <p className="text-sm text-gray-500 italic">Ei tunteja</p>
                        ) : (
                          <div className="space-y-2">
                            {scheduleByDay[day].map((lesson: any) => (
                              <div key={lesson.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                                <Clock className="w-4 h-4 text-green-600" />
                                <div className="flex-1">
                                  <p className="font-semibold">{lesson.subject}</p>
                                  <p className="text-sm text-gray-600">
                                    {lesson.timeSlot} • {lesson.teacher} • {lesson.room}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Marks Tab */}
          <TabsContent value="attendanceMarks">
            <WilmaStyleAttendance preSelectedClass={classData?.name} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
