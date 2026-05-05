import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Trash2, Clock, User, Building, BookOpen, Grid3x3, List, Download, Upload, Copy, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DAYS = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'];
const DAYS_SHORT = ['Ma', 'Ti', 'Ke', 'To', 'Pe'];
const TIME_SLOTS = [
  '08:00-09:00',
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '13:00-14:00',
  '14:00-15:00',
  '15:00-16:00',
];

// Subject colors like Kurre
const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Matematiikka': { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300' },
  'Äidinkieli': { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300' },
  'Englanti': { bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-300' },
  'Ruotsi': { bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-300' },
  'Fysiikka': { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300' },
  'Kemia': { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-300' },
  'Biologia': { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300' },
  'Maantieto': { bg: 'bg-teal-100', text: 'text-teal-900', border: 'border-teal-300' },
  'Historia': { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300' },
  'Yhteiskuntaoppi': { bg: 'bg-cyan-100', text: 'text-cyan-900', border: 'border-cyan-300' },
  'Liikunta': { bg: 'bg-lime-100', text: 'text-lime-900', border: 'border-lime-300' },
  'Musiikki': { bg: 'bg-pink-100', text: 'text-pink-900', border: 'border-pink-300' },
  'Kuvataide': { bg: 'bg-fuchsia-100', text: 'text-fuchsia-900', border: 'border-fuchsia-300' },
  'Käsityö': { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300' },
  'Kotitalous': { bg: 'bg-indigo-100', text: 'text-indigo-900', border: 'border-indigo-300' },
  'Uskonto': { bg: 'bg-violet-100', text: 'text-violet-900', border: 'border-violet-300' },
  'default': { bg: 'bg-gray-100', text: 'text-gray-900', border: 'border-gray-300' }
};

export default function ScheduleManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState('');
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Kurre-style view toggle
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // For mobile day view
  const [newLesson, setNewLesson] = useState({
    day: '',
    timeSlot: '',
    subject: '',
    teacher: '',
    room: '',
    class: ''
  });

  // Fetch schedules
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules', selectedClass],
    queryFn: async () => {
      const url = selectedClass && selectedClass !== 'all'
        ? `/api/wilma/schedules?class=${selectedClass}`
        : '/api/wilma/schedules';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch schedules');
      return response.json();
    }
  });

  // Fetch teachers
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/users?role=teacher');
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Create lesson mutation
  const createLessonMutation = useMutation({
    mutationFn: async (lessonData: any) => {
      const response = await fetch('/api/wilma/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lessonData)
      });
      if (!response.ok) throw new Error('Failed to create lesson');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setShowAddLesson(false);
      setNewLesson({
        day: '',
        timeSlot: '',
        subject: '',
        teacher: '',
        room: '',
        class: ''
      });
      toast({
        title: "✅ Tunti lisätty!",
        description: "Uusi tunti on lisätty lukujärjestykseen onnistuneesti.",
      });
    },
    onError: () => {
      toast({
        title: "❌ Virhe",
        description: "Tunnin lisääminen epäonnistui. Yritä uudelleen.",
        variant: "destructive",
      });
    }
  });

  // Delete lesson mutation
  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/schedules/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete lesson');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: "✅ Tunti poistettu",
        description: "Tunti on poistettu lukujärjestyksestä.",
      });
    },
    onError: () => {
      toast({
        title: "❌ Virhe",
        description: "Tunnin poistaminen epäonnistui.",
        variant: "destructive",
      });
    }
  });

  const handleAddLesson = () => {
    if (!newLesson.day || !newLesson.timeSlot || !newLesson.subject) {
      toast({
        title: "⚠️ Puuttuvia tietoja",
        description: "Täytä pakolliset kentät: Päivä, Aika, Aine",
        variant: "destructive",
      });
      return;
    }
    createLessonMutation.mutate(newLesson);
  };

  // Get color for subject (Kurre-style)
  const getSubjectColor = (subject: string) => {
    return SUBJECT_COLORS[subject] || SUBJECT_COLORS['default'];
  };

  // Export schedule as JSON
  const exportSchedule = () => {
    const dataStr = JSON.stringify(schedules, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lukujarjestys-${selectedClass || 'kaikki'}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    toast({
      title: "✅ Viety!",
      description: "Lukujärjestys on viety JSON-tiedostona.",
    });
  };

  // Copy schedule to clipboard
  const copySchedule = () => {
    navigator.clipboard.writeText(JSON.stringify(schedules, null, 2));
    toast({
      title: "✅ Kopioitu!",
      description: "Lukujärjestys on kopioitu leikepöydälle.",
    });
  };

  // Group schedules by day and time
  const scheduleGrid: any = {};
  DAYS.forEach(day => {
    scheduleGrid[day] = {};
    TIME_SLOTS.forEach(slot => {
      scheduleGrid[day][slot] = schedules.filter((s: any) => 
        s.day === day && s.timeSlot === slot
      );
    });
  });

  return (
    <div className="space-y-6">
      {/* Modern Header - Kurre Style */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              Lukujärjestys
            </h2>
            <p className="text-green-100">Moderni lukujärjestyksen hallinta - Kurre-tyylinen</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48 bg-white text-gray-900">
                <SelectValue placeholder="Valitse luokka" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kaikki luokat</SelectItem>
                <SelectItem value="7A">7A</SelectItem>
                <SelectItem value="7B">7B</SelectItem>
                <SelectItem value="8A">8A</SelectItem>
                <SelectItem value="8B">8B</SelectItem>
                <SelectItem value="9A">9A</SelectItem>
                <SelectItem value="9B">9B</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => setShowAddLesson(true)}
              className="bg-white text-green-600 hover:bg-green-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Lisää tunti
            </Button>
          </div>
        </div>
      </div>

      {/* View Controls - Kurre Style */}
      <Card className="border-2 border-green-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-green-600' : ''}
              >
                <Grid3x3 className="w-4 h-4 mr-2" />
                Ruudukko
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-green-600' : ''}
              >
                <List className="w-4 h-4 mr-2" />
                Lista
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copySchedule}
              >
                <Copy className="w-4 h-4 mr-2" />
                Kopioi
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportSchedule}
              >
                <Download className="w-4 h-4 mr-2" />
                Vie
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/schedule-preview/${selectedClass || 'all'}`, '_blank')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Esikatselu
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Lesson Form */}
      {showAddLesson && (
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center justify-between">
              <span>Lisää uusi tunti</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowAddLesson(false)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Päivä *</Label>
                <Select value={newLesson.day} onValueChange={(v) => setNewLesson({...newLesson, day: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Valitse päivä" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map(day => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Aika *</Label>
                <Select value={newLesson.timeSlot} onValueChange={(v) => setNewLesson({...newLesson, timeSlot: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Valitse aika" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(slot => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Aine *</Label>
                <Input
                  value={newLesson.subject}
                  onChange={(e) => setNewLesson({...newLesson, subject: e.target.value})}
                  placeholder="esim. Matematiikka"
                />
              </div>

              <div>
                <Label>Luokka</Label>
                <Input
                  value={newLesson.class}
                  onChange={(e) => setNewLesson({...newLesson, class: e.target.value})}
                  placeholder="esim. 7A"
                />
              </div>

              <div>
                <Label>Opettaja</Label>
                <Select value={newLesson.teacher} onValueChange={(v) => setNewLesson({...newLesson, teacher: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Valitse opettaja" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t: any) => (
                      <SelectItem key={t.id} value={`${t.firstName} ${t.lastName}`}>
                        {t.firstName} {t.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Luokkahuone</Label>
                <Input
                  value={newLesson.room}
                  onChange={(e) => setNewLesson({...newLesson, room: e.target.value})}
                  placeholder="esim. A101"
                />
              </div>
            </div>

            <Button 
              onClick={handleAddLesson}
              disabled={createLessonMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {createLessonMutation.isPending ? 'Lisätään...' : 'Lisää tunti'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Schedule Grid - Kurre Style */}
      {viewMode === 'grid' ? (
        <Card className="border-2 border-green-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Calendar className="w-6 h-6" />
              Viikon lukujärjestys {selectedClass && selectedClass !== 'all' && `- ${selectedClass}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Ladataan lukujärjestystä...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-green-100 to-emerald-100">
                      <th className="border-2 border-green-300 p-4 text-left font-bold text-green-900 sticky left-0 bg-green-100 z-10">
                        <Clock className="w-5 h-5 inline mr-2" />
                        Aika
                      </th>
                      {DAYS.map((day, idx) => (
                        <th key={day} className="border-2 border-green-300 p-4 text-center font-bold text-green-900 min-w-[180px]">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-lg">{day}</span>
                            <span className="text-xs font-normal text-green-700">{DAYS_SHORT[idx]}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map((slot, slotIdx) => (
                      <tr key={slot} className={slotIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border-2 border-green-200 p-3 bg-green-50 font-semibold text-sm sticky left-0 z-10">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-600 rounded-full" />
                            <span>{slot}</span>
                          </div>
                        </td>
                        {DAYS.map(day => (
                          <td key={`${day}-${slot}`} className="border-2 border-green-200 p-2 align-top">
                            {scheduleGrid[day][slot].length > 0 ? (
                              <div className="space-y-2">
                                {scheduleGrid[day][slot].map((lesson: any) => {
                                  const colors = getSubjectColor(lesson.subject);
                                  return (
                                    <div 
                                      key={lesson.id}
                                      className={`${colors.bg} border-2 ${colors.border} rounded-xl p-3 text-sm hover:shadow-lg transition-all duration-200 transform hover:scale-105 cursor-pointer group relative`}
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <span className={`font-bold text-base ${colors.text} flex items-center gap-1.5`}>
                                          <BookOpen className="w-4 h-4" />
                                          {lesson.subject}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-100"
                                          onClick={() => {
                                            if (confirm(`Poista ${lesson.subject}?`)) {
                                              deleteLessonMutation.mutate(lesson.id);
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                      {lesson.teacher && (
                                        <div className={`text-xs ${colors.text} flex items-center gap-1.5 mb-1 opacity-90`}>
                                          <User className="w-3.5 h-3.5" />
                                          <span className="font-medium">{lesson.teacher}</span>
                                        </div>
                                      )}
                                      {lesson.room && (
                                        <div className={`text-xs ${colors.text} flex items-center gap-1.5 mb-1 opacity-90`}>
                                          <Building className="w-3.5 h-3.5" />
                                          <span className="font-medium">{lesson.room}</span>
                                        </div>
                                      )}
                                      {lesson.class && (
                                        <div className={`text-xs ${colors.text} font-bold mt-2 px-2 py-1 bg-white/50 rounded-md inline-block`}>
                                          {lesson.class}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center text-gray-400 text-xs py-6 italic">
                                Ei tuntia
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* List View - Kurre Style */
        <div className="space-y-4">
          {DAYS.map((day, dayIdx) => (
            <Card key={day} className="border-2 border-green-200 shadow-md hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200">
                <CardTitle className="flex items-center gap-3 text-green-800">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                    {DAYS_SHORT[dayIdx]}
                  </div>
                  <span className="text-xl">{day}</span>
                  <span className="text-sm font-normal text-green-600 ml-auto">
                    {scheduleGrid[day] ? Object.values(scheduleGrid[day]).flat().length : 0} tuntia
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {TIME_SLOTS.map(slot => {
                    const lessons = scheduleGrid[day]?.[slot] || [];
                    if (lessons.length === 0) return null;
                    
                    return (
                      <div key={slot} className="flex gap-4">
                        <div className="flex-shrink-0 w-24 text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-600" />
                          {slot.split('-')[0]}
                        </div>
                        <div className="flex-1 space-y-2">
                          {lessons.map((lesson: any) => {
                            const colors = getSubjectColor(lesson.subject);
                            return (
                              <div 
                                key={lesson.id}
                                className={`${colors.bg} border-2 ${colors.border} rounded-xl p-4 hover:shadow-md transition-all group`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className={`font-bold text-lg ${colors.text} mb-2 flex items-center gap-2`}>
                                      <BookOpen className="w-5 h-5" />
                                      {lesson.subject}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      {lesson.teacher && (
                                        <div className={`${colors.text} flex items-center gap-1.5 opacity-90`}>
                                          <User className="w-4 h-4" />
                                          <span>{lesson.teacher}</span>
                                        </div>
                                      )}
                                      {lesson.room && (
                                        <div className={`${colors.text} flex items-center gap-1.5 opacity-90`}>
                                          <Building className="w-4 h-4" />
                                          <span>{lesson.room}</span>
                                        </div>
                                      )}
                                      {lesson.class && (
                                        <div className={`${colors.text} font-bold`}>
                                          Luokka: {lesson.class}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-100"
                                    onClick={() => {
                                      if (confirm(`Poista ${lesson.subject}?`)) {
                                        deleteLessonMutation.mutate(lesson.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {Object.values(scheduleGrid[day] || {}).flat().length === 0 && (
                    <div className="text-center py-8 text-gray-400 italic">
                      Ei tunteja tälle päivälle
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enhanced Stats - Kurre Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90 mb-1">Tunteja yhteensä</p>
                <p className="text-4xl font-bold">{schedules.length}</p>
              </div>
              <BookOpen className="w-12 h-12 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90 mb-1">Opettajia</p>
                <p className="text-4xl font-bold">{teachers.length}</p>
              </div>
              <User className="w-12 h-12 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90 mb-1">Luokkia</p>
                <p className="text-4xl font-bold">6</p>
              </div>
              <Building className="w-12 h-12 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90 mb-1">Aineita</p>
                <p className="text-4xl font-bold">
                  {new Set(schedules.map((s: any) => s.subject)).size}
                </p>
              </div>
              <Calendar className="w-12 h-12 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
