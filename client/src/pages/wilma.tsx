import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  FileText, 
  MessageSquare,
  Home,
  BarChart3,
  Bell,
  LogOut,
  User,
  Users,
  UserCheck,
  Building,
  GraduationCap,
  ClipboardList,
  Lock,
  AlertCircle
} from 'lucide-react';

export default function Wilma() {
  const [location, setLocation] = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('frontpage');
  const [language, setLanguage] = useState<'fi' | 'en'>('fi');

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('wilma_user');
    console.log('🔍 Checking stored user:', storedUser);
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        console.log('✅ Found stored user:', user);
        
        // Verify user still exists in database
        fetch('/api/wilma/users')
          .then(res => {
            if (!res.ok) {
              console.log('❌ Failed to fetch users, clearing cache');
              localStorage.removeItem('wilma_user');
              return null;
            }
            return res.json();
          })
          .then(users => {
            if (!users) return;
            
            const userExists = users.find((u: any) => u.id === user.id && u.isActive);
            if (userExists) {
              setCurrentUser(user);
              setIsLoggedIn(true);
              console.log('✅ User verified and logged in');
            } else {
              console.log('❌ User not found or inactive in database, clearing cache');
              localStorage.removeItem('wilma_user');
            }
          })
          .catch(err => {
            console.error('❌ Error verifying user:', err);
            localStorage.removeItem('wilma_user');
          });
      } catch (error) {
        console.error('❌ Error parsing stored user:', error);
        localStorage.removeItem('wilma_user');
      }
    } else {
      console.log('ℹ️ No stored user found');
    }
  }, []);

  // Handle login
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
      console.log('🔐 Attempting Wilma login for username:', username);
      
      const response = await fetch('/api/wilma/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password })
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (!response.ok) {
        console.error('❌ Login failed:', data);
        setLoginError(data.message || 'Invalid username or password');
        setIsLoading(false);
        return;
      }

      console.log('✅ Login successful!', data);
      
      setCurrentUser(data);
      setIsLoggedIn(true);
      localStorage.setItem('wilma_user', JSON.stringify(data));
      setUsername('');
      setPassword('');
      setIsLoading(false);
    } catch (error) {
      console.error('💥 Login error:', error);
      setLoginError('Connection error. Please check if the server is running.');
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('wilma_user');
    setActiveSection('frontpage');
  };

  // Sync URL with active section
  useEffect(() => {
    if (isLoggedIn) {
      const path = location.replace('/wilma/', '').replace('/wilma', '');
      if (path && path !== activeSection) {
        setActiveSection(path || 'frontpage');
      }
    }
  }, [location, isLoggedIn]);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setLocation(`/wilma/${section === 'frontpage' ? '' : section}`);
  };

  // Translation object
  const tr = {
    fi: {
      school: 'Brando',
      login: 'Kirjaudu sisään',
      username: 'Käyttäjätunnus',
      password: 'Salasana',
      loginButton: 'Kirjaudu',
      loggingIn: 'Kirjaudutaan...',
      loginError: 'Virheellinen käyttäjätunnus tai salasana',
      welcome: 'Tervetuloa Wilmaan',
      loginInstructions: 'Kirjaudu sisään käyttäjätunnuksellasi ja salasanallasi',
      noAccount: 'Eikö sinulla ole tunnuksia? Ota yhteyttä ylläpitäjään.',
      studentName: 'Oppilas',
      class: 'Luokka',
      notifications: 'Ilmoitukset',
      frontpage: 'Etusivu',
      schedule: 'Lukujärjestys',
      grades: 'Arvosanat',
      assignments: 'Tehtävät',
      messages: 'Viestit',
      attendance: 'Poissaolot',
      exams: 'Kokeet',
      settings: 'Asetukset',
      students: 'Oppilaat',
      teachers: 'Opettajat',
      rooms: 'Huoneet',
      courses: 'Kurssit',
      reports: 'Raportit',
      logout: 'Kirjaudu ulos',
      gradeAverage: 'Keskiarvo',
      role: 'Rooli',
      teacher: 'Opettaja',
      student: 'Oppilas',
      parent: 'Huoltaja',
      admin: 'Ylläpitäjä',
      comingSoon: 'Tulossa pian',
      thisFeature: 'Tämä ominaisuus on tulossa pian',
    },
    en: {
      school: 'Brando',
      login: 'Login',
      username: 'Username',
      password: 'Password',
      loginButton: 'Login',
      loggingIn: 'Logging in...',
      loginError: 'Invalid username or password',
      welcome: 'Welcome to Wilma',
      loginInstructions: 'Login with your username and password',
      noAccount: "Don't have credentials? Contact administrator.",
      studentName: 'Student',
      class: 'Class',
      notifications: 'Notifications',
      frontpage: 'Frontpage',
      schedule: 'Schedule',
      grades: 'Grades',
      assignments: 'Assignments',
      messages: 'Messages',
      attendance: 'Attendance',
      exams: 'Exams',
      settings: 'Settings',
      students: 'Students',
      teachers: 'Teachers',
      rooms: 'Rooms',
      courses: 'Courses',
      reports: 'Reports',
      logout: 'Logout',
      gradeAverage: 'Average',
      role: 'Role',
      teacher: 'Teacher',
      student: 'Student',
      parent: 'Parent',
      admin: 'Admin',
      comingSoon: 'Coming Soon',
      thisFeature: 'This feature is coming soon',
    }
  };

  const t = tr[language];

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="bg-[#003d82] text-white rounded-t-lg">
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <Lock className="w-6 h-6" />
              {t.welcome}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <p className="text-center text-gray-600 mb-6">{t.loginInstructions}</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.username}
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t.username}
                  required
                  disabled={isLoading}
                  className="w-full"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.password}
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.password}
                  required
                  disabled={isLoading}
                  className="w-full"
                  autoComplete="current-password"
                />
              </div>
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}
              <Button 
                type="submit" 
                className="w-full bg-[#003d82] hover:bg-[#0052a3]"
                disabled={isLoading}
              >
                {isLoading ? t.loggingIn : t.loginButton}
              </Button>
            </form>
            <div className="mt-6 space-y-3">
              <div className="text-center">
                <button
                  onClick={() => setLanguage(language === 'fi' ? 'en' : 'fi')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {language === 'fi' ? 'English' : 'Suomi'}
                </button>
              </div>
              <div className="text-center">
                <button
                  onClick={() => {
                    localStorage.removeItem('wilma_user');
                    setIsLoggedIn(false);
                    setCurrentUser(null);
                    alert('Cache cleared! Please try logging in again.');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear Cache & Force Logout
                </button>
              </div>
              <div className="text-center text-sm text-gray-500">
                {t.noAccount}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Wilma Interface (after login)
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Wilma Header */}
      <div className="bg-[#003d82] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-semibold">{t.school}</h1>
                <p className="text-sm text-blue-200 mt-1">
                  <User className="w-4 h-4 inline mr-1" />
                  {currentUser.firstName} {currentUser.lastName} • {currentUser.studentClass || currentUser.role}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">{t.notifications}</span>
              </button>
              <button 
                onClick={() => setLanguage(language === 'fi' ? 'en' : 'fi')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors"
              >
                {language === 'fi' ? 'EN' : 'FI'}
              </button>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t.logout}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-[#0052a3] border-b-2 border-[#003d82] shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'frontpage', icon: Home, label: t.frontpage },
              { id: 'schedule', icon: Calendar, label: t.schedule },
              { id: 'grades', icon: BarChart3, label: t.grades },
              { id: 'assignments', icon: FileText, label: t.assignments },
              { id: 'messages', icon: MessageSquare, label: t.messages },
              { id: 'students', icon: Users, label: t.students },
              { id: 'teachers', icon: UserCheck, label: t.teachers },
              { id: 'rooms', icon: Building, label: t.rooms },
              { id: 'courses', icon: GraduationCap, label: t.courses },
              { id: 'reports', icon: ClipboardList, label: t.reports },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleSectionChange(item.id)}
                className={`px-4 py-3 text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeSection === item.id
                    ? 'bg-white text-[#003d82] font-semibold shadow-sm'
                    : 'text-white hover:bg-[#003d82]'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Card>
          <CardHeader className="bg-[#e8f0f8] border-b border-gray-300">
            <CardTitle className="text-xl text-gray-800">
              {activeSection === 'frontpage' && t.frontpage}
              {activeSection === 'schedule' && t.schedule}
              {activeSection === 'grades' && t.grades}
              {activeSection === 'assignments' && t.assignments}
              {activeSection === 'messages' && t.messages}
              {activeSection === 'students' && t.students}
              {activeSection === 'teachers' && t.teachers}
              {activeSection === 'rooms' && t.rooms}
              {activeSection === 'courses' && t.courses}
              {activeSection === 'reports' && t.reports}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚧</div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">{t.comingSoon}</h3>
              <p className="text-gray-600">{t.thisFeature}</p>
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{t.role}:</strong> {currentUser.role === 'teacher' ? t.teacher : currentUser.role === 'student' ? t.student : currentUser.role === 'parent' ? t.parent : t.admin}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
