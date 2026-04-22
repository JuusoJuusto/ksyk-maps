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
import { 
  LogOut, Home, Users, Calendar, BookOpen, GraduationCap, 
  Building, Bell, BarChart3, Settings, User, UserCheck, 
  MessageSquare, FileText, Search, Menu, Award, TrendingUp
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
            if (params?.adminId && params.adminId !== user.id) {
              const returnPath = params.section || 'home';
              setLocation(`/wilma-admin/${user.id}/${returnPath}`);
              return;
            }
            
            setCurrentUser(user);
            
            if (!params?.adminId) {
              const returnPath = params?.section || 'home';
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

    checkAuth();
  }, [params?.adminId, params?.section]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('wilma_user');
      setLocation('/wilma');
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
    { id: 'grades', label: 'Arvosanat', icon: Award },
    { id: 'attendance', label: 'Poissaolot', icon: UserCheck },
    { id: 'homework', label: 'Tehtävät', icon: FileText },
    { id: 'messages', label: 'Viestit', icon: MessageSquare, badge: 2 },
    { id: 'journal', label: 'Tuntipäiväkirja', icon: FileText, teacherOnly: true },
    { id: 'students', label: 'Opiskelijat', icon: Users, adminOnly: true },
    { id: 'staff', label: 'Henkilökunta', icon: GraduationCap, adminOnly: true },
    { id: 'teachers', label: 'Opettajat', icon: GraduationCap, adminOnly: true },
    { id: 'classes', label: 'Luokat', icon: Users, adminOnly: true },
    { id: 'courses', label: 'Kurssit', icon: BookOpen },
    { id: 'rooms', label: 'Tilat', icon: Building, adminOnly: true },
    { id: 'announcements', label: 'Ilmoitukset', icon: Bell },
    { id: 'analytics', label: 'Analytiikka', icon: BarChart3, adminOnly: true },
    { id: 'reports', label: 'Raportit', icon: TrendingUp, adminOnly: true },
    { id: 'settings', label: 'Asetukset', icon: Settings },
  ];

  const filteredNavItems = navigationItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.teacherOnly && !roles.includes('teacher') && !isAdmin) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-50 flex flex-col ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}>
        {/* Logo & Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg text-gray-900">Wilma</span>
              </div>
              <Button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                variant="ghost"
                size="sm"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg mx-auto"
              variant="ghost"
              size="sm"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* User Info */}
        <div className={`px-4 py-4 border-b border-gray-200 flex-shrink-0 ${!sidebarOpen && 'hidden'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {currentUser.firstName[0]}{currentUser.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {currentUser.firstName} {currentUser.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {isAdmin ? 'Ylläpitäjä' : 'Opettaja'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto py-4">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-r-3 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                } ${!sidebarOpen && 'justify-center'}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <Button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${
              !sidebarOpen && 'justify-center'
            }`}
            variant="ghost"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Kirjaudu ulos</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {filteredNavItems.find(item => item.id === activeSection)?.label || 'Wilma'}
            </h1>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('fi-FI', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
            <Button variant="ghost" size="sm">
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Content Area - Full Width */}
        <div className="p-6">
          {activeSection === 'home' && <WilmaHomeTab userRole={currentUser.role} userRoles={roles} />}
          {activeSection === 'staff' && <EnhancedWilmaUserManager />}
          {activeSection === 'students' && <PeopleManager />}
          {activeSection === 'messages' && <EnhancedMessageSystem />}
          {activeSection === 'schedule' && <ScheduleManager />}
          {activeSection === 'teachers' && <TeacherDirectory />}
          {activeSection === 'classes' && <ClassesManager />}
          {activeSection === 'courses' && <CourseManager />}
          {activeSection === 'attendance' && <WilmaStyleAttendance />}
          {activeSection === 'announcements' && <AnnouncementManager />}
          {activeSection === 'settings' && <WilmaSettingsManager />}
          
          {/* Placeholder for new features */}
          {activeSection === 'grades' && (
            <Card>
              <CardHeader>
                <CardTitle>Arvosanat</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Arvosanat-ominaisuus tulossa pian...</p>
              </CardContent>
            </Card>
          )}
          
          {activeSection === 'homework' && (
            <Card>
              <CardHeader>
                <CardTitle>Tehtävät</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Tehtävät-ominaisuus tulossa pian...</p>
              </CardContent>
            </Card>
          )}
          
          {activeSection === 'journal' && (
            <Card>
              <CardHeader>
                <CardTitle>Tuntipäiväkirja</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Tuntipäiväkirja-ominaisuus tulossa pian...</p>
              </CardContent>
            </Card>
          )}
          
          {activeSection === 'rooms' && (
            <Card>
              <CardHeader>
                <CardTitle>Tilat</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Tilat-ominaisuus tulossa pian...</p>
              </CardContent>
            </Card>
          )}
          
          {activeSection === 'analytics' && (
            <Card>
              <CardHeader>
                <CardTitle>Analytiikka</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Analytiikka-ominaisuus tulossa pian...</p>
              </CardContent>
            </Card>
          )}
          
          {activeSection === 'reports' && (
            <Card>
              <CardHeader>
                <CardTitle>Raportit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Raportit-ominaisuus tulossa pian...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
