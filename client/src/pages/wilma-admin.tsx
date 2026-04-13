import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WilmaUserManager from "@/components/WilmaUserManager";
import { 
  LogOut, Home, Users, Calendar, BookOpen, GraduationCap, 
  Building, Bell, BarChart3, Settings, Plus, Upload, Download,
  Star, User, Award, TrendingUp, UserCheck, Mail, MapPin,
  Eye, Clock, MessageSquare, Filter, Search, CheckCircle, AlertCircle
} from "lucide-react";

export default function WilmaAdmin() {
  const [, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('wilma_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role !== 'admin' && user.role !== 'teacher') {
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

  const handleLogout = () => {
    localStorage.removeItem('wilma_user');
    setLocation('/');
  };

  if (!currentUser) {
    return null;
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <GraduationCap className="w-8 h-8" />
                Wilma {isAdmin ? 'Admin' : 'Teacher'} Panel
              </h1>
              <p className="text-blue-100 mt-1 flex items-center gap-2">
                <User className="w-4 h-4" />
                {currentUser.firstName} {currentUser.lastName} • {isAdmin ? 'Administrator' : 'Teacher'}
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setLocation('/')} className="bg-white/20 hover:bg-white/30 text-white">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button onClick={handleLogout} className="bg-red-500/80 hover:bg-red-600 text-white">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Students</p>
                  <p className="text-3xl font-bold mt-1">0</p>
                </div>
                <Users className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Teachers</p>
                  <p className="text-3xl font-bold mt-1">0</p>
                </div>
                <GraduationCap className="w-12 h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Active Classes</p>
                  <p className="text-3xl font-bold mt-1">0</p>
                </div>
                <BookOpen className="w-12 h-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Total Courses</p>
                  <p className="text-3xl font-bold mt-1">0</p>
                </div>
                <Award className="w-12 h-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-6 border-2 border-blue-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Button className="h-auto py-4 flex-col gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-6 h-6" />
                <span className="text-xs">Add User</span>
              </Button>
              <Button className="h-auto py-4 flex-col gap-2 bg-green-600 hover:bg-green-700">
                <Calendar className="w-6 h-6" />
                <span className="text-xs">Create Schedule</span>
              </Button>
              <Button className="h-auto py-4 flex-col gap-2 bg-purple-600 hover:bg-purple-700">
                <BookOpen className="w-6 h-6" />
                <span className="text-xs">New Course</span>
              </Button>
              <Button className="h-auto py-4 flex-col gap-2 bg-orange-600 hover:bg-orange-700">
                <Bell className="w-6 h-6" />
                <span className="text-xs">Send Announcement</span>
              </Button>
              <Button className="h-auto py-4 flex-col gap-2 bg-pink-600 hover:bg-pink-700">
                <Upload className="w-6 h-6" />
                <span className="text-xs">Upload Materials</span>
              </Button>
              <Button className="h-auto py-4 flex-col gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Download className="w-6 h-6" />
                <span className="text-xs">Export Data</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2 bg-white p-2 rounded-lg shadow-lg border-2 border-blue-100">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Courses</span>
            </TabsTrigger>
            <TabsTrigger value="teachers" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Teachers</span>
            </TabsTrigger>
            <TabsTrigger value="rooms" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline">Rooms</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Announcements</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <WilmaUserManager />
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
                      <Eye className="w-4 h-4" mr-2" />
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
      </main>
    </div>
  );
}
