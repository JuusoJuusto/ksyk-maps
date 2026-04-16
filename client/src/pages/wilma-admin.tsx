import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnhancedWilmaUserManager from "@/components/EnhancedWilmaUserManager";
import WilmaAdminLogin from "@/components/WilmaAdminLogin";
import { 
  LogOut, Home, Users, Calendar, BookOpen, GraduationCap, 
  Building, Bell, BarChart3, Settings, Plus, Upload, Download,
  Star, User, Award, TrendingUp, UserCheck, Mail, MapPin,
  Eye, Clock, MessageSquare, Filter, Search, CheckCircle, AlertCircle, Menu
} from "lucide-react";

export default function WilmaAdmin() {
  const [, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('wilma_admin_user');
      const isLoggedIn = localStorage.getItem('wilma_admin_logged_in');
      
      if (storedUser && isLoggedIn === 'true') {
        try {
          const user = JSON.parse(storedUser);
          if (user.role === 'admin' || user.role === 'teacher' || user.role === 'principal' || user.role === 'vice_principal') {
            setCurrentUser(user);
          }
        } catch (err) {
          console.error('Auth check failed:', err);
          localStorage.removeItem('wilma_admin_user');
          localStorage.removeItem('wilma_admin_logged_in');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('wilma_admin_user');
    localStorage.removeItem('wilma_admin_logged_in');
    setLocation('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading Wilma Admin...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <WilmaAdminLogin onLoginSuccess={() => window.location.reload()} />;
  }

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'principal';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header - Mobile Responsive */}
      <div className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
                <GraduationCap className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0" />
                <span className="truncate">Wilma {isAdmin ? 'Admin' : 'Teacher'}</span>
              </h1>
              <p className="text-blue-100 mt-1 flex items-center gap-2 text-xs md:text-base">
                <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                <span className="truncate">{currentUser.firstName} {currentUser.lastName} • {isAdmin ? 'Administrator' : 'Teacher'}</span>
              </p>
            </div>
            <div className="flex gap-2 md:gap-3 ml-2">
              <Button onClick={() => setLocation('/')} className="bg-white/20 hover:bg-white/30 text-white h-8 md:h-10 px-2 md:px-4" size="sm">
                <Home className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Home</span>
              </Button>
              <Button onClick={handleLogout} className="bg-red-500/80 hover:bg-red-600 text-white h-8 md:h-10 px-2 md:px-4" size="sm">
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard - Mobile Responsive */}
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs md:text-sm font-medium">Total Students</p>
                  <p className="text-2xl md:text-3xl font-bold mt-1">0</p>
                </div>
                <Users className="w-8 h-8 md:w-12 md:h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs md:text-sm font-medium">Total Teachers</p>
                  <p className="text-2xl md:text-3xl font-bold mt-1">0</p>
                </div>
                <GraduationCap className="w-8 h-8 md:w-12 md:h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs md:text-sm font-medium">Active Classes</p>
                  <p className="text-2xl md:text-3xl font-bold mt-1">0</p>
                </div>
                <BookOpen className="w-8 h-8 md:w-12 md:h-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-xs md:text-sm font-medium">Total Courses</p>
                  <p className="text-2xl md:text-3xl font-bold mt-1">0</p>
                </div>
                <Award className="w-8 h-8 md:w-12 md:h-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - Mobile Responsive */}
        <Card className="mb-4 md:mb-6 border-2 border-blue-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Star className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
              <Button className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2 bg-blue-600 hover:bg-blue-700 text-xs md:text-sm">
                <Plus className="w-4 h-4 md:w-6 md:h-6" />
                <span className="text-[10px] md:text-xs">Add User</span>
              </Button>
              <Button className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2 bg-green-600 hover:bg-green-700 text-xs md:text-sm">
                <Calendar className="w-4 h-4 md:w-6 md:h-6" />
                <span className="text-[10px] md:text-xs">Schedule</span>
              </Button>
              <Button className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2 bg-purple-600 hover:bg-purple-700 text-xs md:text-sm">
                <BookOpen className="w-4 h-4 md:w-6 md:h-6" />
                <span className="text-[10px] md:text-xs">Course</span>
              </Button>
              <Button className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2 bg-orange-600 hover:bg-orange-700 text-xs md:text-sm">
                <Bell className="w-4 h-4 md:w-6 md:h-6" />
                <span className="text-[10px] md:text-xs">Announce</span>
              </Button>
              <Button className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2 bg-pink-600 hover:bg-pink-700 text-xs md:text-sm">
                <Upload className="w-4 h-4 md:w-6 md:h-6" />
                <span className="text-[10px] md:text-xs">Upload</span>
              </Button>
              <Button className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs md:text-sm">
                <Download className="w-4 h-4 md:w-6 md:h-6" />
                <span className="text-[10px] md:text-xs">Export</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs - Mobile Responsive */}
        <Tabs defaultValue="users" className="space-y-4 md:space-y-6">
          <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-1 md:gap-2 bg-white p-1 md:p-2 rounded-lg shadow-lg border-2 border-blue-100 w-full">
            <TabsTrigger value="users" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-3">
              <Users className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-3">
              <Calendar className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-3">
              <BookOpen className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Courses</span>
            </TabsTrigger>
            <TabsTrigger value="teachers" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-3">
              <GraduationCap className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Teachers</span>
            </TabsTrigger>
            <TabsTrigger value="rooms" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-3">
              <Building className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Rooms</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-3">
              <Bell className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Announce</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-3">
              <BarChart3 className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-3">
              <Settings className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <EnhancedWilmaUserManager />
          </TabsContent>

          <TabsContent value="schedule">
            <Card className="border-2 border-green-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Schedule Management
                </CardTitle>
                <CardDescription>Create and manage class schedules</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Schedule
                    </Button>
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Import CSV
                    </Button>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
                    <Calendar className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg font-medium">Schedule management coming soon...</p>
                    <p className="text-gray-500 text-sm mt-2">Bulk schedule creation, conflict detection, and more!</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses">
            <Card className="border-2 border-purple-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  Course Management
                </CardTitle>
                <CardDescription>Manage courses and enrollments</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Course
                    </Button>
                    <Button variant="outline">
                      <Search className="w-4 h-4 mr-2" />
                      Search Courses
                    </Button>
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 text-center">
                    <BookOpen className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg font-medium">Course catalog coming soon...</p>
                    <p className="text-gray-500 text-sm mt-2">Create courses, manage enrollments, and track progress!</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teachers">
            <Card className="border-2 border-orange-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-orange-600" />
                  Teacher Directory
                </CardTitle>
                <CardDescription>Manage teacher profiles and assignments</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Button className="bg-orange-600 hover:bg-orange-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Teacher
                    </Button>
                    <Button variant="outline">
                      <Mail className="w-4 h-4 mr-2" />
                      Send Email
                    </Button>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export List
                    </Button>
                  </div>
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 text-center">
                    <GraduationCap className="w-16 h-16 text-orange-600 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg font-medium">Teacher management coming soon...</p>
                    <p className="text-gray-500 text-sm mt-2">Manage profiles, schedules, and performance!</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rooms">
            <Card className="border-2 border-pink-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50">
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-pink-600" />
                  Room Directory
                </CardTitle>
                <CardDescription>Manage rooms and facilities</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Button className="bg-pink-600 hover:bg-pink-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Room
                    </Button>
                    <Button variant="outline">
                      <MapPin className="w-4 h-4 mr-2" />
                      View on Map
                    </Button>
                    <Button variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Availability
                    </Button>
                  </div>
                  <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-6 text-center">
                    <Building className="w-16 h-16 text-pink-600 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg font-medium">Room management coming soon...</p>
                    <p className="text-gray-500 text-sm mt-2">Track rooms, equipment, and bookings!</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <Card className="border-2 border-indigo-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-600" />
                  Announcements
                </CardTitle>
                <CardDescription>Create and manage school announcements</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="w-4 h-4 mr-2" />
                      New Announcement
                    </Button>
                    <Button variant="outline">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Broadcast
                    </Button>
                    <Button variant="outline">
                      <Clock className="w-4 h-4 mr-2" />
                      Schedule
                    </Button>
                  </div>
                  <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-6 text-center">
                    <Bell className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg font-medium">Announcement system coming soon...</p>
                    <p className="text-gray-500 text-sm mt-2">Send targeted messages to students, teachers, and parents!</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="border-2 border-cyan-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-cyan-50 to-teal-50">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-600" />
                  Analytics & Reports
                </CardTitle>
                <CardDescription>View insights and generate reports</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                      <CardContent className="p-4">
                        <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
                        <p className="text-sm font-medium text-gray-700">Performance Trends</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">+12%</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                      <CardContent className="p-4">
                        <UserCheck className="w-8 h-8 text-green-600 mb-2" />
                        <p className="text-sm font-medium text-gray-700">Attendance Rate</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">94.5%</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                      <CardContent className="p-4">
                        <Award className="w-8 h-8 text-purple-600 mb-2" />
                        <p className="text-sm font-medium text-gray-700">Average Grade</p>
                        <p className="text-2xl font-bold text-purple-600 mt-1">8.2</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="bg-cyan-50 border-2 border-cyan-200 rounded-lg p-6 text-center">
                    <BarChart3 className="w-16 h-16 text-cyan-600 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg font-medium">Advanced analytics coming soon...</p>
                    <p className="text-gray-500 text-sm mt-2">Detailed reports, charts, and insights!</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  System Settings
                </CardTitle>
                <CardDescription>Configure Wilma system settings</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-2 border-blue-200">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                          General Settings
                        </h3>
                        <p className="text-sm text-gray-600">School name, academic year, terms</p>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-green-200">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <Mail className="w-5 h-5 text-green-600" />
                          Email Settings
                        </h3>
                        <p className="text-sm text-gray-600">SMTP configuration, templates</p>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-purple-200">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <Bell className="w-5 h-5 text-purple-600" />
                          Notifications
                        </h3>
                        <p className="text-sm text-gray-600">Push notifications, alerts</p>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-orange-200">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                          Security
                        </h3>
                        <p className="text-sm text-gray-600">Password policies, 2FA</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-center">
                    <Settings className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg font-medium">Settings panel coming soon...</p>
                    <p className="text-gray-500 text-sm mt-2">Configure all system settings in one place!</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
