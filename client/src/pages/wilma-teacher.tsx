import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WilmaHomeTabEnhanced from "@/components/WilmaHomeTabEnhanced";
import WilmaTimetable from "@/components/WilmaTimetable";
import WilmaGrades from "@/components/WilmaGrades";
import WilmaHomework from "@/components/WilmaHomework";
import WilmaAttendanceTracker from "@/components/WilmaAttendanceTracker";
import WilmaAttendanceCalendar from "@/components/WilmaAttendanceCalendar";
import EnhancedMessageSystem from "@/components/EnhancedMessageSystem";
import WilmaLessonJournal from "@/components/WilmaLessonJournal";
import ClassesManager from "@/components/ClassesManager";
import CourseManager from "@/components/CourseManager";
import EnhancedSubstituteSystem from "@/components/EnhancedSubstituteSystem";
import WilmaSupportTab from "@/components/WilmaSupportTab";
import WilmaLunchMenu from "@/components/WilmaLunchMenu";
import WilmaSettingsTab from "@/components/WilmaSettingsTab";
import WilmaExams from "@/components/WilmaExams";
import WilmaAnnouncements from "@/components/WilmaAnnouncements";
import NotificationCenter from "@/components/NotificationCenter";
import { 
  LogOut, Home, Calendar, Award, FileText, 
  MessageSquare, UserCheck, BookOpen, Settings, Menu, 
  GraduationCap, Users, ClipboardList, UtensilsCrossed, ClipboardCheck, Megaphone
} from "lucide-react";

export default function WilmaTeacher() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma-teacher/:teacherId?');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const storedUser = localStorage.getItem('wilma_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role === 'teacher' || user.role === 'substitute') {
          setCurrentUser(user);
          setIsLoading(false);
        } else {
          setLocation('/wilma');
        }
      } catch (err) {
        setLocation('/wilma');
      }
    } else {
      setLocation('/wilma');
    }
  }, [setLocation]);

  const handleLogout = () => {
    const currentPath = window.location.pathname;
    localStorage.setItem('wilma_return_path', currentPath);
    localStorage.removeItem('wilma_user');
    setLocation('/wilma?session=expired');
  };

  const navigationItems = [
    { id: 'home', label: 'Etusivu', icon: Home },
    { id: 'substitute', label: 'Sijaisuudet', icon: UserCheck },
    { id: 'schedule', label: 'Lukujärjestys', icon: Calendar },
    { id: 'journal', label: 'Tuntipäiväkirja', icon: ClipboardList },
    { id: 'classes', label: 'Luokat', icon: Users },
    { id: 'courses', label: 'Kurssit', icon: BookOpen },
    { id: 'grades', label: 'Arvosanat', icon: Award },
    { id: 'homework', label: 'Tehtävät', icon: FileText },
    { id: 'exams', label: 'Kokeet', icon: ClipboardCheck },
    { id: 'attendance', label: 'Tuntimerkinnät', icon: UserCheck },
    { id: 'messages', label: 'Viestit', icon: MessageSquare },
    { id: 'announcements', label: 'Ilmoitukset', icon: Megaphone },
    { id: 'lunch', label: 'Lounas', icon: UtensilsCrossed },
    { id: 'support', label: 'Tuki', icon: MessageSquare },
    { id: 'settings', label: 'Asetukset', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f5f5] to-[#e8e8e8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#003d82] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Ladataan...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

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
        <div className={`px-3 py-3 border-b border-[#dddddd] flex-shrink-0 bg-gradient-to-br from-green-50 to-emerald-50 ${!sidebarOpen && 'hidden'}`}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
              {currentUser.firstName[0]}{currentUser.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {currentUser.firstName} {currentUser.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                Opettaja • {currentUser.department || 'Ei osastoa'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 mb-1 group ${
                  isActive
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md scale-105'
                    : 'text-gray-700 hover:bg-gray-100 hover:scale-102'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-green-600'}`} />
                {sidebarOpen && (
                  <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-700'}`}>
                    {item.label}
                  </span>
                )}
                {isActive && sidebarOpen && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-[#dddddd] flex-shrink-0">
          <Button
            onClick={handleLogout}
            variant="outline"
            className={`w-full justify-start gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all ${
              !sidebarOpen && 'justify-center'
            }`}
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span className="text-sm font-medium">Kirjaudu ulos</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-16'}`}>
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-40 bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <GraduationCap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Wilma</p>
                <p className="text-xs text-green-100">{currentUser.firstName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter userId={currentUser.id} />
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-3 md:p-4 lg:p-6 max-w-full overflow-x-hidden animate-fadeIn">
          {activeSection === 'home' && <WilmaHomeTabEnhanced userRole="teacher" userRoles={['teacher']} userId={currentUser.id} userName={`${currentUser.firstName} ${currentUser.lastName}`} />}
          {activeSection === 'substitute' && <EnhancedSubstituteSystem />}
          {activeSection === 'schedule' && <WilmaTimetable />}
          {activeSection === 'journal' && <WilmaLessonJournal />}
          {activeSection === 'classes' && <ClassesManager />}
          {activeSection === 'courses' && <CourseManager />}
          {activeSection === 'grades' && <WilmaGrades />}
          {activeSection === 'homework' && <WilmaHomework />}
          {activeSection === 'exams' && <WilmaExams />}
          {activeSection === 'attendance' && <WilmaAttendanceCalendar userRole="teacher" />}
          {activeSection === 'messages' && <EnhancedMessageSystem />}
          {activeSection === 'announcements' && <WilmaAnnouncements />}
          {activeSection === 'lunch' && <WilmaLunchMenu />}
          {activeSection === 'support' && <WilmaSupportTab />}
          {activeSection === 'settings' && <WilmaSettingsTab userRole="teacher" />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#dddddd] shadow-2xl z-40">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {[
            { id: 'home', label: 'Koti', icon: Home },
            { id: 'schedule', label: 'Lukujärjestys', icon: Calendar },
            { id: 'classes', label: 'Luokat', icon: Users },
            { id: 'messages', label: 'Viestit', icon: MessageSquare },
            { id: 'journal', label: 'Päiväkirja', icon: ClipboardList },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-md'
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
