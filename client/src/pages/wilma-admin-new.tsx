import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EnhancedWilmaUserManager from "@/components/EnhancedWilmaUserManager";
import PeopleManager from "@/components/PeopleManager";
import WilmaHomeTabEnhanced from "@/components/WilmaHomeTabEnhanced";
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
import WilmaAdminSettings from "@/components/WilmaAdminSettings";
import AdminHomeworkManager from "@/components/AdminHomeworkManager";
import NotificationCenter from "@/components/NotificationCenter";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    { id: 'settings', label: 'Asetukset', icon: Settings, adminOnly: true },
  ];

  const filteredNavItems = navigationItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.teacherOnly && !roles.includes('teacher') && !isAdmin) return false;
    return true;
  });

  // Get current section label safely
  const currentSectionLabel = filteredNavItems.find(item => item.id === activeSection)?.label || 'Wilma';

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
                  <img src="/ksykmaps_logo.png" alt="KSYK" className="w-4 h-4" />
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
              {currentSectionLabel}
              <span className="text-xs font-normal text-white/70 hidden md:inline">
                • {new Date().toLocaleDateString('fi-FI', { weekday: 'short' })}
              </span>
            </h1>
            <p className="text-xs text-white/70 hidden md:block truncate">
              {new Date().toLocaleDateString('fi-FI', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <NotificationCenter userId={currentUser.id} />
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
                <img src="/ksykmaps_logo.png" alt="KSYK" className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Wilma</p>
                <p className="text-xs text-blue-100">{currentUser.firstName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter userId={currentUser.id} />
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
          {activeSection === 'home' && (
            <WilmaHomeTabEnhanced 
              userRole={currentUser.role} 
              userRoles={roles}
              userId={currentUser.id}
              userName={`${currentUser.firstName} ${currentUser.lastName}`}
            />
          )}
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
          {activeSection === 'reports' && <AnalyticsDashboard />}
          {activeSection === 'settings' && <WilmaAdminSettings />}
        </div>
      </main>

      {/* Mobile Bottom Navigation - Improved with Hamburger Menu */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#dddddd] shadow-2xl z-40">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {[
            { id: 'home', label: 'Koti', icon: Home },
            { id: 'students', label: 'Oppilaat', icon: Users },
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
          
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 text-gray-600 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5 mb-1 text-gray-600" />
            <span className="text-[10px] font-medium truncate w-full text-center text-gray-600">
              Lisää
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Modal */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Valikko</h3>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="px-4 py-4 space-y-2">
              {[
                { id: 'staff', label: 'Henkilöstö', icon: GraduationCap, desc: 'Hallinnoi henkilökuntaa' },
                { id: 'schedule', label: 'Lukujärjestys', icon: Calendar, desc: 'Katso ja muokkaa aikatauluja' },
                { id: 'attendance', label: 'Läsnäolot', icon: UserCheck, desc: 'Tarkastele läsnäoloja' },
                { id: 'grades', label: 'Arvosanat', icon: Award, desc: 'Hallinnoi arvosanoja' },
                { id: 'homework', label: 'Tehtävät', icon: FileText, desc: 'Tarkastele tehtäviä' },
                { id: 'lunch', label: 'Lounas', icon: UtensilsCrossed, desc: 'Lounasruokalista' },
                { id: 'analytics', label: 'Analytiikka', icon: BarChart3, desc: 'Tilastot ja raportit' },
                { id: 'notifications', label: 'Ilmoitukset', icon: Bell, desc: 'Järjestelmäilmoitukset' },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigateTo(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white shadow-lg'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className={`p-3 rounded-lg ${
                      isActive ? 'bg-white/20' : 'bg-white'
                    }`}>
                      <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-[#003d82]'}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                        {item.label}
                      </p>
                      <p className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                        {item.desc}
                      </p>
                    </div>
                    {isActive && (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
              
              {/* Logout Button */}
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all mt-4"
              >
                <div className="p-3 rounded-lg bg-white">
                  <LogOut className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">Kirjaudu ulos</p>
                  <p className="text-xs text-red-500">Poistu järjestelmästä</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
