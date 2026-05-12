import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Plus, 
  UserPlus, 
  BookOpen, 
  Calendar,
  TrendingUp,
  Award,
  MessageSquare,
  Settings,
  Copy,
  CheckCircle,
  Clock,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClassroomPageProps {
  language: 'fi' | 'en';
  userRole: 'student' | 'teacher';
}

export default function ClassroomPage({ language, userRole }: ClassroomPageProps) {
  const [joinCode, setJoinCode] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const { toast } = useToast();

  const t = (fi: string, en: string) => language === 'fi' ? fi : en;

  // Mock classrooms
  const myClassrooms = [
    {
      id: '1',
      name: '7A Python-ohjelmointi',
      teacher: 'Opettaja Virtanen',
      students: 24,
      joinCode: 'ABC123',
      assignments: 12,
      completedAssignments: 8,
      averageProgress: 67,
      nextLesson: 'Silmukat ja ehdot',
      dueAssignments: 2
    },
    {
      id: '2',
      name: 'Kesäkoulu 2026',
      teacher: 'Opettaja Mäkinen',
      students: 18,
      joinCode: 'XYZ789',
      assignments: 8,
      completedAssignments: 6,
      averageProgress: 75,
      nextLesson: 'Funktiot',
      dueAssignments: 1
    }
  ];

  const handleJoinClassroom = () => {
    if (!joinCode.trim()) {
      toast({
        title: t('Virhe', 'Error'),
        description: t('Syötä liittymiskoodi', 'Enter join code'),
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: t('✅ Liitytty luokkaan!', '✅ Joined classroom!'),
      description: t('Olet nyt luokan jäsen', 'You are now a member of the class')
    });
    setShowJoinDialog(false);
    setJoinCode('');
  };

  const handleCreateClassroom = () => {
    toast({
      title: t('✅ Luokka luotu!', '✅ Classroom created!'),
      description: t('Jaa liittymiskoodi opiskelijoille', 'Share the join code with students')
    });
    setShowCreateDialog(false);
  };

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: t('📋 Kopioitu!', '📋 Copied!'),
      description: t('Liittymiskoodi kopioitu leikepöydälle', 'Join code copied to clipboard')
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">
            {t('Luokkahuoneet', 'Classrooms')}
          </h2>
          <p className="text-gray-600">
            {userRole === 'teacher' 
              ? t('Hallinnoi luokkiasi ja seuraa opiskelijoiden edistymistä', 'Manage your classes and track student progress')
              : t('Liity luokkiin ja tee tehtäviä', 'Join classes and complete assignments')
            }
          </p>
        </div>

        <div className="flex gap-2">
          {userRole === 'teacher' ? (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('Luo luokka', 'Create Class')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('Luo uusi luokka', 'Create New Class')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>{t('Luokan nimi', 'Class Name')}</Label>
                    <Input placeholder={t('esim. 7A Python-ohjelmointi', 'e.g. 7A Python Programming')} />
                  </div>
                  <div>
                    <Label>{t('Kuvaus', 'Description')}</Label>
                    <Textarea placeholder={t('Luokan kuvaus...', 'Class description...')} />
                  </div>
                  <div>
                    <Label>{t('Koulu', 'School')}</Label>
                    <Input placeholder={t('Koulun nimi', 'School name')} />
                  </div>
                  <div>
                    <Label>{t('Luokka-aste', 'Grade')}</Label>
                    <Input placeholder={t('esim. 7', 'e.g. 7')} />
                  </div>
                </div>
                <Button onClick={handleCreateClassroom} className="w-full bg-purple-600 hover:bg-purple-700">
                  {t('Luo luokka', 'Create Class')}
                </Button>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('Liity luokkaan', 'Join Class')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('Liity luokkaan', 'Join Class')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>{t('Liittymiskoodi', 'Join Code')}</Label>
                    <Input 
                      placeholder={t('Syötä 6-merkkinen koodi', 'Enter 6-character code')}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      {t('Pyydä liittymiskoodi opettajaltasi', 'Ask your teacher for the join code')}
                    </p>
                  </div>
                </div>
                <Button onClick={handleJoinClassroom} className="w-full bg-green-600 hover:bg-green-700">
                  {t('Liity', 'Join')}
                </Button>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* My Classrooms */}
      {myClassrooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">
              {t('Ei luokkia', 'No Classrooms')}
            </h3>
            <p className="text-gray-600 mb-4">
              {userRole === 'teacher'
                ? t('Luo ensimmäinen luokkasi aloittaaksesi', 'Create your first class to get started')
                : t('Liity luokkaan aloittaaksesi', 'Join a class to get started')
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {myClassrooms.map((classroom) => (
            <Card key={classroom.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl mb-1">{classroom.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {classroom.students} {t('opiskelijaa', 'students')}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Copy className="w-3 h-3" />
                    {classroom.joinCode}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">
                        {t('Tehtävät', 'Assignments')}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      {classroom.completedAssignments}/{classroom.assignments}
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-900">
                        {t('Edistyminen', 'Progress')}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {classroom.averageProgress}%
                    </p>
                  </div>
                </div>

                {/* Next Lesson */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-900">
                      {t('Seuraava oppitunti', 'Next Lesson')}
                    </span>
                  </div>
                  <p className="text-purple-800">{classroom.nextLesson}</p>
                </div>

                {/* Due Assignments Alert */}
                {classroom.dueAssignments > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-semibold text-orange-900">
                        {classroom.dueAssignments} {t('tehtävää erääntymässä', 'assignments due')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {t('Avaa', 'Open')}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => copyJoinCode(classroom.joinCode)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  {userRole === 'teacher' && (
                    <Button variant="outline">
                      <Settings className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Teacher Analytics (if teacher) */}
      {userRole === 'teacher' && myClassrooms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              {t('Analytiikka', 'Analytics')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">42</p>
                <p className="text-sm text-gray-600">{t('Opiskelijaa yhteensä', 'Total Students')}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">89%</p>
                <p className="text-sm text-gray-600">{t('Keskimääräinen edistyminen', 'Average Progress')}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">156</p>
                <p className="text-sm text-gray-600">{t('Tehtäviä palautettu', 'Assignments Submitted')}</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-3xl font-bold text-orange-600">3</p>
                <p className="text-sm text-gray-600">{t('Tarvitsee apua', 'Need Help')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
