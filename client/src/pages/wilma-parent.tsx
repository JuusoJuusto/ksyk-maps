import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import WilmaSupportTab from "@/components/WilmaSupportTab";
import { 
  Users, Calendar, Award, MessageSquare, CheckCircle, 
  AlertCircle, LogOut, User, FileText, BookOpen, Bell, HelpCircle
} from 'lucide-react';

/**
 * Wilma Parent View
 * - Multi-child support
 * - Can switch between children
 * - Can report absences for children
 * - OLD WILMA STYLE - No gradients
 */
export default function WilmaParent() {
  const [, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [absenceDate, setAbsenceDate] = useState('');
  const [absenceReason, setAbsenceReason] = useState('');
  const queryClient = useQueryClient();

  // Load current user
  useEffect(() => {
    const storedUser = localStorage.getItem('wilma_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (err) {
        console.error('Failed to parse stored user:', err);
        setLocation('/wilma');
      }
    } else {
      setLocation('/wilma');
    }
  }, []);

  // Fetch parent's children
  const { data: children = [], isLoading } = useQuery({
    queryKey: ["parent-children", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/wilma/parent/${currentUser.id}/children`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!currentUser?.id
  });

  // Auto-select first child if none selected
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].studentId);
    }
  }, [children, selectedChildId]);

  const selectedChild = children.find((c: any) => c.studentId === selectedChildId);

  // Fetch selected child's data
  const { data: childSchedule = [] } = useQuery({
    queryKey: ["child-schedule", selectedChildId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/schedules/${selectedChildId}`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!selectedChildId
  });

  const { data: childGrades = [] } = useQuery({
    queryKey: ["child-grades", selectedChildId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/grades/${selectedChildId}`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!selectedChildId
  });

  const { data: childAttendance = [] } = useQuery({
    queryKey: ["child-attendance", selectedChildId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/attendance/${selectedChildId}`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!selectedChildId
  });

  const { data: childMessages = [] } = useQuery({
    queryKey: ["child-messages", selectedChildId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/messages/${selectedChildId}`);
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!selectedChildId
  });

  // Report absence mutation
  const reportAbsenceMutation = useMutation({
    mutationFn: async (data: { studentId: string; date: string; reason: string }) => {
      const response = await fetch('/api/wilma/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: data.studentId,
          date: data.date,
          status: 'absent',
          reason: data.reason,
          hours: 0
        })
      });
      if (!response.ok) throw new Error('Failed to report absence');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-attendance", selectedChildId] });
      setShowAbsenceForm(false);
      setAbsenceDate('');
      setAbsenceReason('');
      alert('Poissaolo ilmoitettu onnistuneesti');
    },
    onError: () => {
      alert('Poissaolon ilmoittaminen epäonnistui');
    }
  });

  const handleReportAbsence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChildId || !absenceDate || !absenceReason) {
      alert('Täytä kaikki kentät');
      return;
    }
    reportAbsenceMutation.mutate({
      studentId: selectedChildId,
      date: absenceDate,
      reason: absenceReason
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('wilma_user');
    setLocation('/wilma');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#003d82] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ladataan...</p>
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="max-w-md border-2 border-red-200">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ei lapsia</h2>
            <p className="text-gray-600 mb-4">Tiliisi ei ole liitetty yhtään lasta.</p>
            <Button onClick={handleLogout} className="bg-[#003d82] hover:bg-[#002d5f]">
              Kirjaudu ulos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const attendancePercentage = childAttendance.length > 0
    ? Math.round((childAttendance.filter((a: any) => a.status === 'present').length / childAttendance.length) * 100)
    : 0;

  const unreadCount = childMessages.filter((m: any) => !m.isRead).length;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* OLD WILMA STYLE HEADER */}
      <header className="bg-[#003d82] text-white border-b-4 border-[#002d5f]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/kulosaaren_yhteiskoulu_logo.jpeg" alt="Logo" className="w-10 h-10 rounded" />
              <div>
                <h1 className="text-xl font-bold">Wilma - Huoltajanäkymä</h1>
                <p className="text-sm text-blue-200">Kulosaaren yhteiskoulu</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold">{currentUser?.firstName} {currentUser?.lastName}</p>
                <p className="text-sm text-blue-200">Huoltaja</p>
              </div>
              <Button 
                onClick={handleLogout}
                variant="outline"
                className="bg-white text-[#003d82] hover:bg-gray-100 border-2"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Kirjaudu ulos
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* CHILD SELECTOR */}
        <Card className="border-2 border-[#dddddd] mb-6">
          <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-[#003d82]" />
              Valitse lapsi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {children.map((child: any) => (
                <button
                  key={child.studentId}
                  onClick={() => setSelectedChildId(child.studentId)}
                  className={`px-4 py-2 rounded border-2 font-medium transition-colors ${
                    selectedChildId === child.studentId
                      ? 'bg-[#003d82] text-white border-[#003d82]'
                      : 'bg-white text-gray-700 border-[#dddddd] hover:border-[#003d82]'
                  }`}
                >
                  {child.firstName} {child.lastName} ({child.studentClass})
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedChild && (
          <>
            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-2 border-[#dddddd]">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#003d82]">{attendancePercentage}%</p>
                  <p className="text-sm text-gray-600">Läsnäolo</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-[#dddddd]">
                <CardContent className="p-4 text-center">
                  <Award className="w-8 h-8 text-[#003d82] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#003d82]">{childGrades.length}</p>
                  <p className="text-sm text-gray-600">Arvosanaa</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-[#dddddd]">
                <CardContent className="p-4 text-center">
                  <MessageSquare className="w-8 h-8 text-[#003d82] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#003d82]">{unreadCount}</p>
                  <p className="text-sm text-gray-600">Uutta viestiä</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-[#dddddd]">
                <CardContent className="p-4 text-center">
                  <Button 
                    onClick={() => setShowAbsenceForm(true)}
                    className="w-full bg-[#003d82] hover:bg-[#002d5f]"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Ilmoita poissaolo
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* ABSENCE FORM */}
            {showAbsenceForm && (
              <Card className="border-2 border-[#003d82] mb-6">
                <CardHeader className="bg-blue-50 border-b-2 border-[#003d82]">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-[#003d82]" />
                    Ilmoita poissaolo - {selectedChild.firstName} {selectedChild.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <form onSubmit={handleReportAbsence} className="space-y-4">
                    <div>
                      <Label>Päivämäärä</Label>
                      <Input
                        type="date"
                        value={absenceDate}
                        onChange={(e) => setAbsenceDate(e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Syy</Label>
                      <Textarea
                        value={absenceReason}
                        onChange={(e) => setAbsenceReason(e.target.value)}
                        placeholder="Esim. Sairaus, lääkärikäynti..."
                        required
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="bg-[#003d82] hover:bg-[#002d5f]"
                        disabled={reportAbsenceMutation.isPending}
                      >
                        {reportAbsenceMutation.isPending ? 'Lähetetään...' : 'Ilmoita poissaolo'}
                      </Button>
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAbsenceForm(false);
                          setAbsenceDate('');
                          setAbsenceReason('');
                        }}
                      >
                        Peruuta
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* CHILD DATA WITH TABS */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6 bg-white border-2 border-[#dddddd]">
                <TabsTrigger value="overview" className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white">
                  <User className="w-4 h-4 mr-2" />
                  Yleiskatsaus
                </TabsTrigger>
                <TabsTrigger value="schedule" className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white">
                  <Calendar className="w-4 h-4 mr-2" />
                  Lukujärjestys
                </TabsTrigger>
                <TabsTrigger value="grades" className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white">
                  <Award className="w-4 h-4 mr-2" />
                  Arvosanat
                </TabsTrigger>
                <TabsTrigger value="attendance" className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Tuntimerkinnät
                </TabsTrigger>
                <TabsTrigger value="messages" className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Viestit
                </TabsTrigger>
                <TabsTrigger value="support" className="data-[state=active]:bg-[#003d82] data-[state=active]:text-white">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Tuki
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Schedule */}
                  <Card className="border-2 border-[#dddddd]">
                    <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#003d82]" />
                        Lukujärjestys
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      {childSchedule.length > 0 ? (
                        <div className="space-y-2">
                          {childSchedule.slice(0, 5).map((lesson: any) => (
                            <div key={lesson.id} className="border-b border-gray-200 pb-2">
                              <p className="font-semibold text-sm">{lesson.subject}</p>
                              <p className="text-xs text-gray-600">{lesson.timeSlot} • {lesson.room}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Ei lukujärjestystä</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Grades */}
                  <Card className="border-2 border-[#dddddd]">
                    <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Award className="w-5 h-5 text-[#003d82]" />
                        Arvosanat
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      {childGrades.length > 0 ? (
                        <div className="space-y-2">
                          {childGrades.slice(0, 5).map((grade: any) => (
                            <div key={grade.id} className="flex items-center justify-between border-b border-gray-200 pb-2">
                              <div>
                                <p className="font-semibold text-sm">{grade.subject}</p>
                                <p className="text-xs text-gray-600">{grade.teacherName}</p>
                              </div>
                              <div className="text-xl font-bold text-[#003d82]">{grade.grade}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Ei arvosanoja</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Attendance */}
                  <Card className="border-2 border-[#dddddd]">
                    <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Tuntimerkinnät
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      {childAttendance.length > 0 ? (
                        <div className="space-y-2">
                          {childAttendance.slice(0, 5).map((record: any) => (
                            <div key={record.id} className="flex items-center justify-between border-b border-gray-200 pb-2">
                              <div>
                                <p className="font-semibold text-sm">{record.date}</p>
                                {record.reason && <p className="text-xs text-gray-600">{record.reason}</p>}
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                record.status === 'present' ? 'bg-green-100 text-green-700' :
                                record.status === 'absent' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {record.status === 'present' ? 'Läsnä' :
                                 record.status === 'absent' ? 'Poissa' :
                                 'Myöhässä'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Ei tuntimerkintöjä</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Messages */}
                  <Card className="border-2 border-[#dddddd]">
                    <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-[#003d82]" />
                        Viestit
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      {childMessages.length > 0 ? (
                        <div className="space-y-2">
                          {childMessages.slice(0, 5).map((message: any) => (
                            <div key={message.id} className={`border-b border-gray-200 pb-2 ${!message.isRead ? 'font-bold' : ''}`}>
                              <p className="text-sm">{message.subject}</p>
                              <p className="text-xs text-gray-600">Lähettäjä: {message.fromUserName}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Ei viestejä</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="mt-4">
                <Card className="border-2 border-[#dddddd]">
                  <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#003d82]" />
                      Lukujärjestys - {selectedChild.firstName} {selectedChild.lastName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {childSchedule.length > 0 ? (
                      <div className="space-y-3">
                        {childSchedule.map((lesson: any) => (
                          <div key={lesson.id} className="border-2 border-[#dddddd] rounded p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-[#003d82]">{lesson.subject}</p>
                                <p className="text-sm text-gray-600">{lesson.teacherName}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{lesson.timeSlot}</p>
                                <p className="text-sm text-gray-600">{lesson.room}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">Ei lukujärjestystä</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="grades" className="mt-4">
                <Card className="border-2 border-[#dddddd]">
                  <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="w-5 h-5 text-[#003d82]" />
                      Arvosanat - {selectedChild.firstName} {selectedChild.lastName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {childGrades.length > 0 ? (
                      <div className="space-y-3">
                        {childGrades.map((grade: any) => (
                          <div key={grade.id} className="border-2 border-[#dddddd] rounded p-3 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-[#003d82]">{grade.subject}</p>
                              <p className="text-sm text-gray-600">{grade.teacherName}</p>
                              {grade.date && <p className="text-xs text-gray-500">{grade.date}</p>}
                            </div>
                            <div className="text-3xl font-bold text-[#003d82]">{grade.grade}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">Ei arvosanoja</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attendance" className="mt-4">
                <Card className="border-2 border-[#dddddd]">
                  <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Tuntimerkinnät - {selectedChild.firstName} {selectedChild.lastName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {childAttendance.length > 0 ? (
                      <div className="space-y-3">
                        {childAttendance.map((record: any) => (
                          <div key={record.id} className="border-2 border-[#dddddd] rounded p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-[#003d82]">{record.date}</p>
                                {record.reason && <p className="text-sm text-gray-600">{record.reason}</p>}
                              </div>
                              <span className={`px-3 py-1 rounded font-medium ${
                                record.status === 'present' ? 'bg-green-100 text-green-700' :
                                record.status === 'absent' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {record.status === 'present' ? 'Läsnä' :
                                 record.status === 'absent' ? 'Poissa' :
                                 'Myöhässä'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">Ei tuntimerkintöjä</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="messages" className="mt-4">
                <Card className="border-2 border-[#dddddd]">
                  <CardHeader className="bg-[#f5f5f5] border-b-2 border-[#dddddd]">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-[#003d82]" />
                      Viestit - {selectedChild.firstName} {selectedChild.lastName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {childMessages.length > 0 ? (
                      <div className="space-y-3">
                        {childMessages.map((message: any) => (
                          <div key={message.id} className={`border-2 border-[#dddddd] rounded p-3 ${!message.isRead ? 'bg-blue-50' : ''}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className={`font-bold text-[#003d82] ${!message.isRead ? 'font-extrabold' : ''}`}>
                                  {message.subject}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">Lähettäjä: {message.fromUserName}</p>
                                {message.content && <p className="text-sm text-gray-700 mt-2">{message.content}</p>}
                              </div>
                              {!message.isRead && (
                                <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">Uusi</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">Ei viestejä</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="support" className="mt-4">
                <WilmaSupportTab />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
