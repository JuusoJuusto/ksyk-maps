import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, Award, BookOpen, Clock, User, Mail, Phone,
  TrendingUp, CheckCircle, AlertTriangle, Bell, Home,
  FileText, Users, MessageSquare
} from 'lucide-react';

interface StudentDashboardProps {
  student: any;
  language?: 'fi' | 'en';
}

export default function EnhancedStudentDashboard({ student, language = 'fi' }: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);

  useEffect(() => {
    fetchStudentData();
  }, [student.id]);

  const fetchStudentData = async () => {
    try {
      // Fetch schedule
      const scheduleRes = await fetch(`/api/wilma/schedules?studentId=${student.studentId}`);
      if (scheduleRes.ok) setSchedule(await scheduleRes.json());

      // Fetch grades
      const gradesRes = await fetch(`/api/wilma/grades?studentId=${student.studentId}`);
      if (gradesRes.ok) setGrades(await gradesRes.json());

      // Fetch assignments
      const assignmentsRes = await fetch(`/api/wilma/assignments?studentId=${student.studentId}`);
      if (assignmentsRes.ok) setAssignments(await assignmentsRes.json());

      // Fetch attendance
      const attendanceRes = await fetch(`/api/wilma/attendance?studentId=${student.studentId}`);
      if (attendanceRes.ok) setAttendance(await attendanceRes.json());
    } catch (error) {
      console.error('Error fetching student data:', error);
    }
  };

  const t = {
    fi: {
      welcome: 'Tervetuloa',
      overview: 'Yleiskatsaus',
      schedule: 'Lukujärjestys',
      grades: 'Arvosanat',
      assignments: 'Tehtävät',
      attendance: 'Läsnäolo',
      profile: 'Profiili',
      todaySchedule: 'Tämän päivän tunnit',
      upcomingAssignments: 'Tulevat tehtävät',
      recentGrades: 'Viimeisimmät arvosanat',
      attendanceRate: 'Läsnäoloprosentti',
      averageGrade: 'Keskiarvo',
      pendingTasks: 'Avoimet tehtävät',
      unreadMessages: 'Lukemattomat viestit',
      viewAll: 'Näytä kaikki',
      noData: 'Ei tietoja',
      studentInfo: 'Opiskelijan tiedot',
      contactInfo: 'Yhteystiedot',
      guardians: 'Huoltajat',
    },
    en: {
      welcome: 'Welcome',
      overview: 'Overview',
      schedule: 'Schedule',
      grades: 'Grades',
      assignments: 'Assignments',
      attendance: 'Attendance',
      profile: 'Profile',
      todaySchedule: "Today's Schedule",
      upcomingAssignments: 'Upcoming Assignments',
      recentGrades: 'Recent Grades',
      attendanceRate: 'Attendance Rate',
      averageGrade: 'Average Grade',
      pendingTasks: 'Pending Tasks',
      unreadMessages: 'Unread Messages',
      viewAll: 'View All',
      noData: 'No data available',
      studentInfo: 'Student Information',
      contactInfo: 'Contact Information',
      guardians: 'Guardians',
    }
  };

  const tr = t[language];

  // Calculate stats
  const avgGrade = grades.length > 0 
    ? (grades.reduce((sum, g) => sum + parseFloat(g.grade), 0) / grades.length).toFixed(1)
    : '0.0';
  
  const attendanceRate = attendance.length > 0
    ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)
    : 0;

  const pendingAssignments = assignments.filter(a => a.status === 'pending').length;

  // Get today's schedule
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const todaySchedule = schedule.filter(s => s.dayOfWeek === today);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {tr.welcome}, {student.firstName}!
              </h1>
              <div className="flex flex-wrap gap-4 text-indigo-100">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {student.studentClass}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  ID: {student.studentId}
                </span>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl font-bold">
                {student.firstName[0]}{student.lastName[0]}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">{tr.averageGrade}</p>
                  <p className="text-3xl font-bold mt-1">{avgGrade}</p>
                </div>
                <Award className="w-10 h-10 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">{tr.attendanceRate}</p>
                  <p className="text-3xl font-bold mt-1">{attendanceRate}%</p>
                </div>
                <CheckCircle className="w-10 h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">{tr.pendingTasks}</p>
                  <p className="text-3xl font-bold mt-1">{pendingAssignments}</p>
                </div>
                <FileText className="w-10 h-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">{tr.unreadMessages}</p>
                  <p className="text-3xl font-bold mt-1">3</p>
                </div>
                <MessageSquare className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border-2 border-indigo-200 w-full md:w-auto grid grid-cols-3 md:flex">
            <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Home className="w-4 h-4 mr-2" />
              {tr.overview}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              {tr.schedule}
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" />
              {tr.profile}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Today's Schedule */}
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    {tr.todaySchedule}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {todaySchedule.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">{tr.noData}</p>
                  ) : (
                    <div className="space-y-2">
                      {todaySchedule.slice(0, 4).map((lesson: any, idx: number) => (
                        <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-gray-800">{lesson.subject}</p>
                              <p className="text-sm text-gray-600">{lesson.room} • {lesson.teacherName}</p>
                            </div>
                            <Badge className="bg-blue-600">{lesson.timeSlot}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Assignments */}
              <Card className="border-2 border-orange-200">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    {tr.upcomingAssignments}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {pendingAssignments === 0 ? (
                    <p className="text-gray-500 text-center py-8">{tr.noData}</p>
                  ) : (
                    <div className="space-y-2">
                      {assignments.filter(a => a.status === 'pending').slice(0, 4).map((assignment: any, idx: number) => (
                        <div key={idx} className="p-3 bg-orange-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-gray-800">{assignment.title}</p>
                              <p className="text-sm text-gray-600">{assignment.subject}</p>
                            </div>
                            <Badge className="bg-orange-600">{assignment.dueDate}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Grades */}
            <Card className="border-2 border-green-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  {tr.recentGrades}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {grades.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">{tr.noData}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {grades.slice(0, 6).map((grade: any, idx: number) => (
                      <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-800">{grade.subject}</p>
                            <p className="text-sm text-gray-600">{grade.teacherName}</p>
                          </div>
                          <div className="text-3xl font-bold text-green-700">{grade.grade}</div>
                        </div>
                      </div>
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
                  {tr.schedule}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-600 text-center py-8">
                  Full schedule view coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card className="border-2 border-purple-200">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  {tr.studentInfo}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">{language === 'fi' ? 'Nimi' : 'Name'}</p>
                    <p className="font-semibold">{student.firstName} {student.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{language === 'fi' ? 'Luokka' : 'Class'}</p>
                    <p className="font-semibold">{student.studentClass}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{language === 'fi' ? 'Opiskelijanumero' : 'Student ID'}</p>
                    <p className="font-semibold">{student.studentId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{language === 'fi' ? 'Syntymäaika' : 'Date of Birth'}</p>
                    <p className="font-semibold">{student.dateOfBirth || '-'}</p>
                  </div>
                </div>

                {student.email && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-purple-600" />
                      {tr.contactInfo}
                    </h3>
                    <div className="space-y-2">
                      <p className="text-sm flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-600" />
                        {student.email}
                      </p>
                      {student.phone && (
                        <p className="text-sm flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-600" />
                          {student.phone}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {(student.parent1FirstName || student.parent2FirstName) && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      {tr.guardians}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {student.parent1FirstName && (
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <p className="font-semibold">{student.parent1FirstName} {student.parent1LastName}</p>
                          {student.parent1Email && (
                            <p className="text-sm text-gray-600 mt-1">{student.parent1Email}</p>
                          )}
                          {student.parent1Phone && (
                            <p className="text-sm text-gray-600">{student.parent1Phone}</p>
                          )}
                        </div>
                      )}
                      {student.parent2FirstName && (
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <p className="font-semibold">{student.parent2FirstName} {student.parent2LastName}</p>
                          {student.parent2Email && (
                            <p className="text-sm text-gray-600 mt-1">{student.parent2Email}</p>
                          )}
                          {student.parent2Phone && (
                            <p className="text-sm text-gray-600">{student.parent2Phone}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
