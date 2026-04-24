import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EnhancedWilmaUserManager from "@/components/EnhancedWilmaUserManager";
import PeopleManager from "@/components/PeopleManager";
import WilmaHomeTab from "@/components/WilmaHomeTab";
import EnhancedMessageSystem from "@/components/EnhancedMessageSystem";
import ScheduleManager from "@/components/ScheduleManager";
import WilmaSettingsManager from "@/components/WilmaSettingsManager";
import TeacherDirectory from "@/components/TeacherDirectory";
import ClassesManager from "@/components/ClassesManager";
import WilmaStyleAttendance from "@/components/WilmaStyleAttendance";
import CourseManager from "@/components/CourseManager";
import AnnouncementManager from "@/components/AnnouncementManager";
import ScheduleBuilder from "@/components/ScheduleBuilder";
import WilmaTimetable from "@/components/WilmaTimetable";
import WilmaGrades from "@/components/WilmaGrades";
import WilmaAttendanceTracker from "@/components/WilmaAttendanceTracker";
import WilmaHomework from "@/components/WilmaHomework";
import WilmaLessonJournal from "@/components/WilmaLessonJournal";
import WilmaSupportTab from "@/components/WilmaSupportTab";
import WilmaLunchMenu from "@/components/WilmaLunchMenu";
import AdminHomeworkManager from "@/components/AdminHomeworkManager";
import { 
  LogOut, Home, Users, Calendar, BookOpen, GraduationCap, 
  Building, Bell, BarChart3, Settings, User, UserCheck, 
  MessageSquare, FileText, Search, Menu, Award, TrendingUp, UtensilsCrossed
} from "lucide-react";

export default function WilmaAdminNew() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma-admin/:adminId?/:section?');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(params?.section || 'home');

  useEffect(() => {
    if (params?.section) {
      setActiveSection(params.section);
    }
  }, [params?.section]);

  useEffect(() => {
    // Only run auth check ONCE on initial mount
    const checkAuth = () => {
      const storedUser = localStorage.getItem('wilma_user');
      
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          const roles = user.roles || [user.role];
          const hasAccess = roles.some((r: string) => 
            ['admin', 'teacher', 'principal', 'vice_principal'].includes(r)
          );
          
          if (hasAccess) {
            setCurrentUser(user);
            
            // Only redirect if adminId is missing or wrong
            if (!params?.adminId) {
              const returnPath = params?.section || 'home';
              setLocation(`/wilma-admin/${user.id}/${returnPath}`);
            } else if (params.adminId !== user.id) {
              const returnPath = params.section || 'home';
              setLocation(`/wilma-admin/${user.id}/${returnPath}`);
            }
          } else {
            const returnPath = params?.section || 'home';
            localStorage.setItem('wilma_return_path', `/wilma-admin/${params?.adminId || 'unknown'}/${returnPath}`);
            setLocation('/wilma');
          }
        } catch (err) {
          console.error('Auth check failed:', err);
          const returnPath = params?.section || 'home';
          localStorage.setItem('wilma_return_path', `/wilma-admin/${params?.adminId || 'unknown'}/${returnPath}`);
          setLocation('/wilma');
        }
      } else {
        const returnPath = params?.section || 'home';
        localStorage.setItem('wilma_return_path', `/wilma-admin/${params?.adminId || 'unknown'}/${returnPath}`);
        setLocation('/wilma');
      }
      setIsLoading(false);
    };

    // CRITICAL FIX: Only run on initial mount, never again
    checkAuth();
  }, []); // Empty dependency array - runs ONCE on mount only

  const handleLogout = async () => {
    // Save current location as return path
    const currentPath = window.location.pathname;
    localStorage.setItem('wilma_return_path', currentPath);
    
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('wilma_user');
      setLocation('/wilma?session=expired');
    }
  };

  const navigateTo = (section: string) => {
    setActiveSection(section);
    setLocation(`/wilma-admin/${currentUser.id}/${section}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Ladataan Wilmaa...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const roles = currentUser.roles || [currentUser.role];
  const isAdmin = roles.includes('admin') || roles.includes('principal');

  const navigationItems = [
    { id: 'home', label: 'Etusivu', icon: Home },
    { id: 'schedule', label: 'Lukujärjestys', icon: Calendar },
    { id: 'students', label: 'Oppilaat', icon: Users, adminOnly: true },
    { id: 'staff', label: 'Henkilökunta', icon: GraduationCap, adminOnly: true },
    { id: 'classes', label: 'Luokat', icon: Users, adminOnly: true },
    { id: 'courses', label: 'Kurssit', icon: BookOpen },
    { id: 'homework', label: 'Tehtävät', icon: FileText },
    { id: 'messages', label: 'Viestit', icon: MessageSquare },
    { id: 'lunch', label: 'Lounas', icon: UtensilsCrossed },
    { id: 'reports', label: 'Raportit', icon: TrendingUp },
    { id: 'support', label: 'Tuki', icon: MessageSquare },
    { id: 'settings', label: 'Asetukset', icon: Settings },
  ];

  const filteredNavItems = navigationItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.teacherOnly && !roles.includes('teacher') && !isAdmin) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5f5] to-[#e8e8e8] overflow-x-hidden pb-20 md:pb-0">
      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <aside className={`hidden md:flex fixed left-0 top-0 h-screen bg-white border-r border-[#dddddd] transition-all duration-300 z-30 flex-col shadow-lg ${
        sidebarOpen ? 'w-64' : 'w-16'
      }`}>
        {/* Logo & Brand */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-[#dddddd] flex-shrink-0 bg-gradient-to-r from-[#003d82] to-[#0052a3]">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <GraduationCap className="w-4 h-4 text-[#003d82]" />
                </div>
                <span className="font-bold text-base text-white tracking-wide">Wilma</span>
              </div>
              <Button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-md transition-all duration-200"
                variant="ghost"
                size="sm"
              >
                <Menu className="w-4 h-4 text-white" />
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 hover:bg-white/20 rounded-md mx-auto transition-all duration-200"
              variant="ghost"
              size="sm"
            >
              <Menu className="w-4 h-4 text-white" />
            </Button>
          )}
        </div>

        {/* User Info */}
        <div className={`px-3 py-3 border-b border-[#dddddd] flex-shrink-0 bg-gradient-to-br from-blue-50 to-indigo-50 ${!sidebarOpen && 'hidden'}`}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-[#003d82] to-[#0052a3] rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
              {currentUser.firstName[0]}{currentUser.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {currentUser.firstName} {currentUser.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {isAdmin ? 'Ylläpitäjä' : 'Opettaja'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-[#e8f0fe] to-[#d3e3fd] text-[#003d82] border-r-3 border-[#003d82] shadow-sm'
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:text-[#003d82]'
                } ${!sidebarOpen && 'justify-center px-2'}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                {sidebarOpen && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
                {isActive && sidebarOpen && (
                  <div className="w-1.5 h-1.5 bg-[#003d82] rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-[#dddddd] flex-shrink-0 bg-gradient-to-br from-red-50 to-pink-50">
          <Button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-100 hover:text-red-700 rounded-md transition-all duration-200 border border-transparent hover:border-red-200 hover:shadow-md ${
              !sidebarOpen && 'justify-center px-2'
            }`}
            variant="ghost"
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span className="font-semibold">Kirjaudu ulos</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 min-h-screen ${sidebarOpen ? 'md:ml-64' : 'md:ml-16'}`}>
        {/* Top Bar - Desktop */}
        <header className="hidden md:flex h-14 bg-gradient-to-r from-[#003d82] to-[#0052a3] border-b border-[#002d5f] items-center justify-between px-4 md:px-6 shadow-md">
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-bold text-white truncate flex items-center gap-2">
              {filteredNavItems.find(item => item.id === activeSection)?.label || 'Wilma'}
              <span className="text-xs font-normal text-white/70 hidden md:inline">
                • {new Date().toLocaleDateString('fi-FI', { weekday: 'short' })}
              </span>
            </h1>
            <p className="text-xs text-white/70 hidden md:block truncate">
              {new Date().toLocaleDateString('fi-FI', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="relative hover:bg-white/20 p-2 rounded-md transition-all duration-200">
              <Bell className="w-4 h-4 text-white" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </Button>
            <Button variant="ghost" size="sm" className="hover:bg-white/20 p-2 rounded-md hidden md:flex transition-all duration-200">
              <Search className="w-4 h-4 text-white" />
            </Button>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white shadow-lg">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <GraduationCap className="w-5 h-5 text-[#003d82]" />
              </div>
              <div>
                <p className="text-sm font-bold">Wilma</p>
                <p className="text-xs text-blue-100">{currentUser.firstName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="relative hover:bg-white/20 p-2 rounded-md">
                <Bell className="w-5 h-5 text-white" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </Button>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 p-2 rounded-md"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area - Responsive Padding */}
        <div className="p-3 md:p-4 lg:p-6 max-w-full overflow-x-hidden animate-fadeIn">
          {activeSection === 'home' && <WilmaHomeTab userRole={currentUser.role} userRoles={roles} />}
          {activeSection === 'schedule' && (
            <div className="space-y-4">
              {isAdmin ? (
                <ScheduleBuilder />
              ) : (
                <WilmaTimetable />
              )}
            </div>
          )}
          {activeSection === 'students' && <PeopleManager />}
          {activeSection === 'staff' && <EnhancedWilmaUserManager />}
          {activeSection === 'classes' && <ClassesManager />}
          {activeSection === 'courses' && <CourseManager />}
          {activeSection === 'homework' && <AdminHomeworkManager />}
          {activeSection === 'messages' && <EnhancedMessageSystem />}
          {activeSection === 'lunch' && <WilmaLunchMenu />}
          {activeSection === 'support' && <WilmaSupportTab />}
          {activeSection === 'settings' && (
            <Card className="shadow-lg border-[#dddddd] animate-slideUp">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-[#dddddd]">
                <CardTitle className="text-[#003d82] flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Asetukset
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-8 h-8 text-[#003d82]" />
                  </div>
                  <p className="text-gray-600 font-medium">Asetukset-ominaisuus tulossa pian...</p>
                  <p className="text-sm text-gray-400 mt-2">Tämä ominaisuus on kehitteillä</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#dddddd] shadow-2xl z-40">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {[
            { id: 'home', label: 'Koti', icon: Home },
            { id: 'students', label: 'Oppilaat', icon: Users },
            { id: 'staff', label: 'Henkilöstö', icon: GraduationCap },
            { id: 'messages', label: 'Viestit', icon: MessageSquare },
            { id: 'settings', label: 'Asetukset', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-br from-[#003d82] to-[#0052a3] text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                <span className={`text-[10px] font-medium truncate w-full text-center ${
                  isActive ? 'text-white' : 'text-gray-600'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
