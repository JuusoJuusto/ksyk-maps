import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  Target, 
  Flame, 
  Star, 
  Trophy, 
  TrendingUp, 
  Play, 
  ChevronRight,
  Award,
  Clock,
  CheckCircle,
  BookOpen,
  Code,
  Sparkles,
  Calendar,
  Gift,
  Users
} from "lucide-react";

interface CodingDashboardProps {
  userStats: any;
  userProgress: any[];
  courses: any[];
  language: 'fi' | 'en';
  currentUser: any;
  onNavigate: (section: string, data?: any) => void;
}

export default function CodingDashboard({
  userStats,
  userProgress,
  courses,
  language,
  currentUser,
  onNavigate
}: CodingDashboardProps) {
  const t = (fi: string, en: string) => language === 'fi' ? fi : en;
  const nextLevelXP = (userStats.level || 1) * 500;
  
  // Get current course in progress
  const currentProgress = userProgress.find(p => p.progressPercentage < 100 && p.progressPercentage > 0);
  const currentCourse = currentProgress ? courses.find(c => c.id === currentProgress.courseId) : null;
  
  // Daily challenge (mock for now)
  const dailyChallenge = {
    title: t('Listan käsittely', 'List Manipulation'),
    difficulty: t('Keskitaso', 'Medium'),
    xp: 50,
    timeLeft: '23h 45m'
  };
  
  // Recent achievements (mock)
  const recentAchievements = [
    { icon: '🏆', name: t('Ensimmäinen harjoitus', 'First Exercise'), date: t('Tänään', 'Today') },
    { icon: '🔥', name: t('7 päivän putki', '7-Day Streak'), date: t('Eilen', 'Yesterday') },
    { icon: '⭐', name: t('100 XP ansaittu', '100 XP Earned'), date: t('2 päivää sitten', '2 days ago') }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Welcome Card with Animation */}
        <Card className="border-2 border-blue-600 bg-gradient-to-br from-blue-50 to-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full -mr-32 -mt-32 opacity-50" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t(`Tervetuloa takaisin, ${currentUser?.firstName}!`, `Welcome back, ${currentUser?.firstName}!`)}
                </h2>
                <p className="text-gray-600">
                  {t('Jatka oppimista siitä mihin jäit', 'Continue learning where you left off')}
                </p>
              </div>
            </div>
            
            {currentCourse && (
              <div className="mt-4 p-4 bg-white rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">
                    {t('Jatka kurssia', 'Continue Course')}
                  </span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {currentProgress.progressPercentage}% {t('valmis', 'complete')}
                  </Badge>
                </div>
                <h3 className="font-bold text-lg mb-2">
                  {currentCourse.title?.[language] || currentCourse.title}
                </h3>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${currentProgress.progressPercentage}%` }}
                  />
                </div>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => onNavigate('courses', { courseId: currentCourse.id })}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {t('Jatka oppimista', 'Continue Learning')}
                </Button>
              </div>
            )}
            
            {!currentCourse && (
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
                onClick={() => onNavigate('courses')}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                {t('Selaa kursseja', 'Browse Courses')}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Daily Challenge */}
        <Card className="border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                <CardTitle>{t('Päivän haaste', 'Daily Challenge')}</CardTitle>
              </div>
              <Badge className="bg-yellow-100 text-yellow-800">
                <Clock className="w-3 h-3 mr-1" />
                {dailyChallenge.timeLeft}
              </Badge>
            </div>
            <CardDescription>
              {t('Ratkaise päivän koodaushaaste ja ansaitse bonusta XP!', 'Solve today\'s coding challenge and earn bonus XP!')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{dailyChallenge.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{dailyChallenge.difficulty}</Badge>
                  <span className="text-sm text-gray-600">+{dailyChallenge.xp} XP</span>
                </div>
              </div>
              <Button className="bg-yellow-600 hover:bg-yellow-700">
                <Target className="w-4 h-4 mr-2" />
                {t('Aloita', 'Start')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{userStats.coursesCompleted || 0}</div>
              <div className="text-xs text-gray-600">{t('Kurssit', 'Courses')}</div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{userStats.lessonsCompleted || 0}</div>
              <div className="text-xs text-gray-600">{t('Oppitunnit', 'Lessons')}</div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Code className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{userStats.exercisesCompleted || 0}</div>
              <div className="text-xs text-gray-600">{t('Harjoitukset', 'Exercises')}</div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Flame className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{userStats.streak || 0}</div>
              <div className="text-xs text-gray-600">{t('Päivää', 'Days')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              {t('Viimeisimmät saavutukset', 'Recent Achievements')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAchievements.map((achievement, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="text-3xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{achievement.name}</div>
                    <div className="text-sm text-gray-600">{achievement.date}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              {t('Näytä kaikki saavutukset', 'View All Achievements')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Stats & Info */}
      <div className="space-y-6">
        {/* Level Progress Card */}
        <Card className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-600" />
              {t('Taso', 'Level')} {userStats.level || 1}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                <span className="text-4xl font-bold text-white">{userStats.level || 1}</span>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {userStats.totalXp || 0} / {nextLevelXP} XP
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-purple-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${((userStats.totalXp || 0) / nextLevelXP) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {nextLevelXP - (userStats.totalXp || 0)} XP {t('seuraavaan tasoon', 'to next level')}
              </div>
            </div>
            
            <div className="pt-4 border-t space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t('Sijoitus', 'Rank')}</span>
                <span className="font-semibold">#{userStats.rank || '-'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t('Putki', 'Streak')}</span>
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold">{userStats.streak || 0} {t('päivää', 'days')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learning Streak Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              {t('Oppimisputki', 'Learning Streak')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 28 }).map((_, i) => {
                const isActive = i >= 28 - (userStats.streak || 0);
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded ${
                      isActive ? 'bg-orange-500' : 'bg-gray-200'
                    } transition-colors`}
                    title={`Day ${i + 1}`}
                  />
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-3 text-center">
              {t('Pidä putki yllä oppimalla joka päivä!', 'Keep your streak by learning every day!')}
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              {t('Pika-toiminnot', 'Quick Actions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('practice')}>
              <Code className="w-4 h-4 mr-2" />
              {t('Harjoittele koodia', 'Practice Coding')}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('compete')}>
              <Trophy className="w-4 h-4 mr-2" />
              {t('Kilpaile', 'Compete')}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('classroom')}>
              <Users className="w-4 h-4 mr-2" />
              {t('Liity luokkaan', 'Join Classroom')}
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Gift className="w-4 h-4 mr-2" />
              {t('Lunasta palkinto', 'Redeem Reward')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
