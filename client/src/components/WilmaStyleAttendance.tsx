import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import EnhancedClassSelector from '@/components/EnhancedClassSelector';
import { 
  CheckCircle, XCircle, Clock, AlertTriangle, FileText, 
  Calendar, User, Filter, Save, Bell, MessageSquare, Eye
} from 'lucide-react';

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  studentClass: string;
  parent1Email?: string;
  parent2Email?: string;
}

interface AttendanceMark {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  timeSlot: string;
  subject: string;
  markType: 'present' | 'absent' | 'late' | 'sick' | 'unauthorized_absence' | 'excused' | 
            'unexplained_absence' | 'late_under_15' | 'late_over_15' | 'teaching_elsewhere' | 
            'school_activity' | 'pre_approved_leave' | 'health_related' | 'school_clarified' | 
            'other_clarified' | 'unauthorized_clarified' | 'removed' | 'absent_area' | 
            'homework_missing' | 'good' | 'notice' | 'good_friend' | 'worked_well_together' | 
            'great_effort' | 'considerate' | 'helped_others' | 'good_discussion' | 
            'active_participation' | 'took_responsibility' | 'pay_attention' | 'missing_materials' | 
            'inappropriate_behavior' | 'tet';
  status: 'pending' | 'confirmed' | 'clarified';
  notes: string;
  teacherId: string;
  teacherName: string;
  parentNotified: boolean;
  parentNote?: string;
  clarificationNote?: string;
  createdAt: string;
}

interface AbsenceNotification {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  reason: string;
  parentName: string;
  parentEmail: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
}

interface WilmaStyleAttendanceProps {
  preSelectedClass?: string;
}

export default function WilmaStyleAttendance({ preSelectedClass }: WilmaStyleAttendanceProps = {}) {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState(preSelectedClass || '');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('08:00-09:30');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [viewMode, setViewMode] = useState<'roster' | 'marks' | 'notifications' | 'calendar'>('roster');
  const [attendanceData, setAttendanceData] = useState<{ [key: string]: string }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  const currentUser = JSON.parse(localStorage.getItem('wilma_user') || '{}');

  // Update selected class when preSelectedClass changes
  useEffect(() => {
    if (preSelectedClass) {
      setSelectedClass(preSelectedClass);
    }
  }, [preSelectedClass]);

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ['wilma-classes'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/classes');
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch students for selected class
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['class-students', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const response = await fetch(`/api/wilma/users?role=student`);
      if (!response.ok) return [];
      const allStudents = await response.json();
      return allStudents.filter((s: Student) => s.studentClass === selectedClass);
    },
    enabled: !!selectedClass
  });

  // Fetch existing attendance marks
  const { data: existingMarks = [] } = useQuery({
    queryKey: ['attendance-marks', selectedDate, selectedClass],
    queryFn: async () => {
      const params = new URLSearchParams({ date: selectedDate });
      const response = await fetch(`/api/wilma/attendance-marks?${params}`);
      if (!response.ok) return [];
      const marks = await response.json();
      return marks.filter((m: AttendanceMark) => 
        students.some((s: Student) => s.studentId === m.studentId)
      );
    },
    enabled: !!selectedClass && students.length > 0
  });

  // Fetch absence notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['absence-notifications', selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/absence-notifications?date=${selectedDate}`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/wilma/attendance-marks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save attendance');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-marks'] });
      alert('✅ Läsnäolot tallennettu!');
      setAttendanceData({});
      setNotes({});
    },
    onError: () => {
      alert('❌ Tallennus epäonnistui');
    }
  });

  // Confirm notification mutation
  const confirmNotificationMutation = useMutation({
    mutationFn: async ({ id, status, markType }: { id: string; status: string; markType: string }) => {
      const response = await fetch(`/api/wilma/absence-notifications/${id}/confirm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, markType }),
      });
      if (!response.ok) throw new Error('Failed to confirm notification');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-marks'] });
      alert('✅ Ilmoitus käsitelty!');
    }
  });

  // Update mark mutation
  const updateMarkMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/wilma/attendance-marks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update mark');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-marks'] });
      alert('✅ Merkintä päivitetty!');
    }
  });

  // Initialize attendance data from existing marks
  useEffect(() => {
    const data: { [key: string]: string } = {};
    existingMarks.forEach((mark: AttendanceMark) => {
      data[mark.studentId] = mark.markType;
    });
    setAttendanceData(data);
  }, [existingMarks]);

  const handleAttendanceChange = (studentId: string, markType: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: markType
    }));
  };

  const handleSaveAttendance = () => {
    if (!selectedClass || !selectedSubject) {
      alert('Valitse luokka ja aine');
      return;
    }

    const marks = Object.entries(attendanceData).map(([studentId, markType]) => {
      const student = students.find((s: Student) => s.studentId === studentId);
      return {
        studentId,
        studentName: student ? `${student.firstName} ${student.lastName}` : '',
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        subject: selectedSubject,
        markType,
        notes: notes[studentId] || '',
        teacherId: currentUser.id,
        teacherName: `${currentUser.firstName} ${currentUser.lastName}`,
        status: markType === 'unauthorized_absence' ? 'pending' : 'confirmed'
      };
    });

    saveAttendanceMutation.mutate({ marks });
  };

  const getMarkColor = (markType: string) => {
    switch (markType) {
      case 'present': return 'bg-green-100 text-green-700 border-green-300';
      case 'absent': return 'bg-red-100 text-red-700 border-red-300';
      case 'late': 
      case 'late_under_15':
      case 'late_over_15': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'sick':
      case 'health_related': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'unauthorized_absence':
      case 'unexplained_absence': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'excused':
      case 'school_clarified':
      case 'other_clarified':
      case 'unauthorized_clarified': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'teaching_elsewhere':
      case 'school_activity':
      case 'pre_approved_leave': return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      case 'removed':
      case 'absent_area': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'homework_missing':
      case 'missing_materials':
      case 'inappropriate_behavior':
      case 'pay_attention': return 'bg-red-50 text-red-600 border-red-200';
      case 'good':
      case 'notice':
      case 'good_friend':
      case 'worked_well_together':
      case 'great_effort':
      case 'considerate':
      case 'helped_others':
      case 'good_discussion':
      case 'active_participation':
      case 'took_responsibility': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'tet': return 'bg-cyan-100 text-cyan-700 border-cyan-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getMarkLabel = (markType: string) => {
    switch (markType) {
      case 'present': return 'Läsnä';
      case 'absent': return 'Poissa';
      case 'late': return 'Myöhässä';
      case 'sick': return 'Sairas';
      case 'unauthorized_absence': return 'Luvaton poissaolo';
      case 'excused': return 'Selvitetty';
      case 'unexplained_absence': return 'Selvittämätön poissaolo';
      case 'late_under_15': return 'Myöhässä alle 15 min';
      case 'late_over_15': return 'Myöhässä yli 15 min';
      case 'teaching_elsewhere': return 'Opetus muualla';
      case 'school_activity': return 'Koulun muussa toiminnassa';
      case 'pre_approved_leave': return 'Ennalta anottu vapaa';
      case 'health_related': return 'Terveydellisiin syihin liittyvä poissaolo';
      case 'school_clarified': return 'Koulu selvittänyt';
      case 'other_clarified': return 'Muu selvitetty poissaolo';
      case 'unauthorized_clarified': return 'Luvaton poissaolo (selvitetty)';
      case 'removed': return 'Poistettu';
      case 'absent_area': return 'PoislAlue';
      case 'homework_missing': return 'Kotitehtävät tekemättä';
      case 'good': return 'Hyvä';
      case 'notice': return 'Tiedoksi';
      case 'good_friend': return 'Olit hyvä kaveri välitunnilla';
      case 'worked_well_together': return 'Työskentelit hienosti yhdessä';
      case 'great_effort': return 'Tsemppasit tänään';
      case 'considerate': return 'Otit toiset huomioon';
      case 'helped_others': return 'Autoit toisia oppilaita';
      case 'good_discussion': return 'Osasit keskustella asioista';
      case 'active_participation': return 'Osallistuit aktiivisesti';
      case 'took_responsibility': return 'Otit vastuuta opiskelustasi';
      case 'pay_attention': return 'Kiinnitä jatkossa huomiota';
      case 'missing_materials': return 'Opiskeluvälineitä puuttuu';
      case 'inappropriate_behavior': return 'Asiaton tai häiritsevä käytös';
      case 'tet': return 'TET';
      default: return markType;
    }
  };

  // Roster View - Wilma Style
  if (viewMode === 'roster') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-blue-600" />
            Läsnäolon merkintä
          </h2>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'roster' ? 'default' : 'outline'}
              onClick={() => setViewMode('roster')}
              size="sm"
            >
              Nimilista
            </Button>
            <Button
              variant={viewMode === 'marks' ? 'default' : 'outline'}
              onClick={() => setViewMode('marks')}
              size="sm"
            >
              Merkinnät
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              onClick={() => setViewMode('calendar')}
              size="sm"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Kalenteri
            </Button>
            <Button
              variant={viewMode === 'notifications' ? 'default' : 'outline'}
              onClick={() => setViewMode('notifications')}
              size="sm"
            >
              <Bell className="w-4 h-4 mr-2" />
              Ilmoitukset ({notifications.filter((n: any) => n.status === 'pending').length})
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-2 border-blue-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Luokka *</Label>
                <EnhancedClassSelector
                  classes={classes}
                  value={selectedClass}
                  onChange={setSelectedClass}
                  placeholder="Valitse luokka..."
                  required={true}
                  showDetails={false}
                  viewMode="dropdown"
                />
              </div>
              <div>
                <Label>Päivämäärä *</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Tunti *</Label>
                <select
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="08:00-09:30">1. tunti (08:00-09:30)</option>
                  <option value="09:45-11:15">2. tunti (09:45-11:15)</option>
                  <option value="11:30-13:00">3. tunti (11:30-13:00)</option>
                  <option value="13:15-14:45">4. tunti (13:15-14:45)</option>
                  <option value="15:00-16:30">5. tunti (15:00-16:30)</option>
                </select>
              </div>
              <div>
                <Label>Aine *</Label>
                <Input
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  placeholder="esim. Matematiikka"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Roster */}
        {selectedClass && (
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center justify-between">
                <span>Luokan {selectedClass} nimilista</span>
                <Badge variant="outline">{students.length} oppilasta</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {studentsLoading ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Ladataan oppilaita...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  Ei oppilaita valitussa luokassa
                </div>
              ) : (
                <div className="divide-y">
                  {students.map((student: Student, index: number) => {
                    const currentMark = attendanceData[student.studentId] || 'present';
                    const hasNotification = notifications.some(
                      (n: AbsenceNotification) => n.studentId === student.studentId && n.status === 'pending'
                    );

                    return (
                      <div
                        key={student.id}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          currentMark !== 'present' ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <span className="text-gray-500 font-mono w-8">{index + 1}.</span>
                            <div className="flex-1">
                              <p className="font-semibold text-lg">
                                {student.lastName}, {student.firstName}
                              </p>
                              <p className="text-sm text-gray-600">
                                ID: {student.studentId}
                                {hasNotification && (
                                  <Badge className="ml-2 bg-orange-600">
                                    <Bell className="w-3 h-3 mr-1" />
                                    Huoltajan ilmoitus
                                  </Badge>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Dropdown Mark Selector - Wilma Style */}
                          <div className="flex gap-2 items-center">
                            <select
                              value={currentMark}
                              onChange={(e) => handleAttendanceChange(student.studentId, e.target.value)}
                              className={`px-4 py-2 rounded-md border-2 font-semibold text-sm min-w-[200px] ${getMarkColor(currentMark)}`}
                            >
                              <optgroup label="Läsnäolo">
                                <option value="present">✓ Läsnä</option>
                                <option value="absent">✗ Poissa</option>
                                <option value="late">⏰ Myöhässä</option>
                                <option value="late_under_15">⏰ Myöhässä alle 15 min</option>
                                <option value="late_over_15">⏰ Myöhässä yli 15 min</option>
                              </optgroup>
                              <optgroup label="Poissaolot">
                                <option value="unexplained_absence">❓ Selvittämätön poissaolo</option>
                                <option value="sick">🤒 Sairas</option>
                                <option value="health_related">🏥 Terveydellisiin syihin liittyvä</option>
                                <option value="pre_approved_leave">📝 Ennalta anottu vapaa</option>
                                <option value="teaching_elsewhere">🏫 Opetus muualla</option>
                                <option value="school_activity">🎯 Koulun muussa toiminnassa</option>
                                <option value="tet">💼 TET</option>
                              </optgroup>
                              <optgroup label="Selvitetyt">
                                <option value="excused">✓ Selvitetty</option>
                                <option value="school_clarified">🏫 Koulu selvittänyt</option>
                                <option value="other_clarified">📋 Muu selvitetty poissaolo</option>
                                <option value="unauthorized_clarified">⚠️ Luvaton (selvitetty)</option>
                              </optgroup>
                              <optgroup label="Luvattomat">
                                <option value="unauthorized_absence">🚫 Luvaton poissaolo</option>
                                <option value="removed">❌ Poistettu</option>
                                <option value="absent_area">📍 PoislAlue</option>
                              </optgroup>
                              <optgroup label="Tehtävät & Käytös">
                                <option value="homework_missing">📚 Kotitehtävät tekemättä</option>
                                <option value="missing_materials">📝 Opiskeluvälineitä puuttuu</option>
                                <option value="inappropriate_behavior">⚠️ Asiaton tai häiritsevä käytös</option>
                                <option value="pay_attention">👀 Kiinnitä jatkossa huomiota</option>
                              </optgroup>
                              <optgroup label="Positiiviset merkinnät">
                                <option value="good">⭐ Hyvä</option>
                                <option value="notice">ℹ️ Tiedoksi</option>
                                <option value="good_friend">🤝 Olit hyvä kaveri välitunnilla</option>
                                <option value="worked_well_together">👥 Työskentelit hienosti yhdessä</option>
                                <option value="great_effort">💪 Tsemppasit tänään</option>
                                <option value="considerate">❤️ Otit toiset huomioon</option>
                                <option value="helped_others">🙋 Autoit toisia oppilaita</option>
                                <option value="good_discussion">💬 Osasit keskustella asioista</option>
                                <option value="active_participation">🎯 Osallistuit aktiivisesti</option>
                                <option value="took_responsibility">📈 Otit vastuuta opiskelustasi</option>
                              </optgroup>
                            </select>
                          </div>
                        </div>

                        {/* Comments/Notes field - Always visible for non-present marks */}
                        {currentMark !== 'present' && (
                          <div className="mt-3 ml-12">
                            <Label className="text-sm font-semibold mb-1 block">Lisätiedot / Kommentit:</Label>
                            <textarea
                              placeholder="Kirjoita lisätietoja tai kommentteja tähän..."
                              value={notes[student.studentId] || ''}
                              onChange={(e) => setNotes(prev => ({
                                ...prev,
                                [student.studentId]: e.target.value
                              }))}
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-md text-sm min-h-[80px] focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        {selectedClass && students.length > 0 && (
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => {
                setAttendanceData({});
                setNotes({});
              }}
              variant="outline"
            >
              Tyhjennä
            </Button>
            <Button
              onClick={handleSaveAttendance}
              disabled={saveAttendanceMutation.isPending || !selectedSubject}
              className="bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveAttendanceMutation.isPending ? 'Tallennetaan...' : 'Tallenna läsnäolot'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Calendar View
  if (viewMode === 'calendar') {
    // Generate calendar for current month
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    const monthNames = ['Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu',
                        'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu'];
    const dayNames = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
    
    // Fetch marks for the entire month
    const { data: monthMarks = [] } = useQuery({
      queryKey: ['attendance-marks-month', currentYear, currentMonth, selectedClass],
      queryFn: async () => {
        if (!selectedClass) return [];
        const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
        const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
        const response = await fetch(`/api/wilma/attendance-marks?startDate=${startDate}&endDate=${endDate}`);
        if (!response.ok) return [];
        const marks = await response.json();
        return marks.filter((m: AttendanceMark) => 
          students.some((s: Student) => s.studentId === m.studentId)
        );
      },
      enabled: !!selectedClass && students.length > 0
    });
    
    // Group marks by date
    const marksByDate: { [key: string]: AttendanceMark[] } = {};
    monthMarks.forEach((mark: AttendanceMark) => {
      if (!marksByDate[mark.date]) {
        marksByDate[mark.date] = [];
      }
      marksByDate[mark.date].push(mark);
    });
    
    // Calculate stats for each day
    const getDayStats = (date: string) => {
      const marks = marksByDate[date] || [];
      return {
        present: marks.filter(m => m.markType === 'present').length,
        absent: marks.filter(m => m.markType === 'absent').length,
        late: marks.filter(m => m.markType === 'late').length,
        sick: marks.filter(m => m.markType === 'sick').length,
        total: marks.length
      };
    };
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Läsnäolokalenteri - {monthNames[currentMonth]} {currentYear}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setViewMode('roster')}
              size="sm"
            >
              Takaisin nimilistaan
            </Button>
          </div>
        </div>

        {/* Class selector */}
        <Card className="border-2 border-blue-200">
          <CardContent className="p-4">
            <div className="max-w-md">
              <Label>Valitse luokka</Label>
              <EnhancedClassSelector
                classes={classes}
                value={selectedClass}
                onChange={setSelectedClass}
              />
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card className="border-2 border-blue-200">
          <CardContent className="p-6">
            {!selectedClass ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>Valitse luokka nähdäksesi kalenterin</p>
              </div>
            ) : (
              <div>
                {/* Day names header */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {dayNames.map(day => (
                    <div key={day} className="text-center font-bold text-sm text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: adjustedStartDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  
                  {/* Days of the month */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const stats = getDayStats(dateStr);
                    const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                    const isWeekend = (adjustedStartDay + i) % 7 >= 5;
                    
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setViewMode('roster');
                        }}
                        className={`aspect-square border-2 rounded-lg p-2 hover:shadow-lg transition-all ${
                          isToday ? 'border-blue-600 bg-blue-50' : 
                          isWeekend ? 'border-gray-200 bg-gray-50' :
                          'border-gray-300 bg-white'
                        } ${stats.total > 0 ? 'hover:border-blue-400' : 'hover:border-gray-400'}`}
                      >
                        <div className="text-sm font-bold mb-1">{day}</div>
                        {stats.total > 0 && (
                          <div className="space-y-0.5 text-xs">
                            {stats.present > 0 && (
                              <div className="flex items-center justify-center gap-1 text-green-600">
                                <CheckCircle className="w-3 h-3" />
                                <span>{stats.present}</span>
                              </div>
                            )}
                            {stats.absent > 0 && (
                              <div className="flex items-center justify-center gap-1 text-red-600">
                                <XCircle className="w-3 h-3" />
                                <span>{stats.absent}</span>
                              </div>
                            )}
                            {stats.late > 0 && (
                              <div className="flex items-center justify-center gap-1 text-orange-600">
                                <Clock className="w-3 h-3" />
                                <span>{stats.late}</span>
                              </div>
                            )}
                            {stats.sick > 0 && (
                              <div className="flex items-center justify-center gap-1 text-blue-600">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{stats.sick}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Legend */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-semibold mb-3">Merkinnät:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Läsnä</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm">Poissa</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="text-sm">Myöhässä</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Sairas</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Notifications View
  if (viewMode === 'notifications') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-orange-600" />
            Poissaoloilmoitukset
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setViewMode('roster')}
              size="sm"
            >
              Takaisin nimilistaan
            </Button>
          </div>
        </div>

        <Card className="border-2 border-orange-200">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
            <CardTitle>Huoltajien ilmoitukset</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>Ei uusia ilmoituksia</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification: AbsenceNotification) => (
                  <Card key={notification.id} className="border-2 border-orange-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-5 h-5 text-orange-600" />
                            <p className="font-bold text-lg">{notification.studentName}</p>
                            <Badge className={
                              notification.status === 'pending' ? 'bg-orange-600' :
                              notification.status === 'confirmed' ? 'bg-green-600' :
                              'bg-red-600'
                            }>
                              {notification.status === 'pending' ? 'Odottaa' :
                               notification.status === 'confirmed' ? 'Hyväksytty' :
                               'Hylätty'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            {notification.date}
                          </p>
                          <div className="bg-gray-50 p-3 rounded-lg mb-3">
                            <p className="text-sm font-semibold mb-1">Syy:</p>
                            <p className="text-sm">{notification.reason}</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            Ilmoittaja: {notification.parentName} ({notification.parentEmail})
                          </p>
                        </div>

                        {notification.status === 'pending' && (
                          <div className="flex flex-col gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => confirmNotificationMutation.mutate({
                                id: notification.id,
                                status: 'confirmed',
                                markType: 'sick'
                              })}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Hyväksy (Sairas)
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => confirmNotificationMutation.mutate({
                                id: notification.id,
                                status: 'confirmed',
                                markType: 'excused'
                              })}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Hyväksy (Selvitetty)
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => confirmNotificationMutation.mutate({
                                id: notification.id,
                                status: 'rejected',
                                markType: 'unauthorized_absence'
                              })}
                              className="text-red-600"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Hylkää
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Marks View - Show all marks
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Läsnäolomerkinnät
        </h2>
        <Button
          variant="outline"
          onClick={() => setViewMode('roster')}
          size="sm"
        >
          Takaisin nimilistaan
        </Button>
      </div>

      <Card className="border-2 border-blue-200">
        <CardContent className="p-6">
          {existingMarks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Ei merkintöjä valitulle päivälle</p>
            </div>
          ) : (
            <div className="space-y-3">
              {existingMarks.map((mark: AttendanceMark) => (
                <Card key={mark.id} className={`border-2 ${getMarkColor(mark.markType)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-lg">{mark.studentName}</p>
                        <p className="text-sm text-gray-600">
                          {mark.subject} • {mark.timeSlot}
                        </p>
                        <Badge className={`mt-2 ${getMarkColor(mark.markType)}`}>
                          {getMarkLabel(mark.markType)}
                        </Badge>
                        {mark.notes && (
                          <p className="text-sm mt-2 italic">"{mark.notes}"</p>
                        )}
                        {mark.status === 'pending' && (
                          <Badge className="mt-2 bg-orange-600">
                            Odottaa selvitystä
                          </Badge>
                        )}
                      </div>
                      {mark.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateMarkMutation.mutate({
                              id: mark.id,
                              data: { ...mark, markType: 'sick', status: 'clarified' }
                            })}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Sairas
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateMarkMutation.mutate({
                              id: mark.id,
                              data: { ...mark, markType: 'late', status: 'clarified' }
                            })}
                            className="bg-yellow-600 hover:bg-yellow-700"
                          >
                            Myöhässä
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateMarkMutation.mutate({
                              id: mark.id,
                              data: { ...mark, markType: 'excused', status: 'clarified' }
                            })}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Selvitetty
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
