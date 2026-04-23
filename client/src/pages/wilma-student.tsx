import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import WilmaHomeTab from "@/components/WilmaHomeTab";
import WilmaTimetable from "@/components/WilmaTimetable";
import WilmaGrades from "@/components/WilmaGrades";
import WilmaAttendanceTracker from "@/components/WilmaAttendanceTracker";
import WilmaHomework from "@/components/WilmaHomework";
import EnhancedMessageSystem from "@/components/EnhancedMessageSystem";
import { 
  LogOut, Home, Calendar, Award, UserCheck, FileText, MessageSquare, 
  Menu, Bell, Search, GraduationCap
} from "lucide-react";

export default function WilmaStudent() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma/:studentId/:section?');
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
          
          if (user.role === 'student') {
            setCurrentUser(user);
            
            if (!params?.studentId) {
              const returnPath = params?.section || 'home';
              setLocation(`/wilma/${user.studentId}/${returnPath}`);
            }
          } else {
            // Redirect non-students
            if (user.role === 'admin' || user.role === 'teacher') {
              setLocation('/wilma-admin');
            } else {
              setLocation('/wilma');
            }
          }
        } catch (err) {
          console.error('Auth check failed:', err);
          setLocation('/wilma');
        }
      } else {
        setLocation('/wilma');
      }
      setIsLoading(false);
    };

    if (isLoading) {
      checkAuth();
    }
  }, [params?.studentId]);

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
    setLocation(`/wilma/${currentUser.studentId}/${section}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#003d82] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Ladataan Wilmaa...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const navigationItems = [
    { id: 'home', label: 'Etusivu', icon: Home },
    { id: 'schedule', label: 'Lukujärjestys', icon: Calendar },
    { id: 'grades', label: 'Arvosanat', icon: Award },
    { id: 'attendance', label: 'Poissaolot', icon: UserCheck },
    { id: 'homework', label: 'Tehtävät', icon: FileText },
    { id: 'messages', label: 'Viestit', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f5] overflow-x-hidden">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen bg-white border-r border-[#dddddd] transition-all duration-300 z-50 flex flex-col ${
        sidebarOpen ? 'w-64' : 'w-16'
      } md:${sidebarOpen ? 'w-64' : 'w-20'}`}>
        {/* Logo & Brand */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-[#dddddd] flex-shrink-0 bg-[#003d82]">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-white rounded flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-[#003d82]" />
                </div>
                <span className="font-bold text-base text-white">Wilma</span>
              </div>
              <Button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded"
                variant="ghost"
                size="sm"
              >
                <Menu className="w-4 h-4 text-white" />
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 hover:bg-white/10 rounded mx-auto"
              variant="ghost"
              size="sm"
            >
              <Menu className="w-4 h-4 text-white" />
            </Button>
          )}
        </div>

        {/* User Info */}
        <div className={`px-3 py-3 border-b border-[#dddddd] flex-shrink-0 ${!sidebarOpen && 'hidden'}`}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#003d82] rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {currentUser.firstName[0]}{currentUser.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {currentUser.firstName} {currentUser.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">Opiskelija</p>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors relative ${
                  isActive
                    ? 'bg-[#e8f0fe] text-[#003d82] border-r-2 border-[#003d82]'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-[#003d82]'
                } ${!sidebarOpen && 'justify-center px-2'}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-[#dddddd] flex-shrink-0">
          <Button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors ${
              !sidebarOpen && 'justify-center px-2'
            }`}
            variant="ghost"
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span>Kirjaudu ulos</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 min-h-screen ${sidebarOpen ? 'ml-64' : 'ml-16'} md:${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Bar */}
        <header className="h-14 bg-[#003d82] border-b border-[#002d5f] flex items-center justify-between px-4 md:px-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-bold text-white truncate">
              {navigationItems.find(item => item.id === activeSection)?.label || 'Wilma'}
            </h1>
            <p className="text-xs text-white/70 hidden md:block truncate">
              {new Date().toLocaleDateString('fi-FI', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="relative hover:bg-white/10 p-2">
              <Bell className="w-4 h-4 text-white" />
            </Button>
            <Button variant="ghost" size="sm" className="hover:bg-white/10 p-2 hidden md:flex">
              <Search className="w-4 h-4 text-white" />
            </Button>
          </div>
        </header>

        {/* Content Area - Responsive Padding */}
        <div className="p-3 md:p-4 lg:p-6 max-w-full overflow-x-hidden">
          {activeSection === 'home' && <WilmaHomeTab userRole="student" userRoles={['student']} />}
          {activeSection === 'schedule' && <WilmaTimetable />}
          {activeSection === 'grades' && <WilmaGrades />}
          {activeSection === 'attendance' && <WilmaAttendanceTracker />}
          {activeSection === 'homework' && <WilmaHomework />}
          {activeSection === 'messages' && <EnhancedMessageSystem />}
        </div>
      </main>
    </div>
  );
}
