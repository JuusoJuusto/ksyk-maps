import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Code, 
  BookOpen, 
  Clock, 
  Star, 
  Users, 
  TrendingUp,
  Lock,
  CheckCircle,
  Play,
  Award,
  Zap
} from "lucide-react";

interface CoursesPageProps {
  language: 'fi' | 'en';
  onStartCourse: (courseId: string) => void;
}

export default function CoursesPage({ language, onStartCourse }: CoursesPageProps) {
  const t = (fi: string, en: string) => language === 'fi' ? fi : en;

  const courses = [
    {
      id: 'python-basics',
      title: { fi: 'Python perusteet', en: 'Python Basics' },
      description: { 
        fi: 'Opi Pythonin perusteet alusta alkaen. Ei aiempaa ohjelmointikokemusta tarvita!',
        en: 'Learn Python from scratch. No prior programming experience required!'
      },
      difficulty: 'beginner',
      estimatedHours: 20,
      modules: 8,
      lessons: 45,
      exercises: 120,
      enrolled: 1247,
      rating: 4.8,
      color: 'from-blue-500 to-cyan-500',
      icon: Code,
      progress: 35,
      isEnrolled: true,
      tags: [
        { fi: 'Aloittelija', en: 'Beginner' },
        { fi: 'Suosittu', en: 'Popular' },
        { fi: 'Ilmainen', en: 'Free' }
      ]
    },
    {
      id: 'python-intermediate',
      title: { fi: 'Python jatkokurssi', en: 'Intermediate Python' },
      description: { 
        fi: 'Syventävä kurssi Pythonista. Opi funktioita, luokkia ja tiedostonkäsittelyä.',
        en: 'Advanced Python course. Learn functions, classes, and file handling.'
      },
      difficulty: 'intermediate',
      estimatedHours: 30,
      modules: 10,
      lessons: 60,
      exercises: 180,
      enrolled: 856,
      rating: 4.9,
      color: 'from-purple-500 to-pink-500',
      icon: TrendingUp,
      progress: 0,
      isEnrolled: false,
      isLocked: false,
      tags: [
        { fi: 'Keskitaso', en: 'Intermediate' },
        { fi: 'Ilmainen', en: 'Free' }
      ]
    },
    {
      id: 'python-projects',
      title: { fi: 'Python projektit', en: 'Python Projects' },
      description: { 
        fi: 'Rakenna oikeita projekteja: pelejä, sovelluksia ja työkaluja.',
        en: 'Build real projects: games, applications, and tools.'
      },
      difficulty: 'intermediate',
      estimatedHours: 40,
      modules: 12,
      lessons: 50,
      exercises: 200,
      enrolled: 634,
      rating: 4.7,
      color: 'from-green-500 to-emerald-500',
      icon: Award,
      progress: 0,
      isEnrolled: false,
      isLocked: false,
      tags: [
        { fi: 'Projektit', en: 'Projects' },
        { fi: 'Käytännöllinen', en: 'Practical' }
      ]
    },
    {
      id: 'python-advanced',
      title: { fi: 'Python edistynyt', en: 'Advanced Python' },
      description: { 
        fi: 'Edistyneet aiheet: algoritmit, tietorakenteet ja optimointi.',
        en: 'Advanced topics: algorithms, data structures, and optimization.'
      },
      difficulty: 'advanced',
      estimatedHours: 50,
      modules: 15,
      lessons: 80,
      exercises: 250,
      enrolled: 423,
      rating: 4.9,
      color: 'from-red-500 to-orange-500',
      icon: Zap,
      progress: 0,
      isEnrolled: false,
      isLocked: true,
      tags: [
        { fi: 'Edistynyt', en: 'Advanced' },
        { fi: 'Haastava', en: 'Challenging' }
      ]
    },
    {
      id: 'web-development',
      title: { fi: 'Web-kehitys', en: 'Web Development' },
      description: { 
        fi: 'Opi HTML, CSS ja JavaScript. Rakenna omia verkkosivuja!',
        en: 'Learn HTML, CSS, and JavaScript. Build your own websites!'
      },
      difficulty: 'beginner',
      estimatedHours: 35,
      modules: 12,
      lessons: 70,
      exercises: 150,
      enrolled: 1089,
      rating: 4.6,
      color: 'from-yellow-500 to-amber-500',
      icon: Code,
      progress: 0,
      isEnrolled: false,
      isLocked: true,
      tags: [
        { fi: 'Tulossa', en: 'Coming Soon' },
        { fi: 'Web', en: 'Web' }
      ]
    },
    {
      id: 'game-development',
      title: { fi: 'Pelikehitys', en: 'Game Development' },
      description: { 
        fi: 'Luo omia pelejä Pythonilla. Opi pelimekaniikkaa ja grafiikkaa.',
        en: 'Create your own games with Python. Learn game mechanics and graphics.'
      },
      difficulty: 'intermediate',
      estimatedHours: 45,
      modules: 14,
      lessons: 65,
      exercises: 180,
      enrolled: 892,
      rating: 4.8,
      color: 'from-indigo-500 to-purple-500',
      icon: Award,
      progress: 0,
      isEnrolled: false,
      isLocked: true,
      tags: [
        { fi: 'Tulossa', en: 'Coming Soon' },
        { fi: 'Pelit', en: 'Games' }
      ]
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return t('Aloittelija', 'Beginner');
      case 'intermediate': return t('Keskitaso', 'Intermediate');
      case 'advanced': return t('Edistynyt', 'Advanced');
      default: return difficulty;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">
          {t('Kurssit', 'Courses')}
        </h2>
        <p className="text-gray-600">
          {t('Valitse kurssi ja aloita oppiminen', 'Choose a course and start learning')}
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="default" size="sm">
          {t('Kaikki', 'All')}
        </Button>
        <Button variant="outline" size="sm">
          {t('Aloittelija', 'Beginner')}
        </Button>
        <Button variant="outline" size="sm">
          {t('Keskitaso', 'Intermediate')}
        </Button>
        <Button variant="outline" size="sm">
          {t('Edistynyt', 'Advanced')}
        </Button>
        <Button variant="outline" size="sm">
          {t('Ilmaiset', 'Free')}
        </Button>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const Icon = course.icon;
          return (
            <Card 
              key={course.id}
              className={`hover:shadow-lg transition-all ${
                course.isLocked ? 'opacity-60' : 'hover:scale-105'
              }`}
            >
              {/* Course Header with Gradient */}
              <div className={`h-32 bg-gradient-to-r ${course.color} rounded-t-lg flex items-center justify-center relative`}>
                <Icon className="w-16 h-16 text-white" />
                {course.isLocked && (
                  <div className="absolute top-2 right-2 bg-black/50 rounded-full p-2">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                )}
                {course.isEnrolled && (
                  <div className="absolute top-2 left-2 bg-green-500 rounded-full px-3 py-1 text-white text-xs font-semibold">
                    {t('Ilmoittautunut', 'Enrolled')}
                  </div>
                )}
              </div>

              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-xl">
                    {course.title[language]}
                  </CardTitle>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-semibold">{course.rating}</span>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">
                  {course.description[language]}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={getDifficultyColor(course.difficulty)}>
                    {getDifficultyText(course.difficulty)}
                  </Badge>
                  {course.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag[language]}
                    </Badge>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{course.estimatedHours}h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gray-500" />
                    <span>{course.lessons} {t('oppituntia', 'lessons')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-gray-500" />
                    <span>{course.exercises} {t('tehtävää', 'exercises')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>{course.enrolled}</span>
                  </div>
                </div>

                {/* Progress Bar (if enrolled) */}
                {course.isEnrolled && course.progress > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t('Edistyminen', 'Progress')}</span>
                      <span className="font-semibold">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="h-2" />
                  </div>
                )}

                {/* Action Button */}
                <Button
                  onClick={() => onStartCourse(course.id)}
                  disabled={course.isLocked}
                  className={`w-full ${
                    course.isEnrolled
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {course.isLocked ? (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      {t('Lukittu', 'Locked')}
                    </>
                  ) : course.isEnrolled ? (
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
    </div>
  );
}
