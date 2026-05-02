import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, Edit, User, Calendar, Award, BookOpen, 
  Clock, Mail, Phone, MapPin, Users, Heart, AlertCircle,
  FileText, TrendingUp, CheckCircle
} from "lucide-react";

export default function StudentDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma-admin/:adminId/student-view/:studentId');
  const [activeTab, setActiveTab] = useState('overview');
  
  const adminId = params?.adminId;
  const studentId = params?.studentId;

  // CRITICAL FIX: Preserve user session when viewing student details
  // This prevents logout when returning from student profile
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Check and preserve authentication
  useState(() => {
    const storedUser = localStorage.getItem('wilma_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (err) {
        console.error('Failed to parse stored user:', err);
      }
    }
  });

  // Fetch student data - support both Firebase ID and 8-digit student ID
  const { data: student, isLoading, error } = useQuery({
    queryKey: ["student-detail", studentId],
    queryFn: async () => {
      console.log('📡 Fetching student detail for ID:', studentId);
      if (!studentId) {
        throw new Error("No student ID provided");
      }
      
      // Check if it's a 6-digit student ID
      const isStudentId = /^\d{6}$/.test(studentId);
      const endpoint = isStudentId 
        ? `/api/wilma/users/by-student-id/${studentId}`
        : `/api/wilma/users/${studentId}`;
      
      console.log(`🔍 Using endpoint: ${endpoint} (isStudentId: ${isStudentId})`);
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Student not found (ID: ${studentId})`);
        }
        throw new Error(`Failed to fetch student: ${response.statusText}`);
      }
      return await response.json();
    },
    enabled: !!studentId,
    retry: false
  });

  // Fetch student's attendance marks
  const { data: attendanceMarks = [] } = useQuery({
    queryKey: ["student-attendance", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/attendance-marks?studentId=${studentId}`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!studentId
  });

  // Fetch student's course enrollments
  const { data: enrollments = [] } = useQuery({
    queryKey: ["student-enrollments", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/students/${studentId}/enrollments`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!studentId
  });

  // Fetch student's schedule
  const { data: schedule = [] } = useQuery({
    queryKey: ["student-schedule", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/students/${studentId}/schedule`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!studentId
  });

  // Calculate attendance percentage
  const attendancePercentage = attendanceMarks.length > 0
    ? Math.round((attendanceMarks.filter((m: any) => m.markType === 'present').length / attendanceMarks.length) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#003d82] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ladataan opiskelijan tietoja...</p>
        </div>
      </div>
    );
  }

  if (!student || error) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Opiskelijaa ei löytynyt</h2>
          <p className="text-gray-600 mb-2">
            {error?.message || "Opiskelija ei ole enää saatavilla tai se on poistettu."}
          </p>
          <Button onClick={() => setLocation(`/wilma-admin/${adminId}/students`)} className="mt-4 bg-[#003d82] hover:bg-[#002d5f]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Takaisin opiskelijalistaan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setLocation(`/wilma-admin/${adminId}/students`)}
              className="flex items-center gap-2 rounded-lg"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Takaisin
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {student.firstName} {student.lastName}
              </h1>
              <p className="text-sm text-gray-600">
                {student.studentClass} • {student.studentId}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setLocation(`/wilma-admin/${adminId}/student/${studentId}`)}
            className="bg-[#003d82] hover:bg-[#002d5f] rounded-lg"
          >
            <Edit className="w-4 h-4 mr-2" />
            Muokkaa tietoja
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border border-[#dddddd] w-full md:w-auto grid grid-cols-5 md:flex rounded-lg">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white rounded-lg">
              <User className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Yleiskatsaus</span>
              <span className="md:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-[#7cb342] data-[state=active]:text-white rounded-lg">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Tuntimerkinnät</span>
              <span className="md:hidden">Tunnit</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white rounded-lg">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Lukujärjestys</span>
              <span className="md:hidden">Aikataulu</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white rounded-lg">
              <BookOpen className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Kurssit</span>
              <span className="md:hidden">Kurssit</span>
            </TabsTrigger>
            <TabsTrigger value="grades" className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white rounded-lg">
              <Award className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Arvosanat</span>
              <span className="md:hidden">Arvosanat</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Personal Info */}
              <Card className="lg:col-span-2 border-2 border-blue-200">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Henkilötiedot
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Nimi</p>
                      <p className="font-semibold">{student.firstName} {student.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Syntymäaika</p>
                      <p className="font-semibold">{student.dateOfBirth || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Luokka</p>
                      <p className="font-semibold">{student.studentClass}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Opiskelijanumero</p>
                      <p className="font-semibold">{student.studentId}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      Yhteystiedot
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Sähköposti</p>
                        <p className="font-semibold">{student.email || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Puhelin</p>
                        <p className="font-semibold">{student.phone || '-'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-600">Osoite</p>
                        <p className="font-semibold">
                          {student.address ? `${student.address}, ${student.postalCode} ${student.city}` : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="space-y-4">
                <Card className="bg-[#7cb342] text-white border-0 rounded-lg shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/90 text-sm">Tuntimerkinnät</p>
                        <p className="text-3xl font-bold mt-1">{attendancePercentage}%</p>
                        <p className="text-white/90 text-sm mt-1">{attendanceMarks.length} merkintää</p>
                      </div>
                      <CheckCircle className="w-12 h-12 text-white/80" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#003d82] text-white border-0 rounded-lg shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/90 text-sm">Kurssit</p>
                        <p className="text-3xl font-bold mt-1">{enrollments.length}</p>
                        <p className="text-white/90 text-sm mt-1">Ilmoittautunut</p>
                      </div>
                      <BookOpen className="w-12 h-12 text-white/80" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-[#dddddd] rounded-lg shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Keskiarvo</p>
                        <p className="text-3xl font-bold mt-1 text-[#003d82]">8.5</p>
                        <p className="text-gray-600 text-sm mt-1">Tällä jaksolla</p>
                      </div>
                      <Award className="w-12 h-12 text-[#003d82]/20" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Parents */}
            {(student.parent1FirstName || student.parent2FirstName) && (
              <Card className="border-2 border-purple-200">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Huoltajat
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {student.parent1FirstName && (
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="font-semibold text-lg">{student.parent1FirstName} {student.parent1LastName}</p>
                        <p className="text-sm text-gray-600 mb-2">{student.parent1Relationship || 'Huoltaja'}</p>
                        {student.parent1Email && (
                          <p className="text-sm flex items-center gap-2 mt-2">
                            <Mail className="w-4 h-4" />
                            {student.parent1Email}
                          </p>
                        )}
                        {student.parent1Phone && (
                          <p className="text-sm flex items-center gap-2 mt-1">
                            <Phone className="w-4 h-4" />
                            {student.parent1Phone}
                          </p>
                        )}
                      </div>
                    )}
                    {student.parent2FirstName && (
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="font-semibold text-lg">{student.parent2FirstName} {student.parent2LastName}</p>
                        <p className="text-sm text-gray-600 mb-2">{student.parent2Relationship || 'Huoltaja'}</p>
                        {student.parent2Email && (
                          <p className="text-sm flex items-center gap-2 mt-2">
                            <Mail className="w-4 h-4" />
                            {student.parent2Email}
                          </p>
                        )}
                        {student.parent2Phone && (
                          <p className="text-sm flex items-center gap-2 mt-1">
                            <Phone className="w-4 h-4" />
                            {student.parent2Phone}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Emergency Contact & Medical Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {student.emergencyContactName && (
                <Card className="border-2 border-red-200">
                  <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50">
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5 text-red-600" />
                      Hätäyhteystieto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="font-semibold">{student.emergencyContactName}</p>
                    <p className="text-sm text-gray-600">{student.emergencyContactRelation || '-'}</p>
                    <p className="text-sm mt-2">{student.emergencyContactPhone || '-'}</p>
                  </CardContent>
                </Card>
              )}

              {(student.allergies || student.medications || student.specialNeeds) && (
                <Card className="border-2 border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-orange-600" />
                      Terveystiedot
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-2">
                    {student.allergies && (
                      <div>
                        <p className="text-sm text-gray-600">Allergiat</p>
                        <p className="font-semibold">{student.allergies}</p>
                      </div>
                    )}
                    {student.medications && (
                      <div>
                        <p className="text-sm text-gray-600">Lääkitys</p>
                        <p className="font-semibold">{student.medications}</p>
                      </div>
                    )}
                    {student.specialNeeds && (
                      <div>
                        <p className="text-sm text-gray-600">Muut tiedot</p>
                        <p className="font-semibold">{student.specialNeeds}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
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
                <div className="space-y-3">
                  {['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'].map((day, idx) => (
                    <div key={day} className="border-b pb-3">
                      <h3 className="font-semibold text-lg mb-2">{day}</h3>
                      <div className="space-y-2">
                        {[
                          { time: '08:00-09:30', subject: 'Matematiikka', room: 'A201', teacher: 'M. Virtanen' },
                          { time: '09:45-11:15', subject: 'Englanti', room: 'B105', teacher: 'A. Korhonen' },
                          { time: '11:30-13:00', subject: 'Lounas', room: '-', teacher: '-' },
                          { time: '13:15-14:45', subject: 'Fysiikka', room: 'C301', teacher: 'P. Nieminen' },
                        ].map((lesson, lessonIdx) => (
                          <div key={lessonIdx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-4">
                              <Clock className="w-4 h-4 text-gray-600" />
                              <div>
                                <p className="font-semibold">{lesson.subject}</p>
                                <p className="text-sm text-gray-600">{lesson.time} • {lesson.room} • {lesson.teacher}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grades Tab */}
          <TabsContent value="grades">
            <Card className="border-2 border-purple-200">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  Arvosanat
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {[
                    { subject: 'Matematiikka', grade: '9', teacher: 'M. Virtanen', date: '15.04.2026', trend: 'up' },
                    { subject: 'Englanti', grade: '8', teacher: 'A. Korhonen', date: '14.04.2026', trend: 'stable' },
                    { subject: 'Fysiikka', grade: '10', teacher: 'P. Nieminen', date: '12.04.2026', trend: 'up' },
                    { subject: 'Historia', grade: '7', teacher: 'L. Mäkinen', date: '10.04.2026', trend: 'down' },
                    { subject: 'Kemia', grade: '9', teacher: 'K. Virtanen', date: '08.04.2026', trend: 'up' },
                  ].map((grade, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{grade.subject}</p>
                        <p className="text-sm text-gray-600">{grade.teacher} • {grade.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <TrendingUp className={`w-5 h-5 ${
                          grade.trend === 'up' ? 'text-green-500' :
                          grade.trend === 'down' ? 'text-red-500 rotate-180' :
                          'text-gray-400'
                        }`} />
                        <div className="text-3xl font-bold text-purple-600">{grade.grade}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments">
            <Card className="border-2 border-orange-200">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-orange-600" />
                  Tehtävät
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {[
                    { title: 'Matematiikan kotitehtävät', subject: 'Matematiikka', due: '22.04.2026', status: 'pending' },
                    { title: 'Englannin essee', subject: 'Englanti', due: '25.04.2026', status: 'submitted' },
                    { title: 'Fysiikan laboratoriotyö', subject: 'Fysiikka', due: '20.04.2026', status: 'graded' },
                    { title: 'Historian tutkielma', subject: 'Historia', due: '30.04.2026', status: 'pending' },
                  ].map((assignment, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold">{assignment.title}</p>
                        <p className="text-sm text-gray-600">{assignment.subject} • Eräpäivä: {assignment.due}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        assignment.status === 'graded' ? 'bg-green-100 text-green-700' :
                        assignment.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {assignment.status === 'graded' ? 'Arvioitu' :
                         assignment.status === 'submitted' ? 'Palautettu' :
                         'Odottaa'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
