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
    const sessionParam = urlParams.get('session');
    const returnPathParam = urlParams.get('returnpath');
    
    if (invalidSession || sessionParam === 'expired') {
      setSessionExpiredMessage(language === 'fi' 
        ? 'Istuntosi on vanhentunut. Kirjaudu uudelleen sisään.' 
        : 'Your session has expired. Please log in again.');
      
      // Check for return path
      const returnPath = localStorage.getItem('wilma_return_path') || returnPathParam;
      if (returnPath) {
        setReturnPath(returnPath);
        setTimeout(() => {
          setSessionExpiredMessage(prev => prev + (language === 'fi'
            ? ' Sinut ohjataan takaisin edelliselle sivulle kirjautumisen jälkeen.'
            : ' You will be redirected to your previous page after login.'));
        }, 1000);
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
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResetSuccess(true);
        setTimeout(() => {
          setShowForgotPassword(false);
          setResetSuccess(false);
          setResetEmail('');
          setIsLoading(false);
        }, 3000);
      } else {
        alert(data.message || (language === 'fi' ? 'Salasanan palautus epäonnistui' : 'Password reset failed'));
        setIsLoading(false);
      }
    } catch (error) {
      alert(language === 'fi' ? 'Yhteysvirhe' : 'Connection error');
      setIsLoading(false);
    }
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
      const savedReturnPath = returnPath || localStorage.getItem('wilma_return_path');
      
      if (savedReturnPath && savedReturnPath !== '/wilma') {
        localStorage.removeItem('wilma_return_path');
        setLocation(savedReturnPath);
        setReturnPath('');
        return;
      }
      
      // Role-based routing
      const roles = data.roles || [data.role];
      
      // Check if user has admin, teacher, principal, or vice_principal role
      if (roles.includes('admin') || roles.includes('teacher') || roles.includes('principal') || roles.includes('vice_principal') || data.role === 'admin' || data.role === 'teacher' || data.role === 'principal' || data.role === 'vice_principal') {
        console.log('Redirecting to admin panel:', `/wilma-admin/${data.id}`);
        setLocation(`/wilma-admin/${data.id}`);
      } else {
        // Student, parent, or other roles use /wilma/:userId
        console.log('Redirecting to user page:', `/wilma/${data.id}`);
        setLocation(`/wilma/${data.id}`);
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
      
      // Role-based routing with return path support
      const savedReturnPath = localStorage.getItem('wilma_return_path');
      
      if (savedReturnPath && savedReturnPath !== '/wilma') {
        localStorage.removeItem('wilma_return_path');
        setLocation(savedReturnPath);
      } else {
        const roles = updatedUser.roles || [updatedUser.role];
        
        if (roles.includes('admin') || roles.includes('teacher') || roles.includes('principal') || roles.includes('vice_principal') || updatedUser.role === 'admin' || updatedUser.role === 'teacher' || updatedUser.role === 'principal' || updatedUser.role === 'vice_principal') {
          console.log('Redirecting to admin panel after password change:', `/wilma-admin/${updatedUser.id}`);
          setLocation(`/wilma-admin/${updatedUser.id}`);
        } else {
          // Student, parent, or other roles use /wilma/:userId
          console.log('Redirecting to user page after password change:', `/wilma/${updatedUser.id}`);
          setLocation(`/wilma/${updatedUser.id}`);
        }
      }
    } catch (error) {
      setPasswordChangeError(language === 'fi' ? 'Salasanan vaihto epäonnistui' : 'Failed to change password');
    }
  };

  const tr = t[language];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex">
        {/* Left Side - Background Image */}
        <div 
          className="hidden lg:flex lg:w-1/2 xl:w-2/3 relative"
          style={{
            backgroundImage: 'url(/wilma-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Branding overlay with better visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          <div className="absolute bottom-8 left-8 text-white z-10">
            <h1 className="text-6xl font-bold mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">Wilma</h1>
            <p className="text-2xl mb-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">Oppilashallintojärjestelmä</p>
            <p className="text-sm opacity-90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              © 2026 Wilma by SL Studio • Kaikki oikeudet pidätetään
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 xl:w-1/3 bg-white flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            {/* Logo and Title - LARGER LOGO (48px) */}
            <div className="text-center mb-6">
              <div className="wilma-logo-container mx-auto mb-3">
                <img src="/kulosaaren_yhteiskoulu_logo.jpeg" alt="Wilma" className="wilma-logo-lg" />
              </div>
              <h1 className="text-xl font-bold text-[#003d82] mb-1">{tr.welcome}</h1>
              <p className="text-gray-600 text-sm">{tr.school}</p>
            </div>

            {!showForgotPassword ? (
              <>
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {tr.username}
                    </label>
                    <Input 
                      type="text" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={language === 'fi' ? 'Käyttäjätunnus' : 'Username'} 
                      required 
                      disabled={isLoading} 
                      className="w-full h-10 border-gray-300 focus:border-[#003d82] focus:ring-[#003d82]" 
                      autoComplete="username" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {tr.password}
                    </label>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"}
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={language === 'fi' ? 'Salasana' : 'Password'} 
                        required 
                        disabled={isLoading} 
                        className="w-full h-10 border-gray-300 focus:border-[#003d82] focus:ring-[#003d82] pr-10" 
                        autoComplete="current-password" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-[#003d82] focus:ring-[#003d82]" />
                      <span className="text-gray-600">{language === 'fi' ? 'Muista minut' : 'Remember me'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-[#003d82] hover:underline font-medium"
                    >
                      {language === 'fi' ? 'Unohditko salasanan?' : 'Forgot password?'}
                    </button>
                  </div>

                  {loginError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md flex items-start gap-2 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}
                  
                  {sessionExpiredMessage && (
                    <div className="bg-orange-50 border border-orange-200 text-orange-700 px-3 py-2 rounded-md flex items-start gap-2 text-xs">
                      <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{sessionExpiredMessage}</span>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full h-10 bg-[#003d82] hover:bg-[#0052a3] text-white font-semibold shadow-sm transition-colors" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {tr.loggingIn}
                      </span>
                    ) : (
                      tr.loginButton
                    )}
                  </Button>
                </form>
                
                <div className="mt-5 space-y-3">
                  <div className="text-center">
                    <button 
                      onClick={() => setLanguage(language === 'fi' ? 'en' : 'fi')}
                      className="text-xs text-gray-600 hover:text-[#003d82] font-medium flex items-center gap-2 mx-auto"
                    >
                      <span className="text-base">{language === 'fi' ? '🇬🇧' : '🇫🇮'}</span>
                      {language === 'fi' ? 'English' : 'Suomi'}
                    </button>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-100 rounded-md p-2.5">
                    <p className="text-xs text-blue-800 text-center">
                      <strong>{language === 'fi' ? 'Huom!' : 'Note!'}</strong> {tr.noAccount}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-[#003d82] hover:text-[#0052a3] font-semibold flex items-center gap-2 mb-4"
                >
                  ← {language === 'fi' ? 'Takaisin kirjautumiseen' : 'Back to login'}
                </button>
                
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-[#003d82]" />
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
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {language === 'fi' ? 'Sähköpostiosoite' : 'Email Address'}
                      </label>
                      <Input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder={language === 'fi' ? 'esim. matti.virtanen@koulu.fi' : 'e.g. john.doe@school.com'}
                        className="w-full h-11 border-gray-300 focus:border-[#003d82] focus:ring-[#003d82]"
                      />
                    </div>
                    <Button
                      onClick={handleForgotPassword}
                      disabled={isLoading}
                      className="w-full h-11 bg-[#003d82] hover:bg-[#0052a3] text-white font-semibold"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {language === 'fi' ? 'Lähetetään...' : 'Sending...'}
                        </span>
                      ) : (
                        language === 'fi' ? 'Lähetä palautuslinkki' : 'Send Reset Link'
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
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
          </div>
        </div>

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
      </div>
    );
  }

  // If logged in, redirect to appropriate page
  return null;
}
