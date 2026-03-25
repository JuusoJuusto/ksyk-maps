import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  GraduationCap, 
  MessageSquare, 
  FileText, 
  TrendingUp, 
  Award,
  Bell,
  User,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Star,
  Target,
  BarChart3
} from 'lucide-react';

export default function Wilma() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock student data - in real app this would come from API
  const studentData = {
    name: 'Student Name',
    class: '9A',
    studentId: 'STU2024001',
    email: 'student@ksyk.fi',
    phone: '+358 40 123 4567',
    address: 'Helsinki, Finland',
    profileImage: null
  };

  const upcomingClasses = [
    { time: '08:00 - 08:45', subject: 'Mathematics', room: 'Room 301', teacher: 'Ms. Anderson', color: 'bg-blue-500' },
    { time: '09:00 - 09:45', subject: 'English', room: 'Room 205', teacher: 'Mr. Smith', color: 'bg-green-500' },
    { time: '10:00 - 10:45', subject: 'Physics', room: 'Lab 102', teacher: 'Dr. Johnson', color: 'bg-purple-500' },
    { time: '11:00 - 11:45', subject: 'History', room: 'Room 401', teacher: 'Ms. Brown', color: 'bg-orange-500' },
  ];

  const grades = [
    { subject: 'Mathematics', grade: 9, average: 8.5, trend: 'up', color: 'text-blue-600' },
    { subject: 'English', grade: 10, average: 9.2, trend: 'up', color: 'text-green-600' },
    { subject: 'Physics', grade: 8, average: 7.8, trend: 'down', color: 'text-purple-600' },
    { subject: 'History', grade: 9, average: 8.9, trend: 'up', color: 'text-orange-600' },
    { subject: 'Chemistry', grade: 8, average: 8.1, trend: 'stable', color: 'text-red-600' },
    { subject: 'Biology', grade: 10, average: 9.5, trend: 'up', color: 'text-teal-600' },
  ];

  const assignments = [
    { title: 'Math Homework Chapter 5', subject: 'Mathematics', dueDate: '2024-03-28', status: 'pending', priority: 'high' },
    { title: 'English Essay: Climate Change', subject: 'English', dueDate: '2024-03-30', status: 'pending', priority: 'medium' },
    { title: 'Physics Lab Report', subject: 'Physics', dueDate: '2024-03-26', status: 'completed', priority: 'high' },
    { title: 'History Presentation', subject: 'History', dueDate: '2024-04-02', status: 'pending', priority: 'low' },
  ];

  const messages = [
    { from: 'Ms. Anderson', subject: 'Math Test Results', date: '2024-03-24', unread: true },
    { from: 'Mr. Smith', subject: 'English Assignment Feedback', date: '2024-03-23', unread: true },
    { from: 'School Office', subject: 'Parent-Teacher Meeting', date: '2024-03-22', unread: false },
    { from: 'Dr. Johnson', subject: 'Physics Lab Schedule', date: '2024-03-21', unread: false },
  ];

  const attendance = {
    present: 142,
    absent: 3,
    late: 5,
    percentage: 94.7
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <AnnouncementBanner />
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white/30">
                <User className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1">Welcome back, {studentData.name}!</h1>
                <p className="text-blue-100 text-lg">Class {studentData.class} • Student ID: {studentData.studentId}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
                <Badge className="ml-2 bg-red-500 text-white">3</Badge>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Average Grade</p>
                  <p className="text-3xl font-bold text-blue-600">9.0</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Attendance</p>
                  <p className="text-3xl font-bold text-green-600">{attendance.percentage}%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Tasks</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {assignments.filter(a => a.status === 'pending').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Unread Messages</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {messages.filter(m => m.unread).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-white shadow-md rounded-xl">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3">
              <GraduationCap className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="grades" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3">
              <BarChart3 className="w-4 h-4 mr-2" />
              Grades
            </TabsTrigger>
            <TabsTrigger value="assignments" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3">
              <FileText className="w-4 h-4 mr-2" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3">
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Schedule */}
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Today's Schedule
                  </CardTitle>
                  <CardDescription className="text-blue-100">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {upcomingClasses.map((cls, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className={`w-1 h-16 ${cls.color} rounded-full`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-gray-900">{cls.subject}</h4>
                            <Badge variant="outline">{cls.time}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{cls.room} • {cls.teacher}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Messages */}
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Recent Messages
                  </CardTitle>
                  <CardDescription className="text-purple-100">
                    {messages.filter(m => m.unread).length} unread messages
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {messages.map((msg, index) => (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border-l-4 ${msg.unread ? 'bg-purple-50 border-l-purple-500' : 'bg-gray-50 border-l-gray-300'} hover:shadow-md transition-shadow cursor-pointer`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-purple-700" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{msg.from}</h4>
                              <p className="text-sm text-gray-600">{msg.subject}</p>
                            </div>
                          </div>
                          {msg.unread && (
                            <Badge className="bg-purple-500">New</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{msg.date}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Assignments */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Upcoming Assignments
                </CardTitle>
                <CardDescription className="text-orange-100">
                  {assignments.filter(a => a.status === 'pending').length} pending assignments
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignments.filter(a => a.status === 'pending').map((assignment, index) => (
                    <div key={index} className="p-4 bg-gradient-to-br from-orange-50 to-white rounded-lg border border-orange-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{assignment.title}</h4>
                        <Badge 
                          className={
                            assignment.priority === 'high' ? 'bg-red-500' :
                            assignment.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }
                        >
                          {assignment.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{assignment.subject}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          Due: {assignment.dueDate}
                        </div>
                        <Button size="sm" variant="outline" className="text-orange-600 border-orange-600 hover:bg-orange-50">
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                <CardTitle>Weekly Schedule</CardTitle>
                <CardDescription className="text-blue-100">Your complete class schedule</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {upcomingClasses.map((cls, index) => (
                    <div key={index} className="flex items-center gap-4 p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-lg transition-all">
                      <div className={`w-2 h-20 ${cls.color} rounded-full`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{cls.subject}</h3>
                          <Badge variant="secondary" className="text-lg px-4 py-1">{cls.time}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{cls.room}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{cls.teacher}</span>
                          </div>
                        </div>
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grades Tab */}
          <TabsContent value="grades">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Academic Performance
                </CardTitle>
                <CardDescription className="text-green-100">Your grades and progress</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grades.map((grade, index) => (
                    <div key={index} className="p-6 bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:shadow-xl transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">{grade.subject}</h3>
                        {grade.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500" />}
                        {grade.trend === 'down' && <TrendingUp className="w-5 h-5 text-red-500 rotate-180" />}
                        {grade.trend === 'stable' && <div className="w-5 h-0.5 bg-gray-400" />}
                      </div>
                      <div className="flex items-end gap-2 mb-2">
                        <span className={`text-5xl font-bold ${grade.color}`}>{grade.grade}</span>
                        <span className="text-gray-500 mb-2">/10</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Class avg:</span>
                        <span className="font-semibold text-gray-700">{grade.average}</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${grade.color.replace('text', 'bg')}`}
                            style={{ width: `${(grade.grade / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
                <CardTitle>All Assignments</CardTitle>
                <CardDescription className="text-orange-100">Track your homework and projects</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {assignments.map((assignment, index) => (
                    <div 
                      key={index} 
                      className={`p-6 rounded-xl border-2 ${
                        assignment.status === 'completed' 
                          ? 'bg-green-50 border-green-300' 
                          : 'bg-white border-orange-300'
                      } hover:shadow-lg transition-all`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">{assignment.title}</h3>
                            {assignment.status === 'completed' && (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                          <p className="text-gray-600 mb-2">{assignment.subject}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Due: {assignment.dueDate}
                            </div>
                            <Badge 
                              className={
                                assignment.priority === 'high' ? 'bg-red-500' :
                                assignment.priority === 'medium' ? 'bg-yellow-500' :
                                'bg-green-500'
                              }
                            >
                              {assignment.priority} priority
                            </Badge>
                          </div>
                        </div>
                        <Button 
                          className={
                            assignment.status === 'completed'
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-orange-600 hover:bg-orange-700'
                          }
                        >
                          {assignment.status === 'completed' ? 'View Submission' : 'Submit Work'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
                <CardTitle>Messages</CardTitle>
                <CardDescription className="text-purple-100">Communication with teachers and staff</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {messages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`p-6 rounded-xl border-2 ${
                        msg.unread 
                          ? 'bg-purple-50 border-purple-300' 
                          : 'bg-white border-gray-200'
                      } hover:shadow-lg transition-all cursor-pointer`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-purple-700" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-gray-900">{msg.from}</h3>
                            {msg.unread && (
                              <Badge className="bg-purple-500">Unread</Badge>
                            )}
                          </div>
                          <p className="text-gray-700 font-medium mb-2">{msg.subject}</p>
                          <p className="text-sm text-gray-500">{msg.date}</p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
