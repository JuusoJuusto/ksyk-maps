import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, FileText, MessageSquare, Home, BarChart3, Bell, LogOut, User,
  Users, UserCheck, Building, GraduationCap, ClipboardList, Lock, AlertCircle,
  BookOpen, Clock, Award, TrendingUp, CheckCircle, XCircle, AlertTriangle, Mail,
  Phone, Download, FileDown, Settings
} from 'lucide-react';

export default function Wilma() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma/:studentId/:section?');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('frontpage');
  const [language, setLanguage] = useState<'fi' | 'en'>('fi');

  // Mock data for demo
  const mockSchedule = [
    { 
      time: '08:00-09:30', 
      mon: { subject: 'Matematiikka', room: 'Luokka 301', teacher: 'Virtanen' },
      tue: { subject: 'Englanti', room: 'Luokka 205', teacher: 'Mäkinen' },
      wed: { subject: 'Fysiikka', room: 'Luokka 401', teacher: 'Laine' },
      thu: { subject: 'Historia', room: 'Luokka 102', teacher: 'Nieminen' },
      fri: { subject: 'Liikunta', room: 'Sali', teacher: 'Koskinen' }
    },
    { 
      time: '09:45-11:15', 
      mon: { subject: 'Äidinkieli', room: 'Luokka 201', teacher: 'Korhonen' },
      tue: { subject: 'Matematiikka', room: 'Luokka 301', teacher: 'Virtanen' },
      wed: { subject: 'Kemia', room: 'Luokka 402', teacher: 'Salo' },
      thu: { subject: 'Englanti', room: 'Luokka 205', teacher: 'Mäkinen' },
      fri: { subject: 'Musiikki', room: 'Musiikkiluokka', teacher: 'Laakso' }
    },
    { 
      time: '11:30-13:00', 
      mon: { subject: 'Biologia', room: 'Luokka 403', teacher: 'Rantanen' },
      tue: { subject: 'Historia', room: 'Luokka 102', teacher: 'Nieminen' },
      wed: { subject: 'Matematiikka', room: 'Luokka 301', teacher: 'Virtanen' },
      thu: { subject: 'Äidinkieli', room: 'Luokka 201', teacher: 'Korhonen' },
      fri: { subject: 'Kuvataide', room: 'Taideluokka', teacher: 'Heikkinen' }
    },
    { 
      time: '13:15-14:45', 
      mon: { subject: 'Englanti', room: 'Luokka 205', teacher: 'Mäkinen' },
      tue: { subject: 'Fysiikka', room: 'Luokka 401', teacher: 'Laine' },
      wed: { subject: 'Äidinkieli', room: 'Luokka 201', teacher: 'Korhonen' },
      thu: { subject: 'Matematiikka', room: 'Luokka 301', teacher: 'Virtanen' },
      fri: null
    },
    { 
      time: '15:00-16:30', 
      mon: null,
      tue: { subject: 'Valinnainen', room: 'Luokka 105', teacher: 'Virtanen' },
      wed: null,
      thu: { subject: 'Valinnainen', room: 'Luokka 105', teacher: 'Virtanen' },
      fri: null
    },
  ];

  const mockGrades = [
    { subject: 'Matematiikka', grade: '9', teacher: 'Virtanen', trend: 'up' },
    { subject: 'Äidinkieli', grade: '8', teacher: 'Korhonen', trend: 'stable' },
    { subject: 'Englanti', grade: '10', teacher: 'Mäkinen', trend: 'up' },
    { subject: 'Historia', grade: '7', teacher: 'Nieminen', trend: 'down' },
    { subject: 'Fysiikka', grade: '9', teacher: 'Laine', trend: 'up' },
    { subject: 'Kemia', grade: '8', teacher: 'Salo', trend: 'stable' },
  ];

  const mockAssignments = [
    { title: 'Matematiikan kotitehtävät', subject: 'Matematiikka', due: '2026-04-15', status: 'pending' },
    { title: 'Englannin essee', subject: 'Englanti', due: '2026-04-18', status: 'pending' },
    { title: 'Historian tutkielma', subject: 'Historia', due: '2026-04-20', status: 'submitted' },
  ];

  const mockMessages = [
    { id: '1', from: 'Opettaja Virtanen', subject: 'Kokeen tulokset', date: '2026-04-08', unread: true },
    { id: '2', from: 'Rehtori Korhonen', subject: 'Kevätjuhla', date: '2026-04-05', unread: false },
  ];

  const mockAttendance = [
    { date: '2026-04-08', status: 'present', hours: 6 },
    { date: '2026-04-07', status: 'present', hours: 6 },
    { date: '2026-04-06', status: 'absent', hours: 0, reason: 'Sairaus' },
    { date: '2026-04-05', status: 'present', hours: 5 },
    { date: '2026-04-04', status: 'present', hours: 6 },
  ];

  const mockExams = [
    { subject: 'Matematiikka', date: '2026-04-15', time: '09:00-11:00', room: 'Luokka 301', topics: 'Trigonometria, Derivaatat' },
    { subject: 'Englanti', date: '2026-04-18', time: '10:00-12:00', room: 'Luokka 205', topics: 'Grammar, Essay Writing' },
    { subject: 'Historia', date: '2026-04-22', time: '08:00-10:00', room: 'Luokka 102', topics: 'Toinen maailmansota' },
  ];

  const mockTeachers = [
    { name: 'Virtanen Matti', subject: 'Matematiikka', email: 'matti.virtanen@school.fi', phone: '040-1234567', room: 'Luokka 301' },
    { name: 'Korhonen Anna', subject: 'Äidinkieli', email: 'anna.korhonen@school.fi', phone: '040-2345678', room: 'Luokka 201' },
    { name: 'Mäkinen Pekka', subject: 'Englanti', email: 'pekka.makinen@school.fi', phone: '040-3456789', room: 'Luokka 205' },
    { name: 'Nieminen Laura', subject: 'Historia', email: 'laura.nieminen@school.fi', phone: '040-4567890', room: 'Luokka 102' },
  ];

  const mockStudyMaterials = [
    { title: 'Matematiikan kaavakokoelma', subject: 'Matematiikka', type: 'PDF', size: '2.5 MB', uploaded: '2026-04-01' },
    { title: 'Englannin sanasto', subject: 'Englanti', type: 'PDF', size: '1.2 MB', uploaded: '2026-04-03' },
    { title: 'Historian aikajana', subject: 'Historia', type: 'PDF', size: '3.1 MB', uploaded: '2026-04-05' },
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem('wilma_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        fetch('/api/wilma/users')
          .then(res => res.ok ? res.json() : null)
          .then(users => {
            if (!users) return;
            const userExists = users.find((u: any) => u.id === user.id && u.isActive);
            if (userExists) {
              setCurrentUser(userExists);
              setIsLoggedIn(true);
              if (!match && userExists.studentId) {
                setLocation(`/wilma/${userExists.studentId}`);
              }
            } else {
              localStorage.removeItem('wilma_user');
            }
          })
          .catch(() => localStorage.removeItem('wilma_user'));
      } catch {
        localStorage.removeItem('wilma_user');
      }
    }
  }, []);

  useEffect(() => {
    if (match && params?.section) {
      setActiveSection(params.section);
    } else if (match) {
      setActiveSection('frontpage');
    }
  }, [match, params]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    if (!username || !password) {
      setLoginError('Please enter username and password');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/wilma/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await response.json();
      if (!response.ok) {
        setLoginError(data.message || 'Invalid username or password');
        setIsLoading(false);
        return;
      }

      setCurrentUser(data);
      setIsLoggedIn(true);
      localStorage.setItem('wilma_user', JSON.stringify(data));
      setUsername('');
      setPassword('');
      setIsLoading(false);
      
      if (data.studentId) {
        setLocation(`/wilma/${data.studentId}`);
      }
    } catch {
      setLoginError('Connection error. Please check if the server is running.');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('wilma_user');
    setActiveSection('frontpage');
    setLocation('/wilma');
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    if (currentUser?.studentId) {
      setLocation(`/wilma/${currentUser.studentId}/${section === 'frontpage' ? '' : section}`);
    }
  };

  const t = {
    fi: {
      school: 'Brando', login: 'Kirjaudu sisään', username: 'Käyttäjätunnus', password: 'Salasana',
      loginButton: 'Kirjaudu', loggingIn: 'Kirjaudutaan...', welcome: 'Tervetuloa Wilmaan',
      loginInstructions: 'Kirjaudu sisään käyttäjätunnuksellasi ja salasanallasi',
      noAccount: 'Eikö sinulla ole tunnuksia? Ota yhteyttä ylläpitäjään.',
      notifications: 'Ilmoitukset', frontpage: 'Etusivu', schedule: 'Lukujärjestys',
      grades: 'Arvosanat', assignments: 'Tehtävät', messages: 'Viestit', attendance: 'Poissaolot',
      exams: 'Kokeet', students: 'Oppilaat', teachers: 'Opettajat', rooms: 'Huoneet',
      courses: 'Kurssit', reports: 'Raportit', logout: 'Kirjaudu ulos', gradeAverage: 'Keskiarvo',
      role: 'Rooli', teacher: 'Opettaja', student: 'Oppilas', parent: 'Huoltaja', admin: 'Ylläpitäjä',
      studyMaterials: 'Oppimateriaalit', settings: 'Asetukset', profile: 'Profiili',
      changePassword: 'Vaihda salasana', currentPassword: 'Nykyinen salasana',
      newPassword: 'Uusi salasana', confirmPassword: 'Vahvista salasana',
      save: 'Tallenna', cancel: 'Peruuta', edit: 'Muokkaa', delete: 'Poista',
      todaysSchedule: 'Tämän päivän tunnit', upcomingEvents: 'Tulevat tapahtumat',
      recentGrades: 'Viimeisimmät arvosanat', quickActions: 'Pikatoiminnot',
      viewAll: 'Näytä kaikki', noClasses: 'Ei tunteja',
    },
    en: {
      school: 'Brando', login: 'Login', username: 'Username', password: 'Password',
      loginButton: 'Login', loggingIn: 'Logging in...', welcome: 'Welcome to Wilma',
      loginInstructions: 'Login with your username and password',
      noAccount: "Don't have credentials? Contact administrator.",
      notifications: 'Notifications', frontpage: 'Frontpage', schedule: 'Schedule',
      grades: 'Grades', assignments: 'Assignments', messages: 'Messages', attendance: 'Attendance',
      exams: 'Exams', students: 'Students', teachers: 'Teachers', rooms: 'Rooms',
      courses: 'Courses', reports: 'Reports', logout: 'Logout', gradeAverage: 'Average',
      role: 'Role', teacher: 'Teacher', student: 'Student', parent: 'Parent', admin: 'Admin',
      studyMaterials: 'Study Materials', settings: 'Settings', profile: 'Profile',
      changePassword: 'Change Password', currentPassword: 'Current Password',
      newPassword: 'New Password', confirmPassword: 'Confirm Password',
      save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete',
      todaysSchedule: "Today's Schedule", upcomingEvents: 'Upcoming Events',
      recentGrades: 'Recent Grades', quickActions: 'Quick Actions',
      viewAll: 'View All', noClasses: 'No classes',
    }
  };

  const tr = t[language];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="bg-[#003d82] text-white rounded-t-lg">
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <Lock className="w-6 h-6" />
              {tr.welcome}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <p className="text-center text-gray-600 mb-6">{tr.loginInstructions}</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{tr.username}</label>
                <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder={tr.username} required disabled={isLoading} className="w-full" autoComplete="username" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{tr.password}</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={tr.password} required disabled={isLoading} className="w-full" autoComplete="current-password" />
              </div>
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}
              <Button type="submit" className="w-full bg-[#003d82] hover:bg-[#0052a3]" disabled={isLoading}>
                {isLoading ? tr.loggingIn : tr.loginButton}
              </Button>
            </form>
            <div className="mt-6 space-y-3">
              <div className="text-center">
                <button onClick={() => setLanguage(language === 'fi' ? 'en' : 'fi')}
                  className="text-sm text-blue-600 hover:text-blue-800">
                  {language === 'fi' ? 'English' : 'Suomi'}
                </button>
              </div>
              <div className="text-center text-sm text-gray-500">{tr.noAccount}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="bg-[#003d82] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-semibold">{tr.school}</h1>
                <p className="text-sm text-blue-200 mt-1">
                  <User className="w-4 h-4 inline mr-1" />
                  {currentUser.firstName} {currentUser.lastName} • ID: {currentUser.studentId} • {currentUser.studentClass || currentUser.role}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">{tr.notifications}</span>
                <Badge className="bg-red-500 text-white ml-1">3</Badge>
              </button>
              <button onClick={() => setLanguage(language === 'fi' ? 'en' : 'fi')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors">
                {language === 'fi' ? 'EN' : 'FI'}
              </button>
              <button onClick={handleLogout}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{tr.logout}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0052a3] border-b-2 border-[#003d82] shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'frontpage', icon: Home, label: tr.frontpage },
              { id: 'schedule', icon: Calendar, label: tr.schedule },
              { id: 'grades', icon: BarChart3, label: tr.grades },
              { id: 'assignments', icon: FileText, label: tr.assignments },
              { id: 'messages', icon: MessageSquare, label: tr.messages },
              { id: 'attendance', icon: UserCheck, label: tr.attendance },
              { id: 'exams', icon: ClipboardList, label: tr.exams },
              { id: 'teachers', icon: Users, label: tr.teachers },
              { id: 'materials', icon: BookOpen, label: tr.studyMaterials },
              { id: 'courses', icon: GraduationCap, label: tr.courses },
              { id: 'settings', icon: Settings, label: tr.settings },
            ].map((item) => (
              <button key={item.id} onClick={() => handleSectionChange(item.id)}
                className={`px-4 py-3 text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeSection === item.id ? 'bg-white text-[#003d82] font-semibold shadow-sm' : 'text-white hover:bg-[#003d82]'
                }`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Card>
          <CardHeader className="bg-[#e8f0f8] border-b border-gray-300">
            <CardTitle className="text-xl text-gray-800 flex items-center justify-between">
              <span>
                {activeSection === 'frontpage' && tr.frontpage}
                {activeSection === 'schedule' && tr.schedule}
                {activeSection === 'grades' && tr.grades}
                {activeSection === 'assignments' && tr.assignments}
                {activeSection === 'messages' && tr.messages}
                {activeSection === 'attendance' && tr.attendance}
                {activeSection === 'exams' && tr.exams}
                {activeSection === 'teachers' && tr.teachers}
                {activeSection === 'materials' && tr.studyMaterials}
                {activeSection === 'courses' && tr.courses}
                {activeSection === 'settings' && tr.settings}
              </span>
              <span className="text-sm font-mono text-blue-600">#{currentUser.studentId}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">

            {activeSection === 'frontpage' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {language === 'fi' ? 'Tervetuloa, ' : 'Welcome, '}{currentUser.firstName}!
                  </h2>
                  <p className="text-gray-600">
                    {language === 'fi' ? 'Oppilastunnus: ' : 'Student ID: '}<span className="font-mono font-bold">{currentUser.studentId}</span>
                  </p>
                  <p className="text-gray-600">
                    {language === 'fi' ? 'Luokka: ' : 'Class: '}{currentUser.studentClass || '-'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card 
                    className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => handleSectionChange('grades')}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <Award className="w-8 h-8 text-green-600" />
                        <span className="text-3xl font-bold text-green-700">8.5</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">{language === 'fi' ? 'Keskiarvo' : 'Average Grade'}</p>
                      <p className="text-xs text-gray-600 mt-1">{language === 'fi' ? 'Klikkaa nähdäksesi kaikki arvosanat' : 'Click to see all grades'}</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => handleSectionChange('assignments')}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <FileText className="w-8 h-8 text-blue-600" />
                        <span className="text-3xl font-bold text-blue-700">2</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">{language === 'fi' ? 'Avoimet tehtävät' : 'Pending Tasks'}</p>
                      <p className="text-xs text-gray-600 mt-1">{language === 'fi' ? 'Klikkaa nähdäksesi tehtävät' : 'Click to see assignments'}</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => handleSectionChange('messages')}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <Mail className="w-8 h-8 text-purple-600" />
                        <span className="text-3xl font-bold text-purple-700">1</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">{language === 'fi' ? 'Lukemattomat viestit' : 'Unread Messages'}</p>
                      <p className="text-xs text-gray-600 mt-1">{language === 'fi' ? 'Klikkaa nähdäksesi viestit' : 'Click to see messages'}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        {language === 'fi' ? 'Seuraavat tunnit' : 'Upcoming Classes'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div 
                          className="flex items-center justify-between p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-all"
                          onClick={() => handleSectionChange('schedule')}
                        >
                          <div>
                            <p className="font-semibold text-gray-800">Matematiikka</p>
                            <p className="text-sm text-gray-600">Luokka 301 • Opettaja Virtanen</p>
                          </div>
                          <Badge className="bg-blue-600 text-white">08:00</Badge>
                        </div>
                        <div 
                          className="flex items-center justify-between p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-all"
                          onClick={() => handleSectionChange('schedule')}
                        >
                          <div>
                            <p className="font-semibold text-gray-800">Äidinkieli</p>
                            <p className="text-sm text-gray-600">Luokka 201 • Opettaja Korhonen</p>
                          </div>
                          <Badge className="bg-green-600 text-white">09:45</Badge>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full mt-2"
                          onClick={() => handleSectionChange('schedule')}
                        >
                          {language === 'fi' ? 'Näytä koko lukujärjestys' : 'View Full Schedule'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        {language === 'fi' ? 'Tulevat määräajat' : 'Upcoming Deadlines'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {mockAssignments.filter(a => a.status === 'pending').map((assignment, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-all"
                            onClick={() => handleSectionChange('assignments')}
                          >
                            <div>
                              <p className="font-semibold text-gray-800">{assignment.title}</p>
                              <p className="text-sm text-gray-600">{assignment.subject}</p>
                            </div>
                            <Badge className="bg-orange-600 text-white">{assignment.due}</Badge>
                          </div>
                        ))}
                        <Button 
                          variant="outline" 
                          className="w-full mt-2"
                          onClick={() => handleSectionChange('assignments')}
                        >
                          {language === 'fi' ? 'Näytä kaikki tehtävät' : 'View All Assignments'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => handleSectionChange('exams')}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-red-600" />
                        {language === 'fi' ? 'Tulevat kokeet' : 'Upcoming Exams'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span className="text-sm font-semibold">Matematiikka</span>
                          <span className="text-xs text-gray-600">2026-04-15</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span className="text-sm font-semibold">Englanti</span>
                          <span className="text-xs text-gray-600">2026-04-18</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">{language === 'fi' ? 'Klikkaa nähdäksesi kaikki kokeet' : 'Click to see all exams'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => handleSectionChange('attendance')}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-green-600" />
                        {language === 'fi' ? 'Läsnäolo' : 'Attendance'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{language === 'fi' ? 'Läsnäoloprosentti' : 'Attendance Rate'}</span>
                          <span className="text-2xl font-bold text-green-700">95%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '95%' }}></div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">{language === 'fi' ? 'Klikkaa nähdäksesi yksityiskohdat' : 'Click to see details'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeSection === 'schedule' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {language === 'fi' ? 'Viikko 15 • Kevätlukukausi 2026' : 'Week 15 • Spring Semester 2026'}
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#003d82] text-white">
                        <th className="border border-gray-300 p-3 text-left">{language === 'fi' ? 'Aika' : 'Time'}</th>
                        <th className="border border-gray-300 p-3 text-left">{language === 'fi' ? 'Maanantai' : 'Monday'}</th>
                        <th className="border border-gray-300 p-3 text-left">{language === 'fi' ? 'Tiistai' : 'Tuesday'}</th>
                        <th className="border border-gray-300 p-3 text-left">{language === 'fi' ? 'Keskiviikko' : 'Wednesday'}</th>
                        <th className="border border-gray-300 p-3 text-left">{language === 'fi' ? 'Torstai' : 'Thursday'}</th>
                        <th className="border border-gray-300 p-3 text-left">{language === 'fi' ? 'Perjantai' : 'Friday'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockSchedule.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-3 font-semibold bg-gray-100">{row.time}</td>
                          {['mon', 'tue', 'wed', 'thu', 'fri'].map((day) => {
                            const lesson = row[day as keyof typeof row];
                            return (
                              <td key={day} className="border border-gray-300 p-3 text-sm">
                                {lesson && typeof lesson === 'object' ? (
                                  <div className="space-y-1">
                                    <p className="font-semibold text-gray-800">{lesson.subject}</p>
                                    <p className="text-xs text-gray-600">{lesson.room}</p>
                                    <p className="text-xs text-blue-600 flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {lesson.teacher}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === 'grades' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Award className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-sm text-green-800">{language === 'fi' ? 'Keskiarvo' : 'Average Grade'}</p>
                      <p className="text-2xl font-bold text-green-700">8.5</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                    <Button variant="outline" className="text-sm">
                      {language === 'fi' ? 'Lataa todistus' : 'Download Report'}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3">
                  {mockGrades.map((item, idx) => (
                    <Card 
                      key={idx} 
                      className="cursor-pointer hover:shadow-lg transition-all hover:bg-blue-50"
                      onClick={() => alert(`${language === 'fi' ? 'Arvosana' : 'Grade'}: ${item.subject}\n\n${language === 'fi' ? 'Arvosana' : 'Grade'}: ${item.grade}/10\n${language === 'fi' ? 'Opettaja' : 'Teacher'}: ${item.teacher}\n${language === 'fi' ? 'Trendi' : 'Trend'}: ${item.trend === 'up' ? (language === 'fi' ? 'Nouseva' : 'Improving') : item.trend === 'down' ? (language === 'fi' ? 'Laskeva' : 'Declining') : (language === 'fi' ? 'Vakaa' : 'Stable')}\n\n${language === 'fi' ? 'Klikkaa nähdäksesi yksityiskohtainen arvosanahistoria ja palaute.' : 'Click to see detailed grade history and feedback.'}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <BookOpen className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="font-semibold text-gray-800">{item.subject}</p>
                                <p className="text-sm text-gray-600">{language === 'fi' ? 'Opettaja: ' : 'Teacher: '}{item.teacher}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {item.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-600" />}
                            {item.trend === 'down' && <XCircle className="w-5 h-5 text-red-600" />}
                            {item.trend === 'stable' && <CheckCircle className="w-5 h-5 text-blue-600" />}
                            <span className="text-3xl font-bold text-blue-700">{item.grade}</span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                alert(language === 'fi' ? 'Näytetään yksityiskohtainen arvosanahistoria...' : 'Showing detailed grade history...');
                              }}
                            >
                              →
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'assignments' && (
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-orange-800 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {language === 'fi' ? `${mockAssignments.filter(a => a.status === 'pending').length} avointa tehtävää` : `${mockAssignments.filter(a => a.status === 'pending').length} pending assignments`}
                  </p>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white text-sm">
                    {language === 'fi' ? 'Suodata' : 'Filter'}
                  </Button>
                </div>

                <div className="space-y-3">
                  {mockAssignments.map((assignment, idx) => (
                    <Card 
                      key={idx} 
                      className={`cursor-pointer transition-all hover:shadow-lg ${assignment.status === 'pending' ? 'border-orange-300 hover:bg-orange-50' : 'border-green-300 hover:bg-green-50'}`}
                      onClick={() => alert(`${language === 'fi' ? 'Tehtävä' : 'Assignment'}: ${assignment.title}\n\n${language === 'fi' ? 'Aine' : 'Subject'}: ${assignment.subject}\n${language === 'fi' ? 'Määräaika' : 'Due date'}: ${assignment.due}\n${language === 'fi' ? 'Tila' : 'Status'}: ${assignment.status === 'pending' ? (language === 'fi' ? 'Avoin' : 'Pending') : (language === 'fi' ? 'Palautettu' : 'Submitted')}\n\n${language === 'fi' ? 'Klikkaa "Näytä tehtävä" nähdäksesi lisätietoja ja palauttaaksesi tehtävän.' : 'Click "View Assignment" to see details and submit your work.'}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {assignment.status === 'pending' ? (
                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                              ) : (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              )}
                              <div>
                                <p className="font-semibold text-gray-800">{assignment.title}</p>
                                <p className="text-sm text-gray-600">{assignment.subject}</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <Badge className={assignment.status === 'pending' ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'}>
                              {assignment.status === 'pending' ? (language === 'fi' ? 'Avoin' : 'Pending') : (language === 'fi' ? 'Palautettu' : 'Submitted')}
                            </Badge>
                            <p className="text-sm text-gray-600">{assignment.due}</p>
                            {assignment.status === 'pending' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert(language === 'fi' ? 'Avaa tehtävä ja palauta...' : 'Open assignment and submit...');
                                }}
                              >
                                {language === 'fi' ? 'Näytä tehtävä' : 'View Assignment'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'messages' && (
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-purple-800 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {language === 'fi' ? `${mockMessages.filter(m => m.unread).length} lukematonta viestiä` : `${mockMessages.filter(m => m.unread).length} unread messages`}
                  </p>
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm"
                    onClick={() => setLocation(`/wilma/${currentUser.studentId}/compose`)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {language === 'fi' ? 'Uusi viesti' : 'New Message'}
                  </Button>
                </div>

                <div className="space-y-3">
                  {mockMessages.map((message) => (
                    <Card 
                      key={message.id} 
                      className={`cursor-pointer transition-all hover:shadow-lg ${message.unread ? 'border-purple-300 bg-purple-50 hover:bg-purple-100' : 'hover:bg-gray-50'}`}
                      onClick={() => setLocation(`/wilma/${currentUser.studentId}/message/${message.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${message.unread ? 'bg-purple-200' : 'bg-gray-200'}`}>
                                <Mail className={`w-5 h-5 ${message.unread ? 'text-purple-600' : 'text-gray-400'}`} />
                              </div>
                              <div>
                                <p className={`font-semibold ${message.unread ? 'text-gray-900' : 'text-gray-600'}`}>{message.subject}</p>
                                <p className="text-sm text-gray-600">{language === 'fi' ? 'Lähettäjä: ' : 'From: '}{message.from}</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            {message.unread && <Badge className="bg-purple-600 text-white">{language === 'fi' ? 'Uusi' : 'New'}</Badge>}
                            <p className="text-sm text-gray-600">{message.date}</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/wilma/${currentUser.studentId}/compose?replyTo=${message.id}`);
                              }}
                            >
                              {language === 'fi' ? 'Vastaa' : 'Reply'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'attendance' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card className="bg-green-50 border-green-200 cursor-pointer hover:shadow-lg transition-all" onClick={() => alert(language === 'fi' ? 'Läsnäoloprosentti: 95%\n\nOlet ollut läsnä 156 tuntia 164 tunnista.' : 'Attendance rate: 95%\n\nYou have been present for 156 hours out of 164 hours.')}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{language === 'fi' ? 'Läsnä' : 'Present'}</p>
                          <p className="text-2xl font-bold text-green-700">95%</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-50 border-red-200 cursor-pointer hover:shadow-lg transition-all" onClick={() => alert(language === 'fi' ? 'Poissaoloprosentti: 5%\n\nOlet ollut poissa 8 tuntia 164 tunnista.' : 'Absence rate: 5%\n\nYou have been absent for 8 hours out of 164 hours.')}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{language === 'fi' ? 'Poissa' : 'Absent'}</p>
                          <p className="text-2xl font-bold text-red-700">5%</p>
                        </div>
                        <XCircle className="w-8 h-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-50 border-blue-200 cursor-pointer hover:shadow-lg transition-all" onClick={() => alert(language === 'fi' ? 'Kokonaistunnit: 156h\n\nOlet osallistunut 156 tuntiin tänä lukuvuonna.' : 'Total hours: 156h\n\nYou have attended 156 hours this school year.')}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{language === 'fi' ? 'Tunteja' : 'Hours'}</p>
                          <p className="text-2xl font-bold text-blue-700">156</p>
                        </div>
                        <Clock className="w-8 h-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  {mockAttendance.map((record, idx) => (
                    <Card 
                      key={idx} 
                      className={`cursor-pointer transition-all hover:shadow-lg ${record.status === 'absent' ? 'border-red-300 hover:bg-red-50' : 'border-green-300 hover:bg-green-50'}`}
                      onClick={() => alert(`${language === 'fi' ? 'Poissaolo' : 'Attendance'}: ${record.date}\n\n${language === 'fi' ? 'Tila' : 'Status'}: ${record.status === 'present' ? (language === 'fi' ? 'Läsnä' : 'Present') : (language === 'fi' ? 'Poissa' : 'Absent')}\n${language === 'fi' ? 'Tunnit' : 'Hours'}: ${record.hours}h${record.reason ? `\n${language === 'fi' ? 'Syy' : 'Reason'}: ${record.reason}` : ''}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {record.status === 'present' ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                            <div>
                              <p className="font-semibold text-gray-800">{record.date}</p>
                              {record.reason && <p className="text-sm text-gray-600">{record.reason}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={record.status === 'present' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
                              {record.status === 'present' ? (language === 'fi' ? 'Läsnä' : 'Present') : (language === 'fi' ? 'Poissa' : 'Absent')}
                            </Badge>
                            <p className="text-sm text-gray-600 mt-1">{record.hours}h</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'courses' && (
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-indigo-800 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    {language === 'fi' ? '6 aktiivista kurssia' : '6 active courses'}
                  </p>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
                    {language === 'fi' ? 'Kurssihaku' : 'Course Search'}
                  </Button>
                </div>

                <div className="grid gap-3">
                  {mockGrades.map((course, idx) => (
                    <Card 
                      key={idx} 
                      className="cursor-pointer hover:shadow-lg transition-all hover:bg-indigo-50"
                      onClick={() => alert(`${language === 'fi' ? 'Kurssi' : 'Course'}: ${course.subject}\n\n${language === 'fi' ? 'Opettaja' : 'Teacher'}: ${course.teacher}\n${language === 'fi' ? 'Arvosana' : 'Grade'}: ${course.grade}/10\n${language === 'fi' ? 'Tila' : 'Status'}: ${language === 'fi' ? 'Aktiivinen' : 'Active'}\n\n${language === 'fi' ? 'Klikkaa "Näytä kurssi" nähdäksesi kurssin materiaalit, tehtävät ja lisätiedot.' : 'Click "View Course" to see course materials, assignments, and details.'}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GraduationCap className="w-6 h-6 text-indigo-600" />
                            <div>
                              <p className="font-semibold text-gray-800">{course.subject}</p>
                              <p className="text-sm text-gray-600">{language === 'fi' ? 'Opettaja: ' : 'Teacher: '}{course.teacher}</p>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <Badge className="bg-indigo-600 text-white">{language === 'fi' ? 'Aktiivinen' : 'Active'}</Badge>
                            <p className="text-sm text-gray-600">{language === 'fi' ? 'Arvosana: ' : 'Grade: '}{course.grade}</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                alert(language === 'fi' ? 'Avaa kurssin sivu...' : 'Open course page...');
                              }}
                            >
                              {language === 'fi' ? 'Näytä kurssi' : 'View Course'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'exams' && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-red-800 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    {language === 'fi' ? `${mockExams.length} tulevaa koetta` : `${mockExams.length} upcoming exams`}
                  </p>
                  <Button className="bg-red-600 hover:bg-red-700 text-white text-sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    {language === 'fi' ? 'Kokeiden kalenteri' : 'Exam Calendar'}
                  </Button>
                </div>

                <div className="space-y-3">
                  {mockExams.map((exam, idx) => (
                    <Card 
                      key={idx} 
                      className="border-red-300 cursor-pointer hover:shadow-lg transition-all hover:bg-red-50"
                      onClick={() => alert(`${language === 'fi' ? 'Koe' : 'Exam'}: ${exam.subject}\n\n${language === 'fi' ? 'Päivämäärä' : 'Date'}: ${exam.date}\n${language === 'fi' ? 'Aika' : 'Time'}: ${exam.time}\n${language === 'fi' ? 'Huone' : 'Room'}: ${exam.room}\n${language === 'fi' ? 'Aiheet' : 'Topics'}: ${exam.topics}\n\n${language === 'fi' ? 'Klikkaa "Oppimateriaalit" nähdäksesi kokeeseen liittyvät materiaalit ja valmistautuaksesi.' : 'Click "Study Materials" to see exam-related materials and prepare.'}`)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <ClipboardList className="w-6 h-6 text-red-600" />
                              <div>
                                <p className="font-bold text-lg text-gray-800">{exam.subject}</p>
                                <p className="text-sm text-gray-600">{exam.room}</p>
                              </div>
                            </div>
                            <div className="ml-9 space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="font-semibold">{exam.date}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span>{exam.time}</span>
                              </div>
                              <div className="flex items-start gap-2 text-sm">
                                <BookOpen className="w-4 h-4 text-gray-500 mt-0.5" />
                                <span className="text-gray-700">{language === 'fi' ? 'Aiheet: ' : 'Topics: '}{exam.topics}</span>
                              </div>
                            </div>
                            <div className="ml-9 mt-3 flex gap-2">
                              <Button 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert(language === 'fi' ? 'Avaa oppimateriaalit...' : 'Open study materials...');
                                }}
                              >
                                <BookOpen className="w-3 h-3 mr-1" />
                                {language === 'fi' ? 'Oppimateriaalit' : 'Study Materials'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert(language === 'fi' ? 'Lisää kalenteriin...' : 'Add to calendar...');
                                }}
                              >
                                <Calendar className="w-3 h-3 mr-1" />
                                {language === 'fi' ? 'Lisää kalenteriin' : 'Add to Calendar'}
                              </Button>
                            </div>
                          </div>
                          <Badge className="bg-red-600 text-white text-lg px-4 py-2">
                            {language === 'fi' ? 'Koe' : 'Exam'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'teachers' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-blue-800 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {language === 'fi' ? `${mockTeachers.length} opettajaa` : `${mockTeachers.length} teachers`}
                  </p>
                  <Input 
                    placeholder={language === 'fi' ? 'Hae opettajaa...' : 'Search teacher...'} 
                    className="max-w-xs"
                  />
                </div>

                <div className="grid gap-3">
                  {mockTeachers.map((teacher, idx) => (
                    <Card 
                      key={idx} 
                      className="cursor-pointer hover:shadow-lg transition-all hover:bg-blue-50"
                      onClick={() => alert(`${language === 'fi' ? 'Opettaja' : 'Teacher'}: ${teacher.name}\n\n${language === 'fi' ? 'Aine' : 'Subject'}: ${teacher.subject}\n${language === 'fi' ? 'Sähköposti' : 'Email'}: ${teacher.email}\n${language === 'fi' ? 'Puhelin' : 'Phone'}: ${teacher.phone}\n${language === 'fi' ? 'Huone' : 'Room'}: ${teacher.room}\n\n${language === 'fi' ? 'Klikkaa "Lähetä viesti" lähettääksesi viestin opettajalle.' : 'Click "Send Message" to send a message to the teacher.'}`)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-bold text-lg text-gray-800">{teacher.name}</p>
                              <p className="text-sm text-gray-600 mb-2">{teacher.subject}</p>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                  <Mail className="w-4 h-4 text-blue-600" />
                                  <a 
                                    href={`mailto:${teacher.email}`} 
                                    className="hover:text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {teacher.email}
                                  </a>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                  <Phone className="w-4 h-4 text-blue-600" />
                                  <span>{teacher.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                  <Building className="w-4 h-4 text-blue-600" />
                                  <span>{teacher.room}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button 
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                alert(language === 'fi' ? `Lähetä viesti opettajalle ${teacher.name}...` : `Send message to ${teacher.name}...`);
                              }}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              {language === 'fi' ? 'Lähetä viesti' : 'Send Message'}
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                alert(language === 'fi' ? 'Näytetään opettajan profiili...' : 'Showing teacher profile...');
                              }}
                            >
                              {language === 'fi' ? 'Näytä profiili' : 'View Profile'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'materials' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-green-800 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    {language === 'fi' ? `${mockStudyMaterials.length} oppimateriaalia saatavilla` : `${mockStudyMaterials.length} study materials available`}
                  </p>
                  <Input 
                    placeholder={language === 'fi' ? 'Hae materiaalia...' : 'Search materials...'} 
                    className="max-w-xs"
                  />
                </div>

                <div className="space-y-3">
                  {mockStudyMaterials.map((material, idx) => (
                    <Card 
                      key={idx} 
                      className="cursor-pointer hover:shadow-lg transition-all border-green-200 hover:bg-green-50"
                      onClick={() => alert(`${language === 'fi' ? 'Oppimateriaali' : 'Study Material'}: ${material.title}\n\n${language === 'fi' ? 'Aine' : 'Subject'}: ${material.subject}\n${language === 'fi' ? 'Tyyppi' : 'Type'}: ${material.type}\n${language === 'fi' ? 'Koko' : 'Size'}: ${material.size}\n${language === 'fi' ? 'Ladattu' : 'Uploaded'}: ${material.uploaded}\n\n${language === 'fi' ? 'Klikkaa "Lataa" ladataksesi materiaalin.' : 'Click "Download" to download the material.'}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                              <FileDown className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{material.title}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <Badge className="bg-green-600 text-white text-xs">{material.subject}</Badge>
                                <span className="text-xs text-gray-500">{material.type} • {material.size}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {language === 'fi' ? 'Ladattu: ' : 'Uploaded: '}{material.uploaded}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                alert(language === 'fi' ? `Ladataan ${material.title}...` : `Downloading ${material.title}...`);
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              {language === 'fi' ? 'Lataa' : 'Download'}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                alert(language === 'fi' ? 'Esikatsele materiaalia...' : 'Preview material...');
                              }}
                            >
                              {language === 'fi' ? 'Esikatsele' : 'Preview'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <CardContent className="p-6 text-center">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                    <h3 className="font-semibold text-lg text-gray-800 mb-2">
                      {language === 'fi' ? 'Tarvitsetko lisää materiaaleja?' : 'Need more materials?'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {language === 'fi' 
                        ? 'Pyydä opettajaltasi lisää oppimateriaaleja tai lataa niitä kurssin sivulta.'
                        : 'Request more study materials from your teacher or download them from the course page.'}
                    </p>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => alert(language === 'fi' ? 'Pyydä materiaalia opettajalta...' : 'Request material from teacher...')}
                    >
                      {language === 'fi' ? 'Pyydä materiaalia' : 'Request Material'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === 'settings' && (
              <div className="space-y-6">
                <Card className="border-blue-200">
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      {tr.profile}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {language === 'fi' ? 'Etunimi' : 'First Name'}
                        </label>
                        <Input value={currentUser.firstName} disabled className="bg-gray-50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {language === 'fi' ? 'Sukunimi' : 'Last Name'}
                        </label>
                        <Input value={currentUser.lastName} disabled className="bg-gray-50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {language === 'fi' ? 'Oppilastunnus' : 'Student ID'}
                        </label>
                        <Input value={currentUser.studentId} disabled className="bg-gray-50 font-mono" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {language === 'fi' ? 'Luokka' : 'Class'}
                        </label>
                        <Input value={currentUser.studentClass || '-'} disabled className="bg-gray-50" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {language === 'fi' ? 'Sähköposti' : 'Email'}
                        </label>
                        <Input value={currentUser.email || '-'} disabled className="bg-gray-50" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-200">
                  <CardHeader className="bg-green-50">
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-green-600" />
                      {tr.changePassword}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {tr.currentPassword}
                        </label>
                        <Input type="password" placeholder="••••••••" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {tr.newPassword}
                        </label>
                        <Input type="password" placeholder="••••••••" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {tr.confirmPassword}
                        </label>
                        <Input type="password" placeholder="••••••••" />
                      </div>
                      <Button className="bg-green-600 hover:bg-green-700 text-white">
                        {tr.save}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200">
                  <CardHeader className="bg-purple-50">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-purple-600" />
                      {language === 'fi' ? 'Asetukset' : 'Preferences'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-800">{language === 'fi' ? 'Kieli' : 'Language'}</p>
                          <p className="text-sm text-gray-600">{language === 'fi' ? 'Suomi' : 'English'}</p>
                        </div>
                        <Button variant="outline" onClick={() => setLanguage(language === 'fi' ? 'en' : 'fi')}>
                          {language === 'fi' ? 'EN' : 'FI'}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-800">{language === 'fi' ? 'Ilmoitukset' : 'Notifications'}</p>
                          <p className="text-sm text-gray-600">{language === 'fi' ? 'Sähköposti-ilmoitukset' : 'Email notifications'}</p>
                        </div>
                        <input type="checkbox" className="w-5 h-5" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-800">{language === 'fi' ? 'Yksityisyys' : 'Privacy'}</p>
                          <p className="text-sm text-gray-600">{language === 'fi' ? 'Näytä profiili muille' : 'Show profile to others'}</p>
                        </div>
                        <input type="checkbox" className="w-5 h-5" defaultChecked />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {currentUser.role === 'admin' && (
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-5 h-5" />
                        {language === 'fi' ? 'Ylläpitäjän työkalut' : 'Admin Tools'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-700 mb-4">
                        {language === 'fi' 
                          ? 'Sinulla on ylläpitäjän oikeudet. Voit hallita käyttäjiä KSYK Maps -hallintapaneelista.'
                          : 'You have administrator privileges. You can manage users from the KSYK Maps admin panel.'}
                      </p>
                      <Button 
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => window.location.href = '/admin-ksyk-management-portal'}
                      >
                        {language === 'fi' ? 'Avaa hallintapaneeli' : 'Open Admin Panel'}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
