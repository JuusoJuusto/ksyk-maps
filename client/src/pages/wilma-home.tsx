import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  Calendar, FileText, MessageSquare, Home, LogOut, User,
  BookOpen, Clock, Award, CheckCircle, AlertCircle, Mail,
  Phone, Download, Bell
} from 'lucide-react';

/**
 * Wilma Home - Student/Parent View
 * OLD WILMA STYLE - No gradients, simple colors, clean design
 * REAL DATA ONLY - No mock data
 */
export default function WilmaHome() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma/:studentId/:section?');
  const [activeSection, setActiveSection] = useState('frontpage');
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const studentId = params?.studentId;

  // Load current user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('wilma_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (err) {
        console.error('Failed to parse stored user:', err);
        setLocation('/wilma');
      }
    } else {
      setLocation('/wilma');
    }
  }, []);

  // Set active section from URL
  useEffect(() => {
    if (match && params?.section) {
      setActiveSection(params.section);
    } else if (match) {
      setActiveSection('frontpage');
    }
  }, [match, params]);

  // Fetch student data by studentId (6-digit)
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ["wilma-student", studentId],
    queryFn: async () => {
      if (!studentId) throw new Error("No student ID");
      const response = await fetch(`/api/wilma/users/by-student-id/${studentId}`);
      if (!response.ok) throw new Error("Failed to fetch student");
      return await response.json();
    },
    enabled: !!studentId
  });

  // Fetch schedule - REAL DATA ONLY
  const { data: schedule = [] } = useQuery({
    queryKey: ["wilma-schedule", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/schedules/${studentId}`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!studentId
  });

  // Fetch grades - REAL DATA ONLY
  const { data: grades = [] } = useQuery({
    queryKey: ["wilma-grades", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/grades/${studentId}`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!studentId
  });

  // Fetch assignments - REAL DATA ONLY
  const { data: assignments = [] } = useQuery({
    queryKey: ["wilma-assignments", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/assignments/${studentId}`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!studentId
  });

  // Fetch messages - REAL DATA ONLY
  const { data: messages = [] } = useQuery({
    queryKey: ["wilma-messages", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/messages/${studentId}`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!studentId
  });

  // Fetch attendance - REAL DATA ONLY
  const { data: attendance = [] } = useQuery({
    queryKey: ["wilma-attendance", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/attendance/${studentId}`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!studentId
  });

  // Fetch exams - REAL DATA ONLY
  const { data: exams = [] } = useQuery({
    queryKey: ["wilma-exams", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/exams/${studentId}`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!studentId
  });

  const handleLogout = () => {
    localStorage.removeItem('wilma_user');
    setLocation('/wilma');
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setLocation(`/wilma/${studentId}/${section === 'frontpage' ? '' : section}`);
  };

  if (studentLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#003d82] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ladataan...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="max-w-md border-2 border-red-200">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Virhe</h2>
            <p className="text-gray-600 mb-4">Opiskelijaa ei löytynyt.</p>
            <Button onClick={() => setLocation('/wilma')} className="bg-[#003d82] hover:bg-[#002d5f]">
              Takaisin kirjautumiseen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get today's schedule
  const today = new Date().getDay(); // 0=Sunday, 1=Monday, etc.
  const todaySchedule = schedule.filter((s: any) => s.dayOfWeek === today);

  // Get unread messages count
  const unreadCount = messages.filter((m: any) => !m.isRead).length;

  // Calculate attendance percentage
  const attendancePercentage = attendance.length > 0
    ? Math.round((attendance.filter((a: any) => a.status === 'present').length / attendance.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* OLD WILMA STYLE HEADER - Flat blue, no gradients */}
      <header className="bg-[#003d82] text-white border-b-4 border-[#002d5f]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/kulosaaren_yhteiskoulu_logo.jpeg" alt="Logo" className="w-10 h-10 rounded" />
              <div>
                <h1 className="text-xl font-bold">Wilma</h1>
                <p className="text-sm text-blue-200">Kulosaaren yhteiskoulu</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold">{student.firstName} {student.lastName}</p>
                <p className="text-sm text-blue-200">{student.studentClass}</p>
              </div>
              <Button 
                onClick={handleLogout}
                variant="outline"
                className="bg-white text-[#003d82] hover:bg-gray-100 border-2"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Kirjaudu ulos
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* OLD WILMA STYLE NAVIGATION - Simple tabs, no gradients */}
      <nav className="bg-white border-b-2 border-[#dddddd]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'frontpage', label: 'Etusivu', icon: Home },
              { id: 'schedule', label: 'Lukujärjestys', icon: Calendar },
              { id: 'grades', label: 'Arvosanat', icon: Award },
              { id: 'assignments', label: 'Tehtävät', icon: FileText },
              { id: 'messages', label: 'Viestit', icon: MessageSquare },
              { id: 'attendance', label: 'Tuntimerkinnät', icon: CheckCircle },
              { id: 'exams', label: 'Kokeet', icon: BookOpen },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleSectionChange(item.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeSection === item.id
                    ? 'bg-[#003d82] text-white border-b-4 border-[#002d5f]'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden md:inline">{item.label}</span>
                {item.id === 'messages' && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* CONTENT AREA - OLD WILMA STYLE */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* FRONTPAGE */}
        {activeSection === 'frontpage' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Tervetuloa, {student.firstName}!</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Today's Schedule */}
              <Card className="border-2 border-[#dddddd]">
                <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#003d82]" />
                    Tänään
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {todaySchedule.length > 0 ? (
                    <div className="space-y-2">
                      {todaySchedule.map((lesson: any, idx: number) => (
                        <div key={idx} className="border-b border-gray-200 pb-2">
                          <p className="font-semibold text-sm">{lesson.subject}</p>
                          <p className="text-xs text-gray-600">{lesson.timeSlot} • {lesson.room}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Ei tunteja tänään</p>
                  )}
                </CardContent>
              </Card>

              {/* Attendance */}
              <Card className="border-2 border-[#dddddd]">
                <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Läsnäolo
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-[#003d82]">{attendancePercentage}%</p>
                    <p className="text-sm text-gray-600 mt-2">{attendance.length} merkintää</p>
                  </div>
                </CardContent>
              </Card>

              {/* Messages */}
              <Card className="border-2 border-[#dddddd]">
                <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#003d82]" />
                    Viestit
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-[#003d82]">{unreadCount}</p>
                    <p className="text-sm text-gray-600 mt-2">Lukematonta viestiä</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Grades */}
            <Card className="border-2 border-[#dddddd]">
              <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#003d82]" />
                  Viimeisimmät arvosanat
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {grades.length > 0 ? (
                  <div className="space-y-2">
                    {grades.slice(0, 5).map((grade: any) => (
                      <div key={grade.id} className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <div>
                          <p className="font-semibold">{grade.subject}</p>
                          <p className="text-sm text-gray-600">{grade.teacherName}</p>
                        </div>
                        <div className="text-2xl font-bold text-[#003d82]">{grade.grade}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Ei arvosanoja</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* SCHEDULE */}
        {activeSection === 'schedule' && (
          <Card className="border-2 border-[#dddddd]">
            <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
              <CardTitle className="text-xl flex items-center gap-2">
                <Calendar className="w-6 h-6 text-[#003d82]" />
                Lukujärjestys
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {schedule.length > 0 ? (
                <div className="space-y-4">
                  {['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'].map((day, dayIdx) => {
                    const dayLessons = schedule.filter((s: any) => s.dayOfWeek === dayIdx + 1);
                    return (
                      <div key={day} className="border-2 border-[#dddddd] rounded">
                        <div className="bg-[#f5f5f5] px-4 py-2 border-b-2 border-[#dddddd]">
                          <h3 className="font-bold">{day}</h3>
                        </div>
                        <div className="p-4 space-y-2">
                          {dayLessons.length > 0 ? (
                            dayLessons.map((lesson: any) => (
                              <div key={lesson.id} className="flex items-center justify-between border-b border-gray-200 pb-2">
                                <div>
                                  <p className="font-semibold">{lesson.subject}</p>
                                  <p className="text-sm text-gray-600">{lesson.teacherName} • {lesson.room}</p>
                                </div>
                                <p className="text-sm font-medium text-[#003d82]">{lesson.timeSlot}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm">Ei tunteja</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500">Lukujärjestystä ei ole määritetty</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* GRADES */}
        {activeSection === 'grades' && (
          <Card className="border-2 border-[#dddddd]">
            <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
              <CardTitle className="text-xl flex items-center gap-2">
                <Award className="w-6 h-6 text-[#003d82]" />
                Arvosanat
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {grades.length > 0 ? (
                <div className="space-y-2">
                  {grades.map((grade: any) => (
                    <div key={grade.id} className="flex items-center justify-between border-2 border-[#dddddd] rounded p-3">
                      <div className="flex-1">
                        <p className="font-bold text-lg">{grade.subject}</p>
                        <p className="text-sm text-gray-600">{grade.teacherName}</p>
                        {grade.comments && <p className="text-sm text-gray-700 mt-1">{grade.comments}</p>}
                      </div>
                      <div className="text-4xl font-bold text-[#003d82]">{grade.grade}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Ei arvosanoja</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ASSIGNMENTS */}
        {activeSection === 'assignments' && (
          <Card className="border-2 border-[#dddddd]">
            <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="w-6 h-6 text-[#003d82]" />
                Tehtävät
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {assignments.length > 0 ? (
                <div className="space-y-2">
                  {assignments.map((assignment: any) => (
                    <div key={assignment.id} className="border-2 border-[#dddddd] rounded p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold">{assignment.title}</p>
                          <p className="text-sm text-gray-600">{assignment.subject} • {assignment.teacherName}</p>
                          {assignment.description && <p className="text-sm text-gray-700 mt-2">{assignment.description}</p>}
                          <p className="text-sm text-gray-600 mt-2">Eräpäivä: {assignment.dueDate}</p>
                        </div>
                        <span className={`px-3 py-1 rounded text-sm font-medium ${
                          assignment.status === 'graded' ? 'bg-green-100 text-green-700' :
                          assignment.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {assignment.status === 'graded' ? 'Arvioitu' :
                           assignment.status === 'submitted' ? 'Palautettu' :
                           'Odottaa'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Ei tehtäviä</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* MESSAGES */}
        {activeSection === 'messages' && (
          <Card className="border-2 border-[#dddddd]">
            <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
              <CardTitle className="text-xl flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-[#003d82]" />
                Viestit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {messages.length > 0 ? (
                <div className="space-y-2">
                  {messages.map((message: any) => (
                    <div key={message.id} className={`border-2 rounded p-3 ${
                      message.isRead ? 'border-[#dddddd] bg-white' : 'border-[#003d82] bg-blue-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold">{message.subject}</p>
                          <p className="text-sm text-gray-600">Lähettäjä: {message.fromUserName}</p>
                          <p className="text-sm text-gray-700 mt-2">{message.content}</p>
                        </div>
                        {!message.isRead && (
                          <span className="bg-[#003d82] text-white text-xs px-2 py-1 rounded">Uusi</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Ei viestejä</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ATTENDANCE */}
        {activeSection === 'attendance' && (
          <Card className="border-2 border-[#dddddd]">
            <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
              <CardTitle className="text-xl flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                Tuntimerkinnät
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {attendance.length > 0 ? (
                <div className="space-y-2">
                  {attendance.map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between border-2 border-[#dddddd] rounded p-3">
                      <div>
                        <p className="font-semibold">{record.date}</p>
                        {record.reason && <p className="text-sm text-gray-600">{record.reason}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded text-sm font-medium ${
                          record.status === 'present' ? 'bg-green-100 text-green-700' :
                          record.status === 'absent' ? 'bg-red-100 text-red-700' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {record.status === 'present' ? 'Läsnä' :
                           record.status === 'absent' ? 'Poissa' :
                           record.status === 'late' ? 'Myöhässä' :
                           'Hyväksytty poissaolo'}
                        </span>
                        <span className="text-sm text-gray-600">{record.hours}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Ei tuntimerkintöjä</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* EXAMS */}
        {activeSection === 'exams' && (
          <Card className="border-2 border-[#dddddd]">
            <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
              <CardTitle className="text-xl flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-[#003d82]" />
                Kokeet
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {exams.length > 0 ? (
                <div className="space-y-2">
                  {exams.map((exam: any) => (
                    <div key={exam.id} className="border-2 border-[#dddddd] rounded p-3">
                      <p className="font-bold text-lg">{exam.subject}</p>
                      <p className="text-sm text-gray-600">{exam.teacherName}</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm"><strong>Päivämäärä:</strong> {exam.date}</p>
                        <p className="text-sm"><strong>Aika:</strong> {exam.time}</p>
                        <p className="text-sm"><strong>Luokka:</strong> {exam.room}</p>
                        {exam.topics && <p className="text-sm"><strong>Aiheet:</strong> {exam.topics}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Ei tulevia kokeita</p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
