import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Home, Calendar, BookOpen, Users, Bell, Mail, Clock, 
  TrendingUp, Award, CheckCircle, AlertCircle, GraduationCap,
  MessageSquare, FileText, BarChart3
} from "lucide-react";

export default function WilmaHome() {
  const [, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('wilma_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        
        // Role-based routing
        const roles = user.roles || [user.role];
        
        console.log('WilmaHome - User:', user);
        console.log('WilmaHome - Roles:', roles);
        console.log('WilmaHome - Role:', user.role);
        
        // Support staff roles (kuraattori, terveydenhoitaja, psykologi, nuoriso-ohjaaja, sosiaalityontekija)
        const supportStaffRoles = ['kuraattori', 'terveydenhoitaja', 'psykologi', 'nuoriso-ohjaaja', 'sosiaalityontekija'];
        if (supportStaffRoles.includes(user.role) || roles.some((r: string) => supportStaffRoles.includes(r))) {
          console.log('WilmaHome - Redirecting to support staff page:', `/wilma-${user.role}/${user.id}`);
          setLocation(`/wilma-${user.role}/${user.id}`);
          return;
        }
        
        // Admin, teacher, principal, vice_principal go to admin panel
        if (roles.includes('admin') || roles.includes('teacher') || roles.includes('principal') || roles.includes('vice_principal') || user.role === 'admin' || user.role === 'teacher' || user.role === 'principal' || user.role === 'vice_principal') {
          console.log('WilmaHome - Redirecting to admin panel:', `/wilma-admin/${user.id}`);
          setLocation(`/wilma-admin/${user.id}`);
          return;
        }
        
        // Student goes to student page
        if (roles.includes('student') || user.role === 'student') {
          console.log('WilmaHome - Redirecting to student page:', `/wilma-student/${user.id}`);
          setLocation(`/wilma-student/${user.id}`);
          return;
        }
        
        // Parent goes to parent page
        if (roles.includes('parent') || user.role === 'parent') {
          console.log('WilmaHome - Redirecting to parent page:', `/wilma-parent/${user.id}`);
          setLocation(`/wilma-parent/${user.id}`);
          return;
        }
        
        // If no specific role match, stay on home page
        console.log('WilmaHome - No role match, staying on home');
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to parse user:', err);
        setLocation('/wilma');
      }
    } else {
      console.log('WilmaHome - No user found, redirecting to login');
      setLocation('/wilma');
    }
  }, [setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ladataan...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const roles = currentUser.roles || [currentUser.role];
  const isAdmin = roles.includes('admin') || roles.includes('principal');
  const isTeacher = roles.includes('teacher');
  const isStudent = roles.includes('student');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Home className="w-8 h-8" />
                Wilma - Etusivu
              </h1>
              <p className="text-blue-100 mt-2">
                Tervetuloa, {currentUser.firstName} {currentUser.lastName}!
              </p>
            </div>
            {isAdmin && (
              <Button 
                onClick={() => setLocation(`/wilma-admin/${currentUser.id}`)}
                className="bg-white/20 hover:bg-white/30"
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                Hallintapaneeli
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Tänään</p>
                  <p className="text-3xl font-bold mt-1">5</p>
                  <p className="text-blue-100 text-sm mt-1">Oppituntia</p>
                </div>
                <Calendar className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Läsnäolo</p>
                  <p className="text-3xl font-bold mt-1">95%</p>
                  <p className="text-green-100 text-sm mt-1">Tällä viikolla</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Viestit</p>
                  <p className="text-3xl font-bold mt-1">3</p>
                  <p className="text-purple-100 text-sm mt-1">Lukematonta</p>
                </div>
                <Mail className="w-12 h-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Keskiarvo</p>
                  <p className="text-3xl font-bold mt-1">8.5</p>
                  <p className="text-orange-100 text-sm mt-1">Tällä jaksolla</p>
                </div>
                <Award className="w-12 h-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Schedule */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Tänään lukujärjestys
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {[
                    { time: '08:00 - 09:30', subject: 'Matematiikka', room: 'A201', teacher: 'M. Virtanen' },
                    { time: '09:45 - 11:15', subject: 'Englanti', room: 'B105', teacher: 'A. Korhonen' },
                    { time: '11:30 - 13:00', subject: 'Lounastauko', room: '-', teacher: '-' },
                    { time: '13:15 - 14:45', subject: 'Fysiikka', room: 'C301', teacher: 'P. Nieminen' },
                    { time: '15:00 - 16:30', subject: 'Historia', room: 'A105', teacher: 'L. Mäkinen' },
                  ].map((lesson, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-medium text-gray-600 w-32">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {lesson.time}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{lesson.subject}</p>
                          <p className="text-sm text-gray-600">{lesson.room} • {lesson.teacher}</p>
                        </div>
                      </div>
                      {lesson.subject !== 'Lounastauko' && (
                        <Button size="sm" variant="outline">Näytä</Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Grades */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  Viimeisimmät arvosanat
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {[
                    { subject: 'Matematiikka', grade: '9', date: '15.04.2026', type: 'Koe' },
                    { subject: 'Englanti', grade: '8', date: '14.04.2026', type: 'Essee' },
                    { subject: 'Fysiikka', grade: '10', date: '12.04.2026', type: 'Laboratoriotyö' },
                    { subject: 'Historia', grade: '7', date: '10.04.2026', type: 'Tentti' },
                  ].map((grade, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-900">{grade.subject}</p>
                        <p className="text-sm text-gray-600">{grade.type} • {grade.date}</p>
                      </div>
                      <div className="text-2xl font-bold text-green-600">{grade.grade}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  Pika-toiminnot
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <Button className="w-full justify-start" variant="outline">
                    <Mail className="w-4 h-4 mr-2" />
                    Viestit
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="w-4 h-4 mr-2" />
                    Lukujärjestys
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Kurssit
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Award className="w-4 h-4 mr-2" />
                    Arvosanat
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Tuntimerkinnät
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Announcements */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-600" />
                  Ilmoitukset
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {[
                    { title: 'Koulun sulkeminen', date: '2 tuntia sitten', priority: 'high' },
                    { title: 'Vanhempainilta', date: '1 päivä sitten', priority: 'medium' },
                    { title: 'Urheilupäivä', date: '3 päivää sitten', priority: 'low' },
                  ].map((announcement, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        announcement.priority === 'high' ? 'bg-red-500' :
                        announcement.priority === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`} />
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-900">{announcement.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{announcement.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Chart */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-cyan-50 to-teal-50">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-600" />
                  Suorituskyky
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Läsnäolo</span>
                      <span className="font-semibold">95%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Tehtävät</span>
                      <span className="font-semibold">88%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '88%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Keskiarvo</span>
                      <span className="font-semibold">8.5/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
