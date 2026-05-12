import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  BookOpen, 
  TrendingUp, 
  Clock, 
  Bell,
  CheckCircle,
  AlertCircle,
  Award,
  Users,
  MessageSquare,
  FileText,
  BarChart3,
  Zap,
  Target,
  Star,
  ChevronRight,
  Plus
} from 'lucide-react';

interface ModernWilmaDashboardProps {
  user: any;
  language: 'fi' | 'en';
  onNavigate: (section: string) => void;
}

export default function ModernWilmaDashboard({ user, language, onNavigate }: ModernWilmaDashboardProps) {
  const t = (fi: string, en: string) => language === 'fi' ? fi : en;
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Load dashboard data
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    // TODO: Replace with real API calls
    setUpcomingClasses([
      { 
        subject: t('Matematiikka', 'Mathematics'),
        time: '09:00',
        room: t('Luokka 301', 'Room 301'),
        teacher: 'Virtanen',
        status: 'upcoming'
      },
      { 
        subject: t('Englanti', 'English'),
        time: '10:45',
        room: t('Luokka 205', 'Room 205'),
        teacher: 'Mäkinen',
        status: 'upcoming'
      }
    ]);

    setRecentGrades([
      { subject: t('Matematiikka', 'Mathematics'), grade: 9, date: '2026-05-10', trend: 'up' },
      { subject: t('Fysiikka', 'Physics'), grade: 8, date: '2026-05-09', trend: 'stable' },
      { subject: t('Englanti', 'English'), grade: 10, date: '2026-05-08', trend: 'up' }
    ]);

    setPendingAssignments([
      { 
        title: t('Matematiikan kotitehtävät', 'Math Homework'),
        subject: t('Matematiikka', 'Mathematics'),
        due: '2026-05-15',
        priority: 'high'
      },
      { 
        title: t('Englannin essee', 'English Essay'),
        subject: t('Englanti', 'English'),
        due: '2026-05-18',
        priority: 'medium'
      }
    ]);

    setUnreadMessages(3);

    setNotifications([
      {
        type: 'grade',
        message: t('Uusi arvosana: Matematiikka 9', 'New grade: Mathematics 9'),
        time: '10 min sitten',
        icon: Award
      },
      {
        type: 'assignment',
        message: t('Uusi tehtävä: Englannin essee', 'New assignment: English Essay'),
        time: '1h sitten',
        icon: FileText
      }
    ]);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return t('Hyvää huomenta', 'Good morning');
    if (hour < 18) return t('Hyvää päivää', 'Good afternoon');
    return t('Hyvää iltaa', 'Good evening');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === 'fi' ? 'fi-FI' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {getGreeting()}, {user?.firstName}! 👋
            </h1>
            <p className="text-blue-100 text-lg">
              {formatDate(currentTime)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold">
              {currentTime.toLocaleTimeString(language === 'fi' ? 'fi-FI' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('schedule')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('Seuraava tunti', 'Next Class')}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {upcomingClasses[0]?.time || '--:--'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('grades')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('Keskiarvo', 'Average')}</p>
                <p className="text-2xl font-bold text-green-600">8.7</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('assignments')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('Tehtäviä', 'Assignments')}</p>
                <p className="text-2xl font-bold text-orange-600">{pendingAssignments.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('messages')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('Viestit', 'Messages')}</p>
                <p className="text-2xl font-bold text-purple-600">{unreadMessages}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  {t('Tänään', 'Today')}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('schedule')}>
                  {t('Näytä kaikki', 'View all')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingClasses.map((cls, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-center min-w-[60px]">
                      <div className="text-lg font-bold text-blue-600">{cls.time}</div>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{cls.subject}</div>
                      <div className="text-sm text-gray-600">
                        {cls.teacher} • {cls.room}
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {t('Tulossa', 'Upcoming')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Assignments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  {t('Tehtävät', 'Assignments')}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('assignments')}>
                  {t('Näytä kaikki', 'View all')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingAssignments.map((assignment, index) => {
                  const daysLeft = getDaysUntilDue(assignment.due);
                  const isUrgent = daysLeft <= 2;
                  
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 ${
                        isUrgent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
                      } hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{assignment.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{assignment.subject}</div>
                        </div>
                        <div className="text-right">
                          <Badge className={isUrgent ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
                            {daysLeft === 0 ? t('Tänään!', 'Today!') : 
                             daysLeft === 1 ? t('Huomenna', 'Tomorrow') :
                             `${daysLeft} ${t('päivää', 'days')}`}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Grades */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  {t('Viimeisimmät arvosanat', 'Recent Grades')}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('grades')}>
                  {t('Näytä kaikki', 'View all')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentGrades.map((grade, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-xl font-bold text-green-600">{grade.grade}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{grade.subject}</div>
                        <div className="text-sm text-gray-600">{grade.date}</div>
                      </div>
                    </div>
                    {grade.trend === 'up' && (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                {t('Ilmoitukset', 'Notifications')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.map((notification, index) => {
                  const Icon = notification.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-600 mt-1">{notification.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button variant="outline" className="w-full mt-4" size="sm">
                {t('Näytä kaikki', 'View all')}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                {t('Pika-toiminnot', 'Quick Actions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => onNavigate('messages')}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {t('Uusi viesti', 'New Message')}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => onNavigate('absence')}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                {t('Ilmoita poissaolo', 'Report Absence')}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => onNavigate('schedule')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                {t('Lukujärjestys', 'Schedule')}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => onNavigate('learn-coding')}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                {t('Koodausplatformi', 'Coding Platform')}
              </Button>
            </CardContent>
          </Card>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                {t('Edistyminen', 'Progress')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('Läsnäolo', 'Attendance')}</span>
                  <span className="text-sm font-bold text-green-600">95%</span>
                </div>
                <Progress value={95} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('Tehtävät', 'Assignments')}</span>
                  <span className="text-sm font-bold text-blue-600">87%</span>
                </div>
                <Progress value={87} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('Osallistuminen', 'Participation')}</span>
                  <span className="text-sm font-bold text-purple-600">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
