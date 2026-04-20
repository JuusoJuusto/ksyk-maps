import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Trash2, Clock, User, Building, BookOpen } from "lucide-react";

const DAYS = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'];
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

export default function ScheduleManager() {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('');
  const [showAddLesson, setShowAddLesson] = useState(false);
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
      const url = selectedClass 
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
      alert('✅ Tunti lisätty onnistuneesti!');
    },
    onError: () => {
      alert('❌ Tunnin lisääminen epäonnistui');
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
      alert('✅ Tunti poistettu');
    }
  });

  const handleAddLesson = () => {
    if (!newLesson.day || !newLesson.timeSlot || !newLesson.subject) {
      alert('Täytä pakolliset kentät: Päivä, Aika, Aine');
      return;
    }
    createLessonMutation.mutate(newLesson);
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Lukujärjestyksen hallinta</h2>
          <p className="text-gray-600">Luo ja hallinnoi luokkien lukujärjestyksiä</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Valitse luokka" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Kaikki luokat</SelectItem>
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
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Lisää tunti
          </Button>
        </div>
      </div>

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

      {/* Schedule Grid */}
      <Card className="border-2 border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Viikon lukujärjestys {selectedClass && `- ${selectedClass}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Ladataan lukujärjestystä...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-green-100">
                    <th className="border-2 border-green-300 p-3 text-left font-semibold">Aika</th>
                    {DAYS.map(day => (
                      <th key={day} className="border-2 border-green-300 p-3 text-center font-semibold">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map(slot => (
                    <tr key={slot}>
                      <td className="border-2 border-green-200 p-3 bg-green-50 font-medium text-sm">
                        <Clock className="w-4 h-4 inline mr-2" />
                        {slot}
                      </td>
                      {DAYS.map(day => (
                        <td key={`${day}-${slot}`} className="border-2 border-green-200 p-2">
                          {scheduleGrid[day][slot].length > 0 ? (
                            <div className="space-y-2">
                              {scheduleGrid[day][slot].map((lesson: any) => (
                                <div 
                                  key={lesson.id}
                                  className="bg-white border-2 border-blue-200 rounded-lg p-2 text-sm hover:shadow-md transition-shadow"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-blue-900 flex items-center gap-1">
                                      <BookOpen className="w-3 h-3" />
                                      {lesson.subject}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => deleteLessonMutation.mutate(lesson.id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  {lesson.teacher && (
                                    <div className="text-xs text-gray-600 flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {lesson.teacher}
                                    </div>
                                  )}
                                  {lesson.room && (
                                    <div className="text-xs text-gray-600 flex items-center gap-1">
                                      <Building className="w-3 h-3" />
                                      {lesson.room}
                                    </div>
                                  )}
                                  {lesson.class && (
                                    <div className="text-xs text-blue-600 font-medium mt-1">
                                      {lesson.class}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-gray-400 text-xs py-4">
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-700">Tunteja yhteensä</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{schedules.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-700">Opettajia</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{teachers.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-700">Luokkia</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">6</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-700">Aineita</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              {new Set(schedules.map((s: any) => s.subject)).size}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
