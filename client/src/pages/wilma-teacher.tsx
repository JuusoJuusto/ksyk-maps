import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, FileText, MessageSquare, Home, BarChart3, Bell, LogOut, User,
  Users, UserCheck, GraduationCap, ClipboardList, BookOpen, Settings
} from 'lucide-react';

export default function WilmaTeacher() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma/teacher/:teacherId/:section?');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('dashboard');

  useEffect(() => {
    const storedUser = localStorage.getItem('wilma_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role !== 'teacher') {
          setLocation('/wilma');
          return;
        }
        setCurrentUser(user);
      } catch {
        setLocation('/wilma');
      }
    } else {
      setLocation('/wilma');
    }
  }, []);

  useEffect(() => {
    if (match && params?.section) {
      setActiveSection(params.section);
    } else if (match) {
      setActiveSection('dashboard');
    }
  }, [match, params]);

  const handleLogout = () => {
    localStorage.removeItem('wilma_user');
    setLocation('/');
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    if (currentUser?.id) {
      setLocation(`/wilma/teacher/${currentUser.id}/${section === 'dashboard' ? '' : section}`);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <div className="bg-[#003d82] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Wilma - Teacher Portal</h1>
              <p className="text-sm text-blue-200 mt-1">
                <User className="w-4 h-4 inline mr-1" />
                {currentUser.firstName} {currentUser.lastName} • Teacher
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <Badge className="bg-red-500 text-white ml-1">5</Badge>
              </button>
              <button onClick={() => setLocation('/')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-2">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </button>
              <button onClick={handleLogout}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-[#0052a3] border-b-2 border-[#003d82] shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', icon: Home, label: 'Dashboard' },
              { id: 'classes', icon: Users, label: 'My Classes' },
              { id: 'schedule', icon: Calendar, label: 'Schedule' },
              { id: 'grades', icon: BarChart3, label: 'Grade Book' },
              { id: 'assignments', icon: FileText, label: 'Assignments' },
              { id: 'attendance', icon: UserCheck, label: 'Attendance' },
              { id: 'messages', icon: MessageSquare, label: 'Messages' },
              { id: 'exams', icon: ClipboardList, label: 'Exams' },
              { id: 'materials', icon: BookOpen, label: 'Materials' },
              { id: 'settings', icon: Settings, label: 'Settings' },
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Card>
          <CardHeader className="bg-[#e8f0f8] border-b border-gray-300">
            <CardTitle className="text-xl text-gray-800">
              {activeSection === 'dashboard' && 'Teacher Dashboard'}
              {activeSection === 'classes' && 'My Classes'}
              {activeSection === 'schedule' && 'My Schedule'}
              {activeSection === 'grades' && 'Grade Book'}
              {activeSection === 'assignments' && 'Assignments'}
              {activeSection === 'attendance' && 'Attendance'}
              {activeSection === 'messages' && 'Messages'}
              {activeSection === 'exams' && 'Exams'}
              {activeSection === 'materials' && 'Study Materials'}
              {activeSection === 'settings' && 'Settings'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {activeSection === 'dashboard' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Welcome, {currentUser.firstName}!
                  </h2>
                  <p className="text-gray-600">Teacher Portal - Manage your classes, grades, and more</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <Users className="w-8 h-8 text-green-600" />
                        <span className="text-3xl font-bold text-green-700">5</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">Active Classes</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <FileText className="w-8 h-8 text-blue-600" />
                        <span className="text-3xl font-bold text-blue-700">12</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">Pending Assignments</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <MessageSquare className="w-8 h-8 text-purple-600" />
                        <span className="text-3xl font-bold text-purple-700">8</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700">Unread Messages</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Today's Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Your schedule for today will appear here...</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection !== 'dashboard' && (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">
                  {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} section coming soon...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
