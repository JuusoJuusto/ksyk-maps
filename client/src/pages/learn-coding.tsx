import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CodeEditor from "@/components/CodeEditor";
import ClassroomPage from "@/components/ClassroomPage";
import { allCourses, getCourseById } from "../../../shared/realCourseData";
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
  Play,
  ChevronRight,
  Globe,
  Brain,
  GraduationCap,
  Home,
  LogOut,
  Medal,
  Gift,
  Clock,
  CheckCircle,
  Lock,
  ArrowLeft
} from "lucide-react";

export default function LearnCodingNew() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma/:userId/learn-coding/:section?');
  const [matchAdmin, paramsAdmin] = useRoute('/wilma-admin/:adminId/learn-coding/:section?');
  
  const userId = params?.userId || paramsAdmin?.adminId;
  const isAdmin = !!matchAdmin;
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [language, setLanguage] = useState<'fi' | 'en'>('fi');
  const [activeSection, setActiveSection] = useState(params?.section || paramsAdmin?.section || 'dashboard');

  useEffect(() => {
    const wilmaUser = localStorage.getItem('wilma_user');
    if (wilmaUser) {
      const user = JSON.parse(wilmaUser);
      setCurrentUser(user);
    }
  }, []);

  useEffect(() => {
    const section = params?.section || paramsAdmin?.section;
    if (section) {
      setActiveSection(section);
    }
  }, [params?.section, paramsAdmin?.section]);

  const t = (fi: string, en: string) => language === 'fi' ? fi : en;

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
    const basePath = isAdmin ? `/wilma-admin/${userId}` : `/wilma/${userId}`;
    setLocation(basePath);
  };

  const navigateToSection = (section: string) => {
    setActiveSection(section);
    const basePath = isAdmin ? `/wilma-admin/${userId}` : `/wilma/${userId}`;
    setLocation(`${basePath}/learn-coding/${section}`);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Code className="w-8 h-8 text-blue-600" />
              {t('Koodausplatformi', 'Coding Platform')}
            </CardTitle>
            <CardDescription>
              {t('Kirjaudu sisään Wilman kautta', 'Log in through Wilma')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setLocation('/wilma')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {t('Siirry Wilmaan', 'Go to Wilma')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header - No Gradients */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('Takaisin Wilmaan', 'Back to Wilma')}
              </Button>
              
              <div className="h-8 w-px bg-gray-300" />
              
              <div className="flex items-center gap-2">
                <Code className="w-6 h-6 text-blue-600" />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    {t('Koodausplatformi', 'Coding Platform')}
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Language Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLanguage(language === 'fi' ? 'en' : 'fi')}
              >
                <Globe className="w-4 h-4 mr-2" />
                {language === 'fi' ? 'EN' : 'FI'}
              </Button>

              {/* User Stats - Clean Design */}
              <div className="hidden md:flex items-center gap-3 border rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-semibold">{userStats.streak}</span>
                </div>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-semibold">{userStats.xp} XP</span>
                </div>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold">{t('Taso', 'Level')} {userStats.level}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeSection} onValueChange={navigateToSection}>
          <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-white border p-1 rounded-lg mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Etusivu', 'Dashboard')}</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Kurssit', 'Courses')}</span>
            </TabsTrigger>
            <TabsTrigger value="practice" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Code className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Harjoittele', 'Practice')}</span>
            </TabsTrigger>
            <TabsTrigger value="classroom" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Luokka', 'Classroom')}</span>
            </TabsTrigger>
            <TabsTrigger value="compete" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Kilpaile', 'Compete')}</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Profiili', 'Profile')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Welcome Card - Clean Design */}
                <Card className="border-2 border-blue-600">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-2 text-gray-900">
                      {t(`Tervetuloa takaisin, ${currentUser.firstName}!`, `Welcome back, ${currentUser.firstName}!`)}
                    </h2>
                    <p className="text-gray-600 mb-4">
                      {t('Jatka oppimista siitä mihin jäit', 'Continue learning where you left off')}
                    </p>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Play className="w-4 h-4 mr-2" />
                      {t('Jatka oppimista', 'Continue Learning')}
                    </Button>
                  </CardContent>
                </Card>

                {/* Daily Challenge */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-600" />
                      {t('Päivän haaste', 'Daily Challenge')}
                    </CardTitle>
                    <CardDescription>
                      {t('Ratkaise päivän koodaushaaste ja ansaitse bonusta XP!', 'Solve today\'s coding challenge and earn bonus XP!')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {t('Listan käsittely', 'List Manipulation')}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {t('Keskitaso • 50 XP', 'Medium • 50 XP')}
                        </p>
                      </div>
                      <Button className="bg-yellow-600 hover:bg-yellow-700">
                        <Target className="w-4 h-4 mr-2" />
                        {t('Aloita', 'Start')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Continue Learning */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      {t('Jatka oppimista', 'Continue Learning')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 transition-colors cursor-pointer">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
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
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }} />
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Stats */}
              <div className="space-y-6">
                {/* Stats Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
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
                          className="bg-blue-600 h-3 rounded-full transition-all"
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
                      <Award className="w-5 h-5 text-amber-600" />
                      {t('Saavutukset', 'Achievements')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="aspect-square bg-amber-100 border-2 border-amber-300 rounded-lg flex items-center justify-center">
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
                      <Zap className="w-5 h-5 text-blue-600" />
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
                      <Code className="w-4 h-4 mr-2" />
                      {t('Uusi projekti', 'New Project')}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Courses Tab - Real Data */}
          <TabsContent value="courses">
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  {t('Kurssit', 'Courses')}
                </h2>
                <p className="text-gray-600">
                  {t('Valitse kurssi ja aloita oppiminen', 'Choose a course and start learning')}
                </p>
              </div>

              {/* Real Courses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allCourses.map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow border-2">
                    <div className="h-32 bg-blue-600 flex items-center justify-center">
                      <Code className="w-16 h-16 text-white" />
                    </div>

                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-xl">
                          {course.title[language]}
                        </CardTitle>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {course.description[language]}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge className={
                          course.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                          course.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {t(
                            course.difficulty === 'beginner' ? 'Aloittelija' : course.difficulty === 'intermediate' ? 'Keskitaso' : 'Edistynyt',
                            course.difficulty === 'beginner' ? 'Beginner' : course.difficulty === 'intermediate' ? 'Intermediate' : 'Advanced'
                          )}
                        </Badge>
                        {course.isFree && (
                          <Badge variant="outline">{t('Ilmainen', 'Free')}</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span>{course.estimatedHours}h</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-gray-500" />
                          <span>{course.modules.length} {t('moduulia', 'modules')}</span>
                        </div>
                      </div>

                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t('Aloita kurssi', 'Start Course')}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Other tabs remain similar but with clean design */}
          <TabsContent value="practice">
            <Card>
              <CardHeader>
                <CardTitle>{t('Harjoittele', 'Practice')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CodeEditor
                  language={language}
                  initialCode={`# ${t('Kirjoita koodisi tähän', 'Write your code here')}\nprint("${t('Hei, maailma!', 'Hello, World!')}")`}
                  testCases={[
                    { input: '', expectedOutput: t('Hei, maailma!', 'Hello, World!'), hidden: false }
                  ]}
                  showTests={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classroom">
            <ClassroomPage 
              language={language}
              userRole={currentUser?.role || 'student'}
            />
          </TabsContent>

          <TabsContent value="compete">
            <div className="space-y-6">
              <Card className="border-2 border-amber-600">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Trophy className="w-8 h-8 text-amber-600" />
                    <div>
                      <h3 className="text-2xl font-bold">
                        {t('Viikon kilpailu', 'Weekly Competition')}
                      </h3>
                      <p className="text-gray-600">
                        {t('Päättyy 3 päivän kuluttua', 'Ends in 3 days')}
                      </p>
                    </div>
                  </div>
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    <Play className="w-4 h-4 mr-2" />
                    {t('Osallistu nyt', 'Participate Now')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t('Profiili', 'Profile')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{currentUser?.firstName} {currentUser?.lastName}</h3>
                    <p className="text-gray-600">{currentUser?.email}</p>
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
