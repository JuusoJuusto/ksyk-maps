import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeEditor from "@/components/CodeEditor";
import CoursesPage from "@/components/CoursesPage";
import ClassroomPage from "@/components/ClassroomPage";
import { 
  Code, 
  BookOpen, 
  Trophy, 
  Users, 
  Zap, 
  Target,
  Flame,
  Star,
  Award,
  TrendingUp,
  Calendar,
  Play,
  ChevronRight,
  Globe,
  Sparkles,
  Rocket,
  Brain,
  GraduationCap,
  Home,
  Settings,
  LogOut,
  Medal,
  Gift
} from "lucide-react";

export default function LearnCoding() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute('/learn-coding/:section?');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [language, setLanguage] = useState<'fi' | 'en'>('fi');
  const [activeSection, setActiveSection] = useState(params?.section || 'dashboard');

  useEffect(() => {
    // Check if user is logged in (from Wilma)
    const wilmaUser = localStorage.getItem('wilma_user');
    if (wilmaUser) {
      const user = JSON.parse(wilmaUser);
      setCurrentUser(user);
    }
  }, []);

  useEffect(() => {
    if (params?.section) {
      setActiveSection(params.section);
    }
  }, [params?.section]);

  const t = (fi: string, en: string) => language === 'fi' ? fi : en;

  // Mock user stats (will be fetched from API)
  const userStats = {
    xp: 1250,
    level: 5,
    streak: 7,
    coursesCompleted: 2,
    lessonsCompleted: 24,
    exercisesCompleted: 156,
    rank: 42,
    nextLevelXP: 1500
  };

  const handleLogout = () => {
    setLocation('/wilma');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Code className="w-8 h-8 text-purple-600" />
              {t('Koodausplatformi', 'Coding Platform')}
            </CardTitle>
            <CardDescription>
              {t('Kirjaudu sisään Wilman kautta', 'Log in through Wilma')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setLocation('/wilma')}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {t('Siirry Wilmaan', 'Go to Wilma')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Code className="w-8 h-8" />
                <div>
                  <h1 className="text-xl font-bold">
                    {t('Koodausplatformi', 'Coding Platform')}
                  </h1>
                  <p className="text-sm text-white/80">
                    {t('Opi koodaamaan interaktiivisesti', 'Learn to code interactively')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Language Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguage(language === 'fi' ? 'en' : 'fi')}
                className="text-white hover:bg-white/20"
              >
                <Globe className="w-4 h-4 mr-2" />
                {language === 'fi' ? 'EN' : 'FI'}
              </Button>

              {/* User Stats */}
              <div className="hidden md:flex items-center gap-4 bg-white/10 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-300" />
                  <span className="font-bold">{userStats.streak}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-300" />
                  <span className="font-bold">{userStats.xp} XP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-300" />
                  <span className="font-bold">{t('Taso', 'Level')} {userStats.level}</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white hover:bg-white/20"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeSection} onValueChange={(value) => {
          setActiveSection(value);
          setLocation(`/learn-coding/${value}`);
        }}>
          <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-white/50 backdrop-blur-sm p-2 rounded-xl mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Etusivu', 'Dashboard')}</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Kurssit', 'Courses')}</span>
            </TabsTrigger>
            <TabsTrigger value="practice" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Harjoittele', 'Practice')}</span>
            </TabsTrigger>
            <TabsTrigger value="classroom" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Luokka', 'Classroom')}</span>
            </TabsTrigger>
            <TabsTrigger value="compete" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Kilpaile', 'Compete')}</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Profiili', 'Profile')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Welcome Card */}
                <Card className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-2">
                      {t(`Tervetuloa takaisin, ${currentUser.firstName}!`, `Welcome back, ${currentUser.firstName}!`)}
                    </h2>
                    <p className="text-white/90 mb-4">
                      {t('Jatka oppimista siitä mihin jäit', 'Continue learning where you left off')}
                    </p>
                    <Button className="bg-white text-purple-600 hover:bg-white/90">
                      <Play className="w-4 h-4 mr-2" />
                      {t('Jatka oppimista', 'Continue Learning')}
                    </Button>
                  </CardContent>
                </Card>

                {/* Daily Challenge */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      {t('Päivän haaste', 'Daily Challenge')}
                    </CardTitle>
                    <CardDescription>
                      {t('Ratkaise päivän koodaushaaste ja ansaitse bonusta XP!', 'Solve today\'s coding challenge and earn bonus XP!')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {t('Listan käsittely', 'List Manipulation')}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {t('Keskitaso • 50 XP', 'Medium • 50 XP')}
                          </p>
                        </div>
                        <Button className="bg-yellow-500 hover:bg-yellow-600">
                          <Target className="w-4 h-4 mr-2" />
                          {t('Aloita', 'Start')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Continue Learning */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                      {t('Jatka oppimista', 'Continue Learning')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                          <Code className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">
                            {t('Python perusteet', 'Python Basics')}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {t('Oppitunti 5: Silmukat', 'Lesson 5: Loops')}
                          </p>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }} />
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Stats & Info */}
              <div className="space-y-6">
                {/* Stats Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      {t('Tilastot', 'Statistics')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t('Taso', 'Level')}</span>
                      <span className="font-bold text-lg">{userStats.level}</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">XP</span>
                        <span className="text-sm font-semibold">{userStats.xp} / {userStats.nextLevelXP}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all"
                          style={{ width: `${(userStats.xp / userStats.nextLevelXP) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t('Putki', 'Streak')}</span>
                      <div className="flex items-center gap-1">
                        <Flame className="w-5 h-5 text-orange-500" />
                        <span className="font-bold text-lg">{userStats.streak} {t('päivää', 'days')}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t('Sijoitus', 'Rank')}</span>
                      <span className="font-bold text-lg">#{userStats.rank}</span>
                    </div>
                    <div className="pt-4 border-t space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('Kurssit suoritettu', 'Courses completed')}</span>
                        <span className="font-semibold">{userStats.coursesCompleted}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('Oppitunnit', 'Lessons')}</span>
                        <span className="font-semibold">{userStats.lessonsCompleted}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('Harjoitukset', 'Exercises')}</span>
                        <span className="font-semibold">{userStats.exercisesCompleted}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Achievements */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      {t('Saavutukset', 'Achievements')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="aspect-square bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg flex items-center justify-center">
                          <Trophy className="w-6 h-6 text-amber-600" />
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4">
                      {t('Näytä kaikki', 'View All')}
                    </Button>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-purple-500" />
                      {t('Pika-toiminnot', 'Quick Actions')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Brain className="w-4 h-4 mr-2" />
                      {t('AI-avustaja', 'AI Assistant')}
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      {t('Liity luokkaan', 'Join Classroom')}
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('Uusi projekti', 'New Project')}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <CoursesPage 
              language={language}
              onStartCourse={(courseId) => {
                console.log('Starting course:', courseId);
                // TODO: Navigate to course page
              }}
            />
          </TabsContent>

          {/* Practice Tab */}
          <TabsContent value="practice">
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  {t('Harjoittele', 'Practice')}
                </h2>
                <p className="text-gray-600">
                  {t('Harjoittele koodausta interaktiivisilla tehtävillä', 'Practice coding with interactive exercises')}
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t('Python-harjoitus: Tervehdys', 'Python Exercise: Greeting')}</CardTitle>
                  <CardDescription>
                    {t('Kirjoita ohjelma, joka tulostaa "Hei, maailma!"', 'Write a program that prints "Hello, World!"')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeEditor
                    language={language}
                    initialCode={`# ${t('Kirjoita koodisi tähän', 'Write your code here')}\nprint("${t('Hei, maailma!', 'Hello, World!')}")`}
                    testCases={[
                      { input: '', expectedOutput: t('Hei, maailma!', 'Hello, World!') }
                    ]}
                    showTests={true}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Classroom Tab */}
          <TabsContent value="classroom">
            <ClassroomPage 
              language={language}
              userRole={currentUser?.role || 'student'}
            />
          </TabsContent>

          {/* Compete Tab */}
          <TabsContent value="compete">
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  {t('Kilpailut', 'Competitions')}
                </h2>
                <p className="text-gray-600">
                  {t('Osallistu viikottaisiin koodaushaasteisiin', 'Participate in weekly coding challenges')}
                </p>
              </div>

              {/* Weekly Competition */}
              <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Trophy className="w-8 h-8" />
                    <div>
                      <h3 className="text-2xl font-bold">
                        {t('Viikon kilpailu', 'Weekly Competition')}
                      </h3>
                      <p className="text-white/90">
                        {t('Päättyy 3 päivän kuluttua', 'Ends in 3 days')}
                      </p>
                    </div>
                  </div>
                  <Button className="bg-white text-orange-600 hover:bg-white/90">
                    <Play className="w-4 h-4 mr-2" />
                    {t('Osallistu nyt', 'Participate Now')}
                  </Button>
                </CardContent>
              </Card>

              {/* Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Medal className="w-5 h-5 text-amber-500" />
                    {t('Tulostaulukko', 'Leaderboard')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { rank: 1, name: 'Mikko V.', xp: 2450, avatar: '🥇' },
                      { rank: 2, name: 'Emma K.', xp: 2380, avatar: '🥈' },
                      { rank: 3, name: 'Ville M.', xp: 2210, avatar: '🥉' },
                      { rank: 4, name: 'Sofia N.', xp: 2100, avatar: '👤' },
                      { rank: 5, name: 'Joonas L.', xp: 2050, avatar: '👤' },
                    ].map((user) => (
                      <div key={user.rank} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{user.avatar}</span>
                          <div>
                            <p className="font-semibold">{user.name}</p>
                            <p className="text-sm text-gray-600">{user.xp} XP</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-gray-400">#{user.rank}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  {t('Profiili', 'Profile')}
                </h2>
                <p className="text-gray-600">
                  {t('Hallinnoi profiiliasi ja asetuksiasi', 'Manage your profile and settings')}
                </p>
              </div>

              {/* Profile Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                      {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{currentUser?.firstName} {currentUser?.lastName}</h3>
                      <p className="text-gray-600">{currentUser?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-3xl font-bold text-purple-600">{userStats.level}</p>
                      <p className="text-sm text-gray-600">{t('Taso', 'Level')}</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-3xl font-bold text-blue-600">{userStats.xp}</p>
                      <p className="text-sm text-gray-600">XP</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-3xl font-bold text-orange-600">{userStats.streak}</p>
                      <p className="text-sm text-gray-600">{t('Putki', 'Streak')}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-3xl font-bold text-green-600">#{userStats.rank}</p>
                      <p className="text-sm text-gray-600">{t('Sijoitus', 'Rank')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-500" />
                    {t('Saavutukset', 'Achievements')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {[
                      { icon: '🏆', name: t('Ensimmäinen kurssi', 'First Course'), unlocked: true },
                      { icon: '🔥', name: t('7 päivän putki', '7 Day Streak'), unlocked: true },
                      { icon: '⭐', name: t('100 XP', '100 XP'), unlocked: true },
                      { icon: '💯', name: t('Täydelliset pisteet', 'Perfect Score'), unlocked: true },
                      { icon: '🎯', name: t('10 tehtävää', '10 Exercises'), unlocked: true },
                      { icon: '🚀', name: t('Taso 5', 'Level 5'), unlocked: true },
                      { icon: '👥', name: t('Liittyi luokkaan', 'Joined Class'), unlocked: false },
                      { icon: '📚', name: t('Kurssi suoritettu', 'Course Complete'), unlocked: false },
                      { icon: '🏅', name: t('Kilpailun voitto', 'Competition Win'), unlocked: false },
                    ].map((achievement, index) => (
                      <div
                        key={index}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center p-3 ${
                          achievement.unlocked
                            ? 'bg-gradient-to-br from-amber-100 to-amber-200'
                            : 'bg-gray-100 opacity-50'
                        }`}
                      >
                        <span className="text-3xl mb-1">{achievement.icon}</span>
                        <span className="text-xs text-center font-semibold">{achievement.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
