import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CodeEditor from "@/components/CodeEditor";
import ClassroomPage from "@/components/ClassroomPage";
import CodingDashboard from "@/components/CodingDashboard";
import CodePlayground from "@/components/CodePlayground";
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
  ArrowLeft,
  Loader2
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
  
  // API Data States
  const [courses, setCourses] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>({
    totalXp: 0,
    level: 1,
    streak: 0,
    coursesCompleted: 0,
    lessonsCompleted: 0,
    exercisesCompleted: 0,
    rank: null
  });
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wilmaUser = localStorage.getItem('wilma_user');
    if (wilmaUser) {
      const user = JSON.parse(wilmaUser);
      setCurrentUser(user);
      // Load user data
      loadUserData(user.id);
    }
  }, []);

  useEffect(() => {
    const section = params?.section || paramsAdmin?.section;
    if (section) {
      setActiveSection(section);
    }
  }, [params?.section, paramsAdmin?.section]);

  const loadUserData = async (userId: string) => {
    try {
      setLoading(true);
      
      // Load courses
      const coursesRes = await fetch('/api/coding/courses');
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(Array.isArray(coursesData) ? coursesData : []);
      } else {
        console.error('Failed to load courses:', coursesRes.status);
        setCourses([]);
      }
      
      // Load user stats
      const statsRes = await fetch(`/api/coding/stats/${userId}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setUserStats(statsData || {
          totalXp: 0,
          level: 1,
          streak: 0,
          coursesCompleted: 0,
          lessonsCompleted: 0,
          exercisesCompleted: 0,
          rank: null
        });
      } else {
        console.error('Failed to load stats:', statsRes.status);
      }
      
      // Load user progress
      const progressRes = await fetch(`/api/coding/progress/${userId}`);
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setUserProgress(Array.isArray(progressData) ? progressData : []);
      } else {
        console.error('Failed to load progress:', progressRes.status);
        setUserProgress([]);
      }
      
      // Load leaderboard
      const leaderboardRes = await fetch('/api/coding/leaderboard?type=alltime&limit=10');
      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json();
        setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
      } else {
        console.error('Failed to load leaderboard:', leaderboardRes.status);
        setLeaderboard([]);
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
      // Set default values on error
      setCourses([]);
      setUserProgress([]);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const t = (fi: string, en: string) => language === 'fi' ? fi : en;

  const nextLevelXP = (userStats.level || 1) * 500;

  const handleLogout = () => {
    const basePath = isAdmin ? `/wilma-admin/${userId}` : `/wilma/${userId}`;
    setLocation(basePath);
  };

  const navigateToSection = (section: string, data?: any) => {
    setActiveSection(section);
    const basePath = isAdmin ? `/wilma-admin/${userId}` : `/wilma/${userId}`;
    setLocation(`${basePath}/learn-coding/${section}`);
    
    // Handle additional navigation data (e.g., courseId)
    if (data?.courseId) {
      // Could be used to open a specific course
      console.log('Navigate to course:', data.courseId);
    }
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
                  <span className="text-sm font-semibold">{userStats.streak || 0}</span>
                </div>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-semibold">{userStats.totalXp || 0} XP</span>
                </div>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold">{t('Taso', 'Level')} {userStats.level || 1}</span>
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
            <CodingDashboard
              userStats={userStats}
              userProgress={userProgress}
              courses={courses}
              language={language}
              currentUser={currentUser}
              onNavigate={navigateToSection}
            />
          </TabsContent>

          {/* Courses Tab - Real Data from API */}
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

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">{t('Ladataan kursseja...', 'Loading courses...')}</span>
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">{t('Ei kursseja saatavilla', 'No courses available')}</h3>
                  <p className="text-gray-600">{t('Kursseja lisätään pian!', 'Courses coming soon!')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => {
                    const progress = userProgress.find(p => p.courseId === course.id);
                    const progressPercent = progress?.progressPercentage || 0;
                    
                    return (
                      <Card key={course.id} className="hover:shadow-lg transition-shadow border-2">
                        <div className="h-32 bg-blue-600 flex items-center justify-center">
                          <Code className="w-16 h-16 text-white" />
                        </div>

                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-xl">
                              {course.title?.[language] || course.title?.fi || course.title}
                            </CardTitle>
                          </div>
                          <CardDescription className="line-clamp-2">
                            {course.description?.[language] || course.description?.fi || course.description}
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
                            {progressPercent > 0 && (
                              <Badge className="bg-blue-100 text-blue-800">
                                {progressPercent}% {t('valmis', 'complete')}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span>{course.estimatedHours}h</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-gray-500" />
                              <span>{course.modules?.length || 0} {t('moduulia', 'modules')}</span>
                            </div>
                          </div>

                          {progressPercent > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          )}

                          <Button className="w-full bg-blue-600 hover:bg-blue-700">
                            {progressPercent > 0 ? (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                {t('Jatka', 'Continue')}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {t('Aloita kurssi', 'Start Course')}
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Other tabs remain similar but with clean design */}
          <TabsContent value="practice">
            <CodePlayground
              language={language}
              initialCode={`# ${t('Kirjoita koodisi tähän', 'Write your code here')}\nprint("${t('Hei, maailma!', 'Hello, World!')}")`}
              testCases={[
                { input: '', expectedOutput: t('Hei, maailma!', 'Hello, World!'), hidden: false }
              ]}
            />
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
