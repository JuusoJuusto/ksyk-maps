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
    <div className="min-h-screen bg-gray-100">
      <AnnouncementBanner />
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Wilma Header - Classic Blue */}
        <div className="mb-6 bg-[#0066cc] rounded-lg shadow-md p-6 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-[#0066cc]" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold mb-1">{studentData.name}</h1>
                <p className="text-blue-100">Class {studentData.class} • ID: {studentData.studentId}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button className="bg-white text-[#0066cc] hover:bg-blue-50">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
                <Badge className="ml-2 bg-red-500 text-white">3</Badge>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-[#0066cc] bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Average Grade</p>
                  <p className="text-2xl font-bold text-[#0066cc]">9.0</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#0066cc]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-600 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Attendance</p>
                  <p className="text-2xl font-bold text-green-600">{attendance.percentage}%</p>
                </div>
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-600 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Tasks</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {assignments.filter(a => a.status === 'pending').length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Unread Messages</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {messages.filter(m => m.unread).length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 bg-white border border-gray-200">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#0066cc] data-[state=active]:text-white">
              <GraduationCap className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-[#0066cc] data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="grades" className="data-[state=active]:bg-[#0066cc] data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Grades
            </TabsTrigger>
            <TabsTrigger value="assignments" className="data-[state=active]:bg-[#0066cc] data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-[#0066cc] data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Today's Schedule */}
              <Card className="bg-white border border-gray-200">
                <CardHeader className="bg-[#0066cc] text-white">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5" />
                    Today's Schedule
                  </CardTitle>
                  <CardDescription className="text-blue-100">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {upcomingClasses.map((cls, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200 hover:bg-blue-50 transition-colors">
                        <div className={`w-1 h-14 ${cls.color} rounded`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-gray-900">{cls.subject}</h4>
                            <Badge variant="outline" className="text-xs">{cls.time}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{cls.room} • {cls.teacher}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Messages */}
              <Card className="bg-white border border-gray-200">
                <CardHeader className="bg-[#0066cc] text-white">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="w-5 h-5" />
                    Recent Messages
                  </CardTitle>
                  <CardDescription className="text-blue-100">
                    {messages.filter(m => m.unread).length} unread messages
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {messages.map((msg, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded border ${msg.unread ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'} hover:shadow-sm transition-shadow cursor-pointer`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#0066cc] rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-gray-900">{msg.from}</h4>
                              <p className="text-sm text-gray-600">{msg.subject}</p>
                            </div>
                          </div>
                          {msg.unread && (
                            <Badge className="bg-[#0066cc] text-xs">New</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 ml-10">{msg.date}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Assignments */}
            <Card className="bg-white border border-gray-200">
              <CardHeader className="bg-[#0066cc] text-white">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5" />
                  Upcoming Assignments
                </CardTitle>
                <CardDescription className="text-blue-100">
                  {assignments.filter(a => a.status === 'pending').length} pending assignments
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {assignments.filter(a => a.status === 'pending').map((assignment, index) => (
                    <div key={index} className="p-4 bg-white rounded border border-gray-200 hover:border-[#0066cc] hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between mb-2">
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
                        <Button size="sm" className="bg-[#0066cc] hover:bg-[#0052a3] text-white">
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
            <Card className="bg-white border border-gray-200">
              <CardHeader className="bg-[#0066cc] text-white">
                <CardTitle className="text-lg">Weekly Schedule</CardTitle>
                <CardDescription className="text-blue-100">Your complete class schedule</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {upcomingClasses.map((cls, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 bg-white rounded border border-gray-200 hover:border-[#0066cc] hover:shadow-sm transition-all">
                      <div className={`w-1 h-16 ${cls.color} rounded`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{cls.subject}</h3>
                          <Badge className="bg-[#0066cc]">{cls.time}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{cls.room}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{cls.teacher}</span>
                          </div>
                        </div>
                      </div>
                      <Button className="bg-[#0066cc] hover:bg-[#0052a3]">
                        Details
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grades Tab */}
          <TabsContent value="grades">
            <Card className="bg-white border border-gray-200">
              <CardHeader className="bg-[#0066cc] text-white">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="w-5 h-5" />
                  Academic Performance
                </CardTitle>
                <CardDescription className="text-blue-100">Your grades and progress</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grades.map((grade, index) => (
                    <div key={index} className="p-4 bg-white rounded border-2 border-gray-200 hover:border-[#0066cc] hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">{grade.subject}</h3>
                        {grade.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500" />}
                        {grade.trend === 'down' && <TrendingUp className="w-5 h-5 text-red-500 rotate-180" />}
                        {grade.trend === 'stable' && <div className="w-5 h-0.5 bg-gray-400" />}
                      </div>
                      <div className="flex items-end gap-2 mb-2">
                        <span className="text-4xl font-bold text-[#0066cc]">{grade.grade}</span>
                        <span className="text-gray-500 mb-1">/10</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="text-gray-600">Class avg:</span>
                        <span className="font-semibold text-gray-700">{grade.average}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-[#0066cc]"
                          style={{ width: `${(grade.grade / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments">
            <Card className="bg-white border border-gray-200">
              <CardHeader className="bg-[#0066cc] text-white">
                <CardTitle className="text-lg">All Assignments</CardTitle>
                <CardDescription className="text-blue-100">Track your homework and projects</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {assignments.map((assignment, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded border-2 ${
                        assignment.status === 'completed' 
                          ? 'bg-green-50 border-green-300' 
                          : 'bg-white border-gray-200 hover:border-[#0066cc]'
                      } hover:shadow-sm transition-all`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-bold text-gray-900">{assignment.title}</h3>
                            {assignment.status === 'completed' && (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{assignment.subject}</p>
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
                              {assignment.priority}
                            </Badge>
                          </div>
                        </div>
                        <Button 
                          className={
                            assignment.status === 'completed'
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-[#0066cc] hover:bg-[#0052a3]'
                          }
                        >
                          {assignment.status === 'completed' ? 'View' : 'Submit'}
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
            <Card className="bg-white border border-gray-200">
              <CardHeader className="bg-[#0066cc] text-white">
                <CardTitle className="text-lg">Messages</CardTitle>
                <CardDescription className="text-blue-100">Communication with teachers and staff</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {messages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded border-2 ${
                        msg.unread 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'bg-white border-gray-200'
                      } hover:shadow-sm transition-all cursor-pointer`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-[#0066cc] rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-gray-900">{msg.from}</h3>
                            {msg.unread && (
                              <Badge className="bg-[#0066cc]">Unread</Badge>
                            )}
                          </div>
                          <p className="text-gray-700 font-medium mb-1">{msg.subject}</p>
                          <p className="text-sm text-gray-500">{msg.date}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
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
