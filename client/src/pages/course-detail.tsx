import { useState, useEffect } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  BookOpen, 
  Clock, 
  Trophy, 
  Play, 
  CheckCircle, 
  Lock,
  Star,
  Users,
  Target,
  Zap,
  Award,
  ChevronRight,
  Loader2
} from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

export default function CourseDetail() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma/:userId/learn-coding/courses/:courseId');
  const [matchAdmin, paramsAdmin] = useRoute('/wilma-admin/:adminId/learn-coding/courses/:courseId');
  
  const userId = params?.userId || paramsAdmin?.adminId;
  const courseId = params?.courseId || paramsAdmin?.courseId;
  const isAdmin = !!matchAdmin;
  
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<'fi' | 'en'>('fi');
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      
      // Load course details
      const courseRes = await fetch(`/api/coding/courses/${courseId}`);
      if (courseRes.ok) {
        const courseData = await courseRes.json();
        setCourse(courseData);
      }
      
      // Load modules
      const modulesRes = await fetch(`/api/coding/courses/${courseId}/modules`);
      if (modulesRes.ok) {
        const modulesData = await modulesRes.json();
        setModules(Array.isArray(modulesData) ? modulesData : []);
      }
      
      // Load user progress
      if (userId) {
        const progressRes = await fetch(`/api/coding/progress/${userId}?courseId=${courseId}`);
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          setProgress(Array.isArray(progressData) && progressData.length > 0 ? progressData[0] : null);
        }
      }
    } catch (error) {
      console.error('Error loading course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      // Create initial progress
      await fetch(`/api/coding/progress/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          progressPercentage: 0,
          completedLessons: [],
          completedExercises: [],
          startedAt: new Date().toISOString()
        })
      });
      
      // Reload progress
      await loadCourseData();
    } catch (error) {
      console.error('Error enrolling:', error);
    } finally {
      setEnrolling(false);
    }
  };

  const handleStartLesson = (moduleId: string, lessonId: string) => {
    const basePath = isAdmin ? `/wilma-admin/${userId}` : `/wilma/${userId}`;
    setLocation(`${basePath}/learn-coding/courses/${courseId}/lessons/${lessonId}`);
  };

  const t = (fi: string, en: string) => language === 'fi' ? fi : en;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('Ladataan kurssia...', 'Loading course...')}</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-2">{t('Kurssia ei löytynyt', 'Course not found')}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('Kurssi ei ole saatavilla tai sitä ei ole olemassa.', 'The course is not available or does not exist.')}
            </p>
            <Button onClick={() => setLocation(isAdmin ? `/wilma-admin/${userId}/learn-coding` : `/wilma/${userId}/learn-coding`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('Takaisin', 'Go Back')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercent = progress?.progressPercentage || 0;
  const isEnrolled = !!progress;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => setLocation(isAdmin ? `/wilma-admin/${userId}/learn-coding` : `/wilma/${userId}/learn-coding`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('Takaisin kursseihin', 'Back to Courses')}
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Header */}
            <Card className="border-2 border-blue-500 dark:border-blue-600">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="text-6xl">{course.language === 'python' ? '🐍' : course.language === 'javascript' ? '⚡' : course.language === 'typescript' ? '📘' : '🚀'}</div>
                  <div className="flex-1">
                    <h1 className="text-4xl font-black mb-2 dark:text-white">
                      {course.title?.[language] || course.title?.fi || course.title}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                      {course.description?.[language] || course.description?.fi || course.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={
                        course.difficulty === 'beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        course.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }>
                        {t(
                          course.difficulty === 'beginner' ? 'Aloittelija' : course.difficulty === 'intermediate' ? 'Keskitaso' : 'Edistynyt',
                          course.difficulty === 'beginner' ? 'Beginner' : course.difficulty === 'intermediate' ? 'Intermediate' : 'Advanced'
                        )}
                      </Badge>
                      {course.isFree && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200">
                          {t('Ilmainen', 'Free')}
                        </Badge>
                      )}
                      {isEnrolled && (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {t('Ilmoittautunut', 'Enrolled')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {isEnrolled && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold dark:text-gray-300">{t('Edistyminen', 'Progress')}</span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div 
                        className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {!isEnrolled ? (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-lg h-12"
                    onClick={handleEnroll}
                    disabled={enrolling}
                  >
                    {enrolling ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {t('Ilmoittaudutaan...', 'Enrolling...')}
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        {t('Aloita kurssi', 'Start Course')}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-lg h-12"
                    onClick={() => {
                      // Find first incomplete lesson
                      const firstModule = modules[0];
                      if (firstModule?.lessons?.[0]) {
                        handleStartLesson(firstModule.id, firstModule.lessons[0].id);
                      }
                    }}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {progressPercent > 0 ? t('Jatka oppimista', 'Continue Learning') : t('Aloita oppiminen', 'Start Learning')}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Learning Objectives */}
            {course.learningObjectives && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    {t('Opit', 'What You\'ll Learn')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(course.learningObjectives[language] || course.learningObjectives.fi || []).map((objective: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm dark:text-gray-300">{objective}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Course Modules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  {t('Kurssin sisältö', 'Course Content')}
                </CardTitle>
                <CardDescription>
                  {modules.length} {t('moduulia', 'modules')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {modules.map((module, index) => (
                    <div key={module.id} className="border dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg dark:text-white">
                            {t('Moduuli', 'Module')} {index + 1}: {module.title?.[language] || module.title?.fi || module.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {module.description?.[language] || module.description?.fi || module.description}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {module.estimatedMinutes} {t('min', 'min')}
                        </Badge>
                      </div>
                      
                      {module.lessons && module.lessons.length > 0 && (
                        <div className="space-y-2 mt-3">
                          {module.lessons.map((lesson: any, lessonIndex: number) => {
                            const isCompleted = progress?.completedLessons?.includes(lesson.id);
                            const isLocked = !isEnrolled;
                            
                            return (
                              <button
                                key={lesson.id}
                                onClick={() => !isLocked && handleStartLesson(module.id, lesson.id)}
                                disabled={isLocked}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                                  isLocked 
                                    ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' 
                                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  isCompleted 
                                    ? 'bg-green-100 dark:bg-green-900' 
                                    : isLocked 
                                    ? 'bg-gray-200 dark:bg-gray-700' 
                                    : 'bg-blue-100 dark:bg-blue-900'
                                }`}>
                                  {isCompleted ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                  ) : isLocked ? (
                                    <Lock className="w-5 h-5 text-gray-400" />
                                  ) : (
                                    <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                  )}
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="font-semibold text-sm dark:text-white">
                                    {lesson.title?.[language] || lesson.title?.fi || lesson.title}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {lesson.estimatedMinutes} {t('minuuttia', 'minutes')}
                                  </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('Kurssin tiedot', 'Course Info')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('Kesto', 'Duration')}</div>
                    <div className="font-semibold dark:text-white">{course.estimatedHours} {t('tuntia', 'hours')}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('Moduulit', 'Modules')}</div>
                    <div className="font-semibold dark:text-white">{modules.length}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('Vaikeustaso', 'Difficulty')}</div>
                    <div className="font-semibold dark:text-white capitalize">{course.difficulty}</div>
                  </div>
                </div>
                
                {course.createdAt && (
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t('Luotu', 'Created')}</div>
                      <div className="font-semibold dark:text-white">{formatDate(course.createdAt)}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prerequisites */}
            {course.prerequisites && course.prerequisites.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    {t('Esitiedot', 'Prerequisites')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('Suosittelemme suorittamaan nämä kurssit ensin:', 'We recommend completing these courses first:')}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {course.prerequisites.map((prereq: string) => (
                      <li key={prereq} className="text-sm flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-blue-600" />
                        <span className="dark:text-gray-300">{prereq}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {course.tags && course.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('Aiheet', 'Topics')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
