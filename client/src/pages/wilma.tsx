import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, FileText, MessageSquare, Home, BarChart3, Bell, LogOut, User,
  Users, UserCheck, Building, GraduationCap, ClipboardList, Lock, AlertCircle,
  BookOpen, Clock, Award, TrendingUp, CheckCircle, XCircle, AlertTriangle, Mail
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
    { time: '08:00-09:30', mon: 'Matematiikka\nLuokka 301', tue: 'Englanti\nLuokka 205', wed: 'Fysiikka\nLuokka 401', thu: 'Historia\nLuokka 102', fri: 'Liikunta\nSali' },
    { time: '09:45-11:15', mon: 'Äidinkieli\nLuokka 201', tue: 'Matematiikka\nLuokka 301', wed: 'Kemia\nLuokka 402', thu: 'Englanti\nLuokka 205', fri: 'Musiikki\nMusiikkiluokka' },
    { time: '11:30-13:00', mon: 'Biologia\nLuokka 403', tue: 'Historia\nLuokka 102', wed: 'Matematiikka\nLuokka 301', thu: 'Äidinkieli\nLuokka 201', fri: 'Kuvataide\nTaideluokka' },
    { time: '13:15-14:45', mon: 'Englanti\nLuokka 205', tue: 'Fysiikka\nLuokka 401', wed: 'Äidinkieli\nLuokka 201', thu: 'Matematiikka\nLuokka 301', fri: '-' },
    { time: '15:00-16:30', mon: '-', tue: 'Valinnainen\nLuokka 105', wed: '-', thu: 'Valinnainen\nLuokka 105', fri: '-' },
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
    { from: 'Opettaja Virtanen', subject: 'Kokeen tulokset', date: '2026-04-08', unread: true },
    { from: 'Rehtori Korhonen', subject: 'Kevätjuhla', date: '2026-04-05', unread: false },
  ];

  const mockAttendance = [
    { date: '2026-04-08', status: 'present', hours: 6 },
    { date: '2026-04-07', status: 'present', hours: 6 },
    { date: '2026-04-06', status: 'absent', hours: 0, reason: 'Sairaus' },
    { date: '2026-04-05', status: 'present', hours: 5 },
    { date: '2026-04-04', status: 'present', hours: 6 },
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
              { id: 'courses', icon: GraduationCap, label: tr.courses },
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
                {activeSection === 'courses' && tr.courses}
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
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <Award className="w-8 h-8 text-green-600" />
                        <span className="text-3xl font-bold text-green-700">8.5</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">{language === 'fi' ? 'Keskiarvo' : 'Average Grade'}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <FileText className="w-8 h-8 text-blue-600" />
                        <span className="text-3xl font-bold text-blue-700">2</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">{language === 'fi' ? 'Avoimet tehtävät' : 'Pending Tasks'}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <Mail className="w-8 h-8 text-purple-600" />
                        <span className="text-3xl font-bold text-purple-700">1</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">{language === 'fi' ? 'Lukemattomat viestit' : 'Unread Messages'}</p>
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
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div>
                            <p className="font-semibold text-gray-800">Matematiikka</p>
                            <p className="text-sm text-gray-600">Luokka 301 • Opettaja Virtanen</p>
                          </div>
                          <Badge className="bg-blue-600 text-white">08:00</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div>
                            <p className="font-semibold text-gray-800">Äidinkieli</p>
                            <p className="text-sm text-gray-600">Luokka 201 • Opettaja Korhonen</p>
                          </div>
                          <Badge className="bg-green-600 text-white">09:45</Badge>
                        </div>
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
                          <div key={idx} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                            <div>
                              <p className="font-semibold text-gray-800">{assignment.title}</p>
                              <p className="text-sm text-gray-600">{assignment.subject}</p>
                            </div>
                            <Badge className="bg-orange-600 text-white">{assignment.due}</Badge>
                          </div>
                        ))}
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
                          <td className="border border-gray-300 p-3 text-sm whitespace-pre-line">{row.mon}</td>
                          <td className="border border-gray-300 p-3 text-sm whitespace-pre-line">{row.tue}</td>
                          <td className="border border-gray-300 p-3 text-sm whitespace-pre-line">{row.wed}</td>
                          <td className="border border-gray-300 p-3 text-sm whitespace-pre-line">{row.thu}</td>
                          <td className="border border-gray-300 p-3 text-sm whitespace-pre-line">{row.fri}</td>
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
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>

                <div className="grid gap-3">
                  {mockGrades.map((item, idx) => (
                    <Card key={idx} className="hover:shadow-md transition-shadow">
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
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                  <p className="text-sm text-orange-800 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {language === 'fi' ? `${mockAssignments.filter(a => a.status === 'pending').length} avointa tehtävää` : `${mockAssignments.filter(a => a.status === 'pending').length} pending assignments`}
                  </p>
                </div>

                <div className="space-y-3">
                  {mockAssignments.map((assignment, idx) => (
                    <Card key={idx} className={assignment.status === 'pending' ? 'border-orange-300' : 'border-green-300'}>
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
                          <div className="text-right">
                            <Badge className={assignment.status === 'pending' ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'}>
                              {assignment.status === 'pending' ? (language === 'fi' ? 'Avoin' : 'Pending') : (language === 'fi' ? 'Palautettu' : 'Submitted')}
                            </Badge>
                            <p className="text-sm text-gray-600 mt-1">{assignment.due}</p>
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
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                  <p className="text-sm text-purple-800 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {language === 'fi' ? `${mockMessages.filter(m => m.unread).length} lukematonta viestiä` : `${mockMessages.filter(m => m.unread).length} unread messages`}
                  </p>
                </div>

                <div className="space-y-3">
                  {mockMessages.map((message, idx) => (
                    <Card key={idx} className={message.unread ? 'border-purple-300 bg-purple-50' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Mail className={`w-5 h-5 ${message.unread ? 'text-purple-600' : 'text-gray-400'}`} />
                              <div>
                                <p className={`font-semibold ${message.unread ? 'text-gray-900' : 'text-gray-600'}`}>{message.subject}</p>
                                <p className="text-sm text-gray-600">{language === 'fi' ? 'Lähettäjä: ' : 'From: '}{message.from}</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {message.unread && <Badge className="bg-purple-600 text-white mb-1">{language === 'fi' ? 'Uusi' : 'New'}</Badge>}
                            <p className="text-sm text-gray-600">{message.date}</p>
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
                  <Card className="bg-green-50 border-green-200">
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

                  <Card className="bg-red-50 border-red-200">
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

                  <Card className="bg-blue-50 border-blue-200">
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
                    <Card key={idx} className={record.status === 'absent' ? 'border-red-300' : 'border-green-300'}>
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
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                  <p className="text-sm text-indigo-800 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    {language === 'fi' ? '6 aktiivista kurssia' : '6 active courses'}
                  </p>
                </div>

                <div className="grid gap-3">
                  {mockGrades.map((course, idx) => (
                    <Card key={idx} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GraduationCap className="w-6 h-6 text-indigo-600" />
                            <div>
                              <p className="font-semibold text-gray-800">{course.subject}</p>
                              <p className="text-sm text-gray-600">{language === 'fi' ? 'Opettaja: ' : 'Teacher: '}{course.teacher}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-indigo-600 text-white">{language === 'fi' ? 'Aktiivinen' : 'Active'}</Badge>
                            <p className="text-sm text-gray-600 mt-1">{language === 'fi' ? 'Arvosana: ' : 'Grade: '}{course.grade}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
