import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  UserCheck, Calendar, Users, FileText, Clock, AlertCircle,
  CheckCircle, XCircle, Star, Phone, Mail, MapPin, Bell,
  Plus, Search, Filter, Download, Upload, Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data - Replace with API calls
const mockRequests = [
  {
    id: '1',
    teacherName: 'Matti Virtanen',
    teacherId: 'teacher1',
    date: '2026-04-25',
    startTime: '08:00',
    endTime: '14:00',
    reason: 'Sairasloma',
    status: 'pending' as const,
    priority: 'high' as const,
    classes: ['7A', '8B', '9A'],
    subjects: ['Matematiikka'],
    notes: 'Jatkuu todennäköisesti huomiseen',
    lessonPlans: [
      {
        id: 'lp1',
        class: '7A',
        subject: 'Matematiikka',
        time: '08:00-09:30',
        room: 'A301',
        topic: 'Yhtälöt',
        objectives: ['Ymmärtää yhtälön käsite', 'Osaa ratkaista yksinkertaisia yhtälöitä'],
        materials: ['Oppikirja s. 45-48', 'Laskuharjoitukset', 'Liitutaulu'],
        activities: [
          { duration: 15, description: 'Kertaus edellisestä tunnista', type: 'discussion' as const },
          { duration: 30, description: 'Uuden asian opetus', type: 'lecture' as const },
          { duration: 30, description: 'Harjoitustehtävät', type: 'exercise' as const },
          { duration: 15, description: 'Yhteenveto ja kotitehtävät', type: 'discussion' as const }
        ],
        homework: 'Tehtävät 1-10 sivulta 48',
        studentRoster: [
          { id: 's1', name: 'Emma Korhonen', allergies: ['Pähkinä'] },
          { id: 's2', name: 'Mikko Lahtinen', medications: ['Astmalääke'] },
          { id: 's3', name: 'Sofia Nieminen' }
        ],
        specialNeeds: [
          {
            studentId: 's2',
            studentName: 'Mikko Lahtinen',
            type: 'physical' as const,
            description: 'Astma',
            accommodations: ['Lääke saatavilla', 'Voi poistua tarvittaessa'],
            urgent: false
          }
        ]
      }
    ]
  }
];

export default function EnhancedSubstituteSystem() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('requests');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showLessonPlan, setShowLessonPlan] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Create new request
  const [newRequest, setNewRequest] = useState({
    date: '',
    startTime: '',
    endTime: '',
    reason: '',
    priority: 'medium',
    notes: ''
  });

  const handleCreateRequest = () => {
    // TODO: API call to create request
    toast({
      title: "Sijaisuspyyntö lähetetty",
      description: "Pyyntö on lähetetty saataville oleville sijaisille.",
    });
  };

  const handleAcceptRequest = (requestId: string) => {
    // TODO: API call to accept
    toast({
      title: "Sijaisuus hyväksytty",
      description: "Olet hyväksynyt sijaisuuden. Saat lisätiedot sähköpostitse.",
    });
  };

  const handleDeclineRequest = (requestId: string) => {
    // TODO: API call to decline
    toast({
      title: "Sijaisuus hylätty",
      description: "Olet hylännyt sijaisuuden.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sijaisjärjestelmä</h2>
          <p className="text-gray-600 mt-1">Hallitse sijaisuuksia ja sijaisopettajia</p>
        </div>
        <Button className="bg-[#003d82] hover:bg-[#0052a3]">
          <Plus className="w-4 h-4 mr-2" />
          Uusi sijaisuspyyntö
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requests">
            <Bell className="w-4 h-4 mr-2" />
            Pyynnöt
          </TabsTrigger>
          <TabsTrigger value="active">
            <UserCheck className="w-4 h-4 mr-2" />
            Aktiiviset
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="w-4 h-4 mr-2" />
            Kalenteri
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="w-4 h-4 mr-2" />
            Historia
          </TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4 mt-6">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Etsi sijaisuspyyntöjä..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Suodata
            </Button>
          </div>

          {/* Request Cards */}
          <div className="space-y-4">
            {mockRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow border-2">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserCheck className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{request.teacherName}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(request.date).toLocaleDateString('fi-FI', { 
                              weekday: 'long', 
                              day: 'numeric',
                              month: 'long'
                            })}
                          </p>
                        </div>
                        <Badge 
                          variant={request.priority === 'urgent' ? 'destructive' : 'default'}
                          className={request.priority === 'high' ? 'bg-orange-500' : ''}
                        >
                          {request.priority === 'urgent' ? 'Kiireellinen' : 
                           request.priority === 'high' ? 'Tärkeä' : 'Normaali'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Aika</p>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium">{request.startTime} - {request.endTime}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Luokat</p>
                          <div className="flex flex-wrap gap-1">
                            {request.classes.map((cls) => (
                              <Badge key={cls} variant="outline" className="bg-blue-50">
                                {cls}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Aineet</p>
                          <div className="flex flex-wrap gap-1">
                            {request.subjects.map((subject) => (
                              <Badge key={subject} variant="outline" className="bg-green-50">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Syy</p>
                          <span className="text-sm font-medium">{request.reason}</span>
                        </div>
                      </div>

                      {request.notes && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                          <p className="text-sm text-yellow-900 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {request.notes}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowLessonPlan(true);
                          }}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Tuntisuunnitelmat ({request.lessonPlans?.length || 0})
                        </Button>
                        <Button size="sm" variant="outline">
                          <Users className="w-4 h-4 mr-1" />
                          Oppilaslista
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button 
                        onClick={() => handleAcceptRequest(request.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Hyväksy
                      </Button>
                      <Button 
                        onClick={() => handleDeclineRequest(request.id)}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Hylkää
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Active Substitutions Tab */}
        <TabsContent value="active" className="space-y-4 mt-6">
          <Card className="border-2 border-green-500 bg-green-50">
            <CardContent className="p-6">
              <div className="text-center">
                <UserCheck className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-green-900 mb-2">Ei aktiivisia sijaisuuksia</h3>
                <p className="text-sm text-green-700">
                  Kun hyväksyt sijaisuuden, se näkyy täällä.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sijaiskalenteri</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Kalenterinäkymä tulossa pian...</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sijaishistoria</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Historia tulossa pian...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lesson Plan Modal */}
      {showLessonPlan && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Tuntisuunnitelmat - {selectedRequest.teacherName}</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowLessonPlan(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {selectedRequest.lessonPlans?.map((plan: any) => (
                <Card key={plan.id} className="border-2">
                  <CardHeader className="bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{plan.subject} - {plan.class}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {plan.time} • {plan.room}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Lataa PDF
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {/* Topic */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Aihe</h4>
                      <p className="text-gray-700">{plan.topic}</p>
                    </div>

                    {/* Objectives */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Tavoitteet</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {plan.objectives.map((obj: string, idx: number) => (
                          <li key={idx} className="text-gray-700">{obj}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Activities */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Tunnin kulku</h4>
                      <div className="space-y-2">
                        {plan.activities.map((activity: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="text-center min-w-[60px]">
                              <Clock className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                              <span className="text-sm font-medium">{activity.duration} min</span>
                            </div>
                            <div className="flex-1">
                              <Badge variant="outline" className="mb-1">
                                {activity.type === 'lecture' ? 'Opetus' :
                                 activity.type === 'discussion' ? 'Keskustelu' :
                                 activity.type === 'exercise' ? 'Harjoitus' :
                                 activity.type === 'group_work' ? 'Ryhmätyö' : 'Muu'}
                              </Badge>
                              <p className="text-sm text-gray-700">{activity.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Materials */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Materiaalit</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {plan.materials.map((material: string, idx: number) => (
                          <li key={idx} className="text-gray-700">{material}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Homework */}
                    {plan.homework && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Kotitehtävät</h4>
                        <p className="text-gray-700">{plan.homework}</p>
                      </div>
                    )}

                    {/* Special Needs */}
                    {plan.specialNeeds && plan.specialNeeds.length > 0 && (
                      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                        <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          Erityishuomiot
                        </h4>
                        <div className="space-y-2">
                          {plan.specialNeeds.map((need: any, idx: number) => (
                            <div key={idx} className="bg-white rounded p-3">
                              <p className="font-medium text-gray-900">{need.studentName}</p>
                              <p className="text-sm text-gray-700 mt-1">{need.description}</p>
                              <div className="mt-2">
                                <p className="text-xs font-semibold text-gray-600 mb-1">Tukitoimet:</p>
                                <ul className="text-xs text-gray-600 space-y-0.5">
                                  {need.accommodations.map((acc: string, i: number) => (
                                    <li key={i}>• {acc}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Student Roster */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Oppilaslista ({plan.studentRoster.length} oppilasta)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {plan.studentRoster.map((student: any) => (
                          <div key={student.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {student.name.split(' ').map((n: string) => n[0]).join('')}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{student.name}</p>
                              {(student.allergies || student.medications) && (
                                <p className="text-xs text-orange-600">
                                  {student.allergies && `Allergia: ${student.allergies.join(', ')}`}
                                  {student.medications && ` • Lääke: ${student.medications.join(', ')}`}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
