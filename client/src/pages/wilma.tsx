import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, FileText, MessageSquare, Home, BarChart3, Bell, LogOut, User,
  Users, UserCheck, Building, GraduationCap, ClipboardList, Lock, AlertCircle,
  BookOpen, Clock, Award, TrendingUp, CheckCircle, XCircle, AlertTriangle, Mail,
  Phone, Download, FileDown, Settings, Eye, EyeOff
} from 'lucide-react';

export default function Wilma() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma/:studentId/:section?');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('frontpage');
  const [language, setLanguage] = useState<'fi' | 'en'>('fi');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPasswordChangeDialog, setShowPasswordChangeDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');
  const [returnPath, setReturnPath] = useState('');

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
    // Check for session expiration in URL
    const urlParams = new URLSearchParams(window.location.search);
    const invalidSession = urlParams.get('invalidsession');
    const returnPathParam = urlParams.get('returnpath');
    
    if (invalidSession) {
      setSessionExpiredMessage(language === 'fi' 
        ? 'Istuntosi on vanhentunut. Kirjaudu uudelleen sisään.' 
        : 'Your session has expired. Please log in again.');
      if (returnPathParam) {
        setReturnPath(returnPathParam);
      }
    }
    
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

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      alert(language === 'fi' ? 'Syötä sähköpostiosoite' : 'Enter email address');
      return;
    }
    
    // Simulate password reset
    setResetSuccess(true);
    setTimeout(() => {
      setShowForgotPassword(false);
      setResetSuccess(false);
      setResetEmail('');
      alert(language === 'fi' 
        ? `Salasanan palautuslinkki lähetetty osoitteeseen ${resetEmail}`
        : `Password reset link sent to ${resetEmail}`);
    }, 2000);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('wilma_user');
    setActiveSection('frontpage');
    setShowLogoutConfirm(false);
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
      grades: 'Arvosanat', assignments: 'Tehtävät', messages: 'Viestit', attendance: 'Tuntimerkinnät',
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    if (!username || !password) {
      setLoginError(language === 'fi' ? 'Syötä käyttäjätunnus ja salasana' : 'Please enter username and password');
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
        setLoginError(data.message || (language === 'fi' ? 'Virheellinen käyttäjätunnus tai salasana' : 'Invalid username or password'));
        setIsLoading(false);
        return;
      }

      setCurrentUser(data);
      
      // Check if password change is required
      if (data.requiresPasswordChange) {
        setShowPasswordChangeDialog(true);
        setIsLoading(false);
        return;
      }
      
      setIsLoggedIn(true);
      localStorage.setItem('wilma_user', JSON.stringify(data));
      setUsername('');
      setPassword('');
      setIsLoading(false);
      
      // Check if there's a return path to redirect to
      if (returnPath) {
        setLocation(returnPath);
        setReturnPath('');
        return;
      }
      
      // Role-based routing
      if (data.role === 'admin' || data.role === 'teacher') {
        setLocation('/wilma-admin');
      } else if (data.role === 'parent') {
        setLocation(`/wilma/parent/${data.id}`);
      } else if (data.studentId) {
        setLocation(`/wilma/${data.studentId}`);
      }
    } catch {
      setLoginError(language === 'fi' ? 'Yhteysvirhe. Tarkista palvelimen tila.' : 'Connection error. Please check if the server is running.');
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');

    if (!newPassword || newPassword.length < 6) {
      setPasswordChangeError(language === 'fi' ? 'Salasanan on oltava vähintään 6 merkkiä' : 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError(language === 'fi' ? 'Salasanat eivät täsmää' : 'Passwords do not match');
      return;
    }

    try {
      const response = await fetch(`/api/wilma/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          password: newPassword,
          isTemporaryPassword: false 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to change password');
      }

      // Update current user and proceed with login
      const updatedUser = { ...currentUser, requiresPasswordChange: false };
      setCurrentUser(updatedUser);
      setIsLoggedIn(true);
      localStorage.setItem('wilma_user', JSON.stringify(updatedUser));
      setShowPasswordChangeDialog(false);
      setNewPassword('');
      setConfirmNewPassword('');
      
      // Role-based routing
      if (updatedUser.role === 'admin' || updatedUser.role === 'teacher') {
        setLocation('/wilma-admin');
      } else if (updatedUser.role === 'parent') {
        setLocation(`/wilma/parent/${updatedUser.id}`);
      } else if (updatedUser.studentId) {
        setLocation(`/wilma/${updatedUser.studentId}`);
      }
    } catch (error) {
      setPasswordChangeError(language === 'fi' ? 'Salasanan vaihto epäonnistui' : 'Failed to change password');
    }
  };

  const tr = t[language];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#003d82] via-[#0052a3] to-[#0066cc] flex items-center justify-center p-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <Card className="w-full max-w-md shadow-2xl relative z-10 border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white rounded-t-lg pb-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                <Lock className="w-10 h-10 text-[#003d82]" />
              </div>
              <CardTitle className="text-3xl font-bold mb-2">{tr.welcome}</CardTitle>
              <p className="text-blue-100 text-sm">{tr.school} - {language === 'fi' ? 'Oppilashallintojärjestelmä' : 'Student Management System'}</p>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {!showForgotPassword ? (
              <>
                <p className="text-center text-gray-600 mb-6 font-medium">{tr.loginInstructions}</p>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {tr.username}
                    </label>
                    <Input 
                      type="text" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={language === 'fi' ? 'esim. matti.virtanen' : 'e.g. john.doe'} 
                      required 
                      disabled={isLoading} 
                      className="w-full h-12 text-base border-2 border-gray-300 focus:border-blue-500" 
                      autoComplete="username" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      {tr.password}
                    </label>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"}
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" 
                        required 
                        disabled={isLoading} 
                        className="w-full h-12 text-base border-2 border-gray-300 focus:border-blue-500 pr-12" 
                        autoComplete="current-password" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                      <span className="text-gray-600">{language === 'fi' ? 'Muista minut' : 'Remember me'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                    >
                      {language === 'fi' ? 'Unohditko salasanan?' : 'Forgot password?'}
                    </button>
                  </div>

                  {loginError && (
                    <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2 animate-shake">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span className="font-medium">{loginError}</span>
                    </div>
                  )}
                  
                  {sessionExpiredMessage && (
                    <div className="bg-orange-50 border-2 border-orange-200 text-orange-700 px-4 py-3 rounded-lg flex items-start gap-2">
                      <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span className="font-medium">{sessionExpiredMessage}</span>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-[#003d82] to-[#0052a3] hover:from-[#0052a3] hover:to-[#0066cc] text-white text-lg font-bold shadow-lg transition-all" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {tr.loggingIn}
                      </span>
                    ) : (
                      tr.loginButton
                    )}
                  </Button>
                </form>
                
                <div className="mt-6 space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">{language === 'fi' ? 'Tai' : 'Or'}</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <button 
                      onClick={() => setLanguage(language === 'fi' ? 'en' : 'fi')}
                      className="text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline flex items-center gap-2 mx-auto"
                    >
                      <span className="text-lg">{language === 'fi' ? '🇬🇧' : '🇫🇮'}</span>
                      {language === 'fi' ? 'English' : 'Suomi'}
                    </button>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 text-center">
                      <strong>{language === 'fi' ? 'Huom!' : 'Note!'}</strong> {tr.noAccount}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-2 mb-4"
                >
                  ← {language === 'fi' ? 'Takaisin kirjautumiseen' : 'Back to login'}
                </button>
                
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {language === 'fi' ? 'Palauta salasana' : 'Reset Password'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {language === 'fi' 
                      ? 'Syötä sähköpostiosoitteesi, niin lähetämme sinulle linkin salasanan palauttamiseen.'
                      : 'Enter your email address and we\'ll send you a link to reset your password.'}
                  </p>
                </div>

                {!resetSuccess ? (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {language === 'fi' ? 'Sähköpostiosoite' : 'Email Address'}
                      </label>
                      <Input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder={language === 'fi' ? 'esim. matti.virtanen@koulu.fi' : 'e.g. john.doe@school.com'}
                        className="w-full h-12 text-base border-2 border-gray-300 focus:border-blue-500"
                      />
                    </div>
                    <Button
                      onClick={handleForgotPassword}
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      {language === 'fi' ? 'Lähetä palautuslinkki' : 'Send Reset Link'}
                    </Button>
                  </>
                ) : (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <p className="text-green-800 font-semibold">
                      {language === 'fi' ? 'Palautuslinkki lähetetty!' : 'Reset link sent!'}
                    </p>
                    <p className="text-sm text-green-700 mt-2">
                      {language === 'fi' 
                        ? 'Tarkista sähköpostisi ja seuraa ohjeita.'
                        : 'Check your email and follow the instructions.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Change Dialog */}
        {showPasswordChangeDialog && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md shadow-2xl border-2 border-blue-500">
              <CardHeader className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white">
                <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                  <Lock className="w-6 h-6" />
                  {language === 'fi' ? 'Vaihda salasana' : 'Change Password'}
                </CardTitle>
                <p className="text-blue-100 text-sm mt-2">
                  {language === 'fi' 
                    ? 'Sinun on vaihdettava väliaikainen salasanasi jatkaaksesi.'
                    : 'You must change your temporary password to continue.'}
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <Label className="text-sm font-bold">
                      {language === 'fi' ? 'Uusi salasana' : 'New Password'}
                    </Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={language === 'fi' ? 'Vähintään 6 merkkiä' : 'Minimum 6 characters'}
                      required
                      className="mt-2 h-12"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">
                      {language === 'fi' ? 'Vahvista salasana' : 'Confirm Password'}
                    </Label>
                    <Input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder={language === 'fi' ? 'Kirjoita salasana uudelleen' : 'Re-enter password'}
                      required
                      className="mt-2 h-12"
                    />
                  </div>
                  
                  {passwordChangeError && (
                    <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span className="font-medium text-sm">{passwordChangeError}</span>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-[#003d82] to-[#0052a3] hover:from-[#0052a3] hover:to-[#0066cc] text-white text-lg font-bold"
                  >
                    {language === 'fi' ? 'Vaihda salasana' : 'Change Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Logout Confirmation Dialog */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md shadow-2xl border-2 border-red-500">
              <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white">
                <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
                  <LogOut className="w-6 h-6" />
                  {language === 'fi' ? 'Kirjaudu ulos' : 'Logout'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <AlertCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <p className="text-lg font-semibold text-gray-800 mb-2">
                      {language === 'fi' ? 'Haluatko varmasti kirjautua ulos?' : 'Are you sure you want to logout?'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'fi' 
                        ? 'Sinun täytyy kirjautua uudelleen sisään päästäksesi takaisin.'
                        : 'You will need to log in again to access your account.'}
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowLogoutConfirm(false)}
                      variant="outline"
                      className="flex-1 h-12 text-base font-semibold"
                    >
                      {language === 'fi' ? 'Peruuta' : 'Cancel'}
                    </Button>
                    <Button
                      onClick={confirmLogout}
                      className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white text-base font-semibold"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {language === 'fi' ? 'Kirjaudu ulos' : 'Logout'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
          <p className="opacity-80">© 2026 Wilma by SL Studio • {language === 'fi' ? 'Kaikki oikeudet pidätetään' : 'All rights reserved'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="bg-[#003d82] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-semibold truncate">{tr.school}</h1>
                <p className="text-xs sm:text-sm text-blue-200 mt-1 flex items-center gap-1 sm:gap-2 truncate">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">{currentUser.firstName} {currentUser.lastName} • ID: {currentUser.studentId} • {currentUser.studentClass || currentUser.role}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
              <button className="px-2 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs sm:text-sm transition-colors flex items-center gap-1 sm:gap-2">
                <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{tr.notifications}</span>
                <Badge className="bg-red-500 text-white ml-0 sm:ml-1 text-xs px-1">3</Badge>
              </button>
              <button onClick={() => setLanguage(language === 'fi' ? 'en' : 'fi')}
                className="px-2 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs sm:text-sm font-semibold transition-colors">
                {language === 'fi' ? 'EN' : 'FI'}
              </button>
              <button onClick={handleLogout}
                className="px-2 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs sm:text-sm transition-colors flex items-center gap-1 sm:gap-2">
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{tr.logout}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0052a3] border-b-2 border-[#003d82] shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {[
              { id: 'frontpage', icon: Home, label: tr.frontpage },
              { id: 'schedule', icon: Calendar, label: tr.schedule },
              { id: 'grades', icon: BarChart3, label: tr.grades },
              { id: 'assignments', icon: FileText, label: tr.assignments },
              { id: 'messages', icon: MessageSquare, label: tr.messages },
              { id: 'attendanceMarks', icon: UserCheck, label: language === 'fi' ? 'Tuntimerkinnät' : 'Attendance Marks' },
              { id: 'exams', icon: ClipboardList, label: tr.exams },
              { id: 'materials', icon: BookOpen, label: tr.studyMaterials },
              { id: 'courses', icon: GraduationCap, label: tr.courses },
              { id: 'settings', icon: Settings, label: tr.settings },
            ].map((item) => (
              <button key={item.id} onClick={() => handleSectionChange(item.id)}
                className={`px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1 sm:gap-2 ${
                  activeSection === item.id ? 'bg-white text-[#003d82] font-semibold shadow-sm' : 'text-white hover:bg-[#003d82]'
                }`}>
                <item.icon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
        <Card>
          <CardHeader className="bg-[#e8f0f8] border-b border-gray-300">
            <CardTitle className="text-xl text-gray-800 flex items-center justify-between">
              <span>
                {activeSection === 'frontpage' && tr.frontpage}
                {activeSection === 'schedule' && tr.schedule}
                {activeSection === 'grades' && tr.grades}
                {activeSection === 'assignments' && tr.assignments}
                {activeSection === 'messages' && tr.messages}
                {activeSection === 'attendanceMarks' && (language === 'fi' ? 'Tuntimerkinnät' : 'Attendance Marks')}
                {activeSection === 'exams' && tr.exams}
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
                <div className="bg-blue-50 border border-blue-200 p-3 sm:p-4 rounded-lg">
                  <p className="text-xs sm:text-sm text-blue-800 flex items-center gap-2">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    {language === 'fi' ? 'Viikko 15 • Kevätlukukausi 2026' : 'Week 15 • Spring Semester 2026'}
                  </p>
                </div>
                
                {/* Mobile View - Card Layout */}
                <div className="block sm:hidden space-y-3">
                  {mockSchedule.map((row, idx) => (
                    <Card key={idx} className="border-2 border-blue-200">
                      <CardHeader className="bg-blue-50 p-3">
                        <CardTitle className="text-sm font-bold text-blue-900">{row.time}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 space-y-2">
                        {['mon', 'tue', 'wed', 'thu', 'fri'].map((day, dayIdx) => {
                          const lesson = row[day as keyof typeof row];
                          const dayNames = {
                            fi: ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'],
                            en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                          };
                          return (
                            <div key={day} className="border-b last:border-b-0 pb-2 last:pb-0">
                              <p className="text-xs font-semibold text-gray-600 mb-1">{dayNames[language][dayIdx]}</p>
                              {lesson && typeof lesson === 'object' ? (
                                <div className="bg-blue-50 p-2 rounded">
                                  <p className="font-semibold text-sm text-gray-800">{lesson.subject}</p>
                                  <p className="text-xs text-gray-600">{lesson.room}</p>
                                  <p className="text-xs text-blue-600 flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {lesson.teacher}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop View - Table Layout */}
                <div className="hidden sm:block overflow-x-auto">
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

            {activeSection === 'attendanceMarks' && (
              <div className="space-y-6">
                {/* Attendance Marks Component - Wilma Style */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <UserCheck className="w-7 h-7 text-blue-600" />
                    {language === 'fi' ? 'Tuntimerkinnät' : 'Attendance Marks'}
                  </h2>
                  <p className="text-gray-600">
                    {language === 'fi' 
                      ? 'Tarkastele ja hallinnoi tuntimerkintöjä. Voit suodattaa merkintöjä jakson, lukuvuoden ja päivämäärän mukaan.'
                      : 'View and manage attendance marks. You can filter marks by period, school year, and date.'}
                  </p>
                </div>

                {/* Filters */}
                <Card className="border-2 border-blue-200">
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600" />
                      {language === 'fi' ? 'Suodattimet' : 'Filters'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Period Filter */}
                      <div className="space-y-2">
                        <Label className="font-semibold">{language === 'fi' ? 'Jakso' : 'Period'}</Label>
                        <select className="w-full p-2 border-2 border-gray-300 rounded-md focus:border-blue-500">
                          <option value="all">{language === 'fi' ? 'Kaikki' : 'All'}</option>
                          <option value="jakso1">{language === 'fi' ? 'Jakso 1 (Syksy)' : 'Period 1 (Fall)'}</option>
                          <option value="jakso2">{language === 'fi' ? 'Jakso 2 (Talvi)' : 'Period 2 (Winter)'}</option>
                          <option value="jakso3">{language === 'fi' ? 'Jakso 3 (Kevät)' : 'Period 3 (Spring)'}</option>
                          <option value="jakso4">{language === 'fi' ? 'Jakso 4 (Kesä)' : 'Period 4 (Summer)'}</option>
                        </select>
                      </div>

                      {/* School Year Filter */}
                      <div className="space-y-2">
                        <Label className="font-semibold">{language === 'fi' ? 'Lukuvuosi' : 'School Year'}</Label>
                        <select className="w-full p-2 border-2 border-gray-300 rounded-md focus:border-blue-500">
                          <option value="2025-2026">2025-2026</option>
                          <option value="2024-2025">2024-2025</option>
                          <option value="2023-2024">2023-2024</option>
                        </select>
                      </div>

                      {/* Date Filter */}
                      <div className="space-y-2">
                        <Label className="font-semibold">{language === 'fi' ? 'Päivämäärä' : 'Date'}</Label>
                        <Input 
                          type="date" 
                          className="w-full border-2 border-gray-300 focus:border-blue-500"
                          defaultValue={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100 text-sm">{language === 'fi' ? 'Läsnä' : 'Present'}</p>
                          <p className="text-3xl font-bold mt-1">45</p>
                        </div>
                        <CheckCircle className="w-10 h-10 text-green-200" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-red-100 text-sm">{language === 'fi' ? 'Poissa' : 'Absent'}</p>
                          <p className="text-3xl font-bold mt-1">2</p>
                        </div>
                        <XCircle className="w-10 h-10 text-red-200" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-yellow-100 text-sm">{language === 'fi' ? 'Myöhässä' : 'Late'}</p>
                          <p className="text-3xl font-bold mt-1">3</p>
                        </div>
                        <Clock className="w-10 h-10 text-yellow-200" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-sm">{language === 'fi' ? 'Huomautukset' : 'Remarks'}</p>
                          <p className="text-3xl font-bold mt-1">1</p>
                        </div>
                        <AlertTriangle className="w-10 h-10 text-purple-200" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Attendance Marks List */}
                <Card className="border-2 border-blue-200">
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-blue-600" />
                        {language === 'fi' ? 'Viimeisimmät merkinnät' : 'Recent Marks'}
                      </span>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        {language === 'fi' ? 'Lisää merkintä' : 'Add Mark'}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {/* Sample attendance marks */}
                      {[
                        { date: '2026-04-21', subject: 'Matematiikka', type: 'present', color: 'green', icon: CheckCircle },
                        { date: '2026-04-21', subject: 'Englanti', type: 'present', color: 'green', icon: CheckCircle },
                        { date: '2026-04-20', subject: 'Historia', type: 'late', color: 'yellow', icon: Clock },
                        { date: '2026-04-19', subject: 'Fysiikka', type: 'absent', color: 'red', icon: XCircle },
                        { date: '2026-04-18', subject: 'Kemia', type: 'present', color: 'green', icon: CheckCircle },
                      ].map((mark, idx) => {
                        const Icon = mark.icon;
                        return (
                          <Card key={idx} className={`border-2 border-${mark.color}-200 bg-${mark.color}-50 hover:shadow-md transition-all cursor-pointer`}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className={`p-2 rounded-lg bg-${mark.color}-100`}>
                                    <Icon className={`w-6 h-6 text-${mark.color}-600`} />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-800">{mark.subject}</p>
                                    <p className="text-sm text-gray-600">{mark.date} • {mark.type === 'present' ? (language === 'fi' ? 'Läsnä' : 'Present') : mark.type === 'late' ? (language === 'fi' ? 'Myöhässä' : 'Late') : (language === 'fi' ? 'Poissa' : 'Absent')}</p>
                                  </div>
                                </div>
                                <Badge className={`bg-${mark.color}-600 text-white`}>
                                  {mark.type === 'present' ? '✓' : mark.type === 'late' ? '⏰' : '✗'}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    <div className="mt-6 text-center">
                      <Button variant="outline" className="w-full md:w-auto">
                        {language === 'fi' ? 'Näytä kaikki merkinnät' : 'Show All Marks'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Configuration Section */}
                <Card className="border-2 border-purple-200">
                  <CardHeader className="bg-purple-50">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-purple-600" />
                      {language === 'fi' ? 'Tuntimerkintöjen asetukset' : 'Attendance Settings'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-gray-600 mb-4">
                      {language === 'fi' 
                        ? 'Hallinnoi tuntimerkintöjen asetuksia, kuten merkintätyyppejä ja ilmoituksia.'
                        : 'Manage attendance settings such as mark types and notifications.'}
                    </p>
                    <div className="flex gap-3">
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        {language === 'fi' ? 'Muokkaa asetuksia' : 'Edit Settings'}
                      </Button>
                      <Button variant="outline">
                        {language === 'fi' ? 'Vie tiedot' : 'Export Data'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
