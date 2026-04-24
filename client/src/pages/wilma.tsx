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
      <div className="min-h-screen bg-[#f5f5f5]">
        {/* Classic Wilma Blue Header */}
        <div className="bg-[#003d82] text-white py-3 px-4 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <span className="text-[#003d82] font-bold text-lg">W</span>
              </div>
              <h1 className="text-xl font-semibold">Wilma</h1>
            </div>
            <div className="text-sm">
              <a href="https://ksyk.fi" target="_blank" rel="noopener noreferrer" className="hover:underline">
                ksyk.fi
              </a>
            </div>
          </div>
        </div>

        {/* Login Content */}
        <div className="max-w-md mx-auto mt-16 px-4">
          {/* Login Box */}
          <div className="bg-white border border-gray-300 rounded shadow-sm">
            {/* Header */}
            <div className="bg-gradient-to-b from-[#e8f0fe] to-[#d3e3fd] border-b border-gray-300 px-4 py-3">
              <h2 className="text-lg font-semibold text-[#003d82]">Kirjaudu sisään</h2>
            </div>

            {/* Form */}
            <div className="p-6">
              {!showForgotPassword ? (
                <>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Käyttäjätunnus
                      </label>
                      <Input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Käyttäjätunnus" 
                        required 
                        disabled={isLoading} 
                        className="w-full border-gray-300 focus:border-[#003d82] focus:ring-[#003d82]" 
                        autoComplete="username" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Salasana
                      </label>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"}
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Salasana" 
                          required 
                          disabled={isLoading} 
                          className="w-full border-gray-300 focus:border-[#003d82] focus:ring-[#003d82] pr-10" 
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

                    {loginError && (
                      <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
                        {loginError}
                      </div>
                    )}

                    {sessionExpiredMessage && (
                      <div className="bg-orange-50 border border-orange-300 text-orange-700 px-3 py-2 rounded text-sm">
                        {sessionExpiredMessage}
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full bg-[#003d82] hover:bg-[#0052a3] text-white font-medium" 
                      disabled={isLoading}
                    >
                      {isLoading ? 'Kirjaudutaan...' : 'Kirjaudu'}
                    </Button>
                  </form>

                  <div className="mt-4 text-center">
                    <button 
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-[#003d82] hover:underline"
                    >
                      Unohditko salasanan?
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="text-[#003d82] hover:underline text-sm mb-4"
                  >
                    ← Takaisin kirjautumiseen
                  </button>
                  
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Palauta salasana
                    </h3>
                    <p className="text-sm text-gray-600">
                      Syötä sähköpostiosoitteesi, niin lähetämme sinulle linkin salasanan palauttamiseen.
                    </p>
                  </div>

                  {!resetSuccess ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sähköpostiosoite
                        </label>
                        <Input
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="esim. matti.virtanen@koulu.fi"
                          className="w-full border-gray-300 focus:border-[#003d82] focus:ring-[#003d82]"
                        />
                      </div>
                      <Button
                        onClick={handleForgotPassword}
                        disabled={isLoading}
                        className="w-full bg-[#003d82] hover:bg-[#0052a3] text-white font-medium"
                      >
                        {isLoading ? 'Lähetetään...' : 'Lähetä palautuslinkki'}
                      </Button>
                    </>
                  ) : (
                    <div className="bg-green-50 border border-green-300 rounded p-4 text-center">
                      <p className="text-green-800 font-semibold">
                        Palautuslinkki lähetetty!
                      </p>
                      <p className="text-sm text-green-700 mt-2">
                        Tarkista sähköpostisi ja seuraa ohjeita.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4">
            <p className="text-sm text-blue-800">
              <strong>Huom!</strong> Eikö sinulla ole tunnuksia? Ota yhteyttä ylläpitäjään.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-600">
            <p>© 2026 Wilma by SL Studio • Kaikki oikeudet pidätetään</p>
          </div>
        </div>

        {/* Password Change Dialog */}
        {showPasswordChangeDialog && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded shadow-lg w-full max-w-md border border-gray-300">
              <div className="bg-gradient-to-b from-[#e8f0fe] to-[#d3e3fd] border-b border-gray-300 px-4 py-3">
                <h3 className="text-lg font-semibold text-[#003d82]">Vaihda salasana</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Sinun on vaihdettava väliaikainen salasanasi jatkaaksesi.
                </p>
              </div>
              <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Uusi salasana
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Vähintään 6 merkkiä"
                    className="w-full border-gray-300 focus:border-[#003d82] focus:ring-[#003d82]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vahvista salasana
                  </label>
                  <Input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Syötä salasana uudelleen"
                    className="w-full border-gray-300 focus:border-[#003d82] focus:ring-[#003d82]"
                    required
                  />
                </div>
                {passwordChangeError && (
                  <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
                    {passwordChangeError}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowPasswordChangeDialog(false);
                      setNewPassword('');
                      setConfirmNewPassword('');
                      setPasswordChangeError('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Peruuta
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#003d82] hover:bg-[#0052a3] text-white"
                  >
                    Vaihda salasana
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If logged in, redirect to appropriate page
  return null;
}
