import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CodeEditor from "@/components/CodeEditor";
import { 
  ArrowLeft, 
  ArrowRight,
  BookOpen, 
  CheckCircle, 
  Clock,
  Code,
  Lightbulb,
  Target,
  Trophy,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Home
} from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

export default function LessonDetail() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute('/wilma/:userId/learn-coding/courses/:courseId/lessons/:lessonId');
  const [matchAdmin, paramsAdmin] = useRoute('/wilma-admin/:adminId/learn-coding/courses/:courseId/lessons/:lessonId');
  
  const userId = params?.userId || paramsAdmin?.adminId;
  const courseId = params?.courseId || paramsAdmin?.courseId;
  const lessonId = params?.lessonId || paramsAdmin?.lessonId;
  const isAdmin = !!matchAdmin;
  
  const [lesson, setLesson] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<'fi' | 'en'>('fi');
  const [completing, setCompleting] = useState(false);
  const [currentModule, setCurrentModule] = useState<any>(null);
  const [nextLesson, setNextLesson] = useState<any>(null);
  const [prevLesson, setPrevLesson] = useState<any>(null);

  useEffect(() => {
    loadLessonData();
  }, [lessonId, courseId]);

  const loadLessonData = async () => {
    try {
      setLoading(true);
      
      // Load course
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
        
        // Find current lesson and navigation
        let foundLesson = null;
        let foundModule = null;
        let allLessons: any[] = [];
        
        modulesData.forEach((module: any) => {
          if (module.lessons) {
            module.lessons.forEach((l: any) => {
              allLessons.push({ ...l, moduleId: module.id });
              if (l.id === lessonId) {
                foundLesson = l;
                foundModule = module;
              }
            });
          }
        });
        
        setLesson(foundLesson);
        setCurrentModule(foundModule);
        
        // Find prev/next lessons
        const currentIndex = allLessons.findIndex(l => l.id === lessonId);
        if (currentIndex > 0) {
          setPrevLesson(allLessons[currentIndex - 1]);
        }
        if (currentIndex < allLessons.length - 1) {
          setNextLesson(allLessons[currentIndex + 1]);
        }
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
      console.error('Error loading lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteLesson = async () => {
    if (!progress) return;
    
    setCompleting(true);
    try {
      const completedLessons = progress.completedLessons || [];
      if (!completedLessons.includes(lessonId)) {
        completedLessons.push(lessonId);
        
        // Calculate new progress percentage
        let totalLessons = 0;
        modules.forEach(m => {
          if (m.lessons) totalLessons += m.lessons.length;
        });
        const progressPercentage = Math.round((completedLessons.length / totalLessons) * 100);
        
        // Update progress
        await fetch(`/api/coding/progress/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: progress.id,
            completedLessons,
            progressPercentage,
            lastAccessedAt: new Date().toISOString()
          })
        });
        
        // Reload progress
        await loadLessonData();
        
        // Navigate to next lesson if available
        if (nextLesson) {
          const basePath = isAdmin ? `/wilma-admin/${userId}` : `/wilma/${userId}`;
          setLocation(`${basePath}/learn-coding/courses/${courseId}/lessons/${nextLesson.id}`);
        }
      }
    } catch (error) {
      console.error('Error completing lesson:', error);
    } finally {
      setCompleting(false);
    }
  };

  const navigateToLesson = (targetLessonId: string) => {
    const basePath = isAdmin ? `/wilma-admin/${userId}` : `/wilma/${userId}`;
    setLocation(`${basePath}/learn-coding/courses/${courseId}/lessons/${targetLessonId}`);
  };

  const t = (fi: string, en: string) => language === 'fi' ? fi : en;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('Ladataan oppituntia...', 'Loading lesson...')}</p>
        </div>
      </div>
    );
  }

  if (!lesson || !course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-2">{t('Oppituntia ei löytynyt', 'Lesson not found')}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('Oppitunti ei ole saatavilla.', 'The lesson is not available.')}
            </p>
            <Button onClick={() => {
              const basePath = isAdmin ? `/wilma-admin/${userId}` : `/wilma/${userId}`;
              setLocation(`${basePath}/learn-coding/courses/${courseId}`);
            }}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('Takaisin kurssiin', 'Back to Course')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompleted = progress?.completedLessons?.includes(lessonId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const basePath = isAdmin ? `/wilma-admin/${userId}` : `/wilma/${userId}`;
                  setLocation(`${basePath}/learn-coding/courses/${courseId}`);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('Takaisin kurssiin', 'Back to Course')}
              </Button>
              
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {course.title?.[language] || course.title?.fi || course.title}
                </div>
                <div className="font-semibold text-sm dark:text-white">
                  {currentModule?.title?.[language] || currentModule?.title?.fi || currentModule?.title}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {prevLesson && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToLesson(prevLesson.id)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {t('Edellinen', 'Previous')}
                </Button>
              )}
              
              {nextLesson && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToLesson(nextLesson.id)}
                >
                  {t('Seuraava', 'Next')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Lesson Header */}
          <Card className="border-2 border-blue-500 dark:border-blue-600">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-black mb-2 dark:text-white">
                    {lesson.title?.[language] || lesson.title?.fi || lesson.title}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    {lesson.description?.[language] || lesson.description?.fi || lesson.description}
                  </p>
                </div>
                {isCompleted && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {t('Suoritettu', 'Completed')}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{lesson.estimatedMinutes} {t('minuuttia', 'minutes')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{currentModule?.title?.[language] || currentModule?.title?.fi || currentModule?.title}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lesson Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                {t('Oppitunnin sisältö', 'Lesson Content')}
              </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <div className="space-y-4">
                {lesson.content?.[language] || lesson.content?.fi ? (
                  <div dangerouslySetInnerHTML={{ 
                    __html: (lesson.content[language] || lesson.content.fi).replace(/\n/g, '<br />') 
                  }} />
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('Oppitunnin sisältö ladataan...', 'Lesson content loading...')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Code Examples */}
          {lesson.codeExamples && lesson.codeExamples.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-purple-600" />
                  {t('Koodiesimerkit', 'Code Examples')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lesson.codeExamples.map((example: any, index: number) => (
                  <div key={index} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b dark:border-gray-700">
                      <h4 className="font-semibold text-sm dark:text-white">
                        {example.title?.[language] || example.title?.fi || `Example ${index + 1}`}
                      </h4>
                    </div>
                    <div className="p-4 bg-gray-900">
                      <pre className="text-sm text-gray-100 overflow-x-auto">
                        <code>{example.code}</code>
                      </pre>
                    </div>
                    {example.explanation && (
                      <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-sm">
                        <p className="text-gray-700 dark:text-gray-300">
                          {example.explanation[language] || example.explanation.fi}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Key Takeaways */}
          {lesson.keyTakeaways && lesson.keyTakeaways[language || 'fi']?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  {t('Keskeiset opit', 'Key Takeaways')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(lesson.keyTakeaways[language] || lesson.keyTakeaways.fi || []).map((takeaway: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="dark:text-gray-300">{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Practice Exercise */}
          {lesson.exercise && (
            <Card className="border-2 border-purple-500 dark:border-purple-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-purple-600" />
                  {t('Harjoitustehtävä', 'Practice Exercise')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 dark:text-white">
                    {lesson.exercise.title?.[language] || lesson.exercise.title?.fi}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {lesson.exercise.description?.[language] || lesson.exercise.description?.fi}
                  </p>
                </div>
                
                <CodeEditor
                  language={course.language || 'python'}
                  initialCode={lesson.exercise.starterCode || '# Write your code here\n'}
                  testCases={lesson.exercise.testCases || []}
                />
              </CardContent>
            </Card>
          )}

          {/* Complete Lesson Button */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1 dark:text-white">
                    {isCompleted 
                      ? t('Olet suorittanut tämän oppitunnin!', 'You\'ve completed this lesson!')
                      : t('Valmis jatkamaan?', 'Ready to continue?')
                    }
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {isCompleted
                      ? t('Voit siirtyä seuraavaan oppituntiin.', 'You can move to the next lesson.')
                      : t('Merkitse oppitunti suoritetuksi jatkaaksesi.', 'Mark this lesson as complete to continue.')
                    }
                  </p>
                </div>
                
                <div className="flex gap-2">
                  {!isCompleted && (
                    <Button
                      onClick={handleCompleteLesson}
                      disabled={completing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {completing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('Merkitään...', 'Marking...')}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {t('Merkitse suoritetuksi', 'Mark Complete')}
                        </>
                      )}
                    </Button>
                  )}
                  
                  {nextLesson && (
                    <Button
                      onClick={() => navigateToLesson(nextLesson.id)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {t('Seuraava oppitunti', 'Next Lesson')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  
                  {!nextLesson && isCompleted && (
                    <Button
                      onClick={() => {
                        const basePath = isAdmin ? `/wilma-admin/${userId}` : `/wilma/${userId}`;
                        setLocation(`${basePath}/learn-coding/courses/${courseId}`);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      {t('Takaisin kurssiin', 'Back to Course')}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
